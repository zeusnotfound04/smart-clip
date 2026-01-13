import { PrismaClient } from '@prisma/client';
import { fishAudioService } from './fish-audio.service';

const prisma = new PrismaClient();

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
  type: 'fish-audio';
}

/**
 * Generate TTS audio using Fish Audio
 */
export async function generateTTSAudio(options: TTSOptions): Promise<AudioResult> {
  const startTime = Date.now();
  
  console.log(`[TTS] Text length: ${options.text.length} characters`);
  console.log(`[TTS] Using Fish Audio for TTS generation`);
  console.log(`[TTS] Voice: ${options.voice?.name || 'default'}`);

  try {
    const result = await fishAudioService.generateTTS({
      text: options.text,
      referenceId: options.voice?.name, // Pass the voice ID as referenceId
      format: 'mp3',
      mp3Bitrate: 192,
      latency: 'normal',
      model: 's1',
      speed: options.audioConfig?.speakingRate || 1.0,
      volume: options.audioConfig?.pitch || 0, // pitch mapped to volume in dB
    });

    if (!result.success || !result.audioUrl) {
      throw new Error(result.error || 'Fish Audio generation failed');
    }

    const processingTime = Date.now() - startTime;
    console.log(`[TTS] Audio generated successfully with Fish Audio in ${processingTime}ms`);
    console.log(`[TTS] Audio URL: ${result.audioUrl}`);

    return {
      success: true,
      audioUrl: result.audioUrl,
      duration: result.duration,
      type: 'fish-audio'
    };

  } catch (error) {
    console.error(`[TTS] Fish Audio TTS failed:`, error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload audio buffer to S3 (kept for compatibility but not used with Fish Audio)
 */
async function uploadAudioToS3(audioBuffer: Buffer, type: string): Promise<string> {
  return '';
}

/**
 * Store audio information in database
 */
export async function storeAudioInfo(scriptProjectId: string, audioUrl: string, duration: number, type: 'fish-audio', userId?: string): Promise<void> {
  try {
    console.log(`[SERVICE] Storing audio info for script project ${scriptProjectId}`);

    let videoProject = await prisma.videoGenerationProject.findFirst({
      where: { scriptProjectId }
    });

    if (!videoProject) {
      videoProject = await prisma.videoGenerationProject.create({
        data: {
          userId: userId || 'temp-user',
          title: 'Auto-generated from TTS',
          originalPrompt: 'Generated via Fish Audio TTS',
          scriptProjectId,
          audioUrl,
          audioDuration: duration,
          voiceStatus: 'completed',
          currentPhase: 2, // Phase 2: Voice completed
          overallStatus: 'voice_generation',
        }
      });
      console.log(`[SERVICE] Created new VideoGenerationProject: ${videoProject.id}`);
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
      console.log(`[SERVICE] Updated VideoGenerationProject: ${videoProject.id}`);
    }

    console.log(`[SERVICE] Audio info stored successfully (Fish Audio)`);
  } catch (error) {
    console.error(`[SERVICE] Failed to store audio info:`, error);
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
    console.error(`[SERVICE] Failed to get audio info:`, error);
    return null;
  }
}