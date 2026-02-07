#!/usr/bin/env node
/*
  wohnungen-post-to-channel.js
  Fully-scripted pipeline to post new filtered apartments to Telegram channel without LLM formatting.
  
  Steps:
  1. Run wohnungen-alert-run.js (or universal-scraper + filter)
  2. Read channel-target.json for chat id
  3. Read /home/node/.openclaw/wohnungen-alert-payload.json
  4. Send each newHit as individual Telegram message (2 lines format)
  5. No headings, no 'Reham'
  
  Usage: node wohnungen-post-to-channel.js [--profile reham] [--sites degewo] [--max-pages 3]
*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ALERT_RUN_SCRIPT = path.join(__dirname, 'wohnungen-alert-run.js');
const CHANNEL_TARGET_FILE = path.join(__dirname, 'channel-target.json');
const PAYLOAD_FILE = '/home/node/.openclaw/wohnungen-alert-payload.json';
const OPENCLAW_CONFIG = '/home/node/.openclaw/openclaw.json';

// Read OpenClaw config to get Telegram bot token
function getTelegramToken() {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, 'utf8'));
    return config.channels?.telegram?.botToken;
  } catch (error) {
    console.error('Error reading OpenClaw config:', error.message);
    return null;
  }
}

// Read channel target
function getChannelTarget() {
  try {
    const data = JSON.parse(fs.readFileSync(CHANNEL_TARGET_FILE, 'utf8'));
    return data.telegramChannelId;
  } catch (error) {
    console.error('Error reading channel-target.json:', error.message);
    return null;
  }
}

// Read alert payload
function readAlertPayload() {
  try {
    return JSON.parse(fs.readFileSync(PAYLOAD_FILE, 'utf8'));
  } catch (error) {
    console.error('Error reading alert payload:', error.message);
    return { newHits: [], newHitCount: 0 };
  }
}

// Format apartment for Telegram message
function formatApartment(apt) {
  const rooms = apt.rooms !== undefined && apt.rooms !== null ? apt.rooms : '?';
  const size = apt.size !== undefined && apt.size !== null ? apt.size : '?';
  const price = apt.price !== undefined && apt.price !== null ? apt.price : '?';
  const district = apt.district || apt.location || 'Berlin';
  
  // First line: <rooms> Zi · <size> m² · <price> € · <district>
  const firstLine = `${rooms} Zi · ${size} m² · ${price} € · ${district}`;
  
  // Second line: <link>
  const secondLine = apt.link || '';
  
  return `${firstLine}\n${secondLine}`;
}

// Send message via Telegram Bot API
function sendTelegramMessage(channelId, message, token) {
  if (!token) {
    console.error('No Telegram token available');
    return false;
  }
  
  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const data = {
      chat_id: channelId,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: false
    };
    
    const curlCmd = `curl -s -X POST "${url}" \
      -H "Content-Type: application/json" \
      -d '${JSON.stringify(data)}'`;
    
    console.log(`Sending message to channel ${channelId}`);
    const result = execSync(curlCmd, { stdio: 'pipe', timeout: 30000 }).toString();
    
    try {
      const parsed = JSON.parse(result);
      if (parsed.ok === true) {
        return true;
      } else {
        console.error('Telegram API error:', result);
        return false;
      }
    } catch (parseError) {
      console.error('Failed to parse Telegram response:', result);
      return false;
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error.message);
    return false;
  }
}

// Main function
async function main() {
  const argv = process.argv.slice(2);
  
  // Build arguments for alert-run script
  const args = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--profile' || argv[i] === '--sites' || argv[i] === '--max-pages') {
      args.push(argv[i], argv[i + 1]);
      i++;
    }
  }
  
  // Default to reham profile if not specified
  if (!argv.includes('--profile')) {
    args.push('--profile', 'reham');
  }
  
  console.log('Running apartment alert pipeline...');
  console.log(`Command: node ${ALERT_RUN_SCRIPT} ${args.join(' ')}`);
  
  // Step 1: Run alert-run script
  try {
    execSync(`node ${ALERT_RUN_SCRIPT} ${args.join(' ')}`.trim(), { 
      stdio: 'inherit', 
      timeout: 420000,
      cwd: __dirname 
    });
  } catch (error) {
    console.error('Error running alert-run script:', error.message);
    process.exit(1);
  }
  
  // Step 2: Read payload
  const payload = readAlertPayload();
  console.log(`Found ${payload.newHitCount} new hits`);
  
  if (payload.newHitCount === 0) {
    console.log('No new hits to post. Exiting.');
    process.exit(0);
  }
  
  // Step 3: Get channel target and token
  const channelId = getChannelTarget();
  if (!channelId) {
    console.error('No channel target found. Check channel-target.json');
    process.exit(1);
  }
  
  const token = getTelegramToken();
  if (!token) {
    console.warn('Warning: No Telegram token found in OpenClaw config');
  }
  
  // Step 4: Send each hit as individual message
  let successCount = 0;
  let failCount = 0;
  
  for (const hit of payload.newHits) {
    const message = formatApartment(hit);
    
    // Add small delay between messages to avoid rate limiting
    if (successCount > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const success = sendTelegramMessage(channelId, message, token);
    
    if (success) {
      successCount++;
      console.log(`Sent apartment: ${hit.rooms || '?'} Zi, ${hit.district || 'Berlin'}`);
    } else {
      failCount++;
      console.error(`Failed to send apartment: ${hit.link || 'unknown'}`);
    }
  }
  
  console.log(`\nSummary: ${successCount} messages sent successfully, ${failCount} failed`);
  
  if (failCount > 0) {
    process.exit(1);
  }
}

// Run main
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { formatApartment, getChannelTarget, getTelegramToken };