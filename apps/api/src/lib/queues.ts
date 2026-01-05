import Bull from 'bull';

// Support both Redis URL (for Upstash/cloud) and individual config (for local)
const getRedisConfig = () => {
  if (process.env.REDIS_URL) {
    console.log('🔗 Using Redis URL configuration (Upstash/Cloud)');
    console.log('🔧 Redis URL (masked):', process.env.REDIS_URL.replace(/:[^:@]+@/, ':****@'));
    
    // Parse Upstash Redis URL for Bull.js compatibility
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password,
      username: url.username || 'default',
      // TLS configuration for rediss:// URLs
      tls: url.protocol === 'rediss:' ? {
        rejectUnauthorized: false // Upstash uses self-signed certificates
      } : undefined,
      // Additional options for Upstash
      connectTimeout: 60000,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      family: 4 // Force IPv4
    };
  }
  
  console.log('🏠 Using local Redis configuration');
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  };
};

const redisConfig = getRedisConfig();
console.log('📋 Redis config type:', typeof redisConfig);
console.log('📋 Redis config (safe):', typeof redisConfig === 'string' ? 'URL_STRING' : redisConfig);

// Export for use in workers
export { redisConfig };

export const videoProcessingQueue = new Bull('video processing', {
  redis: redisConfig,
  settings: {
    stalledInterval: 120 * 1000,
    maxStalledCount: 3,
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    timeout: 5400000
  }
});

export const subtitleQueue = new Bull('subtitle generation', {
  redis: redisConfig,
  settings: {
    stalledInterval: 300 * 1000,
    maxStalledCount: 1, // Only retry once if stalled
    lockDuration: 600000,
    lockRenewTime: 150000
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 1, // Single attempt only - no retries
    timeout: 7200000,
    jobId: undefined // Will be set per-job for deduplication
  }
});

export const aiQueue = new Bull('ai processing', {
  redis: redisConfig,
  settings: {
    stalledInterval: 30 * 1000,
    maxStalledCount: 1,
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 10,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000
    }
  }
});

export const smartClipperQueue = new Bull('smart clipper', {
  redis: redisConfig,
  settings: {
    stalledInterval: 120 * 1000,
    maxStalledCount: 3,
  },
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 100,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    timeout: 10800000
  }
});

// Add connection event listeners for debugging
const addConnectionListeners = (queue: Bull.Queue, name: string) => {
  queue.on('error', (error) => {
    console.error(`❌ ${name} Queue Error:`, error.message);
  });
  
  queue.on('waiting', (jobId) => {
    console.log(`⏳ ${name} Job ${jobId} is waiting`);
  });
  
  queue.on('active', (job) => {
    console.log(`🚀 ${name} Job ${job.id} started processing`);
  });
  
  queue.on('completed', (job) => {
    console.log(`✅ ${name} Job ${job.id} completed`);
  });
  
  queue.on('failed', (job, error) => {
    console.error(`❌ ${name} Job ${job?.id} failed:`, error.message);
  });
};

// Add listeners to all queues
addConnectionListeners(videoProcessingQueue, 'Video Processing');
addConnectionListeners(subtitleQueue, 'Subtitle');
addConnectionListeners(aiQueue, 'AI');
addConnectionListeners(smartClipperQueue, 'Smart Clipper');

// Cleanup function to remove stalled jobs on startup
export async function cleanupStalledJobs() {
  console.log('🧹 Cleaning up stalled jobs from previous server run...');
  
  try {
    // Clean subtitle queue - remove ALL jobs (active, waiting, delayed, failed)
    const activeSubtitleJobs = await subtitleQueue.getActive();
    const waitingSubtitleJobs = await subtitleQueue.getWaiting();
    const delayedSubtitleJobs = await subtitleQueue.getDelayed();
    const failedSubtitleJobs = await subtitleQueue.getFailed(0, 100);
    
    console.log(`📋 Subtitle Queue: ${activeSubtitleJobs.length} active, ${waitingSubtitleJobs.length} waiting, ${delayedSubtitleJobs.length} delayed, ${failedSubtitleJobs.length} failed`);
    
    // Remove ALL jobs from subtitle queue
    const allSubtitleJobs = [...activeSubtitleJobs, ...waitingSubtitleJobs, ...delayedSubtitleJobs];
    for (const job of allSubtitleJobs) {
      try {
        console.log(`   ❌ Removing job ${job.id} for video ${job.data.videoId}`);
        // Discard the job to prevent retry
        await job.discard();
        // Force remove from Redis
        await job.remove();
      } catch (err) {
        console.log(`   ⚠️  Could not remove job ${job.id}:`, err.message);
      }
    }
    
    // Remove old failed jobs
    const oneHourAgo = Date.now() - 3600000;
    for (const job of failedSubtitleJobs) {
      if (job.timestamp < oneHourAgo) {
        try {
          console.log(`   🗑️  Removing old failed job ${job.id}`);
          await job.remove();
        } catch (err) {
          // Already removed
        }
      }
    }
    
    // Clean smart clipper queue
    const activeClipperJobs = await smartClipperQueue.getActive();
    const waitingClipperJobs = await smartClipperQueue.getWaiting();
    const delayedClipperJobs = await smartClipperQueue.getDelayed();
    const failedClipperJobs = await smartClipperQueue.getFailed(0, 100);
    
    console.log(`📋 Smart Clipper Queue: ${activeClipperJobs.length} active, ${waitingClipperJobs.length} waiting, ${delayedClipperJobs.length} delayed, ${failedClipperJobs.length} failed`);
    
    const allClipperJobs = [...activeClipperJobs, ...waitingClipperJobs, ...delayedClipperJobs];
    for (const job of allClipperJobs) {
      try {
        console.log(`   ❌ Removing job ${job.id}`);
        await job.discard();
        await job.remove();
      } catch (err) {
        console.log(`   ⚠️  Could not remove job ${job.id}:`, err.message);
      }
    }
    
    for (const job of failedClipperJobs) {
      if (job.timestamp < oneHourAgo) {
        try {
          console.log(`   🗑️  Removing old failed job ${job.id}`);
          await job.remove();
        } catch (err) {
          // Already removed
        }
      }
    }
    
    console.log('✅ Stalled job cleanup completed');
  } catch (error) {
    console.error('❌ Error cleaning stalled jobs:', error);
  }
}

// Log when queues are ready for processing
console.log('🔄 Queue processors initialized:');
console.log('  📊 Video Processing Queue ready');
console.log('  📝 Subtitle Queue ready'); 
console.log('  🤖 AI Queue ready');
console.log('  ✨ Smart Clipper Queue ready');
console.log('🎉 All workers are listening for jobs!');

// Add a test to see if jobs can be processed
setTimeout(async () => {
  try {
    const stats = await smartClipperQueue.getJobCounts();
    console.log(`🔍 Queue check: waiting(${stats.waiting}) active(${stats.active}) completed(${stats.completed}) failed(${stats.failed})`);
    if (stats.waiting > 0) {
      console.log('⚠️ Jobs are waiting but not processing - attempting to retry...');
      
      // Try to manually process one job to test
      const waitingJobs = await smartClipperQueue.getWaiting();
      console.log(`🔄 Found ${waitingJobs.length} waiting jobs`);
      
      if (waitingJobs.length > 0) {
        const job = waitingJobs[0];
        console.log(`🧪 Testing with job ${job.id}:`, {
          name: job.name,
          data: job.data ? Object.keys(job.data) : 'no data',
          attemptsMade: job.attemptsMade,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn
        });
        
        // Test: Add a simple test job to see if it gets processed
        console.log('🧪 Adding a test job to verify processing...');
        try {
          const testJob = await smartClipperQueue.add('analyze-video-complete', {
            projectId: 'test-job-' + Date.now(),
            videoPath: 'test-video.mp4',
            videoDuration: 60,
            contentType: 'tutorial',
            config: { test: true },
            requestId: 'test-' + Date.now()
          });
          console.log(`✅ Test job ${testJob.id} added successfully`);
        } catch (testError) {
          console.error('❌ Failed to add test job:', testError);
        }
      }
    }
  } catch (error) {
    console.error('❌ Failed to check queue stats:', error);
  }
}, 8000);

// Export functions for external use
export { getRedisConfig };