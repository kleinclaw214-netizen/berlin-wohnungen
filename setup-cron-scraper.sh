#!/usr/bin/env bash
set -euo pipefail

# Setup OS cron to run the OpenClaw apartment scraper WITHOUT any LLM.
# Installs cron (if missing), creates a wrapper runner + logfile, and registers a cron job.
#
# Usage:
#   sudo bash setup-cron-scraper.sh
# Optional env:
#   CRON_EXPR="*/30 * * * *"   # default: hourly
#   RUN_AS_USER="node"         # default: node
#   WORKDIR="/home/node/openclaw"
#
# After install, a log is written to: /home/node/.openclaw/logs/scraper-YYYY-MM-DD.log

CRON_EXPR=${CRON_EXPR:-"0 * * * *"}
RUN_AS_USER=${RUN_AS_USER:-"node"}
WORKDIR=${WORKDIR:-"/home/node/openclaw"}

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root (use sudo)." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

log(){ echo -e "\n==> $*"; }

log "Installing cron"
apt-get update
apt-get install -y cron

log "Creating runner script"
install -d -m 0755 /home/node/.openclaw/logs

cat > "${WORKDIR}/run-scraper.sh" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

WORKDIR="/home/node/openclaw"
cd "$WORKDIR"

# Ensure common paths
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:$PATH"

LOG="/home/node/.openclaw/logs/scraper-$(date +%F).log"
mkdir -p "$(dirname "$LOG")"

echo "===== $(date -Is) RUN =====" >> "$LOG"
node "$WORKDIR/universal-scraper-v2.js" >> "$LOG" 2>&1
echo "===== $(date -Is) DONE =====" >> "$LOG"
SH
chmod +x "${WORKDIR}/run-scraper.sh"
chown "${RUN_AS_USER}:${RUN_AS_USER}" "${WORKDIR}/run-scraper.sh" || true

log "Registering cron job (/etc/cron.d/openclaw-scraper)"
cat > /etc/cron.d/openclaw-scraper <<CRON
# OpenClaw apartment scraper (no LLM)
# ${CRON_EXPR}
${CRON_EXPR} ${RUN_AS_USER} ${WORKDIR}/run-scraper.sh
CRON
chmod 0644 /etc/cron.d/openclaw-scraper

log "Starting cron"
# systemd
if command -v systemctl >/dev/null 2>&1 && [ "$(ps -p 1 -o comm=)" = "systemd" ]; then
  systemctl enable --now cron
  systemctl status cron --no-pager || true
else
  # Debian in containers (no systemd): start cron daemon directly if not running
  if pgrep -x cron >/dev/null 2>&1; then
    echo "cron already running"
  else
    /usr/sbin/cron
    sleep 0.5
    pgrep -x cron >/dev/null 2>&1 && echo "cron started" || echo "cron start attempted (check manually)"
  fi
fi

log "One-shot test run"
# Run once immediately as target user
su -s /bin/bash -c "${WORKDIR}/run-scraper.sh" "${RUN_AS_USER}" || true

log "Tail log"
LOG="/home/node/.openclaw/logs/scraper-$(date +%F).log"
tail -n 60 "$LOG" || true

echo "\nDone. Cron schedule: ${CRON_EXPR}"