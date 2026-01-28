import { instagramDownloader } from '../src/services/instagram-downloader.service.js';

/**
 * Test script for Instagram downloader with imginn.com support
 */

const testUrls = [
  'https://www.instagram.com/reels/DT-Y6xukuwG/',
  'https://www.instagram.com/p/DUBFoZBErz7/',
];

async function testDownloader() {
  console.log('🧪 Testing Instagram Downloader with imginn.com support\n');
  console.log('=' .repeat(60));

  for (const url of testUrls) {
    console.log(`\n📝 Testing URL: ${url}`);
    console.log('-'.repeat(60));

    try {
      const result = await instagramDownloader.getDownloadUrl(url);
      
      console.log('✅ Success!');
      console.log('   Download URL:', result.downloadUrl);
      console.log('   Cached:', result.cached ? 'Yes' : 'No');
      if (result.thumbnail) {
        console.log('   Thumbnail:', result.thumbnail);
      }
      if (result.duration) {
        console.log('   Duration:', result.duration, 'seconds');
      }
      
    } catch (error: any) {
      console.error('❌ Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Service Stats:');
  console.log(JSON.stringify(instagramDownloader.getStats(), null, 2));

  // Cleanup
  await instagramDownloader.cleanup();
  console.log('\n✅ Test completed');
  process.exit(0);
}

// Run tests
testDownloader().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
