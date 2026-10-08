import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from '../db';
import { AuthRequest, authMiddleware } from '../middlewares/auth';
import { isRedisConnected } from '../redis';

const router = Router();

router.use(authMiddleware);

const managerOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
    return res.status(403).json({ error: 'Manager or Administrator access required' });
  }
  next();
};

const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
};

router.use(managerOrAdmin);

async function canAccessUser(requester: AuthRequest['user'], targetUserId: string): Promise<boolean> {
  if (!requester) return false;
  if (requester.role === 'admin') return true;
  if (requester.role === 'manager') {
    const check = await query('SELECT id, company, manager_id, role FROM users WHERE id = $1', [targetUserId]);
    if (check.rows.length === 0) return false;
    const u = check.rows[0];
    return u.manager_id === requester.id || (Boolean(requester.company) && u.company === requester.company && u.role === 'user');
  }
  return false;
}

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const userCompany = req.user?.company || '';

    if (userRole === 'admin') {
      const userRes = await query("SELECT COUNT(*) as count FROM users WHERE role = 'user'");
      const managerRes = await query("SELECT COUNT(*) as count FROM users WHERE role = 'manager'");
      const companyRes = await query("SELECT COUNT(DISTINCT company) as count FROM users WHERE company IS NOT NULL AND TRIM(company) != ''");
      const jobsRes = await query('SELECT COUNT(*) as count FROM jobs');
      const leadsRes = await query('SELECT COUNT(*) as count FROM results');
      const runningJobsRes = await query("SELECT COUNT(*) as count FROM jobs WHERE status = 'running'");

      const companyBreakdown = await query(`
        SELECT COALESCE(NULLIF(TRIM(company), ''), 'Unassigned') as company_name,
               SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as manager_count,
               SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_count,
               COUNT(*) as total_members
        FROM users
        GROUP BY COALESCE(NULLIF(TRIM(company), ''), 'Unassigned')
        ORDER BY total_members DESC
      `);

      const managerBreakdown = await query(`
        SELECT m.id, m.name, m.username, m.email, m.company,
               COUNT(u.id) as assigned_users_count
        FROM users m
        LEFT JOIN users u ON u.manager_id = m.id
        WHERE m.role = 'manager'
        GROUP BY m.id, m.name, m.username, m.email, m.company
        ORDER BY assigned_users_count DESC
      `);

      return res.json({
        role: 'admin',
        totalCompanies: parseInt(companyRes.rows[0]?.count || 0),
        totalManagers: parseInt(managerRes.rows[0]?.count || 0),
        totalUsers: parseInt(userRes.rows[0]?.count || 0),
        totalLeads: parseInt(leadsRes.rows[0]?.count || 0),
        totalJobs: parseInt(jobsRes.rows[0]?.count || 0),
        runningJobs: parseInt(runningJobsRes.rows[0]?.count || 0),
        companies: companyBreakdown.rows,
        managers: managerBreakdown.rows,
        databaseType: 'SQLite / PostgreSQL Dual Engine',
        queueType: isRedisConnected ? 'Redis Distributed Queue' : 'In-Process Resilient Queue',
        systemStatus: 'Operational'
      });
    }

    // Manager View Stats
    const teamUsersRes = await query(`
      SELECT COUNT(*) as count FROM users
      WHERE (manager_id = $1 OR (company = $2 AND role = 'user' AND company != ''))
    `, [userId, userCompany]);

    const teamJobsRes = await query(`
      SELECT COUNT(j.id) as total_jobs,
             SUM(CASE WHEN j.status = 'running' THEN 1 ELSE 0 END) as running_jobs
      FROM jobs j
      JOIN users u ON j.user_id = u.id
      WHERE u.manager_id = $1 OR u.id = $1 OR (u.company = $2 AND u.role = 'user' AND u.company != '')
    `, [userId, userCompany]);

    const teamLeadsRes = await query(`
      SELECT COUNT(r.id) as count
      FROM results r
      JOIN jobs j ON r.job_id = j.id
      JOIN users u ON j.user_id = u.id
      WHERE u.manager_id = $1 OR u.id = $1 OR (u.company = $2 AND u.role = 'user' AND u.company != '')
    `, [userId, userCompany]);

    res.json({
      role: 'manager',
      company: userCompany || 'Company Workspace',
      teamUsers: parseInt(teamUsersRes.rows[0]?.count || 0),
      teamJobs: parseInt(teamJobsRes.rows[0]?.total_jobs || 0),
      teamLeads: parseInt(teamLeadsRes.rows[0]?.count || 0),
      runningJobs: parseInt(teamJobsRes.rows[0]?.running_jobs || 0),
      databaseType: 'SQLite / PostgreSQL Dual Engine',
      queueType: isRedisConnected ? 'Redis Distributed Queue' : 'In-Process Resilient Queue',
      systemStatus: 'Operational'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve stats' });
  }
});

router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const isManager = req.user?.role === 'manager';
    const currentUserId = req.user?.id;
    const currentCompany = req.user?.company || '';

    if (isManager) {
      const result = await query(`
        SELECT u.id, u.email, u.username, u.name, u.avatar, u.role, u.company, u.manager_id, u.status, u.can_use_proxy, u.custom_proxy, u.created_at
        FROM users u
        WHERE (u.manager_id = $1 OR (u.company = $2 AND u.role = 'user' AND u.company != ''))
        ORDER BY u.created_at DESC
      `, [currentUserId, currentCompany]);
      return res.json(result.rows);
    }

    // Admin view: supports company and manager filtering
    const companyFilter = req.query.company as string | undefined;
    const managerFilter = req.query.managerId as string | undefined;
    const roleFilter = req.query.role as string | undefined;

    let sql = `
      SELECT u.id, u.email, u.username, u.name, u.avatar, u.role, u.company, u.manager_id, u.status, u.can_use_proxy, u.custom_proxy, u.created_at,
             m.name as manager_name, m.username as manager_username
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (companyFilter && companyFilter !== 'all') {
      params.push(companyFilter);
      sql += ` AND u.company = $${params.length}`;
    }

    if (managerFilter && managerFilter !== 'all') {
      params.push(managerFilter);
      sql += ` AND u.manager_id = $${params.length}`;
    }

    if (roleFilter && roleFilter !== 'all') {
      params.push(roleFilter);
      sql += ` AND u.role = $${params.length}`;
    }

    sql += ' ORDER BY u.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users', async (req: AuthRequest, res: Response) => {
  try {
    const isManager = req.user?.role === 'manager';
    const { email, password, name, username, role = 'user', status = 'active', can_use_proxy = 0, custom_proxy, company, manager_id } = req.body;

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

    // Role, Company, Manager determination
    const finalRole = isManager ? 'user' : (role === 'admin' || role === 'manager' ? role : 'user');
    const finalCompany = isManager ? (req.user?.company || null) : (company ? company.trim() : null);
    const finalManagerId = isManager ? (req.user?.id || null) : (manager_id || null);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (email, username, password_hash, name, role, company, manager_id, status, can_use_proxy, custom_proxy) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, email, username, name, role, company, manager_id, status, can_use_proxy, custom_proxy',
      [normEmail, normUsername, passwordHash, name || normUsername, finalRole, finalCompany, finalManagerId, status, can_use_proxy ? 1 : 0, custom_proxy || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.params.id);
    const isManager = req.user?.role === 'manager';

    const allowed = await canAccessUser(req.user, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'You do not have permission to modify this user account' });
    }

    const existingRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const existing = existingRes.rows[0];

    const { email, username, name, avatar, role, status, password, can_use_proxy, custom_proxy, company, manager_id } = req.body;
    const normUsername = (username || name || email?.split('@')[0] || existing.username).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    // Protect manager from elevating roles or altering company/manager bindings
    const finalRole = isManager ? existing.role : (role || existing.role);
    const finalCompany = isManager ? existing.company : (company !== undefined ? (company ? company.trim() : null) : existing.company);
    const finalManagerId = isManager ? existing.manager_id : (manager_id !== undefined ? (manager_id || null) : existing.manager_id);
    const finalEmail = (email ? email.trim().toLowerCase() : existing.email);

    if (password && password.trim().length > 0) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password.trim(), salt);
      await query(
        'UPDATE users SET email = $1, username = $2, name = $3, avatar = $4, role = $5, company = $6, manager_id = $7, status = $8, can_use_proxy = $9, custom_proxy = $10, password_hash = $11 WHERE id = $12',
        [finalEmail, normUsername, name || existing.name, avatar !== undefined ? avatar : existing.avatar, finalRole, finalCompany, finalManagerId, status || existing.status, can_use_proxy ? 1 : 0, custom_proxy || null, passwordHash, userId]
      );
    } else {
      await query(
        'UPDATE users SET email = $1, username = $2, name = $3, avatar = $4, role = $5, company = $6, manager_id = $7, status = $8, can_use_proxy = $9, custom_proxy = $10 WHERE id = $11',
        [finalEmail, normUsername, name || existing.name, avatar !== undefined ? avatar : existing.avatar, finalRole, finalCompany, finalManagerId, status || existing.status, can_use_proxy ? 1 : 0, custom_proxy || null, userId]
      );
    }

    const updated = await query('SELECT id, email, username, name, avatar, role, company, manager_id, status, can_use_proxy, custom_proxy FROM users WHERE id = $1', [userId]);
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.get('/leads', async (req: AuthRequest, res: Response) => {
  try {
    const isManager = req.user?.role === 'manager';
    const managerId = req.user?.id;
    const managerCompany = req.user?.company || '';

    const userId = req.query.userId as string | undefined;
    const companyFilter = req.query.company as string | undefined;
    const managerFilter = req.query.managerId as string | undefined;
    const search = req.query.search as string | undefined;
    const uniqueOnly = req.query.unique === 'true' || req.query.unique === '1';
    const categoryFilter = req.query.category as string | undefined;
    const cityFilter = req.query.city as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);
    const offset = parseInt(req.query.offset as string) || 0;

    let sql = `
      SELECT r.id, r.title, r.phone_1, r.phone_2, r.email, r.website, r.address, r.street, r.city, r.state, r.country, r.postal_code, r.category, r.rating, r.reviews, r.created_at,
             j.id as job_id, j.target as job_target, j.engine as job_engine,
             u.id as user_id, u.email as user_email, u.name as user_name, u.username as user_username,
             u.company as user_company, u.manager_id as user_manager_id,
             m.name as manager_name, m.username as manager_username
      FROM results r
      LEFT JOIN jobs j ON r.job_id = j.id
      LEFT JOIN users u ON j.user_id = u.id
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (uniqueOnly) {
      sql += ` AND r.id IN (SELECT MIN(r2.id) FROM results r2 GROUP BY COALESCE(NULLIF(r2.phone_1, ''), LOWER(TRIM(r2.title))))`;
    }

    if (isManager) {
      params.push(managerId, managerCompany);
      sql += ` AND (u.manager_id = $1 OR u.id = $1 OR (u.company = $2 AND u.role = 'user' AND u.company != ''))`;
    } else {
      if (companyFilter && companyFilter !== 'all') {
        params.push(companyFilter);
        sql += ` AND u.company = $${params.length}`;
      }
      if (managerFilter && managerFilter !== 'all') {
        params.push(managerFilter);
        sql += ` AND u.manager_id = $${params.length}`;
      }
    }

    if (userId && userId !== 'all') {
      params.push(userId);
      sql += ` AND j.user_id = $${params.length}`;
    }

    if (categoryFilter && categoryFilter !== 'all') {
      params.push(categoryFilter);
      sql += ` AND r.category = $${params.length}`;
    }

    if (cityFilter && cityFilter !== 'all') {
      params.push(cityFilter);
      sql += ` AND r.city = $${params.length}`;
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
      LEFT JOIN users u ON j.user_id = u.id
      WHERE 1=1
    `;
    const countParams: any[] = [];

    if (uniqueOnly) {
      countSql += ` AND r.id IN (SELECT MIN(r2.id) FROM results r2 GROUP BY COALESCE(NULLIF(r2.phone_1, ''), LOWER(TRIM(r2.title))))`;
    }

    if (isManager) {
      countParams.push(managerId, managerCompany);
      countSql += ` AND (u.manager_id = $1 OR u.id = $1 OR (u.company = $2 AND u.role = 'user' AND u.company != ''))`;
    } else {
      if (companyFilter && companyFilter !== 'all') {
        countParams.push(companyFilter);
        countSql += ` AND u.company = $${countParams.length}`;
      }
      if (managerFilter && managerFilter !== 'all') {
        countParams.push(managerFilter);
        countSql += ` AND u.manager_id = $${countParams.length}`;
      }
    }

    if (userId && userId !== 'all') {
      countParams.push(userId);
      countSql += ` AND j.user_id = $${countParams.length}`;
    }

    if (categoryFilter && categoryFilter !== 'all') {
      countParams.push(categoryFilter);
      countSql += ` AND r.category = $${countParams.length}`;
    }

    if (cityFilter && cityFilter !== 'all') {
      countParams.push(cityFilter);
      countSql += ` AND r.city = $${countParams.length}`;
    }

    if (search && search.trim().length > 0) {
      countParams.push(`%${search.trim().toLowerCase()}%`);
      countSql += ` AND (LOWER(r.title) LIKE $${countParams.length} OR LOWER(r.phone_1) LIKE $${countParams.length} OR LOWER(r.address) LIKE $${countParams.length} OR LOWER(r.website) LIKE $${countParams.length} OR LOWER(r.category) LIKE $${countParams.length})`;
    }

    const countRes = await query(countSql, countParams);

    res.json({
      leads: result.rows,
      total: parseInt(countRes.rows[0]?.count || 0)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.post('/users/:id/toggle-proxy', async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.params.id);
    const allowed = await canAccessUser(req.user, userId);
    if (!allowed) return res.status(403).json({ error: 'Permission denied' });

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
    const userId = String(req.params.id);
    const allowed = await canAccessUser(req.user, userId);
    if (!allowed) return res.status(403).json({ error: 'Permission denied' });

    const { newPassword } = req.body;
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
    const userId = String(req.params.id);
    const allowed = await canAccessUser(req.user, userId);
    if (!allowed) return res.status(403).json({ error: 'Permission denied' });

    const result = await query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, email, name, role, status',
      ['active', userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

router.post('/users/:id/suspend', async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.params.id);
    const allowed = await canAccessUser(req.user, userId);
    if (!allowed) return res.status(403).json({ error: 'Permission denied' });

    const result = await query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, email, name, role, status',
      ['suspended', userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = String(req.params.id);
    if (userId === req.user?.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const allowed = await canAccessUser(req.user, userId);
    if (!allowed) return res.status(403).json({ error: 'Permission denied' });

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, id: userId });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// System settings routes are strictly Admin-Only
router.get('/settings', adminOnly, async (_req: AuthRequest, res: Response) => {
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

router.post('/settings', adminOnly, async (req: AuthRequest, res: Response) => {
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
