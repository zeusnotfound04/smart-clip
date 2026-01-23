import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getSubtitleStyles,
  getYouTubeInfo,
  uploadVideo,
  getUploadedVideoInfo,
  calculateCredits,
  createProject,
  getProjectStatus,
  getProject,
  getUserProjects,
  deleteProject,
  downloadOutput,
} from '../controllers/podcast-clipper.controller';

const router: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported formats: MP4, WebM, MOV, AVI'));
    }
  },
});

router.get('/styles', authMiddleware, getSubtitleStyles);

router.get('/youtube-info', authMiddleware, getYouTubeInfo);

router.get('/calculate-credits', authMiddleware, calculateCredits);

router.post('/upload', authMiddleware, upload.single('video'), uploadVideo);

router.get('/upload/:videoId', authMiddleware, getUploadedVideoInfo);

router.post('/projects', authMiddleware, createProject);

router.get('/projects', authMiddleware, getUserProjects);

router.get('/projects/:projectId/status', authMiddleware, getProjectStatus);

router.get('/projects/:projectId', authMiddleware, getProject);

router.delete('/projects/:projectId', authMiddleware, deleteProject);

router.get('/projects/:projectId/download', authMiddleware, downloadOutput);

export default router;
