#!/bin/bash
# ──────────────────────────────────────────────
# Magic Mirror — Orange Pi Auto-Setup
# Run: chmod +x setup-pi.sh && ./setup-pi.sh
# ──────────────────────────────────────────────
set -e

echo "╔══════════════════════════════════════════╗"
echo "║   Magic Mirror — Orange Pi Setup         ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. System packages ──
echo "[1/6] Installing system packages (Chromium, Python 3, unclutter)..."
sudo apt-get update -qq
# chromium-browser on some distros, chromium on others — try both
if apt-cache show chromium-browser >/dev/null 2>&1; then
  CHROMIUM_PKG="chromium-browser"
else
  CHROMIUM_PKG="chromium"
fi
sudo apt-get install -y -qq \
  $CHROMIUM_PKG \
  python3 \
  git \
  unclutter \
  openssh-server \
  2>/dev/null

# Enable SSH for remote access from your laptop
sudo systemctl enable ssh 2>/dev/null || true
sudo systemctl start ssh 2>/dev/null || true

# Ensure user can access the webcam
if ! groups "$USER" | grep -q '\bvideo\b'; then
  sudo usermod -aG video "$USER"
  echo "  → Added $USER to video group (logout/login to take effect)"
fi

# ── 2. Clone repo check ──
MIRROR_DIR="$HOME/magic-mirror"
if [ ! -d "$MIRROR_DIR" ]; then
  echo "[2/6] Repo not found."
  echo "  → Clone it first:"
  echo "    git clone https://github.com/YOUR_USERNAME/magic-mirror.git ~/magic-mirror"
  echo "    Then re-run this script."
  exit 1
else
  echo "[2/6] Repo found at $MIRROR_DIR"
fi

# ── 3. Create config.js ──
if [ ! -f "$MIRROR_DIR/config.js" ]; then
  echo "[3/6] Creating config.js from template..."
  cp "$MIRROR_DIR/config.example.js" "$MIRROR_DIR/config.js"
  echo "  → Edit config.js with your coordinates if not in Jacksonville"
else
  echo "[3/6] config.js already exists"
fi

# Create wardrobe directories
mkdir -p "$HOME/wardrobe"/{tops,bottoms,dresses,outerwear,shoes,accessories,reference}
echo "  → Wardrobe storage at $HOME/wardrobe/"

# ── 4. Create systemd services ──
echo "[4/6] Creating systemd services..."

# Detect chromium binary path (varies by distro)
CHROMIUM_BIN=$(which chromium-browser 2>/dev/null || which chromium 2>/dev/null || echo "/usr/bin/chromium-browser")

# Wardrobe server
sudo tee /etc/systemd/system/wardrobe-server.service > /dev/null << EOF
[Unit]
Description=Magic Mirror Wardrobe Catalog Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$MIRROR_DIR
ExecStart=/usr/bin/python3 $MIRROR_DIR/wardrobe_server.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Chromium kiosk
sudo tee /etc/systemd/system/magic-mirror.service > /dev/null << EOF
[Unit]
Description=Magic Mirror Chromium Kiosk
After=graphical.target wardrobe-server.service
Wants=wardrobe-server.service

[Service]
Type=simple
User=$USER
Environment=DISPLAY=:0
ExecStartPre=/bin/sleep 5
ExecStart=$CHROMIUM_BIN \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --disable-session-crashed-bubble \
  --no-first-run \
  --start-fullscreen \
  --autoplay-policy=no-user-gesture-required \
  --use-fake-ui-for-media-stream \
  --enable-features=UseOzonePlatform \
  --ozone-platform=x11 \
  file://$MIRROR_DIR/mirror-v3-7.html
Restart=always
RestartSec=10

[Install]
WantedBy=graphical.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable wardrobe-server.service
sudo systemctl enable magic-mirror.service

echo "  → wardrobe-server.service (wardrobe image storage)"
echo "  → magic-mirror.service (kiosk browser)"

# ── 5. Hide mouse cursor & disable screen blanking ──
echo "[5/6] Configuring cursor hiding & screen blanking..."
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/unclutter.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Unclutter
Exec=unclutter -idle 1 -root
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

# Disable screen blanking / DPMS (persists across sessions)
if ! grep -q 'xset s off' "$HOME/.xprofile" 2>/dev/null; then
  cat >> "$HOME/.xprofile" << 'EOF'
# Magic Mirror — disable screen blanking
xset s off
xset -dpms
xset s noblank
EOF
  echo "  → Screen blanking disabled via .xprofile"
fi

# Enable auto-login so the mirror launches unattended after reboot
if [ -f /etc/lightdm/lightdm.conf ]; then
  if ! grep -q "autologin-user=$USER" /etc/lightdm/lightdm.conf 2>/dev/null; then
    sudo sed -i "s/^\[Seat:\*\]/[Seat:*]\nautologin-user=$USER\nautologin-user-timeout=0/" /etc/lightdm/lightdm.conf
    echo "  → Auto-login enabled (LightDM)"
  fi
elif [ -f /etc/gdm3/daemon.conf ]; then
  if ! grep -q "AutomaticLogin=$USER" /etc/gdm3/daemon.conf 2>/dev/null; then
    sudo sed -i "s/^\[daemon\]/[daemon]\nAutomaticLoginEnable=true\nAutomaticLogin=$USER/" /etc/gdm3/daemon.conf
    echo "  → Auto-login enabled (GDM3)"
  fi
else
  echo "  ⚠ Could not detect display manager for auto-login."
  echo "    See HARDWARE-SETUP.md 'Auto-Login' section to configure manually."
fi

# ── 6. Auto-update from GitHub ──
echo "[6/6] Setting up auto-update cron job..."

# Allow passwordless restart of the mirror service (needed for cron)
SUDOERS_FILE="/etc/sudoers.d/magic-mirror-update"
if [ ! -f "$SUDOERS_FILE" ]; then
  echo "$USER ALL=(ALL) NOPASSWD: /bin/systemctl restart magic-mirror" | sudo tee "$SUDOERS_FILE" > /dev/null
  sudo chmod 440 "$SUDOERS_FILE"
  echo "  → Passwordless restart enabled for magic-mirror service"
fi

CRON_CMD="cd $MIRROR_DIR && git fetch --quiet && if [ \$(git rev-parse HEAD) != \$(git rev-parse @{u}) ]; then git pull --quiet && sudo systemctl restart magic-mirror; fi"
# Add cron job if not already present (removes old entry first to avoid duplicates)
( crontab -l 2>/dev/null | grep -v 'magic-mirror.*git fetch' ; echo "*/30 * * * * $CRON_CMD" ) | crontab -
echo "  → Auto-update checks GitHub every 30 minutes"
echo "  → Only restarts Chromium if new commits are found"

echo ""
PI_IP=$(hostname -I | awk '{print $1}')
echo "╔══════════════════════════════════════════╗"
echo "║   Setup complete!                        ║"
echo "║                                          ║"
echo "║   Start now:                             ║"
echo "║     sudo systemctl start wardrobe-server ║"
echo "║     sudo systemctl start magic-mirror    ║"
echo "║                                          ║"
echo "║   Or reboot to auto-launch everything:   ║"
echo "║     sudo reboot                          ║"
echo "║                                          ║"
echo "║   SSH from your Mac:                     ║"
echo "║     ssh $USER@$PI_IP            ║"
echo "║                                          ║"
echo "║   Input: Point IR remote at webcam to    ║"
echo "║   move cursor + click. IR tracking runs  ║"
echo "║   in the browser — no extra service.     ║"
echo "╚══════════════════════════════════════════╝"
