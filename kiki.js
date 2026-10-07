#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const readline = require('readline');

const { loadConfig, saveConfig, promptConfig, CONFIG_PATH } = require('./cli/config');
const { isAndroidOrTermux, getPublicUrl } = require('./cli/tunnel');
const { startTelegramBot } = require('./cli/bot');
const { viewDatabase, backupDatabase, restoreDatabase } = require('./cli/db');
const { startDnsBridge } = require('./cli/bridge');
const {
  startAllServices,
  stopAllServices,
  startBackendService,
  stopBackendService,
  startFrontendService,
  stopFrontendService,
  startTunnelService,
  stopTunnelService,
  getServicesStatus
} = require('./cli/services');

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
  console.log(`- Backend     : http://localhost:${info.port || 4000}`);
  if (info.frontend) {
    console.log(`- Frontend    : http://localhost:3000`);
  }
  if (info.publicUrl) {
    console.log(`- Public Link : ${info.publicUrl}`);
  }
  console.log(`- Database    : SQLite (dashmin.sqlite - connected)`);
  if (info.botActive) {
    console.log(`- Telegram Bot: Active (type /menu in chat)`);
  }
  console.log('-'.repeat(54));
  console.log('Quick commands:');
  console.log('  kiki db view   - View database stats');
  console.log('  kiki bot       - Start Telegram bot');
  console.log('  Press Ctrl+C to stop');
  console.log('='.repeat(54) + '\n');
}

async function startAll() {
  const config = await promptConfig(false, false);

  console.log('\n[*] Starting 7strokes services...');
  const res = await startAllServices();

  console.log(`[+] Backend : ${res.backend.ok ? 'Running on port ' + (res.backend.port || config.backendPort || 4000) : 'Failed'}`);
  console.log(`[+] Frontend: ${res.frontend.ok ? 'Running on http://localhost:3000' : 'Offline'}`);
  if (res.tunnel && res.tunnel.url) {
    console.log(`[+] Tunnel  : ${res.tunnel.url}`);
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
    frontend: res.frontend.ok,
    publicUrl: res.tunnel?.url,
    botActive
  });

  const handleExit = () => {
    console.log('\n[*] Stopping 7strokes...');
    stopAllServices();
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
  console.log(' [1] Start All Services (Backend, Tunnel, Frontend)');
  console.log(' [2] Start Telegram Bot');
  console.log(' [3] View Database Stats');
  console.log(' [4] Create Database Backup');
  console.log(' [5] Restore Database From Backup');
  console.log(' [6] Change Settings (Tokens, Links, Bot)');
  console.log(' [7] Android DNS Bridge (Port 8888)');
  console.log(' [8] Stop All Services');
  console.log(' [0] Exit');
  console.log('='.repeat(54));

  rl.question('Select an option [0-8]: ', async (choice) => {
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
      case '8':
        stopAllServices();
        console.log('[+] All services stopped.');
        break;
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

    case 'stop':
    case 'down':
      stopAllServices();
      console.log('[+] All services stopped.');
      break;

    case 'bot': {
      const bot = await startTelegramBot();
      if (bot) {
        console.log('[*] Bot is running. Press Ctrl+C to stop.');
        await new Promise(() => {});
      }
      break;
    }

    case 'backend':
      if (subCommand === 'stop') {
        const res = stopBackendService();
        console.log(res.message);
      } else {
        const res = await startBackendService();
        console.log(res.message);
      }
      break;

    case 'frontend':
      if (subCommand === 'stop') {
        const res = stopFrontendService();
        console.log(res.message);
      } else {
        const res = await startFrontendService();
        console.log(res.message);
      }
      break;

    case 'tunnel':
      if (subCommand === 'stop') {
        const res = stopTunnelService();
        console.log(res.message);
      } else {
        const res = await startTunnelService();
        console.log(res.message);
      }
      break;

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

    case 'status': {
      const status = await getServicesStatus();
      console.log('\n7strokes Services Status:');
      console.log(`  Backend  : ${status.backend ? `Running (port ${status.backendPort})` : 'Stopped'}`);
      console.log(`  Frontend : ${status.frontend ? `Running (port ${status.frontendPort})` : 'Stopped'}`);
      console.log(`  Tunnel   : ${status.tunnel ? (status.tunnelUrl || 'Active') : 'Stopped'}`);
      console.log(`  Bridge   : ${status.bridge ? 'Active' : 'Stopped'}\n`);
      break;
    }

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
  start               Start backend, tunnel, and frontend together
  stop                Stop all running services
  status              Check running status of all services
  bot                 Start the 7strokes Telegram Bot
  backend [stop]      Start or stop backend service
  frontend [stop]     Start or stop frontend web interface
  tunnel [stop]       Start or stop public link
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
