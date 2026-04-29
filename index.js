/**
 * Cloudflare Worker — Gemini Auto-Tag + Garment Isolation Proxy
 *
 * POST /
 *   Body: { image: "<base64 or data-url>" }
 *   Returns: { category, colors, eventTypes, description, isolatedImage? }
 *
 * Tagging uses gemini-2.5-flash (text model).
 * Isolation uses gemini-2.5-flash-image (image generation model).
 * Both run in parallel. Isolation is best-effort.
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

      // Run tagging and isolation in parallel
      var results = await Promise.allSettled([
        geminiTag(env.GEMINI_API_KEY, imageBase64),
        geminiIsolate(env.GEMINI_API_KEY, imageBase64)
      ]);

      // 1. Tags (required)
      var tagResult = results[0];
      if (tagResult.status === 'rejected') {
        return jsonResponse({ error: 'Gemini tagging failed', detail: String(tagResult.reason) }, 502);
      }
      var tags = tagResult.value;
      if (tags.error) {
        return jsonResponse(tags, 502);
      }

      // 2. Isolation (best-effort)
      var isoResult = results[1];
      tags.isolatedImage = null;
      if (isoResult.status === 'fulfilled' && typeof isoResult.value === 'string') {
        tags.isolatedImage = isoResult.value;
      }

      return jsonResponse(tags);
    } catch (err) {
      return jsonResponse({ error: 'Worker error', detail: String(err) }, 500);
    }
  },
};

// ═══════════════════════════════════════════
// Tagging — gemini-2.5-flash (text)
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
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' +
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
      thinkingConfig: { thinkingBudget: 0 },
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

  // Extract text from response.
  // gemini-2.5-flash may include thinking parts — skip those, find the JSON.
  var text = '';
  try {
    var parts = geminiData.candidates[0].content.parts;
    for (var i = 0; i < parts.length; i++) {
      // Skip thinking parts
      if (parts[i].thought) continue;
      // Look for a part containing JSON
      if (parts[i].text && parts[i].text.indexOf('{') !== -1) {
        text = parts[i].text;
        break;
      }
    }
    // Fallback: grab last non-thinking text part
    if (!text) {
      for (var j = parts.length - 1; j >= 0; j--) {
        if (parts[j].text && !parts[j].thought) {
          text = parts[j].text;
          break;
        }
      }
    }
  } catch (e) {
    return { error: 'Unexpected Gemini response format', raw: JSON.stringify(geminiData).substring(0, 500) };
  }

  if (!text) {
    return { error: 'No text in Gemini response', raw: JSON.stringify(geminiData).substring(0, 500) };
  }

  // Strip markdown fences if present
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Extract JSON from text — find first { to last }
  var jsonStart = text.indexOf('{');
  var jsonEnd = text.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    text = text.substring(jsonStart, jsonEnd + 1);
  }

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
// Isolation — gemini-2.5-flash-image
// Returns a data URL string on success, null on failure.
// ═══════════════════════════════════════════
async function geminiIsolate(apiKey, imageBase64) {
  var prompt =
    'Edit this image: erase everything except the main clothing item. ' +
    'Replace the background, person, skin, and body with a solid white background. ' +
    'Keep the garment centered and intact. Output as a new image.';

  var geminiUrl =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=' +
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
    return null;
  }

  if (!geminiRes.ok) {
    return null;
  }

  var data;
  try {
    data = await geminiRes.json();
  } catch (e) {
    return null;
  }

  try {
    var parts = data.candidates[0].content.parts;
    for (var i = 0; i < parts.length; i++) {
      // Check camelCase (inlineData) — what the API actually returns
      if (parts[i].inlineData && parts[i].inlineData.data) {
        var mimeType = parts[i].inlineData.mimeType || 'image/png';
        return 'data:' + mimeType + ';base64,' + parts[i].inlineData.data;
      }
      // Also check snake_case (inline_data) just in case
      if (parts[i].inline_data && parts[i].inline_data.data) {
        var mimeType2 = parts[i].inline_data.mime_type || 'image/png';
        return 'data:' + mimeType2 + ';base64,' + parts[i].inline_data.data;
      }
    }
  } catch (e) {
    // no image in response
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
