const fs = require('fs');
const path = require('path');
const sqlite3 = require('../backend/node_modules/sqlite3');

const DB_PATH = path.join(__dirname, '../dashmin.sqlite');
const BACKUPS_DIR = path.join(__dirname, '../backups');

function getDbConnection() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database file not found at ${DB_PATH}. Run the backend first to initialize it.`);
  }
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

function isMobileOrTermux() {
  const isAndroid = process.platform === 'android';
  const isTermux = Boolean(process.env.PREFIX && process.env.PREFIX.includes('com.termux'));
  const isNarrow = (process.stdout.columns || 80) < 85;
  return isAndroid || isTermux || isNarrow;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function viewDatabase() {
  const db = getDbConnection();
  const mobile = isMobileOrTermux();

  try {
    const stat = fs.statSync(DB_PATH);
    const dbSize = formatBytes(stat.size);

    const counts = (await queryAll(
      db,
      `SELECT 
        (SELECT count(*) FROM users) as total_users,
        (SELECT count(DISTINCT company) FROM users WHERE company IS NOT NULL AND company != '') as total_companies,
        (SELECT count(*) FROM jobs) as total_jobs,
        (SELECT count(*) FROM results) as total_leads`
    ))[0] || { total_users: 0, total_companies: 0, total_jobs: 0, total_leads: 0 };

    const companyStats = await queryAll(
      db,
      `SELECT 
        COALESCE(u.company, 'Unassigned') as company,
        COUNT(DISTINCT CASE WHEN u.role = 'manager' THEN u.id END) as managers_count,
        COUNT(DISTINCT CASE WHEN u.role = 'user' THEN u.id END) as users_count,
        COUNT(DISTINCT j.id) as jobs_count,
        COALESCE(SUM(j.total_saved), 0) as leads_count
      FROM users u
      LEFT JOIN jobs j ON j.user_id = u.id
      GROUP BY COALESCE(u.company, 'Unassigned')
      ORDER BY leads_count DESC`
    );

    const recentJobs = await queryAll(
      db,
      `SELECT id, engine, target, status, total_saved, cap, created_at 
       FROM jobs 
       ORDER BY created_at DESC 
       LIMIT 6`
    );

    const usersList = await queryAll(
      db,
      `SELECT id, name, username, email, role, company, status, created_at 
       FROM users 
       ORDER BY created_at ASC`
    );

    if (mobile) {
      console.log('\n===========================================');
      console.log('   7STROKES DATABASE (Mobile/Termux View)  ');
      console.log('===========================================');
      console.log(`- File: dashmin.sqlite (${dbSize})`);
      console.log(`- Total Leads Scraped : ${counts.total_leads.toLocaleString()}`);
      console.log(`- Total Scraping Jobs : ${counts.total_jobs}`);
      console.log(`- Total Users         : ${counts.total_users}`);
      console.log(`- Total Companies     : ${counts.total_companies}`);
      console.log('-------------------------------------------');

      console.log('\nCOMPANIES:');
      if (companyStats.length === 0) {
        console.log('  (No companies created yet)');
      } else {
        companyStats.forEach((c) => {
          console.log(`* ${c.company}`);
          console.log(`  Managers: ${c.managers_count} | Users: ${c.users_count} | Leads: ${c.leads_count.toLocaleString()}`);
        });
      }

      console.log('\nRECENT SEARCHES:');
      if (recentJobs.length === 0) {
        console.log('  (No searches executed yet)');
      } else {
        recentJobs.forEach((j, i) => {
          const shortId = j.id ? j.id.slice(0, 8) : 'unknown';
          console.log(`[${i + 1}] ${j.target} (${j.engine.toUpperCase()})`);
          console.log(`    Status: ${j.status} | Leads: ${j.total_saved}/${j.cap || 'none'} | ID: ${shortId}`);
        });
      }

      console.log('\nTEAM MEMBERS:');
      usersList.forEach((u) => {
        const handle = u.username ? `@${u.username}` : u.email;
        console.log(`- ${u.name || 'User'} (${handle})`);
        console.log(`  Role: [${u.role.toUpperCase()}] | Company: ${u.company || 'None'} | Status: ${u.status}`);
      });
      console.log('===========================================\n');
    } else {
      console.log('\n' + '='.repeat(76));
      console.log('                  7STROKES DATABASE OVERVIEW (DESKTOP)   ');
      console.log('='.repeat(76));
      console.log(`Database File : ${DB_PATH}`);
      console.log(`Database Size : ${dbSize}`);
      console.log(`Total Leads   : ${counts.total_leads.toLocaleString()} | Total Jobs: ${counts.total_jobs} | Users: ${counts.total_users} | Companies: ${counts.total_companies}`);
      console.log('-'.repeat(76));

      console.log('\nCOMPANY BREAKDOWN:');
      console.table(
        companyStats.map((c) => ({
          Company: c.company,
          Managers: c.managers_count,
          Users: c.users_count,
          Jobs: c.jobs_count,
          Leads: c.leads_count.toLocaleString()
        }))
      );

      console.log('\nRECENT SEARCH JOBS:');
      console.table(
        recentJobs.map((j) => ({
          'Job ID': j.id.slice(0, 8),
          Source: j.engine,
          Target: j.target.slice(0, 30),
          Status: j.status,
          Leads: `${j.total_saved}/${j.cap || 'none'}`,
          Created: j.created_at
        }))
      );

      console.log('\nREGISTERED USERS:');
      console.table(
        usersList.map((u) => ({
          Name: u.name || '-',
          Username: u.username || '-',
          Email: u.email,
          Role: u.role,
          Company: u.company || '-',
          Status: u.status
        }))
      );
      console.log('='.repeat(76) + '\n');
    }
  } finally {
    db.close();
  }
}

async function backupDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    throw new Error(`Database ${DB_PATH} does not exist.`);
  }

  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupFileName = `7strokes-backup-${timestamp}.sqlite`;
  const backupFilePath = path.join(BACKUPS_DIR, backupFileName);

  fs.copyFileSync(DB_PATH, backupFilePath);

  const walPath = DB_PATH + '-wal';
  if (fs.existsSync(walPath)) {
    try { fs.copyFileSync(walPath, backupFilePath + '-wal'); } catch (_) {}
  }

  const stat = fs.statSync(backupFilePath);
  console.log('\n[+] Database Backup Created Successfully!');
  console.log(`File      : ${backupFilePath}`);
  console.log(`Size      : ${formatBytes(stat.size)}`);
  console.log(`Timestamp : ${now.toLocaleString()}\n`);

  return backupFilePath;
}

async function restoreDatabase(sourcePath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error(`Backup file not found at: ${sourcePath}`);
  }

  console.log('[*] Creating temporary safety backup before restore...');
  await backupDatabase();

  fs.copyFileSync(sourcePath, DB_PATH);

  try {
    if (fs.existsSync(DB_PATH + '-wal')) fs.unlinkSync(DB_PATH + '-wal');
    if (fs.existsSync(DB_PATH + '-shm')) fs.unlinkSync(DB_PATH + '-shm');
  } catch (_) {}

  console.log(`\n[+] Database Restored Successfully from: ${sourcePath}`);
  console.log('[*] Run "fk db view" to inspect the restored database.\n');
}

module.exports = {
  viewDatabase,
  backupDatabase,
  restoreDatabase
};
