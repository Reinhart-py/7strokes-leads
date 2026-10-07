#!/usr/bin/env node

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');
const readline = require('readline');

const { loadConfig, saveConfig, promptConfig, CONFIG_PATH } = require('./cli/config');
const { startTunnel, stopTunnel, getPublicUrl, isAndroidOrTermux } = require('./cli/tunnel');
const { startTelegramBot } = require('./cli/bot');
const { viewDatabase, backupDatabase, restoreDatabase } = require('./cli/db');
const { startDnsBridge } = require('./cli/bridge');

const args = process.argv.slice(2);
const command = (args[0] || '').toLowerCase();
const subCommand = (args[1] || '').toLowerCase();
const param = args[2] || '';

function printBanner(info = {}) {
  const isAndroid = isAndroidOrTermux();
  const platformLabel = isAndroid ? 'Android (Termux)' : `${process.platform} (${process.arch})`;

  console.log('\n' + '='.repeat(54));
  console.log('                 7STROKES IS READY');
  console.log('='.repeat(54));
  console.log(`- Platform    : ${platformLabel}`);
  console.log(`- Local App   : http://localhost:${info.port || 4000}`);
  if (info.publicUrl) {
    console.log(`- Public Link : ${info.publicUrl}`);
  }
  console.log(`- Database    : SQLite (dashmin.sqlite - connected)`);
  if (info.botActive) {
    console.log(`- Telegram Bot: Active (type /help in chat)`);
  }
  console.log('-'.repeat(54));
  console.log('Quick commands:');
  console.log('  kiki db view   - View database stats');
  console.log('  kiki bot       - Start Telegram bot');
  console.log('  Press Ctrl+C to stop');
  console.log('='.repeat(54) + '\n');
}

function checkBackendBuilt() {
  const distIndexPath = path.join(__dirname, 'backend/dist/index.js');
  if (!fs.existsSync(distIndexPath)) {
    console.log('[*] Compiling backend code...');
    execSync('npm run build', { cwd: path.join(__dirname, 'backend'), stdio: 'inherit' });
  }
}

function waitForServer(port = 4000, maxRetries = 20) {
  return new Promise((resolve) => {
    let retries = 0;
    const interval = setInterval(() => {
      retries++;
      const req = http.get(`http://127.0.0.1:${port}/health`, () => {
        clearInterval(interval);
        resolve(true);
      });
      req.on('error', () => {
        if (retries >= maxRetries) {
          clearInterval(interval);
          resolve(false);
        }
      });
    }, 500);
  });
}

async function startAll() {
  const config = await promptConfig(false, false);

  checkBackendBuilt();

  console.log('\n[*] Starting 7strokes backend server...');
  const backendProc = spawn('node', ['dist/index.js'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit'
  });

  backendProc.on('error', (err) => {
    console.error('[!] Failed to start backend:', err.message);
  });

  await waitForServer(config.backendPort || 4000);
  console.log('[+] Backend server is running on port ' + (config.backendPort || 4000));

  console.log('[*] Initializing public link...');
  let publicUrl = null;
  try {
    const tunnelResult = await startTunnel(config.backendPort || 4000, config);
    publicUrl = tunnelResult.url;
  } catch (err) {
    console.warn('[!] Public link note:', err.message);
  }

  let botActive = false;
  if (config.telegram?.enabled && config.telegram?.botToken) {
    try {
      await startTelegramBot(config);
      botActive = true;
    } catch (err) {
      console.warn('[!] Telegram bot note:', err.message);
    }
  }

  printBanner({
    port: config.backendPort || 4000,
    publicUrl,
    botActive
  });

  const handleExit = () => {
    console.log('\n[*] Stopping 7strokes...');
    stopTunnel();
    try { backendProc.kill(); } catch (_) {}
    process.exit(0);
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
}

function showInteractiveMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('\n' + '='.repeat(54));
  console.log('             7STROKES CONTROL PANEL (KIKI)');
  console.log('='.repeat(54));
  console.log(' [1] Start 7strokes (Backend + Public Link)');
  console.log(' [2] Start Telegram Bot');
  console.log(' [3] View Database Stats');
  console.log(' [4] Create Database Backup');
  console.log(' [5] Restore Database From Backup');
  console.log(' [6] Change Settings (Tokens, Links, Bot)');
  console.log(' [7] Android DNS Bridge (Port 8888)');
  console.log(' [0] Exit');
  console.log('='.repeat(54));

  rl.question('Select an option [0-7]: ', async (choice) => {
    rl.close();
    const sel = choice.trim();

    switch (sel) {
      case '1':
        await startAll();
        break;
      case '2': {
        const bot = await startTelegramBot();
        if (bot) {
          console.log('[*] Bot is running. Press Ctrl+C to stop.');
          await new Promise(() => {});
        }
        break;
      }
      case '3':
        await viewDatabase();
        break;
      case '4':
        await backupDatabase();
        break;
      case '5': {
        const rlRestore = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        rlRestore.question('Enter path to backup file: ', async (backupPath) => {
          rlRestore.close();
          if (backupPath.trim()) {
            await restoreDatabase(backupPath.trim());
          } else {
            console.log('[!] Cancelled.');
          }
        });
        break;
      }
      case '6':
        await promptConfig(true, false);
        break;
      case '7': {
        console.log('[*] Starting Android DNS Bridge on 127.0.0.1:8888...');
        const bridge = await startDnsBridge(8888);
        console.log(`[+] DNS Bridge active on 127.0.0.1:${bridge.port}`);
        console.log('[*] Use with: ngrok http 4000 --proxy-url=http://127.0.0.1:' + bridge.port);
        break;
      }
      case '0':
        process.exit(0);
        break;
      default:
        console.log('[!] Invalid option.');
        process.exit(0);
        break;
    }
  });
}

async function main() {
  if (!command || command === 'menu') {
    showInteractiveMenu();
    return;
  }

  switch (command) {
    case 'start':
    case 'run':
    case 'up':
      await startAll();
      break;

    case 'bot': {
      const bot = await startTelegramBot();
      if (bot) {
        console.log('[*] Bot is running. Press Ctrl+C to stop.');
        await new Promise(() => {});
      }
      break;
    }

    case 'db':
      if (subCommand === 'view' || subCommand === 'stats' || subCommand === 'list' || !subCommand) {
        await viewDatabase();
      } else if (subCommand === 'backup' || subCommand === 'export') {
        await backupDatabase();
      } else if (subCommand === 'restore' || subCommand === 'import') {
        if (!param) {
          console.error('[!] Usage: kiki db restore <path_to_backup.sqlite>');
          process.exit(1);
        }
        await restoreDatabase(param);
      } else {
        console.log(`[!] Unknown db command: "${subCommand}". Use: view, backup, restore.`);
      }
      break;

    case 'bridge': {
      console.log('[*] Starting Android DNS Bridge on 127.0.0.1:8888...');
      const bridge = await startDnsBridge(8888);
      console.log(`[+] DNS Bridge active on 127.0.0.1:${bridge.port}`);
      console.log('[*] Use with: ngrok http 4000 --proxy-url=http://127.0.0.1:' + bridge.port);
      break;
    }

    case 'config':
    case 'setup':
      await promptConfig(true, false);
      break;

    case 'help':
    case '--help':
    case '-h':
      console.log(`
7strokes - Universal CLI (kiki)

USAGE:
  kiki [command] [options]
  node kiki.js [command] [options]

COMMANDS:
  (no args)           Open interactive numbered menu
  start               Start backend and public link together
  bot                 Start the 7strokes Telegram Bot
  db view             Display database statistics
  db backup           Create database backup in backups/
  db restore <file>   Restore database from a backup file
  bridge              Start standalone DNS bridge for Android Termux
  config              Change settings (tokens, links, bot)
  help                Show this command manual
`);
      break;

    default:
      console.log(`[!] Unknown command: "${command}". Run "kiki help" for usage.`);
      break;
  }
}

main().catch((err) => {
  console.error('[!] Error:', err.message);
  process.exit(1);
});
