import { Router } from 'express';
import { health, healthDetailed, serviceStatus } from '../controllers/health.controller';

const router: Router = Router();

router.get('/', health);

router.get('/detailed', healthDetailed);

router.get('/status', serviceStatus);

export default router;