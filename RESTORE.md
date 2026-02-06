# OpenClaw Wiederherstellung (Restore Guide)

Wenn der Server verloren geht oder OpenClaw neu aufgesetzt werden muss, kannst du mich (KleinClaw) mit diesem Repository wiederherstellen.

## Voraussetzungen

- **Neuer Server/Container** mit Node.js ≥ 20 und Docker (optional)
- **Git** installiert
- **OpenClaw** (Gateway) installiert (Docker oder Node)

## Schritt‑für‑Schritt

### 1. Repository klonen

```bash
git clone https://github.com/kleinclaw214-netizen/berlin-wohnungen.git
cd berlin-wohnungen
```

### 2. Wichtige Dateien ins OpenClaw‑Workspace kopieren

Der Workspace ist typischerweise `/home/node/openclaw` (Docker) oder `~/openclaw`.

```bash
# Annahme: Workspace existiert bereits (z.B. nach OpenClaw‑Installation)
cp AGENTS.md SOUL.md USER.md TOOLS.md IDENTITY.md HEARTBEAT.md MEMORY.md backup-to-github.js /home/node/openclaw/
mkdir -p /home/node/openclaw/memory
cp memory/*.md /home/node/openclaw/memory/ 2>/dev/null || true
```

### 3. OpenClaw starten

Je nach Installation:

- **Docker:** `docker run -v /home/node/openclaw:/home/node/openclaw … openclaw/openclaw`
- **Node:** `cd /home/node/openclaw && node /app/openclaw.mjs`

### 4. Konfiguration prüfen

- **GitHub Token** ggf. neu anlegen und in `.git/config` eintragen
- **Telegram/Email**‑Zugänge neu konfigurieren (Tokens/Settings)
- **Cron‑Jobs** wieder einrichten (siehe `HEARTBEAT.md` und `wohnungen‑monitor‑v2.js`)

### 5. Scraper‑System (optional)

Falls der Wohnungs‑Scraper wieder laufen soll:

```bash
cp universal-scraper-v2.js wohnungen-monitor-v2.js sites-config.json filter-criteria.json /home/node/openclaw/
# Cron‑Job auf Host:
echo "*/30 * * * * /home/yasar/bin/wohnungen-monitor-cron.sh" | crontab -u yasar -
```

## Was gesichert wird (automatisch alle 12h)

- **Persönliche Assistenz‑Dateien:** `AGENTS.md`, `SOUL.md`, `USER.md`, `TOOLS.md`, `IDENTITY.md`, `HEARTBEAT.md`, `MEMORY.md`
- **Tägliche Notizen:** `memory/YYYY‑MM‑DD.md`
- **Dieses Restore‑Skript:** `RESTORE.md`
- **Backup‑Skript selbst:** `backup‑to‑github.js`

## Was NICHT gesichert wird

- **Secrets** (API‑Keys, Tokens, Passwörter) – müssen manuell neu angelegt werden.
- **Scraper‑Ergebnisse** (`wohnungen‑results‑v2.json`, `wohnungen‑seen.json`)
- **Log‑Dateien**
- **Datenbanken/State** (außer sie sind in den o.g. Dateien enthalten)

## Hilfe

Falls etwas nicht funktioniert, erstelle ein **Issue** im Repository oder kontaktiere mich direkt (wenn ich bereits wieder laufe).

---

*Letztes Backup: $(date -I) – Repository‑Version: $(git rev-parse --short HEAD)*