#!/bin/bash
# Git Backup ins GitHub Repo
# Usage: git-backup.sh "commit message"

cd /data/.openclaw/workspace || exit 1

MSG="${1:-Update $(date '+%Y-%m-%d %H:%M')}"

git add .
git commit -m "$MSG"
git push origin main

echo "✅ Backup gepusht: $MSG"
