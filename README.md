# DigitalClosetSmartMirror

A smart mirror app inspired by the closet software in *Clueless* — browse your wardrobe, mix and match outfits paper-doll style, capture new items with AI auto-tagging, and get daily BaZi-guided color and outfit recommendations. Barbie Glam aesthetic with a beach sunset background.

Runs as a single-page HTML app in Chromium kiosk mode on an Orange Pi Zero 3.

---

## Screens

### 1. Daily Dashboard
The home screen with at-a-glance daily info: large clock with sunrise/sunset, weather with 8-hour forecast strip (Open-Meteo), BaZi daily color palette based on ten-god relationships, guidance tiles for exercise/travel/work/romance, day pillar badge, and a Sagittarius horoscope scraped from Cafe Astrology. A zen screensaver activates after 5 minutes of inactivity.

### 2. Closet Browser
Full-screen wardrobe grid with big photo tiles. Filter by category (tops, bottoms, dresses, outerwear, shoes, accessories), color, and event type (casual, work, going-out, etc). Tap an item to see it full-size, edit its tags, or select it for the Outfit Builder. Reference photos are filtered out automatically.

### 3. Outfit Builder
Paper-doll style: standing reference photo as the base layer, overlay isolated garment images for tops, bottoms, and dresses/one-pieces. All three slots are always visible — selecting a dress auto-clears top+bottom and vice versa. Randomize picks from all categories including dresses. Save favorite combos, reload them later.

### 4. Capture
Webcam live view → take photo → Gemini API (via Cloudflare Worker) auto-tags category/colors/event type → MediaPipe selfie segmentation isolates the garment (lazy-loaded, graceful fallback) → saves to wardrobe server with metadata persisted to localStorage.

---

## Hardware

| Component | Detail |
|-----------|--------|
| Board | Orange Pi Zero 3 (1.5GB LPDDR4) |
| Display | Dell monitor (mini HDMI → HDMI → DVI adapter chain) |
| Camera | USB webcam (UVC-compatible) |
| Input | Bluetooth keyboard/mouse (IR remote planned) |
| Storage | microSD card (32GB+ recommended) |

---

## File Structure

```
├── mirror-v3-7.html         # Main app (single file, all CSS/JS inline)
├── bazi-engine.js            # BaZi engine (loaded via <script>)
├── config.js                 # Your config (gitignored)
├── config_example.js         # Config template
├── wardrobe_server.py        # Local Python image server (zero dependencies)
├── setup-pi.sh               # Orange Pi auto-setup script
├── index.js                  # Cloudflare Worker for Gemini auto-tagging
├── wrangler.toml             # Worker deployment config
├── .gitignore
├── HARDWARE-SETUP.md         # End-to-end setup guide (also available as PDF)
├── PROJECT-BRIEF.md          # Full project spec
└── README.md                 # This file
```

---

## Quick Start

See `HARDWARE-SETUP.md` for the complete walkthrough from unboxing to running mirror. The short version:

1. **Step 0 (Mac):** Download files → create GitHub repo → push
2. **Step 1 (Mac):** Flash SD card with Armbian/Debian desktop image
3. **Step 2 (Physical):** Connect monitor, webcam, keyboard, power
4. **Step 3 (Pi):** First boot, WiFi, update system, enable SSH
5. **Step 4 (Pi):** Clone repo, create config.js, run `setup-pi.sh`
6. **Step 5 (Mac):** Deploy Cloudflare Worker with Gemini API key + auth token
7. **Step 6 (Pi):** Reboot — mirror auto-launches
8. **Step 7 (Pi):** Smoke test all screens

---

## Config Reference

```javascript
window.MIRROR_CONFIG = {
  lat: 30.3322,                              // Latitude for weather
  lon: -81.6557,                             // Longitude for weather
  wardrobeServer: 'http://localhost:3456',    // Wardrobe server URL
  aiWorkerUrl: '',                           // Cloudflare Worker URL for Gemini tagging
  aiAuthToken: '',                           // Auth token (must match MIRROR_AUTH_TOKEN secret)
};
```

---

## Wardrobe Server API

The Python wardrobe server (`wardrobe_server.py`) runs on the Pi at `localhost:3456`. Zero external dependencies.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/ping` | Health check |
| GET | `/list` | List all items (JSON: `{category: [filenames]}`) |
| GET | `/wardrobe/{category}/{filename}` | Serve an image |
| POST | `/upload` | Upload an image (JSON: `{category, filename, image}`) |
| POST | `/delete` | Delete an image (JSON: `{category, filename}`) |

Storage layout on the Pi:
```
~/wardrobe/
├── tops/
├── bottoms/
├── dresses/
├── outerwear/
├── shoes/
├── accessories/
└── reference/          # Reference photo for Outfit Builder (not shown in Closet)
```

---

## BaZi Engine

The BaZi engine (`bazi-engine.js`) calculates daily Four Pillars data personalized to the natal chart (Day Master: Geng Metal, Yang, strong chart).

Key functions:
```javascript
bzDayPillar(date)           // → {stem, branch}
bzDailyColors(dp)           // → {recommend[], soften[], narrative, dayTheme}
bzExerciseFor(dp)           // → {headline, bestTime, body, tags}
bzTravelFor(dp)             // → {headline, bestTime, body, tags}
bzWorkEnvFor(dp)            // → {headline, bestTime, body, tags}
bzRomanceFor(dp)            // → {rating, note, bestTime, tenGod}
```

---

## Design System

| Token | Value |
|-------|-------|
| Primary Pink | `#E91E8C` |
| Gold | `#D4A853` |
| Heading Font | Playfair Display |
| Body Font | Quicksand |
| Accent Script | Sacramento |
| Layout | 100vh × 100vw, no scrolling, `clamp()` for scaling |
| Panels | Glassmorphism with `backdrop-filter: blur()` |

---

## Auto-Updates

The setup script installs a cron job that checks GitHub every 30 minutes. Push from your Mac → Pi auto-pulls and restarts Chromium. `config.js` and `~/wardrobe/` are never affected.

---

## Security

The Cloudflare Worker is protected by an auth token (`X-Mirror-Auth` header). The Gemini API key is stored as a Cloudflare secret — it never touches your Mac or the Pi. The Worker rejects requests without a valid token.
