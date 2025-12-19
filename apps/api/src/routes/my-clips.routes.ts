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

// Get all user's clips with filters
router.get('/', authMiddleware, getMyClips);

// Search clips
router.get('/search', authMiddleware, searchMyClips);

// Get specific clip
router.get('/:id', authMiddleware, getClipById);

// Update clip metadata (title, description, tags)
router.patch('/:id', authMiddleware, updateClipMetadata);

// Toggle favorite status
router.patch('/:id/favorite', authMiddleware, toggleFavorite);

// Increment usage count when clip is reused
router.post('/:id/use', authMiddleware, incrementClipUsage);

export default router;
