/**
 * Thumbnail Generation Service
 * Generates video thumbnails and preview images using FFmpeg
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { uploadFile } from '../lib/s3';

let ffmpeg: FFmpeg;

/**
 * Initialize FFmpeg instance
 */
async function initFFmpeg(): Promise<void> {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
  }
}

/**
 * Generate thumbnail from video at specific timestamp
 */
export async function generateThumbnail(
  videoUrl: string, 
  timestamp: number = 0,
  width: number = 320,
  height: number = 180
): Promise<string> {
  try {
    await initFFmpeg();
    
    const videoData = await fetchFile(videoUrl);
    const inputName = 'input.mp4';
    const outputName = 'thumbnail.jpg';
    
    await ffmpeg.writeFile(inputName, videoData);
    
    await ffmpeg.exec([
      '-i', inputName,
      '-ss', timestamp.toString(),
      '-vframes', '1',
      '-vf', `scale=${width}:${height}`,
      '-q:v', '2',
      outputName
    ]);
    
    const thumbnailData = await ffmpeg.readFile(outputName);
    
    const s3Key = `thumbnails/${Date.now()}_thumbnail.jpg`;
    const thumbnailUrl = await uploadFile(s3Key, Buffer.from(thumbnailData as Uint8Array), 'image/jpeg');
    
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
    
    return thumbnailUrl;
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    throw new Error(`Failed to generate thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate multiple thumbnails (sprite sheet)
 */
export async function generateThumbnailSprite(
  videoUrl: string,
  count: number = 10,
  width: number = 160,
  height: number = 90
): Promise<{ spriteUrl: string; timestamps: number[] }> {
  try {
    await initFFmpeg();
    
    const videoData = await fetchFile(videoUrl);
    const inputName = 'input.mp4';
    
    await ffmpeg.writeFile(inputName, videoData);
    
    await ffmpeg.exec(['-i', inputName, '-f', 'null', '-']);
    
    const timestamps: number[] = [];
    const thumbnails: Buffer[] = [];
    
    for (let i = 0; i < count; i++) {
      const timestamp = (i * 10); // Every 10 seconds for now
      timestamps.push(timestamp);
      
      const outputName = `thumb_${i}.jpg`;
      
      await ffmpeg.exec([
        '-i', inputName,
        '-ss', timestamp.toString(),
        '-vframes', '1',
        '-vf', `scale=${width}:${height}`,
        '-q:v', '2',
        outputName
      ]);
      
      const thumbData = await ffmpeg.readFile(outputName);
      thumbnails.push(Buffer.from(thumbData as Uint8Array));
      await ffmpeg.deleteFile(outputName);
    }
    
    const s3Key = `sprites/${Date.now()}_sprite.jpg`;
    const spriteUrl = await uploadFile(s3Key, thumbnails[0], 'image/jpeg');
    
    await ffmpeg.deleteFile(inputName);
    
    return {
      spriteUrl,
      timestamps
    };
  } catch (error) {
    console.error('Sprite generation error:', error);
    throw new Error(`Failed to generate sprite: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate preview frame for timeline scrubbing
 */
export async function generatePreviewFrame(
  videoUrl: string,
  timestamp: number,
  width: number = 480,
  height: number = 270
): Promise<string> {
  return generateThumbnail(videoUrl, timestamp, width, height);
}

/**
 * Extract video metadata (duration, dimensions, etc.)
 */
export async function getVideoMetadata(videoUrl: string): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
}> {
  try {
    const { getVideoInfo } = await import('./video-processing.service');
    const info = await getVideoInfo(videoUrl);
    
    return {
      duration: info.duration,
      width: info.width,
      height: info.height,
      fps: info.fps
    };
  } catch (error) {
    console.error('Metadata extraction error:', error);
    throw new Error(`Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}