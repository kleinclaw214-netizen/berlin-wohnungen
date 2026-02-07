#!/usr/bin/env node
const PptxGenJS = require('pptxgenjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const OUT_PPTX = '/home/node/openclaw/dubai_business_5slides.pptx';
const OUT_NOTES = '/home/node/openclaw/dubai_business_5slides_notes.txt';
const IMG_DIR = '/home/node/openclaw/pptx/assets';

const COLORS = {
  navy: '0B1F3B',
  blue: '1D4ED8',
  gold: 'F59E0B',
  text: '0F172A',
  muted: '475569',
  line: 'E2E8F0',
  bg: 'F8FAFC',
};

const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1600&q=80',
  economy: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1600&q=80',
  infra: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1600&q=80',
  business: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80',
  next: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?auto=format&fit=crop&w=1600&q=80',
};

async function download(url, file) {
  const fp = path.join(IMG_DIR, file);
  if (fs.existsSync(fp) && fs.statSync(fp).size > 10_000) return fp;
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
  fs.writeFileSync(fp, Buffer.from(res.data));
  return fp;
}

function addTopBar(slide, title) {
  slide.addShape('rect', { x: 0, y: 0, w: 13.333, h: 0.65, fill: { color: COLORS.navy } });
  slide.addText(title, { x: 0.6, y: 0.14, w: 12.2, h: 0.4, fontFace: 'Aptos Display', fontSize: 20, color: 'FFFFFF', bold: true });
  slide.addShape('rect', { x: 0, y: 0.65, w: 13.333, h: 0.05, fill: { color: COLORS.gold } });
}

function kpi(slide, x, y, w, label, value) {
  slide.addShape('roundRect', { x, y, w, h: 1.1, fill: { color: 'FFFFFF' }, line: { color: COLORS.line, width: 1 } });
  slide.addText(value, { x: x+0.25, y: y+0.18, w: w-0.5, h: 0.45, fontFace: 'Aptos Display', fontSize: 22, bold: true, color: COLORS.navy });
  slide.addText(label, { x: x+0.25, y: y+0.62, w: w-0.5, h: 0.35, fontFace: 'Aptos', fontSize: 12, color: COLORS.muted });
}

async function main() {
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const heroImg = await download(IMAGES.hero, 'hero.jpg');
  const economyImg = await download(IMAGES.economy, 'economy.jpg');
  const infraImg = await download(IMAGES.infra, 'infra.jpg');
  const businessImg = await download(IMAGES.business, 'business.jpg');
  const nextImg = await download(IMAGES.next, 'next.jpg');

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'KleinClaw';
  pptx.title = 'Dubai – Business Briefing';

  const notes = [];

  // Slide 1
  {
    const s = pptx.addSlide();
    s.addImage({ path: heroImg, x: 0, y: 0, w: 13.333, h: 7.5 });
    s.addShape('rect', { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: '000000', transparency: 45 } });
    s.addText('Dubai', { x: 0.8, y: 2.2, w: 11.8, h: 1.0, fontFace: 'Aptos Display', fontSize: 60, bold: true, color: 'FFFFFF' });
    s.addText('Business Briefing (DE)', { x: 0.85, y: 3.2, w: 11.8, h: 0.6, fontFace: 'Aptos', fontSize: 22, color: 'FFFFFF' });
    s.addShape('rect', { x: 0.85, y: 4.0, w: 4.8, h: 0.08, fill: { color: COLORS.gold } });
    s.addText('Wachstum • Standortvorteile • Chancen', { x: 0.85, y: 4.25, w: 11.8, h: 0.5, fontFace: 'Aptos', fontSize: 16, color: 'FFFFFF' });
    s.addText('Stand: 2026', { x: 0.85, y: 6.9, w: 11.8, h: 0.4, fontFace: 'Aptos', fontSize: 12, color: 'E5E7EB' });
    notes.push('Slide 1: Kurzer Einstieg – Dubai als globaler Hub zwischen Europa/Asien/Afrika. Fokus der Präsentation: Standortvorteile + Rahmenbedingungen + konkrete Next Steps.');
  }

  // Slide 2 – Economy
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Wirtschaft & Schlüsselsektoren');

    s.addShape('rect', { x: 0, y: 0.7, w: 13.333, h: 6.8, fill: { color: COLORS.bg } });

    s.addImage({ path: economyImg, x: 8.0, y: 1.35, w: 5.0, h: 5.6 });
    s.addShape('rect', { x: 8.0, y: 1.35, w: 5.0, h: 5.6, line: { color: COLORS.line, width: 1 } });

    kpi(s, 0.8, 1.35, 2.2, 'Regionale Drehscheibe', 'Hub');
    kpi(s, 3.25, 1.35, 2.2, 'Unternehmensdichte', 'hoch');
    kpi(s, 5.7, 1.35, 2.2, 'Wachstumsfokus', 'Tech');

    const bullets = [
      'Tourismus & Hospitality (Premium-Marke, Events, MICE)',
      'Handel & Logistik (Häfen, Luftfracht, Re-Export)',
      'Finanzen (DIFC, internationale Banken & FinTech)',
      'Immobilien & Bau (Mega-Projekte, Urban Development)',
      'Tech & Innovation (AI-Strategie, Internet City, Startups)'
    ];

    s.addText('Kerntreiber:', { x: 0.8, y: 2.7, w: 6.9, h: 0.4, fontFace: 'Aptos Display', fontSize: 18, bold: true, color: COLORS.navy });
    s.addShape('rect', { x: 0.8, y: 3.1, w: 6.9, h: 0.03, fill: { color: COLORS.line } });

    let y = 3.25;
    for (const b of bullets) {
      s.addText('•', { x: 0.85, y, w: 0.3, h: 0.3, fontFace: 'Aptos', fontSize: 16, color: COLORS.gold, bold: true });
      s.addText(b, { x: 1.15, y: y-0.02, w: 6.6, h: 0.35, fontFace: 'Aptos', fontSize: 13, color: COLORS.text });
      y += 0.52;
    }

    s.addText('Business-Readout: Diversifiziert, international ausgerichtet, stark im Service- und Tech-Sektor.', { x: 0.8, y: 6.6, w: 7.0, h: 0.5, fontFace: 'Aptos', fontSize: 12, color: COLORS.muted });
    notes.push('Slide 2: Dubai ist kein Ein-Sektor-Play. Wichtig sind Logistik/Handel, Finanzen (DIFC) und der starke Push in Tech/Innovation. Für Business heißt das: viele Anknüpfungspunkte je nach Branche.');
  }

  // Slide 3 – Infrastructure
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Infrastruktur & Konnektivität');
    s.addShape('rect', { x: 0, y: 0.7, w: 13.333, h: 6.8, fill: { color: COLORS.bg } });

    s.addImage({ path: infraImg, x: 8.0, y: 1.35, w: 5.0, h: 5.6 });
    s.addShape('rect', { x: 8.0, y: 1.35, w: 5.0, h: 5.6, line: { color: COLORS.line, width: 1 } });

    const items = [
      ['Aviation', 'DXB + DWC: globale Connectivity'],
      ['Logistik', 'Jebel Ali + Free Zones: Supply Chain Speed'],
      ['Mobilität', 'Metro/Highways: effizienter Stadtverkehr'],
      ['Digital', '5G + Cloud/Datacenter-Ökosystem'],
      ['Events', 'Messen/Konferenzen als Deal-Motor']
    ];

    s.addText('Warum das zählt:', { x: 0.8, y: 1.35, w: 7.0, h: 0.5, fontFace: 'Aptos Display', fontSize: 18, bold: true, color: COLORS.navy });
    s.addShape('rect', { x: 0.8, y: 1.85, w: 7.0, h: 0.03, fill: { color: COLORS.line } });

    let y = 2.1;
    for (const [h, t] of items) {
      s.addShape('roundRect', { x: 0.8, y, w: 7.0, h: 0.85, fill: { color: 'FFFFFF' }, line: { color: COLORS.line, width: 1 } });
      s.addText(h, { x: 1.05, y: y+0.15, w: 1.6, h: 0.3, fontFace: 'Aptos Display', fontSize: 14, bold: true, color: COLORS.blue });
      s.addText(t, { x: 2.15, y: y+0.16, w: 5.5, h: 0.5, fontFace: 'Aptos', fontSize: 13, color: COLORS.text });
      y += 1.0;
    }

    notes.push('Slide 3: Infrastruktur ist ein Wettbewerbsvorteil: schnelle Erreichbarkeit, starke Logistik, gute digitale Basis. Das reduziert Time-to-Market und macht Dubai attraktiv als Regional-HQ.');
  }

  // Slide 4 – Business environment
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Rahmenbedingungen für Unternehmen');
    s.addShape('rect', { x: 0, y: 0.7, w: 13.333, h: 6.8, fill: { color: COLORS.bg } });

    s.addImage({ path: businessImg, x: 8.0, y: 1.35, w: 5.0, h: 5.6 });
    s.addShape('rect', { x: 8.0, y: 1.35, w: 5.0, h: 5.6, line: { color: COLORS.line, width: 1 } });

    s.addText('Hebel für Setup & Skalierung:', { x: 0.8, y: 1.35, w: 7.0, h: 0.5, fontFace: 'Aptos Display', fontSize: 18, bold: true, color: COLORS.navy });
    s.addShape('rect', { x: 0.8, y: 1.85, w: 7.0, h: 0.03, fill: { color: COLORS.line } });

    const blocks = [
      ['Free Zones', 'Schnelle Gründung, branchenspezifische Cluster (z.B. DIFC, DMCC, Internet City)'],
      ['Ownership', '100% Eigentum in vielen Konstellationen möglich (je nach Setup)'],
      ['Taxes', 'Vereinfachte Strukturen; Details abhängig von Aktivität/Zone'],
      ['Visa/Talent', 'Internationaler Talent-Pool + Business-Visa-Programme'],
      ['Regulatorik', 'Klarere Spielregeln in etablierten Zonen (z.B. DIFC)']
    ];

    let y = 2.1;
    for (const [k, v] of blocks) {
      s.addText(k, { x: 0.8, y, w: 2.0, h: 0.3, fontFace: 'Aptos Display', fontSize: 13, bold: true, color: COLORS.blue });
      s.addText(v, { x: 2.35, y: y-0.02, w: 5.45, h: 0.5, fontFace: 'Aptos', fontSize: 13, color: COLORS.text });
      s.addShape('rect', { x: 0.8, y: y+0.55, w: 7.0, h: 0.02, fill: { color: COLORS.line } });
      y += 0.9;
    }

    s.addText('Hinweis: Für rechtlich/steuerlich verbindliche Aussagen immer mit lokaler Beratung finalisieren.', { x: 0.8, y: 6.75, w: 7.0, h: 0.35, fontFace: 'Aptos', fontSize: 10, color: COLORS.muted });

    notes.push('Slide 4: Entscheidend ist das Setup (Free Zone vs Mainland) und die Aktivität. Der Pitch hier: schnelle, cluster-basierte Markteintritte; finale Details immer mit lokaler Beratung.');
  }

  // Slide 5 – Opportunities
  {
    const s = pptx.addSlide();
    addTopBar(s, 'Chancen & Next Steps');
    s.addShape('rect', { x: 0, y: 0.7, w: 13.333, h: 6.8, fill: { color: 'FFFFFF' } });

    s.addImage({ path: nextImg, x: 0, y: 0.7, w: 13.333, h: 6.8 });
    s.addShape('rect', { x: 0, y: 0.7, w: 13.333, h: 6.8, fill: { color: '000000', transparency: 55 } });

    s.addText('Opportunities', { x: 0.9, y: 1.4, w: 6.5, h: 0.6, fontFace: 'Aptos Display', fontSize: 28, bold: true, color: 'FFFFFF' });

    const opp = [
      'Regional-HQ / Sales Hub (MENA)',
      'B2B-Services in Free-Zone-Clustern',
      'E-Commerce + Cross-Border Logistik',
      'FinTech / Payments / Wealth',
      'PropTech, Hospitality & Experience Economy'
    ];

    let y = 2.2;
    for (const o of opp) {
      s.addText('•', { x: 0.95, y, w: 0.3, h: 0.3, fontFace: 'Aptos', fontSize: 18, color: COLORS.gold, bold: true });
      s.addText(o, { x: 1.25, y: y-0.02, w: 11.0, h: 0.35, fontFace: 'Aptos', fontSize: 16, color: 'FFFFFF' });
      y += 0.55;
    }

    s.addShape('roundRect', { x: 0.9, y: 5.55, w: 11.6, h: 1.4, fill: { color: 'FFFFFF', transparency: 10 }, line: { color: 'FFFFFF', transparency: 40 } });
    s.addText('Next Steps (14 Tage)', { x: 1.2, y: 5.72, w: 11.0, h: 0.35, fontFace: 'Aptos Display', fontSize: 16, bold: true, color: COLORS.navy });
    s.addText('1) Zielbranche & Setup wählen  •  2) 2–3 Free Zones shortlist  •  3) Kosten/Timeline klären  •  4) 3–5 Partner/Termine vor Ort', { x: 1.2, y: 6.1, w: 11.0, h: 0.8, fontFace: 'Aptos', fontSize: 13, color: COLORS.text });

    notes.push('Slide 5: Konkreter Abschluss: Welche Opportunitäten passen zu unserem Case? Dann 14-Tage-Plan: Setup wählen, Free Zones shortlist, Kosten/Timeline, Termine/Partner.');
  }

  await pptx.writeFile({ fileName: OUT_PPTX });
  fs.writeFileSync(OUT_NOTES, notes.map((n,i)=>`Slide ${i+1}: ${n}`).join('\n\n')+'\n');

  console.log('Wrote:', OUT_PPTX);
  console.log('Wrote:', OUT_NOTES);
}

main().catch((e)=>{ console.error(e); process.exit(1); });
