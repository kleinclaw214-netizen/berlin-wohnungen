#!/usr/bin/env node
/*
  Universal Scraper v2 (rebuild, config-driven)
  Writes: /home/node/.openclaw/wohnungen-results-v2.json
*/

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

let cheerio;
try { cheerio = require('cheerio'); } catch (e) {
  console.error('❌ Missing dependency: cheerio. Run: npm install cheerio');
  process.exit(1);
}

const RESULTS_FILE = '/home/node/.openclaw/wohnungen-results-v2.json';
const CONFIG_FILE = path.join(__dirname, 'sites-config.json');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function trim(v){ return v == null ? null : String(v).trim(); }
function floatDE(v){
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;

  // Handle German formats like "1.234,56" and plain decimals like "1047.68".
  let s = String(v).trim();

  // If value contains a comma, treat comma as decimal separator and dots as thousands separators.
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    // No comma: assume dot is decimal separator; only strip spaces.
    s = s.replace(/\s+/g, '');
  }

  const m = s.match(/[0-9]+(?:\.[0-9]+)?/);
  return m ? parseFloat(m[0]) : null;
}
function int(v){ const n = floatDE(v); return n == null ? null : parseInt(n, 10); }
function priceDE(v){ return floatDE(v); }

function absUrl(href, base){
  if (!href) return null;
  try { return new URL(href, base).href; } catch { return href; }
}

async function fetchUrl(url, { method='GET', headers={}, body=null, timeoutMs=25000 } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      method,
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      headers: {
        'User-Agent': headers['User-Agent'] || 'Mozilla/5.0',
        'Accept': headers['Accept'] || '*/*',
        ...headers,
      }
    }, (res) => {
      // handle redirects
      if ([301,302,303,307,308].includes(res.statusCode) && res.headers.location) {
        const next = new URL(res.headers.location, url).href;
        res.resume();
        return resolve(fetchUrl(next, { method: 'GET', headers, timeoutMs }));
      }

      let data='';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

function extractField($item, fieldCfg, baseUrl){
  const css = fieldCfg.css;
  if (!css) return null;
  const $el = $item.find(css).first();
  if (!$el.length) return null;
  let v;
  if (fieldCfg.attr) v = $el.attr(fieldCfg.attr);
  if (v == null) v = $el.text();
  v = String(v).trim();

  if (fieldCfg.regex) {
    const re = new RegExp(fieldCfg.regex);
    const m = v.match(re);
    if (!m) return null;
    v = m[fieldCfg.group || 1] || m[0];
  }

  if (fieldCfg.transform === 'trim') return trim(v);
  if (fieldCfg.transform === 'floatDE') return floatDE(v);
  if (fieldCfg.transform === 'int') return int(v);
  if (fieldCfg.transform === 'priceDE') return priceDE(v);
  if (fieldCfg.transform === 'abs') return absUrl(v, baseUrl);
  return trim(v);
}

async function scrapeCssSite(siteId, cfg){
  const apartments=[];
  const seen = new Set();

  const maxPages = cfg.maxPages || 1;
  for (let page=1; page<=maxPages; page++){
    let url = cfg.baseUrl;
    if (page > 1) {
      if (cfg.pagination) {
        url = cfg.baseUrl + cfg.pagination.replace('{page}', String(page)).replace('{pageIndex}', String((cfg.pageIndexStartsAt||0)+(page-1)));
      } else {
        url = cfg.baseUrl;
      }
    }

    process.stdout.write(`📄 ${cfg.name} - Seite ${page}: ${url}\n`);
    const { status, body } = await fetchUrl(url, { headers: cfg.headers || {} });

    if (cfg.stopOn404 && status === 404 && page > 1) {
      process.stdout.write(`   ℹ️  Seite ${page} nicht gefunden (404) – Ende der Pagination, stoppe.\n`);
      break;
    }
    if (status >= 400) {
      process.stdout.write(`   ❌ HTTP ${status} – stoppe.\n`);
      if (page === 1) break;
      break;
    }

    const $ = cheerio.load(body);
    const items = $(cfg.itemSelector || 'article');
    if (!items.length) {
      process.stdout.write(`   ℹ️  Keine Items gefunden, stoppe.\n`);
      break;
    }

    let newCount = 0;
    items.each((idx, el) => {
      const $item = $(el);
      const apt = { source: cfg.name, scraped: new Date().toISOString() };
      for (const [field, fc] of Object.entries(cfg.fields || {})) {
        apt[field] = extractField($item, fc, url);
      }
      if (apt.link) apt.link = absUrl(apt.link, url);

      const key = (apt.link && apt.link.trim()) ? apt.link.trim() : JSON.stringify([apt.title, apt.price, apt.size, apt.rooms, apt.address, apt.district]);
      if (seen.has(key)) return;
      seen.add(key);
      apartments.push(apt);
      newCount++;
    });

    if (newCount === 0) {
      process.stdout.write(`   ℹ️  Keine neuen Wohnungen (Loop), stoppe.\n`);
      break;
    }

    process.stdout.write(`   ✅ ${newCount} Wohnungen gefunden\n`);
    await sleep(cfg.delayMs || 1000);
  }

  return apartments;
}

async function scrapeOpenImmoForm(siteId, cfg){
  // Strategy: GET page 1, parse items, then POST form for page N using hidden inputs.
  const apartments=[];
  const seen=new Set();

  const start = await fetchUrl(cfg.baseUrl, { headers: cfg.headers || {} });
  if (start.status >= 400) throw new Error(`HTTP ${start.status}`);
  const $ = cheerio.load(start.body);
  const formId = cfg.formId || 'openimmo-search-form';
  const $form = $(`#${formId}`);
  if (!$form.length) throw new Error(`Form not found: #${formId}`);

  const inputs = [];
  $form.find('input').each((_, el) => {
    const name = $(el).attr('name');
    if (!name) return;
    const type = (($(el).attr('type')||'').toLowerCase());
    if (type && type !== 'hidden') return;
    const value = $(el).attr('value') || '';
    inputs.push([name, value]);
  });

  function parseHtml(html, page){
    const $$ = cheerio.load(html);
    const items = $$(cfg.itemSelector || 'article');
    let added = 0;
    items.each((idx, el) => {
      const $item = $$(el);
      const apt = { source: cfg.name, scraped: new Date().toISOString() };
      for (const [field, fc] of Object.entries(cfg.fields || {})) {
        apt[field] = extractField($item, fc, cfg.baseUrl);
      }
      if (apt.link) apt.link = absUrl(apt.link, cfg.baseUrl);
      const key = apt.link || JSON.stringify([apt.title, apt.price, apt.size, apt.rooms, apt.address, apt.district]);
      if (seen.has(key)) return;
      seen.add(key);
      apartments.push(apt);
      added++;
    });
    return { items: items.length, added };
  }

  process.stdout.write(`📄 ${cfg.name} - Seite 1: ${cfg.baseUrl}\n`);
  const p1 = parseHtml(start.body, 1);
  process.stdout.write(`   ✅ ${p1.added} Wohnungen gefunden\n`);

  const maxPages = cfg.maxPages || 20;
  for (let page=2; page<=maxPages; page++){
    const pairs = [];
    for (const [k,v] of inputs) {
      if (k === 'tx_openimmo_immobilie[page]' || k === 'tx_openimmo_immobilie[search]') continue;
      pairs.push([k,v]);
    }
    pairs.push(['tx_openimmo_immobilie[page]', String(page)]);
    pairs.push(['tx_openimmo_immobilie[search]', 'paginate']);

    const body = pairs.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    process.stdout.write(`📄 ${cfg.name} - Seite ${page}: ${cfg.baseUrl}\n`);
    const res = await fetchUrl(cfg.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Referer': cfg.baseUrl,
        ...(cfg.headers || {}),
      },
      body,
      timeoutMs: 30000,
    });

    if (res.status >= 400) {
      process.stdout.write(`   ℹ️  HTTP ${res.status} – stoppe.\n`);
      break;
    }

    const parsed = parseHtml(res.body, page);
    if (parsed.added === 0) {
      process.stdout.write(`   ℹ️  Keine Wohnungen / keine neuen – stoppe.\n`);
      break;
    }
    process.stdout.write(`   ✅ ${parsed.added} Wohnungen gefunden\n`);
    await sleep(cfg.delayMs || 1000);
  }

  return apartments;
}

async function scrapeHowogeProjectUrl(cfg, projectUrl) {
  const apartments = [];
  if (!projectUrl) return apartments;
  const url = absUrl(projectUrl, 'https://www.howoge.de');
  process.stdout.write(`   🔗 Projektseite: ${url}\n`);
  const res = await fetchUrl(url, { headers: cfg.headers || {}, timeoutMs: 30000 });
  if (res.status >= 400) return apartments;
  const $ = cheerio.load(res.body);
  
  $('a.flat-single').each((i, el) => {
    const $flat = $(el);
    const link = $flat.attr('href');
    const district = trim($flat.find('.district').text());
    const address = trim($flat.find('.address').text());
    let price = null, size = null, rooms = null;
    
    $flat.find('.attributes > div').each((j, attrDiv) => {
      const $div = $(attrDiv);
      const headline = trim($div.find('.attributes-headline').text());
      const content = trim($div.find('.attributes-content').text());
      if (headline.includes('Warmmiete') || headline.includes('Kaltmiete')) {
        price = priceDE(content);
      } else if (headline.includes('Wohnfläche')) {
        size = floatDE(content);
      } else if (headline.includes('Zimmer')) {
        rooms = int(content);
      }
    });
    
    apartments.push({
      source: cfg.name,
      title: `Wohnung in ${district || 'Berlin'}`,
      rooms,
      size,
      price,
      district,
      address,
      link: link ? absUrl(link, url) : null,
      scraped: new Date().toISOString(),
    });
  });
  
  process.stdout.write(`     📍 ${apartments.length} Einzelwohnungen extrahiert\n`);
  return apartments;
}

async function scrapeHowogeProjectPage(cfg, teaser) {
  return scrapeHowogeProjectUrl(cfg, teaser.link);
}

async function scrapeHowogeNeubauOverview(cfg) {
  const overviewUrl = 'https://www.howoge.de/immobiliensuche/neubauprojekte/';
  process.stdout.write(`   📋 Neubauprojekte-Übersicht: ${overviewUrl}\n`);
  const res = await fetchUrl(overviewUrl, { headers: cfg.headers || {}, timeoutMs: 30000 });
  if (res.status >= 400) return [];
  const $ = cheerio.load(res.body);
  const projectLinks = new Set();
  $('a[href^="/immobiliensuche/neubauprojekte/"][href$=".html"]').each((i, el) => {
    const href = $(el).attr('href');
    projectLinks.add(absUrl(href, 'https://www.howoge.de'));
  });
  return Array.from(projectLinks);
}

async function scrapeHowoge(cfg){
  const out=[];
  const limit = cfg.limit || 200;
  // page param is 1..N
  for (let page=1; page<= (cfg.maxPages||5); page++){
    const form = new URLSearchParams();
    form.set('tx_howrealestate_json_list[page]', String(page));
    form.set('tx_howrealestate_json_list[limit]', String(limit));
    // Note: HOWOGE expects params like the form on wohnungssuche.html.
    // IMPORTANT: do NOT send an empty kiez[] value (that can yield 0 results).
    form.set('tx_howrealestate_json_list[lang]', '');
    form.set('tx_howrealestate_json_list[rooms]', '');
    form.set('tx_howrealestate_json_list[wbs]', '');

    process.stdout.write(`📄 ${cfg.name} - API Seite ${page}: ${cfg.baseUrl}\n`);
    const res = await fetchUrl(cfg.baseUrl, {
      method:'POST',
      headers:{
        'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept':'application/json, text/plain, */*',
        ...(cfg.headers||{})
      },
      body: form.toString(),
      timeoutMs: 30000,
    });
    if (res.status >= 400) break;

    let data;
    try { data = JSON.parse(res.body); } catch { break; }
    const items = Array.isArray(data.immoobjects) ? data.immoobjects : [];

    // If HOWOGE has no current immoobjects, it may still provide Neubauprojekte teasers.
    const teasers = Array.isArray(data.projectteaser) ? data.projectteaser : [];

    if (!items.length && !teasers.length) break;

    for (const it of items) {
      out.push({
        source: cfg.name,
        title: trim(it.title),
        rooms: int(it.rooms),
        size: floatDE(it.area),
        price: priceDE(it.rent || it.price),
        district: trim(it.district || it.kiez || it.citydistrict),
        address: trim(it.street),
        link: it.url ? absUrl(it.url, 'https://www.howoge.de') : null,
        scraped: new Date().toISOString(),
      });
    }

    let projectApartmentsCount = 0;
    for (const t of teasers) {
      await sleep(cfg.delayMs || 1200);
      const projectApartments = await scrapeHowogeProjectPage(cfg, t);
      if (projectApartments.length > 0) {
        out.push(...projectApartments);
        projectApartmentsCount += projectApartments.length;
      } else {
        // fallback: add teaser as placeholder
        const addr = trim(t.address);
        let district = null;
        if (addr) {
          const m = addr.match(/\b\d{5}\s+Berlin\s*(.+)?$/i);
          district = m && m[1] ? trim(m[1]) : null;
        }
        out.push({
          source: cfg.name,
          title: trim(t.title) || 'HOWOGE Neubauprojekt',
          rooms: null,
          size: null,
          price: null,
          district,
          address: addr,
          link: t.link ? absUrl(t.link, 'https://www.howoge.de') : null,
          scraped: new Date().toISOString(),
        });
      }
    }

    // Fallback: If the API provides no immoobjects AND no projectteaser,
    // scrape Neubauprojekte overview (best-effort).
    if (!items.length && !teasers.length) {
      const maxProjects = cfg.maxProjects || 20;
      const overviewLinks = await scrapeHowogeNeubauOverview(cfg);
      let scrapedProjects = 0;
      for (const link of overviewLinks) {
        if (scrapedProjects >= maxProjects) break;
        await sleep(cfg.delayMs || 1200);
        const projectApartments = await scrapeHowogeProjectUrl(cfg, link);
        if (projectApartments.length > 0) {
          out.push(...projectApartments);
          projectApartmentsCount += projectApartments.length;
        }
        scrapedProjects++;
      }
    }

    process.stdout.write(`   ✅ ${items.length} Wohnungen` + (projectApartmentsCount ? ` (+${projectApartmentsCount} aus Neubauprojekten)` : '') + `\n`);
    await sleep(cfg.delayMs || 1200);
  }
  return out;
}

async function scrapeApi(cfg){
  process.stdout.write(`📄 ${cfg.name} - API: ${cfg.baseUrl}\n`);

  let method = cfg.method || (cfg.body ? 'POST' : 'GET');
  const headers = { ...(cfg.headers || {}) };
  let body = null;

  if (cfg.body) {
    body = JSON.stringify(cfg.body);
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    headers['Accept'] = headers['Accept'] || 'application/json';
  }

  const res = await fetchUrl(cfg.baseUrl, { method, headers, timeoutMs: 30000, body });
  if (res.status >= 400) return [];

  let data;
  try { data = JSON.parse(res.body); } catch { return []; }

  // Stadt & Land CloudFront: { count, data: [ ... ] }
  // Pagination is via POST body param "offset" (NOT "page"), max page size appears to be 10.
  if ((cfg.id === 'stadtundland' || /stadt\s*&\s*land/i.test(cfg.name))) {
    const pageSize = 10;
    const all = [];

    // If this first response already contains data, use it; otherwise we still try offset paging.
    const first = Array.isArray(data?.data) ? data.data : [];
    const total = typeof data?.count === 'number' ? data.count : null;

    const pushWohnungen = (arr) => {
      for (const it of arr) {
        if (String(it?.details?.immoType || '').toLowerCase() !== 'wohnung') continue;
        all.push({
          source: cfg.name,
          title: trim(it.headline),
          rooms: floatDE(it.details?.rooms),
          size: floatDE(it.details?.livingSpace),
          price: priceDE(it.costs?.coldRent || it.costs?.rent || it.costs?.totalRent),
          district: trim(it.address?.precinct),
          address: trim([it.address?.street, it.address?.house_number].filter(Boolean).join(' ')),
          link: it.details?.immoNumber ? `https://www.stadtundland.de/immobilien/expose/${encodeURIComponent(it.details.immoNumber)}/` : null,
          scraped: new Date().toISOString(),
        });
      }
    };

    if (first.length) pushWohnungen(first);

    // Walk offsets to collect all results.
    // NOTE: server ignores size>10, so we keep it at 10.
    let offset = pageSize;
    const maxOffset = total != null ? total : 200; // safety

    while (offset < maxOffset) {
      const bodyObj = { ...(cfg.body || {}), offset, size: pageSize };
      const resN = await fetchUrl(cfg.baseUrl, {
        method: cfg.method || 'POST',
        headers: {
          ...headers,
          'Content-Type': headers['Content-Type'] || 'application/json',
          'Accept': headers['Accept'] || 'application/json',
        },
        timeoutMs: 30000,
        body: JSON.stringify(bodyObj),
      });

      if (resN.status >= 400) break;
      let j;
      try { j = JSON.parse(resN.body); } catch { break; }
      const arr = Array.isArray(j?.data) ? j.data : [];
      if (!arr.length) break;
      pushWohnungen(arr);
      offset += pageSize;
      await sleep(cfg.delayMs || 500);
    }

    return all;
  }

  // Gesobau returns an ARRAY of items with `raw` fields.
  if (cfg.id === 'gesobau' && Array.isArray(data)) {
    return data.map((it) => {
      const r = it.raw || {};
      const region = Array.isArray(r.region_stringM) ? r.region_stringM[0] : r.region_stringM;
      const link = r.url ? absUrl(r.url, 'https://www.gesobau.de') : (it.detail ? absUrl(it.detail, 'https://www.gesobau.de') : null);
      return {
        source: cfg.name,
        title: trim(it.title || r.title),
        rooms: floatDE(r.zimmer_intS),
        size: floatDE(r.wohnflaeche_floatS),
        price: priceDE(r.warmmiete_floatS),
        district: trim(region),
        address: trim(r.adresse_stringS),
        link,
        scraped: new Date().toISOString(),
      };
    });
  }

  const list = data.results || data.immoobjects || data.items || data.data || [];
  if (!Array.isArray(list)) return [];

  return list.map((it) => ({
    source: cfg.name,
    title: trim(it.title || it.objektbezeichnung || it.name || it.headline),
    rooms: floatDE(it.rooms || it.zimmer || it.roomsCount),
    size: floatDE(it.area || it.flaeche || it.livingSpace),
    price: priceDE(it.rent || it.price || it.kaltmiete || it.totalRent),
    district: trim(it.district || it.stadtteil || it.ort || it.citydistrict),
    address: trim(it.address || it.strasse || it.street),
    link: it.url || it.link || null,
    scraped: new Date().toISOString(),
  }));
}

async function scrapeApiOffset(cfg){
  const out=[];
  const limit = cfg.limit || 15;
  for (let offset=0, page=1; page<=50; page++, offset += limit) {
    const url = offset ? `${cfg.baseUrl}&offset=${offset}` : cfg.baseUrl;
    process.stdout.write(`📄 ${cfg.name} - API Seite ${page}: ${url}\n`);
    const res = await fetchUrl(url, { headers: cfg.headers||{}, timeoutMs: 30000 });
    if (res.status >= 400) break;
    let data;
    try { data = JSON.parse(res.body); } catch { break; }

    // Expected: { immoobjects: [...] } or { list: [...] }
    const list = data.immoobjects || data.list || data.results || [];
    if (!Array.isArray(list) || list.length === 0) break;

    for (const it of list) {
      // Support multiple known schemas
      const isDeuwoSchema = it && (it.titel || it.wrk_id) && (it.preis != null || it.groesse != null);

      const title = isDeuwoSchema ? trim(it.titel) : trim(it.title);
      const rooms = isDeuwoSchema ? floatDE(it.anzahl_zimmer) : floatDE(it.rooms);
      const size  = isDeuwoSchema ? floatDE(it.groesse) : floatDE(it.area || it.size);
      const price = isDeuwoSchema ? priceDE(it.preis) : priceDE(it.rent || it.price);

      const address = isDeuwoSchema
        ? trim([it.strasse, [it.plz, it.ort].filter(Boolean).join(' ')].filter(Boolean).join(', '))
        : trim(it.street || it.address);

      const district = isDeuwoSchema ? trim(it.ort) : trim(it.district || it.cityDistrict || it.citydistrict);

      const link = (() => {
        if (it.exposeUrl || it.url || it.link) return it.exposeUrl || it.url || it.link;
        if (isDeuwoSchema && it.slug) {
          // Both Deutsche Wohnen + Vonovia expose the same slug scheme.
          const base = (cfg.baseUrl||'').includes('vonovia.de') ? 'https://www.vonovia.de/immobilien' : 'https://www.deutsche-wohnen.com/expose';
          return `${base}/${encodeURIComponent(it.slug)}`;
        }
        return null;
      })();

      out.push({
        source: cfg.name,
        title,
        rooms,
        size,
        price,
        district,
        address,
        link,
        scraped: new Date().toISOString(),
      });
    }

    process.stdout.write(`   ✅ ${list.length} Wohnungen\n`);
    await sleep(cfg.delayMs || 800);
  }
  return out;
}

function parseInberlinAria(label){
  // Example: "Wohnungsangebot - 2,0 Zimmer, 54,00 m², 675,00 € Kaltmiete | Flämingstraße 70, 12689 Marzahn-Hellersdorf"
  if (!label || !label.includes('Wohnungsangebot')) return null;
  const parts = label.split('|').map(s => s.trim());
  if (parts.length < 2) return null;
  const specs = parts[0].replace('Wohnungsangebot -', '').trim();
  const addrPart = parts[1];

  const rooms = floatDE((specs.match(/([0-9]+[.,]?[0-9]*)\s*Zimmer/)||[])[1]);
  const size = floatDE((specs.match(/([0-9]+[.,]?[0-9]*)\s*m²/)||[])[1]);
  const price = priceDE((specs.match(/([0-9]+[.,]?[0-9]*)\s*€/)||[])[1]);

  // addressPart: "Street, 12345 District"
  const addrParts = addrPart.split(',').map(s=>s.trim());
  const street = addrParts[0] || null;
  const zipDist = addrParts[1] || '';
  const m = zipDist.match(/(\d{5})\s+(.+)/);
  const district = m ? m[2] : zipDist;

  return { rooms, size, price, address: street, district: trim(district) };
}

async function scrapeInberlin(cfg){
  const out=[];
  const maxPages = cfg.maxPages || 1;
  for (let page=1; page<=maxPages; page++){
    const url = page===1 ? cfg.baseUrl : `${cfg.baseUrl}?page=${page}`;
    process.stdout.write(`🏢 ${cfg.name} - Seite ${page}: ${url}\n`);
    const res = await fetchUrl(url, { headers: cfg.headers || {} });
    if (res.status >= 400) break;

    const $ = cheerio.load(res.body);
    let added=0;
    $('[aria-label*="Wohnungsangebot"]').each((i, el) => {
      const label = $(el).attr('aria-label');
      const parsed = parseInberlinAria(label);
      if (!parsed) return;
      const parent = $(el).closest('div, article, section, li');
      const a = parent.find('a[href]').first();
      const link = a.length ? absUrl(a.attr('href'), cfg.baseUrl) : null;
      out.push({ source: cfg.name, title: `Wohnung in ${parsed.district||''}`.trim(), rooms: parsed.rooms, size: parsed.size, price: parsed.price, district: parsed.district, address: parsed.address, link, scraped: new Date().toISOString() });
      added++;
    });

    if (added === 0) {
      process.stdout.write('   ℹ️  Keine Wohnungen gefunden\n');
      break;
    }
    process.stdout.write(`   ✅ ${added} Wohnungen gefunden\n`);
    await sleep(cfg.delayMs || 1500);
  }
  return out;
}

async function scrapeBerlinovo(cfg){
  const out=[];
  const maxPages = cfg.maxPages || 1;
  const links=[];

  for (let page=0; page<maxPages; page++){
    const url = page===0 ? cfg.baseUrl : `${cfg.baseUrl}?page=${page}`;
    process.stdout.write(`📄 ${cfg.name} - Seite ${page+1}: ${url}\n`);
    const res = await fetchUrl(url, { headers: cfg.headers || {} });
    if (res.status >= 400) break;

    const $ = cheerio.load(res.body);
    const items = $('article.node--type-apartment .field--name-title a[href]');
    if (!items.length) break;

    items.each((i, el) => {
      const href = $(el).attr('href');
      const link = absUrl(href, 'https://www.berlinovo.de');
      const title = trim($(el).text());
      if (link && !links.find(x => x.link === link)) links.push({ link, title });
    });

    await sleep(cfg.delayMs || 1000);
  }

  for (const it of links) {
    // Detail pages live under /de/..., while list links are often /wohnungen/... which redirects.
    // follow via fetchUrl using https://www.berlinovo.de and accept meta refresh/redirect handled by fetchUrl.
    const res = await fetchUrl(it.link, { headers: cfg.headers || {}, timeoutMs: 30000 });
    if (res.status >= 400) continue;
    const $ = cheerio.load(res.body);

    const title = trim($('h1').first().text()) || it.title;
    const addrLine = trim($('.field--name-field-location .address-line1').first().text());
    const postal = trim($('.field--name-field-location .postal-code').first().text());
    const locality = trim($('.field--name-field-location .locality').first().text());
    const address = trim([addrLine, [postal, locality].filter(Boolean).join(' ')].filter(Boolean).join(', '));

    const district = locality || null;

    const rooms = floatDE($('.field--name-field-rooms .field__item').first().text());
    const size = floatDE($('.field--name-field-net-area .field__item').first().text());
    const price = priceDE($('.field--name-field-total-rent .field__item').first().text() || $('.field--name-field-total-rent .field__item').first().attr('content'));

    out.push({
      source: cfg.name,
      title,
      rooms,
      size,
      price,
      district,
      address,
      link: it.link,
      scraped: new Date().toISOString(),
    });

    await sleep(cfg.delayMs || 1000);
  }

  return out;
}

function loadConfig(){
  return JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8'));
}

async function main(){
  const argv = process.argv.slice(2);
  const sitesArg = (() => {
    const i = argv.indexOf('--sites');
    if (i !== -1) return argv[i+1];
    return null;
  })();
  const maxPagesArg = (() => {
    const i = argv.indexOf('--max-pages');
    if (i !== -1) return parseInt(argv[i+1], 10);
    return null;
  })();

  const config = loadConfig();
  let active = Object.entries(config)
    .filter(([_, c]) => c.enabled)
    .map(([id, c]) => ({ id, ...c }));

  if (sitesArg) {
    const allow = new Set(sitesArg.split(',').map(s => s.trim()).filter(Boolean));
    active = active.filter(s => allow.has(s.id));
  }

  if (maxPagesArg != null) {
    for (const s of active) s.maxPages = maxPagesArg;
  }

  active.sort((a,b) => (a.priority||999) - (b.priority||999));

  console.log('🚀 Universal Scraper v2 gestartet');
  console.log(`🔍 ${active.length} aktive Seiten gefunden`);

  const all = [];
  const sites = [];

  const start = Date.now();
  for (const s of active) {
    console.log(`\n=== ${s.name} ===`);
    let apts=[];
    try {
      if (s.type === 'css') apts = await scrapeCssSite(s.id, s);
      else if (s.type === 'openimmo-form') apts = await scrapeOpenImmoForm(s.id, s);
      else if (s.type === 'howoge') apts = await scrapeHowoge(s);
      else if (s.type === 'api') apts = await scrapeApi(s);
      else if (s.type === 'api-offset') apts = await scrapeApiOffset(s);
      else if (s.type === 'inberlin') apts = await scrapeInberlin(s);
      else if (s.type === 'berlinovo') apts = await scrapeBerlinovo(s);
      else apts = [];

      sites.push({ id: s.id, name: s.name, count: apts.length, success: true });
      all.push(...apts);
      console.log(`✅ ${s.name}: ${apts.length} Wohnungen`);

    } catch (e) {
      sites.push({ id: s.id, name: s.name, count: 0, success: false, error: String(e.message || e) });
      console.log(`❌ ${s.name}: Fehler: ${e.message || e}`);
    }
  }

  // de-duplicate by link
  const seen = new Set();
  const uniq=[];
  for (const a of all) {
    const key = (a.link && String(a.link).trim()) ? String(a.link).trim() : JSON.stringify([a.source,a.title,a.price,a.size,a.rooms,a.address,a.district]);
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(a);
  }

  const payload = {
    timestamp: new Date().toISOString(),
    sites,
    total: uniq.length,
    stats: { startTime: start, durationMs: Date.now()-start },
    apartments: uniq,
  };

  fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true });
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(payload, null, 2));

  console.log('\n🎉 Scraping abgeschlossen!');
  console.log(`📊 Gesamt: ${uniq.length} Wohnungen`);
  console.log(`⏱️  Dauer: ${Math.round((Date.now()-start)/1000)}s`);
  console.log(`📁 Ergebnisse: ${RESULTS_FILE}`);
}

main().catch(err => {
  console.error('💥 Fatal:', err);
  process.exit(1);
});
