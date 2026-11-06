import { Router, Response } from 'express';
import { query } from '../db';
import { AuthRequest, authMiddleware } from '../middlewares/auth';
import { COLUMN_DEFINITIONS } from './jobs';

const router = Router();
router.use(authMiddleware);

/**
 * Identity of a business across extractions: its Google / 2GIS place id, or
 * name + phone when a listing has no id.
 */
const KEY = (alias: string) =>
  `COALESCE(NULLIF(${alias}.place_id, ''), LOWER(TRIM(${alias}.title)) || '|' || COALESCE(${alias}.phone_1, ''))`;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const nextDay = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);

const paging = (req: AuthRequest) => ({
  limit: Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 5000),
  offset: Math.max(parseInt(req.query.offset as string) || 0, 0)
});

function searchClause(alias: string, q: string, params: any[]): string {
  if (!q) return '';
  params.push(`%${q.toLowerCase()}%`);
  const p = `$${params.length}`;
  return ` AND (LOWER(${alias}.title) LIKE ${p} OR LOWER(COALESCE(${alias}.phone_1, '')) LIKE ${p}`
    + ` OR LOWER(COALESCE(${alias}.address, '')) LIKE ${p} OR LOWER(COALESCE(${alias}.category, '')) LIKE ${p})`;
}

function sendCsv(res: Response, rows: any[], filename: string) {
  const cols: [string, string][] = [['first_seen', 'First Seen'], ['job_target', 'Found In Search'], ['job_engine', 'Source'],
    ...Object.entries(COLUMN_DEFINITIONS)];
  const esc = (v: any) => `"${(v === null || v === undefined ? '' : String(v)).replace(/"/g, '""')}"`;
  const csv = [cols.map(c => esc(c[1])).join(','), ...rows.map(r => cols.map(([k]) => esc(r[k])).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
}

/**
 * GET /api/leads/new?from=2026-11-01&to=2026-11-30&engine=gmaps&target=dubai&q=
 *
 * Businesses seen for the FIRST time in the date range: they appear in a
 * search run in that period and in none of your earlier searches (matching the
 * same engine / search-text filter). "Previously known" counts the businesses
 * already found before the range.
 */
router.get('/new', async (req: AuthRequest, res) => {
  try {
    const from = typeof req.query.from === 'string' && DAY.test(req.query.from) ? req.query.from : null;
    const to = typeof req.query.to === 'string' && DAY.test(req.query.to) ? req.query.to : null;
    if (!from || !to) return res.status(400).json({ error: 'from and to dates (YYYY-MM-DD) are required' });

    const engine = req.query.engine === 'gmaps' || req.query.engine === '2gis' ? req.query.engine : null;
    const target = typeof req.query.target === 'string' ? req.query.target.trim().toLowerCase() : '';
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const { limit, offset } = paging(req);
    const csv = req.query.format === 'csv';

    // Universe: this user's results (optionally one engine / searches whose text matches).
    const params: any[] = [req.user?.id];
    let universe = 'WHERE j.user_id = $1';
    if (engine) { params.push(engine); universe += ` AND j.engine = $${params.length}`; }
    if (target) { params.push(`%${target}%`); universe += ` AND LOWER(j.target) LIKE $${params.length}`; }

    const firsts = `
      SELECT r.*, j.engine AS job_engine, j.target AS job_target, r.created_at AS first_seen,
             ROW_NUMBER() OVER (PARTITION BY ${KEY('r')} ORDER BY r.created_at ASC, r.id ASC) AS rn
      FROM results r JOIN jobs j ON r.job_id = j.id
      ${universe}`;

    params.push(from);
    const fromP = `$${params.length}`;
    params.push(nextDay(to));
    const toP = `$${params.length}`;
    const searchP = [...params];
    const search = searchClause('x', q, searchP);

    const where = `WHERE x.rn = 1 AND x.created_at >= ${fromP} AND x.created_at < ${toP}${search}`;
    const rowsSql = `SELECT * FROM (${firsts}) x ${where} ORDER BY x.created_at DESC, x.id ASC`
      + (csv ? '' : ` LIMIT $${searchP.length + 1} OFFSET $${searchP.length + 2}`);
    const rows = await query(rowsSql, csv ? searchP : [...searchP, limit, offset]);

    if (csv) return sendCsv(res, rows.rows, `new_listings_${from}_to_${to}.csv`);

    const totalRes = await query(`SELECT COUNT(*) AS count FROM (${firsts}) x ${where}`, searchP);
    const beforeRes = await query(
      `SELECT COUNT(*) AS count FROM (${firsts}) x WHERE x.rn = 1 AND x.created_at < ${fromP}`,
      params.slice(0, params.length - 1)
    );
    const daysRes = await query(
      `SELECT DATE(x.created_at) AS day, COUNT(*) AS count FROM (${firsts}) x ${where} GROUP BY DATE(x.created_at) ORDER BY day`,
      searchP
    );

    res.json({
      rows: rows.rows,
      total: Number(totalRes.rows[0]?.count || 0),
      previouslyKnown: Number(beforeRes.rows[0]?.count || 0),
      byDay: daysRes.rows.map((d: any) => ({
        day: d.day instanceof Date ? d.day.toISOString().slice(0, 10) : String(d.day).slice(0, 10),
        count: Number(d.count) || 0
      })),
      limit,
      offset
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load new listings' });
  }
});

/**
 * GET /api/leads/compare?baseline=<older job id>&current=<newer job id>&show=new|removed
 *
 * Side-by-side comparison of two extractions (e.g. July vs November):
 * new = in the newer search but not the older one; removed = the reverse.
 */
router.get('/compare', async (req: AuthRequest, res) => {
  try {
    const baseline = String(req.query.baseline || '');
    const current = String(req.query.current || '');
    if (!baseline || !current || baseline === current) {
      return res.status(400).json({ error: 'Pick two different extractions to compare' });
    }
    const own = await query('SELECT id, target, engine, created_at FROM jobs WHERE user_id = $1 AND id IN ($2, $3)', [req.user?.id, baseline, current]);
    if (own.rows.length !== 2) return res.status(404).json({ error: 'Extraction not found' });

    const show = req.query.show === 'removed' ? 'removed' : 'new';
    const [mainJob, otherJob] = show === 'new' ? [current, baseline] : [baseline, current];
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const { limit, offset } = paging(req);
    const csv = req.query.format === 'csv';

    const params: any[] = [mainJob, otherJob];
    const search = searchClause('r', q, params);
    const base = `
      FROM results r JOIN jobs j ON r.job_id = j.id
      WHERE r.job_id = $1
        AND ${KEY('r')} NOT IN (SELECT ${KEY('b')} FROM results b WHERE b.job_id = $2)${search}`;

    const rows = await query(
      `SELECT r.*, j.engine AS job_engine, j.target AS job_target, r.created_at AS first_seen ${base} ORDER BY r.created_at ASC, r.id ASC`
        + (csv ? '' : ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`),
      csv ? params : [...params, limit, offset]
    );
    if (csv) return sendCsv(res, rows.rows, `${show}_listings_comparison.csv`);

    const count = async (a: string, b: string, negate: boolean) => {
      const r = await query(
        `SELECT COUNT(*) AS count FROM results r WHERE r.job_id = $1 AND ${KEY('r')} ${negate ? 'NOT IN' : 'IN'} (SELECT ${KEY('b')} FROM results b WHERE b.job_id = $2)`,
        [a, b]
      );
      return Number(r.rows[0]?.count || 0);
    };
    const totalRes = await query(`SELECT COUNT(*) AS count ${base}`, params);

    res.json({
      rows: rows.rows,
      total: Number(totalRes.rows[0]?.count || 0),
      counts: {
        added: await count(current, baseline, true),
        removed: await count(baseline, current, true),
        unchanged: await count(current, baseline, false)
      },
      limit,
      offset
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compare extractions' });
  }
});

export default router;
