// Magic Mirror — Configuration
// Copy this file to config.js and fill in your values.
// config.js is gitignored — your coordinates stay private.

window.MIRROR_CONFIG = {
  // Location for weather (lat/lon)
  // Find yours: Google Maps → right-click any spot → "What's here?"
  lat: 30.3322,
  lon: -81.6557,

  // Wardrobe catalog server URL (runs on the Orange Pi)
  wardrobeServer: 'http://localhost:3456',

  // Cloudflare Worker URL for Gemini auto-tagging + garment isolation
  // Deploy the worker first:
  //   wrangler deploy
  //   wrangler secret put GEMINI_API_KEY
  // Then paste the URL here:
  aiWorkerUrl: 'https://mirror-gemini-tagger.<your-subdomain>.workers.dev',
};
