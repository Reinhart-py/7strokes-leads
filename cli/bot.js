const fs = require('fs');
const path = require('path');
const sqlite3 = require('../backend/node_modules/sqlite3');
const { loadConfig, saveConfig, promptConfig } = require('./config');
const { getPublicUrl } = require('./tunnel');

const DB_PATH = path.join(__dirname, '../dashmin.sqlite');

function getDbConnection() {
  return new sqlite3.Database(DB_PATH);
}

function queryAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function queryRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

class TelegramBotClient {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.offset = 0;
    this.isRunning = false;
  }

  async callApi(method, data = {}) {
    const res = await fetch(`${this.baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  }

  async sendMessage(chatId, text, extra = {}) {
    return this.callApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
      ...extra
    });
  }

  async sendDocument(chatId, filename, buffer, caption = '') {
    const boundary = '----TelegramBotBoundary' + Math.random().toString(36).substring(2);
    let postData = [];

    postData.push(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`);

    if (caption) {
      postData.push(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`);
    }

    postData.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${filename}"\r\nContent-Type: text/csv\r\n\r\n`
    );

    const headBuffer = Buffer.from(postData.join(''), 'utf8');
    const tailBuffer = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
    const totalBody = Buffer.concat([headBuffer, buffer, tailBuffer]);

    const res = await fetch(`${this.baseUrl}/sendDocument`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': String(totalBody.length)
      },
      body: totalBody
    });
    return await res.json();
  }

  async getUpdates(timeout = 25) {
    return this.callApi('getUpdates', {
      offset: this.offset,
      timeout,
      allowed_updates: ['message', 'callback_query']
    });
  }
}

async function handleCommand(bot, msg, allowedChatIds) {
  const chatId = String(msg.chat.id);
  const text = (msg.text || '').trim();

  if (!allowedChatIds.includes(chatId)) {
    console.warn(`[!] Unauthorized access attempt from Telegram Chat ID: ${chatId}`);
    await bot.sendMessage(
      chatId,
      `[!] *Access Denied*\nYour Chat ID: \`${chatId}\` is not in the allowed administrators list.\nAdd it via: \`fk config\``
    );
    return;
  }

  const parts = text.split(' ');
  const command = parts[0].toLowerCase().split('@')[0];
  const args = parts.slice(1);

  const db = getDbConnection();

  try {
    switch (command) {
      case '/start':
      case '/help': {
        const welcomeText = `*7strokes B2B Lead Engine Bot*
------------------------------------
Control your lead generation engine anywhere from Telegram.

*Available Commands:*
* \`/status\` - Live server metrics and platform
* \`/tunnel\` - Get current public Web UI link
* \`/db\` - Database summary (leads, jobs, users)
* \`/jobs\` - View recent scraping jobs
* \`/search <engine> <target> [limit]\` - Start lead search
  Example: \`/search gmaps Real Estate Dubai 100\`
  Example: \`/search 2gis Dental Clinic Abu Dhabi 50\`
* \`/export <job_id>\` - Send CSV file of leads to chat
* \`/help\` - Show this help menu
------------------------------------`;
        await bot.sendMessage(chatId, welcomeText);
        break;
      }

      case '/status': {
        const platform = process.platform === 'android' ? 'Android (Termux)' : `${process.platform} (${process.arch})`;
        const uptimeMins = Math.floor(process.uptime() / 60);
        const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

        const counts = (await queryAll(
          db,
          `SELECT 
            (SELECT count(*) FROM results) as total_leads,
            (SELECT count(*) FROM jobs) as total_jobs,
            (SELECT count(*) FROM jobs WHERE status = 'running') as running_jobs`
        ))[0] || { total_leads: 0, total_jobs: 0, running_jobs: 0 };

        const tunnelUrl = getPublicUrl() || 'http://localhost:4000';

        const statusMsg = `*7strokes System Status*
------------------------------------
* Platform: ${platform}
* Node.js: ${process.version}
* Uptime: ${uptimeMins} minutes
* Memory Usage: ${memMb} MB
* Total Leads Collected: *${counts.total_leads.toLocaleString()}*
* Total Jobs Run: ${counts.total_jobs}
* Active Scraping Jobs: ${counts.running_jobs}
* Live Tunnel: [Open Web UI](${tunnelUrl})
------------------------------------`;
        await bot.sendMessage(chatId, statusMsg);
        break;
      }

      case '/tunnel': {
        const tunnelUrl = getPublicUrl();
        if (tunnelUrl) {
          await bot.sendMessage(
            chatId,
            `*Active Public Tunnel Link*\n------------------------------------\nLink: ${tunnelUrl}\n\nOpen the link above to access your 7strokes Web Dashboard from your phone or browser.`
          );
        } else {
          await bot.sendMessage(
            chatId,
            `[!] *No External Tunnel Active*\nThe server is currently running locally on \`http://localhost:4000\`.\nRun \`fk start\` to launch ngrok or Cloudflare tunnel.`
          );
        }
        break;
      }

      case '/db': {
        const counts = (await queryAll(
          db,
          `SELECT 
            (SELECT count(*) FROM users) as users,
            (SELECT count(DISTINCT company) FROM users WHERE company IS NOT NULL AND company != '') as companies,
            (SELECT count(*) FROM jobs) as jobs,
            (SELECT count(*) FROM results) as leads`
        ))[0] || { users: 0, companies: 0, jobs: 0, leads: 0 };

        const companies = await queryAll(
          db,
          `SELECT COALESCE(company, 'Unassigned') as company, count(*) as user_count 
           FROM users 
           GROUP BY COALESCE(company, 'Unassigned')`
        );

        let companyLines = companies.map((c) => `  * ${c.company}: ${c.user_count} users`).join('\n');

        const dbMsg = `*Database Summary*
------------------------------------
* Total Leads Saved: *${counts.leads.toLocaleString()}*
* Total Search Jobs: ${counts.jobs}
* Total Users: ${counts.users}
* Active Companies: ${counts.companies}

*Companies:*
${companyLines || '  (None)'}
------------------------------------`;
        await bot.sendMessage(chatId, dbMsg);
        break;
      }

      case '/jobs': {
        const jobs = await queryAll(
          db,
          `SELECT id, engine, target, status, total_saved, cap, created_at 
           FROM jobs 
           ORDER BY created_at DESC 
           LIMIT 5`
        );

        if (jobs.length === 0) {
          await bot.sendMessage(chatId, '*No search jobs found in database.*');
          break;
        }

        let jobsText = `*Recent Scraping Jobs*\n------------------------------------\n`;
        jobs.forEach((j, i) => {
          const shortId = j.id ? j.id.slice(0, 8) : 'unknown';
          const statusTag = j.status === 'completed' ? '[DONE]' : j.status === 'running' ? '[RUNNING]' : '[STOPPED]';
          jobsText += `${statusTag} *[${i + 1}]* \`${shortId}\` - *${j.engine.toUpperCase()}*\n`;
          jobsText += `   Target: ${j.target}\n`;
          jobsText += `   Leads: ${j.total_saved} / ${j.cap || 'none'} | Status: ${j.status}\n`;
          jobsText += `   Export: \`/export ${shortId}\`\n\n`;
        });

        await bot.sendMessage(chatId, jobsText);
        break;
      }

      case '/search': {
        if (args.length < 2) {
          await bot.sendMessage(
            chatId,
            `[!] *Usage:* \`/search <engine> <target> [cap]\`\n\n*Examples:*\n* \`/search gmaps Real Estate Dubai 100\`\n* \`/search 2gis Dental Clinic Abu Dhabi 50\``
          );
          break;
        }

        const engine = args[0].toLowerCase();
        if (engine !== 'gmaps' && engine !== '2gis') {
          await bot.sendMessage(chatId, `[!] Unsupported engine \`${engine}\`. Use \`gmaps\` or \`2gis\`.`);
          break;
        }

        let cap = 50;
        let targetParts = args.slice(1);
        const lastPart = targetParts[targetParts.length - 1];
        if (!isNaN(parseInt(lastPart, 10))) {
          cap = parseInt(lastPart, 10);
          targetParts.pop();
        }

        const target = targetParts.join(' ').replace(/['"]/g, '');
        const jobId = 'bot_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

        const adminUser = (await queryAll(db, "SELECT id FROM users WHERE role = 'admin' LIMIT 1"))[0];
        const userId = adminUser?.id || 'admin';

        await queryRun(
          db,
          'INSERT INTO jobs (id, user_id, engine, target, cap, status, total_saved) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [jobId, userId, engine, target, cap, 'running', 0]
        );

        await bot.sendMessage(
          chatId,
          `[+] *Job Started!*\n------------------------------------\n* ID: \`${jobId}\`\n* Engine: ${engine.toUpperCase()}\n* Target: ${target}\n* Lead Target: ${cap}\n\nScraper is running in background. You will receive an alert once complete.`
        );

        try {
          const { executeJob } = require('../backend/dist/workers/jobExecutor');
          executeJob({ jobId, engine, target, cap })
            .then(async () => {
              const updated = (await queryAll(db, 'SELECT total_saved, status FROM jobs WHERE id = ?', [jobId]))[0];
              await bot.sendMessage(
                chatId,
                `[+] *Search Completed!*\n------------------------------------\n* Target: ${target}\n* Leads Found: *${updated?.total_saved || 0}*\n* ID: \`${jobId}\`\n\nDownload now: \`/export ${jobId}\``
              );
            })
            .catch(async (err) => {
              await bot.sendMessage(chatId, `[-] *Job Failed:* ${err.message}`);
            });
        } catch (e) {
          console.warn('[!] Direct executor dispatch note:', e.message);
        }
        break;
      }

      case '/export': {
        const searchId = (args[0] || '').trim();
        if (!searchId) {
          await bot.sendMessage(chatId, '[!] *Usage:* `/export <job_id>`\nUse `/jobs` to copy the Job ID.');
          break;
        }

        const job = (
          await queryAll(db, 'SELECT id, target, engine, total_saved FROM jobs WHERE id LIKE ? LIMIT 1', [
            `%${searchId}%`
          ])
        )[0];

        if (!job) {
          await bot.sendMessage(chatId, `[-] No job found matching \`${searchId}\`.`);
          break;
        }

        const leads = await queryAll(
          db,
          'SELECT title, category, phone_1, phone_2, email, website, address, city, rating, reviews, place_id FROM results WHERE job_id = ?',
          [job.id]
        );

        if (leads.length === 0) {
          await bot.sendMessage(chatId, `[!] No leads stored for job \`${job.id}\` yet.`);
          break;
        }

        const headers = ['Business Name', 'Category', 'Phone 1', 'Phone 2', 'Email', 'Website', 'Address', 'City', 'Rating', 'Reviews'];
        const csvRows = [headers.join(',')];

        leads.forEach((row) => {
          const escapeCsv = (val) => {
            if (val === null || val === undefined) return '""';
            return `"${String(val).replace(/"/g, '""')}"`;
          };
          csvRows.push([
            escapeCsv(row.title),
            escapeCsv(row.category),
            escapeCsv(row.phone_1),
            escapeCsv(row.phone_2),
            escapeCsv(row.email),
            escapeCsv(row.website),
            escapeCsv(row.address),
            escapeCsv(row.city),
            escapeCsv(row.rating),
            escapeCsv(row.reviews)
          ].join(','));
        });

        const csvBuffer = Buffer.from(csvRows.join('\r\n'), 'utf8');
        const filename = `7strokes_leads_${job.id.slice(0, 8)}.csv`;

        await bot.sendDocument(
          chatId,
          filename,
          csvBuffer,
          `*7strokes Leads Export*\n* Target: ${job.target}\n* Total Records: ${leads.length}`
        );
        break;
      }

      default:
        await bot.sendMessage(chatId, `[!] Unknown command \`${command}\`. Type \`/help\` for the command list.`);
        break;
    }
  } catch (err) {
    console.error('[!] Telegram Bot error handling command:', err);
    try {
      await bot.sendMessage(chatId, `[!] An error occurred: ${err.message}`);
    } catch (_) {}
  } finally {
    db.close();
  }
}

async function startTelegramBot(configOverride = null) {
  let config = configOverride || loadConfig();

  if (!config.telegram?.botToken || !config.telegram?.allowedChatIds?.length) {
    config = await promptConfig(true, true);
  }

  const { botToken, allowedChatIds } = config.telegram || {};

  if (!botToken || !allowedChatIds || allowedChatIds.length === 0) {
    console.log('[!] Telegram Bot not enabled or missing Bot Token / Chat IDs.');
    console.log('[*] Run "fk config" to set up your Telegram Bot.');
    return null;
  }

  const bot = new TelegramBotClient(botToken);

  console.log('\n' + '='.repeat(60));
  console.log('         7STROKES TELEGRAM BOT (FK BOT) ACTIVE            ');
  console.log('='.repeat(60));
  console.log(`- Allowed Chat IDs : ${allowedChatIds.join(', ')}`);
  console.log(`- Status           : Polling for commands...`);
  console.log('- Send /start to your bot in Telegram to begin.\n');

  bot.isRunning = true;

  if (config.telegram.notifyOnStart) {
    const tunnelUrl = getPublicUrl() || 'http://localhost:4000';
    for (const chatId of allowedChatIds) {
      try {
        await bot.sendMessage(
          chatId,
          `[+] *7strokes Engine Online!*\n------------------------------------\nPlatform: *${process.platform === 'android' ? 'Android (Termux)' : process.platform}*\nLive Link: [Open Dashboard](${tunnelUrl})\n\nType /help to see all commands.`
        );
      } catch (err) {
        console.warn(`[!] Could not send startup notification to ${chatId}:`, err.message);
      }
    }
  }

  (async () => {
    while (bot.isRunning) {
      try {
        const res = await bot.getUpdates(25);
        if (res && res.ok && Array.isArray(res.result)) {
          for (const update of res.result) {
            bot.offset = update.update_id + 1;
            if (update.message && update.message.text) {
              await handleCommand(bot, update.message, allowedChatIds);
            }
          }
        }
      } catch (err) {
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  })();

  return bot;
}

module.exports = {
  TelegramBotClient,
  startTelegramBot
};
