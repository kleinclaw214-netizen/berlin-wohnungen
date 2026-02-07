# Subagent Template: Trading Analysis

**Label:** `trading-analysis`
**Model:** `openai-codex/gpt-5.2` (fallback `deepseek/deepseek-reasoner`)
**Thinking:** `medium` (für komplexe Analysen `high`)
**Run Timeout:** 1800 seconds

## Task Description

Führe vertiefte Trading‑Analysen durch: Strategie‑Backtesting, Portfolio‑Review, Markt‑Research, Performance‑Auswertung.

### Mögliche Aufträge:
1. **Strategie‑Backtesting** – teste eine gegebene Strategie an historischen Daten.
   - Lies historische Preisdaten aus `/home/node/openclaw/trading/data/`.
   - Implementiere Strategie‑Logik (z.B. Moving‑Average‑Crossover, RSI‑Überkauft/‑verkauft).
   - Simuliere Trades (Entry/Exit, Stoploss, Take‑Profit).
   - Berechne Performance‑Kennzahlen (Sharpe, Max Drawdown, Win‑Rate).
2. **Portfolio‑Review** – analysiere aktuelles Portfolio (falls Broker‑API verfüg).
   - Asset‑Allokation, Sektor‑Verteilung, Risiko‑Analyse.
   - Performance vs. Benchmark (z.B. S&P 500).
   - Rebalancing‑Empfehlungen.
3. **Markt‑Research** – recherchiere zu bestimmten Assets/Themen.
   - Fundamentaldaten (KGV, Dividende, Bilanz).
   - Technische Analyse (Chart‑Muster, Indikatoren).
   - News‑Sentiment (positive/negative Schlagzeilen).
4. **Reporting** – erstelle wöchentlichen/monatlichen Report.
   - Zusammenfassung der Marktentwicklung.
   - Portfolio‑Performance.
   - Ausblick und Handlungsempfehlungen.

### Ausgabe:
- Detaillierter Analyse‑Report (Markdown/PDF‑Style).
- Grafiken (falls möglich: Plot‑Beschreibungen für Python‑Skript).
- Konkrete Handlungsempfehlungen (Kaufen/Verkalten/Halten).
- Ggf. generierte Code‑Snippets für Backtesting‑Skripte.

### Hinweise:
- Nutze öffentlich verfügbare Daten (Yahoo Finance, Investing.com, News‑APIs).
- Bei Krypto: CoinGecko/CoinMarketCap APIs.
- Halte Risikohinweise (keine Anlageberatung).
- Dokumentiere Annahmen und Limitationen.

---

**Verwendung:**
```javascript
const task = `Führe Backtesting der Strategie "MA Crossover (50/200)" für Apple (AAPL) über die letzten 365 Tage.
Nutze historische Tagesdaten aus /home/node/openclaw/trading/data/.
Berechne Performance‑Kennzahlen und visualisiere Equity‑Kurve (Beschreibung für Plot).`;
```