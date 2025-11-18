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

interface LayoutConfig {
  orientation: 'vertical' | 'horizontal';
  topRatio: number;
  bottomRatio: number;
  gap: number;
  backgroundColor: string;
  cornerRadius: number;
  swapVideos: boolean;
  webcamZoom: number;
  gameplayZoom: number;
}

export const combineVideos = async (
  webcamS3Key: string, 
  gameplayS3Key: string, 
  layoutConfig?: LayoutConfig
): Promise<Buffer> => {
  const ffmpegInstance = await getFFmpeg();

  const webcamBuffer = await downloadFile(webcamS3Key);
  const gameplayBuffer = await downloadFile(gameplayS3Key);

  await ffmpegInstance.writeFile('webcam.mp4', await fetchFile(new Blob([webcamBuffer])));
  await ffmpegInstance.writeFile('gameplay.mp4', await fetchFile(new Blob([gameplayBuffer])));
  
  // Default config if none provided
  const config: LayoutConfig = {
    orientation: 'vertical',
    topRatio: 50,
    bottomRatio: 50,
    gap: 4,
    backgroundColor: '#000000',
    cornerRadius: 8,
    swapVideos: false,
    webcamZoom: 1,
    gameplayZoom: 1,
    ...layoutConfig
  };

  // Calculate zoom scales
  const webcamZoom = config.webcamZoom;
  const gameplayZoom = config.gameplayZoom;
  
  // Base dimensions for 9:16 portrait output
  const outputWidth = 1080;
  const outputHeight = 1920;
  
  // Calculate video dimensions based on ratios
  let topHeight: number, bottomHeight: number;
  
  if (config.orientation === 'vertical') {
    topHeight = Math.floor((outputHeight * config.topRatio) / 100) - Math.floor(config.gap / 2);
    bottomHeight = Math.floor((outputHeight * config.bottomRatio) / 100) - Math.floor(config.gap / 2);
  } else {
    // Horizontal layout (16:9 output)
    topHeight = 1080; // For horizontal, both videos are full height
    bottomHeight = 1080;
  }
  
  // Determine which video goes where
  const topVideo = config.swapVideos ? 'gameplay' : 'webcam';
  const bottomVideo = config.swapVideos ? 'webcam' : 'gameplay';
  const topZoom = config.swapVideos ? gameplayZoom : webcamZoom;
  const bottomZoom = config.swapVideos ? webcamZoom : gameplayZoom;
  
  // Build filter complex based on layout
  let filterComplex: string;
  
  if (config.orientation === 'vertical') {
    // Calculate scaled dimensions with zoom
    const topScaledWidth = Math.floor(outputWidth * topZoom);
    const topScaledHeight = Math.floor(topHeight * topZoom);
    const bottomScaledWidth = Math.floor(outputWidth * bottomZoom);
    const bottomScaledHeight = Math.floor(bottomHeight * bottomZoom);
    
    filterComplex = `
      [0:v]scale=${topScaledWidth}:${topScaledHeight}[webcam_scaled];
      [1:v]scale=${bottomScaledWidth}:${bottomScaledHeight}[gameplay_scaled];
      [${topVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled'}]crop=${outputWidth}:${topHeight}[top];
      [${bottomVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled'}]crop=${outputWidth}:${bottomHeight}[bottom];
      color=c=${config.backgroundColor}:s=${outputWidth}x${outputHeight}[bg];
      [bg][top]overlay=0:0[with_top];
      [with_top][bottom]overlay=0:${topHeight + config.gap}[final]
    `.replace(/\s+/g, '');
    
    filterComplex = `[0:v]scale=${topScaledWidth}:${topScaledHeight}[webcam_scaled];[1:v]scale=${bottomScaledWidth}:${bottomScaledHeight}[gameplay_scaled];[${topVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled'}]crop=${outputWidth}:${topHeight}[top];[${bottomVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled'}]crop=${outputWidth}:${bottomHeight}[bottom];color=c=${config.backgroundColor}:s=${outputWidth}x${outputHeight}[bg];[bg][top]overlay=0:0[with_top];[with_top][bottom]overlay=0:${topHeight + config.gap}[final]`;
  } else {
    // Horizontal layout
    const leftWidth = Math.floor((outputWidth * config.topRatio) / 100) - Math.floor(config.gap / 2);
    const rightWidth = Math.floor((outputWidth * config.bottomRatio) / 100) - Math.floor(config.gap / 2);
    
    const leftScaledWidth = Math.floor(leftWidth * topZoom);
    const leftScaledHeight = Math.floor(outputHeight * topZoom);
    const rightScaledWidth = Math.floor(rightWidth * bottomZoom);
    const rightScaledHeight = Math.floor(outputHeight * bottomZoom);
    
    filterComplex = `[0:v]scale=${leftScaledWidth}:${leftScaledHeight}[webcam_scaled];[1:v]scale=${rightScaledWidth}:${rightScaledHeight}[gameplay_scaled];[${topVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled'}]crop=${leftWidth}:${outputHeight}[left];[${bottomVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled'}]crop=${rightWidth}:${outputHeight}[right];color=c=${config.backgroundColor}:s=${outputWidth}x${outputHeight}[bg];[bg][left]overlay=0:0[with_left];[with_left][right]overlay=${leftWidth + config.gap}:0[final]`;
  }
  
  await ffmpegInstance.exec([
    '-i', 'webcam.mp4',
    '-i', 'gameplay.mp4',
    '-filter_complex', filterComplex,
    '-map', '[final]',
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'medium',
    '-crf', '23',
    'output.mp4'
  ]);

  const outputData = await ffmpegInstance.readFile('output.mp4');
  return Buffer.from(outputData as Uint8Array);
};