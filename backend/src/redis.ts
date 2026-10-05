import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
  console.error('Redis error:', err);
});
