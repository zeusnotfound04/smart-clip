// Quick Redis connection test for Upstash
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL, {
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

async function testConnection() {
  try {
    console.log('🔍 Testing Upstash Redis connection...');
    await redis.ping();
    console.log('✅ Upstash Redis connection successful!');
    
    // Test basic operations
    await redis.set('test-key', 'test-value');
    const value = await redis.get('test-key');
    console.log('✅ Read/write test successful:', value);
    
    await redis.del('test-key');
    console.log('✅ Cleanup successful');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    process.exit(1);
  } finally {
    await redis.disconnect();
  }
}

testConnection();