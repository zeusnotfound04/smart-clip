import Bull from 'bull';

async function checkQueueStatus() {
  try {
    const redisConfig = {
      host: 'localhost',
      port: 6379,
      password: undefined
    };
    
    const smartClipperQueue = new Bull('smartClipper', { redis: redisConfig });

    console.log('=== SMART CLIPPER QUEUE STATUS ===');
    
    const counts = await smartClipperQueue.getJobCounts();
    console.log('Job counts:', counts);
    
    const waiting = await smartClipperQueue.getWaiting();
    console.log(`Waiting jobs: ${waiting.length}`);
    
    const active = await smartClipperQueue.getActive();
    console.log(`Active jobs: ${active.length}`);
    
    const failed = await smartClipperQueue.getFailed();
    console.log(`Failed jobs: ${failed.length}`);
    
    const completed = await smartClipperQueue.getCompleted();
    console.log(`Completed jobs: ${completed.length}`);
    
    if (failed.length > 0) {
      console.log('\n=== FAILED JOBS DETAILS ===');
      failed.forEach((job, index) => {
        console.log(`Failed Job ${index + 1}:`);
        console.log(`  ID: ${job.id}`);
        console.log(`  Name: ${job.name}`);
        console.log(`  Attempts: ${job.attemptsMade}/${job.opts.attempts}`);
        console.log(`  Data:`, job.data);
        console.log(`  Error:`, job.failedReason);
        console.log('---');
      });
    }

    await smartClipperQueue.close();
  } catch (error) {
    console.error('Error checking queue status:', error);
  }
}

checkQueueStatus();