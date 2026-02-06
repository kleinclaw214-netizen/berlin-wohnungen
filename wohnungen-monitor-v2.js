const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function safeNum(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function truncate(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function fmtMoneyEUR(x) {
  if (x == null || !Number.isFinite(Number(x))) return '?';
  return `${Math.round(Number(x))} €`;
}

function fmtFloat(x) {
  if (x == null || !Number.isFinite(Number(x))) return '?';
  return String(Number(x));
}

function nowDE() {
  // human-friendly timestamp; always Berlin time
  return new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
}

const DEFAULT_GOOD_SITES = [
  'inberlinwohnen',
  'degewo',
  'gewobag',
  'gesobau',
  'stadtundland',
  'wbm',
  'berlinovo',
  'deutschewohnen',
  'vonovia',
].join(',');

class WohnungenMonitorV2 {
  constructor(opts) {
    this.opts = opts;

    this.resultsFile = '/home/node/.openclaw/wohnungen-results-v2.json';
    this.seenFile = '/home/node/.openclaw/wohnungen-seen.json';
    this.criteriaFile = '/home/node/filter-criteria.json';
    this.scraperScript = '/home/node/openclaw/universal-scraper-v2.js';

    this.loadSeenData();
    this.loadCriteria();
  }

  loadSeenData() {
    try {
      const data = fs.readFileSync(this.seenFile, 'utf8');
      this.seenData = JSON.parse(data);
    } catch {
      this.seenData = { lastRun: null, seenApartments: [], notifiedApartments: [] };
    }

    if (!Array.isArray(this.seenData.seenApartments)) this.seenData.seenApartments = [];
    if (!Array.isArray(this.seenData.notifiedApartments)) this.seenData.notifiedApartments = [];
  }

  loadCriteria() {
    try {
      const data = fs.readFileSync(this.criteriaFile, 'utf8');
      this.criteria = JSON.parse(data);
    } catch {
      this.criteria = { profiles: {}, global: {} };
    }
  }

  saveSeenData() {
    try {
      fs.writeFileSync(this.seenFile, JSON.stringify(this.seenData, null, 2));
    } catch (e) {
      console.error('❌ Fehler beim Speichern der gesehenen Wohnungen:', e.message);
    }
  }

  createApartmentHash(apartment) {
    // BACKWARDS COMPATIBLE: keep the old hash so we don't re-notify everything.
    // Old logic was: link + price + size.
    const str = `${apartment.link || ''}-${apartment.price || 0}-${apartment.size || 0}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash |= 0; // 32-bit signed
    }
    return hash.toString(16);
  }

  findNewApartments(apartments) {
    const seen = new Set(this.seenData.seenApartments);
    const out = [];
    for (const apt of apartments) {
      const hash = this.createApartmentHash(apt);
      if (!seen.has(hash)) out.push({ ...apt, hash });
    }
    return out;
  }

  matchesCriteria(apartment, criteria) {
    const price = safeNum(apartment.price);
    const size = safeNum(apartment.size);
    const rooms = safeNum(apartment.rooms);

    if (criteria.maxPrice != null && price != null && price > criteria.maxPrice) return false;
    if (criteria.minPrice != null && price != null && price < criteria.minPrice) return false;

    if (criteria.minSize != null && size != null && size < criteria.minSize) return false;
    if (criteria.maxSize != null && size != null && size > criteria.maxSize) return false;

    if (criteria.minRooms != null && rooms != null && rooms < criteria.minRooms) return false;
    if (criteria.maxRooms != null && rooms != null && rooms > criteria.maxRooms) return false;

    const district = (apartment.district || '').toLowerCase();

    if (Array.isArray(criteria.excludeDistricts) && criteria.excludeDistricts.length > 0) {
      const excluded = criteria.excludeDistricts.some(d => district.includes(String(d).toLowerCase()));
      if (excluded) return false;
    }

    if (Array.isArray(criteria.includeDistricts) && criteria.includeDistricts.length > 0) {
      const included = criteria.includeDistricts.some(d => district.includes(String(d).toLowerCase()));
      if (!included) return false;
    }

    return true;
  }

  filterByProfile(apartments, profileName) {
    const profile = this.criteria.profiles?.[profileName];
    if (!profile || !profile.enabled) return [];
    return apartments.filter(a => this.matchesCriteria(a, profile.criteria || {}));
  }

  runScraper() {
    const sites = this.opts.sites || DEFAULT_GOOD_SITES;
    const args = [this.scraperScript, '--sites', sites];

    if (this.opts['max-pages']) {
      args.push('--max-pages', String(this.opts['max-pages']));
    }

    console.log('🚀 Starte Scraper…');
    console.log(`🔎 Sites: ${sites}`);

    const r = spawnSync('node', args, {
      cwd: path.dirname(this.scraperScript),
      encoding: 'utf8',
      timeout: 15 * 60 * 1000, // 15 minutes
      maxBuffer: 20 * 1024 * 1024,
    });

    if (r.error) {
      console.error('❌ Scraper-Fehler:', r.error.message);
      return false;
    }
    if (r.status !== 0) {
      console.error('❌ Scraper exit code:', r.status);
      if (r.stdout) console.error(r.stdout);
      if (r.stderr) console.error(r.stderr);
      return false;
    }

    if (r.stdout) console.log(r.stdout.trim());
    if (r.stderr) console.error(r.stderr.trim());

    console.log('✅ Scraper erfolgreich abgeschlossen');
    return true;
  }

  loadResults() {
    try {
      const data = fs.readFileSync(this.resultsFile, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('❌ Fehler beim Laden der Ergebnisse:', e.message);
      return { apartments: [], sites: [], total: 0 };
    }
  }

  formatApartmentLine(apt, idx) {
    const rooms = apt.rooms != null ? fmtFloat(apt.rooms) : '?';
    const size = apt.size != null ? fmtFloat(apt.size) : '?';
    const price = fmtMoneyEUR(apt.price);
    const district = truncate(apt.district || 'Unbekannt', 45);
    const title = truncate(apt.title || apt.source || 'Wohnung', 60);
    const link = apt.link || '';

    return `${idx + 1}. ${rooms} Zi | ${size} m² | ${price} — ${district}\n   ${title}\n   ${link}`;
  }

  formatApartmentForTelegram(apt, idx) {
    const rooms = apt.rooms != null ? fmtFloat(apt.rooms) : '?';
    const size = apt.size != null ? fmtFloat(apt.size) : '?';
    const price = fmtMoneyEUR(apt.price);
    const district = apt.district ? `📍 Bezirk: ${apt.district}` : '';
    const address = apt.address ? `🏠 Adresse: ${truncate(apt.address, 50)}` : '';
    const title = apt.title ? `📝 ${truncate(apt.title, 70)}` : '';
    const link = apt.link ? `🔗 ${apt.link}` : '';
    const separator = '─'.repeat(28);

    let lines = [];
    lines.push(`🏠 **Neue Wohnung** (#${idx + 1})`);
    lines.push(`📐 ${rooms} Zi | ${size} m² | ${price}`);
    if (district) lines.push(district);
    if (address) lines.push(address);
    if (title) lines.push(title);
    if (link) lines.push(link);
    lines.push(separator);
    return lines.join('\n');
  }

  sendEmail(subject, body, toEmail) {
    if (!toEmail) return false;

    console.log(`📧 Sende Email an ${toEmail}…`);
    const tempFile = '/home/node/.openclaw/tmp/email_notification.txt';
    try {
      fs.mkdirSync(path.dirname(tempFile), { recursive: true });
      fs.writeFileSync(tempFile, body);
    } catch (e) {
      console.error('❌ Email: Konnte Temp-Datei nicht schreiben:', e.message);
      return false;
    }

    // Try to find gog binary
    const gogPaths = [
      '/usr/local/bin/gog',
      '/home/node/.local/bin/gog',
      '/home/node/.npm-global/bin/gog',
      '/usr/bin/gog',
      '/home/node/bin/gog',
    ];
    let gogPath = null;
    for (const p of gogPaths) {
      if (fs.existsSync(p)) {
        gogPath = p;
        break;
      }
    }
    if (!gogPath) {
      console.warn('⚠️  gog (gogcli) nicht gefunden. Email wird übersprungen.');
      console.warn('   Install: https://github.com/steipete/gogcli/releases (linux_amd64 tar.gz → binary "gog")');
      return false;
    }

    const env = { ...process.env, GOG_KEYRING_PASSWORD: 'test123' };

    const fromAccount = this.criteria.global?.gmailAccount || 'kleinclaw214@gmail.com';

    const r = spawnSync(gogPath, [
      '--account',
      fromAccount,
      '--no-input',
      'gmail',
      'send',
      '--to',
      toEmail,
      '--subject',
      subject,
      '--body-file',
      tempFile,
    ], {
      env,
      encoding: 'utf8',
      timeout: 20000,
      maxBuffer: 5 * 1024 * 1024,
    });

    if (r.error) {
      console.error('❌ Email-Sendefehler:', r.error.message);
      return false;
    }
    if (r.status !== 0) {
      console.error('❌ Email-Sendefehler exit:', r.status);
      if (r.stderr) console.error(r.stderr);
      return false;
    }

    console.log('✅ Email erfolgreich gesendet');
    return true;
  }

  getGatewayToken() {
    try {
      const j = JSON.parse(fs.readFileSync('/home/node/.openclaw/openclaw.json', 'utf8'));
      return j?.gateway?.auth?.token || null;
    } catch {
      return null;
    }
  }

  sendTelegram(message) {
    const target = this.opts['telegram-target'] || this.criteria.global?.telegramTarget || '957563763';
    const enabled = this.criteria.global?.notificationTelegram !== false;
    if (!enabled) return false;

    const token = this.getGatewayToken();
    if (!token) {
      console.error('❌ Telegram: Kein Gateway-Token gefunden');
      return false;
    }

    // Send via gateway CLI (config file already contains token and gateway URL)
    const r = spawnSync(process.execPath, [
      '/app/openclaw.mjs',
      'message',
      'send',
      '--channel',
      'telegram',
      '--target',
      String(target),
      '--message',
      message,
    ], {
      encoding: 'utf8',
      timeout: 20000,
      maxBuffer: 5 * 1024 * 1024,
    });

    if (r.error) {
      console.error('❌ Telegram-Sendefehler:', r.error.message);
      return false;
    }
    if (r.status !== 0) {
      console.error('❌ Telegram-Sendefehler exit:', r.status);
      if (r.stderr) console.error(r.stderr);
      return false;
    }

    console.log('✅ Telegram gesendet');
    return true;
  }

  run() {
    console.log('🏠 ===== WOHNUNGEN-MONITOR v2 =====');
    console.log(`⏰ ${nowDE()}`);

    // 1) Scrape
    if (!this.runScraper()) {
      console.log('❌ Monitor abgebrochen (Scraper-Fehler)');
      return 1;
    }

    // 2) Results
    const results = this.loadResults();
    const apartments = Array.isArray(results.apartments) ? results.apartments : [];

    console.log(`📊 ${apartments.length} Wohnungen gescannt`);

    this.seenData.lastRun = new Date().toISOString();

    if (apartments.length === 0) {
      console.log('😔 Keine Wohnungen gefunden');
      this.saveSeenData();
      return 0;
    }

    // 3) New apartments
    const newApartments = this.findNewApartments(apartments);
    console.log(`🆕 ${newApartments.length} neue Wohnungen gefunden`);

    // 4) Profiles
    const rehamApartments = this.filterByProfile(newApartments, 'reham');
    const budgetApartments = this.filterByProfile(newApartments, 'budget');
    const familyApartments = this.filterByProfile(newApartments, 'family');

    console.log(`🎯 Reham-Profil: ${rehamApartments.length}`);
    console.log(`💰 Budget-Profil: ${budgetApartments.length}`);
    console.log(`👨‍👩‍👧‍👦 Familien-Profil: ${familyApartments.length}`);

    // 5) Notifications
    const toEmail = this.opts['email-to'] || this.criteria.global?.notificationEmail || null;

    const maxN = Number(this.criteria.global?.maxResultsPerNotification || 5);

    let emailSent = false;
    if (newApartments.length > 0) {
      const subject = rehamApartments.length > 0
        ? `🎯 ${rehamApartments.length} neue Treffer (Reham) — ${newApartments.length} neue Angebote gesamt`
        : `🏠 ${newApartments.length} neue Angebote (kein Reham-Treffer)`;

      let body = `Wohnungen-Monitor v2\n`;
      body += `Zeit: ${nowDE()}\n`;
      body += `Gesamt gescannt: ${apartments.length}\n`;
      body += `Neue Angebote: ${newApartments.length}\n`;
      body += `Reham-Treffer: ${rehamApartments.length}\n`;
      body += `Budget-Treffer: ${budgetApartments.length}\n`;
      body += `Familie-Treffer: ${familyApartments.length}\n\n`;

      const pick = (rehamApartments.length > 0 ? rehamApartments : newApartments)
        .slice(0, maxN);

      body += `Top ${pick.length}:\n\n`;
      pick.forEach((apt, idx) => {
        body += this.formatApartmentLine(apt, idx) + '\n\n';
      });

      body += `\nViele Grüße\nDein Wohnungs-Scout`;

      emailSent = this.sendEmail(subject, body, toEmail);

      if (emailSent) {
        const notifiedSet = new Set(this.seenData.notifiedApartments);
        for (const apt of pick) notifiedSet.add(apt.hash);
        this.seenData.notifiedApartments = Array.from(notifiedSet);
      }

      // Telegram summary (always when there are new)
      const tPick = pick;
      let tMsg = `🏠 **Wohnungs‑Monitor** (${nowDE()})\n`;
      tMsg += `🔍 ${newApartments.length} neue Wohnungen:\n\n`;
      tPick.forEach((apt, idx) => {
        tMsg += this.formatApartmentForTelegram(apt, idx) + '\n';
      });
      tMsg += `\n🔄 Nächster Scan: in 30 Minuten`;

      this.sendTelegram(tMsg.trim());

    } else {
      console.log('✅ Keine neuen Wohnungen seit letztem Scan');
    }

    // 6) Update seen hashes (cap growth)
    const seenSet = new Set(this.seenData.seenApartments);
    for (const apt of apartments) {
      seenSet.add(this.createApartmentHash(apt));
    }
    // cap to last ~20k
    const capped = Array.from(seenSet);
    this.seenData.seenApartments = capped.slice(Math.max(0, capped.length - 20000));

    this.saveSeenData();

    console.log(`✅ Run complete. Email sent: ${emailSent ? 'yes' : 'no'}`);
    return 0;
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  const mon = new WohnungenMonitorV2(args);
  const code = mon.run();
  process.exit(code);
}
