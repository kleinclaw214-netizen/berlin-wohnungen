#!/usr/bin/env node
/*
  notify-new.js - Check for new apartments matching a profile and send email notification.
  
  Usage: node notify-new.js --profile reham [--email-to recipient@example.com]
  
  Environment:
    SMTP_USER, SMTP_PASSWORD, SMTP_TO (optional)
*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RESULTS_FILE = path.join(__dirname, '../../.openclaw/wohnungen-results-v2.json');
const SEEN_FILE = path.join(__dirname, '../../.openclaw/wohnungen-seen.json');
const CRITERIA_FILE = path.join(__dirname, 'filter-criteria.json');

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}

function hashKey(apt) {
  const key = (apt.link && String(apt.link).trim()) ? String(apt.link).trim() 
    : `${apt.source||''}|${apt.title||''}|${apt.price||''}|${apt.size||''}|${apt.rooms||''}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) { h = ((h << 5) - h) + key.charCodeAt(i); h |= 0; }
  return h.toString(16);
}

function matches(apt, c) {
  const price = typeof apt.price === 'number' ? apt.price : null;
  const size = typeof apt.size === 'number' ? apt.size : null;
  const rooms = typeof apt.rooms === 'number' ? apt.rooms : null;

  if (c.maxPrice != null && price != null && price > c.maxPrice) return false;
  if (c.minPrice != null && price != null && price < c.minPrice) return false;
  if (c.minSize != null && size != null && size < c.minSize) return false;
  if (c.maxSize != null && size != null && size > c.maxSize) return false;
  if (c.minRooms != null && rooms != null && rooms < c.minRooms) return false;
  if (c.maxRooms != null && rooms != null && rooms > c.maxRooms) return false;

  const district = (apt.district || '').toString().toLowerCase();
  if (Array.isArray(c.excludeDistricts) && 
      c.excludeDistricts.some(d => district.includes(String(d).toLowerCase()))) return false;
  if (Array.isArray(c.includeDistricts) && c.includeDistricts.length) {
    if (!c.includeDistricts.some(d => district.includes(String(d).toLowerCase()))) return false;
  }
  return true;
}

function formatForEmail(apts, limit = 10) {
  if (!apts.length) return 'Keine neuen passenden Wohnungen.';
  return apts.slice(0, limit).map(apt => {
    const rooms = apt.rooms ?? '?';
    const size = apt.size ?? '?';
    const price = apt.price ?? '?';
    const district = apt.district || 'Unbekannt';
    const title = apt.title || '';
    const link = apt.link || '';
    return `• ${rooms} Zi · ${size} m² · ${price} € · ${district}\n  ${title}\n  ${link}`;
  }).join('\n\n');
}

async function sendEmail(to, subject, body) {
  const nodemailer = require('nodemailer');
  // Try to load config file
  const configPath = path.join(__dirname, 'email-config.json');
  let config = { smtp: {} };
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    // fallback to env
  }
  
  const user = config.smtp.user || process.env.SMTP_USER || 'kleinclaw214@gmail.com';
  const pass = config.smtp.password || process.env.SMTP_PASSWORD;
  if (!pass) {
    console.error('❌ SMTP password not set. Set in email-config.json or SMTP_PASSWORD env.');
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  const mailOptions = {
    from: `"Wohnungs‑Monitor" <${user}>`,
    to,
    subject,
    text: body,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    return false;
  }
}

function main() {
  const argv = process.argv.slice(2);
  const profileIdx = argv.indexOf('--profile');
  const profile = profileIdx !== -1 ? argv[profileIdx + 1] : 'reham';
  const emailToIdx = argv.indexOf('--email-to');
  const emailTo = emailToIdx !== -1 ? argv[emailToIdx + 1] : (process.env.SMTP_TO || null);
  const dryRun = argv.includes('--dry-run');

  const criteria = readJson(CRITERIA_FILE, { profiles: {} });
  const c = criteria.profiles?.[profile] || criteria.profiles?.reham || {};
  const profileName = c.name || profile;

  const seen = readJson(SEEN_FILE, { seenApartments: [] });
  const res = readJson(RESULTS_FILE, { apartments: [] });
  const apartments = Array.isArray(res.apartments) ? res.apartments : [];
  const enriched = apartments.map(a => ({ ...a, hash: hashKey(a) }));
  const seenSet = new Set(seen.seenApartments || []);
  const newOnes = enriched.filter(a => !seenSet.has(a.hash));
  const hits = enriched.filter(a => matches(a, c));
  const newHits = hits.filter(a => !seenSet.has(a.hash));

  console.log(`🔍 Profil: ${profileName}`);
  console.log(`   Gescannt: ${apartments.length}`);
  console.log(`   Neue Wohnungen insgesamt: ${newOnes.length}`);
  console.log(`   Treffer für Profil: ${hits.length}`);
  console.log(`   Neue Treffer: ${newHits.length}`);

  if (newHits.length === 0) {
    console.log('✅ Keine neuen Treffer – keine Benachrichtigung nötig.');
    return;
  }

  const subject = `🏠 Neue Wohnungen für ${profileName} (${newHits.length})`;
  const body = `Es wurden ${newHits.length} neue Wohnungen gefunden, die deinen Kriterien entsprechen:\n\n${formatForEmail(newHits, 10)}\n\n---\nGesendet vom Wohnungs‑Monitor`;
  
  console.log('\n' + body);

  if (dryRun) {
    console.log('⚠️ Dry‑run – Email würde gesendet werden.');
    return;
  }

  if (!emailTo) {
    console.error('❌ No email recipient specified (use --email-to or SMTP_TO).');
    return;
  }

  if (!process.env.SMTP_PASSWORD) {
    console.error('❌ SMTP_PASSWORD environment variable not set.');
    console.error('   Set it or run with --dry-run to see what would be sent.');
    return;
  }

  sendEmail(emailTo, subject, body).then(success => {
    if (success) {
      console.log('📫 Benachrichtigung verschickt.');
    } else {
      process.exit(1);
    }
  });
}

if (require.main === module) {
  main();
}