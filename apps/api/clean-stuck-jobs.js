const Bull = require('bull');

// Support both Redis URL (for Upstash/cloud) and individual config (for local)
const getRedisConfig = () => {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
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
  }
  
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  };
};

const redisConfig = getRedisConfig();

const subtitleQueue = new Bull('subtitle generation', { redis: redisConfig });
const smartClipperQueue = new Bull('smart clipper', { redis: redisConfig });

async function cleanStuckJobs() {
  console.log('🧹 Cleaning stuck jobs...\n');
  
  try {
    // Clean subtitle queue
    console.log('📋 Subtitle Queue Status:');
    const subtitleCounts = await subtitleQueue.getJobCounts();
    console.log(`   Active: ${subtitleCounts.active}`);
    console.log(`   Waiting: ${subtitleCounts.waiting}`);
    console.log(`   Delayed: ${subtitleCounts.delayed}`);
    console.log(`   Failed: ${subtitleCounts.failed}`);
    console.log(`   Completed: ${subtitleCounts.completed}`);
    
    // Get stuck jobs
    const activeSubtitleJobs = await subtitleQueue.getActive();
    const failedSubtitleJobs = await subtitleQueue.getFailed();
    const delayedSubtitleJobs = await subtitleQueue.getDelayed();
    
    console.log(`\n🔍 Found ${activeSubtitleJobs.length} active jobs`);
    console.log(`🔍 Found ${failedSubtitleJobs.length} failed jobs`);
    console.log(`🔍 Found ${delayedSubtitleJobs.length} delayed jobs`);
    
    // Clean active jobs that are stuck
    for (const job of activeSubtitleJobs) {
      console.log(`\n❌ Removing stuck active job ${job.id}`);
      console.log(`   Video ID: ${job.data.videoId}`);
      await job.remove();
    }
    
    // Clean failed jobs
    for (const job of failedSubtitleJobs) {
      console.log(`\n🗑️  Removing failed job ${job.id}`);
      await job.remove();
    }
    
    // Clean delayed jobs
    for (const job of delayedSubtitleJobs) {
      console.log(`\n⏰ Removing delayed job ${job.id}`);
      await job.remove();
    }
    
    console.log('\n---\n');
    
    // Clean smart clipper queue
    console.log('📋 Smart Clipper Queue Status:');
    const clipperCounts = await smartClipperQueue.getJobCounts();
    console.log(`   Active: ${clipperCounts.active}`);
    console.log(`   Waiting: ${clipperCounts.waiting}`);
    console.log(`   Delayed: ${clipperCounts.delayed}`);
    console.log(`   Failed: ${clipperCounts.failed}`);
    console.log(`   Completed: ${clipperCounts.completed}`);
    
    const activeClipperJobs = await smartClipperQueue.getActive();
    const failedClipperJobs = await smartClipperQueue.getFailed();
    const delayedClipperJobs = await smartClipperQueue.getDelayed();
    
    console.log(`\n🔍 Found ${activeClipperJobs.length} active jobs`);
    console.log(`🔍 Found ${failedClipperJobs.length} failed jobs`);
    console.log(`🔍 Found ${delayedClipperJobs.length} delayed jobs`);
    
    for (const job of activeClipperJobs) {
      console.log(`\n❌ Removing stuck active job ${job.id}`);
      await job.remove();
    }
    
    for (const job of failedClipperJobs) {
      console.log(`\n🗑️  Removing failed job ${job.id}`);
      await job.remove();
    }
    
    for (const job of delayedClipperJobs) {
      console.log(`\n⏰ Removing delayed job ${job.id}`);
      await job.remove();
    }
    
    console.log('\n✅ Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error cleaning jobs:', error);
  } finally {
    await subtitleQueue.close();
    await smartClipperQueue.close();
    process.exit(0);
  }
}

cleanStuckJobs();
