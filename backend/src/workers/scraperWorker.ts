import { Worker, Job } from 'bullmq';
import { connection } from '../redis';
import { executeJob } from './jobExecutor';

const worker = new Worker(
  'scraper-jobs',
  async (job: Job) => {
    const { jobId, engine, target, cap, proxy } = job.data;
    await executeJob(
      { jobId, engine, target, cap, proxy },
      async (saved: number) => {
        await job.updateProgress(saved);
      }
    );
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
