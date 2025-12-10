import { Router } from 'express';
import { generate, getSubtitles, updateSubtitle, exportSRT, downloadSRT, getDetailedSubtitles, updateConfiguration } from '../controllers/auto-subtitles.controller';
import { getSupportedLanguages } from '../controllers/languages.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.get('/languages', getSupportedLanguages);
router.post('/generate', authMiddleware, generate);
router.get('/:videoId', authMiddleware, getSubtitles);
router.get('/debug/:videoId', authMiddleware, getDetailedSubtitles);
router.put('/:id', authMiddleware, updateSubtitle);
router.put('/config/:videoId', authMiddleware, updateConfiguration);
router.post('/export/:videoId', authMiddleware, exportSRT);
router.get('/download/:videoId', authMiddleware, downloadSRT);

export default router;