import express from 'express';
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

const router = express.Router();

// Check if user is admin (authenticated users only)
router.get('/check', authMiddleware, checkAdminStatus);

// All routes below require authentication AND admin privileges
router.use(authMiddleware);
router.use(isAdmin);

// Dashboard stats
router.get('/stats', getAdminStats);

// User management
router.get('/users', getAllUsers);
router.get('/users/:email', getUserByEmail);

// Credit management
router.post('/credits/topup', topUpCredits);

// Admin management
router.post('/users/admin', updateAdminStatus);

export default router;
