# Subagent Template: Trading Data Refresh

**Label:** `trading-data-refresh`
**Model:** `openai-codex/gpt-5.2` (fallback `deepseek/deepseek-reasoner`)
**Thinking:** `medium`
**Run Timeout:** 300 seconds

## Task Description

Rufe aktuelle Trading‑Daten ab, prüfe Alarme, aktualisiere lokale Datenbank. Dieser Task wird stündlich (oder nach konfiguriertem Intervall) ausgeführt.

### Schritte:
1. **Datenquellen abfragen** – je nach konfigurierten APIs:
   - **Yahoo Finance** (öffentlich): Kurse für Watchlist‑Assets (Aktien, ETFs, Indizes).
   - **CoinGecko/CoinMarketCap** (Krypto): Preise für konfigurierte Kryptowährungen.
   - **News‑APIs** (z.B. NewsAPI): Schlagzeilen zu Markt‑Keywords.
   - **Eigenes Broker‑API** (falls eingerichtet): Portfolio‑Stand, Orders.
2. **Daten speichern** – im `/home/node/openclaw/trading/data/`‑Verzeichnis:
   - Zeitreihen als CSV/JSON (z.B. `AAPL_2026-02-06.csv`).
   - Aktuelle Snapshot‑Datei (`latest_prices.json`).
3. **Alarme prüfen** – gegen vordefinierte Schwellen (aus `trading/alerts/rules.json`):
   - Preis‑Alarme (obere/untere Grenze).
   - Prozentuale Veränderung (z.B. >5% seit letztem Check).
   - News‑Keywords (z.B. „Zinsentscheidung“, „Gewinnwarnung“).
4. **Benachrichtigungen senden** – falls Alarm ausgelöst:
   - Telegram‑Nachricht (via OpenClaw Gateway).
   - Email (optional, über gog CLI).
5. **Logging** – schreibe Erfolg/Fehler in `/home/node/openclaw/trading/logs/data-refresh.log`.

### Konfiguration (später):
- Watchlist: Liste der Assets (Symbol, Typ, Alarm‑Regeln).
- APIs: API‑Keys, Endpoints, Intervalle.
- Alarm‑Ziele: Telegram‑Chat‑ID, Email‑Adressen.

### Ausgabe (für manuellen Test):
- Zusammenfassung der abgerufenen Daten (Anzahl Assets, Preise).
- Ausgelöste Alarme (falls welche).
- Fehler (falls Datenquellen nicht erreichbar).

### Hinweise:
- Bei API‑Rate‑Limits pausieren oder priorisieren.
- Fehler tolerant behandeln (einzelne Asset‑Fehler sollten nicht gesamten Run abbrechen).
- Daten‑Historien aufbewahren (für Backtesting).

---

**Verwendung:**
```javascript
const task = `Führe Trading‑Daten‑Refresh durch.
Lies Konfiguration aus /home/node/openclaw/trading/config.json.
Aktualisiere Kurse für alle Assets in der Watchlist, prüfe Alarme, sende Benachrichtigungen falls nötig.`;
```