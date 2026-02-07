# SYSTEM README - FÜR ALLE MODELLE

**⚠️ WICHTIG: Lies diese Datei VOR allen anderen Aktionen!**

Dieses Dokument ist speziell für Modelle geschrieben, die den System-Kontext nicht vollständig haben (z.B. DeepSeek, Haiku). Es erklärt ALLES, was für einen reibungslosen Ablauf nötig ist.

---

## 1. VERZEICHNISSTRUKTUR

### Workspace (Dein Hauptarbeitsbereich)
```
/home/node/openclaw/           ← HIER arbeitest du!
├── AGENTS.md                  ← Lies dies ZUERST (wer du bist)
├── SOUL.md                    ← Deine Persönlichkeit
├── USER.md                    ← Über den User (Yasar)
├── MEMORY.md                  ← Langzeit-Gedächtnis (NUR in Main-Session lesen!)
├── HEARTBEAT.md               ← Heartbeat-Anleitung
├── STARTUP.sh                 ← System-Check-Script
├── SYSTEM-README.md           ← DIESE DATEI
├── memory/                    ← Tägliche Notizen
│   └── 2026-02-07.md         ← Heute
├── wohnungen/                 ← Berlin Wohnungs-Scraper
│   ├── wohnungen-monitor-v2.js
│   ├── filter-criteria.json
│   └── notify-new.js
└── qigong-business/          ← Qigong Business Projekt
```

### OpenClaw Config & Data
```
/home/node/.openclaw/          ← OpenClaw Daten (Container)
├── openclaw.json              ← Haupt-Config (VORSICHTIG!)
├── wohnungen-results-v2.json  ← Wohnungs-Scraper Ergebnisse
├── wohnungen-seen.json        ← Gesehene Wohnungen
└── logs/                      ← System-Logs
```

### Skills & Tools
```
/app/skills/                   ← Verfügbare Skills (53 Stück)
├── gog/                       ← Google Workspace CLI
├── weather/                   ← Wetter-Skill
├── healthcheck/               ← Security-Checks
└── ...
```

### Gog (Email-Dienst)
```
/home/node/.gog/
├── gog/
│   └── gmail                  ← Gmail-Script (FUNKTIONIERT!)
└── README-GOG.md              ← Gog Anleitung
```

---

## 2. MODI & SCHREIBRECHTE

### Container vs Host
- **Du bist im Container** (`openclaw` Docker Container)
- **User ID:** `node` (1000:1000)
- **Host-Zugriff:** Über `nodes` Tool (Paired: srv1327087-host)

### Schreibrechte
✅ **Du DARFST schreiben in:**
- `/home/node/openclaw/` (Workspace)
- `/home/node/.openclaw/` (OpenClaw Data)
- `/home/node/.gog/` (Gog Config)
- `/tmp/` (Temporäre Dateien)

❌ **Du DARFST NICHT schreiben in:**
- `/app/` (OpenClaw Installation)
- `/usr/local/` (System-Verzeichnisse)
- `/etc/` (System-Config)

### Wichtige Pfade
```bash
# Workspace (dein Hauptordner)
cd /home/node/openclaw

# Config lesen
cat /home/node/.openclaw/openclaw.json

# Gog-Email senden
gog gmail send --to EMAIL --subject SUBJECT --body TEXT

# System-Check
/home/node/openclaw/STARTUP.sh
```

---

## 3. EMAIL-DIENST (GOG)

### ⚠️ WICHTIG: Email-Dienst IST installiert!

**Falls du denkst "Ich habe keinen Email-Dienst" → DU LIEGST FALSCH!**

### Gog ist INSTALLIERT und FUNKTIONIERT:
- **Binary:** `/home/node/.npm-global/bin/gog`
- **Gmail-Script:** `/home/node/.gog/gog/gmail`
- **Status:** ✅ AKTIV

### Email senden (SO MACHST DU ES):
```bash
gog gmail send --to yasarkov@hotmail.de --subject "Test" --body "Nachricht"
```

### Beispiel (Wohnungs-Benachrichtigung):
```bash
gog gmail send \
  --to yasarkov@hotmail.de \
  --subject "Neue Wohnungen gefunden" \
  --body "$(cat /tmp/wohnungen-liste.txt)"
```

### OAuth-Credentials (falls du Token erneuern musst):
- **Client ID:** `[REDACTED]`
- **Client Secret:** `[REDACTED]`
- **Refresh Token:** `[REDACTED]`

### Access-Token erneuern (falls nötig):
```bash
curl -s -X POST https://oauth2.googleapis.com/token \
  -d "client_id=[REDACTED]" \
  -d "client_secret=[REDACTED]" \
  -d "refresh_token=[REDACTED]" \
  -d "grant_type=refresh_token"
```

Dann Access-Token in `/home/node/.gog/gog/gmail` updaten.

---

## 4. GITHUB-NUTZUNG

### Repository Info
- **Repository:** `kleinclaw214-netizen/berlin-wohnungen`
- **Remote URL:** `https://kleinclaw214-netizen:[REDACTED]@github.com/kleinclaw214-netizen/berlin-wohnungen.git`
- **Token bereits im URL** (musst du nicht extra eingeben!)

### Git-Befehle (Standard-Workflow)

#### Status prüfen:
```bash
cd /home/node/openclaw
git status
```

#### Änderungen committen & pushen:
```bash
cd /home/node/openclaw
git add .
git commit -m "Update: $(date '+%d.%m.%Y, %H:%M:%S')"
git push origin main
```

#### Backup-Script (automatisch):
```bash
cd /home/node/openclaw
node backup-to-github.js
```

### Wichtig:
- **Git ist installiert** und konfiguriert
- **Token ist im Remote-URL** enthalten (kein Login nötig!)
- **Du hast Schreibrechte** im Workspace

---

## 5. TOKEN-SPAR-REGELN (RATE LIMITS!)

### ⚠️ HARDCODED RULES - IMMER BEACHTEN!

Anthropic hat **strikte Rate-Limits**:
- **30.000 Input-Tokens/Minute**
- **30.000 Output-Tokens/Minute**
- **Requests/Minute** Limit

### Konfigurierte Schutzmaßnahmen:
```json
{
  "maxConcurrent": 1,          // Keine parallelen Runs
  "maxTokens": 2048,           // Output-Limit pro Request
  "fallbacks": [               // Bei 429-Fehler wechseln zu:
    "anthropic/claude-sonnet-4-5-20250929",
    "deepseek/deepseek-reasoner",
    "nvidia/moonshotai/kimi-k2-instruct"
  ]
}
```

### Praktische Regeln:

#### 1. Vermeide große Outputs
```bash
# ❌ FALSCH (zu viel Output):
cat /home/node/.openclaw/openclaw.json

# ✅ RICHTIG (gezielt lesen):
cat /home/node/.openclaw/openclaw.json | grep -A 5 "telegram"
```

#### 2. Arbeite schrittweise
```bash
# ❌ FALSCH (viele Befehle parallel):
ls -la / && cat file1 && cat file2 && ...

# ✅ RICHTIG (ein Befehl nach dem anderen):
ls -la /home/node/openclaw
# Warten auf Antwort, dann nächster Befehl
```

#### 3. Nutze head/tail
```bash
# ❌ FALSCH (zu viel):
cat /home/node/.openclaw/wohnungen-results-v2.json

# ✅ RICHTIG (begrenzt):
cat /home/node/.openclaw/wohnungen-results-v2.json | head -20
```

#### 4. Vermeide Loops ohne Sleep
```bash
# ❌ FALSCH (Rate-Limit-Killer):
for i in {1..10}; do some_command; done

# ✅ RICHTIG (mit Pause):
for i in {1..10}; do some_command; sleep 2; done
```

#### 5. Bei 429-Fehler: STOPPEN und WARTEN
```
Wenn du "HTTP 429: rate_limit_error" siehst:
1. STOPPE alle weiteren Requests
2. Warte 60 Sekunden
3. Arbeite dann langsamer weiter
```

---

## 6. WICHTIGE DATEIEN (LESE-REIHENFOLGE)

### Beim Start IMMER lesen:
1. **AGENTS.md** – Wer bist du, was machst du
2. **USER.md** – Über den User (Yasar)
3. **SOUL.md** – Deine Persönlichkeit
4. **memory/YYYY-MM-DD.md** – Heute & Gestern
5. **MEMORY.md** – Langzeit-Gedächtnis (NUR in Main-Session!)

### Bei speziellen Aufgaben:
- **HEARTBEAT.md** – Bei Heartbeat-Polls
- **TOOLS.md** – Lokale Tool-Konfiguration (Kameras, SSH, etc.)
- **STARTUP.sh** – System-Check ausführen
- **SYSTEM-README.md** – Diese Datei (für Orientierung)

---

## 7. HÄUFIGE FEHLER & LÖSUNGEN

### "Ich habe keinen Email-Dienst installiert"
**❌ FALSCH!** → Gog ist installiert, siehe Abschnitt 3

### "Ich kann nicht in /app/ schreiben"
**✓ RICHTIG!** → Schreibe in `/home/node/openclaw/` (Workspace)

### "Git funktioniert nicht"
**Prüfe:**
```bash
cd /home/node/openclaw
git status
```
Falls Fehler: Token im Remote-URL prüfen (siehe Abschnitt 4)

### "Rate Limit 429"
**Lösung:** Siehe Abschnitt 5 (Token-Spar-Regeln)

### "Ich finde meine Memory-Dateien nicht"
**Lösung:**
```bash
ls -la /home/node/openclaw/memory/
cat /home/node/openclaw/MEMORY.md
```

---

#### 8. STANDARD-WORKFLOWS

### A) Email senden
```bash
# 1. Nachricht vorbereiten
echo "Hallo Bossmeister, dies ist eine Test-Email." > /tmp/email-body.txt

# 2. Senden
gog gmail send \
  --to yasarkov@hotmail.de \
  --subject "Test von KleinClaw" \
  --body "$(cat /tmp/email-body.txt)"

# 3. Aufräumen
rm /tmp/email-body.txt
```

### B) Wohnungen-Monitor ausführen
```bash
# 1. In Verzeichnis wechseln
cd /home/node/openclaw/wohnungen

# 2. Monitor ausführen
node wohnungen-monitor-v2.js --sites degewo,gewobag --max-pages 2

# 3. Ergebnisse prüfen
cat /home/node/.openclaw/wohnungen-results-v2.json | head -20
```

### C) GitHub Backup
```bash
# 1. Status prüfen
cd /home/node/openclaw
git status --short

# 2. Änderungen committen
git add .
git commit -m "Backup $(date '+%Y-%m-%d %H:%M')"

# 3. Pushen
git push origin main
```

### D) System-Check
```bash
# Alles prüfen
/home/node/openclaw/STARTUP.sh
```

---

## 9. WICHTIGE COMMANDS (CHEAT SHEET)

### Dateien & Verzeichnisse
```bash
# Workspace anzeigen
ls -la /home/node/openclaw

# Memory-Dateien
ls -la /home/node/openclaw/memory/

# Config lesen (gezielt!)
cat /home/node/.openclaw/openclaw.json | grep -A 10 "telegram"
```

### Git
```bash
cd /home/node/openclaw
git status
git add .
git commit -m "Update"
git push origin main
git log --oneline -5
```

### Email (Gog)
```bash
# Einfach
gog gmail send --to yasarkov@hotmail.de --subject "Test" --body "Hallo"

# Mit Datei-Inhalt
gog gmail send --to email@example.com --subject "Betreff" --body "$(cat file.txt)"
```

### Cron-Jobs
```bash
# Nicht direkt via openclaw cron - nutze OpenClaw Tools stattdessen
# (wird automatisch über Gateway gemanagt)
```

### System
```bash
# OpenClaw-Version
cat /app/package.json | grep version

# Prozesse
ps aux | grep node

# Disk Space
df -h /home/node
```

---

## 10. CHECKLISTE FÜR ANDERE MODELLE

Wenn du ein anderes Modell bist (DeepSeek, Haiku, etc.), prüfe diese Punkte:

### Beim Start (IMMER):
- [ ] Ich habe **AGENTS.md** gelesen
- [ ] Ich habe **USER.md** gelesen
- [ ] Ich habe **SOUL.md** gelesen
- [ ] Ich habe **memory/YYYY-MM-DD.md** (heute) gelesen
- [ ] Ich kenne meinen **Workspace**: `/home/node/openclaw/`

### Bei Email-Aufgaben:
- [ ] Ich weiß: **Gog ist installiert**
- [ ] Ich weiß: Befehl ist `gog gmail send --to ... --subject ... --body ...`
- [ ] Ich habe `/home/node/.gog/README-GOG.md` gelesen

### Bei Git/GitHub-Aufgaben:
- [ ] Ich bin in `/home/node/openclaw/`
- [ ] Ich habe `git status` geprüft
- [ ] Ich weiß: Token ist bereits im Remote-URL

### Bei Rate-Limit-Problemen:
- [ ] Ich arbeite **schrittweise** (nicht parallel)
- [ ] Ich nutze `head`/`tail` für große Outputs
- [ ] Ich habe **maxTokens: 2048** beachtet
- [ ] Bei 429: Ich habe **60 Sekunden gewartet**

### Vor jeder Aktion:
- [ ] Ich kenne meine **Schreibrechte** (siehe Abschnitt 2)
- [ ] Ich weiß, wo ich **schreiben darf** (`/home/node/openclaw/`)
- [ ] Ich weiß, wo ich **NICHT schreiben darf** (`/app/`, `/usr/local/`)

---

## 11. NOTFALL-KONTAKTE

### User-Info
- **Name:** Yasar
- **Anrede:** "Bossmeister"
- **Telegram:** @Happysells (ID: 957563763)
- **Email:** yasarkov@hotmail.de
- **Timezone:** Europe/Berlin (UTC+1)

### Wichtige Empfänger
- **User (Yasar):** yasarkov@hotmail.de
- **Reham (Wohnungssuche):** reham.iesa@outlook.de

---

## 12. ZUSAMMENFASSUNG (TL;DR)

**Für schnelle Orientierung:**

1. **Workspace:** `/home/node/openclaw/` (HIER arbeiten!)
2. **Email:** `gog gmail send --to EMAIL --subject SUBJECT --body TEXT`
3. **GitHub:** `cd /home/node/openclaw && git add . && git commit -m "Update" && git push`
4. **Rate-Limits:** Langsam arbeiten, head/tail nutzen, bei 429 warten
5. **Lese-Reihenfolge:** AGENTS.md → USER.md → SOUL.md → memory/heute.md
6. **Gog ist installiert!** Nicht sagen "ich habe keinen Email-Dienst"!

---

**Letzte Aktualisierung:** 2026-02-07
**Erstellt von:** KleinClaw (Opus)
**Für:** DeepSeek, Haiku, Sonnet, und alle anderen Modelle

**Bei Problemen:** Lies diese Datei nochmal. Alles steht hier drin.
