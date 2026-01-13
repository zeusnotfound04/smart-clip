import { Router } from 'express';
import { generateVideoThumbnail, generateSprite, getMetadata } from '../controllers/thumbnail.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/generate', authMiddleware, generateVideoThumbnail);
router.post('/sprite', authMiddleware, generateSprite);
router.get('/metadata', authMiddleware, getMetadata);

export default router;