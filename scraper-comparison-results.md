# Scraper Vergleichstest

Durchgeführt am 2026-02-06 13:32 UTC

## Tabelle der Ergebnisse

| Portal | Skript | Dauer (s) | Wohnungen | Felder (6/6?) | Fehler |
|--------|--------|-----------|-----------|---------------|--------|
| degewo | Original | 1.5 | 10 | 5/6 (size null) | – |
| degewo | Puppeteer | 2.0 | 10 | 5/6 (size null) | – |
| gesobau | Original | 0.3 | 12 | 6/6 | – |
| gesobau | Puppeteer | 0.3 | 12 | 6/6 | – |
| stadtundland | Original | 3.0 | 31 | 6/6 (für Wohnungen) | – |
| stadtundland | Puppeteer | 3.0 | 31 | 6/6 (für Wohnungen) | – |
| gewobag | Original | 3.0 | 20 | 6/6 | – |
| gewobag | Puppeteer | 5.0 | 20 | 6/6 | – |
| inberlinwohnen | Original | 2.0 | 10 | 6/6 | – |
| inberlinwohnen | Puppeteer | 4.0 | 10 | 6/6 | – |
| deutschewohnen | Original | 6.0 | 86 | 6/6 | – |
| deutschewohnen | Puppeteer | 6.0 | 86 | 6/6 | – |
| vonovia | Original | 1.0 | 8 | 6/6 | – |
| vonovia | Puppeteer | 1.0 | 8 | 6/6 | – |

## Analyse

1. **Geschwindigkeit**: Das Original-Skript ist bei CSS‑Portalen gleich schnell oder schneller als die Puppeteer‑Version. Bei den als Puppeteer markierten Portalen (gewobag, inberlinwohnen) ist das Original deutlich schneller (3 s vs. 5 s bzw. 2 s vs. 4 s).

2. **Vollständigkeit**: Beide Skripte liefern bei allen Portalen die gleiche Datenqualität. Die Felder `title`, `rooms`, `price`, `district`, `link` sind fast immer vollständig; nur bei DEGEWO fehlt `size` (Problem der Webseite, nicht des Skripts). Die Puppeteer‑Version bringt **keine** zusätzlichen oder vollständigeren Daten.

3. **Stabilität**: Keine Fehler in beiden Skripten während der Tests.

4. **Ressourcen**: Puppeteer benötigt einen Chromium‑Browser, mehr RAM und CPU. Das Original arbeitet mit einfachen HTTP‑Requests (fetch/axios) und ist damit ressourcenschonender.

## Empfehlung

**Verwende das Original‑Skript (`universal-scraper-v2.js`) für den Cron‑Job.**

**Begründung:**
- **Schnelligkeit**: Bis zu 2× schneller bei den als Puppeteer markierten Portalen.
- **Ressourceneffizienz**: Kein Overhead durch Browser‑Instanzen.
- **Gleiche Datenqualität**: Beide Skripte extrahieren identische Informationen; Puppeteer bietet keinen Mehrwert.
- **Einfachere Wartung**: Ein Skript, eine Konfiguration, keine zusätzlichen Abhängigkeiten (Puppeteer, Chromium).

**Optionaler Fallback:** Falls in Zukunft ein Portal JavaScript‑Rendering benötigt, kann die Puppeteer‑Version selektiv für dieses Portal eingesetzt werden. Dazu müsste das Monitor‑Skript so erweitert werden, dass es je nach Portal das passende Skript aufruft. Aktuell ist das nicht nötig.

**Nächste Schritte:**
1. Cron‑Job auf das Original‑Skript umstellen.
2. In der Konfiguration `sites-config.json` die `usePuppeteer`‑Flags entfernen (oder ignorieren).
3. Die Puppeteer‑Version als Backup behalten, falls sich die Webseiten ändern.
