import { Router } from 'express';
import { VideoGenerationController } from '../controllers/video-generation.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: Router = Router();
const videoController = new VideoGenerationController();

// 🔒 All video generation routes require authentication
router.use(authMiddleware);

// 🎬 Generate Complete Video with Narration (Legacy)
// POST /api/video-generation/generate
router.post('/generate', videoController.generateVideo);

// 🎬 Get Video Generation Status  
// GET /api/video-generation/status/:projectId
router.get('/status/:projectId', videoController.getVideoStatus);

// 📚 Get Library Videos for Selection
// GET /api/video-generation/library
router.get('/library', videoController.getLibraryVideos);

// 🔥 NEW PHASED APPROACH ENDPOINTS
// Phase 1: Script Generation
// POST /api/video-generation/generate-script
router.post('/generate-script', videoController.generateScript);

// Phase 2: Voice & Audio Generation
// GET /api/video-generation/voices - Get available voices
router.get('/voices', videoController.getAvailableVoices);

// POST /api/video-generation/generate-audio - Generate TTS audio
router.post('/generate-audio', videoController.generateAudio);

// Phase 3: Final Video Preparation  
// POST /api/video-generation/prepare-final - Combine audio and video
router.post('/prepare-final', videoController.prepareFinalVideo);

export default router;