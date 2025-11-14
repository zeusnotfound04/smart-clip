import { FFmpeg } from '@ffmpeg/ffmpeg';
import { textToSpeech } from './ai.service';

export interface ConversationMessage {
  sender: string;
  message: string;
  timestamp?: number;
}

export interface ConversationConfig {
  theme: string;
  voices: { [sender: string]: string };
  backgroundVideo?: string;
}

let ffmpeg: FFmpeg | null = null;

const getFFmpeg = async () => {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
  }
  return ffmpeg;
};

export const createConversationVideo = async (
  messages: ConversationMessage[], 
  config: ConversationConfig
): Promise<Buffer> => {
  await getFFmpeg();

  const audioBuffers: Buffer[] = [];
  
  for (const msg of messages) {
    const voiceConfig = { name: config.voices[msg.sender] || 'en-US-Standard-A' };
    const audioContent = await textToSpeech(msg.message, voiceConfig);
    if (audioContent) {
      audioBuffers.push(Buffer.from(audioContent as Uint8Array));
    }
  }
  
  return Buffer.alloc(0);
};

export const getThemes = () => {
  return [
    { id: 'iphone', name: 'iPhone Messages', description: 'iOS style messages' },
    { id: 'whatsapp', name: 'WhatsApp', description: 'WhatsApp style chat' },
    { id: 'discord', name: 'Discord', description: 'Discord chat style' },
    { id: 'instagram', name: 'Instagram DM', description: 'Instagram direct messages' }
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