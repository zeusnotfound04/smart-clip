import { Router } from 'express';
import multer from 'multer';
import * as userController from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Get user profile
router.get('/profile', authMiddleware, userController.getUserProfile);

// Update user profile
router.patch('/profile', authMiddleware, userController.updateUserProfile);

// Upload profile picture
router.post('/profile/picture', authMiddleware, upload.single('image'), userController.uploadProfilePicture);

// Get user stats
router.get('/stats', authMiddleware, userController.getUserStats);

// Request email change
router.post('/email/request-change', authMiddleware, userController.requestEmailChange);

// Verify and change email
router.post('/email/verify-change', authMiddleware, userController.verifyEmailChange);

export default router;
