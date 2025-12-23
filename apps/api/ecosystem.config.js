module.exports = {
  apps: [{
    name: 'smart-clip-api',
    script: './dist/index.js',
    instances: 1, // Use 1 instance for video processing to avoid memory conflicts
    exec_mode: 'fork',
    node_args: '--max-old-space-size=6144', // 6GB memory limit for large video files
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      // Memory management for large files
      UV_THREADPOOL_SIZE: 16, // Increase thread pool for file operations
      // Font configuration for subtitle generation
      FONTCONFIG_FILE: '/home/ubuntu/asli/apps/api/fonts/fonts.conf',
      FONTCONFIG_PATH: '/home/ubuntu/asli/apps/api/fonts',
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 5001,
      UV_THREADPOOL_SIZE: 8,
    },
    // PM2 specific settings for large file handling
    max_memory_restart: '5G', // Restart if memory usage exceeds 5GB
    kill_timeout: 60000, // 60 seconds to gracefully shutdown (for video processing)
    listen_timeout: 10000,
    wait_ready: true,
    
    // Error handling
    max_restarts: 3,
    min_uptime: '10s',
    restart_delay: 5000,
    
    // Logging
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Auto restart on file changes (disable in production)
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'temp', 'uploads'],
    
    // Environment specific overrides
    env_production: {
      NODE_ENV: 'production',
      instances: 1,
      max_memory_restart: '5G'
    }
  }],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'ubuntu',
      host: ['your-server.com'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/smart-clip.git',
      path: '/var/www/smart-clip',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      env: {
        NODE_ENV: 'production'
      }
    }
  }
};