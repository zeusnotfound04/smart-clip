import { Router } from 'express';
import { getPresignedUrl, confirmUpload, list, deleteVideo } from '../controllers/video.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/upload-url', authMiddleware, getPresignedUrl);
router.post('/confirm-upload', authMiddleware, confirmUpload);
router.get('/', authMiddleware, list);
router.delete('/:id', authMiddleware, deleteVideo);

export default router;