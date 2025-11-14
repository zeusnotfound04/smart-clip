import { Router } from 'express';
import { generate, getSubtitles, updateSubtitle, exportSRT, downloadSRT } from '../controllers/auto-subtitles.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/generate', authMiddleware, generate);
router.get('/:videoId', authMiddleware, getSubtitles);
router.put('/:id', authMiddleware, updateSubtitle);
router.post('/export/:videoId', authMiddleware, exportSRT);
router.get('/download/:videoId', authMiddleware, downloadSRT);

export default router;