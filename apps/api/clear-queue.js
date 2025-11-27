const Bull = require('bull');

// Use the same Redis config as the main app
const getRedisConfig = () => {
  if (process.env.REDIS_URL) {
    console.log('🔗 Using Redis URL configuration (Upstash/Cloud)');
    
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

async function clearQueue() {
  console.log('🧹 Connecting to Smart Clipper Queue...');
  
  const smartClipperQueue = new Bull('smart clipper', {
    redis: redisConfig
  });

  try {
    // Get current queue stats
    const stats = await smartClipperQueue.getJobCounts();
    console.log('📊 Current queue stats:', stats);
    
    if (stats.waiting > 0) {
      console.log(`🗑️ Found ${stats.waiting} waiting jobs. Clearing...`);
      
      // Get all waiting jobs
      const waitingJobs = await smartClipperQueue.getWaiting();
      console.log('📋 Waiting jobs:', waitingJobs.map(job => ({
        id: job.id,
        name: job.name,
        projectId: job.data?.projectId,
        created: new Date(job.timestamp)
      })));
      
      // Clear all waiting jobs
      await smartClipperQueue.clean(0, 'waiting');
      console.log('✅ Cleared all waiting jobs');
    }
    
    if (stats.active > 0) {
      console.log(`🗑️ Found ${stats.active} active jobs. Clearing...`);
      await smartClipperQueue.clean(0, 'active');
      console.log('✅ Cleared all active jobs');
    }
    
    if (stats.completed > 0) {
      console.log(`🗑️ Found ${stats.completed} completed jobs. Clearing...`);
      await smartClipperQueue.clean(0, 'completed');
      console.log('✅ Cleared all completed jobs');
    }
    
    if (stats.failed > 0) {
      console.log(`🗑️ Found ${stats.failed} failed jobs. Clearing...`);
      await smartClipperQueue.clean(0, 'failed');
      console.log('✅ Cleared all failed jobs');
    }
    
    // Check final stats
    const finalStats = await smartClipperQueue.getJobCounts();
    console.log('🎯 Final queue stats:', finalStats);
    
  } catch (error) {
    console.error('❌ Error clearing queue:', error);
  } finally {
    await smartClipperQueue.close();
    console.log('🔚 Queue connection closed');
    process.exit(0);
  }
}

clearQueue();