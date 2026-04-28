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

  // Cloudflare Worker URL for Gemini auto-tagging (set after deploying worker)
  // See HARDWARE-SETUP.md Step 5 for deployment instructions
  aiWorkerUrl: '',

  // Auth token for the Cloudflare Worker (must match MIRROR_AUTH_TOKEN secret)
  // Generate one with: openssl rand -hex 16
  aiAuthToken: '',
};
