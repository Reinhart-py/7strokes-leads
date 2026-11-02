import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { AuthRequest, authMiddleware } from '../middlewares/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret-kiri-key';

// Public registration is completely disabled
router.get('/registration-status', async (_req, res) => {
  res.json({ allowRegistration: false });
});

router.post('/register', async (_req, res) => {
  return res.status(403).json({
    error: 'Public registration is disabled. User accounts can only be created by an administrator or manager from the Admin Console.'
  });
});

router.get('/check-username', async (req, res) => {
  try {
    const raw = (req.query.username as string || '').trim().toLowerCase();
    if (!raw) {
      return res.status(400).json({ valid: false, error: 'Username is required' });
    }
    if (!/^[a-z0-9_]{3,30}$/.test(raw)) {
      return res.json({ valid: false, error: 'Username must be 3-30 lowercase characters (a-z, 0-9, _)' });
    }
    const check = await query('SELECT id FROM users WHERE LOWER(username) = $1', [raw]);
    if (check.rows.length > 0) {
      return res.json({ valid: false, taken: true, error: 'Username is already taken' });
    }
    res.json({ valid: true, taken: false });
  } catch {
    res.status(500).json({ error: 'Server error checking username' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, email, username, password } = req.body;
    const loginId = (identifier || email || username || '').trim().toLowerCase();
    if (!loginId || !password) {
      return res.status(400).json({ error: 'Username or email and password are required' });
    }

    const result = await query('SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $2', [loginId, loginId]);
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

    const token = jwt.sign(
      { id: user.id, role: user.role, company: user.company, manager_id: user.manager_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username || user.email.split('@')[0],
        name: user.name,
        role: user.role,
        company: user.company || null,
        manager_id: user.manager_id || null,
        status: user.status,
        avatar: user.avatar || null,
        can_use_proxy: user.can_use_proxy,
        custom_proxy: user.custom_proxy
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/forgot-password', async (_req, res) => {
  res.status(403).json({
    error: 'Self-serve password reset is disabled. Please contact the administrator directly to request a password reset.'
  });
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query(
      'SELECT id, email, username, name, avatar, role, company, manager_id, status, expires_at, can_use_proxy, custom_proxy FROM users WHERE id = $1',
      [req.user?.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/profile', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, username, avatar, currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];

    if (username && username.trim().toLowerCase() !== (user.username || '').toLowerCase()) {
      const checkU = await query('SELECT id FROM users WHERE LOWER(username) = $1 AND id != $2', [username.trim().toLowerCase(), userId]);
      if (checkU.rows.length > 0) {
        return res.status(409).json({ error: 'Username is already in use' });
      }
    }

    if (newPassword && newPassword.trim().length > 0) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change password' });
      }
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(newPassword.trim(), salt);
      await query(
        'UPDATE users SET name = $1, username = $2, avatar = $3, password_hash = $4 WHERE id = $5',
        [name || user.name, (username || user.username || '').trim().toLowerCase(), avatar !== undefined ? avatar : user.avatar, hash, userId]
      );
    } else {
      await query(
        'UPDATE users SET name = $1, username = $2, avatar = $3 WHERE id = $4',
        [name || user.name, (username || user.username || '').trim().toLowerCase(), avatar !== undefined ? avatar : user.avatar, userId]
      );
    }

    const updated = await query('SELECT id, email, username, name, avatar, role, status, can_use_proxy, custom_proxy FROM users WHERE id = $1', [userId]);
    res.json({ success: true, user: updated.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.put('/proxy', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { customProxy } = req.body;
    const userRes = await query('SELECT role, can_use_proxy FROM users WHERE id = $1', [req.user?.id]);
    const userObj = userRes.rows[0];

    if (!userObj || (userObj.role !== 'admin' && userObj.can_use_proxy !== 1)) {
      return res.status(403).json({ error: 'You do not have permission to configure custom proxies' });
    }

    await query('UPDATE users SET custom_proxy = $1 WHERE id = $2', [customProxy ? customProxy.trim() : null, req.user?.id]);
    res.json({ success: true, customProxy: customProxy ? customProxy.trim() : null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update proxy' });
  }
});

export default router;
