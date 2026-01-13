import axios from 'axios';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

interface FishAudioOptions {
  text: string;
  referenceId?: string;  // Voice model ID from Fish Audio library
  format?: 'mp3' | 'wav' | 'pcm' | 'opus';
  mp3Bitrate?: number;   // 64, 128, 192
  opusBitrate?: number;  // -1000, 24, 32, 48, 64
  latency?: 'normal' | 'balanced' | 'low';
  model?: 's1' | 'speech-1.6' | 'speech-1.5';
  temperature?: number;  // 0 to 1, default 0.7
  topP?: number;        // 0 to 1, default 0.7
  speed?: number;       // 0.5 to 2.0, default 1.0
  volume?: number;      // in dB, default 0
  normalize?: boolean;  // default true
  chunkLength?: number; // 100-300, default 300
}

interface FishAudioResult {
  success: boolean;
  audioUrl?: string;
  audioPath?: string;
  duration?: number;
  error?: string;
}

export class FishAudioService {
  private apiKey: string;
  private baseUrl: string = 'https://api.fish.audio/v1/tts';
  private s3Client: S3Client;

  constructor() {
    this.apiKey = process.env.FISH_AUDIO_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('[FISH-AUDIO] API key not found. Set FISH_AUDIO_API_KEY in environment.');
      throw new Error('Fish Audio API key is required');
    }

    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    console.log('[FISH-AUDIO] Service initialized successfully');
  }

  /**
   * Remove stage directions and instructions in parentheses from text
   */
  private removeStageDirections(text: string): string {
    let cleanedText = text.replace(/\([^)]*\)/g, '');
    cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n');
    return cleanedText.trim();
  }

  /**
   * Generate TTS audio using Fish Audio API
   */
  async generateTTS(options: FishAudioOptions): Promise<FishAudioResult> {
    const startTime = Date.now();
    
    try {
      const cleanedText = this.removeStageDirections(options.text);
      console.log(`[FISH-AUDIO] Original text length: ${options.text.length} characters`);
      console.log(`[FISH-AUDIO] Cleaned text length: ${cleanedText.length} characters`);
      console.log(`[FISH-AUDIO] Generating TTS for: "${cleanedText.substring(0, 50)}..."`);

      const payload: any = {
        text: cleanedText,
        reference_id: options.referenceId || process.env.FISH_AUDIO_REFERENCE_ID || null,
        format: options.format || 'mp3',
        latency: options.latency || 'normal',
        normalize: options.normalize !== undefined ? options.normalize : true,
        chunk_length: options.chunkLength || 300,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.7,
      };

      if (options.speed !== undefined || options.volume !== undefined) {
        payload.prosody = {
          speed: options.speed || 1.0,
          volume: options.volume || 0,
        };
      }

      if (options.format === 'mp3' || !options.format) {
        payload.mp3_bitrate = options.mp3Bitrate || 128;
      }
      if (options.format === 'opus') {
        payload.opus_bitrate = options.opusBitrate || -1000; // -1000 = auto
      }

      console.log(`[FISH-AUDIO] Request payload:`, JSON.stringify(payload, null, 2));
      console.log(`[FISH-AUDIO] API KEY: ${this.apiKey}`);

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'model': options.model || 's1',
        },
        responseType: 'arraybuffer',
        timeout: 60000,
      });

      const audioBuffer = Buffer.from(response.data);
      const fileExtension = options.format || 'mp3';
      const audioFilename = `fish_audio_${uuidv4()}.${fileExtension}`;
      const tempDir = path.join(process.cwd(), 'temp');
      
      if (!fsSync.existsSync(tempDir)) {
        await fs.mkdir(tempDir, { recursive: true });
      }

      const audioPath = path.join(tempDir, audioFilename);
      await fs.writeFile(audioPath, audioBuffer);

      console.log(`[FISH-AUDIO] Audio file saved: ${audioPath} (${audioBuffer.length} bytes)`);

      const s3Key = `narrations/${audioFilename}`;
      const audioUrl = await this.uploadToS3(audioPath, s3Key, `audio/${fileExtension}`);

      const duration = await this.getAudioDuration(audioPath);

      await fs.unlink(audioPath).catch(err => 
        console.warn(`[FISH-AUDIO] Failed to cleanup temp file:`, err)
      );

      const processingTime = Date.now() - startTime;
      console.log(`[FISH-AUDIO] Audio generated successfully in ${processingTime}ms`);
      console.log(`[FISH-AUDIO] Duration: ${duration}s, URL: ${audioUrl}`);

      return {
        success: true,
        audioUrl,
        audioPath,
        duration,
      };

    } catch (error: unknown) {
      console.error(`[FISH-AUDIO] Generation failed:`, error);
      
      if (axios.isAxiosError(error)) {
        const errorMessage = error.response?.data?.toString() || error.message;
        console.error(`[FISH-AUDIO] API Error:`, errorMessage);
        console.error(`[FISH-AUDIO] Status:`, error.response?.status);
        
        return {
          success: false,
          error: `Fish Audio API error: ${errorMessage}`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * List available reference voices
   */
  async listReferenceVoices(): Promise<any[]> {
    try {
      const response = await axios.get('https://api.fish.audio/model', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.data || [];
    } catch (error) {
      console.error(`[FISH-AUDIO] Failed to fetch reference voices:`, error);
      return [];
    }
  }

  /**
   * Upload audio to S3
   */
  private async uploadToS3(filePath: string, s3Key: string, contentType: string): Promise<string> {
    try {
      const fileContent = await fs.readFile(filePath);
      const bucketName = process.env.AWS_S3_BUCKET || 'smart-clip-temp';
      const bucketRegion = process.env.AWS_REGION || 'ap-south-1';

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: fileContent,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      const s3Url = `https://${bucketName}.s3.${bucketRegion}.amazonaws.com/${s3Key}`;
      console.log(`[FISH-AUDIO] Uploaded to S3: ${s3Url}`);
      
      return s3Url;

    } catch (error) {
      console.error(`[FISH-AUDIO] S3 upload failed:`, error);
      throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audio duration using ffprobe
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    try {
      const { stdout } = await execPromise(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
      );
      const duration = parseFloat(stdout.trim());
      console.log(`[FISH-AUDIO] Audio duration: ${duration}s`);
      return duration;
    } catch (error) {
      console.warn('[FISH-AUDIO] Failed to get audio duration with ffprobe, estimating...');
      const stats = await fs.stat(audioPath);
      const estimatedDuration = Math.ceil(stats.size / 16000);
      console.log(`[FISH-AUDIO] Estimated duration: ${estimatedDuration}s`);
      return estimatedDuration;
    }
  }
}

export const fishAudioService = new FishAudioService();
