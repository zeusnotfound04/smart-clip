import AWS from 'aws-sdk';
import { PrismaClient } from '@prisma/client';
import gtts from 'google-tts-api';

const prisma = new PrismaClient();

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
});

interface TTSOptions {
  text: string;
  voice?: {
    languageCode?: string;
    name?: string;
    ssmlGender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
  };
  audioConfig?: {
    audioEncoding?: 'MP3' | 'LINEAR16' | 'OGG_OPUS';
    speakingRate?: number;
    pitch?: number;
  };
}

interface AudioResult {
  success: boolean;
  audioUrl?: string;
  duration?: number;
  error?: string;
  type: 'tts' | 'fallback' | 'mock';
}



/**
 * Remove stage directions and instructions in parentheses from text
 */
function removeStageDirections(text: string): string {
  // Remove text within parentheses (like "(Upbeat music)" or "(Quick whoosh sound effect)")
  let cleanedText = text.replace(/\([^)]*\)/g, '');
  
  // Remove extra whitespace and blank lines
  cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n'); // Remove triple+ newlines
  cleanedText = cleanedText.trim();
  
  return cleanedText;
}

/**
 * Generate TTS audio using Google Translate TTS (Free & Unlimited)
 */
export async function generateTTSAudio(options: TTSOptions): Promise<AudioResult> {
  const startTime = Date.now();
  
  // Remove stage directions before generating audio
  const cleanedText = removeStageDirections(options.text);
  console.log(`🎵 [TTS] Original text length: ${options.text.length} characters`);
  console.log(`🎵 [TTS] Cleaned text length: ${cleanedText.length} characters`);
  console.log(`🎵 [TTS] Starting Google Translate TTS for cleaned text`);

  try {
    // Generate audio using Google Translate TTS with cleaned text
    const audioBuffer = await generateGoogleTranslateTTS(cleanedText, options);
    
    // Upload to S3
    const audioUrl = await uploadAudioToS3(audioBuffer, 'tts');
    
    // Calculate duration (estimate: ~150 words per minute, ~5 characters per word)
    const wordCount = Math.ceil(options.text.length / 5);
    const estimatedDuration = Math.ceil((wordCount / 150) * 60);

    const processingTime = Date.now() - startTime;
    console.log(`✅ [TTS] Audio generated successfully with Google Translate TTS in ${processingTime}ms`);
    console.log(`✅ [TTS] Audio uploaded to S3: ${audioUrl}`);

    return {
      success: true,
      audioUrl,
      duration: estimatedDuration,
      type: 'tts'
    };

  } catch (error) {
    console.error(`❌ [TTS] Google Translate TTS failed:`, error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate TTS audio using Google Translate TTS (Free & Unlimited)
 */
async function generateGoogleTranslateTTS(text: string, options: TTSOptions): Promise<Buffer> {
  try {
    console.log(`🎵 [GTTS] Generating audio for text: "${text.substring(0, 50)}..."`);
    
    // Configure language and speed
    const lang = options.voice?.languageCode?.split('-')[0] || 'en';
    const slow = (options.audioConfig?.speakingRate || 1.0) < 0.8;
    
    // Get TTS URLs from Google Translate
    const urls = await gtts.getAllAudioUrls(text, {
      lang: lang,
      slow: slow,
      host: 'https://translate.google.com',
    });
    
    if (!urls || urls.length === 0) {
      throw new Error('No audio URLs received from Google Translate TTS');
    }
    
    console.log(`🎵 [GTTS] Received ${urls.length} audio segments`);
    
    // Download and combine all audio segments
    const audioBuffers: Buffer[] = [];
    
    for (const urlObj of urls) {
      console.log(`🔽 [GTTS] Downloading segment: ${urlObj.url.substring(0, 100)}...`);
      const response = await fetch(urlObj.url);
      
      if (!response.ok) {
        throw new Error(`Failed to download audio segment: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      audioBuffers.push(buffer);
    }
    
    // Combine all audio buffers
    const totalLength = audioBuffers.reduce((sum, buffer) => sum + buffer.length, 0);
    const combinedBuffer = Buffer.concat(audioBuffers, totalLength);
    
    console.log(`✅ [GTTS] Combined ${audioBuffers.length} segments into ${combinedBuffer.length} bytes`);
    return combinedBuffer;
    
  } catch (error) {
    console.error(`❌ [GTTS] Google Translate TTS failed:`, error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`Google Translate TTS failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}



/**
 * Upload audio buffer to S3
 */
async function uploadAudioToS3(audioBuffer: Buffer, type: 'tts' | 'fallback'): Promise<string> {
  const fileName = `${type}-audio-${Date.now()}.mp3`;
  const bucketName = process.env.AWS_S3_BUCKET || 'smart-clip-storage';
  const bucketRegion = process.env.AWS_REGION || 'ap-south-1';

  try {
    const uploadParams = {
      Bucket: bucketName,
      Key: `narrations/${fileName}`,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
    };

    const result = await s3.upload(uploadParams).promise();
    
    // Construct the proper S3 URL with the correct region
    const s3Url = `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/narrations/${fileName}`;
    return s3Url;
  } catch (error) {
    console.error(`❌ [S3] Upload failed:`, error instanceof Error ? error.message : 'Unknown error');
    // Throw error instead of returning mock URL
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Store audio information in database
 */
export async function storeAudioInfo(scriptProjectId: string, audioUrl: string, duration: number, type: 'tts' | 'fallback' | 'mock', userId?: string): Promise<void> {
  try {
    console.log(`🎵 [SERVICE] Storing audio info for script project ${scriptProjectId}`);

    // Find or create a VideoGenerationProject for this script
    let videoProject = await prisma.videoGenerationProject.findFirst({
      where: { scriptProjectId }
    });

    if (!videoProject) {
      // Create a new VideoGenerationProject with minimal required data
      videoProject = await prisma.videoGenerationProject.create({
        data: {
          userId: userId || 'temp-user',
          title: 'Auto-generated from TTS',
          originalPrompt: 'Generated via TTS service',
          scriptProjectId,
          audioUrl,
          audioDuration: duration,
          voiceStatus: 'completed',
          currentPhase: 2, // Phase 2: Voice completed
          overallStatus: 'voice_generation',
        }
      });
      console.log(`✅ [SERVICE] Created new VideoGenerationProject: ${videoProject.id}`);
    } else {
      await prisma.videoGenerationProject.update({
        where: { id: videoProject.id },
        data: {
          audioUrl,
          audioDuration: duration,
          voiceStatus: 'completed',
          currentPhase: 2,
          overallStatus: 'voice_generation',
          updatedAt: new Date(),
        }
      });
      console.log(`✅ [SERVICE] Updated VideoGenerationProject: ${videoProject.id}`);
    }

    console.log(`✅ [SERVICE] Audio info stored successfully (${type} audio)`);
  } catch (error) {
    console.error(`❌ [SERVICE] Failed to store audio info:`, error);
    throw error;
  }
}

/**
 * Get audio information from database
 */
export async function getAudioInfo(scriptProjectId: string) {
  try {
    const videoProject = await prisma.videoGenerationProject.findFirst({
      where: { scriptProjectId }
    });

    return videoProject;
  } catch (error) {
    console.error(`❌ [SERVICE] Failed to get audio info:`, error);
    return null;
  }
}