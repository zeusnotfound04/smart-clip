import { SpeechClient } from '@google-cloud/speech';
import { VideoIntelligenceServiceClient, protos } from '@google-cloud/video-intelligence';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const config = {
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
};

const speechClient = new SpeechClient(config);
const videoIntelligenceClient = new VideoIntelligenceServiceClient(config);
const ttsClient = new TextToSpeechClient(config);

export const speechToText = async (audioBuffer: Buffer, customConfig?: any) => {
  const request = {
    audio: { content: audioBuffer.toString('base64') },
    config: {
      encoding: 'LINEAR16' as const,
      sampleRateHertz: 16000,
      languageCode: 'en-US',
      enableWordTimeOffsets: true,
      enableAutomaticPunctuation: true,
      ...customConfig
    }
  };

  const [response] = await speechClient.recognize(request);
  return response.results || [];
};

export const analyzeVideo = async (videoBuffer: Buffer) => {
  const request = {
    inputContent: videoBuffer.toString('base64'),
    features: [
      protos.google.cloud.videointelligence.v1.Feature.LABEL_DETECTION,
      protos.google.cloud.videointelligence.v1.Feature.SPEECH_TRANSCRIPTION
    ]
  };

  const [operation] = await videoIntelligenceClient.annotateVideo(request);
  const [result] = await operation.promise();
  return result;
};

export const textToSpeech = async (text: string, voiceConfig?: any) => {
  const request = {
    input: { text },
    voice: {
      languageCode: 'en-US',
      ssmlGender: 'NEUTRAL' as const,
      ...voiceConfig
    },
    audioConfig: {
      audioEncoding: 'MP3' as const
    }
  };

  const [response] = await ttsClient.synthesizeSpeech(request);
  return response.audioContent;
};

export const generateScript = async (prompt: string) => {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) throw new Error('Google Cloud API key not configured');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Generate an engaging video script for: ${prompt}. Include a hook, main content, and conclusion. Keep it under 300 words for short-form content.`
        }]
      }]
    })
  });

  const data = await response.json() as any;
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
};