"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smartClipperQueue = exports.aiQueue = exports.subtitleQueue = exports.videoProcessingQueue = exports.redisConfig = void 0;
const bull_1 = require("bull");
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
exports.redisConfig = redisConfig;
console.log('📋 Redis config type:', typeof redisConfig);
console.log('📋 Redis config (safe):', typeof redisConfig === 'string' ? 'URL_STRING' : redisConfig);
exports.videoProcessingQueue = new bull_1.default('video processing', {
    redis: redisConfig,
    settings: {
        stalledInterval: 30 * 1000, // 30 seconds
        maxStalledCount: 1,
    },
    defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 10,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000
        }
    }
});
exports.subtitleQueue = new bull_1.default('subtitle generation', {
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
            delay: 1000
        }
    }
});
exports.aiQueue = new bull_1.default('ai processing', {
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
exports.smartClipperQueue = new bull_1.default('smart clipper', {
    redis: redisConfig,
    settings: {
        stalledInterval: 30 * 1000,
        maxStalledCount: 1,
    },
    defaultJobOptions: {
        removeOnComplete: 5,
        removeOnFail: 5,
        attempts: 2,
        backoff: {
            type: 'exponential',
            delay: 5000
        }
    }
});
// Add connection event listeners for debugging
const addConnectionListeners = (queue, name) => {
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
addConnectionListeners(exports.videoProcessingQueue, 'Video Processing');
addConnectionListeners(exports.subtitleQueue, 'Subtitle');
addConnectionListeners(exports.aiQueue, 'AI');
addConnectionListeners(exports.smartClipperQueue, 'Smart Clipper');
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
        const stats = await exports.smartClipperQueue.getJobCounts();
        console.log(`🔍 Queue check: waiting(${stats.waiting}) active(${stats.active}) completed(${stats.completed}) failed(${stats.failed})`);
        if (stats.waiting > 0) {
            console.log('⚠️ Jobs are waiting but not processing - attempting to retry...');
            // Try to manually process one job to test
            const waitingJobs = await exports.smartClipperQueue.getWaiting();
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
                    const testJob = await exports.smartClipperQueue.add('analyze-video-complete', {
                        projectId: 'test-job-' + Date.now(),
                        videoPath: 'test-video.mp4',
                        videoDuration: 60,
                        contentType: 'tutorial',
                        config: { test: true },
                        requestId: 'test-' + Date.now()
                    });
                    console.log(`✅ Test job ${testJob.id} added successfully`);
                }
                catch (testError) {
                    console.error('❌ Failed to add test job:', testError);
                }
            }
        }
    }
    catch (error) {
        console.error('❌ Failed to check queue stats:', error);
    }
}, 8000);
