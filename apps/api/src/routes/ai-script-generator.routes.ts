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

// All routes require authentication
router.use(authenticateToken);

// Script generation endpoints
router.post('/generate', generateScript);
router.post('/:projectId/regenerate', regenerateScript);

// Script management endpoints  
router.get('/projects', getUserScripts);
router.get('/projects/:projectId', getScriptProject);
router.delete('/projects/:projectId', deleteScriptProject);

// Script feedback
router.put('/scripts/:scriptId/feedback', updateScriptFeedback);

// Templates and utilities
router.get('/templates', getScriptTemplates);

// Global video library endpoint (read-only for users)
router.get('/library', getVideoLibrary);

// Gameplay script generation workflow
router.post('/gameplay/generate-script', generateGameplayScript);
router.post('/gameplay/generate-narration', generateNarration);
router.post('/gameplay/combine-video', combineVideoWithNarration);
router.get('/gameplay/status/:jobId', getProcessingStatus);

export default router;