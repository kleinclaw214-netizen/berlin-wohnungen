#!/usr/bin/env bash
set -euo pipefail

SITES="inberlinwohnen,degewo,gewobag,gesobau,stadtundland,wbm,berlinovo,deutschewohnen,vonovia"
TELEGRAM_TARGET="957563763"
CONTAINER="openclaw-w9ts-openclaw-1"
LOG="/home/yasar/.openclaw/logs/wohnungen-monitor-v2.log"
LOCK="/tmp/wohnungen-monitor-v2.lock"

mkdir -p "$(dirname "$LOG")"

echo "" >> "$LOG"
echo "=== RUN $(TZ=Europe/Berlin /usr/bin/date "+%Y-%m-%d %H:%M:%S %Z") ===" >> "$LOG"

if /usr/bin/flock -n "$LOCK" /usr/bin/docker exec "$CONTAINER" node /home/node/openclaw/wohnungen-monitor-v2.js --sites "$SITES" --telegram-target "$TELEGRAM_TARGET" >> "$LOG" 2>&1; then
  echo "=== OK $(TZ=Europe/Berlin /usr/bin/date "+%Y-%m-%d %H:%M:%S %Z") ===" >> "$LOG"
else
  # flock returns 1 when lock is held; docker may also fail. We log and exit 0 to avoid cron spam.
  echo "=== SKIP/FAIL $(TZ=Europe/Berlin /usr/bin/date "+%Y-%m-%d %H:%M:%S %Z") ===" >> "$LOG"
fi