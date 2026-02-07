# Trading – Automatisierung & Analyse

Dieses Verzeichnis enthält alle Ressourcen für Trading‑Daten, Strategien, Alarme und Portfolio‑Tracking.

## 📁 Struktur

- **data/** – Historische und aktuelle Kursdaten (CSV/JSON)
- **strategies/** – Backtesting‑Skripte, Strategie‑Definitionen
- **alerts/** – Alarm‑Regeln, ausgelöste Alarme
- **portfolio/** – Depot‑Zustand, Performance‑Tracking
- **logs/** – Log‑Dateien der automatisierten Jobs
- **config/** – Konfigurationsdateien (Watchlist, APIs, Notifications)

## 🚀 Schnellstart

### 1. Watchlist konfigurieren
Bearbeite `config/watchlist.json` (kopiere von `sample-config.json`):
- Füge Assets (Aktien, Krypto, ETFs) hinzu.
- Definiere Alarm‑Regeln (Preis‑Schwellen, prozentuale Veränderung).

### 2. Daten‑Refresh einrichten
Cron‑Job (stündlich) für automatischen Daten‑Abruf:
```bash
# Beispiel‑Cron (später über OpenClaw Cron‑Tool)
0 * * * * /home/node/openclaw/trading/scripts/refresh-data.sh
```

### 3. Alarme erhalten
Bei ausgelösten Alarmen werden Telegram‑Nachrichten an deinen Chat gesendet.

### 4. Analysen durchführen
Manuell einen Subagenten starten:
```bash
openclaw sessions spawn --agent main --label trading-analysis --task "Backtest MA Crossover Strategie"
```

## 🔧 Subagenten‑Templates

Vordefinierte Tasks (im übergeordneten `subagent-templates/`):

- **trading‑data‑refresh** – Stündlicher Daten‑Abruf & Alarm‑Check
- **trading‑analysis** – Vertiefte Analyse, Backtesting, Reporting

## 📡 Datenquellen

- **Yahoo Finance** (kostenlos, Aktien/ETFs/Indizes)
- **CoinGecko** (Krypto, benötigt API‑Key)
- **NewsAPI** (Nachrichten, benötigt API‑Key)
- **Eigener Broker‑API** (z.B. Interactive Brokers, Alpaca – später)

## 🛠️ Tools

- **Python‑Skripte** (für Daten‑Processing, Backtesting)
- **OpenClaw Subagenten** (für Analyse, Reporting)
- **Telegram‑Bot** (Benachrichtigungen)
- **Cron‑Jobs** (Automatisierung)

## 📅 Nächste Schritte

1. **Watchlist finalisieren** – Assets und Alarm‑Regeln eintragen.
2. **Daten‑Refresh‑Cron einrichten** (über OpenClaw Cron‑Tool).
3. **Ersten Backtest** durchführen (Subagent `trading-analysis`).
4. **Portfolio‑Tracking** integrieren (falls Broker‑API verfügbar).

---

*Dieser Bereich wird schrittweise ausgebaut. Start mit öffentlichen Datenquellen, später Integration von Broker‑APIs.*