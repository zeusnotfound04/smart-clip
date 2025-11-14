import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import videoRoutes from './routes/videos';
import projectRoutes from './routes/projects';
import subtitleRoutes from './routes/subtitles';
import splitStreamerRoutes from './routes/split-streamer.routes';
import smartClipperRoutes from './routes/smart-clipper.routes';
import scriptGeneratorRoutes from './routes/script-generator.routes';
import fakeConversationsRoutes from './routes/fake-conversations.routes';
import statusRoutes from './routes/status.routes';
import thumbnailRoutes from './routes/thumbnail.routes';
import videoProcessingRoutes from './routes/video-processing.routes';
import healthRoutes from './routes/health.routes';
import docsRoutes from './routes/docs.routes';
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger, 
  rateLimiter, 
  securityHeaders 
} from './middleware/error.middleware';
import './workers';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security and logging middleware
app.use(securityHeaders);
app.use(requestLogger);
app.use(rateLimiter(1000, 15 * 60 * 1000)); // 1000 requests per 15 minutes

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/subtitles', subtitleRoutes);
app.use('/api/split-streamer', splitStreamerRoutes);
app.use('/api/smart-clipper', smartClipperRoutes);
app.use('/api/script-generator', scriptGeneratorRoutes);
app.use('/api/fake-conversations', fakeConversationsRoutes);
app.use('/api/status', statusRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/video-processing', videoProcessingRoutes);

app.use('/api/health', healthRoutes);
app.use('/api/docs', docsRoutes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 SmartClips API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📈 Detailed health: http://localhost:${PORT}/api/health/detailed`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});