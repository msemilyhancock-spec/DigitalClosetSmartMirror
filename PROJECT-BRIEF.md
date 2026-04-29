# Magic Mirror v3 — Project Brief

## Vision
A smart mirror app that's a hybrid between the closet software in Clueless and a smart mirror. You browse your wardrobe, mix and match pieces paper-doll style on a reference photo of yourself, capture new items, and get BaZi-guided outfit recommendations. Barbie Glam aesthetic with a sunset background.

## Four Screens

### 1. Daily Dashboard (Home)
- Static sunset background with Barbie Glam aesthetic
- Time, weather (Open-Meteo, free, no API key)
- BaZi daily colors: dynamically recommended based on the day's ten-god relationship to the Geng Metal day master, not just the static lucky/avoid elements. For example, a day where the Wealth star (Wood) is active should emphasize greens differently than a day where the Resource star (Earth) dominates. The current v2 engine always shows the same three lucky elements (Fire/Wood/Water) — v3 should make color recommendations truly day-specific by factoring in the day pillar's stem and branch elements, hidden stems, and their ten-god relationships.
- BaZi guidance tiles: Romance, Exercise, Travel, Work Environment
- "What to Wear" color/vibe recommendation based on today's pillar
- Western horoscope (Sagittarius, scraped from Cafe Astrology via CORS proxy)
- All overlaid as glassmorphic panels on the sunset background

### 2. Closet Browser
- Full-screen wardrobe with big photo tiles
- Filter by: category (tops, bottoms, dresses, outerwear, shoes, accessories), color, event type (casual, work, going out)
- 500+ items supported via local Python server
- Pagination, grid view
- Tap an item to see it full-size or select it for the outfit builder

### 3. Outfit Builder (The Clueless Feature)
- Paper-doll style: standing reference photo of you as the base layer
- Garment slots: Top + Bottom (or Dress)
- Tap a slot → browse catalog filtered to that category → select a piece
- Isolated garment image overlays on your reference photo
- Mix and match until you like the combo
- Save outfit combos as favorites

### 4. Capture
- Webcam live view for capturing photos
- Take a photo
- Gemini API (via Cloudflare Worker) auto-tags: category, colors, event type, item description
- Cloudflare Worker also runs server-side garment isolation via Gemini image generation (removes body/background → transparent PNG). Both happen in parallel in a single request.
- Saves both: full outfit photo + isolated garment PNG to wardrobe server
- Isolated garments feed into the Outfit Builder for future paper-doll overlays

## Input System
- **Bluetooth keyboard/mouse:** Primary input for all screens — wardrobe browsing, capture trigger, precision work.
- Touch overlay planned as a future upgrade path.

## Tech Stack
- Single HTML file (vanilla JS, no framework)
- Barbie Glam aesthetic: hot pink (#E91E8C), gold (#D4A853), white, glassmorphism
- Static sunset background image
- Open-Meteo for weather (free, no key)
- BaZi engine for daily colors/guidance (client-side JS) — see bazi-engine.js
- Cloudflare Worker proxying Gemini API for auto-tagging + server-side garment isolation on capture
- wardrobe_server.py on localhost:3456 for full-quality image storage
- config.js for lat/lon, server URL, worker URL (gitignored)

## Hardware
- Orange Pi Zero 3 (1.5GB LPDDR4)
- Dell monitor (mini HDMI → HDMI → DVI)
- USB webcam (UVC-compatible)
- Bluetooth keyboard/mouse

## Files Being Carried Over
- **bazi-engine.js** — standalone BaZi calculation module with Emily's natal chart, day pillar calculator, color data, guidance generators, and "what to wear" recommendations
- **wardrobe_server.py** — local Python server (zero dependencies), handles upload/serve/delete/list for wardrobe images at localhost:3456, stores to ~/wardrobe/{category}/
- **config.example.js** — template with lat/lon and server URLs
- **.gitignore** — blocks config.js, wardrobe images, OS junk
- **scripts/setup-pi.sh** — one-command Orange Pi setup (Chromium, systemd services, wardrobe dirs, cursor hiding)

## Emily's BaZi Natal Chart Data
- Day Master: Geng Metal (Yang), stem index 6
- Year: Wu Chen (stem 4, branch 4)
- Month: Jia Zi (stem 0, branch 0)
- Day: Geng Xu (stem 6, branch 10)
- Hour: Geng Chen (stem 6, branch 4)
- Current luck pillar: Geng Shen (stem 6, branch 8)
- Lucky elements: Fire, Wood, Water
- Avoid: Metal, Earth
- Peach Blossom: Rabbit (branch index 3)
- Clash: Dragon (branch index 4)
- Three Harmony: Tiger-Horse-Dog (branch indices 2, 6, 10)
- Anchor date: Dec 21, 1988 = sexagenary cycle index 46
- Western: Sagittarius Sun, Gemini Moon, Capricorn Rising, Scorpio Midheaven

## What Needs To Be Built New
2. Closet browser (full-screen, big tiles, filters)
3. Outfit builder with paper-doll overlay on reference photo
4. ~~MediaPipe garment isolation pipeline~~ → Done: server-side via Cloudflare Worker
5. ~~Cloudflare Worker for Gemini auto-tagging~~ → Done: tags + isolation in parallel
6. ~~IR flash tracking in browser JS~~ → Removed (keyboard/mouse input only)
7. New 4-screen navigation flow

## API Keys Needed
- **Gemini API key** — get from https://aistudio.google.com/apikey (free tier)
- Goes into Cloudflare Worker as a secret via `wrangler secret put GEMINI_API_KEY`
- Never stored in any file in the repo
- Everything else (weather, BaZi, horoscope) is free with no key
