const fs = require('fs');
const path = require('path');
const sqlite3 = require('../backend/node_modules/sqlite3');
const { loadConfig, saveConfig, promptConfig, CONFIG_PATH } = require('./config');
const { backupDatabase } = require('./db');
const {
  isBackendRunning,
  isFrontendRunning,
  isTunnelRunning,
  isBridgeRunning,
  startBackendService,
  stopBackendService,
  startFrontendService,
  stopFrontendService,
  startTunnelService,
  stopTunnelService,
  startBridgeService,
  stopBridgeService,
  startAllServices,
  stopAllServices,
  restartAllServices,
  getServicesStatus
} = require('./services');

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

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  async editMessageText(chatId, messageId, text, extra = {}) {
    let res = await this.callApi('editMessageText', {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
      ...extra
    });

    if (!res || !res.ok) {
      res = await this.callApi('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        disable_web_page_preview: false,
        ...extra
      });
    }

    return res;
  }

  async answerCallbackQuery(callbackQueryId, text = '') {
    return this.callApi('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text: text || undefined
    });
  }

  async sendDocument(chatId, filename, buffer, caption = '') {
    const boundary = '----TelegramBotBoundary' + Math.random().toString(36).substring(2);
    let postData = [];

    postData.push(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`);

    if (caption) {
      postData.push(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`);
    }

    let mimeType = 'application/octet-stream';
    if (filename.endsWith('.csv')) mimeType = 'text/csv';
    else if (filename.endsWith('.json')) mimeType = 'application/json';
    else if (filename.endsWith('.sqlite') || filename.endsWith('.db')) mimeType = 'application/x-sqlite3';

    postData.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
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

  async getFile(fileId) {
    return this.callApi('getFile', { file_id: fileId });
  }

  async downloadFile(filePath) {
    const fileUrl = `https://api.telegram.org/file/bot${this.token}/${filePath}`;
    const res = await fetch(fileUrl);
    if (!res.ok) throw new Error(`Download failed with status ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async getUpdates(timeout = 25) {
    return this.callApi('getUpdates', {
      offset: this.offset,
      timeout,
      allowed_updates: ['message', 'callback_query']
    });
  }
}

async function renderMainMenu() {
  const status = await getServicesStatus();
  const db = getDbConnection();
  let leadCount = 0;
  let runningJobs = 0;

  try {
    const counts = (await queryAll(
      db,
      `SELECT 
        (SELECT count(*) FROM results) as leads, 
        (SELECT count(*) FROM jobs WHERE status = 'running') as running_jobs`
    ))[0];
    leadCount = counts?.leads || 0;
    runningJobs = counts?.running_jobs || 0;
  } catch (_) {}
  finally {
    try { db.close(); } catch (_) {}
  }

  const backendLabel = status.backend ? `ONLINE (port ${status.backendPort})` : 'OFFLINE';
  const tunnelLabel = status.tunnel ? (status.tunnelUrl ? `ONLINE (${status.tunnelUrl})` : 'ONLINE') : 'OFFLINE';
  const frontendLabel = status.frontend ? `ONLINE (port ${status.frontendPort})` : 'OFFLINE';
  const bridgeLabel = status.bridge ? 'ACTIVE' : 'INACTIVE';

  const text = `7strokes Control Panel
------------------------------------
Backend   : ${backendLabel}
Tunnel    : ${tunnelLabel}
Frontend  : ${frontendLabel}
DNS Bridge: ${bridgeLabel}
------------------------------------
Total Leads Saved: ${leadCount.toLocaleString()}
Active Searches  : ${runningJobs}
------------------------------------
Select a menu below:`;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: "Services Control", callback_data: "nav_services" },
        { text: "Database & Backups", callback_data: "nav_database" }
      ],
      [
        { text: "Browse All Leads", callback_data: "nav_leads_page_1" },
        { text: "Search Jobs & Exports", callback_data: "nav_searches_page_1" }
      ],
      [
        { text: `Download All Leads CSV (${leadCount.toLocaleString()})`, callback_data: "action_download_all_csv" }
      ],
      [
        { text: "Settings & Users", callback_data: "nav_settings" },
        { text: "Refresh Status", callback_data: "nav_main" }
      ],
      [
        { text: "Start All", callback_data: "action_start_all" },
        { text: "Restart All", callback_data: "action_restart_all" },
        { text: "Stop All", callback_data: "action_stop_all" }
      ]
    ]
  };

  return { text, replyMarkup };
}

async function renderServicesMenu() {
  const status = await getServicesStatus();

  const text = `Services Control
------------------------------------
Backend   : ${status.backend ? `ONLINE (port ${status.backendPort})` : 'OFFLINE'}
Tunnel    : ${status.tunnel ? (status.tunnelUrl ? `ONLINE (${status.tunnelUrl})` : 'ONLINE') : 'OFFLINE'}
Frontend  : ${status.frontend ? `ONLINE (port ${status.frontendPort})` : 'OFFLINE'}
DNS Bridge: ${status.bridge ? 'ACTIVE' : 'INACTIVE'}
------------------------------------
Tap any service below to toggle on or off:`;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: status.backend ? "Backend: [ON]" : "Backend: [OFF]", callback_data: "toggle_backend" },
        { text: status.tunnel ? "Tunnel: [ON]" : "Tunnel: [OFF]", callback_data: "toggle_tunnel" }
      ],
      [
        { text: status.frontend ? "Frontend: [ON]" : "Frontend: [OFF]", callback_data: "toggle_frontend" },
        { text: status.bridge ? "Bridge: [ON]" : "Bridge: [OFF]", callback_data: "toggle_bridge" }
      ],
      [
        { text: "Start All", callback_data: "action_start_all" },
        { text: "Restart All", callback_data: "action_restart_all" },
        { text: "Stop All", callback_data: "action_stop_all" }
      ],
      [
        { text: "<< Back to Main Menu", callback_data: "nav_main" },
        { text: "Refresh", callback_data: "nav_services" }
      ]
    ]
  };

  return { text, replyMarkup };
}

async function renderDatabaseMenu() {
  const db = getDbConnection();
  let counts = { leads: 0, jobs: 0, users: 0, companies: 0 };
  let dbSizeStr = 'Unknown';

  try {
    counts = (await queryAll(
      db,
      `SELECT 
        (SELECT count(*) FROM users) as users,
        (SELECT count(DISTINCT company) FROM users WHERE company IS NOT NULL AND company != '') as companies,
        (SELECT count(*) FROM jobs) as jobs,
        (SELECT count(*) FROM results) as leads`
    ))[0] || counts;

    if (fs.existsSync(DB_PATH)) {
      const stat = fs.statSync(DB_PATH);
      dbSizeStr = formatBytes(stat.size);
    }
  } catch (_) {}
  finally {
    try { db.close(); } catch (_) {}
  }

  const text = `Database & Backups
------------------------------------
Database File: dashmin.sqlite (${dbSizeStr})
Total Leads  : ${counts.leads.toLocaleString()}
Total Searches: ${counts.jobs}
Users / Teams: ${counts.users} users, ${counts.companies} companies
------------------------------------
Features:
* Tap "Download Database" to receive dashmin.sqlite here in chat.
* Tap "Create Backup" to save a snapshot on server.
* To RESTORE: Simply send any .sqlite or .db file to this bot.`;

  const replyMarkup = {
    inline_keyboard: [
      [
        { text: "Download Database File", callback_data: "action_download_db" },
        { text: "Create Backup", callback_data: "action_backup_db" }
      ],
      [
        { text: "Database Stats", callback_data: "action_db_stats" },
        { text: "Download Config", callback_data: "action_download_config" }
      ],
      [
        { text: "<< Back to Main Menu", callback_data: "nav_main" },
        { text: "Refresh", callback_data: "nav_database" }
      ]
    ]
  };

  return { text, replyMarkup };
}

async function renderLeadsBrowser(page = 1) {
  const db = getDbConnection();
  const limit = 5;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const offset = (pageNum - 1) * limit;

  let totalCount = 0;
  let leads = [];

  try {
    const countRes = (await queryAll(db, 'SELECT count(*) as count FROM results'))[0];
    totalCount = countRes?.count || 0;

    leads = await queryAll(
      db,
      'SELECT id, title, category, phone_1, phone_2, email, website, city, street, rating, reviews FROM results ORDER BY id DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  } catch (_) {}
  finally {
    try { db.close(); } catch (_) {}
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const currentActualPage = Math.min(pageNum, totalPages);

  let text = `Saved Leads (Page ${currentActualPage} of ${totalPages.toLocaleString()} | ${totalCount.toLocaleString()} Total)\n------------------------------------\n`;

  if (leads.length === 0) {
    text += 'No leads found in database.\nStart a search with: /search dentist dubai 50';
  } else {
    leads.forEach((l, i) => {
      const idx = offset + i + 1;
      text += `${idx}. ${l.title || 'Untitled Business'}\n`;
      if (l.category) text += `   Category : ${l.category}\n`;
      if (l.phone_1) text += `   Phone 1  : ${l.phone_1}\n`;
      if (l.phone_2) text += `   Phone 2  : ${l.phone_2}\n`;
      if (l.email) text += `   Email    : ${l.email}\n`;
      const location = [l.street, l.city].filter(Boolean).join(', ');
      if (location) text += `   Location : ${location}\n`;
      if (l.rating) text += `   Rating   : ${l.rating} (${l.reviews || 0} reviews)\n`;
      text += '\n';
    });
  }

  const navRow = [];
  if (currentActualPage > 1) {
    navRow.push({ text: "<< Prev", callback_data: `nav_leads_page_${currentActualPage - 1}` });
  }
  navRow.push({ text: `Page ${currentActualPage}/${totalPages}`, callback_data: `nav_leads_page_${currentActualPage}` });
  if (currentActualPage < totalPages) {
    navRow.push({ text: "Next >>", callback_data: `nav_leads_page_${currentActualPage + 1}` });
  }

  const inlineButtons = [];
  if (navRow.length > 0) {
    inlineButtons.push(navRow);
  }
  inlineButtons.push([
    { text: `Download All Leads CSV (${totalCount.toLocaleString()})`, callback_data: "action_download_all_csv" }
  ]);
  inlineButtons.push([
    { text: "<< Back to Main Menu", callback_data: "nav_main" },
    { text: "Refresh", callback_data: `nav_leads_page_${currentActualPage}` }
  ]);

  return { text, replyMarkup: { inline_keyboard: inlineButtons } };
}

async function renderSearchesMenu(page = 1) {
  const db = getDbConnection();
  const limit = 5;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const offset = (pageNum - 1) * limit;

  let totalJobs = 0;
  let jobs = [];

  try {
    const countRes = (await queryAll(db, 'SELECT count(*) as count FROM jobs'))[0];
    totalJobs = countRes?.count || 0;

    jobs = await queryAll(
      db,
      `SELECT id, engine, target, status, total_saved, cap, created_at 
       FROM jobs 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  } catch (_) {}
  finally {
    try { db.close(); } catch (_) {}
  }

  const totalPages = Math.max(1, Math.ceil(totalJobs / limit));
  const currentActualPage = Math.min(pageNum, totalPages);

  let text = `Lead Searches (Page ${currentActualPage} of ${totalPages} | ${totalJobs} Total Searches)\n------------------------------------\n`;
  const inlineButtons = [];

  if (jobs.length === 0) {
    text += `No search jobs found yet.\nType /search dentist dubai 50 to start.`;
  } else {
    jobs.forEach((j, i) => {
      const idx = offset + i + 1;
      const shortId = j.id ? j.id.slice(0, 8) : 'unknown';
      text += `#${idx} [${j.status.toUpperCase()}] ${j.target}\n`;
      text += `Leads: ${j.total_saved} / ${j.cap || 'no limit'} | ID: ${shortId}\n\n`;

      inlineButtons.push([
        {
          text: `Download CSV: #${idx} (${j.total_saved} leads)`,
          callback_data: `export_job_${shortId}`
        }
      ]);
    });
  }

  const navRow = [];
  if (currentActualPage > 1) {
    navRow.push({ text: "<< Prev", callback_data: `nav_searches_page_${currentActualPage - 1}` });
  }
  navRow.push({ text: `Page ${currentActualPage}/${totalPages}`, callback_data: `nav_searches_page_${currentActualPage}` });
  if (currentActualPage < totalPages) {
    navRow.push({ text: "Next >>", callback_data: `nav_searches_page_${currentActualPage + 1}` });
  }

  if (navRow.length > 0) {
    inlineButtons.push(navRow);
  }

  inlineButtons.push([
    { text: "Download All Leads CSV", callback_data: "action_download_all_csv" }
  ]);

  inlineButtons.push([
    { text: "<< Back to Main Menu", callback_data: "nav_main" },
    { text: "Refresh", callback_data: `nav_searches_page_${currentActualPage}` }
  ]);

  return { text, replyMarkup: { inline_keyboard: inlineButtons } };
}

function renderSettingsMenu() {
  const cfg = loadConfig();

  const text = `Settings & Users
------------------------------------
Backend Port : ${cfg.backendPort || 4000}
Tunnel Type  : ${cfg.tunnel?.type || 'ngrok'}
Ngrok Token  : ${cfg.tunnel?.authtoken ? 'Configured' : 'Not Set'}
Ngrok Domain : ${cfg.tunnel?.domain || 'Random (Default)'}
Allowed Users: ${cfg.telegram?.allowedChatIds?.join(', ') || 'None'}
------------------------------------
How to update settings:
/set_port <number> - Change backend port
/set_ngrok <token> - Set ngrok authtoken
/set_domain <domain> - Set custom domain
/set_tunnel <ngrok|cloudflared> - Change tunnel
/add_chat <id> - Add an allowed user ID
/remove_chat <id> - Remove an allowed user ID`;

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: `Tunnel: [${(cfg.tunnel?.type || 'ngrok').toUpperCase()}]`,
          callback_data: "toggle_tunnel_type"
        },
        {
          text: "Download Config File",
          callback_data: "action_download_config"
        }
      ],
      [
        { text: "<< Back to Main Menu", callback_data: "nav_main" }
      ]
    ]
  };

  return { text, replyMarkup };
}

async function exportAndSendJobCsv(bot, chatId, searchId) {
  const db = getDbConnection();
  try {
    let job = null;
    if (/^\d+$/.test(searchId) && parseInt(searchId, 10) <= 50) {
      const index = parseInt(searchId, 10) - 1;
      const recentJobs = await queryAll(db, 'SELECT id, target, engine, total_saved FROM jobs ORDER BY created_at DESC LIMIT 50');
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
      await bot.sendMessage(chatId, `No search job found matching "${searchId}".`);
      return;
    }

    const leads = await queryAll(
      db,
      'SELECT title, category, phone_1, phone_2, email, website, street, city, state, country, postal_code, address, rating, reviews, place_id FROM results WHERE job_id = ?',
      [job.id]
    );

    if (leads.length === 0) {
      await bot.sendMessage(chatId, `No leads saved for search "${job.target}" yet.`);
      return;
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

    await bot.sendDocument(
      chatId,
      filename,
      csvBuffer,
      `7strokes Leads Export\nTarget: ${job.target}\nTotal: ${leads.length} leads`
    );
  } finally {
    try { db.close(); } catch (_) {}
  }
}

async function exportAllLeadsToCsv(bot, chatId) {
  const db = getDbConnection();
  try {
    await bot.sendMessage(chatId, 'Generating unique CSV export for all saved leads...');
    const rawLeads = await queryAll(
      db,
      'SELECT title, category, phone_1, phone_2, email, website, street, city, state, country, postal_code, address, rating, reviews FROM results ORDER BY id DESC'
    );

    if (rawLeads.length === 0) {
      await bot.sendMessage(chatId, 'No leads found in database.');
      return;
    }

    const seenPhones = new Set();
    const seenTitles = new Set();
    const leads = [];

    for (const row of rawLeads) {
      const cleanPhone = (row.phone_1 || '').replace(/[^\d]/g, '');
      const cleanTitle = (row.title || '').trim().toLowerCase();

      if (cleanPhone && cleanPhone.length >= 6) {
        if (seenPhones.has(cleanPhone)) continue;
        seenPhones.add(cleanPhone);
      } else if (cleanTitle) {
        const titleKey = `${cleanTitle}::${(row.city || '').toLowerCase()}`;
        if (seenTitles.has(titleKey)) continue;
        seenTitles.add(titleKey);
      }
      leads.push(row);
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
    const filename = `7strokes_all_leads_${leads.length}.csv`;

    await bot.sendDocument(
      chatId,
      filename,
      csvBuffer,
      `7strokes Complete Leads Export\nTotal Records: ${leads.length.toLocaleString()} leads`
    );
  } finally {
    try { db.close(); } catch (_) {}
  }
}

async function handleCallbackQuery(bot, query, allowedChatIds) {
  const chatId = String(query.message?.chat?.id || query.from?.id);
  const data = query.data || '';
  const messageId = query.message?.message_id;

  const isAllowed = allowedChatIds.some((id) => String(id).trim() === chatId);
  if (!isAllowed) {
    await bot.answerCallbackQuery(query.id, 'Unauthorized user.');
    return;
  }

  try {
    if (data === 'nav_main') {
      await bot.answerCallbackQuery(query.id);
      const panel = await renderMainMenu();
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data === 'nav_services') {
      await bot.answerCallbackQuery(query.id);
      const panel = await renderServicesMenu();
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data === 'nav_database') {
      await bot.answerCallbackQuery(query.id);
      const panel = await renderDatabaseMenu();
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data.startsWith('nav_leads_page_')) {
      const pageStr = data.replace('nav_leads_page_', '');
      const pageNum = parseInt(pageStr, 10) || 1;
      await bot.answerCallbackQuery(query.id);
      const panel = await renderLeadsBrowser(pageNum);
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data.startsWith('nav_searches_page_') || data === 'nav_searches') {
      const pageStr = data.replace('nav_searches_page_', '').replace('nav_searches', '1');
      const pageNum = parseInt(pageStr, 10) || 1;
      await bot.answerCallbackQuery(query.id);
      const panel = await renderSearchesMenu(pageNum);
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data === 'nav_settings') {
      await bot.answerCallbackQuery(query.id);
      const panel = renderSettingsMenu();
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data === 'action_start_all') {
      await bot.answerCallbackQuery(query.id, 'Starting all services...');
      await startAllServices();
      const panel = await renderServicesMenu();
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data === 'action_stop_all') {
      await bot.answerCallbackQuery(query.id, 'Stopping all services...');
      stopAllServices();
      const panel = await renderServicesMenu();
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data === 'action_restart_all') {
      await bot.answerCallbackQuery(query.id, 'Restarting all services...');
      await bot.sendMessage(chatId, 'Restarting all services (backend, tunnel, frontend)...');
      await restartAllServices();
      const panel = await renderServicesMenu();
      await bot.sendMessage(chatId, 'All services restarted successfully.\n\n' + panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data === 'toggle_backend') {
      const isRunning = await isBackendRunning();
      if (isRunning) {
        await bot.answerCallbackQuery(query.id, 'Stopping backend...');
        stopBackendService();
      } else {
        await bot.answerCallbackQuery(query.id, 'Starting backend...');
        await startBackendService();
      }
      const panel = await renderServicesMenu();
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data === 'toggle_tunnel') {
      const isRunning = isTunnelRunning();
      if (isRunning) {
        await bot.answerCallbackQuery(query.id, 'Stopping tunnel...');
        stopTunnelService();
      } else {
        await bot.answerCallbackQuery(query.id, 'Starting tunnel...');
        await startTunnelService();
      }
      const panel = await renderServicesMenu();
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data === 'toggle_frontend') {
      const isRunning = await isFrontendRunning();
      if (isRunning) {
        await bot.answerCallbackQuery(query.id, 'Stopping frontend...');
        stopFrontendService();
      } else {
        await bot.answerCallbackQuery(query.id, 'Starting frontend...');
        await startFrontendService();
      }
      const panel = await renderServicesMenu();
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data === 'toggle_bridge') {
      const isRunning = isBridgeRunning();
      if (isRunning) {
        await bot.answerCallbackQuery(query.id, 'Stopping bridge...');
        stopBridgeService();
      } else {
        await bot.answerCallbackQuery(query.id, 'Starting bridge...');
        await startBridgeService();
      }
      const panel = await renderServicesMenu();
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    if (data === 'action_download_all_csv') {
      await bot.answerCallbackQuery(query.id, 'Exporting all leads...');
      await exportAllLeadsToCsv(bot, chatId);
      return;
    }

    if (data === 'action_download_db') {
      await bot.answerCallbackQuery(query.id, 'Preparing database file...');
      if (!fs.existsSync(DB_PATH)) {
        await bot.sendMessage(chatId, 'Database file not found on server.');
        return;
      }
      const buffer = fs.readFileSync(DB_PATH);
      const stat = fs.statSync(DB_PATH);
      await bot.sendDocument(
        chatId,
        'dashmin.sqlite',
        buffer,
        `7strokes SQLite Database\nSize: ${formatBytes(stat.size)}\nTo restore, send this file back to this bot.`
      );
      return;
    }

    if (data === 'action_backup_db') {
      await bot.answerCallbackQuery(query.id, 'Creating backup...');
      try {
        const backupPath = await backupDatabase();
        const baseName = path.basename(backupPath);
        const stat = fs.statSync(backupPath);
        await bot.sendMessage(
          chatId,
          `Backup created successfully!\nFile: ${baseName}\nSize: ${formatBytes(stat.size)}\nPath: backups/${baseName}`
        );
      } catch (err) {
        await bot.sendMessage(chatId, `Backup failed: ${err.message}`);
      }
      return;
    }

    if (data === 'action_download_config') {
      await bot.answerCallbackQuery(query.id, 'Sending config file...');
      if (!fs.existsSync(CONFIG_PATH)) {
        await bot.sendMessage(chatId, 'Configuration file not found.');
        return;
      }
      const buffer = fs.readFileSync(CONFIG_PATH);
      await bot.sendDocument(chatId, '.7strokes-config.json', buffer, '7strokes Configuration');
      return;
    }

    if (data === 'action_db_stats') {
      await bot.answerCallbackQuery(query.id);
      const db = getDbConnection();
      try {
        const counts = (await queryAll(
          db,
          `SELECT 
            (SELECT count(*) FROM users) as users,
            (SELECT count(DISTINCT company) FROM users WHERE company IS NOT NULL AND company != '') as companies,
            (SELECT count(*) FROM jobs) as jobs,
            (SELECT count(*) FROM results) as leads`
        ))[0] || { users: 0, companies: 0, jobs: 0, leads: 0 };

        const statText = `Database Overview
------------------------------------
Total Leads Saved: ${counts.leads.toLocaleString()}
Total Searches   : ${counts.jobs}
Users            : ${counts.users}
Companies        : ${counts.companies}
------------------------------------`;
        await bot.sendMessage(chatId, statText);
      } finally {
        try { db.close(); } catch (_) {}
      }
      return;
    }

    if (data.startsWith('export_job_')) {
      const jobId = data.replace('export_job_', '');
      await bot.answerCallbackQuery(query.id, 'Exporting leads to CSV...');
      await exportAndSendJobCsv(bot, chatId, jobId);
      return;
    }

    if (data === 'toggle_tunnel_type') {
      const cfg = loadConfig();
      const current = cfg.tunnel?.type || 'ngrok';
      const nextType = current === 'ngrok' ? 'cloudflared' : 'ngrok';
      cfg.tunnel = cfg.tunnel || {};
      cfg.tunnel.type = nextType;
      saveConfig(cfg);
      await bot.answerCallbackQuery(query.id, `Tunnel changed to ${nextType}`);
      const panel = renderSettingsMenu();
      await bot.editMessageText(chatId, messageId, panel.text, { reply_markup: panel.replyMarkup });
      return;
    }

    await bot.answerCallbackQuery(query.id);
  } catch (err) {
    console.error('[!] Callback error:', err.message);
    try {
      await bot.sendMessage(chatId, `Action error: ${err.message}`);
    } catch (_) {}
  }
}

async function handleFileUpload(bot, msg, allowedChatIds) {
  const chatId = String(msg.chat.id);
  const doc = msg.document;
  if (!doc) return;

  const isAllowed = allowedChatIds.some((id) => String(id).trim() === chatId);
  if (!isAllowed) {
    await bot.sendMessage(chatId, 'Access denied. Your Chat ID is not authorized.');
    return;
  }

  const fileName = (doc.file_name || '').toLowerCase();

  if (fileName.endsWith('.sqlite') || fileName.endsWith('.db')) {
    await bot.sendMessage(chatId, `Receiving database file "${doc.file_name}" (${formatBytes(doc.file_size)})...\nCreating safety backup of current database first...`);
    try {
      const fileInfo = await bot.getFile(doc.file_id);
      if (!fileInfo || !fileInfo.ok || !fileInfo.result?.file_path) {
        throw new Error('Could not retrieve file download link from Telegram.');
      }

      const fileBuffer = await bot.downloadFile(fileInfo.result.file_path);

      let safetyBackupName = 'None';
      try {
        const safetyBackupPath = await backupDatabase();
        safetyBackupName = path.basename(safetyBackupPath);
      } catch (_) {}

      fs.writeFileSync(DB_PATH, fileBuffer);

      try {
        if (fs.existsSync(DB_PATH + '-wal')) fs.unlinkSync(DB_PATH + '-wal');
        if (fs.existsSync(DB_PATH + '-shm')) fs.unlinkSync(DB_PATH + '-shm');
      } catch (_) {}

      const newStat = fs.statSync(DB_PATH);
      await bot.sendMessage(
        chatId,
        `Database Restored Successfully!\n------------------------------------\nActive File : dashmin.sqlite\nSize        : ${formatBytes(newStat.size)}\nSafety Backup: backups/${safetyBackupName}\n\nAll services and scrapers are now using the restored database.`
      );
    } catch (err) {
      console.error('[!] Database restore error:', err.message);
      await bot.sendMessage(chatId, `Database restore failed: ${err.message}`);
    }
    return;
  }

  if (fileName.endsWith('.json') && (fileName.includes('config') || fileName.includes('7strokes'))) {
    await bot.sendMessage(chatId, `Receiving configuration file "${doc.file_name}"...`);
    try {
      const fileInfo = await bot.getFile(doc.file_id);
      if (!fileInfo || !fileInfo.ok || !fileInfo.result?.file_path) {
        throw new Error('Could not retrieve file download link from Telegram.');
      }

      const fileBuffer = await bot.downloadFile(fileInfo.result.file_path);
      const parsed = JSON.parse(fileBuffer.toString('utf8'));
      saveConfig(parsed);

      await bot.sendMessage(
        chatId,
        `Configuration Restored Successfully!\nUpdated settings have been applied to .7strokes-config.json.`
      );
    } catch (err) {
      console.error('[!] Config restore error:', err.message);
      await bot.sendMessage(chatId, `Configuration restore failed: ${err.message}`);
    }
    return;
  }

  await bot.sendMessage(chatId, `File received: ${doc.file_name}\nTo restore a database, send a .sqlite or .db file.`);
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
      case '/menu': {
        const panel = await renderMainMenu();
        await bot.sendMessage(chatId, panel.text, { reply_markup: panel.replyMarkup });
        break;
      }

      case '/services': {
        const panel = await renderServicesMenu();
        await bot.sendMessage(chatId, panel.text, { reply_markup: panel.replyMarkup });
        break;
      }

      case '/database': {
        const panel = await renderDatabaseMenu();
        await bot.sendMessage(chatId, panel.text, { reply_markup: panel.replyMarkup });
        break;
      }

      case '/leads': {
        const page = parseInt(args[0], 10) || 1;
        const panel = await renderLeadsBrowser(page);
        await bot.sendMessage(chatId, panel.text, { reply_markup: panel.replyMarkup });
        break;
      }

      case '/export_all': {
        await exportAllLeadsToCsv(bot, chatId);
        break;
      }

      case '/get_db':
      case '/download_db': {
        if (!fs.existsSync(DB_PATH)) {
          await bot.sendMessage(chatId, 'Database file not found on server.');
          break;
        }
        const buffer = fs.readFileSync(DB_PATH);
        const stat = fs.statSync(DB_PATH);
        await bot.sendDocument(
          chatId,
          'dashmin.sqlite',
          buffer,
          `7strokes SQLite Database\nSize: ${formatBytes(stat.size)}\nTo restore, send this file back to this bot.`
        );
        break;
      }

      case '/get_config': {
        if (!fs.existsSync(CONFIG_PATH)) {
          await bot.sendMessage(chatId, 'Configuration file not found.');
          break;
        }
        const buffer = fs.readFileSync(CONFIG_PATH);
        await bot.sendDocument(chatId, '.7strokes-config.json', buffer, '7strokes Configuration');
        break;
      }

      case '/start_all': {
        await bot.sendMessage(chatId, 'Starting all services...');
        await startAllServices();
        const panel = await renderServicesMenu();
        await bot.sendMessage(chatId, panel.text, { reply_markup: panel.replyMarkup });
        break;
      }

      case '/stop_all': {
        stopAllServices();
        await bot.sendMessage(chatId, 'All services stopped.');
        break;
      }

      case '/restart':
      case '/restart_all': {
        await bot.sendMessage(chatId, 'Restarting all services (backend, tunnel, frontend)...');
        await restartAllServices();
        const panel = await renderServicesMenu();
        await bot.sendMessage(chatId, 'All services restarted successfully.\n\n' + panel.text, { reply_markup: panel.replyMarkup });
        break;
      }

      case '/start_backend': {
        const res = await startBackendService();
        await bot.sendMessage(chatId, res.message);
        break;
      }

      case '/stop_backend': {
        const res = stopBackendService();
        await bot.sendMessage(chatId, res.message);
        break;
      }

      case '/start_tunnel': {
        await bot.sendMessage(chatId, 'Connecting tunnel...');
        const res = await startTunnelService();
        await bot.sendMessage(chatId, res.message);
        break;
      }

      case '/stop_tunnel': {
        const res = stopTunnelService();
        await bot.sendMessage(chatId, res.message);
        break;
      }

      case '/start_frontend': {
        const res = await startFrontendService();
        await bot.sendMessage(chatId, res.message);
        break;
      }

      case '/stop_frontend': {
        const res = stopFrontendService();
        await bot.sendMessage(chatId, res.message);
        break;
      }

      case '/start_bridge': {
        const res = await startBridgeService();
        await bot.sendMessage(chatId, res.message);
        break;
      }

      case '/stop_bridge': {
        const res = stopBridgeService();
        await bot.sendMessage(chatId, res.message);
        break;
      }

      case '/status': {
        const status = await getServicesStatus();
        const uptimeMins = Math.floor(process.uptime() / 60);
        const memMb = Math.round(process.memoryUsage().rss / 1024 / 1024);

        const counts = (await queryAll(
          db,
          `SELECT 
            (SELECT count(*) FROM results) as total_leads,
            (SELECT count(*) FROM jobs) as total_jobs,
            (SELECT count(*) FROM jobs WHERE status = 'running') as running_jobs`
        ))[0] || { total_leads: 0, total_jobs: 0, running_jobs: 0 };

        const statusMsg = `7strokes Status
------------------------------------
Backend   : ${status.backend ? `Running on port ${status.backendPort}` : 'Stopped'}
Tunnel    : ${status.tunnel ? (status.tunnelUrl || 'Active') : 'Stopped'}
Frontend  : ${status.frontend ? `Running on port ${status.frontendPort}` : 'Stopped'}
DNS Bridge: ${status.bridge ? 'Active' : 'Stopped'}
------------------------------------
Total Leads Saved: ${counts.total_leads.toLocaleString()}
Total Searches   : ${counts.total_jobs}
Running Searches : ${counts.running_jobs}
Uptime           : ${uptimeMins} minutes
Memory Usage     : ${memMb} MB
------------------------------------`;
        await bot.sendMessage(chatId, statusMsg);
        break;
      }

      case '/link':
      case '/tunnel': {
        const status = await getServicesStatus();
        if (status.tunnelUrl) {
          await bot.sendMessage(
            chatId,
            `Web Dashboard Link:\n${status.tunnelUrl}\n\nOpen this link in your browser to view and manage leads.`
          );
        } else {
          await bot.sendMessage(
            chatId,
            `No public link active right now.\nTap "Tunnel" on /menu or run /start_tunnel to connect.`
          );
        }
        break;
      }

      case '/backup': {
        await bot.sendMessage(chatId, 'Creating database backup...');
        try {
          const backupPath = await backupDatabase();
          const baseName = path.basename(backupPath);
          await bot.sendMessage(chatId, `Backup created successfully!\nFile: ${baseName}\nPath: backups/${baseName}`);
        } catch (err) {
          await bot.sendMessage(chatId, `Backup error: ${err.message}`);
        }
        break;
      }

      case '/config':
      case '/settings': {
        const panel = renderSettingsMenu();
        await bot.sendMessage(chatId, panel.text, { reply_markup: panel.replyMarkup });
        break;
      }

      case '/set_port': {
        const newPort = parseInt(args[0], 10);
        if (isNaN(newPort) || newPort < 1000 || newPort > 65535) {
          await bot.sendMessage(chatId, 'Please enter a valid port number (e.g. /set_port 4000).');
          break;
        }
        const cfg = loadConfig();
        cfg.backendPort = newPort;
        saveConfig(cfg);
        await bot.sendMessage(chatId, `Backend port updated to ${newPort}.`);
        break;
      }

      case '/set_ngrok': {
        const token = (args[0] || '').trim();
        if (!token) {
          await bot.sendMessage(chatId, 'Usage: /set_ngrok <token>\nExample: /set_ngrok 2Nxxx_abcdef123');
          break;
        }
        const cfg = loadConfig();
        cfg.tunnel = { ...cfg.tunnel, authtoken: token, type: 'ngrok' };
        saveConfig(cfg);
        await bot.sendMessage(chatId, 'Ngrok authtoken saved successfully.');
        break;
      }

      case '/set_domain': {
        const domain = (args[0] || '').trim();
        const cfg = loadConfig();
        cfg.tunnel = { ...cfg.tunnel, domain: domain };
        saveConfig(cfg);
        await bot.sendMessage(chatId, `Ngrok domain updated to: ${domain || 'Random'}.`);
        break;
      }

      case '/set_tunnel': {
        const tType = (args[0] || '').toLowerCase().trim();
        if (tType !== 'ngrok' && tType !== 'cloudflared') {
          await bot.sendMessage(chatId, 'Usage: /set_tunnel ngrok OR /set_tunnel cloudflared');
          break;
        }
        const cfg = loadConfig();
        cfg.tunnel = { ...cfg.tunnel, type: tType };
        saveConfig(cfg);
        await bot.sendMessage(chatId, `Tunnel type set to: ${tType}.`);
        break;
      }

      case '/add_chat': {
        const newChat = (args[0] || '').trim();
        if (!newChat) {
          await bot.sendMessage(chatId, 'Usage: /add_chat <user_id>');
          break;
        }
        const cfg = loadConfig();
        cfg.telegram = cfg.telegram || {};
        cfg.telegram.allowedChatIds = cfg.telegram.allowedChatIds || [];
        if (!cfg.telegram.allowedChatIds.includes(newChat)) {
          cfg.telegram.allowedChatIds.push(newChat);
          saveConfig(cfg);
          await bot.sendMessage(chatId, `Added Chat ID ${newChat} to allowed list.`);
        } else {
          await bot.sendMessage(chatId, `Chat ID ${newChat} is already in the allowed list.`);
        }
        break;
      }

      case '/remove_chat': {
        const removeId = (args[0] || '').trim();
        if (!removeId) {
          await bot.sendMessage(chatId, 'Usage: /remove_chat <user_id>');
          break;
        }
        const cfg = loadConfig();
        cfg.telegram = cfg.telegram || {};
        cfg.telegram.allowedChatIds = (cfg.telegram.allowedChatIds || []).filter((id) => id !== removeId);
        saveConfig(cfg);
        await bot.sendMessage(chatId, `Removed Chat ID ${removeId} from allowed list.`);
        break;
      }

      case '/jobs': {
        const page = parseInt(args[0], 10) || 1;
        const panel = await renderSearchesMenu(page);
        await bot.sendMessage(chatId, panel.text, { reply_markup: panel.replyMarkup });
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
          await bot.sendMessage(chatId, 'To export leads, type:\n/export <job_id>\nType /jobs to view recent searches.');
          break;
        }
        await exportAndSendJobCsv(bot, chatId, searchId);
        break;
      }

      case '/help': {
        const helpText = `7strokes Commands Manual
------------------------------------
MENUS & CONTROL:
/menu or /start - Main control panel
/services - Services sub-menu (start/stop)
/restart - Restart all services (backend, tunnel, frontend)
/database - Database sub-menu (stats, download, restore)
/leads [page] - Browse all leads page by page
/jobs [page] - Browse searches with one-tap CSV download buttons
/config - Settings & allowed users

DOWNLOADS & BACKUPS:
/export_all - Download complete CSV of ALL leads in database
/export <id> - Download CSV of a specific search
/get_db - Download SQLite database file to Telegram
/get_config - Download .7strokes-config.json
/backup - Trigger instant backup to backups/
RESTORE: Send any .sqlite or .db file to this chat!

SEARCH & LEADS:
/search <query> [limit] - Start scraping leads
/status - Live server and database metrics
/link - Get public dashboard link

REMOTE CONFIG:
/set_port <number> - Change backend port
/set_ngrok <token> - Set ngrok token
/set_domain <domain> - Set custom domain
/set_tunnel <ngrok|cloudflared> - Change tunnel
/add_chat <id> - Add allowed user
/remove_chat <id> - Remove allowed user
------------------------------------`;
        await bot.sendMessage(chatId, helpText);
        break;
      }

      default:
        await bot.sendMessage(chatId, `Unknown command: ${command}\nType /menu to open the control panel or /help for commands.`);
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
  console.log('Send /menu or /start to your bot in Telegram.');
  console.log('Press Ctrl+C to stop.\n');

  bot.isRunning = true;

  if (config.telegram.notifyOnStart) {
    for (const chatId of allowedChatIds) {
      try {
        const panel = await renderMainMenu();
        await bot.sendMessage(
          chatId,
          `7strokes is ready!\nSend /menu anytime to open the control panel.`,
          { reply_markup: panel.replyMarkup }
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
            if (update.callback_query) {
              await handleCallbackQuery(bot, update.callback_query, allowedChatIds);
            } else if (update.message) {
              if (update.message.document) {
                await handleFileUpload(bot, update.message, allowedChatIds);
              } else if (update.message.text) {
                await handleCommand(bot, update.message, allowedChatIds);
              }
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
