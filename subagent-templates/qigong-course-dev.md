# Subagent Template: Qigong Course Development

**Label:** `qigong-course-dev`
**Model:** `openai-codex/gpt-5.2` (fallback `deepseek/deepseek-reasoner`)
**Thinking:** `medium`
**Run Timeout:** 1200 seconds

## Task Description

Entwickle und strukturiere Qigong‑Kurse (Online & Präsenz), bereite ZPP‑Zertifizierung vor, erstelle Kurs‑Materialien.

### Schritte (abhängig von konkretem Auftrag):
1. **Kurskonzept erstellen** – basierend auf Marktanalyse (`/home/node/openclaw/qigong-business/market-analysis/`).
   - Zielgruppe, Lernziele, Dauer, Preismodell.
   - Besonderheiten für ZPP‑Anerkennung (8‑Wochen‑Plan, wissenschaftlicher Nachweis).
2. **Video‑Skripte schreiben** – pro Kurseinheit (z.B. 10 Einheiten à 45–60 Minuten).
   - Einleitung, Übungsanleitung, Theorieteil, Zusammenfassung.
   - Tipps für Aufnahme (Kamera‑Perspektiven, Requisiten).
3. **Begleitmaterialien** – Arbeitsblätter, Merkblätter, Hausaufgaben.
4. **Technische Umsetzung** – Plattform‑Empfehlung (Thinkific, Teachable, Udemy), Zahlungsabwicklung, Datenschutz.
5. **Marketing‑Texte** – Kurs‑Beschreibung, Verkaufsseite, Email‑Sequenz.

### Mögliche Aufträge:
- „Erstelle ein Kurskonzept für 'Qigong für den Rücken' (8 Wochen, ZPP‑zertifiziert)“
- „Schreibe Skripte für die ersten 3 Einheiten eines Online‑Kurses“
- „Vergleiche Plattformen für Kurs‑Hosting (Kosten, Features)“
- „Entwerfe eine Landingpage für den Kurs“

### Ausgabe:
- Strukturiertes Dokument (Markdown/JSON) mit allen Kurs‑Details.
- Skripte im gewünschten Format.
- Empfehlungen für nächste Schritte (Produktion, ZPP‑Antrag, Marketing).

### Hinweise:
- Nutze die Berlin‑Präsenz‑Marktanalyse für lokale Kurs‑Anpassungen.
- Achte auf Krankenkassen‑Richtlinien (Leitfaden Prävention).
- Halte Inhalte praxisnah, verständlich, wissenschaftlich fundiert.

---

**Verwendung:**
```javascript
const task = `Entwickle einen ZPP‑zertifizierten Online‑Kurs "Qigong für Stressregulation".
Nutze die Vorlage in /home/node/openclaw/subagent-templates/qigong-course-dev.md.
Gib vollständiges Kurskonzept (8 Wochen), Skripte für Einheit 1–4 und Marketing‑Text aus.`;
```