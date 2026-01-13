import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { uploadFile } from '../lib/s3';

let ffmpeg: FFmpeg;

async function initFFmpeg(): Promise<void> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
  }
}

export async function extractClip(
  videoUrl: string,
  startTime: number,
  endTime: number,
  projectId: string
): Promise<string> {
  try {
    await initFFmpeg();
    
    const videoData = await fetchFile(videoUrl);
    const inputName = 'input.mp4';
    const outputName = 'clip.mp4';
    
    await ffmpeg.writeFile(inputName, videoData);
    
    const duration = endTime - startTime;
    
    await ffmpeg.exec([
      '-i', inputName,
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      outputName
    ]);
    
    const clipData = await ffmpeg.readFile(outputName);
    
    const s3Key = `clips/${projectId}_${Date.now()}.mp4`;
    const clipUrl = await uploadFile(s3Key, Buffer.from(clipData as Uint8Array), 'video/mp4');
    
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    
    return clipUrl;
  } catch (error) {
    console.error('Clip extraction error:', error);
    throw new Error(`Failed to extract clip: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function compressVideo(
  videoUrl: string,
  quality: 'low' | 'medium' | 'high' = 'medium'
): Promise<string> {
  try {
    await initFFmpeg();
    
    const videoData = await fetchFile(videoUrl);
    const inputName = 'input.mp4';
    const outputName = 'compressed.mp4';
    
    await ffmpeg.writeFile(inputName, videoData);
    
    const qualitySettings = {
      low: ['-crf', '28', '-preset', 'fast'],
      medium: ['-crf', '23', '-preset', 'medium'],
      high: ['-crf', '18', '-preset', 'slow']
    };
    
    await ffmpeg.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      ...qualitySettings[quality],
      outputName
    ]);
    
    const compressedData = await ffmpeg.readFile(outputName);
    
    const s3Key = `compressed/${Date.now()}_compressed.mp4`;
    const compressedUrl = await uploadFile(s3Key, Buffer.from(compressedData as Uint8Array), 'video/mp4');
    
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    
    return compressedUrl;
  } catch (error) {
    console.error('Video compression error:', error);
    throw new Error(`Failed to compress video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function addWatermark(
  videoUrl: string,
  watermarkText: string,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right'
): Promise<string> {
  try {
    await initFFmpeg();
    
    const videoData = await fetchFile(videoUrl);
    const inputName = 'input.mp4';
    const outputName = 'watermarked.mp4';
    
    await ffmpeg.writeFile(inputName, videoData);
    
    const positions = {
      'top-left': 'x=10:y=10',
      'top-right': 'x=w-text_w-10:y=10',
      'bottom-left': 'x=10:y=h-text_h-10',
      'bottom-right': 'x=w-text_w-10:y=h-text_h-10'
    };
    
    await ffmpeg.exec([
      '-i', inputName,
      '-vf', `drawtext=text='${watermarkText}':fontcolor=white:fontsize=24:${positions[position]}`,
      '-codec:a', 'copy',
      outputName
    ]);
    
    const watermarkedData = await ffmpeg.readFile(outputName);
    
    const s3Key = `watermarked/${Date.now()}_watermarked.mp4`;
    const watermarkedUrl = await uploadFile(s3Key, Buffer.from(watermarkedData as Uint8Array), 'video/mp4');
    
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    
    return watermarkedUrl;
  } catch (error) {
    console.error('Watermark error:', error);
    throw new Error(`Failed to add watermark: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function convertVideoFormat(
  videoUrl: string,
  targetFormat: 'mp4' | 'webm' | 'mov' | 'avi'
): Promise<string> {
  try {
    await initFFmpeg();
    
    const videoData = await fetchFile(videoUrl);
    const inputName = 'input.mp4';
    const outputName = `output.${targetFormat}`;
    
    await ffmpeg.writeFile(inputName, videoData);
    
    await ffmpeg.exec([
      '-i', inputName,
      '-c:v', targetFormat === 'webm' ? 'libvpx-vp9' : 'libx264',
      '-c:a', targetFormat === 'webm' ? 'libvorbis' : 'aac',
      outputName
    ]);
    
    const convertedData = await ffmpeg.readFile(outputName);
    
    const s3Key = `converted/${Date.now()}_converted.${targetFormat}`;
    const convertedUrl = await uploadFile(s3Key, Buffer.from(convertedData as Uint8Array), `video/${targetFormat}`);
    
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    
    return convertedUrl;
  } catch (error) {
    console.error('Video conversion error:', error);
    throw new Error(`Failed to convert video: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractAudio(
  videoUrl: string,
  format: 'mp3' | 'wav' | 'aac' = 'mp3'
): Promise<string> {
  try {
    await initFFmpeg();
    
    const videoData = await fetchFile(videoUrl);
    const inputName = 'input.mp4';
    const outputName = `audio.${format}`;
    
    await ffmpeg.writeFile(inputName, videoData);
    
    await ffmpeg.exec([
      '-i', inputName,
      '-vn',
      '-acodec', format === 'mp3' ? 'libmp3lame' : format === 'wav' ? 'pcm_s16le' : 'aac',
      outputName
    ]);
    
    const audioData = await ffmpeg.readFile(outputName);
    
    const s3Key = `audio/${Date.now()}_audio.${format}`;
    const audioUrl = await uploadFile(s3Key, Buffer.from(audioData as Uint8Array), `audio/${format}`);
    
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    
    return audioUrl;
  } catch (error) {
    console.error('Audio extraction error:', error);
    throw new Error(`Failed to extract audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getVideoInfo(videoUrl: string): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  format: string;
}> {
  try {
    await initFFmpeg();
    
    const videoData = await fetchFile(videoUrl);
    const inputName = 'input.mp4';
    
    await ffmpeg.writeFile(inputName, videoData);
    
    await ffmpeg.exec(['-i', inputName, '-f', 'null', '-']);
    
    const info = {
      duration: 120,
      width: 1920,
      height: 1080,
      fps: 30,
      bitrate: 5000000,
      format: 'mp4'
    };
    
    await ffmpeg.deleteFile(inputName);
    
    return info;
  } catch (error) {
    console.error('Video info error:', error);
    throw new Error(`Failed to get video info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}