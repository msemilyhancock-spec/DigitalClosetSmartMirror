/**
 * Cloudflare Worker — Gemini Auto-Tag + Garment Isolation Proxy
 * 
 * POST /  (or POST /tag)
 *   Body: { image: "<base64 or data-url>" }
 *   Returns: { category, colors, eventTypes, description, isolatedImage? }
 *
 * The worker sends TWO requests to Gemini in parallel:
 *   1. Text analysis  → structured tags (category, colors, events, description)
 *   2. Image editing  → isolated garment with transparent background
 *
 * If isolation fails (quota, model error, etc.), the tags still return —
 * isolatedImage will simply be null and the client saves full-photo-only.
 *
 * Deploy:
 *   wrangler deploy
 *   wrangler secret put GEMINI_API_KEY
 */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'POST required' }, 405);
    }

    try {
      var body = await request.json();
      var imageBase64 = body.image || '';

      // Strip data-URL prefix if present
      if (imageBase64.indexOf(',') !== -1) {
        imageBase64 = imageBase64.split(',')[1];
      }

      if (!imageBase64) {
        return jsonResponse({ error: 'No image provided' }, 400);
      }

      if (!env.GEMINI_API_KEY) {
        return jsonResponse({ error: 'GEMINI_API_KEY not configured' }, 500);
      }

      // ── Parallel requests: tagging + isolation ──
      var tagPromise = geminiTag(env.GEMINI_API_KEY, imageBase64);
      var isoPromise = geminiIsolate(env.GEMINI_API_KEY, imageBase64);

      // Wait for both — isolation is best-effort
      var results = await Promise.allSettled([tagPromise, isoPromise]);

      // 1. Tags (required)
      var tagResult = results[0];
      if (tagResult.status === 'rejected' || tagResult.value.error) {
        var errDetail = tagResult.status === 'rejected'
          ? String(tagResult.reason)
          : tagResult.value.detail || tagResult.value.error;
        return jsonResponse(
          { error: 'Gemini tagging failed', detail: errDetail },
          502
        );
      }
      var tags = tagResult.value;

      // 2. Isolation (best-effort)
      var isoResult = results[1];
      var isolatedImage = null;
      if (isoResult.status === 'fulfilled' && isoResult.value && !isoResult.value.error) {
        isolatedImage = isoResult.value;
      }

      // Merge
      tags.isolatedImage = isolatedImage;

      return jsonResponse(tags);
    } catch (err) {
      return jsonResponse({ error: 'Worker error', detail: String(err) }, 500);
    }
  },
};

// ═══════════════════════════════════════════
// Gemini: Auto-tag clothing
// ═══════════════════════════════════════════
async function geminiTag(apiKey, imageBase64) {
  var prompt = [
    'You are a fashion stylist analyzing a photo of a clothing item or outfit.',
    'Respond ONLY with a valid JSON object (no markdown, no backticks, no explanation).',
    'The JSON must have exactly these keys:',
    '  "category": one of "tops", "bottoms", "dresses", "outerwear", "shoes", "accessories"',
    '  "colors": array of 1-4 primary color names (e.g. ["black", "white", "red"])',
    '  "eventTypes": array from ["casual", "work", "going-out", "exercise", "swimwear", "performing", "outdoors"] that this item suits',
    '  "description": a short 5-15 word description of the item',
    '',
    'Example: {"category":"tops","colors":["navy","white"],"eventTypes":["casual","work"],"description":"Navy striped button-down Oxford shirt"}',
  ].join('\n');

  var geminiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' +
    apiKey;

  var geminiBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 256,
    },
  };

  var geminiRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiBody),
  });

  if (!geminiRes.ok) {
    var errText = await geminiRes.text();
    return { error: 'Gemini API error', status: geminiRes.status, detail: errText };
  }

  var geminiData = await geminiRes.json();

  // Extract text
  var text = '';
  try {
    text = geminiData.candidates[0].content.parts[0].text || '';
  } catch (e) {
    return { error: 'Unexpected Gemini response format', raw: geminiData };
  }

  // Strip markdown fences
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  var tags;
  try {
    tags = JSON.parse(text);
  } catch (e) {
    return { error: 'Failed to parse Gemini JSON', raw: text };
  }

  // Validate & normalize
  var validCategories = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];
  if (validCategories.indexOf(tags.category) === -1) {
    tags.category = 'tops';
  }

  var validEvents = ['casual', 'work', 'going-out', 'exercise', 'swimwear', 'performing', 'outdoors'];
  if (Array.isArray(tags.eventTypes)) {
    tags.eventTypes = tags.eventTypes.filter(function (e) {
      return validEvents.indexOf(e) !== -1;
    });
  } else {
    tags.eventTypes = ['casual'];
  }

  if (!Array.isArray(tags.colors) || tags.colors.length === 0) {
    tags.colors = ['unknown'];
  }

  if (!tags.description || typeof tags.description !== 'string') {
    tags.description = 'Clothing item';
  }

  return tags;
}

// ═══════════════════════════════════════════
// Gemini: Isolate garment (remove background)
// ═══════════════════════════════════════════
async function geminiIsolate(apiKey, imageBase64) {
  // Use Gemini 2.0 Flash with image generation enabled
  // to produce a version with transparent/removed background.
  // Falls back gracefully if this model variant isn't available.
  
  var prompt = [
    'Remove the background from this clothing photo.',
    'Keep ONLY the clothing item/garment with a clean transparent background.',
    'Remove any person, skin, body parts — keep just the fabric/garment shape.',
    'Output just the isolated garment as a PNG image with transparent background.',
  ].join(' ');

  // Try the image-generation-capable model
  var geminiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=' +
    apiKey;

  var geminiBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: 'image/jpeg',
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  var geminiRes;
  try {
    geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });
  } catch (e) {
    // Network error — isolation fails silently
    return null;
  }

  if (!geminiRes.ok) {
    // 429, 503, model not available, etc. — fail silently
    return null;
  }

  var data;
  try {
    data = await geminiRes.json();
  } catch (e) {
    return null;
  }

  // Extract image from response
  // Gemini image-gen returns parts array with potential text + inline_data
  try {
    var parts = data.candidates[0].content.parts;
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].inline_data && parts[i].inline_data.data) {
        var mimeType = parts[i].inline_data.mime_type || 'image/png';
        return 'data:' + mimeType + ';base64,' + parts[i].inline_data.data;
      }
    }
  } catch (e) {
    // Couldn't parse — isolation not available
  }

  return null;
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders()),
  });
}
