import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export let isRedisConnected = false;

export const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: () => null
});

connection.on('error', () => {
  isRedisConnected = false;
});

connection.connect().then(() => {
  isRedisConnected = true;
  console.log('Connected to Redis server');
}).catch(() => {
  isRedisConnected = false;
  console.log('Redis server offline. Operating in local in-process queue mode.');
});
