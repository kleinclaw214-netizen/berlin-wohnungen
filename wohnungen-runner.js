#!/usr/bin/env node
/**
 * wohnungen-runner.js
 *
 * Purpose:
 * - Run universal-scraper-v2.js (optional)
 * - Load results + seen-db + filter criteria
 * - Produce a compact, human-readable summary (stdout)
 *
 * Designed to be called by the OpenClaw agent (so it can forward stdout to Telegram).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RESULTS_FILE = '/home/node/.openclaw/wohnungen-results-v2.json';
const SEEN_FILE = '/home/node/.openclaw/wohnungen-seen.json';
const CRITERIA_FILE = '/home/node/filter-criteria.json';
const SCRAPER = '/home/node/universal-scraper-v2.js';

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function hashApartment(apt) {
  // Prefer stable link as identity; fall back to source+title+price+size.
  const key = (apt.link && String(apt.link).trim())
    ? String(apt.link).trim()
    : `${apt.source || ''}|${apt.title || ''}|${apt.price || ''}|${apt.size || ''}|${apt.rooms || ''}`;

  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h) + key.charCodeAt(i);
    h |= 0;
  }
  return h.toString(16);
}

function normalizeDistrict(str) {
  return (str || '').toString().trim().toLowerCase();
}

function matchesCriteria(apt, c) {
  const price = typeof apt.price === 'number' ? apt.price : null;
  const size = typeof apt.size === 'number' ? apt.size : null;
  const rooms = typeof apt.rooms === 'number' ? apt.rooms : null;

  if (c.maxPrice != null && price != null && price > c.maxPrice) return false;
  if (c.minPrice != null && price != null && price < c.minPrice) return false;
  if (c.minSize != null && size != null && size < c.minSize) return false;
  if (c.maxSize != null && size != null && size > c.maxSize) return false;
  if (c.minRooms != null && rooms != null && rooms < c.minRooms) return false;
  if (c.maxRooms != null && rooms != null && rooms > c.maxRooms) return false;

  const district = normalizeDistrict(apt.district);

  if (Array.isArray(c.excludeDistricts) && c.excludeDistricts.length) {
    const excluded = c.excludeDistricts.some(d => district.includes(normalizeDistrict(d)));
    if (excluded) return false;
  }

  if (Array.isArray(c.includeDistricts) && c.includeDistricts.length) {
    const included = c.includeDistricts.some(d => district.includes(normalizeDistrict(d)));
    if (!included) return false;
  }

  return true;
}

function formatApt(apt) {
  const rooms = apt.rooms ?? '?';
  const size = apt.size ?? '?';
  const price = apt.price ?? '?';
  const district = (apt.district || 'Unbekannt').toString().slice(0, 60);
  const title = (apt.title || '').toString().slice(0, 80);
  const link = apt.link || '';
  return `- ${rooms} Zi · ${size} m² · ${price} € · ${district}${title ? `\n  ${title}` : ''}${link ? `\n  ${link}` : ''}`;
}

function runScrape({ sites, maxPages }) {
  const args = [];
  if (sites) args.push(`--sites ${sites}`);
  if (maxPages) args.push(`--max-pages ${maxPages}`);
  const cmd = `node ${SCRAPER} ${args.join(' ')}`.trim();
  execSync(cmd, { stdio: 'inherit', timeout: 120000 });
}

function main() {
  const argv = process.argv.slice(2);
  const opts = {
    scrape: argv.includes('--scrape'),
    profile: null,
    sites: null,
    maxPages: null,
    top: 10,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--profile') opts.profile = argv[++i];
    if (a === '--sites') opts.sites = argv[++i];
    if (a === '--max-pages') opts.maxPages = parseInt(argv[++i], 10);
    if (a === '--top') opts.top = parseInt(argv[++i], 10);
  }

  if (opts.scrape) {
    runScrape({ sites: opts.sites, maxPages: opts.maxPages });
  }

  const criteria = readJson(CRITERIA_FILE, { profiles: {}, global: {} });
  const seen = readJson(SEEN_FILE, { lastRun: null, seenApartments: [], notifiedApartments: [] });
  const results = readJson(RESULTS_FILE, { apartments: [] });

  const apartments = Array.isArray(results.apartments) ? results.apartments : [];

  // compute hashes + new
  const seenSet = new Set(seen.seenApartments);
  const enriched = apartments.map(a => ({ ...a, hash: hashApartment(a) }));
  const newOnes = enriched.filter(a => !seenSet.has(a.hash));

  // update seen
  for (const a of newOnes) seen.seenApartments.push(a.hash);
  seen.lastRun = new Date().toISOString();
  writeJson(SEEN_FILE, seen);

  const profiles = criteria.profiles || {};
  const profileName = opts.profile || 'reham';
  const profile = profiles[profileName];

  let matches = [];
  if (profile && profile.enabled) {
    matches = newOnes.filter(a => matchesCriteria(a, profile.criteria || {}));
  }

  // sort: cheapest first, then bigger size
  matches.sort((a, b) => {
    const ap = a.price ?? 1e12;
    const bp = b.price ?? 1e12;
    if (ap !== bp) return ap - bp;
    const as = a.size ?? 0;
    const bs = b.size ?? 0;
    return bs - as;
  });

  const top = matches.slice(0, opts.top);

  const out = [];
  out.push(`🏠 Wohnungs-Scan — Profil: ${profile ? profile.name : profileName}`);
  out.push(`Gescannt: ${apartments.length} | Neu: ${newOnes.length} | Treffer: ${matches.length}`);
  if (!profile || !profile.enabled) {
    out.push(`⚠️ Profil '${profileName}' nicht gefunden/disabled. (filter-criteria.json)`);
  }
  if (top.length) {
    out.push('');
    out.push(`Top ${top.length}:`);
    out.push(...top.map(formatApt));
  } else {
    out.push('');
    out.push('Keine neuen Treffer für dieses Profil.');
  }

  process.stdout.write(out.join('\n') + '\n');
}

main();
