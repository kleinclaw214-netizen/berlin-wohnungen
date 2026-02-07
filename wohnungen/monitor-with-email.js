#!/usr/bin/env node
/*
  monitor-with-email.js
  Wrapper around wohnungen-monitor-v2.js that also sends email notifications for new matches.
  
  Usage: node monitor-with-email.js [same args as monitor]
  
  Requires email-config.json with smtp.password or SMTP_PASSWORD env.
  If password is missing, runs monitor normally (no email).
*/

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MONITOR = path.join(__dirname, 'wohnungen-monitor-v2.js');
const NOTIFY = path.join(__dirname, 'notify-new.js');
const CONFIG = path.join(__dirname, 'email-config.json');

function hasEmailConfig() {
  // Check env
  if (process.env.SMTP_PASSWORD) return true;
  
  // Check config file
  try {
    const data = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
    if (data.smtp && data.smtp.password && data.smtp.password.trim()) return true;
  } catch (err) {
    // no config
  }
  return false;
}

function main() {
  const args = process.argv.slice(2);
  
  // Run monitor first
  console.log('🚀 Running Wohnungs-Monitor...');
  try {
    execSync(`node ${MONITOR} ${args.map(a => `"${a}"`).join(' ')}`, { stdio: 'inherit', timeout: 420000 });
  } catch (err) {
    console.error('❌ Monitor failed:', err.message);
    process.exit(1);
  }
  
  // Check if we should send notifications
  if (!hasEmailConfig()) {
    console.log('📧 Email notifications disabled (no SMTP password set).');
    return;
  }
  
  console.log('📧 Checking for new matching apartments...');
  try {
    execSync(`node ${NOTIFY} --profile reham`, { stdio: 'inherit', timeout: 60000 });
  } catch (err) {
    // notify-new.js exits with code 1 if no new matches – that's fine
    if (err.status === 1) {
      console.log('✅ No new matching apartments – no email sent.');
    } else {
      console.error('⚠️ Notification check failed:', err.message);
    }
  }
}

if (require.main === module) {
  main();
}