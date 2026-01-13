import { Router } from 'express';
import { VideoGenerationController } from '../controllers/video-generation.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router: Router = Router();
const videoController = new VideoGenerationController();

router.use(authMiddleware);

router.post('/generate', videoController.generateVideo);
router.get('/status/:projectId', videoController.getVideoStatus);
router.get('/library', videoController.getLibraryVideos);
router.post('/generate-script', videoController.generateScript);
router.get('/voices', videoController.getAvailableVoices);
router.post('/generate-audio', videoController.generateAudio);
router.post('/prepare-final', videoController.prepareFinalVideo);

export default router;