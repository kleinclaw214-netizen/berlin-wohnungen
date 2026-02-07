#!/usr/bin/env bash
set -euo pipefail

# Wellenreiter Setup (Ubuntu/Debian)
# Goal: one-shot provisioning for OpenClaw automation + scraping + Google (gog).
# Safe to re-run: apt is idempotent; gog install step overwrites gog binary.

# Optional toggles (set env var before running):
#   INSTALL_NODE=1        Install nodejs + npm from apt (default: 1)
#   INSTALL_PNPM=1        Install pnpm via npm (default: 1)
#   INSTALL_PLAYWRIGHT=0  Install Playwright browsers+deps (default: 0)
#   INSTALL_DOCKER=0      Install docker.io (default: 0)
#   INSTALL_NETTOOLS=1    Install network debug tools (default: 1)

INSTALL_NODE=${INSTALL_NODE:-1}
INSTALL_PNPM=${INSTALL_PNPM:-1}
INSTALL_PLAYWRIGHT=${INSTALL_PLAYWRIGHT:-0}
INSTALL_DOCKER=${INSTALL_DOCKER:-0}
INSTALL_NETTOOLS=${INSTALL_NETTOOLS:-1}

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo not found. Please run as root or install sudo." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

log(){ echo -e "\n==> $*"; }

log "apt-get update"
sudo apt-get update

log "Base / Debug / Build"
sudo apt-get install -y \
  ca-certificates curl wget gnupg unzip \
  git make build-essential \
  procps lsof jq file \
  python3 python3-venv python3-pip python3-setuptools python3-wheel \
  golang

if [ "$INSTALL_NETTOOLS" = "1" ]; then
  log "Network tools"
  sudo apt-get install -y \
    net-tools iputils-ping dnsutils \
    traceroute tcpdump nmap \
    openssh-client
fi

log "Headless/X utils"
sudo apt-get install -y \
  xvfb xauth x11-utils xdg-utils

log "Chromium"
sudo apt-get install -y \
  chromium chromium-driver

log "Browser runtime libs (Puppeteer/Playwright common deps)"
sudo apt-get install -y \
  libnss3 libnspr4 libnss3-tools \
  libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 \
  libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libasound2 \
  libx11-6 libx11-xcb1 libxcb1 libxext6 libxrender1 libxss1 \
  libxtst6 libxi6 libxshmfence1 \
  libglib2.0-0 libgtk-3-0 \
  libpango-1.0-0 libpangocairo-1.0-0 libcairo2 \
  libfontconfig1 libfreetype6

log "Media libs (optional but useful)"
sudo apt-get install -y \
  ffmpeg imagemagick \
  libgstreamer1.0-0 libgstreamer-plugins-base1.0-0 \
  gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-libav

log "Fonts"
sudo apt-get install -y \
  fonts-liberation fonts-dejavu-core fonts-noto-core fonts-noto-color-emoji

if [ "$INSTALL_NODE" = "1" ]; then
  log "Node.js tooling (apt)"
  sudo apt-get install -y nodejs npm

  # make sure npm global installs work without sudo in many setups
  mkdir -p "$HOME/.npm-global"
  npm config set prefix "$HOME/.npm-global" >/dev/null 2>&1 || true
  export PATH="$HOME/.npm-global/bin:$PATH"

  if [ "$INSTALL_PNPM" = "1" ]; then
    log "pnpm (via npm)"
    if ! command -v pnpm >/dev/null 2>&1; then
      npm i -g pnpm
    fi
  fi

  if [ "$INSTALL_PLAYWRIGHT" = "1" ]; then
    log "Playwright deps (uses npx)"
    # Installs additional distro deps Playwright needs (best-effort)
    npx --yes playwright@latest install-deps chromium || true
    # Installs Playwright managed browsers (optional)
    npx --yes playwright@latest install chromium || true
  fi
fi

if [ "$INSTALL_DOCKER" = "1" ]; then
  log "Docker (docker.io)"
  sudo apt-get install -y docker.io
  sudo usermod -aG docker "$USER" || true
fi

log "Install gogcli (gog)"
mkdir -p "$HOME/src" "$HOME/.local/bin"
cd "$HOME/src"
if [ ! -d gogcli ]; then
  git clone https://github.com/steipete/gogcli.git
fi
cd gogcli
# pull updates if already exists
(git pull --ff-only || true)
make
cp -f ./bin/gog "$HOME/.local/bin/gog"

# Ensure PATH for future shells
if [ -f "$HOME/.bashrc" ] && ! grep -q 'export PATH="$HOME/.local/bin:$PATH"' "$HOME/.bashrc"; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
fi
export PATH="$HOME/.local/bin:$PATH"

log "Versions"
command -v python3 >/dev/null 2>&1 && python3 --version || true
command -v node >/dev/null 2>&1 && node --version || true
command -v npm >/dev/null 2>&1 && npm --version || true
command -v pnpm >/dev/null 2>&1 && pnpm --version || true
command -v chromium >/dev/null 2>&1 && chromium --version || true
command -v gog >/dev/null 2>&1 && gog --help | head -n 2 || true

cat <<'NEXT'

Done.

Optional gog quickstart (headless/manual):
  export GOG_KEYRING_PASSWORD="test123"
  gog auth credentials /home/node/client_secret_final.json
  gog auth add kleinclaw214@gmail.com --manual
  export GOG_ACCOUNT="kleinclaw214@gmail.com"
  gog gmail search "newer_than:1d" --max 3

If you enabled Docker: log out/in to apply group membership.

NEXT
