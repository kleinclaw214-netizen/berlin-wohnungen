#!/bin/bash
# Emails checken via Gog CLI
# Usage: check-email.sh [DAYS]

DAYS="${1:-1}"

export GOG_KEYRING_PASSWORD="test123"

gog gmail search "newer_than:${DAYS}d" \
  --max 20 \
  --account kleinclaw214@gmail.com
