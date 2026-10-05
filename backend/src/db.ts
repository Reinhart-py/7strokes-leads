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
    sqliteDb?.run(`
      INSERT OR IGNORE INTO users (id, email, password_hash, name, role, status)
      VALUES (
        'admin-001',
        'admin@dashmin.local',
        '$2b$10$g/RU8afy27qTA/X6azjiO.K3PaeSFb5zYrvookDPnBJ3eEvTAg1e6',
        'Administrator',
        'admin',
        'active'
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
    let sqliteSql = text
      .replace(/NOW\(\)/gi, "datetime('now')")
      .replace(/CURRENT_TIMESTAMP/gi, "datetime('now')")
      .replace(/uuid_generate_v4\(\)/gi, `'${generateUuid()}'`)
      .replace(/\$(\d+)/g, '?');

    const insertMatch = sqliteSql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]*)\)\s*VALUES\s*\(([^)]*)\)/i);
    const hasReturning = /RETURNING\s+(.+)$/i.test(sqliteSql);

    let generatedId = generateUuid();
    if (insertMatch) {
      const colList = insertMatch[2].split(',').map(c => c.trim().toLowerCase());
      if (!colList.includes('id')) {
        sqliteSql = sqliteSql.replace(insertMatch[0], `INSERT INTO ${insertMatch[1]} (id, ${insertMatch[2]}) VALUES (?, ${insertMatch[3]})`);
        params = [generatedId, ...params];
      }
    }

    if (hasReturning) {
      sqliteSql = sqliteSql.replace(/\s+RETURNING\s+.+$/i, '');
    }

    const trimmed = sqliteSql.trim().toUpperCase();

    if (trimmed.startsWith('SELECT')) {
      sqliteDb?.all(sqliteSql, params, (err, rows) => {
        if (err) return reject(err);
        resolve({ rows: rows || [], rowCount: (rows || []).length });
      });
    } else {
      sqliteDb?.run(sqliteSql, params, function (this: sqlite3.RunResult, err) {
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
