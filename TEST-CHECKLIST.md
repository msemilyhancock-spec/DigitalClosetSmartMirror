# DigitalClosetSmartMirror — Test Checklist

Run through these checks after setup to verify everything works. Each section can be tested independently.

---

## 1. Dashboard Loads

- [ ] Clock shows correct time and updates every second
- [ ] Date and day of week are correct
- [ ] Sunrise/sunset times are displayed

## 2. Weather

- [ ] Current temperature and conditions are shown
- [ ] UV index is displayed
- [ ] 8-hour forecast strip populates with icons and temps
- [ ] No errors in console related to Open-Meteo fetch

## 3. BaZi Engine

- [ ] Daily color palette shows recommended colors (not "LOADING...")
- [ ] Day pillar badge shows Chinese characters, animal, and theme
- [ ] Guidance tiles (Exercise, Travel, Work, Energy) have content
- [ ] Romance rating shows 1–5 hearts
- [ ] Colors and guidance change the next day (check after midnight)

## 4. Horoscope

- [ ] Sagittarius horoscope text is displayed (3 sentences)
- [ ] No CORS errors in console

## 5. Zen Screensaver

- [ ] After 5 minutes of no interaction, screensaver activates
- [ ] Screensaver shows large clock + weather over sunset
- [ ] Click or tap wakes from screensaver
- [ ] Mouse movement alone does NOT wake from screensaver

## 6. Navigation

- [ ] All four tab buttons are visible and labeled
- [ ] Tapping each tab switches to the correct screen
- [ ] Active tab is visually highlighted
- [ ] Switching screens resets screensaver timer

## 7. Capture — Webcam

- [ ] Switching to Capture tab shows live webcam preview
- [ ] Camera permission prompt appears (first time only)
- [ ] Preview is responsive and fills the capture area

## 8. Capture — Take Photo & Auto-Tag

- [ ] Taking a photo freezes the preview and shows the captured image
- [ ] If `aiWorkerUrl` is set: Gemini auto-tag runs and populates category, colors, event type
- [ ] If `aiWorkerUrl` is empty: manual tag selection is available
- [ ] Category, color, and event type selectors work

## 9. Capture — Save

- [ ] Saving a captured item shows a success message
- [ ] Item is uploaded to the wardrobe server (check `ls ~/wardrobe/{category}/`)
- [ ] MediaPipe isolation runs at save time (check console for "isolated" or "fallback" message)
- [ ] If MediaPipe fails, full photo saves without error

## 10. Closet Browser

- [ ] Switching to Closet tab shows the wardrobe grid
- [ ] Saved item from Step 9 appears with correct category
- [ ] Category filter buttons work (All, Tops, Bottoms, Dresses, etc.)
- [ ] Tapping an item opens the detail view
- [ ] Tags (colors, event type) are editable in detail view
- [ ] "Use in Outfit" button is available

## 11. Closet — Reference Photo Filtering

- [ ] Place a photo at `~/wardrobe/reference/reference.jpg`
- [ ] Reference photo does NOT appear in the Closet grid
- [ ] Reference photo DOES appear as the mannequin base in Outfit Builder

## 12. Outfit Builder

- [ ] Reference photo loads as the mannequin background
- [ ] If no reference photo: placeholder silhouette is shown
- [ ] All three slots visible: Top, Bottom, Dress/One-Piece
- [ ] Tapping a slot opens a picker grid filtered to that category
- [ ] Selecting a top+bottom clears any dress from the mannequin
- [ ] Selecting a dress clears top+bottom from the mannequin
- [ ] Randomize picks from all categories including dresses
- [ ] Clear removes all garments from mannequin
- [ ] BaZi recommended colors bar shows at the bottom

## 13. Outfit Builder — Save & Reload

- [ ] Save Outfit stores the combo
- [ ] Saved outfit appears in the list below
- [ ] Tapping a saved outfit reloads it onto the mannequin
- [ ] Deleting a saved outfit removes it from the list

## 14. Wardrobe Server

- [ ] `curl http://localhost:3456/ping` returns OK
- [ ] `curl http://localhost:3456/list` returns JSON with categories
- [ ] Images are accessible via `http://localhost:3456/wardrobe/{category}/{filename}`

## 15. Persistence

- [ ] Reload the page — all closet metadata, saved outfits, and settings persist
- [ ] Reboot the Pi (`sudo reboot`) — mirror auto-launches
- [ ] After reboot: wardrobe items still present, saved outfits still listed

## 16. Auto-Update

- [ ] Push a trivial change from your Mac (e.g., add a comment to `mirror-v3-7.html`)
- [ ] Wait up to 30 minutes (or SSH in and run `cd ~/magic-mirror && git pull`)
- [ ] Verify the change is reflected after Chromium restarts

## 17. Cloudflare Worker Auth

- [ ] With correct `aiAuthToken` in config: auto-tagging works
- [ ] With wrong/empty token: Worker returns 401 (check console)

---

## Quick Smoke Test (5 checks)

Short on time? Just verify these:

1. [ ] Dashboard loads with BaZi colors and weather
2. [ ] Capture tab shows webcam and can take a photo
3. [ ] Save a captured item → it appears in the Closet with correct tags
4. [ ] Set a reference photo → it appears in Outfit Builder, NOT in Closet
5. [ ] Reboot → everything persists
