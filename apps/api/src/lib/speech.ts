import { SpeechClient } from '@google-cloud/speech';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { s3Service } from './s3';

export interface SubtitleSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

class SpeechService {
  private client: SpeechClient;
  private ffmpeg: FFmpeg;
  private isLoaded = false;

  constructor() {
    this.client = new SpeechClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });
    this.ffmpeg = new FFmpeg();
  }

  private async loadFFmpeg(): Promise<void> {
    if (this.isLoaded) return;

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd';
    this.ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    this.isLoaded = true;
  }

  async extractAudioFromVideo(s3Key: string): Promise<Buffer> {
    await this.loadFFmpeg();
    
    const videoBuffer = await s3Service.downloadFile(s3Key);
    
    await this.ffmpeg.writeFile('input.mp4', new Uint8Array(videoBuffer));
    
    await this.ffmpeg.exec([
      '-i', 'input.mp4',
      '-ac', '1',
      '-ar', '16000',
      '-f', 'wav',
      'output.wav'
    ]);

    const audioData = await this.ffmpeg.readFile('output.wav');
    
    await this.ffmpeg.deleteFile('input.mp4');
    await this.ffmpeg.deleteFile('output.wav');
    
    return Buffer.from(audioData as Uint8Array);
  }

  async transcribeAudio(audioBuffer: Buffer): Promise<SubtitleSegment[]> {
    const audioBytes = audioBuffer.toString('base64');

    const request = {
      audio: {
        content: audioBytes,
      },
      config: {
        encoding: 'LINEAR16' as const,
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableWordTimeOffsets: true,
        enableAutomaticPunctuation: true,
      },
    };

    const [response] = await this.client.recognize(request);
    const transcription = response.results || [];

    const segments: SubtitleSegment[] = [];

    transcription.forEach((result) => {
      if (result.alternatives && result.alternatives[0]) {
        const alternative = result.alternatives[0];
        const words = alternative.words || [];
        
        if (words.length > 0) {
          let currentSegment = '';
          let startTime = 0;
          let wordCount = 0;
          
          words.forEach((word, index) => {
            if (wordCount === 0) {
              const seconds = Number(word.startTime?.seconds || 0);
              const nanos = Number(word.startTime?.nanos || 0);
              startTime = seconds + nanos / 1000000000;
            }
            
            currentSegment += word.word + ' ';
            wordCount++;
            
            if (wordCount >= 8 || index === words.length - 1) {
              const seconds = Number(word.endTime?.seconds || 0);
              const nanos = Number(word.endTime?.nanos || 0);
              const endTime = seconds + nanos / 1000000000;
              
              segments.push({
                text: currentSegment.trim(),
                startTime,
                endTime,
                confidence: alternative.confidence || 0
              });
              
              currentSegment = '';
              wordCount = 0;
            }
          });
        }
      }
    });
    
    return segments;
  }

  generateSRT(segments: SubtitleSegment[]): string {
    let srt = '';
    
    segments.forEach((segment, index) => {
      const startTime = this.formatSRTTime(segment.startTime);
      const endTime = this.formatSRTTime(segment.endTime);
      
      srt += `${index + 1}\n`;
      srt += `${startTime} --> ${endTime}\n`;
      srt += `${segment.text}\n\n`;
    });
    
    return srt;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }
}

export const speechService = new SpeechService();