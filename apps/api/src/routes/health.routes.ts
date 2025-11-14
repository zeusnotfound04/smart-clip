import { Router } from 'express';
import { health, healthDetailed, serviceStatus } from '../controllers/health.controller';

const router: Router = Router();

// Basic health check
router.get('/', health);

// Detailed health check
router.get('/detailed', healthDetailed);

// Service status and metrics
router.get('/status', serviceStatus);

export default router;