#!/bin/bash
# Email senden via Gog CLI
# Usage: send-email.sh TO SUBJECT BODY

if [ $# -lt 3 ]; then
  echo "Usage: $0 TO SUBJECT BODY"
  exit 1
fi

TO="$1"
SUBJECT="$2"
BODY="$3"

export GOG_KEYRING_PASSWORD="test123"

gog gmail send \
  --to "$TO" \
  --subject "$SUBJECT" \
  --body "$BODY" \
  --account kleinclaw214@gmail.com

echo "✅ Email gesendet an $TO"
