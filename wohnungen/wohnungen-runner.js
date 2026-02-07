#!/usr/bin/env node
/*
  wohnungen-runner.js (rebuild)
  Reads results + seen + filter-criteria and prints compact summary.
*/
const fs = require('fs');

const RESULTS_FILE = '/home/node/.openclaw/wohnungen-results-v2.json';
const SEEN_FILE = '/home/node/.openclaw/wohnungen-seen.json';
const CRITERIA_FILE = '/home/node/openclaw/wohnungen/filter-criteria.json';

function readJson(p, fallback){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return fallback; } }

function hashKey(apt){
  const key = (apt.link && String(apt.link).trim()) ? String(apt.link).trim() : `${apt.source||''}|${apt.title||''}|${apt.price||''}|${apt.size||''}|${apt.rooms||''}`;
  let h=0;
  for (let i=0;i<key.length;i++){ h=((h<<5)-h)+key.charCodeAt(i); h|=0; }
  return h.toString(16);
}

function matches(apt, c){
  const price = typeof apt.price === 'number' ? apt.price : null;
  const size = typeof apt.size === 'number' ? apt.size : null;
  const rooms = typeof apt.rooms === 'number' ? apt.rooms : null;

  if (c.maxPrice!=null && price!=null && price>c.maxPrice) return false;
  if (c.minPrice!=null && price!=null && price<c.minPrice) return false;
  if (c.minSize!=null && size!=null && size<c.minSize) return false;
  if (c.maxSize!=null && size!=null && size>c.maxSize) return false;
  if (c.minRooms!=null && rooms!=null && rooms<c.minRooms) return false;
  if (c.maxRooms!=null && rooms!=null && rooms>c.maxRooms) return false;

  const district = (apt.district||'').toString().toLowerCase();
  if (Array.isArray(c.excludeDistricts) && c.excludeDistricts.some(d => district.includes(String(d).toLowerCase()))) return false;
  if (Array.isArray(c.includeDistricts) && c.includeDistricts.length) {
    if (!c.includeDistricts.some(d => district.includes(String(d).toLowerCase()))) return false;
  }
  return true;
}

function fmt(apt){
  const rooms = apt.rooms ?? '?';
  const size = apt.size ?? '?';
  const price = apt.price ?? '?';
  const district = (apt.district || 'Unbekannt').toString().slice(0,60);
  const title = (apt.title || '').toString().slice(0,80);
  const link = apt.link || '';
  return `- ${rooms} Zi · ${size} m² · ${price} € · ${district}${title?`\n  ${title}`:''}${link?`\n  ${link}`:''}`;
}

function main(){
  const argv = process.argv.slice(2);
  const profIdx = argv.indexOf('--profile');
  const profile = profIdx !== -1 ? argv[profIdx+1] : 'reham';
  const topIdx = argv.indexOf('--top');
  const top = topIdx !== -1 ? parseInt(argv[topIdx+1],10) : 10;

  const criteria = readJson(CRITERIA_FILE, { profiles: {} });
  const c = criteria.profiles?.[profile] || criteria.profiles?.['reham'] || {};

  const seen = readJson(SEEN_FILE, { seenApartments: [] });
  const res = readJson(RESULTS_FILE, { apartments: [] });

  const apartments = Array.isArray(res.apartments) ? res.apartments : [];
  const enriched = apartments.map(a => ({...a, hash: hashKey(a)}));
  const seenSet = new Set(seen.seenApartments || []);
  const newOnes = enriched.filter(a => !seenSet.has(a.hash));
  const hits = enriched.filter(a => matches(a, c));

  console.log(`🏠 Wohnungs-Scan — Profil: ${c.name || profile}`);
  console.log(`Gescannt: ${apartments.length} | Neu: ${newOnes.length} | Treffer: ${hits.length}`);

  if (hits.length) {
    console.log(`\nTop ${Math.min(top, hits.length)}:`);
    hits.slice(0, top).forEach(a => console.log(fmt(a)));
  } else {
    console.log('\nKeine Treffer für dieses Profil.');
  }
}

main();
