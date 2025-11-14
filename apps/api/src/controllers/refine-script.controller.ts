import { Request, Response } from 'express';
import { generateScript as generateAIScript } from '../services/script-generator.service';

interface AuthRequest extends Request {
  userId?: string;
}

export const refineScript = async (req: AuthRequest, res: Response) => {
  try {
    const { originalScript, refinementInstructions, tone, format } = req.body;
    
    if (!originalScript || !refinementInstructions || !req.userId) {
      return res.status(400).json({ error: 'Original script and refinement instructions are required' });
    }

    const prompt = `Refine this script based on the following instructions:

Original Script:
${originalScript}

Refinement Instructions:
${refinementInstructions}

Please improve the script while maintaining its core message and structure.`;

    const refinedScript = await generateAIScript(prompt, { tone, format });
    
    res.json({ 
      originalScript,
      refinedScript,
      refinementInstructions
    });
  } catch (error) {
    console.error('Error refining script:', error);
    res.status(500).json({ error: 'Failed to refine script' });
  }
};