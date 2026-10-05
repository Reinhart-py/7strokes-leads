import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { AuthRequest, authMiddleware } from '../middlewares/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret-kiri-key';

router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const countResult = await query('SELECT COUNT(*) as count FROM users');
    const isFirstUser = parseInt(countResult.rows[0].count) === 0;

    const role = isFirstUser ? 'admin' : 'user';
    const status = isFirstUser ? 'active' : 'pending';

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (email, password_hash, name, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, status',
      [email, passwordHash, name || email.split('@')[0], role, status]
    );

    const newUser = result.rows[0];

    if (status === 'pending') {
      return res.status(201).json({
        message: 'Account created. Please wait for an administrator to approve your account.',
        user: newUser,
        requiresApproval: true
      });
    }

    const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: newUser, requiresApproval: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status === 'pending') {
      return res.status(403).json({ error: 'Your account is pending administrator approval' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account has been deactivated' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status } });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT id, email, name, role, status, expires_at FROM users WHERE id = $1', [req.user?.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
