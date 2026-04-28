# DigitalClosetSmartMirror — Hardware Setup Guide

Complete walkthrough from downloading your files from Claude to a running smart mirror. This guide covers creating the GitHub repo, flashing the Orange Pi, connecting hardware, installing the software, deploying the AI tagger, and launching the app.

---

## What You Need

### Accounts (Free)

| Account | What For | Sign Up |
|---------|----------|---------|
| GitHub | Hosting your code, pushing updates to the Pi | [github.com/signup](https://github.com/signup) |
| Cloudflare | Hosting the Gemini AI tagger Worker | [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) |
| Google AI Studio | Gemini API key for auto-tagging clothes | [aistudio.google.com](https://aistudio.google.com/apikey) |

### Software on Your Mac/PC

| Software | What For | Install |
|----------|----------|---------|
| Git | Version control | Pre-installed on macOS. Windows: [git-scm.com](https://git-scm.com/) |
| Node.js 18+ | Running the Wrangler CLI to deploy the Worker | [nodejs.org](https://nodejs.org/) — check with `node --version` |
| Balena Etcher (or `dd`) | Flashing the OS image to the SD card | [etcher.balena.io](https://etcher.balena.io/) |

### Hardware Checklist

| Item | Detail | Notes |
|------|--------|-------|
| Orange Pi Zero 3 | 1.5GB LPDDR4 model | The 4GB model also works, more headroom |
| microSD card | 32GB+ Class 10 / U1 minimum | Faster cards = snappier UI |
| USB-C power supply | 5V 3A minimum | The official Orange Pi PSU or a good phone charger |
| Dell monitor | Any model with DVI, HDMI, or VGA input | You'll adapt from mini-HDMI |
| Mini HDMI to HDMI adapter/cable | For Orange Pi video out | The Zero 3 has a mini HDMI port |
| HDMI to DVI adapter | If your Dell monitor only has DVI | Skip if monitor has HDMI input |
| USB webcam | UVC-compatible | Most webcams work. Logitech C270/C920 tested. |
| Bluetooth keyboard + mouse | For initial setup and backup input | Any BT keyboard/mouse combo |
| Ethernet cable (optional) | For initial setup if no WiFi | WiFi works fine after setup |
| Card reader | For flashing the microSD | USB or built-in |

### Adapter Chain (Video)

The signal path from Pi to monitor:

```
Orange Pi Zero 3 [mini HDMI] → mini-HDMI-to-HDMI adapter → HDMI cable → HDMI-to-DVI adapter → Dell monitor [DVI]
```

If your Dell monitor has HDMI input directly, skip the DVI adapter and just run HDMI straight in.

---

## Step 0: Download Files and Create the GitHub Repo

> **Where:** On your Mac/PC — not the Orange Pi.

### Download Your Project Files

Download all the project files from Claude to a folder on your computer. You should have:

- `mirror-v3-7.html` — the main mirror app
- `bazi-engine.js` — BaZi Four Pillars engine
- `config_example.js` — config template
- `wardrobe_server.py` — local image server
- `setup-pi.sh` — automated Pi setup script
- `index.js` — Cloudflare Worker for AI tagging
- `wrangler.toml` — Worker deployment config
- `HARDWARE-SETUP.md` — this guide

### Create a `.gitignore` File

Before initializing git, create a `.gitignore` file in the project folder so your private config never gets pushed:

```
config.js
```

### Create the GitHub Repo

1. Go to [https://github.com/new](https://github.com/new)
2. Name the repo `magic-mirror` (or whatever you prefer)
3. Set it to **Private**
4. Do **not** initialize with a README — you'll push the existing files
5. Click "Create repository"

### Push Your Files to GitHub

In your terminal on your Mac:
```bash
cd path/to/your/magic-mirror-files

git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/magic-mirror.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

### Verify

Go to your repo page on GitHub and confirm you see all the project files. `config.js` should **not** appear — only `config_example.js` (the template) is tracked.

From this point on, the repo is your source of truth. You'll clone it onto the Pi in Step 4, and any changes you make on your Mac can be pushed and auto-pulled by the Pi.

---

## Step 1: Flash the microSD Card

> **Where:** On your Mac/PC.

### Download the OS Image

Go to the [Orange Pi downloads page](http://www.orangepi.org/html/hardWare/computerAndMicrocontrollers/service-and-support/Orange-Pi-Zero-3.html) and download the **Debian Desktop** or **Ubuntu Desktop** image for the Zero 3. You need a desktop image (not server) because the mirror runs in a graphical browser.

Alternatively, use [Armbian](https://www.armbian.com/orangepi-zero3/) — download the desktop variant with XFCE or similar.

### Flash the Image

**On macOS/Linux (using `dd`):**
```bash
# Find your SD card device (BE CAREFUL — wrong device = data loss)
# macOS:
diskutil list
# Linux:
lsblk

# Unmount the card
# macOS:
diskutil unmountDisk /dev/diskN
# Linux:
sudo umount /dev/sdX*

# Flash (replace /dev/diskN or /dev/sdX with your actual device)
# macOS:
sudo dd if=orangepi-zero3-desktop.img of=/dev/rdiskN bs=4m status=progress
# Linux:
sudo dd if=orangepi-zero3-desktop.img of=/dev/sdX bs=4M status=progress

sync
```

**Using Balena Etcher (easier, any OS):**
1. Download [Balena Etcher](https://etcher.balena.io/)
2. Select the downloaded `.img` or `.img.xz` file
3. Select your microSD card
4. Click "Flash!"

### Insert the Card

Pop the flashed microSD into the Orange Pi Zero 3's card slot (on the bottom of the board).

---

## Step 2: Connect the Hardware

> **Where:** Physical setup — plugging cables into the Orange Pi and monitor.

### Video

1. Plug the **mini HDMI adapter** into the Orange Pi's mini HDMI port.
2. Connect an **HDMI cable** from the adapter to your monitor (or to an HDMI-to-DVI adapter if your monitor only has DVI).
3. Power on the monitor.

### Webcam

Plug the **USB webcam** into one of the Orange Pi's USB ports. The Zero 3 has one USB 2.0 and one USB 3.0 port — either works.

### Keyboard/Mouse

Pair your **Bluetooth keyboard and mouse** after first boot (see Step 3). For initial setup, you can plug in a USB keyboard/mouse temporarily if Bluetooth isn't ready yet.

### Power

Plug in the **USB-C power supply** last. The Orange Pi will boot automatically.

### Network

Connect an **Ethernet cable** for the most reliable initial setup. Or configure WiFi on first boot (see Step 3).

---

## Step 3: First Boot & OS Setup

> **Where:** On the Orange Pi. From here through Step 4 and Step 6–7, everything happens on the Pi's own desktop and terminal — not your Mac.

### Initial Login

The default credentials vary by image:
- **Orange Pi Official:** `root` / `orangepi` (or `orangepi` / `orangepi`)
- **Armbian:** You'll be prompted to create a user on first boot

### Connect to WiFi (if no Ethernet)

If you connected Ethernet in Step 2, you're already online — skip to **Update the System** below.

On the desktop, click the network icon in the system tray and connect to your WiFi network.

Or from the terminal:
```bash
# Scan for networks
sudo nmcli dev wifi list

# Connect
sudo nmcli dev wifi connect "YourSSID" password "YourPassword"
```

### Pair Bluetooth Keyboard/Mouse

From the desktop: open Bluetooth settings → scan → pair your keyboard/mouse.

Or from the terminal:
```bash
bluetoothctl
# Inside bluetoothctl:
power on
agent on
scan on
# Wait for your device to appear, note its MAC address
pair XX:XX:XX:XX:XX:XX
trust XX:XX:XX:XX:XX:XX
connect XX:XX:XX:XX:XX:XX
exit
```

### Update the System

```bash
sudo apt-get update && sudo apt-get upgrade -y
```

### Set the Timezone

```bash
sudo timedatectl set-timezone America/New_York
# Or your timezone. List all:
# timedatectl list-timezones
```

### Expand Filesystem (if needed)

Some images don't use the full SD card by default:
```bash
sudo orangepi-config
# Navigate to System → Resize filesystem
```

### Enable SSH (for Remote Access)

You'll need SSH to push updates and manage the Pi from your Mac without walking over to the monitor.

```bash
sudo apt-get install -y openssh-server
sudo systemctl enable ssh
sudo systemctl start ssh
```

Find the Pi's IP address (you'll need this later):
```bash
hostname -I
```

Test from your Mac (open a new terminal on your Mac for this):
```bash
ssh your_username@THE_IP_ADDRESS
```

Write down the IP — you'll use it for remote updates and troubleshooting. If you want a stable IP, assign a static lease in your router's DHCP settings.

---

## Step 4: Install the Mirror Software

> **Where:** On the Orange Pi.

### Install Git and Clone the Repo

```bash
sudo apt-get install -y git
git clone https://github.com/YOUR_USERNAME/magic-mirror.git ~/magic-mirror
cd ~/magic-mirror
```

Replace `YOUR_USERNAME` with your GitHub username — the same repo you created in Step 0.

### Create Your Config

```bash
cp config_example.js config.js
nano config.js
```

Set your lat/lon (look up your coordinates on Google Maps), and leave `aiWorkerUrl` and `aiAuthToken` empty for now — you'll fill them in after deploying the Cloudflare Worker in Step 5.

### Run the Setup Script

```bash
chmod +x setup-pi.sh
./setup-pi.sh
```

The setup script installs Chromium, Python 3, OpenSSH, and unclutter if they're not already present. It also creates wardrobe directories (including `~/wardrobe/reference/`), sets up systemd services for the wardrobe server and Chromium kiosk, enables auto-login so the mirror launches unattended after a reboot, hides the cursor, disables screen blanking, adds your user to the `video` group for webcam access, and installs a cron job for auto-updates from GitHub.

> **Note:** The Chromium package is called `chromium-browser` on some distros and `chromium` on others. The setup script detects which one is available automatically. If you're installing manually, try both names.

After the script finishes, **log out and back in** (or reboot) so the `video` group change takes effect — otherwise the webcam may not be accessible to the browser.

---

## Step 5: Deploy the Cloudflare Worker (for AI Tagging)

> **Where:** On your Mac/PC — not the Orange Pi. The Pi doesn't need Node.js.

### Get a Gemini API Key

1. Go to [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with Google
3. Click "Create API key"
4. Copy the key

### Install Wrangler and Deploy

On your Mac (you'll need Node.js 18 or newer — check with `node --version`):
```bash
# Install wrangler
npm install -g wrangler

# Log in to Cloudflare (opens a browser window)
wrangler login

# Navigate to the repo directory (index.js and wrangler.toml are in the root)
cd path/to/magic-mirror

# Store the Gemini key as a secret
wrangler secret put GEMINI_API_KEY
# Paste your key when prompted

# Generate an auth token and store it as a secret
# (this prevents strangers from using your Worker)
openssl rand -hex 16
# Copy the output — you'll need it in two places
wrangler secret put MIRROR_AUTH_TOKEN
# Paste the token when prompted

# Deploy
wrangler deploy
```

Copy the printed URL (e.g., `https://mirror-gemini-tagger.your-subdomain.workers.dev`).

### Add the Worker URL and Auth Token to Config

> **Where:** Back on the Orange Pi now (SSH in from your Mac, or walk over to the Pi).

```bash
nano ~/magic-mirror/config.js
```
Set `aiWorkerUrl` to the URL you copied, and `aiAuthToken` to the same token you generated above.

---

## Step 6: Launch

> **Where:** On the Orange Pi.

### Start Everything

```bash
sudo systemctl start wardrobe-server
sudo systemctl start magic-mirror
```

Or simply reboot — both services auto-start:
```bash
sudo reboot
```

### What Happens on Boot

1. Auto-login brings up the desktop (no password prompt).
2. `unclutter` hides the mouse cursor after 1 second of inactivity.
3. `wardrobe-server.service` starts the Python image server on port 3456.
4. `magic-mirror.service` waits 5 seconds, then launches Chromium in fullscreen kiosk mode pointing at `mirror-v3-7.html`.
5. The mirror app loads: clock, weather, BaZi, horoscope. Ready to use.

### Updating the Mirror Software

The setup script installs a cron job that checks your GitHub repo for new commits every 30 minutes. If it finds changes, it pulls them and restarts Chromium automatically. This means you can push updates from your Mac and the mirror will pick them up within half an hour — no need to SSH in.

To push an update from your Mac:
```bash
cd path/to/magic-mirror
git add .
git commit -m "your change"
git push
```

The Pi will pull the update on its next check. To force an immediate update, SSH in and run:
```bash
cd ~/magic-mirror && git pull && sudo systemctl restart magic-mirror
```

Your `config.js` is gitignored, so your personal settings and auth tokens are never overwritten by a pull. The `~/wardrobe/` directory is outside the repo entirely, so your photos are safe too.

---

## Step 7: Verify Everything Works

> **Where:** On the Orange Pi — interacting with the mirror app on the monitor.

Run through the quick smoke test:

1. **Dashboard** — clock updating, weather showing, BaZi colors visible
2. **Capture** — webcam preview works, can take a photo
3. **Save** — save a captured item, get a success message
4. **Closet** — the saved item appears with correct tags
5. **Reference** — set a reference photo, confirm it shows in Outfit Builder but NOT in Closet
6. **Reboot** — everything persists after `sudo reboot`

See `TEST-CHECKLIST.md` for the full test script.

---

## Troubleshooting

> **Where:** All troubleshooting commands run on the Orange Pi unless noted otherwise.

### No Video Output

- Check that the mini HDMI adapter is fully seated.
- Try a different HDMI cable.
- Some monitors need a specific input source selected (press the monitor's "Input" button).
- Try without the DVI adapter if you have an HDMI monitor available.

### Chromium Won't Launch

- Check the service logs: `sudo journalctl -u magic-mirror -f`
- Make sure the desktop environment is running: the kiosk service depends on `graphical.target`.
- If the package is `chromium` instead of `chromium-browser` on your distro, the setup script handles this automatically. If you're debugging manually, try both names.
- Try launching manually: `DISPLAY=:0 chromium-browser --kiosk --disable-session-crashed-bubble file:///home/$USER/magic-mirror/mirror-v3-7.html`
- If Chromium shows a "Restore session" bar after a power cut or unclean shutdown, the `--disable-session-crashed-bubble` flag in the service file suppresses it. The setup script includes this flag by default.

### Wardrobe Server Errors

- Check: `sudo journalctl -u wardrobe-server -f`
- Test manually: `python3 ~/magic-mirror/wardrobe_server.py`
- Verify the wardrobe directories exist: `ls ~/wardrobe/`

### Webcam Not Detected

- Check: `ls /dev/video*` — should show `/dev/video0`
- If the device exists but the browser can't access it, make sure your user is in the `video` group: `groups $USER`. If not, run `sudo usermod -aG video $USER` and log out/back in.
- Test: `ffplay /dev/video0` (install ffmpeg if needed)
- Some webcams need extra USB power — use a powered USB hub if the Pi's ports aren't enough.

### Out of Memory (Freezing / Crashes)

The 1.5GB model has limited RAM. To reduce memory usage:
- Close any other desktop apps
- Use the `zram` swap module (Armbian enables this by default)
- Consider the 4GB Orange Pi Zero 3 model

### Screen Blanking / Sleep

If the monitor goes to sleep despite the setup script:
```bash
xset s off
xset -dpms
xset s noblank
```
The setup script adds these to `~/.xprofile` automatically so they persist across reboots. If the problem persists, check that your display manager sources `.xprofile` on login (LightDM and GDM3 do by default).

---

## Physical Assembly Tips

### Mounting

The Orange Pi Zero 3 is very small (65mm × 30mm). You can mount it behind the monitor using:
- Double-sided tape or mounting tape
- A 3D-printed bracket
- Velcro strips

### Cable Management

Route the HDMI adapter cable, USB webcam cable, and power cable neatly behind the monitor. Use cable clips or ties.

### Webcam Positioning

Mount the webcam at chest height for clothing capture, or at head height for reference photos. The Capture screen uses the full webcam view, so center your body in frame.

### Ventilation

The Orange Pi gets warm under load. Don't seal it in an airtight enclosure. Leave airflow around the board, or add a small heatsink to the CPU.

---

## Auto-Login (Handled by Setup Script)

The setup script configures auto-login automatically for LightDM and GDM3. This is required — without it, the Pi will sit at a login screen after reboot and the mirror won't launch.

If the setup script couldn't detect your display manager, configure it manually:

**For LightDM (common on Armbian XFCE):**
```bash
sudo nano /etc/lightdm/lightdm.conf
```
Under `[Seat:*]`, add:
```
autologin-user=your_username
autologin-user-timeout=0
```

**For GDM3:**
```bash
sudo nano /etc/gdm3/daemon.conf
```
Under `[daemon]`, add:
```
AutomaticLoginEnable=true
AutomaticLogin=your_username
```

Then reboot.

---

## Backing Up Your Wardrobe

Your photos live on the SD card in `~/wardrobe/`. SD cards can fail over time, so it's worth backing up periodically. From your Mac:

```bash
rsync -avz your_username@PI_IP_ADDRESS:~/wardrobe/ ~/mirror-wardrobe-backup/
```

This copies only new/changed files each time you run it. Consider running it weekly or after adding a batch of new items.

---

## Monitor Resolution

The app was tested at 1920×1080 (16:9). It uses relative units (`vh`, `vw`, `clamp`) so it scales to other resolutions, but if your Dell monitor is 4:3 (e.g., 1024×768 or 1280×1024), some elements may feel cramped or stretched. The layout will still be functional — just not pixel-identical to the design target.

---

## Optional: Rotate the Display

> **Where:** On the Orange Pi.

If you mount the monitor in portrait orientation:
```bash
# 90° clockwise rotation
xrandr --output HDMI-1 --rotate right

# Make it permanent — add to ~/.xprofile or autostart:
echo 'xrandr --output HDMI-1 --rotate right' >> ~/.xprofile
```

Adjust the CSS if needed — the app is designed for landscape but uses relative units.
