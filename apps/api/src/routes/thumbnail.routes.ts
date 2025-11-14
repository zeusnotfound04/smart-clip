import { Router } from 'express';
import { generateVideoThumbnail, generateSprite, getMetadata } from '../controllers/thumbnail.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

// Generate single thumbnail
router.post('/generate', authMiddleware, generateVideoThumbnail);

// Generate thumbnail sprite sheet  
router.post('/sprite', authMiddleware, generateSprite);

// Get video metadata
router.get('/metadata', authMiddleware, getMetadata);

export default router;