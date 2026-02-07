#!/usr/bin/env node
/*
  wohnungen-alert-run.js
  - Runs universal-scraper-v2.js
  - Computes NEW apartments vs seen DB
  - Filters NEW apartments by profile (default: reham)
  - Writes payload JSON for the agent to send to Telegram/Email

  Output:
    - prints: ALERT_COUNT=<n>
    - writes: /home/node/.openclaw/wohnungen-alert-payload.json
*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCRAPER = '/home/node/openclaw/wohnungen/universal-scraper-v2.js';
const RESULTS_FILE = '/home/node/.openclaw/wohnungen-results-v2.json';
const SEEN_FILE = '/home/node/.openclaw/wohnungen-seen.json';
const CRITERIA_FILE = '/home/node/openclaw/wohnungen/filter-criteria.json';
const PAYLOAD_FILE = '/home/node/.openclaw/wohnungen-alert-payload.json';

function readJson(p, fallback){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return fallback; } }
function writeJson(p, data){ fs.mkdirSync(path.dirname(p), { recursive:true }); fs.writeFileSync(p, JSON.stringify(data,null,2)); }

function hashKey(apt){
  const key = (apt.link && String(apt.link).trim())
    ? String(apt.link).trim()
    : `${apt.source||''}|${apt.title||''}|${apt.price||''}|${apt.size||''}|${apt.rooms||''}`;
  let h=0; for (let i=0;i<key.length;i++){ h=((h<<5)-h)+key.charCodeAt(i); h|=0; }
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

function main(){
  const argv = process.argv.slice(2);
  const profIdx = argv.indexOf('--profile');
  const profile = profIdx !== -1 ? argv[profIdx+1] : 'reham';
  const maxPagesIdx = argv.indexOf('--max-pages');
  const maxPages = maxPagesIdx !== -1 ? argv[maxPagesIdx+1] : null;
  const sitesIdx = argv.indexOf('--sites');
  const sites = sitesIdx !== -1 ? argv[sitesIdx+1] : null;

  const args = [];
  if (sites) args.push('--sites', sites);
  if (maxPages) args.push('--max-pages', maxPages);

  // 1) run scraper (writes RESULTS_FILE)
  execSync(`node ${SCRAPER} ${args.join(' ')}`.trim(), { stdio: 'inherit', timeout: 420000 });

  // 2) load data
  const criteria = readJson(CRITERIA_FILE, { profiles: {} });
  const c = criteria.profiles?.[profile] || criteria.profiles?.['reham'] || {};

  const res = readJson(RESULTS_FILE, { apartments: [], sites: [] });
  const apartments = Array.isArray(res.apartments) ? res.apartments : [];

  const db = readJson(SEEN_FILE, { lastRun: null, seenApartments: [] });
  const seenSet = new Set(db.seenApartments || []);

  // 3) compute new
  const enriched = apartments.map(a => ({...a, hash: hashKey(a)}));
  const newOnes = enriched.filter(a => !seenSet.has(a.hash));
  const newHits = newOnes.filter(a => matches(a, c));

  // 4) update seen with ALL new apartments (not only hits)
  let added=0;
  for (const a of newOnes) {
    if (!seenSet.has(a.hash)) { seenSet.add(a.hash); added++; }
  }
  db.lastRun = new Date().toISOString();
  db.seenApartments = Array.from(seenSet);
  writeJson(SEEN_FILE, db);

  // 5) write alert payload
  const payload = {
    timestamp: new Date().toISOString(),
    profile,
    profileName: c.name || profile,
    scanned: apartments.length,
    newCount: newOnes.length,
    newHitCount: newHits.length,
    sites: res.sites || [],
    newHits: newHits.map(({hash, ...rest}) => rest),
  };
  writeJson(PAYLOAD_FILE, payload);

  console.log(`ALERT_COUNT=${newHits.length}`);
}

main();
