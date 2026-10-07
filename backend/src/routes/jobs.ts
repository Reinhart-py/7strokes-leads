import { Router } from 'express';
import * as XLSX from 'xlsx';
import { query } from '../db';
import { AuthRequest, authMiddleware } from '../middlewares/auth';
import { addScraperJob } from '../queue';

const router = Router();

router.use(authMiddleware);

const COLUMN_DEFINITIONS: Record<string, string> = {
  title: 'Business Name',
  category: 'Category',
  categories: 'All Categories',
  phone_1: 'Primary Phone',
  phone_2: 'Secondary Phone',
  email: 'Email',
  website: 'Website',
  street: 'Street',
  city: 'City',
  state: 'State',
  country: 'Country',
  postal_code: 'Postal Code',
  address: 'Full Address',
  rating: 'Rating',
  reviews: 'Reviews Count',
  price_level: 'Price Level',
  status: 'Operational Status',
  latitude: 'Latitude',
  longitude: 'Longitude',
  plus_code: 'Plus Code',
  timezone: 'Timezone',
  opening_hours: 'Opening Hours',
  place_id: 'Place ID',
  query: 'Search Query'
};

function escapeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getFilteredRows(rawRows: any[], requestedColumns?: string): { headers: string[]; keys: string[]; data: any[] } {
  let activeKeys = Object.keys(COLUMN_DEFINITIONS);
  if (requestedColumns && typeof requestedColumns === 'string') {
    const selected = requestedColumns.split(',').map(s => s.trim().toLowerCase());
    const valid = activeKeys.filter(k => selected.includes(k));
    if (valid.length > 0) {
      activeKeys = valid;
    }
  }

  const headers = activeKeys.map(k => COLUMN_DEFINITIONS[k]);
  const data = rawRows.map(row => {
    const obj: Record<string, any> = {};
    for (const key of activeKeys) {
      obj[COLUMN_DEFINITIONS[key]] = row[key] !== null && row[key] !== undefined ? String(row[key]) : '';
    }
    return obj;
  });

  return { headers, keys: activeKeys, data };
}

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { engine, target, cap, proxy } = req.body;
    const userId = req.user?.id;

    let effectiveProxy = '';
    const userRes = await query('SELECT role, can_use_proxy, custom_proxy FROM users WHERE id = $1', [userId]);
    const userObj = userRes.rows[0];

    if (userObj?.role === 'admin' || userObj?.can_use_proxy === 1) {
      if (proxy && typeof proxy === 'string' && proxy.trim().length > 0) {
        effectiveProxy = proxy.trim();
      } else if (userObj?.custom_proxy) {
        effectiveProxy = userObj.custom_proxy;
      }
    }

    if (!effectiveProxy) {
      const sysProxyRes = await query("SELECT value FROM settings WHERE key = 'system_proxy_url'");
      const sysEnabledRes = await query("SELECT value FROM settings WHERE key = 'system_proxy_enabled'");
      if (sysEnabledRes.rows[0]?.value === 'true' && sysProxyRes.rows[0]?.value) {
        effectiveProxy = sysProxyRes.rows[0].value;
      }
    }

    const result = await query(
      'INSERT INTO jobs (user_id, engine, target, cap, proxy_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, engine, target, cap || 0, effectiveProxy || null]
    );
    const job = result.rows[0];

    await addScraperJob(job.id, engine, target, cap, userId as string, effectiveProxy || undefined);

    res.json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/batch', async (req: AuthRequest, res) => {
  try {
    const { engine = 'gmaps', queries, cap, proxy } = req.body;
    const userId = req.user?.id;

    if (!Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({ error: 'Queries list must be a non-empty array' });
    }

    let effectiveProxy = '';
    const userRes = await query('SELECT role, can_use_proxy, custom_proxy FROM users WHERE id = $1', [userId]);
    const userObj = userRes.rows[0];

    if (userObj?.role === 'admin' || userObj?.can_use_proxy === 1) {
      if (proxy && typeof proxy === 'string' && proxy.trim().length > 0) {
        effectiveProxy = proxy.trim();
      } else if (userObj?.custom_proxy) {
        effectiveProxy = userObj.custom_proxy;
      }
    }

    if (!effectiveProxy) {
      const sysProxyRes = await query("SELECT value FROM settings WHERE key = 'system_proxy_url'");
      const sysEnabledRes = await query("SELECT value FROM settings WHERE key = 'system_proxy_enabled'");
      if (sysEnabledRes.rows[0]?.value === 'true' && sysProxyRes.rows[0]?.value) {
        effectiveProxy = sysProxyRes.rows[0].value;
      }
    }

    const createdJobs = [];
    for (const targetQuery of queries) {
      const trimmed = typeof targetQuery === 'string' ? targetQuery.trim() : '';
      if (!trimmed) continue;

      const result = await query(
        'INSERT INTO jobs (user_id, engine, target, cap, proxy_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [userId, engine, trimmed, cap || 0, effectiveProxy || null]
      );
      const job = result.rows[0];
      await addScraperJob(job.id, engine, trimmed, cap, userId as string, effectiveProxy || undefined);
      createdJobs.push(job);
    }

    res.json({ success: true, count: createdJobs.length, jobs: createdJobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM jobs WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user?.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/columns', async (_req, res) => {
  res.json(COLUMN_DEFINITIONS);
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT * FROM jobs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user?.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/:id/results', async (req: AuthRequest, res) => {
  try {
    const jobCheck = await query(
      'SELECT id FROM jobs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user?.id]
    );
    if (jobCheck.rowCount === 0) return res.status(404).json({ error: 'Job not found' });

    const limit = parseInt(req.query.limit as string) || 200;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await query(
      'SELECT * FROM results WHERE job_id = $1 ORDER BY created_at ASC LIMIT $2 OFFSET $3',
      [req.params.id, limit, offset]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/:id/stop', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'UPDATE jobs SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      ['stopped', req.params.id, req.user?.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'DELETE FROM jobs WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user?.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Job not found' });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/:id/export/csv', async (req: AuthRequest, res) => {
  try {
    const jobCheck = await query(
      'SELECT id, target, engine FROM jobs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user?.id]
    );
    if (jobCheck.rowCount === 0) return res.status(404).json({ error: 'Job not found' });

    const results = await query(
      'SELECT * FROM results WHERE job_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    const { headers, keys } = getFilteredRows(results.rows, req.query.columns as string);

    const csvRows = results.rows.map(row => {
      return keys.map(k => {
        const val = row[k] !== null && row[k] !== undefined ? String(row[k]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = [headers.map(h => `"${h}"`).join(','), ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${req.params.id}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/:id/export/xlsx', async (req: AuthRequest, res) => {
  try {
    const jobCheck = await query(
      'SELECT id, target, engine FROM jobs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user?.id]
    );
    if (jobCheck.rowCount === 0) return res.status(404).json({ error: 'Job not found' });

    const results = await query(
      'SELECT * FROM results WHERE job_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    const { data } = getFilteredRows(results.rows, req.query.columns as string);

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${req.params.id}.xlsx"`);
    res.status(200).send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/:id/export/json', async (req: AuthRequest, res) => {
  try {
    const jobCheck = await query(
      'SELECT id, target, engine FROM jobs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user?.id]
    );
    if (jobCheck.rowCount === 0) return res.status(404).json({ error: 'Job not found' });

    const results = await query(
      'SELECT * FROM results WHERE job_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    const { data } = getFilteredRows(results.rows, req.query.columns as string);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${req.params.id}.json"`);
    res.status(200).send(JSON.stringify(data, null, 2));
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/:id/export/html', async (req: AuthRequest, res) => {
  try {
    const jobCheck = await query(
      'SELECT id, target, engine FROM jobs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user?.id]
    );
    if (jobCheck.rowCount === 0) return res.status(404).json({ error: 'Job not found' });

    const job = jobCheck.rows[0];
    const results = await query(
      'SELECT * FROM results WHERE job_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    const { headers, keys } = getFilteredRows(results.rows, req.query.columns as string);

    const safeTarget = escapeHtml(job.target);
    const safeEngine = escapeHtml(job.engine.toUpperCase());
    const safeDate = escapeHtml(new Date().toISOString());

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leads Export - ${safeTarget}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b1311; color: #e2e8f0; margin: 0; padding: 24px; }
    h1 { font-size: 20px; color: #10b981; margin-bottom: 4px; }
    p { font-size: 12px; color: #94a3b8; margin-top: 0; margin-bottom: 20px; }
    .table-container { overflow-x: auto; background: #131c19; border-radius: 12px; border: 1px solid #1e293b; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; }
    th { background: #192420; color: #10b981; padding: 10px 12px; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #1e293b; white-space: nowrap; }
    td { padding: 8px 12px; border-bottom: 1px solid #1a2522; color: #cbd5e1; white-space: nowrap; }
    tr:hover { background: #18221f; }
    a { color: #38bdf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>DashMin Leads Report: ${safeTarget}</h1>
  <p>Engine: ${safeEngine} | Total Records: ${results.rows.length} | Export Date: ${safeDate}</p>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${results.rows.map(row => `<tr>${keys.map(k => {
          const rawVal = row[k] !== null && row[k] !== undefined ? String(row[k]) : '-';
          if (k === 'website' && rawVal !== '-') {
            const isSafeUrl = rawVal.startsWith('http://') || rawVal.startsWith('https://');
            const href = isSafeUrl ? escapeHtml(rawVal) : '#';
            return `<td><a href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(rawVal)}</a></td>`;
          }
          return `<td>${escapeHtml(rawVal)}</td>`;
        }).join('')}</tr>`).join('\n')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="leads_${req.params.id}.html"`);
    res.status(200).send(htmlContent);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

export default router;
