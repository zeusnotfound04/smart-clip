import { Router } from 'express';
import multer from 'multer';
import * as userController from '../controllers/user.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

router.get('/profile', authMiddleware, userController.getUserProfile);
router.patch('/profile', authMiddleware, userController.updateUserProfile);
router.post('/profile/picture', authMiddleware, upload.single('image'), userController.uploadProfilePicture);
router.get('/stats', authMiddleware, userController.getUserStats);
router.post('/email/request-change', authMiddleware, userController.requestEmailChange);
router.post('/email/verify-change', authMiddleware, userController.verifyEmailChange);

export default router;
