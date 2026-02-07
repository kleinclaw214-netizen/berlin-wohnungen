# Subagent Template: Qigong Social Media

**Label:** `qigong-social-media`
**Model:** `openai-codex/gpt-5.2` (fallback `deepseek/deepseek-reasoner`)
**Thinking:** `medium`
**Run Timeout:** 600 seconds

## Task Description

Erstelle und plane Social‑Media‑Content für die Qigong‑Business‑Marke. Nutze die Analysen im `/home/node/openclaw/qigong-business/`‑Verzeichnis.

### Schritte:
1. **Content‑Kalender abrufen** – lies den wöchentlichen Plan aus `social-media/social-media-strategy.md`.
2. **Tages‑Thema identifizieren** – basierend auf aktuellem Wochentag (Berliner Zeit).
3. **Post‑Ideen generieren** – je Plattform (Instagram, YouTube, Facebook) passende Formate:
   - **Instagram Reel** (15–60s): kurze Übung, Atemtechnik, visuell ansprechend.
   - **Carousel** (5–10 Bilder): Schritt‑für‑Schritt‑Anleitung, Meridian‑Infografik.
   - **Caption** (inkl. Hashtags aus der Strategie).
4. **Grafiken/Video‑Skripte** – beschreibe benötigte Assets (kann später produziert werden).
5. **API‑Posting vorbereiten** – falls APIs konfiguriert sind, erstelle JSON‑Payloads für automatisierte Veröffentlichung.

### Ausgabe:
- Strukturierte Liste der Post‑Ideen (Plattform, Format, Text, Hashtags, Asset‑Beschreibung).
- Vorschlag für Veröffentlichungszeit (optimale Uhrzeit für Zielgruppe).
- Evtl. JSON‑Payload für API.

### Hinweise:
- Nutze den deutschen Markt‑Fokus (Zielgruppe 40–70 Jahre, Gesundheit/Stress).
- Verweise auf ZPP‑zertifizierte Kurse, falls relevant.
- Halte Tonfall authentisch, freundlich, fachkundig.

---

**Verwendung:**
```javascript
const task = `Erstelle heute (${currentDate}) Social‑Media‑Content für Qigong.
Folge der Vorlage in /home/node/openclaw/subagent-templates/qigong-social-media.md.
Gib konkrete Post‑Ideen für Instagram, Facebook und YouTube aus.`;
```