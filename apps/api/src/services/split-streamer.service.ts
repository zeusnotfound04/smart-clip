import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { downloadFile } from '../lib/s3';

let ffmpeg: FFmpeg | null = null;

const getFFmpeg = async () => {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    await ffmpeg.load();
  }
  return ffmpeg;
};

export const combineVideos = async (webcamS3Key: string, gameplayS3Key: string): Promise<Buffer> => {
  const ffmpegInstance = await getFFmpeg();

  const webcamBuffer = await downloadFile(webcamS3Key);
  const gameplayBuffer = await downloadFile(gameplayS3Key);

  await ffmpegInstance.writeFile('webcam.mp4', await fetchFile(new Blob([webcamBuffer])));
  await ffmpegInstance.writeFile('gameplay.mp4', await fetchFile(new Blob([gameplayBuffer])));
  
  await ffmpegInstance.exec([
    '-i', 'webcam.mp4',
    '-i', 'gameplay.mp4',
    '-filter_complex', '[0:v]scale=1080:960[top];[1:v]scale=1080:960[bottom];[top][bottom]vstack=inputs=2',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    'output.mp4'
  ]);

  const outputData = await ffmpegInstance.readFile('output.mp4');
  return Buffer.from(outputData as Uint8Array);
};