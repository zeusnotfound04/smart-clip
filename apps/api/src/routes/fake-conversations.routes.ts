import { Router } from 'express';
import FakeConversationsController from '../controllers/fake-conversations.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();
const conversationsController = new FakeConversationsController();

// Generate conversation
router.post('/generate', authMiddleware, conversationsController.generateConversation);

// Regenerate conversation
router.post('/regenerate/:projectId', authMiddleware, conversationsController.regenerateConversation);

// Get user conversations
router.get('/conversations', authMiddleware, conversationsController.getUserConversations);

// Get specific conversation project
router.get('/conversations/:projectId', authMiddleware, conversationsController.getConversationProject);

// Delete conversation project
router.delete('/conversations/:projectId', authMiddleware, conversationsController.deleteConversationProject);

// Update conversation settings
router.patch('/conversations/:projectId/settings', authMiddleware, conversationsController.updateConversationSettings);

// Generate video from conversation
router.post('/conversations/:projectId/generate-video', authMiddleware, conversationsController.generateVideo);

// Submit feedback
router.post('/conversations/:projectId/feedback', authMiddleware, conversationsController.submitFeedback);

// Get templates
router.get('/templates', conversationsController.getTemplates);

// Get chat styles
router.get('/chat-styles', conversationsController.getChatStyles);

// Get voices
router.get('/voices', conversationsController.getVoices);

export default router;