# QUICKREF.md - LIES DIES ZUERST!

**⚠️ DIESE DATEI BEIM SESSION-START IMMER LESEN!**

## VERFÜGBARE TOOLS (VERWENDE SIE!)

### 📧 EMAIL (Gog CLI)
```bash
# IMMER dieses Prefix verwenden:
export GOG_KEYRING_PASSWORD="test123"

# Email senden:
gog gmail send --to EMAIL --subject "BETREFF" --body "TEXT" --account kleinclaw214@gmail.com

# Emails checken:
gog gmail search "newer_than:1d" --max 10 --account kleinclaw214@gmail.com

# Kalender:
gog calendar events primary --today --account kleinclaw214@gmail.com
```

**SHORTCUT:** `source /data/.openclaw/workspace/.gogrc` setzt Umgebungsvariablen

### 🗂️ GITHUB (Git)
```bash
# Status:
cd /data/.openclaw/workspace && git status

# Backup/Push:
cd /data/.openclaw/workspace && git add . && git commit -m "Update $(date '+%Y-%m-%d %H:%M')" && git push

# WICHTIG: Token ist bereits in credentials gespeichert!
```

**Repo:** kleinclaw214-netizen/berlin-wohnungen

### 📝 MEMORY
```bash
# Tägliche Notizen (IMMER schreiben!):
/data/.openclaw/workspace/memory/2026-02-09.md

# Langzeit (nur wichtige Sachen):
/data/.openclaw/workspace/MEMORY.md
```

## WRAPPER-SCRIPTS (nutze diese!)

### send-email.sh
```bash
/data/.openclaw/workspace/scripts/send-email.sh TO SUBJECT BODY
```

### git-backup.sh
```bash
/data/.openclaw/workspace/scripts/git-backup.sh "commit message"
```

### check-email.sh
```bash
/data/.openclaw/workspace/scripts/check-email.sh [DAYS]
```

---

**REGEL:** Bevor du eine Aufgabe machst:
1. **Prüfe diese Datei** - gibt es ein Tool dafür?
2. **Nutze das Tool** - nicht manuell/curl/etc.
3. **Update Memory** - schreibe wichtige Dinge in daily notes

**WENN DU DIESE DATEI VERGISST:** Lies AGENTS.md Zeile 15!
