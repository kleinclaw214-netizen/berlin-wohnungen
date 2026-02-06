# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## 🔐 **Google Integration (Gog CLI)**

### **Credentials:**
- **OAuth Client:** Desktop-App in Google Console
- **Client ID:** `884510567387-236sdokccg86gvoog8lltc3nb88g8l1t.apps.googleusercontent.com`
- **Credentials File:** `/home/node/client_secret_final.json`
- **Gog Config:** `/home/node/.openclaw/gogcli/credentials.json`
- **Keyring Password:** `test123` (lokal, für alle Gog-Befehle)

### **Umgebungsvariable (erforderlich):**
```bash
export GOG_KEYRING_PASSWORD="test123"
# Oder direkt im Befehl:
GOG_KEYRING_PASSWORD="test123" gog <command>
```

### **Nützliche Gog-Befehle:**

#### **Gmail:**
```bash
# E-Mails suchen
gog gmail search "newer_than:1d" --max 10 --account kleinclaw214@gmail.com

# E-Mail senden
gog gmail send --to "empfaenger@email.de" --subject "Betreff" --body "Text"

# E-Mail mit Dateiinhalt senden
gog gmail send --to "empfaenger@email.de" --subject "Betreff" --body-file /pfad/zur/datei.txt
```

#### **Calendar:**
```bash
# Events heute anzeigen
gog calendar events primary --today --account kleinclaw214@gmail.com

# Event erstellen
gog calendar create primary --summary "Meeting" --from "2026-02-04T15:00:00" --to "2026-02-04T16:00:00"
```

#### **Drive:**
```bash
# Dateien auflisten
gog drive ls --max 10 --account kleinclaw214@gmail.com
```

### **Fehlerbehebung:**
- **Redirect-URI Mismatch:** Immer "Desktop-Anwendung" in Google Console erstellen
- **Network Timeout:** Token manuell mit curl generieren:
  ```bash
  curl -X POST https://oauth2.googleapis.com/token \
    -d "code=..." \
    -d "client_id=..." \
    -d "client_secret=..." \
    -d "redirect_uri=http://localhost:1" \
    -d "grant_type=authorization_code"
  ```
- **Keyring Passwort vergessen:** `GOG_KEYRING_PASSWORD="test123"` setzen

### **Refresh-Token Backup:**
```
[REDACTED]
```

## 🤖 **AI Model Configuration**
- **Standard:** `deepseek/deepseek-reasoner`
- **Alternative:** `anthropic/claude-sonnet-4-20250514`
- **Kimi (geplant):** `synthetic/hf:moonshotai/Kimi-K2-Thinking`
  - **Benötigt:** `MOONSHOT_API_KEY` oder `synthetic:default` auth profile

## 📧 **Email Accounts:**
- **Primary Google:** `kleinclaw214@gmail.com` (aktiv via OAuth)
- **Secondary Outlook:** `kleinclaw214@outlook.com` (Passwort noch nicht erhalten)

## 🏠 **Berlin Wohnungs-Scraper System**

### **WICHTIGSTE DATEIEN:**
- **Konfiguration:** `/home/node/sites-config.json` (20+ Portale)
- **Universal Scraper:** `/home/node/universal-scraper-v2.js`
- **Monitor:** `/home/node/wohnungen-monitor-v2.js`
- **Dashboard:** `/home/node/dashboard.js`
- **Filter-Kriterien:** `/home/node/filter-criteria.json`
- **Datenbank:** `/home/node/.openclaw/wohnungen-seen.json`
- **Ergebnisse:** `/home/node/.openclaw/wohnungen-results-v2.json`

### **NÜTZLICHE BEFEHLE:**
```bash
# Manueller Scan (DEGEWO)
node universal-scraper-v2.js --sites degewo --max-pages 3

# Monitor mit Benachrichtigungen
node wohnungen-monitor-v2.js

# Dashboard anzeigen
node dashboard.js

# Filter für Reham anwenden
node filter-apartments.js reham
```

### **CRON-JOB:**
- **Name:** DEGEWO Wohnungs-Monitor
- **Schedule:** Stündlich (0 * * * *)
- **Zeitzone:** Europe/Berlin
- **Job-ID:** `975d7a8d-6a74-4eab-adef-904b56f137e4`
- **Status:** Aktiv (ab 14:00 Uhr)

### **FILTER-PROFILE:**
1. **Reham's Suche:** 2 Zi., 400-700€, bestimmte Bezirke
2. **Budget:** unter 500€
3. **Familie:** 3+ Zi., 70+m²

### **EMAIL-BENACHRICHTIGUNGEN:**
- **Empfänger:** `yasarkov@hotmail.de` (standard)
- **Bei:** Neue Wohnungen für Reham's Kriterien
- **Via:** Gog CLI (`gog gmail send`)

### **PUPPETEER-PROBLEM:**
- **Fehlende Bibliotheken:** libnspr4.so, libnss3, etc.
- **Lösung:** `apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2`
- **Status:** Benötigt Admin-Rechte

---

Add whatever helps you do your job. This is your cheat sheet.
