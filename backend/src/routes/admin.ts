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
      'SELECT id, email, name, role, status, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role = 'user', status = 'active' } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (email, password_hash, name, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, status',
      [email, passwordHash, name || email.split('@')[0], role, status]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, role, status, password } = req.body;
    const userId = req.params.id;

    const existing = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      await query(
        'UPDATE users SET email = $1, name = $2, role = $3, status = $4, password_hash = $5 WHERE id = $6',
        [email, name, role, status, passwordHash, userId]
      );
    } else {
      await query(
        'UPDATE users SET email = $1, name = $2, role = $3, status = $4 WHERE id = $5',
        [email, name, role, status, userId]
      );
    }

    const updated = await query('SELECT id, email, name, role, status FROM users WHERE id = $1', [userId]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
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

export default router;
