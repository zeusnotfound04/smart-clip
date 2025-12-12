import { Request, Response } from 'express';
import * as fakeConversationsService from '../services/fake-conversations.service';

interface AuthRequest extends Request {
  userId?: string;
}

class FakeConversationsController {

  generateConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { 
        prompt, 
        conversationType = 'casual', 
        characterCount = 2, 
        messageCount = 15,
        tone = 'casual',
        context 
      } = req.body;

      if (!prompt || prompt.trim().length === 0) {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      if (prompt.length > 1000) {
        res.status(400).json({ error: 'Prompt must be less than 1000 characters' });
        return;
      }

      const validTypes = ['drama', 'comedy', 'story', 'debate', 'casual', 'professional'];
      if (!validTypes.includes(conversationType)) {
        res.status(400).json({ error: 'Invalid conversation type' });
        return;
      }

      const validTones = ['funny', 'dramatic', 'casual', 'professional', 'emotional', 'mysterious'];
      if (!validTones.includes(tone)) {
        res.status(400).json({ error: 'Invalid tone' });
        return;
      }

      if (characterCount < 2 || characterCount > 5) {
        res.status(400).json({ error: 'Character count must be between 2 and 5' });
        return;
      }

      if (messageCount < 5 || messageCount > 50) {
        res.status(400).json({ error: 'Message count must be between 5 and 50' });
        return;
      }

      const result = await fakeConversationsService.generateConversation(userId, {
        prompt: prompt.trim(),
        conversationType,
        characterCount: Number(characterCount),
        messageCount: Number(messageCount),
        tone,
        context: context?.trim()
      });

      res.status(201).json({
        success: true,
        message: 'Conversation generated successfully',
        data: {
          project: result.project,
          generation: result.generation
        }
      });

    } catch (error) {
      console.error('Generate conversation error:', error);
      res.status(500).json({ 
        error: 'Failed to generate conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  regenerateConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { projectId } = req.params;
      const { prompt } = req.body;

      if (!prompt || prompt.trim().length === 0) {
        res.status(400).json({ error: 'New prompt is required' });
        return;
      }

      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const project = await fakeConversationsService.getConversationProject(projectId, userId);
      if (!project) {
        res.status(404).json({ error: 'Conversation project not found' });
        return;
      }

      const generation = await fakeConversationsService.regenerateConversation(
        projectId,
        prompt.trim()
      );

      res.status(200).json({
        success: true,
        message: 'Conversation regenerated successfully',
        data: { generation }
      });

    } catch (error) {
      console.error('Regenerate conversation error:', error);
      res.status(500).json({ 
        error: 'Failed to regenerate conversation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getUserConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const conversations = await fakeConversationsService.getUserConversations(userId);

      res.status(200).json({
        success: true,
        data: {
          conversations,
          count: conversations.length
        }
      });

    } catch (error) {
      console.error('Get conversations error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch conversations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getConversationProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const project = await fakeConversationsService.getConversationProject(projectId, userId);

      if (!project) {
        res.status(404).json({ error: 'Conversation project not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: { project }
      });

    } catch (error) {
      console.error('Get conversation project error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch conversation project',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  deleteConversationProject = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { projectId } = req.params;

      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const deleted = await fakeConversationsService.deleteConversationProject(projectId, userId);

      if (!deleted) {
        res.status(404).json({ error: 'Conversation project not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Conversation project deleted successfully'
      });

    } catch (error) {
      console.error('Delete conversation error:', error);
      res.status(500).json({ 
        error: 'Failed to delete conversation project',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  updateConversationSettings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { projectId } = req.params;
      const settings = req.body;

      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const validFields = [
        'title', 'description', 'chatStyle', 'backgroundType', 'backgroundUrl',
        'videoSettings', 'audioSettings', 'status'
      ];
      
      const filteredSettings = Object.keys(settings)
        .filter(key => validFields.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = settings[key];
          return obj;
        }, {});

      if (Object.keys(filteredSettings).length === 0) {
        res.status(400).json({ error: 'No valid settings provided' });
        return;
      }

      const updatedProject = await fakeConversationsService.updateConversationSettings(
        projectId,
        userId,
        filteredSettings
      );

      res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: { project: updatedProject }
      });

    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ 
        error: 'Failed to update conversation settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  generateVideo = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { projectId } = req.params;
      const { videoSettings = {} } = req.body;

      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const project = await fakeConversationsService.getConversationProject(projectId, userId);
      if (!project) {
        res.status(404).json({ error: 'Conversation project not found' });
        return;
      }

      if (project.status !== 'draft') {
        res.status(400).json({ error: 'Project must be in draft status to generate video' });
        return;
      }

      const result = await fakeConversationsService.generateVideoFromConversation(
        projectId,
        videoSettings
      );

      res.status(200).json({
        success: true,
        message: 'Video generation started successfully',
        data: {
          outputPath: result.outputPath,
          duration: result.duration,
          cost: result.cost
        }
      });

    } catch (error) {
      console.error('Generate video error:', error);
      res.status(500).json({ 
        error: 'Failed to generate video',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const templates = fakeConversationsService.getConversationTemplates();
      
      res.status(200).json({
        success: true,
        data: { templates }
      });

    } catch (error) {
      console.error('Get templates error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch templates',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getChatStyles = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const styles = fakeConversationsService.getChatStyles();
      
      res.status(200).json({
        success: true,
        data: { styles }
      });

    } catch (error) {
      console.error('Get chat styles error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch chat styles',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  getVoices = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const voices = fakeConversationsService.getVoices();
      
      res.status(200).json({
        success: true,
        data: { voices }
      });

    } catch (error) {
      console.error('Get voices error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch voices',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  submitFeedback = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { projectId } = req.params;
      const { rating, feedback, improvementSuggestions } = req.body;

      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      if (rating && (rating < 1 || rating > 5)) {
        res.status(400).json({ error: 'Rating must be between 1 and 5' });
        return;
      }

      const project = await fakeConversationsService.getConversationProject(projectId, userId);
      if (!project) {
        res.status(404).json({ error: 'Conversation project not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Feedback submitted successfully'
      });

    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({ 
        error: 'Failed to submit feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}

export default FakeConversationsController;

