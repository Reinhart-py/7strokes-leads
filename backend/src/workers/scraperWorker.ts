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
        await query(
          `INSERT INTO results (job_id, query, place_id, title, category, phone_1, phone_2, email, website, address, rating, reviews, latitude, longitude) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            jobId,
            data.query,
            data.place_id || null,
            data.title,
            data.category || null,
            data.phone_1 || null,
            data.phone_2 || null,
            data.email || null,
            data.website || null,
            data.address || null,
            data.rating || null,
            data.reviews || null,
            data.latitude ? data.latitude.toString() : null,
            data.longitude ? data.longitude.toString() : null
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
