import { Router } from 'express';
import { apiDocs } from '../controllers/docs.controller';

const router: Router = Router();

router.get('/', apiDocs);

export default router;