import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { speechToText } from './ai.service';
import { downloadFile } from '../lib/s3';

export interface SubtitleSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

let ffmpeg: FFmpeg | null = null;

const getFFmpeg = async () => {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
  }
  return ffmpeg;
};

export const extractAudioFromVideo = async (videoS3Key: string): Promise<Buffer> => {
  const ffmpegInstance = await getFFmpeg();
  
  const videoBuffer = await downloadFile(videoS3Key);
  await ffmpegInstance.writeFile('input.mp4', await fetchFile(new Blob([videoBuffer])));
  
  await ffmpegInstance.exec([
    '-i', 'input.mp4',
    '-ac', '1',
    '-ar', '16000',
    '-f', 'wav',
    'output.wav'
  ]);

  const audioData = await ffmpegInstance.readFile('output.wav');
  return Buffer.from(audioData as Uint8Array);
};

export const generateSubtitles = async (videoS3Key: string): Promise<SubtitleSegment[]> => {
  const audioBuffer = await extractAudioFromVideo(videoS3Key);
  const results = await speechToText(audioBuffer);
  
  const segments: SubtitleSegment[] = [];

  results.forEach((result) => {
    if (result.alternatives && result.alternatives[0]) {
      const alternative = result.alternatives[0];
      const words = alternative.words || [];
      
      if (words.length > 0) {
        let currentSegment = '';
        let startTime = 0;
        let wordCount = 0;
        
        words.forEach((word, index) => {
          if (wordCount === 0) {
            startTime = parseFloat(String(word.startTime?.seconds || '0')) + 
                       parseFloat(String(word.startTime?.nanos || '0')) / 1000000000;
          }
          
          currentSegment += word.word + ' ';
          wordCount++;
          
          if (wordCount >= 8 || index === words.length - 1) {
            const endTime = parseFloat(String(word.endTime?.seconds || '0')) + 
                           parseFloat(String(word.endTime?.nanos || '0')) / 1000000000;
            
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
};

const formatSRTTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
};

export const generateSRT = (segments: SubtitleSegment[]): string => {
  let srt = '';
  
  segments.forEach((segment, index) => {
    const startTime = formatSRTTime(segment.startTime);
    const endTime = formatSRTTime(segment.endTime);
    
    srt += `${index + 1}\n`;
    srt += `${startTime} --> ${endTime}\n`;
    srt += `${segment.text}\n\n`;
  });
  
  return srt;
};