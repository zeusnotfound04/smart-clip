// Test worker processing without HTTP server
import dotenv from 'dotenv';
dotenv.config();
import './src/workers/index.js';

console.log('🧪 Worker test mode - checking job processing...');

// Keep the process alive to see if jobs get processed
setInterval(() => {
  console.log('⏰ Worker still running...');
}, 10000);

process.on('SIGINT', () => {
  console.log('🛑 Worker test stopped');
  process.exit(0);
});