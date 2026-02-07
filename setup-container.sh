#!/usr/bin/env bash
set -euo pipefail

# OpenClaw container bootstrap for this workspace.
# Goal: re-install the "stuff that tends to disappear" when the container is recreated.
# Safe to run multiple times.

log(){ echo "[setup] $*"; }

if [ "$(id -u)" != "0" ]; then
  log "ERROR: run as root inside the container (docker exec ... sh -lc ./setup-container.sh)"
  exit 1
fi

log "OS:"; cat /etc/os-release | sed -n '1,6p' || true

WITH_PYTHON=false
WITH_ML=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-python) WITH_PYTHON=true ;;
    --with-ml) WITH_PYTHON=true; WITH_ML=true ;;
    *) log "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

log "Updating apt index..."
apt-get update

log "Installing base packages..."
apt-get install -y --no-install-recommends \
  ca-certificates curl git make \
  cron \
  chromium \
  fonts-dejavu-core \
  tzdata \
  jq sqlite3

log "Installing Puppeteer/Chromium runtime deps (prevents missing lib errors)..."
apt-get install -y --no-install-recommends \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 libatk1.0-0 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release wget xdg-utils

log "Ensuring cron running..."
service cron start >/dev/null 2>&1 || true

log "Node version:"
node -v || true

# Workspace npm deps
WS=/home/node/openclaw
if [ -d "$WS" ]; then
  log "Installing npm deps in $WS (pptxgenjs, axios, cheerio)..."
  cd "$WS"
  npm install --silent || npm install
  npm install pptxgenjs axios --silent || true
else
  log "WARN: workspace not found at $WS"
fi

log "Installing gog CLI (optional, for Gmail/Calendar) if not present..."
if ! command -v gog >/dev/null 2>&1; then
  # Best-effort: official release tarball if it exists. If this fails, fallback is 'build from source'.
  set +e
  curl -fsSL https://github.com/steipete/gog/releases/latest/download/gog_Linux_x86_64.tar.gz \
    | tar -xz -C /usr/local/bin >/dev/null 2>&1
  chmod +x /usr/local/bin/gog >/dev/null 2>&1
  set -e
fi

if [ "$WITH_PYTHON" = true ]; then
  log "Installing Python tooling..."
  apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv python3-dev

  if [ "$WITH_ML" = true ]; then
    log "Installing Python trading/ML packages (venv in /home/node/.venvs/trading)..."
    # Keep this contained and reproducible.
    su - node -s /bin/bash -lc '
      set -e
      VENV=/home/node/.venvs/trading
      python3 -m venv "$VENV"
      source "$VENV/bin/activate"
      pip install --upgrade pip wheel setuptools
      # Trading + analysis essentials
      pip install numpy pandas scipy statsmodels scikit-learn matplotlib seaborn
      pip install yfinance ta arch

      '
  fi
fi

log "Checking browser binaries..."
command -v chromium && chromium --version || log "WARN: chromium not found"
command -v gog && gog --version || log "NOTE: gog not installed (optional)"
python3 --version 2>/dev/null || log "NOTE: python not installed (optional)"

log "Done."
log "Run options:" 
log "- default: basic setup"
log "- add python:   ./setup-container.sh --with-python"
log "- add ML stack: ./setup-container.sh --with-ml"
log "Next manual steps (once):"
log "- Gmail/Calendar (gog): create OAuth client JSON + run gog auth add (manual headless flow)."
log "- If you want system cron for scraping: add crontab entry to run your node script."
