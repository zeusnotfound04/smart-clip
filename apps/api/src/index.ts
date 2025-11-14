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
import './workers';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/subtitles', subtitleRoutes);
app.use('/api/split-streamer', splitStreamerRoutes);
app.use('/api/smart-clipper', smartClipperRoutes);
app.use('/api/script-generator', scriptGeneratorRoutes);
app.use('/api/fake-conversations', fakeConversationsRoutes);
app.use('/api/status', statusRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});