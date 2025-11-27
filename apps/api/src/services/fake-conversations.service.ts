import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConversationProject, ConversationGeneration, ConversationApiUsage } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface ConversationGenerationRequest {
  prompt: string;
  conversationType: 'drama' | 'comedy' | 'story' | 'debate' | 'casual' | 'professional';
  characterCount: number;
  messageCount: number;
  tone: 'funny' | 'dramatic' | 'casual' | 'professional' | 'emotional' | 'mysterious';
  context?: string;
}

interface GeneratedConversation {
  title: string;
  description: string;
  characters: Array<{
    name: string;
    displayName: string;
    personality: string;
    isUser: boolean;
  }>;
  messages: Array<{
    characterName: string;
    content: string;
    delay: number;
    messageType: 'text' | 'typing' | 'read';
  }>;
}

interface VideoGenerationSettings {
  width: number;
  height: number;
  fps: number;
  duration: number;
  chatStyle: 'iphone' | 'whatsapp' | 'discord' | 'telegram' | 'android';
  backgroundType: 'solid' | 'gradient' | 'video' | 'image';
  backgroundUrl?: string;
  enableVoiceover: boolean;
  typingSpeed: number;
}

const initializeGoogleAI = () => {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Google AI API key is not configured');
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ 
    model: 'gemini-1.5-pro',
    generationConfig: {
      temperature: 0.8,
      topP: 0.9,
      maxOutputTokens: 4096,
    }
  });
};

const buildConversationPrompt = (request: ConversationGenerationRequest): string => {
  const basePrompt = `
Generate a ${request.conversationType} conversation with ${request.characterCount} characters.
The conversation should have approximately ${request.messageCount} messages total.

Context: ${request.prompt}
${request.context ? `Additional Context: ${request.context}` : ''}

Tone: ${request.tone}
Conversation Type: ${request.conversationType}

Requirements:
1. Create realistic, engaging dialogue that flows naturally
2. Include appropriate timing delays between messages for realism
3. Vary message lengths for authenticity
4. Include occasional typing indicators and read receipts
5. Make characters distinct with unique speaking patterns
6. Build dramatic tension or comedic timing as appropriate

Output the result as a JSON object with this exact structure:
{
  "title": "Conversation title",
  "description": "Brief description of the conversation",
  "characters": [
    {
      "name": "character_identifier",
      "displayName": "Display Name",
      "personality": "Brief personality description",
      "isUser": false
    }
  ],
  "messages": [
    {
      "characterName": "character_identifier",
      "content": "Message text",
      "delay": 1500,
      "messageType": "text"
    }
  ]
}

Make sure the JSON is properly formatted and complete.`;

  return basePrompt;
};

const parseGeneratedConversation = (generatedText: string): GeneratedConversation => {
  try {
    const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    if (!parsed.title || !parsed.characters || !parsed.messages) {
      throw new Error('Invalid conversation structure');
    }

    return parsed as GeneratedConversation;
  } catch (error) {
    console.error('Failed to parse conversation:', error);
    throw new Error('Failed to parse generated conversation');
  }
};

const estimateGenerationCost = (prompt: string): number => {
  const inputTokens = Math.ceil(prompt.length / 4);
  const estimatedOutputTokens = 2000;
  
  const inputCost = (inputTokens / 1000) * 0.00125;
  const outputCost = (estimatedOutputTokens / 1000) * 0.005;
  
  return Number((inputCost + outputCost).toFixed(6));
};

const calculateActualCost = (promptLength: number, responseLength: number): number => {
  const inputTokens = Math.ceil(promptLength / 4);
  const outputTokens = Math.ceil(responseLength / 4);
  
  const inputCost = (inputTokens / 1000) * 0.00125;
  const outputCost = (outputTokens / 1000) * 0.005;
  
  return Number((inputCost + outputCost).toFixed(6));
};

const calculateEstimatedDuration = (messages: Array<{ content: string; delay: number }>): number => {
  let totalDuration = 0;
  
  messages.forEach(msg => {
    const readingTime = (msg.content.length / 5) / (200 / 60) * 1000;
    totalDuration += msg.delay + readingTime;
  });
  
  return Math.round(totalDuration / 1000);
};

const calculateVideoDuration = (messages: any[]): number => {
  return messages.reduce((total, msg) => {
    const readingTime = Math.max(2, msg.content.length * 0.05);
    return total + (msg.delay / 1000) + readingTime;
  }, 0);
};

const calculateVideoGenerationCost = (duration: number, settings: VideoGenerationSettings): number => {
  const baseCost = 0.01;
  const qualityMultiplier = settings.height > 1080 ? 1.5 : 1.0;
  const voiceoverCost = settings.enableVoiceover ? duration * 0.005 : 0;
  
  return Number((duration * baseCost * qualityMultiplier + voiceoverCost).toFixed(4));
};

const getDefaultVideoSettings = (): VideoGenerationSettings => {
  return {
    width: 1080,
    height: 1920,
    fps: 30,
    duration: 60,
    chatStyle: 'iphone',
    backgroundType: 'gradient',
    enableVoiceover: false,
    typingSpeed: 50
  };
};

const getDefaultAudioSettings = () => {
  return {
    enableSoundEffects: true,
    messageSound: 'default',
    typingSound: 'subtle',
    volume: 0.7,
    fadeInOut: true
  };
};

const getDefaultMessageColor = (index: number, isUser: boolean): string => {
  if (isUser) return '#007AFF';
  
  const colors = ['#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#FF2D92'];
  return colors[index % colors.length];
};

const logApiUsage = async (usage: Omit<ConversationApiUsage, 'id' | 'createdAt'>): Promise<void> => {
  try {
    await prisma.conversationApiUsage.create({
      data: usage
    });
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
};

export const generateConversation = async (
  userId: string, 
  request: ConversationGenerationRequest
): Promise<{ project: ConversationProject; generation: ConversationGeneration }> => {
  const startTime = Date.now();
  
  try {
    const model = initializeGoogleAI();
    const enhancedPrompt = buildConversationPrompt(request);
    const estimatedCost = estimateGenerationCost(enhancedPrompt);
    
    const result = await model.generateContent(enhancedPrompt);
    const response = await result.response;
    const generatedText = response.text();
    
    const conversationData = parseGeneratedConversation(generatedText);
    
    const responseTime = Date.now() - startTime;
    const actualCost = calculateActualCost(
      enhancedPrompt.length,
      generatedText.length
    );

    const project = await prisma.conversationProject.create({
      data: {
        userId,
        title: conversationData.title,
        description: conversationData.description || 'Generated conversation',
        conversationType: request.conversationType,
        chatStyle: 'iphone',
        status: 'draft',
        estimatedCost: estimatedCost,
        actualCost: actualCost,
        videoSettings: getDefaultVideoSettings() as any,
        audioSettings: getDefaultAudioSettings() as any
      }
    });

    const generation = await prisma.conversationGeneration.create({
      data: {
        projectId: project.id,
        version: 1,
        prompt: request.prompt,
        generatedContent: conversationData as any,
        messageCount: conversationData.messages.length,
        estimatedDuration: calculateEstimatedDuration(conversationData.messages)
      }
    });

    const characterMap = new Map<string, string>();
    for (const [index, charData] of conversationData.characters.entries()) {
      const character = await prisma.conversationCharacter.create({
        data: {
          projectId: project.id,
          name: charData.name,
          displayName: charData.displayName,
          isUser: charData.isUser,
          sortOrder: index,
          messageColor: getDefaultMessageColor(index, charData.isUser)
        }
      });
      characterMap.set(charData.name, character.id);
    }

    for (const [index, msgData] of conversationData.messages.entries()) {
      const characterId = characterMap.get(msgData.characterName);
      if (characterId) {
        await prisma.conversationMessage.create({
          data: {
            projectId: project.id,
            characterId,
            content: msgData.content,
            messageType: msgData.messageType || 'text',
            delay: msgData.delay || 1500,
            sortOrder: index
          }
        });
      }
    }

    await logApiUsage({
      projectId: project.id,
      modelName: 'gemini-1.5-pro',
      operationType: 'conversation_generation',
      promptLength: enhancedPrompt.length,
      responseLength: generatedText.length,
      inputTokens: Math.ceil(enhancedPrompt.length / 4),
      outputTokens: Math.ceil(generatedText.length / 4),
      costUsd: actualCost as any,
      responseTimeMs: responseTime,
      success: true,
      errorMessage: null
    });

    return { project, generation };

  } catch (error) {
    console.error('Conversation generation failed:', error);
    throw new Error(`Failed to generate conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const regenerateConversation = async (
  projectId: string,
  newPrompt: string
): Promise<ConversationGeneration> => {
  const project = await prisma.conversationProject.findUnique({
    where: { id: projectId },
    include: { generations: true }
  });

  if (!project) {
    throw new Error('Conversation project not found');
  }

  const nextVersion = Math.max(...project.generations.map(g => g.version)) + 1;
  
  await prisma.conversationGeneration.updateMany({
    where: { projectId },
    data: { isActive: false }
  });

  const request: ConversationGenerationRequest = {
    prompt: newPrompt,
    conversationType: project.conversationType as any,
    characterCount: 2,
    messageCount: 15,
    tone: 'casual'
  };

  const result = await generateConversation(project.userId, request);
  
  return await prisma.conversationGeneration.update({
    where: { id: result.generation.id },
    data: { version: nextVersion }
  });
};

export const generateVideoFromConversation = async (
  projectId: string,
  settings: Partial<VideoGenerationSettings> = {}
): Promise<{ outputPath: string; duration: number; cost: number }> => {
  const project = await prisma.conversationProject.findUnique({
    where: { id: projectId },
    include: {
      characters: true,
      messages: {
        include: { character: true },
        orderBy: { sortOrder: 'asc' }
      }
    }
  });

  if (!project) {
    throw new Error('Conversation project not found');
  }

  const videoSettings = { ...getDefaultVideoSettings(), ...settings };
  
  const duration = calculateVideoDuration(project.messages);
  const outputPath = `conversations/${project.id}/video_${Date.now()}.mp4`;
  const cost = calculateVideoGenerationCost(duration, videoSettings);

  await prisma.conversationProject.update({
    where: { id: projectId },
    data: {
      videoOutputPath: outputPath,
      videoDuration: duration,
      status: 'completed',
      actualCost: { increment: cost }
    }
  });

  return { outputPath, duration, cost };
};

export const getUserConversations = async (userId: string): Promise<ConversationProject[]> => {
  return await prisma.conversationProject.findMany({
    where: { userId },
    include: {
      characters: true,
      _count: {
        select: { messages: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getConversationProject = async (projectId: string, userId: string): Promise<ConversationProject | null> => {
  return await prisma.conversationProject.findFirst({
    where: { id: projectId, userId },
    include: {
      characters: true,
      messages: {
        include: { character: true },
        orderBy: { sortOrder: 'asc' }
      },
      generations: {
        where: { isActive: true },
        orderBy: { version: 'desc' }
      }
    }
  });
};

export const deleteConversationProject = async (projectId: string, userId: string): Promise<boolean> => {
  const result = await prisma.conversationProject.deleteMany({
    where: { id: projectId, userId }
  });
  
  return result.count > 0;
};

export const updateConversationSettings = async (
  projectId: string, 
  userId: string, 
  settings: any
): Promise<ConversationProject> => {
  const { id, userId: _, createdAt, updatedAt, ...updateData } = settings;
  return await prisma.conversationProject.update({
    where: { id: projectId, userId },
    data: {
      ...updateData,
      updatedAt: new Date()
    }
  });
};

export const getConversationTemplates = () => {
  return {
    drama: {
      name: 'Drama/Conflict',
      description: 'Dramatic conversations with tension and conflict',
      defaultPrompt: 'Create a dramatic text conversation between two friends having a falling out',
      characterCount: 2,
      messageCount: 20,
      tone: 'dramatic'
    },
    comedy: {
      name: 'Comedy/Funny',
      description: 'Humorous conversations with jokes and funny situations',
      defaultPrompt: 'Create a funny text conversation between roommates about a ridiculous situation',
      characterCount: 2,
      messageCount: 15,
      tone: 'funny'
    },
    story: {
      name: 'Story/Narrative',
      description: 'Story-telling conversations with plot development',
      defaultPrompt: 'Create a story told through text messages between characters',
      characterCount: 3,
      messageCount: 25,
      tone: 'casual'
    },
    debate: {
      name: 'Debate/Argument',
      description: 'Heated debates and arguments between characters',
      defaultPrompt: 'Create a debate conversation between people with opposing views',
      characterCount: 2,
      messageCount: 18,
      tone: 'professional'
    }
  };
};

export const getChatStyles = () => {
  return [
    { id: 'iphone', name: 'iPhone Messages', description: 'iOS style messages' },
    { id: 'whatsapp', name: 'WhatsApp', description: 'WhatsApp style chat' },
    { id: 'discord', name: 'Discord', description: 'Discord chat style' },
    { id: 'telegram', name: 'Telegram', description: 'Telegram messaging style' },
    { id: 'android', name: 'Android Messages', description: 'Android SMS style' }
  ];
};

export const getVoices = () => {
  return [
    { id: 'en-US-Standard-A', name: 'Male Voice 1' },
    { id: 'en-US-Standard-C', name: 'Female Voice 1' },
    { id: 'en-US-Standard-D', name: 'Male Voice 2' },
    { id: 'en-US-Standard-E', name: 'Female Voice 2' }
  ];
};

export const createConversationVideo = async (projectId: string) => {
  const project = await getConversationProject(projectId, '');
  
  if (!project) {
    throw new Error('Conversation project not found');
  }

  return await generateVideoFromConversation(projectId);
};