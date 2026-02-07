#!/bin/bash
# OpenClaw Startup & Configuration Reference
# Dieses File dokumentiert alle wichtigen Dienste, Pfade und Befehle
# WICHTIG: Andere Modelle (DeepSeek etc.) müssen dies lesen!

echo "=== OpenClaw Startup Check ==="

# ============================================
# 1. GOG (Gmail/Google Workspace)
# ============================================
echo "[1/6] Gog CLI Status"

# Gog Binary: /home/node/.npm-global/bin/gog
# Gog Library: /home/node/.gog/gog/gmail
# OAuth Client ID: [REDACTED - siehe /home/node/.gog/README-GOG.md]
# OAuth Client Secret: [REDACTED - siehe /home/node/.gog/README-GOG.md]
# Refresh Token: [REDACTED - siehe /home/node/.gog/README-GOG.md]
# Access Token wird dynamisch via curl erneuert (siehe unten)

# Email senden (IMMER SO MACHEN):
# gog gmail send --to "email@example.com" --subject "Betreff" --body "Text"

if [ -f "/home/node/.gog/gog/gmail" ]; then
    echo "✅ Gog gmail script exists"
else
    echo "❌ Gog gmail script missing - muss neu erstellt werden!"
fi

# ============================================
# 2. WOHNUNGEN-MONITOR
# ============================================
echo "[2/6] Wohnungen-Monitor Status"

# Cron-Job ID: 975d7a8d-6a74-4eab-adef-904b56f137e4
# Schedule: Stündlich (0 * * * *)
# Timezone: Europe/Berlin
# Script: /home/node/openclaw/wohnungen/wohnungen-monitor-v2.js
# Config: /home/node/openclaw/sites-config.json
# Filter: /home/node/openclaw/wohnungen/filter-criteria.json
# Results: /home/node/.openclaw/wohnungen-results-v2.json
# Seen-DB: /home/node/.openclaw/wohnungen-seen.json

if [ -f "/home/node/openclaw/wohnungen/wohnungen-monitor-v2.js" ]; then
    echo "✅ Wohnungen-Monitor script exists"
else
    echo "❌ Wohnungen-Monitor script missing!"
fi

# ============================================
# 3. ANTHROPIC API CONFIG
# ============================================
echo "[3/6] Anthropic API Status"

# API Key: [REDACTED - siehe /home/node/.openclaw/openclaw.json]
# Base URL: https://api.anthropic.com (OHNE /v1!)
# Models:
#   - claude-opus-4-6 (alias: opus)
#   - claude-sonnet-4-5-20250929 (alias: sonnet)
#   - claude-haiku-4-5-20251001 (alias: haiku)
#   - claude-3-haiku-20240307 (alias: haiku3)

# Rate-Limit-Schutz aktiv:
#   - maxConcurrent: 1
#   - maxTokens: 2048
#   - Fallbacks: sonnet → deepseek → kimi

echo "✅ Anthropic config documented"

# ============================================
# 4. MEMORY & WORKSPACE
# ============================================
echo "[4/6] Memory & Workspace"

# Workspace: /home/node/openclaw
# Memory: /home/node/openclaw/memory/YYYY-MM-DD.md
# Long-term: /home/node/openclaw/MEMORY.md
# Config: /home/node/.openclaw/openclaw.json
# Logs: /home/node/.openclaw/logs/

if [ -d "/home/node/openclaw/memory" ]; then
    echo "✅ Memory directory exists"
    ls -1 /home/node/openclaw/memory/*.md 2>/dev/null | tail -3
else
    echo "⚠️  Memory directory missing - creating..."
    mkdir -p /home/node/openclaw/memory
fi

# ============================================
# 5. SKILLS
# ============================================
echo "[5/6] Skills"

# Skill Pfad: /app/skills/
# Wichtigste Skills:
#   - gog (Google Workspace)
#   - weather (Wettervorhersage)
#   - healthcheck (Security)
#   - github (Git integration)
#   - sag (ElevenLabs TTS)

SKILL_COUNT=$(ls -1 /app/skills | wc -l)
echo "✅ $SKILL_COUNT skills available"

# ============================================
# 6. CRON JOBS
# ============================================
echo "[6/6] Cron Jobs"

# Verwende: openclaw cron list
# Oder API: curl mit Gateway-Token

echo "✅ Startup check complete"

# ============================================
# EMAIL SENDEN - ANLEITUNG FÜR ANDERE MODELLE
# ============================================
echo ""
echo "📧 EMAIL SENDEN (GOG):"
echo "gog gmail send --to EMAIL --subject SUBJECT --body TEXT"
echo ""
echo "Siehe: /home/node/.gog/gog/gmail für Details"