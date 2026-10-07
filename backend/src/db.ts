import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

let isPgHealthy = false;
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/dashmin',
  connectionTimeoutMillis: 2000
});

pgPool.connect().then(client => {
  isPgHealthy = true;
  client.release();
  console.log('Connected to PostgreSQL database');
}).catch(() => {
  isPgHealthy = false;
  console.log('PostgreSQL offline. Falling back to local SQLite database: dashmin.sqlite');
  initSqlite();
});

const sqliteDbPath = path.join(__dirname, '../../dashmin.sqlite');
let sqliteDb: sqlite3.Database | null = null;

function initSqlite() {
  sqliteDb = new sqlite3.Database(sqliteDbPath);
  sqliteDb.serialize(() => {
    sqliteDb?.run('PRAGMA journal_mode = WAL;');
    sqliteDb?.run('PRAGMA busy_timeout = 10000;');
    sqliteDb?.run('PRAGMA synchronous = NORMAL;');
    sqliteDb?.run('PRAGMA cache_size = -64000;');
    sqliteDb?.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME
      )
    `);
    sqliteDb?.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        engine TEXT NOT NULL,
        target TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        total_saved INTEGER DEFAULT 0,
        cap INTEGER DEFAULT 0,
        last_step INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    sqliteDb?.run(`
      CREATE TABLE IF NOT EXISTS results (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        query TEXT,
        place_id TEXT,
        title TEXT,
        category TEXT,
        categories TEXT,
        phone_1 TEXT,
        phone_2 TEXT,
        email TEXT,
        website TEXT,
        address TEXT,
        street TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        postal_code TEXT,
        rating TEXT,
        reviews TEXT,
        price_level TEXT,
        status TEXT,
        latitude TEXT,
        longitude TEXT,
        plus_code TEXT,
        timezone TEXT,
        opening_hours TEXT,
        social_links TEXT,
        extra_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    sqliteDb?.run(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_results_job_place ON results(job_id, place_id) WHERE place_id IS NOT NULL
    `);
    sqliteDb?.run('ALTER TABLE results ADD COLUMN street TEXT', () => {});
    sqliteDb?.run('ALTER TABLE users ADD COLUMN can_use_proxy INTEGER DEFAULT 0', () => {});
    sqliteDb?.run('ALTER TABLE users ADD COLUMN custom_proxy TEXT', () => {});
    sqliteDb?.run('ALTER TABLE users ADD COLUMN username TEXT', () => {});
    sqliteDb?.run('ALTER TABLE users ADD COLUMN avatar TEXT', () => {});
    sqliteDb?.run('ALTER TABLE users ADD COLUMN company TEXT', () => {});
    sqliteDb?.run('ALTER TABLE users ADD COLUMN manager_id TEXT', () => {});
    sqliteDb?.run("UPDATE users SET username = 'admin' WHERE id = 'admin-001' AND (username IS NULL OR username = '')", () => {});
    sqliteDb?.run('ALTER TABLE jobs ADD COLUMN proxy_url TEXT', () => {});
    sqliteDb?.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
    sqliteDb?.run(`
      INSERT OR IGNORE INTO users (id, email, password_hash, name, role, status, username)
      VALUES (
        'admin-001',
        'admin@dashmin.local',
        '$2b$10$g/RU8afy27qTA/X6azjiO.K3PaeSFb5zYrvookDPnBJ3eEvTAg1e6',
        'Administrator',
        'admin',
        'active',
        'admin'
      )
    `);
  });
}

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function query(text: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
  if (isPgHealthy) {
    try {
      const res = await pgPool.query(text, params);
      return { rows: res.rows, rowCount: res.rowCount || 0 };
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        isPgHealthy = false;
        if (!sqliteDb) initSqlite();
      } else {
        throw err;
      }
    }
  }

  if (!sqliteDb) {
    initSqlite();
  }

  return new Promise((resolve, reject) => {
    let finalParams = [...params];
    const hasIndexedParams = /\$\d+/.test(text);
    if (hasIndexedParams) {
      finalParams = [];
    }

    let sqliteSql = text
      .replace(/NOW\(\)/gi, "datetime('now')")
      .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
      .replace(/uuid_generate_v4\(\)/gi, `'${generateUuid()}'`)
      .replace(/\$(\d+)/g, (_, idx) => {
        const num = parseInt(idx, 10) - 1;
        finalParams.push(params[num]);
        return '?';
      });

    const insertMatch = sqliteSql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)/i);
    const hasReturning = /RETURNING\s+(.+)$/i.test(sqliteSql);

    let generatedId = generateUuid();
    if (insertMatch) {
      const tbl = insertMatch[1].trim().toLowerCase();
      const colList = insertMatch[2].split(',').map(c => c.trim().toLowerCase());
      if (tbl !== 'settings' && !colList.includes('id')) {
        sqliteSql = sqliteSql.replace(insertMatch[0], `INSERT INTO ${insertMatch[1]} (id, ${insertMatch[2]}) VALUES (?, ${insertMatch[3]})`);
        finalParams = [generatedId, ...finalParams];
      }
    }

    if (hasReturning) {
      sqliteSql = sqliteSql.replace(/\s+RETURNING\s+.+$/i, '');
    }

    const trimmed = sqliteSql.trim().toUpperCase();

    if (trimmed.startsWith('SELECT')) {
      sqliteDb?.all(sqliteSql, finalParams, (err, rows) => {
        if (err) return reject(err);
        resolve({ rows: rows || [], rowCount: (rows || []).length });
      });
    } else {
      sqliteDb?.run(sqliteSql, finalParams, function (this: sqlite3.RunResult, err) {
        if (err) return reject(err);
        const returningRow: any = { id: generatedId };
        if (insertMatch) {
          const rawCols = insertMatch[2].split(',').map(c => c.trim());
          const offset = rawCols.some(c => c.toLowerCase() === 'id') ? 0 : 1;
          rawCols.forEach((col, idx) => {
            returningRow[col] = params[idx + offset];
          });
          returningRow.status = returningRow.status || 'pending';
          returningRow.total_saved = 0;
          returningRow.cap = returningRow.cap || 0;
        }
        resolve({ rows: [returningRow], rowCount: this.changes || 1 });
      });
    }
  });
}
