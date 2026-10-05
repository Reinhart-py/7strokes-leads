import { Worker, Job } from 'bullmq';
import { connection } from '../redis';
import { query } from '../db';
import { ScraperManager } from '../scrapers/scraperManager';
import { ScrapedLead } from '../scrapers/types';

const scraperManager = new ScraperManager();

const worker = new Worker(
  'scraper-jobs',
  async (job: Job) => {
    const { jobId, engine, target, cap } = job.data;

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
        await job.updateProgress(totalSaved);
      };

      const saveLead = async (data: ScrapedLead) => {
        const categoriesStr = data.categories ? data.categories.join(', ') : (data.category || null);
        const openingHoursStr = data.opening_hours ? data.opening_hours.join(' | ') : null;
        const socialLinksJson = data.social_links ? JSON.stringify(data.social_links) : null;
        const extraDataJson = data.extra_data ? JSON.stringify(data.extra_data) : null;

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
            data.query,
            data.place_id || null,
            data.title,
            data.category || null,
            categoriesStr,
            data.phone_1 || null,
            data.phone_2 || null,
            data.email || null,
            data.website || null,
            data.address || null,
            data.city || null,
            data.state || null,
            data.country || null,
            data.postal_code || null,
            data.rating || null,
            data.reviews || null,
            data.price_level || null,
            data.status || null,
            data.latitude ? data.latitude.toString() : null,
            data.longitude ? data.longitude.toString() : null,
            data.plus_code || null,
            data.timezone || null,
            openingHoursStr,
            socialLinksJson,
            extraDataJson
          ]
        );
      };

      await scraperManager.run(
        engine as 'gmaps' | '2gis',
        { query: target, cap, jobId },
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
  },
  {
    connection,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000
    }
  }
);

worker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed with ${err.message}`);
});

console.log('Scraper worker initialized with provider-based architecture');
