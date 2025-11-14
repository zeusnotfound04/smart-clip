import { generateScript as generateAIScript } from './ai.service';

export const generateScript = async (prompt: string, options: {
  tone?: string;
  length?: string;
  format?: string;
} = {}): Promise<string> => {
  const { tone = 'engaging', length = 'short', format = 'tiktok' } = options;
  
  const enhancedPrompt = `Create a ${tone} ${length}-form ${format} video script about: ${prompt}. 
  Include:
  1. Hook (first 3 seconds)
  2. Main content
  3. Call to action
  Keep it under 200 words for ${length} content.`;
  
  return await generateAIScript(enhancedPrompt);
};

export const getTemplates = () => {
  return [
    { id: 'tiktok', name: 'TikTok', description: 'Short, engaging vertical video' },
    { id: 'youtube-shorts', name: 'YouTube Shorts', description: 'Quick educational content' },
    { id: 'instagram-reels', name: 'Instagram Reels', description: 'Trendy social content' },
    { id: 'educational', name: 'Educational', description: 'Informative tutorial style' }
  ];
};