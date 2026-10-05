import { Queue } from 'bullmq';
import { connection } from './redis';

export const scraperQueue = new Queue('scraper-jobs', { connection });

export async function addScraperJob(jobId: string, engine: string, target: string, cap: number, userId: string) {
  await scraperQueue.add('scrape', { jobId, engine, target, cap, userId }, { jobId });
}
