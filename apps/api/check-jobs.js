import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Check job status quickly
const Bull = require('bull');
const dotenv = require('dotenv');

dotenv.config();

const redisUrl = process.env.REDIS_URL;
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

const smartClipperQueue = new Bull('smart clipper', {
  redis: redisConfig
});

async function checkJobs() {
  try {
    await smartClipperQueue.isReady();
    
    const stats = await smartClipperQueue.getJobCounts();
    console.log('📊 Current queue stats:', stats);
    
    // Check waiting jobs specifically
    const waitingJobs = await smartClipperQueue.getWaiting();
    console.log(`\n📋 ${waitingJobs.length} waiting jobs:`);
    
    waitingJobs.forEach((job, index) => {
      console.log(`  ${index + 1}. Job ${job.id}: "${job.name}" - attempts: ${job.attemptsMade}`);
    });
    
    // Look specifically for analyze-video-complete jobs
    const analyzeJobs = waitingJobs.filter(job => job.name === 'analyze-video-complete');
    console.log(`\n Found ${analyzeJobs.length} analyze-video-complete jobs`);
    
    if (analyzeJobs.length > 0) {
      console.log('Details:');
      analyzeJobs.forEach(job => {
        console.log(`  - Job ${job.id}: ${Object.keys(job.data).join(', ')}`);
      });
    }
    
    await smartClipperQueue.close();
  } catch (error) {
    console.error(' Error:', error);
  }
}

checkJobs();