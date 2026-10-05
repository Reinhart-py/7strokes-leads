import { query } from '../db';
import { ScraperManager } from '../scrapers/scraperManager';
import { ScrapedLead } from '../scrapers/types';

const scraperManager = new ScraperManager();

export async function executeJob(data: { jobId: string; engine: string; target: string; cap: number; proxy?: string }, onProgress?: (saved: number) => Promise<void>) {
  const { jobId, engine, target, cap, proxy } = data;

  try {
    await query('UPDATE jobs SET status = $1 WHERE id = $2', ['running', jobId]);

    const checkCancelled = async () => {
      const result = await query('SELECT status FROM jobs WHERE id = $1', [jobId]);
      return result.rows[0]?.status === 'stopped';
    };

    const log = async (msg: string) => {
      console.log(`[Job ${jobId}] ${msg}`);
    };

    const updateProgress = async (step: number, totalSaved: number) => {
      await query(
        'UPDATE jobs SET last_step = $1, total_saved = $2, updated_at = NOW() WHERE id = $3',
        [step, totalSaved, jobId]
      );
      if (onProgress) {
        await onProgress(totalSaved);
      }
    };

    const saveLead = async (lead: ScrapedLead) => {
      const categoriesStr = lead.categories ? lead.categories.join(', ') : (lead.category || null);
      const openingHoursStr = lead.opening_hours ? lead.opening_hours.join(' | ') : null;
      const socialLinksJson = lead.social_links ? JSON.stringify(lead.social_links) : null;
      const extraDataJson = lead.extra_data ? JSON.stringify(lead.extra_data) : null;

      if (lead.place_id) {
        await query(
          `INSERT INTO results (
            job_id, query, place_id, title, category, categories,
            phone_1, phone_2, email, website, address,
            city, state, country, postal_code,
            rating, reviews, price_level, status,
            latitude, longitude, plus_code, timezone,
            opening_hours, social_links, extra_data
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18, $19,
            $20, $21, $22, $23,
            $24, $25, $26
          )
          ON CONFLICT (job_id, place_id) WHERE place_id IS NOT NULL DO NOTHING`,
          [
            jobId,
            lead.query,
            lead.place_id,
            lead.title,
            lead.category || null,
            categoriesStr,
            lead.phone_1 || null,
            lead.phone_2 || null,
            lead.email || null,
            lead.website || null,
            lead.address || null,
            lead.city || null,
            lead.state || null,
            lead.country || null,
            lead.postal_code || null,
            lead.rating || null,
            lead.reviews || null,
            lead.price_level || null,
            lead.status || null,
            lead.latitude ? lead.latitude.toString() : null,
            lead.longitude ? lead.longitude.toString() : null,
            lead.plus_code || null,
            lead.timezone || null,
            openingHoursStr,
            socialLinksJson,
            extraDataJson
          ]
        );
      } else {
        const existCheck = await query('SELECT id FROM results WHERE job_id = $1 AND title = $2 LIMIT 1', [jobId, lead.title]);
        if (existCheck.rows.length > 0) return;

        await query(
          `INSERT INTO results (
            job_id, query, place_id, title, category, categories,
            phone_1, phone_2, email, website, address,
            city, state, country, postal_code,
            rating, reviews, price_level, status,
            latitude, longitude, plus_code, timezone,
            opening_hours, social_links, extra_data
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11,
            $12, $13, $14, $15,
            $16, $17, $18, $19,
            $20, $21, $22, $23,
            $24, $25, $26
          )`,
          [
            jobId,
            lead.query,
            null,
            lead.title,
            lead.category || null,
            categoriesStr,
            lead.phone_1 || null,
            lead.phone_2 || null,
            lead.email || null,
            lead.website || null,
            lead.address || null,
            lead.city || null,
            lead.state || null,
            lead.country || null,
            lead.postal_code || null,
            lead.rating || null,
            lead.reviews || null,
            lead.price_level || null,
            lead.status || null,
            lead.latitude ? lead.latitude.toString() : null,
            lead.longitude ? lead.longitude.toString() : null,
            lead.plus_code || null,
            lead.timezone || null,
            openingHoursStr,
            socialLinksJson,
            extraDataJson
          ]
        );
      }
    };

    const concurrencyRes = await query("SELECT value FROM settings WHERE key = 'parallel_concurrency'");
    const concurrency = parseInt(concurrencyRes.rows[0]?.value || '6') || 6;

    await scraperManager.run(
      engine as 'gmaps' | '2gis',
      { query: target, cap, jobId, proxy, concurrency },
      { checkCancelled, log, updateProgress, saveLead }
    );

    const finalCheck = await checkCancelled();
    if (finalCheck) {
      await query('UPDATE jobs SET status = $1 WHERE id = $2', ['stopped', jobId]);
    } else {
      await query('UPDATE jobs SET status = $1 WHERE id = $2', ['completed', jobId]);
    }
  } catch (err) {
    console.error(`Job ${jobId} failed:`, err);
    await query('UPDATE jobs SET status = $1 WHERE id = $2', ['failed', jobId]);
    throw err;
  }
}
