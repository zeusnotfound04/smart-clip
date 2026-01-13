import { Router } from 'express';
import { 
  getMyClips, 
  updateClipMetadata, 
  toggleFavorite, 
  getClipById,
  searchMyClips,
  incrementClipUsage
} from '../controllers/my-clips.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.get('/', authMiddleware, getMyClips);
router.get('/search', authMiddleware, searchMyClips);
router.get('/:id', authMiddleware, getClipById);
router.patch('/:id', authMiddleware, updateClipMetadata);
router.patch('/:id/favorite', authMiddleware, toggleFavorite);
router.post('/:id/use', authMiddleware, incrementClipUsage);

export default router;
