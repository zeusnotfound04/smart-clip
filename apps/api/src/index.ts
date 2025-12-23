import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from './config/passport';
import authRoutes from './routes/auth';
import videoRoutes from './routes/videos';
import projectRoutes from './routes/projects';
import subtitleRoutes from './routes/subtitles';
import splitStreamerRoutes from './routes/split-streamer.routes';
import smartClipperRoutes from './routes/smart-clipper.routes';
import scriptGeneratorRoutes from './routes/script-generator.routes';
import aiScriptGeneratorRoutes from './routes/ai-script-generator.routes';
import fakeConversationsRoutes from './routes/fake-conversations.routes';
import statusRoutes from './routes/status.routes';
import thumbnailRoutes from './routes/thumbnail.routes';
import videoProcessingRoutes from './routes/video-processing.routes';
import videoGenerationRoutes from './routes/video-generation.routes';
import healthRoutes from './routes/health.routes';
import docsRoutes from './routes/docs.routes';
import creditsRoutes from './routes/credits.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import stripeRoutes from './routes/stripe.routes.js';
import testRoutes from './routes/test.routes.js';
import myClipsRoutes from './routes/my-clips.routes';
import adminRoutes from './routes/admin.routes';
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger, 
  rateLimiter, 
  securityHeaders 
} from './middleware/error.middleware';
import './workers';
import { smartClipperQueue, videoProcessingQueue, subtitleQueue, aiQueue } from './lib/queues';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001; // Changed to avoid conflicts

// Security and logging middleware
app.use(securityHeaders);
app.use(requestLogger);
app.use(rateLimiter(1000, 15 * 60 * 1000)); // 1000 requests per 15 minutes

// CORS configuration for multiple environments
const allowedOrigins = [
  'http://localhost:3000',
  'https://smartclips.upalert.online',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Increase body parser limits for large video uploads (500MB)
app.use(express.json({ 
  limit: '500mb',
  strict: false
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '500mb',
  parameterLimit: 50000
}));

// Session configuration for Passport
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Add timeout middleware for long-running operations
app.use((req, res, next) => {
  // Set longer timeout for video processing endpoints
  if (req.path.includes('/split-streamer') || 
      req.path.includes('/subtitles') || 
      req.path.includes('/smart-clipper') ||
      req.path.includes('/video-processing')) {
    req.setTimeout(1800000); // 30 minutes
    res.setTimeout(1800000); // 30 minutes
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/my-clips', myClipsRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/subtitles', subtitleRoutes);
app.use('/api/split-streamer', splitStreamerRoutes);
app.use('/api/smart-clipper', smartClipperRoutes);
app.use('/api/script-generator', scriptGeneratorRoutes);
app.use('/api/ai-script-generator', aiScriptGeneratorRoutes);
app.use('/api/fake-conversations', fakeConversationsRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/video-processing', videoProcessingRoutes);
app.use('/api/video-generation', videoGenerationRoutes);

// Credits and Subscription routes
app.use('/api/credits', creditsRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/stripe', stripeRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// TEMPORARY: Test routes for local development (remove in production)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/test', testRoutes);
  console.log('⚠️  Test routes enabled (development mode only)');
}

app.use('/api/health', healthRoutes);
app.use('/api/docs', docsRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Initialize Redis connections
async function initializeRedisConnections() {
  console.log('🔄 Initializing Redis connections...');
  
  const queues = [
    { name: 'Smart Clipper Queue', queue: smartClipperQueue },
    { name: 'Video Processing Queue', queue: videoProcessingQueue },
    { name: 'Subtitle Queue', queue: subtitleQueue },
    { name: 'AI Queue', queue: aiQueue }
  ];

  for (const { name, queue } of queues) {
    try {
      console.log(`🔍 Testing ${name} connection...`);
      await queue.isReady();
      const stats = await queue.getJobCounts();
      console.log(`✅ ${name} connected - Jobs: waiting(${stats.waiting}) active(${stats.active}) completed(${stats.completed}) failed(${stats.failed})`);
    } catch (error) {
      console.error(`❌ ${name} connection failed:`, error instanceof Error ? error.message : String(error));
      console.error('🚨 Redis connection required for queue operations. Please ensure Redis is running.');
      process.exit(1);
    }
  }
  
  console.log('🎉 All Redis connections established successfully!');
}

async function startServer() {
  try {
    // Initialize Redis first
    await initializeRedisConnections();
    
    // Start the server
    app.listen(PORT, () => {
      console.log('\n🚀 SmartClips API Server started successfully!');
      console.log(`📍 Server: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📈 Detailed health: http://localhost:${PORT}/api/health/detailed`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('✅ Ready to accept requests\n');
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  await Promise.all([
    smartClipperQueue.close(),
    videoProcessingQueue.close(),
    subtitleQueue.close(),
    aiQueue.close()
  ]);
  console.log('✅ All queues closed');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  await Promise.all([
    smartClipperQueue.close(),
    videoProcessingQueue.close(),
    subtitleQueue.close(),
    aiQueue.close()
  ]);
  console.log('✅ All queues closed');
  process.exit(0);
});

// Start the server
startServer();