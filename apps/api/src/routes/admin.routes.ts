import express, { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { isAdmin } from '../middleware/admin.middleware';
import {
  getAllUsers,
  getUserByEmail,
  topUpCredits,
  updateAdminStatus,
  getAdminStats,
  checkAdminStatus
} from '../controllers/admin.controller';

const router: Router = express.Router();

router.get('/check', authMiddleware, checkAdminStatus);

router.use(authMiddleware);
router.use(isAdmin);

router.get('/stats', getAdminStats);

router.get('/users', getAllUsers);
router.get('/users/:email', getUserByEmail);

router.post('/credits/topup', topUpCredits);

router.post('/users/admin', updateAdminStatus);

export default router;
