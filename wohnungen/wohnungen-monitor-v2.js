#!/usr/bin/env node
/*
  wohnungen-monitor-v2.js (rebuild)
  Runs scraper, updates seen DB, prints compact summary.
  Tokensparend: This script is meant to be called by cron; it writes JSON and prints short output.
*/
const fs = require('fs');
const { execSync } = require('child_process');

const SCRAPER = '/home/node/openclaw/wohnungen/universal-scraper-v2.js';
const RUNNER = '/home/node/openclaw/wohnungen/wohnungen-runner.js';
const SEEN_FILE = '/home/node/.openclaw/wohnungen-seen.json';

function readJson(p, fallback){ try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch { return fallback; } }
function writeJson(p, data){ fs.mkdirSync(require('path').dirname(p), { recursive:true }); fs.writeFileSync(p, JSON.stringify(data,null,2)); }

function hashKey(apt){
  const key = (apt.link && String(apt.link).trim()) ? String(apt.link).trim() : `${apt.source||''}|${apt.title||''}|${apt.price||''}|${apt.size||''}|${apt.rooms||''}`;
  let h=0; for (let i=0;i<key.length;i++){ h=((h<<5)-h)+key.charCodeAt(i); h|=0; } return h.toString(16);
}

function main(){
  const argv = process.argv.slice(2);
  const sitesIdx = argv.indexOf('--sites');
  const sites = sitesIdx !== -1 ? argv[sitesIdx+1] : null;
  const maxPagesIdx = argv.indexOf('--max-pages');
  const maxPages = maxPagesIdx !== -1 ? argv[maxPagesIdx+1] : null;

  const args = [];
  if (sites) { args.push('--sites', sites); }
  if (maxPages) { args.push('--max-pages', maxPages); }

  execSync(`node ${SCRAPER} ${args.join(' ')}`.trim(), { stdio: 'inherit', timeout: 420000 });

  // Update seen db
  const res = readJson('/home/node/.openclaw/wohnungen-results-v2.json', { apartments: [] });
  const apts = Array.isArray(res.apartments) ? res.apartments : [];

  const db = readJson(SEEN_FILE, { lastRun: null, seenApartments: [] });
  const set = new Set(db.seenApartments || []);

  let added = 0;
  for (const a of apts) {
    const h = hashKey(a);
    if (!set.has(h)) { set.add(h); added++; }
  }
  db.lastRun = new Date().toISOString();
  db.seenApartments = Array.from(set);
  writeJson(SEEN_FILE, db);

  // Print summary for reham
  execSync(`node ${RUNNER} --profile reham --top 10`, { stdio: 'inherit', timeout: 60000 });
  console.log(`\n✅ Seen-DB updated: +${added}`);
}

main();
