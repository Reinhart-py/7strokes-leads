import { Router, Response, NextFunction } from 'express';
import { query } from '../db';
import { AuthRequest, authMiddleware } from '../middlewares/auth';

const router = Router();

router.use(authMiddleware);

const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
};

router.use(adminOnly);

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
