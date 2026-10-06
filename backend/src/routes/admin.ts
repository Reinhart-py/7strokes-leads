import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '../db';
import { AuthRequest, authMiddleware } from '../middlewares/auth';
import { isRedisConnected } from '../redis';

const router = Router();

router.use(authMiddleware);

const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
};

router.use(adminOnly);

router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const userRes = await query('SELECT COUNT(*) as count FROM users');
    const jobsRes = await query('SELECT COUNT(*) as count FROM jobs');
    const leadsRes = await query('SELECT COUNT(*) as count FROM results');
    const runningJobsRes = await query("SELECT COUNT(*) as count FROM jobs WHERE status = 'running'");

    res.json({
      totalUsers: parseInt(userRes.rows[0]?.count || 0),
      totalJobs: parseInt(jobsRes.rows[0]?.count || 0),
      totalLeads: parseInt(leadsRes.rows[0]?.count || 0),
      runningJobs: parseInt(runningJobsRes.rows[0]?.count || 0),
      databaseType: 'SQLite / PostgreSQL Dual Engine',
      queueType: isRedisConnected ? 'Redis Distributed Queue' : 'In-Process Resilient Queue',
      systemStatus: 'Operational'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, email, username, name, avatar, role, status, can_use_proxy, custom_proxy, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, username, role = 'user', status = 'active', can_use_proxy = 0, custom_proxy } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!username || typeof username !== 'string' || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const normUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(normUsername)) {
      return res.status(400).json({ error: 'Username must be 3-30 lowercase characters (a-z, 0-9, _)' });
    }

    const userExisting = await query('SELECT id FROM users WHERE LOWER(username) = $1', [normUsername]);
    if (userExisting.rows.length > 0) {
      return res.status(409).json({ error: 'Username is already taken' });
    }

    const normEmail = email.trim().toLowerCase();
    const existing = await query('SELECT id FROM users WHERE email = $1', [normEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (email, username, password_hash, name, role, status, can_use_proxy, custom_proxy) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, username, name, role, status, can_use_proxy, custom_proxy',
      [normEmail, normUsername, passwordHash, name || normUsername, role, status, can_use_proxy ? 1 : 0, custom_proxy || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { email, username, name, avatar, role, status, password, can_use_proxy, custom_proxy } = req.body;
    const userId = req.params.id;

    const existing = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const normUsername = (username || name || email.split('@')[0]).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      await query(
        'UPDATE users SET email = $1, username = $2, name = $3, avatar = $4, role = $5, status = $6, can_use_proxy = $7, custom_proxy = $8, password_hash = $9 WHERE id = $10',
        [email.trim().toLowerCase(), normUsername, name, avatar || null, role, status, can_use_proxy ? 1 : 0, custom_proxy || null, passwordHash, userId]
      );
    } else {
      await query(
        'UPDATE users SET email = $1, username = $2, name = $3, avatar = $4, role = $5, status = $6, can_use_proxy = $7, custom_proxy = $8 WHERE id = $9',
        [email.trim().toLowerCase(), normUsername, name, avatar || null, role, status, can_use_proxy ? 1 : 0, custom_proxy || null, userId]
      );
    }

    const updated = await query('SELECT id, email, username, name, avatar, role, status, can_use_proxy, custom_proxy FROM users WHERE id = $1', [userId]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.get('/leads', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.query.userId as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    let sql = `
      SELECT r.id, r.title, r.phone_1, r.email, r.website, r.address, r.city, r.category, r.rating, r.reviews, r.created_at,
             j.id as job_id, j.target as job_target, j.engine as job_engine,
             u.id as user_id, u.email as user_email, u.name as user_name, u.username as user_username
      FROM results r
      LEFT JOIN jobs j ON r.job_id = j.id
      LEFT JOIN users u ON j.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (userId && userId !== 'all') {
      params.push(userId);
      sql += ` AND j.user_id = $${params.length}`;
    }

    if (search && search.trim().length > 0) {
      params.push(`%${search.trim().toLowerCase()}%`);
      sql += ` AND (LOWER(r.title) LIKE $${params.length} OR LOWER(r.phone_1) LIKE $${params.length} OR LOWER(r.address) LIKE $${params.length} OR LOWER(r.website) LIKE $${params.length} OR LOWER(r.category) LIKE $${params.length})`;
    }

    sql += ` ORDER BY r.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    let countSql = `
      SELECT COUNT(*) as count
      FROM results r
      LEFT JOIN jobs j ON r.job_id = j.id
      WHERE 1=1
    `;
    const countParams: any[] = [];
    if (userId && userId !== 'all') {
      countParams.push(userId);
      countSql += ` AND j.user_id = $${countParams.length}`;
    }
    const countRes = await query(countSql, countParams);

    res.json({
      leads: result.rows,
      total: parseInt(countRes.rows[0]?.count || 0)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global leads' });
  }
});

router.post('/users/:id/toggle-proxy', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const userCheck = await query('SELECT id, can_use_proxy FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const nextVal = userCheck.rows[0].can_use_proxy === 1 ? 0 : 1;
    await query('UPDATE users SET can_use_proxy = $1 WHERE id = $2', [nextVal, userId]);
    res.json({ success: true, userId, can_use_proxy: nextVal });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle proxy permission' });
  }
});

router.post('/users/:id/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.id;

    const userCheck = await query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tempPassword = newPassword && newPassword.trim().length > 0 ? newPassword.trim() : crypto.randomBytes(4).toString('hex') + 'A1!';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

    res.json({
      message: 'Password reset successfully',
      email: userCheck.rows[0].email,
      temporaryPassword: tempPassword,
      resetLink: `${req.protocol}://${req.get('host')}/reset?token=${crypto.randomBytes(16).toString('hex')}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.post('/users/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, email, name, role, status',
      ['active', req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

router.post('/users/:id/suspend', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, email, name, role, status',
      ['suspended', req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user?.id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account' });
    }
    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.get('/settings', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query('SELECT key, value FROM settings');
    const settingsMap: Record<string, string> = {};
    for (const row of result.rows) {
      settingsMap[row.key] = row.value;
    }
    res.json(settingsMap);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      const existing = await query('SELECT key FROM settings WHERE key = $1', [key]);
      if (existing.rows.length > 0) {
        await query('UPDATE settings SET value = $1 WHERE key = $2', [String(value), key]);
      } else {
        await query('INSERT INTO settings (key, value) VALUES ($1, $2)', [key, String(value)]);
      }
    }
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;
