#!/usr/bin/env node
/*
  send-email.js - Send email notifications via SMTP (Gmail App Password)
  
  Usage: node send-email.js --to recipient@example.com --subject "Test" --body "Hello"
  
  Requires environment variables:
    SMTP_USER     = Gmail address (e.g., kleinclaw214@gmail.com)
    SMTP_PASSWORD = App password (16‑character)
*/

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Load apartments from results file if --apartments flag is given
function loadApartments() {
  const resultsPath = path.join(__dirname, '../../.openclaw/wohnungen-results-v2.json');
  try {
    const data = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    return Array.isArray(data.apartments) ? data.apartments : [];
  } catch (err) {
    console.error('⚠️ Could not load apartments:', err.message);
    return [];
  }
}

function formatApartments(apts, limit = 10) {
  if (!apts.length) return 'Keine passenden Wohnungen gefunden.';
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

async function main() {
  const argv = process.argv.slice(2);
  const toIdx = argv.indexOf('--to');
  const subjectIdx = argv.indexOf('--subject');
  const bodyIdx = argv.indexOf('--body');
  const apartmentsFlagIdx = argv.indexOf('--apartments');
  
  const to = toIdx !== -1 ? argv[toIdx + 1] : process.env.SMTP_TO;
  const subject = subjectIdx !== -1 ? argv[subjectIdx + 1] : 'Wohnungs‑Monitor Benachrichtigung';
  let body = bodyIdx !== -1 ? argv[bodyIdx + 1] : '';
  
  if (apartmentsFlagIdx !== -1) {
    const apts = loadApartments();
    body = formatApartments(apts);
  }
  
  if (!to) {
    console.error('❌ No recipient specified. Use --to or set SMTP_TO env.');
    process.exit(1);
  }
  
  const user = process.env.SMTP_USER || 'kleinclaw214@gmail.com';
  const pass = process.env.SMTP_PASSWORD;
  if (!pass) {
    console.error('❌ SMTP_PASSWORD environment variable not set.');
    console.error('   Create an App Password in your Google Account:');
    console.error('   https://myaccount.google.com/apppasswords');
    process.exit(1);
  }
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // use TLS
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
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { formatApartments, loadApartments };