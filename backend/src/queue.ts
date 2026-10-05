import { Queue } from 'bullmq';
import { connection, isRedisConnected } from './redis';
import { executeJob } from './workers/jobExecutor';

let scraperQueue: Queue | null = null;

function getQueue(): Queue | null {
  if (!isRedisConnected) {
    return null;
  }
  if (!scraperQueue) {
    try {
      scraperQueue = new Queue('scraper-jobs', { connection });
    } catch {
      return null;
    }
  }
  return scraperQueue;
}

export async function addScraperJob(jobId: string, engine: string, target: string, cap: number, userId: string) {
  const queue = getQueue();
  if (queue) {
    try {
      await queue.add('scrape', { jobId, engine, target, cap, userId }, { jobId });
      return;
    } catch {}
  }

  setImmediate(() => {
    executeJob({ jobId, engine, target, cap }).catch((err) => {
      console.error(`Local execution failed for job ${jobId}:`, err);
    });
  });
}
