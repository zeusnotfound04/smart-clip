import { Request, Response } from 'express';
import { combineVideos } from '../services/split-streamer.service';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { downloadFile } from '../lib/s3';

interface AuthRequest extends Request {
  userId?: string;
}

let ffmpeg: FFmpeg | null = null;

const getFFmpeg = async () => {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
  }
  return ffmpeg;
};

export const generatePreview = async (req: Request, res: Response) => {
  try {
    const { webcamS3Key, gameplayS3Key } = req.body;
    
    if (!webcamS3Key || !gameplayS3Key) {
      return res.status(400).json({ error: 'Both webcam and gameplay video keys are required' });
    }

    const ffmpegInstance = await getFFmpeg();
    
    const webcamBuffer = await downloadFile(webcamS3Key);
    const gameplayBuffer = await downloadFile(gameplayS3Key);

    await ffmpegInstance.writeFile('webcam.mp4', await fetchFile(new Blob([webcamBuffer])));
    await ffmpegInstance.writeFile('gameplay.mp4', await fetchFile(new Blob([gameplayBuffer])));
    
    await ffmpegInstance.exec([
      '-i', 'webcam.mp4',
      '-i', 'gameplay.mp4',
      '-filter_complex', '[0:v]scale=1080:960[top];[1:v]scale=1080:960[bottom];[top][bottom]vstack=inputs=2',
      '-t', '5',
      '-f', 'image2',
      '-vframes', '1',
      'preview.jpg'
    ]);

    const previewData = await ffmpegInstance.readFile('preview.jpg');
    
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'inline; filename="preview.jpg"'
    });
    res.send(Buffer.from(previewData as Uint8Array));
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: 'Failed to generate preview' });
  }
};