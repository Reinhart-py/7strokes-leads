import { query } from './db';

/**
 * No-history policy: leads are not kept. Only the search a user just ran is
 * held, so it can be shown and downloaded; it is erased as soon as the user
 * starts another search or clears it.
 */

/** Stops and erases every search (and its leads) belonging to a user. */
export async function clearUserSearches(userId: string): Promise<number> {
  if (!userId) return 0;
  // Mark running searches as stopped first so their workers wind down.
  await query("UPDATE jobs SET status = 'stopped' WHERE user_id = $1 AND status IN ('running', 'pending')", [userId]);
  await query('DELETE FROM results WHERE job_id IN (SELECT id FROM jobs WHERE user_id = $1)', [userId]);
  const res = await query('DELETE FROM jobs WHERE user_id = $1', [userId]);
  return res.rowCount || 0;
}

/** Removes leads whose search no longer exists (e.g. written by a worker after its search was cleared). */
export async function deleteOrphanResults(jobId?: string): Promise<void> {
  if (jobId) {
    await query('DELETE FROM results WHERE job_id = $1 AND job_id NOT IN (SELECT id FROM jobs)', [jobId]);
    return;
  }
  await query('DELETE FROM results WHERE job_id IS NULL OR job_id NOT IN (SELECT id FROM jobs)');
}

/**
 * One-off cleanup for databases created before the no-history policy:
 * keeps only each user's latest search (a bulk search counts as one: every
 * search started within 2 minutes of the newest) and deletes the rest.
 */
export async function purgeHistory(): Promise<{ jobs: number }> {
  const users = await query('SELECT DISTINCT user_id FROM jobs');
  let removed = 0;
  for (const { user_id } of users.rows) {
    const latest = await query('SELECT created_at FROM jobs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [user_id]);
    const newest = latest.rows[0]?.created_at;
    if (!newest) continue;
    const newestMs = new Date(typeof newest === 'string' && !newest.includes('T') ? `${newest.replace(' ', 'T')}Z` : newest).getTime();
    if (!Number.isFinite(newestMs)) continue;
    const cutoff = new Date(newestMs - 2 * 60 * 1000);
    // Compare in the format the database stores (SQLite: "YYYY-MM-DD HH:MM:SS" UTC).
    const cutoffParam = typeof newest === 'string' ? cutoff.toISOString().replace('T', ' ').slice(0, 19) : cutoff;
    const old = await query('SELECT id FROM jobs WHERE user_id = $1 AND created_at < $2', [user_id, cutoffParam]);
    for (const { id } of old.rows) {
      await query('DELETE FROM results WHERE job_id = $1', [id]);
      await query('DELETE FROM jobs WHERE id = $1', [id]);
      removed++;
    }
  }
  await deleteOrphanResults();
  return { jobs: removed };
}
