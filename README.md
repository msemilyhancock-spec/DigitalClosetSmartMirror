# DigitalClosetSmartMirror

A smart mirror app inspired by the closet software in *Clueless* — browse your wardrobe, mix and match outfits paper-doll style, capture new items, and get daily BaZi-guided color and outfit recommendations. Barbie Glam aesthetic with a beach sunset background.

Runs as a single-page HTML app in Chromium kiosk mode on an Orange Pi Zero 3.

---

## Screens

### 1. Daily Dashboard ✅
The home screen. Displays at-a-glance daily info:
- **Clock** — large updating time, day/date, sunrise/sunset
- **Weather** — current conditions, UV index, 8-hour forecast strip (Open-Meteo, free, no API key)
- **BaZi Daily Colors** — dynamically recommended color palette based on the day pillar's ten-god relationship to the Geng Metal day master. Changes every day.
- **BaZi Guidance Tiles** — Exercise, Travel, Work, Energy — with best-time windows and element-driven advice
- **Day Pillar Badge** — Chinese characters, animal, theme, ten-god
- **Romance Rating** — 1–5 hearts based on Peach Blossom, Clash, Three Harmony, and ten-god factors
- **Horoscope** — Sagittarius daily horoscope scraped from Cafe Astrology (summarized to 3 sentences)
- **Zen Screensaver** — activates after 5 minutes of inactivity. Large centered clock + weather over the sunset. Click/tap to wake.

### 2. Closet Browser 🚧
Full-screen wardrobe grid with big photo tiles. Filter by category, color, event type. Pagination for 500+ items. Served by the local Python wardrobe server.

### 3. Outfit Builder 🚧
Paper-doll style: standing reference photo as the base layer, overlay isolated garment images for tops/bottoms/dresses. Mix and match, save favorite combos.

### 4. Capture 🚧
Webcam live view → take photo → Gemini API auto-tags category/colors/event type → server-side garment isolation via Cloudflare Worker → saves to wardrobe server.

---

## File Structure

```
├── mirror-v3.html          # Main app (single file, all CSS/JS/BaZi engine inlined)
├── config.js               # Location config (lat/lon, server URL) — gitignored
├── config_example.js        # Config template
├── bazi-engine.js           # BaZi engine source (also inlined in mirror-v3.html)
├── wardrobe_server.py       # Local Python image server (zero dependencies)
├── setup-pi.sh              # Orange Pi setup script
├── PROJECT-BRIEF.md         # Full project spec
└── README.md                # This file
```

## Quick Start

### 1. Config
```bash
cp config_example.js config.js
# Edit config.js with your lat/lon (Google Maps → right-click → "What's here?")
```

### 2. Open in browser
Just open `mirror-v3.html` in any browser. Everything is self-contained — BaZi engine, sunset background image, all CSS and JS are inlined. No build step, no npm, no framework.

### 3. Wardrobe server (for Closet/Capture screens)
```bash
python3 wardrobe_server.py
# Runs on localhost:3456
# Endpoints: POST /upload, GET /wardrobe/{category}/{filename},
#            POST /delete, GET /list, GET /ping
```

### 4. Orange Pi kiosk mode
```bash
bash setup-pi.sh
# Installs Chromium, sets up systemd services, creates wardrobe dirs, hides cursor
```

---

## Hardware

| Component | Detail |
|-----------|--------|
| Board | Orange Pi Zero 3 (1.5GB LPDDR4) |
| Display | Dell monitor (mini HDMI → HDMI → DVI) |
| Camera | USB webcam (UVC-compatible) |
| Input | Bluetooth keyboard/mouse |

---

## Design System

**Aesthetic:** Barbie Glam — hot pink, gold, white, glassmorphism on a beach sunset background.

| Token | Value |
|-------|-------|
| Primary Pink | `#E91E8C` |
| Gold | `#D4A853` |
| Heading Font | Playfair Display |
| Body Font | Quicksand |
| Accent Script | Sacramento |

**Layout:** 100vh × 100vw, no scrolling (except wardrobe grid in Closet Browser). All units are relative (vh/vw/clamp) to scale across resolutions.

---

## BaZi Engine

The BaZi engine (`bazi-engine.js`, also inlined in `mirror-v3.html`) calculates daily Four Pillars data personalized to Emily's natal chart:

- **Day Master:** Geng Metal (Yang), STRONG chart
- **Lucky Elements:** Fire, Wood, Water (drain/control Metal)
- **Avoid Elements:** Metal, Earth (strengthen Metal)
- **Peach Blossom:** Rabbit | **Clash:** Dragon | **Three Harmony:** Tiger-Horse-Dog

### What changes daily
- **Day pillar** cycles through the 60-day sexagenary cycle
- **Ten-god relationship** between the day stem and the day master determines the day's theme (Wealth, Authority, Output, Companion, Resource)
- **Color recommendations** are scored and ranked based on which elements are active in the pillar (stem, branch, hidden stems) and their ten-god weights
- **Guidance tiles** (exercise, travel, work, romance) adapt to the day's element composition
- **Best-time windows** are calculated from hour pillars

### Key functions
```javascript
bzDayPillar(date)           // → {stem, branch}
bzDailyColors(dp)           // → {recommend[], soften[], narrative, dayTheme, stemTenGod}
bzExerciseFor(dp)           // → {headline, bestTime, body, tags}
bzTravelFor(dp)             // → {headline, bestTime, body, tags}
bzWorkEnvFor(dp)            // → {headline, bestTime, body, tags}
bzRomanceFor(dp)            // → {rating, note, bestTime, tenGod}
```

---

## APIs & Data Sources

| Source | Used For | Auth |
|--------|----------|------|
| [Open-Meteo](https://open-meteo.com) | Weather + forecast | None (free) |
| [Cafe Astrology](https://cafeastrology.com) | Sagittarius horoscope | Scraped via CORS proxy |
| BaZi Engine | Daily colors, guidance, romance | Client-side calculation |
| Gemini API | Capture auto-tagging (future) | API key via Cloudflare Worker |

---

## Status

- [x] Daily Dashboard
- [x] BaZi engine with dynamic ten-god color system
- [x] Weather + 8-hour forecast
- [x] Horoscope (summarized)
- [x] Zen screensaver (5-min inactivity)
- [x] 4-screen navigation
- [ ] Closet Browser
- [ ] Outfit Builder
- [x] Capture + Gemini auto-tagging + server-side garment isolation
