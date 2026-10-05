import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../db';
import { AuthRequest, authMiddleware } from '../middlewares/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'secret-kiri-key';

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', 'guerrillamailblock.com',
  'mailinator.com', '10minutemail.com', '10minutemail.net', 'yopmail.com',
  'trashmail.com', 'trashmail.net', 'dispostable.com', 'sharklasers.com',
  'throwawaymail.com', 'fakeinbox.com', 'getairmail.com', 'mohmal.com',
  'crazymailing.com', 'burnermail.io', 'tempail.com', 'fakemailgenerator.com',
  'mytemp.email', 'inboxkitten.com', 'nada.ltd', 'getnada.com', 'tempmailo.com',
  'internxt.com', 'minuteinbox.com', 'generator.email', 'emailondeck.com',
  'tempmailgen.com', 'maildrop.cc', 'harakirimail.com', 'jetable.org',
  'mailcatch.com', 'spamgourmet.com', 'incognitomail.org', 'zillamail.com'
]);

function isDisposableEmail(email: string): boolean {
  const parts = email.toLowerCase().split('@');
  if (parts.length !== 2) return true;
  const domain = parts[1];
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true;
  for (const disp of DISPOSABLE_EMAIL_DOMAINS) {
    if (domain.endsWith('.' + disp)) return true;
  }
  return false;
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, username } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normEmail = email.trim().toLowerCase();
    if (isDisposableEmail(normEmail)) {
      return res.status(400).json({ error: 'Temporary and disposable email addresses are not permitted. Please use your business, company, or trusted email.' });
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [normEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const rawUsername = (username || name || normEmail.split('@')[0]).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const userExisting = await query('SELECT id FROM users WHERE username = $1', [rawUsername]);
    if (userExisting.rows.length > 0 && username) {
      return res.status(409).json({ error: 'Username is already taken' });
    }
    const finalUsername = userExisting.rows.length > 0 ? `${rawUsername}_${Date.now().toString().slice(-4)}` : rawUsername;

    const regSetting = await query("SELECT value FROM settings WHERE key = 'allow_registration'");
    if (regSetting.rows[0]?.value === 'false') {
      return res.status(403).json({ error: 'Public registration is disabled by administrator' });
    }

    const countResult = await query('SELECT COUNT(*) as count FROM users');
    const isFirstUser = parseInt(countResult.rows[0].count) === 0;

    const role = isFirstUser ? 'admin' : 'user';
    const status = isFirstUser ? 'active' : 'pending';
    const canUseProxy = isFirstUser ? 1 : 0;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (email, username, password_hash, name, role, status, can_use_proxy) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, username, name, role, status, can_use_proxy, avatar',
      [normEmail, finalUsername, passwordHash, name || normEmail.split('@')[0], role, status, canUseProxy]
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

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username || user.email.split('@')[0],
        name: user.name,
        role: user.role,
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

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    const normEmail = email.trim().toLowerCase();
    const result = await query('SELECT id, email FROM users WHERE email = $1', [normEmail]);
    if (result.rows.length === 0) {
      return res.json({
        message: 'If an account exists with this email address, password reset instructions have been issued.',
        resetLink: null
      });
    }

    const tempPassword = 'Temp' + crypto.randomBytes(3).toString('hex') + '!1';
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    await query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, normEmail]);

    res.json({
      message: 'Password reset generated successfully',
      email: normEmail,
      temporaryPassword: tempPassword,
      resetLink: `${req.protocol}://${req.get('host')}/reset-password?token=${crypto.randomBytes(16).toString('hex')}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process password reset' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await query('SELECT id, email, username, name, avatar, role, status, expires_at, can_use_proxy, custom_proxy FROM users WHERE id = $1', [req.user?.id]);
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
