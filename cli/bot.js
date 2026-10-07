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
    try {
      const res = await fetch(`${this.baseUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      console.error(`[!] Telegram network error (${method}):`, err.message);
      return { ok: false, description: err.message };
    }
  }

  async sendMessage(chatId, text, extra = {}) {
    let res = await this.callApi('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
      ...extra
    });

    if (!res || !res.ok) {
      res = await this.callApi('sendMessage', {
        chat_id: chatId,
        text,
        disable_web_page_preview: false,
        ...extra
      });
    }

    if (!res || !res.ok) {
      console.error('[!] Failed to deliver Telegram message:', res?.description || 'Unknown error');
    }

    return res;
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

    try {
      const res = await fetch(`${this.baseUrl}/sendDocument`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': String(totalBody.length)
        },
        body: totalBody
      });
      return await res.json();
    } catch (err) {
      console.error('[!] Telegram document upload error:', err.message);
      return { ok: false, description: err.message };
    }
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

  const isAllowed = allowedChatIds.some((id) => String(id).trim() === chatId);
  if (!isAllowed) {
    console.log(`[!] Message received from unregistered Chat ID: ${chatId}`);
    await bot.sendMessage(
      chatId,
      `Hello! Your Telegram Chat ID is: ${chatId}\n\nTo connect this bot with your 7strokes setup, add this Chat ID in settings by running:\nkiki config`
    );
    return;
  }

  const parts = text.split(/\s+/);
  const command = (parts[0] || '').toLowerCase().split('@')[0];
  const args = parts.slice(1);

  const db = getDbConnection();

  try {
    switch (command) {
      case '/start':
      case '/help': {
        const welcomeText = `7strokes Bot
------------------------------------
Control your lead search directly from Telegram.

Commands:
/status - Check app status and leads
/link - Get your web dashboard link
/leads - View total saved leads
/jobs - View recent search jobs
/search <query> - Start lead search (e.g. /search dentist dubai 50)
/export <job_id> - Download CSV file of leads
/help - Show this command list
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

        const statusMsg = `7strokes Status
------------------------------------
Platform: ${platform}
Total Leads Saved: ${counts.total_leads.toLocaleString()}
Total Searches: ${counts.total_jobs}
Running Searches: ${counts.running_jobs}
Uptime: ${uptimeMins} minutes
Memory: ${memMb} MB
Dashboard: ${tunnelUrl}
------------------------------------`;
        await bot.sendMessage(chatId, statusMsg);
        break;
      }

      case '/link':
      case '/tunnel': {
        const tunnelUrl = getPublicUrl();
        if (tunnelUrl) {
          await bot.sendMessage(
            chatId,
            `Web Dashboard Link:\n${tunnelUrl}\n\nOpen this link in your browser to view and manage leads.`
          );
        } else {
          await bot.sendMessage(
            chatId,
            `No public link active right now.\nThe app is running locally at: http://localhost:4000\nTo create a public link, run: kiki start`
          );
        }
        break;
      }

      case '/leads':
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

        let companyLines = companies.map((c) => `* ${c.company}: ${c.user_count} users`).join('\n');

        const dbMsg = `Saved Leads Overview
------------------------------------
Total Leads: ${counts.leads.toLocaleString()}
Total Searches: ${counts.jobs}
Users: ${counts.users}
Companies: ${counts.companies}

User Companies:
${companyLines || 'None'}
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
          await bot.sendMessage(chatId, 'No search jobs found yet. Start one with:\n/search dentist dubai 50');
          break;
        }

        let jobsText = `Recent Searches:\n------------------------------------\n`;
        jobs.forEach((j, i) => {
          const shortId = j.id ? j.id.slice(0, 8) : 'unknown';
          const statusTag = j.status === 'completed' ? '[DONE]' : j.status === 'running' ? '[RUNNING]' : '[STOPPED]';
          jobsText += `${statusTag} #${i + 1} | ID: ${shortId} | Source: ${(j.engine || 'google').toUpperCase()}\n`;
          jobsText += `Search: ${j.target}\n`;
          jobsText += `Leads: ${j.total_saved} / ${j.cap || 'no limit'}\n`;
          jobsText += `Download: /export ${shortId}\n\n`;
        });

        await bot.sendMessage(chatId, jobsText);
        break;
      }

      case '/search': {
        if (args.length === 0) {
          await bot.sendMessage(
            chatId,
            `To search for leads, type:\n/search <target> [number]\n\nExamples:\n/search Real Estate Dubai 50\n/search 2gis Dental Clinic Abu Dhabi 30\n/search google Coffee Shop London 100`
          );
          break;
        }

        let engine = 'gmaps';
        let remainingArgs = [...args];
        const firstArg = (remainingArgs[0] || '').toLowerCase();

        if (firstArg === 'gmaps' || firstArg === 'google') {
          engine = 'gmaps';
          remainingArgs.shift();
        } else if (firstArg === '2gis' || firstArg === 'twogis') {
          engine = '2gis';
          remainingArgs.shift();
        }

        let cap = 50;
        if (remainingArgs.length > 1) {
          const lastArg = remainingArgs[remainingArgs.length - 1];
          const parsed = parseInt(lastArg, 10);
          if (!isNaN(parsed) && parsed > 0) {
            cap = parsed;
            remainingArgs.pop();
          }
        }

        const target = remainingArgs.join(' ').replace(/['"]/g, '').trim();
        if (!target) {
          await bot.sendMessage(chatId, 'Please enter what you want to search for.\nExample: /search cafes in new york 50');
          break;
        }

        const jobId = 'bot_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        const adminUser = (await queryAll(db, "SELECT id FROM users WHERE role = 'admin' LIMIT 1"))[0];
        const userId = adminUser?.id || 'admin';

        await queryRun(
          db,
          'INSERT INTO jobs (id, user_id, engine, target, cap, status, total_saved) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [jobId, userId, engine, target, cap, 'running', 0]
        );

        const sourceLabel = engine === '2gis' ? '2GIS' : 'Google Maps';
        await bot.sendMessage(
          chatId,
          `Search started!\nTarget: ${target}\nSource: ${sourceLabel}\nGoal: ${cap} leads\nID: ${jobId}\n\nWe will send a message here when it completes.`
        );

        try {
          const { executeJob } = require('../backend/dist/workers/jobExecutor');
          executeJob({ jobId, engine, target, cap })
            .then(async () => {
              const updated = (await queryAll(db, 'SELECT total_saved, status FROM jobs WHERE id = ?', [jobId]))[0];
              await bot.sendMessage(
                chatId,
                `Search finished!\nTarget: ${target}\nLeads found: ${updated?.total_saved || 0}\n\nTo download the CSV file, type:\n/export ${jobId}`
              );
            })
            .catch(async (err) => {
              console.error('[!] Search execution error:', err);
              await bot.sendMessage(chatId, `Search error: ${err.message}`);
            });
        } catch (e) {
          console.error('[!] Failed to dispatch worker:', e);
          await bot.sendMessage(chatId, `Error starting search: ${e.message}\nMake sure backend is built.`);
        }
        break;
      }

      case '/export': {
        const searchId = (args[0] || '').trim();
        if (!searchId) {
          await bot.sendMessage(chatId, 'To export leads, type:\n/export <job_id>\nType /jobs to see recent search IDs.');
          break;
        }

        let job = null;
        if (/^\d+$/.test(searchId) && parseInt(searchId, 10) <= 20) {
          const index = parseInt(searchId, 10) - 1;
          const recentJobs = await queryAll(db, 'SELECT id, target, engine, total_saved FROM jobs ORDER BY created_at DESC LIMIT 20');
          job = recentJobs[index];
        }

        if (!job) {
          job = (
            await queryAll(db, 'SELECT id, target, engine, total_saved FROM jobs WHERE id LIKE ? LIMIT 1', [
              `%${searchId}%`
            ])
          )[0];
        }

        if (!job) {
          await bot.sendMessage(chatId, `No search found matching "${searchId}". Type /jobs to see recent searches.`);
          break;
        }

        const leads = await queryAll(
          db,
          'SELECT title, category, phone_1, phone_2, email, website, street, city, state, country, postal_code, address, rating, reviews, place_id FROM results WHERE job_id = ?',
          [job.id]
        );

        if (leads.length === 0) {
          await bot.sendMessage(chatId, `No leads saved for this search yet (ID: ${job.id}).`);
          break;
        }

        const headers = [
          'Business Name',
          'Category',
          'Primary Phone',
          'Secondary Phone',
          'Email',
          'Website',
          'Street',
          'City',
          'State',
          'Country',
          'Postal Code',
          'Full Address',
          'Rating',
          'Reviews'
        ];
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
            escapeCsv(row.street),
            escapeCsv(row.city),
            escapeCsv(row.state),
            escapeCsv(row.country),
            escapeCsv(row.postal_code),
            escapeCsv(row.address),
            escapeCsv(row.rating),
            escapeCsv(row.reviews)
          ].join(','));
        });

        const csvBuffer = Buffer.from(csvRows.join('\r\n'), 'utf8');
        const filename = `leads_${job.id.slice(0, 8)}.csv`;

        const sendDocRes = await bot.sendDocument(
          chatId,
          filename,
          csvBuffer,
          `7strokes Leads Export\nTarget: ${job.target}\nTotal: ${leads.length} leads`
        );

        if (!sendDocRes || !sendDocRes.ok) {
          await bot.sendMessage(chatId, `Error sending CSV document: ${sendDocRes?.description || 'upload failed'}`);
        }
        break;
      }

      default:
        await bot.sendMessage(chatId, `Unknown command: ${command}\nType /help to see all available commands.`);
        break;
    }
  } catch (err) {
    console.error('[!] Telegram bot command error:', err);
    try {
      await bot.sendMessage(chatId, `An error occurred: ${err.message}`);
    } catch (_) {}
  } finally {
    try { db.close(); } catch (_) {}
  }
}

async function startTelegramBot(configOverride = null) {
  let config = configOverride || loadConfig();

  if (!config.telegram?.botToken || !config.telegram?.allowedChatIds?.length) {
    config = await promptConfig(true, true);
  }

  const { botToken, allowedChatIds } = config.telegram || {};

  if (!botToken || !allowedChatIds || allowedChatIds.length === 0) {
    console.log('[!] Telegram Bot not enabled or missing Bot Token or Chat IDs.');
    console.log('[*] Run "kiki config" to configure your Telegram Bot.');
    return null;
  }

  const bot = new TelegramBotClient(botToken);

  console.log('\n' + '='.repeat(54));
  console.log('            7STROKES TELEGRAM BOT IS RUNNING');
  console.log('='.repeat(54));
  console.log(`- Allowed Chat IDs : ${allowedChatIds.join(', ')}`);
  console.log(`- Status           : Active`);
  console.log('Send /start or /help to your bot in Telegram.');
  console.log('Press Ctrl+C to stop.\n');

  bot.isRunning = true;

  if (config.telegram.notifyOnStart) {
    const tunnelUrl = getPublicUrl() || 'http://localhost:4000';
    for (const chatId of allowedChatIds) {
      try {
        await bot.sendMessage(
          chatId,
          `7strokes is ready!\nPlatform: ${process.platform === 'android' ? 'Android (Termux)' : process.platform}\nDashboard: ${tunnelUrl}\n\nType /help to see commands.`
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
        } else if (res && !res.ok) {
          console.error('[!] Telegram updates error:', res.description);
          await new Promise((r) => setTimeout(r, 4000));
        }
      } catch (err) {
        console.error('[!] Telegram polling error:', err.message);
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
