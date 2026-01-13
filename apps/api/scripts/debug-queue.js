import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Simple debug script using CommonJS for Bull
const Bull = require('bull');
const dotenv = require('dotenv');

dotenv.config();

console.log('Debug Queue Manager - Simple Test');
console.log('===================================');

// Parse Redis URL for Bull.js
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error('No REDIS_URL found in environment');
  process.exit(1);
}

const url = new URL(redisUrl);
const redisConfig = {
  host: url.hostname,
  port: parseInt(url.port || '6379'),
  password: url.password,
  username: url.username || 'default',
  tls: url.protocol === 'rediss:' ? {
    rejectUnauthorized: false
  } : undefined,
  connectTimeout: 60000,
  lazyConnect: true,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  family: 4
};

console.log('Redis config:', {
  host: redisConfig.host,
  port: redisConfig.port,
  hasPassword: !!redisConfig.password,
  hasTLS: !!redisConfig.tls
});

const smartClipperQueue = new Bull('smart clipper', {
  redis: redisConfig
});

async function debugQueue() {
  try {
    // Check queue connection
    console.log('Testing queue connection...');
    await smartClipperQueue.isReady();
    console.log('Queue connected');
    
    // Get current stats
    const stats = await smartClipperQueue.getJobCounts();
    console.log('Current stats:', stats);
    
    if (stats.waiting > 0) {
      console.log(`\nFound ${stats.waiting} waiting jobs - attempting to clear and retry`);
      
      // Get waiting jobs and remove them manually
      console.log('Removing waiting jobs...');
      const waitingJobs = await smartClipperQueue.getWaiting();
      for (const job of waitingJobs) {
        await job.remove();
      }
      
      // Clean completed/failed jobs
      await smartClipperQueue.clean(0, 'completed');
      await smartClipperQueue.clean(0, 'failed');
      await smartClipperQueue.clean(0, 'active');
      
      const cleanStats = await smartClipperQueue.getJobCounts();
      console.log('After cleanup:', cleanStats);
      
      // Add a simple test job
      console.log('\nAdding test job...');
      const testJob = await smartClipperQueue.add('test-job', {
        message: 'Debug test',
        timestamp: new Date().toISOString()
      });
      
      console.log(`Test job ${testJob.id} added`);
      
      // Check if it becomes active
      console.log('Waiting 5 seconds to check processing...');
      setTimeout(async () => {
        const finalStats = await smartClipperQueue.getJobCounts();
        console.log('Final stats:', finalStats);
        
        if (finalStats.active > 0 || finalStats.completed > 0) {
          console.log('Jobs are being processed!');
        } else {
          console.log('Jobs still not processing - worker connection issue');
        }
        
        await smartClipperQueue.close();
        process.exit(0);
      }, 5000);
      
    } else {
      console.log('ℹNo waiting jobs found');
      await smartClipperQueue.close();
      process.exit(0);
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
    process.exit(1);
  }
}

debugQueue();