# Berlin Apartment Scraper System

A multi‑portal apartment listing scraper for Berlin, with automated monitoring, filtering, and notifications.

## Overview

This system scrapes 9+ Berlin housing portals (DEGEWO, GEWOBAG, Howoge, Stadt & Land, WBM, Berlinovo, Deutsche Wohnen, Vonovia, inberlinwohnen.de) every 30 minutes, detects new listings, applies filter profiles, and sends notifications via Telegram and email.

## Features

- **Multi‑portal support**: Each portal uses an appropriate scraping strategy (CSS, API, OpenImmo form, pagination).
- **Real‑time monitoring**: Cron‑job runs every 30 minutes, logs results, and detects new apartments.
- **Filter profiles**: Define criteria per profile (e.g., “Reham”: 3+ rooms, ≤1100€).
- **Notifications**:
  - **Telegram**: Posts new listings to a configured channel.
  - **Email**: Sends filtered matches via Gmail (using Gog CLI).
- **Persistent state**: Tracks seen apartments to avoid duplicates.
- **Berlin timezone**: All timestamps are in CET/CEST.

## Core Files

- `universal‑scraper‑v2.js` – Main scraper, handles all portals.
- `wohnungen‑monitor‑v2.js` – Monitor script with notification logic.
- `sites‑config.json` – Portal configurations (URLs, selectors, pagination).
- `filter‑criteria.json` – Active filter profiles and global settings.
- `wohnungen‑runner.js` – Orchestration script (optional).

## Setup

### 1. Clone & install dependencies
```bash
git clone https://github.com/kleinclaw214-netizen/berlin-wohnungen.git
cd berlin-wohnungen
npm install
```

### 2. Configure portals
Edit `sites‑config.json` to adjust scraping parameters.

### 3. Set up notifications
- **Telegram**: Set `TELEGRAM_TARGET` in the cron script to your channel ID.
- **Email**: Ensure `gog` CLI is installed and configured with a Gmail OAuth token.

### 4. Schedule monitoring
A Linux cron job (`*/30 * * * *`) calls a wrapper script that runs the monitor inside the Docker container.

## Cron Job Example

```bash
#!/usr/bin/env bash
SITES="inberlinwohnen,degewo,gewobag,gesobau,stadtundland,wbm,berlinovo,deutschewohnen,vonovia"
TELEGRAM_TARGET="-1003763447509"
docker exec openclaw-w9ts-openclaw-1 node /home/node/openclaw/wohnungen-monitor-v2.js --sites "$SITES" --telegram-target "$TELEGRAM_TARGET"
```

## Filter Profiles

Currently active profile: **Reham** (3+ rooms, ≤1100€). Other profiles (Budget, Family) are disabled.

## License

MIT – use at your own risk.