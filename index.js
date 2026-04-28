/**
 * Cloudflare Worker — Gemini Auto-Tag Proxy
 * Accepts a base64 image, sends it to Gemini for clothing analysis,
 * returns structured tags (category, colors, eventTypes, description).
 *
 * Deploy:
 *   wrangler deploy
 *   wrangler secret put GEMINI_API_KEY
 *   wrangler secret put MIRROR_AUTH_TOKEN
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

    // Auth check — reject requests without a valid token
    if (env.MIRROR_AUTH_TOKEN) {
      var authHeader = request.headers.get('X-Mirror-Auth') || '';
      if (authHeader !== env.MIRROR_AUTH_TOKEN) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
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
        env.GEMINI_API_KEY;

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
        return jsonResponse(
          { error: 'Gemini API error', status: geminiRes.status, detail: errText },
          502
        );
      }

      var geminiData = await geminiRes.json();

      // Extract text from response
      var text = '';
      try {
        text = geminiData.candidates[0].content.parts[0].text || '';
      } catch (e) {
        return jsonResponse({ error: 'Unexpected Gemini response format', raw: geminiData }, 502);
      }

      // Strip markdown fences if present
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

      var tags;
      try {
        tags = JSON.parse(text);
      } catch (e) {
        return jsonResponse({ error: 'Failed to parse Gemini JSON', raw: text }, 502);
      }

      // Validate & normalize
      var validCategories = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories'];
      if (validCategories.indexOf(tags.category) === -1) {
        tags.category = 'tops'; // safe default
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

      return jsonResponse(tags);
    } catch (err) {
      return jsonResponse({ error: 'Worker error', detail: String(err) }, 500);
    }
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Mirror-Auth',
  };
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, corsHeaders()),
  });
}
