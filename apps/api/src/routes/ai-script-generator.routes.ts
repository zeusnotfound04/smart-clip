import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  generateScript,
  regenerateScript,
  getUserScripts,
  getScriptProject,
  updateScriptFeedback,
  deleteScriptProject,
  getScriptTemplates,
  getVideoLibrary,
  generateGameplayScript,
  generateNarration,
  combineVideoWithNarration,
  getProcessingStatus
} from '../controllers/ai-script-generator.controller';

const router: Router = Router();

router.use(authenticateToken);

router.post('/generate', generateScript);
router.post('/:projectId/regenerate', regenerateScript);

router.get('/projects', getUserScripts);
router.get('/projects/:projectId', getScriptProject);
router.delete('/projects/:projectId', deleteScriptProject);

router.put('/scripts/:scriptId/feedback', updateScriptFeedback);

router.get('/templates', getScriptTemplates);

router.get('/library', getVideoLibrary);

router.post('/gameplay/generate-script', generateGameplayScript);
router.post('/gameplay/generate-narration', generateNarration);
router.post('/gameplay/combine-video', combineVideoWithNarration);
router.get('/gameplay/status/:jobId', getProcessingStatus);

export default router;