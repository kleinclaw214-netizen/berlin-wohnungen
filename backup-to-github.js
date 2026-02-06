#!/usr/bin/env node
/**
 * Backup script for Berlin apartment scraper.
 * Commits and pushes core files to GitHub every 12 hours.
 * Only includes source code and configuration (no results/logs).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname);
const GIT = 'git';

// Whitelist of files to backup (relative to repo root)
// Only personal assistant files, no scraper scripts.
const BACKUP_FILES = [
  'AGENTS.md',
  'SOUL.md',
  'USER.md',
  'TOOLS.md',
  'IDENTITY.md',
  'HEARTBEAT.md',
  'MEMORY.md',
  'backup-to-github.js',
];

function run(cmd, options = {}) {
  console.log(`$ ${cmd}`);
  try {
    const out = execSync(cmd, { cwd: REPO_ROOT, stdio: 'pipe', ...options });
    return out.toString().trim();
  } catch (e) {
    console.error(`Error: ${e.message}`);
    if (e.stderr) console.error(e.stderr.toString());
    throw e;
  }
}

function safeGitAdd(files) {
  const existing = files.filter(f => fs.existsSync(path.join(REPO_ROOT, f)));
  if (existing.length === 0) {
    console.log('ℹ️  No whitelisted files changed, skipping add.');
    return false;
  }
  run(`${GIT} add ${existing.map(f => `"${f}"`).join(' ')}`);
  return true;
}

function main() {
  console.log('🏁 Starting GitHub backup');
  console.log(`📁 Repo: ${REPO_ROOT}`);
  console.log(`⏰ ${new Date().toISOString()}`);

  // Ensure we are on main branch
  run(`${GIT} checkout main`);

  // Pull latest remote changes (ignore errors if offline)
  try {
    run(`${GIT} pull --rebase --autostash`);
  } catch (e) {
    console.warn('⚠️  Could not pull (network or conflicts), continuing with local state.');
  }

  // Check if there are any changes in whitelisted files
  const status = run(`${GIT} status --porcelain`);
  const changedFiles = status.split('\n').filter(line => line.trim()).map(line => line.slice(3));
  const whitelistChanged = changedFiles.filter(f => BACKUP_FILES.includes(f));
  
  if (whitelistChanged.length === 0) {
    console.log('✅ No changes in whitelisted files. Backup skipped.');
    return;
  }

  console.log(`📦 Changed whitelisted files:\n  ${whitelistChanged.join('\n  ')}`);

  // Add only whitelisted files
  if (!safeGitAdd(whitelistChanged)) {
    console.log('✅ Nothing to commit.');
    return;
  }

  // Commit
  const timestamp = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
  const commitMsg = `Backup ${timestamp} CET\n\nChanged files:\n${whitelistChanged.map(f => `- ${f}`).join('\n')}`;
  run(`${GIT} commit -m "${commitMsg}"`);

  // Push
  try {
    run(`${GIT} push origin main`);
    console.log(`✅ Backup pushed to GitHub at ${timestamp} CET`);
  } catch (e) {
    console.error('❌ Push failed. Remote may be unreachable or token expired.');
    throw e;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (e) {
    console.error('💥 Backup script failed:', e.message);
    process.exit(1);
  }
}