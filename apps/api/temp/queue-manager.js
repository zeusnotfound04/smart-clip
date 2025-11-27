"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Queue Management Script - Clear stuck jobs and test processing
const dotenv_1 = require("dotenv");
dotenv_1.default.config();
const queues_1 = require("./src/lib/queues");
async function manageQueue() {
    try {
        console.log('🔧 Smart Clipper Queue Management');
        console.log('================================');
        // Check current queue status
        const stats = await queues_1.smartClipperQueue.getJobCounts();
        console.log('📊 Current queue stats:', stats);
        if (stats.waiting > 0 || stats.failed > 0) {
            console.log(`⚠️  Found ${stats.waiting} waiting jobs and ${stats.failed} failed jobs`);
            // Get all jobs
            const waitingJobs = await queues_1.smartClipperQueue.getWaiting();
            const failedJobs = await queues_1.smartClipperQueue.getFailed();
            console.log('🔍 Stuck jobs details:');
            waitingJobs.forEach(job => {
                console.log(`  - Job ${job.id}: ${job.name} (attempts: ${job.attemptsMade})`);
            });
            failedJobs.forEach(job => {
                console.log(`  - Failed Job ${job.id}: ${job.name} (reason: ${job.failedReason})`);
            });
            // Clear stuck jobs
            console.log('🧹 Clearing stuck jobs...');
            await queues_1.smartClipperQueue.clean(0, 'waiting');
            await queues_1.smartClipperQueue.clean(0, 'failed');
            await queues_1.smartClipperQueue.clean(0, 'completed');
            const newStats = await queues_1.smartClipperQueue.getJobCounts();
            console.log('✅ After cleanup:', newStats);
        }
        // Test with a simple job
        console.log('🧪 Adding test job...');
        const testJob = await queues_1.smartClipperQueue.add('analyze-video-complete', {
            projectId: 'test-' + Date.now(),
            videoPath: 'test.mp4',
            videoDuration: 30,
            contentType: 'tutorial',
            config: { test: true },
            requestId: 'test-' + Math.random().toString(36)
        });
        console.log(`✅ Test job ${testJob.id} added successfully`);
        // Wait and check if it gets processed
        console.log('⏳ Waiting 10 seconds to see if job gets processed...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        const finalStats = await queues_1.smartClipperQueue.getJobCounts();
        console.log('📊 Final stats:', finalStats);
        if (finalStats.active > 0 || finalStats.completed > finalStats.completed) {
            console.log('🎉 Job processing is working!');
        }
        else {
            console.log('⚠️  Jobs still not processing - worker issue detected');
        }
    }
    catch (error) {
        console.error('❌ Error managing queue:', error);
    }
    process.exit(0);
}
manageQueue();
