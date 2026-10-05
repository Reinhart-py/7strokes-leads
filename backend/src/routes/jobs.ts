import { Router } from 'express';
import * as XLSX from 'xlsx';
import { query } from '../db';
import { AuthRequest, authMiddleware } from '../middlewares/auth';
import { addScraperJob } from '../queue';

const router = Router();

router.use(authMiddleware);

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { engine, target, cap } = req.body;
    const userId = req.user?.id;

    const result = await query(
      'INSERT INTO jobs (user_id, engine, target, cap) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, engine, target, cap || 0]
    );
    const job = result.rows[0];

    await addScraperJob(job.id, engine, target, cap, userId as string);

    res.json(job);
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

    const limit = parseInt(req.query.limit as string) || 100;
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
      'SELECT title, phone_1, phone_2, email, website, address, category, rating, reviews, query FROM results WHERE job_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    const headers = ['Business Name', 'Phone 1', 'Phone 2', 'Email', 'Website', 'Address', 'Category', 'Rating', 'Reviews', 'Query'];
    const rows = results.rows.map(r => [
      `"${(r.title || '').replace(/"/g, '""')}"`,
      `"${(r.phone_1 || '').replace(/"/g, '""')}"`,
      `"${(r.phone_2 || '').replace(/"/g, '""')}"`,
      `"${(r.email || '').replace(/"/g, '""')}"`,
      `"${(r.website || '').replace(/"/g, '""')}"`,
      `"${(r.address || '').replace(/"/g, '""')}"`,
      `"${(r.category || '').replace(/"/g, '""')}"`,
      `"${(r.rating || '').replace(/"/g, '""')}"`,
      `"${(r.reviews || '').replace(/"/g, '""')}"`,
      `"${(r.query || '').replace(/"/g, '""')}"`
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
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
      'SELECT title as "Business Name", phone_1 as "Phone 1", phone_2 as "Phone 2", email as "Email", website as "Website", address as "Address", category as "Category", rating as "Rating", reviews as "Reviews", query as "Query" FROM results WHERE job_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );

    const worksheet = XLSX.utils.json_to_sheet(results.rows);
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

export default router;
