import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { downloadFile, downloadFileToPath } from '../lib/s3';

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
  webcamOffsetX?: number;
  gameplayOffsetX?: number;
}

const execFFmpeg = (args: string[], estimatedDuration: number = 0): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    console.log('Starting FFmpeg process...');
    
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    if (estimatedDuration > 0) {
      console.log(`Expected duration: ${Math.floor(estimatedDuration / 60)}:${Math.floor(estimatedDuration % 60).toString().padStart(2, '0')}`);
    }
    
    const outputChunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];
    let lastProgressTime = Date.now();
    
    ffmpeg.stdout?.on('data', (chunk) => {
      outputChunks.push(chunk);
    });
    
    ffmpeg.stderr?.on('data', (chunk) => {
      errorChunks.push(chunk);
      const output = chunk.toString();
      
      const skipPatterns = [
        '[aac @', 
        'Error submitting packet to decoder',
        'Number of bands',
        'channel element',
        'Sample rate index',
        'Reserved bit set',
        'Prediction is not allowed',
        'Too large remapped id',
        'Invalid data found when processing input'
      ];
      
      const shouldSkip = skipPatterns.some(pattern => output.includes(pattern));
      
      if (output.includes('frame=') || output.includes('time=')) {
        const now = Date.now();
        if (now - lastProgressTime > 10000) { 
          const lines = output.trim().split('\n');
          const progressLine = lines[lines.length - 1];
          
          const timeMatch = progressLine.match(/time=(\d{2}):(\d{2}):(\d{2}.\d{2})/);
          if (timeMatch && estimatedDuration > 0) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            const seconds = parseFloat(timeMatch[3]);
            const currentTimeSeconds = hours * 3600 + minutes * 60 + seconds;
            
            const progressPercent = Math.min(Math.round((currentTimeSeconds / estimatedDuration) * 100), 95);
            console.log(`Processing: ${progressPercent}% (${Math.floor(currentTimeSeconds / 60)}:${Math.floor(currentTimeSeconds % 60).toString().padStart(2, '0')})`);
          }
          
          lastProgressTime = now;
        }
      }
      
      if (!shouldSkip && (output.toLowerCase().includes('error') || output.toLowerCase().includes('failed'))) {
        console.error('FFmpeg error:', output.trim());
      }
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        console.log('FFmpeg completed successfully');
        resolve(Buffer.concat(outputChunks));
      } else {
        const errorOutput = Buffer.concat(errorChunks).toString();
        console.error('FFmpeg failed with exit code:', code);
        console.error('Error details:', errorOutput);
        reject(new Error(`FFmpeg failed with code ${code}: ${errorOutput}`));
      }
    });
    
    ffmpeg.on('error', (error) => {
      console.error('FFmpeg spawn error:', error);
      reject(new Error(`FFmpeg spawn error: ${error.message}`));
    });
    
    const timeoutDuration = Math.max((estimatedDuration * 1000) + (30 * 60 * 1000), 60 * 60 * 1000);
    const timeout = setTimeout(() => {
      console.error(`FFmpeg process timed out after ${Math.floor(timeoutDuration/60000)} minutes`);
      ffmpeg.kill('SIGKILL');
      reject(new Error('FFmpeg process timed out'));
    }, timeoutDuration);
    
    ffmpeg.on('close', () => {
      clearTimeout(timeout);
    });
  });
};

const checkFFmpegAvailability = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-version'], { stdio: 'pipe' });
    
    let output = '';
    ffmpeg.stdout?.on('data', (chunk) => {
      output += chunk.toString();
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        const version = output.split('\n')[0];
        console.log('FFmpeg version:', version);
        resolve();
      } else {
        console.error('FFmpeg is not available');
        reject(new Error('FFmpeg is not installed or not in PATH'));
      }
    });
    
    ffmpeg.on('error', (error) => {
      console.error('FFmpeg check error:', error.message);
      reject(new Error(`FFmpeg not found: ${error.message}`));
    });
  });
};

const probeVideoDuration = (filePath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      filePath
    ], { stdio: 'pipe' });
    
    let output = '';
    ffprobe.stdout?.on('data', (chunk) => {
      output += chunk.toString();
    });
    
    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const data = JSON.parse(output);
          const duration = parseFloat(data.format.duration) || 0;
          console.log(`Duration: ${Math.floor(duration / 60)}:${Math.floor(duration % 60).toString().padStart(2, '0')} (${duration.toFixed(2)}s)`);
          resolve(duration);
        } catch (error) {
          console.warn('Failed to parse duration, using 0');
          resolve(0);
        }
      } else {
        console.warn('Duration probe failed, using 0');
        resolve(0);
      }
    });
    
    ffprobe.on('error', (error) => {
      console.warn('Duration probe error:', error.message);
      resolve(0);
    });
  });
};

export const combineVideos = async (
  webcamS3Key: string, 
  gameplayS3Key: string, 
  layoutConfig?: LayoutConfig
): Promise<Buffer> => {
  console.log('Starting video combination');
  console.log('Webcam:', webcamS3Key);
  console.log('Gameplay:', gameplayS3Key);
  
  await checkFFmpegAvailability();
  
  const tempDir = join(tmpdir(), `split-streamer-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  
  try {
    console.log('Starting parallel download and analysis...');
    const downloadStart = Date.now();
    
    const webcamPath = join(tempDir, 'webcam.mp4');
    const gameplayPath = join(tempDir, 'gameplay.mp4');
    const outputPath = join(tempDir, 'output.mp4');
    
    const [webcamDuration, gameplayDuration] = await Promise.all([
      (async () => {
        await downloadFileToPath(webcamS3Key, webcamPath);
        return probeVideoDuration(webcamPath);
      })(),
      (async () => {
        await downloadFileToPath(gameplayS3Key, gameplayPath);
        return probeVideoDuration(gameplayPath);
      })()
    ]);
    
    const outputDuration = Math.max(webcamDuration, gameplayDuration);
    console.log('Parallel operations completed in', Date.now() - downloadStart, 'ms');
    console.log(`Input durations: webcam=${Math.floor(webcamDuration / 60)}:${Math.floor(webcamDuration % 60).toString().padStart(2, '0')}, gameplay=${Math.floor(gameplayDuration / 60)}:${Math.floor(gameplayDuration % 60).toString().padStart(2, '0')}`);
    console.log(`Final duration: ${Math.floor(outputDuration / 60)}:${Math.floor(outputDuration % 60).toString().padStart(2, '0')}`);

    
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
      webcamOffsetX: 0,
      gameplayOffsetX: 0,
      ...layoutConfig
    };

    const webcamZoom = config.webcamZoom;
    const gameplayZoom = config.gameplayZoom;
    const webcamOffsetX = config.webcamOffsetX || 0;
    const gameplayOffsetX = config.gameplayOffsetX || 0;
    
    const outputWidth = 1080;
    const outputHeight = 1920;
    
    let topHeight: number, bottomHeight: number;
    
    if (config.orientation === 'vertical') {
      topHeight = Math.floor((outputHeight * config.topRatio) / 100) - Math.floor(config.gap / 2);
      bottomHeight = Math.floor((outputHeight * config.bottomRatio) / 100) - Math.floor(config.gap / 2);
    } else {
      topHeight = 1080; // For horizontal, both videos are full height
      bottomHeight = 1080;
    }
    
    const topVideo = config.swapVideos ? 'gameplay' : 'webcam';
    const bottomVideo = config.swapVideos ? 'webcam' : 'gameplay';
    const topZoom = config.swapVideos ? gameplayZoom : webcamZoom;
    const bottomZoom = config.swapVideos ? webcamZoom : gameplayZoom;
    
    console.log('Building optimized FFmpeg filter...');
    
    let filterComplex: string;
    if (config.orientation === 'vertical') {
      const topViewportWidth = outputWidth;
      const topViewportHeight = topHeight;
      const bottomViewportWidth = outputWidth;
      const bottomViewportHeight = bottomHeight;
      
      const topScaledWidth = Math.floor(outputWidth * topZoom);
      const topScaledHeight = Math.floor(topHeight * topZoom);
      const bottomScaledWidth = Math.floor(outputWidth * bottomZoom);
      const bottomScaledHeight = Math.floor(bottomHeight * bottomZoom);
      
      console.log('Vertical layout dimensions:', {
        topScaled: `${topScaledWidth}x${topScaledHeight}`,
        bottomScaled: `${bottomScaledWidth}x${bottomScaledHeight}`,
        topViewport: `${topViewportWidth}x${topViewportHeight}`,
        bottomViewport: `${bottomViewportWidth}x${bottomViewportHeight}`,
        webcamOffset: webcamOffsetX,
        gameplayOffset: gameplayOffsetX
      });
      
      const topOffsetX = config.swapVideos ? gameplayOffsetX : webcamOffsetX;
      const bottomOffsetX = config.swapVideos ? webcamOffsetX : gameplayOffsetX;
      
      const topCropX = Math.max(0, Math.floor((topScaledWidth - topViewportWidth) / 2) + topOffsetX);
      const bottomCropX = Math.max(0, Math.floor((bottomScaledWidth - bottomViewportWidth) / 2) + bottomOffsetX);
      
      const webcamFilter = topZoom > 1 
        ? `[0:v]scale=${topScaledWidth}:${topScaledHeight}:flags=lanczos,crop=${topViewportWidth}:${topViewportHeight}:${topCropX}:0[webcam_scaled]`
        : `[0:v]scale=${topViewportWidth}:${topViewportHeight}:flags=lanczos[webcam_scaled]`;
      
      const gameplayFilter = bottomZoom > 1
        ? `[1:v]scale=${bottomScaledWidth}:${bottomScaledHeight}:flags=lanczos,crop=${bottomViewportWidth}:${bottomViewportHeight}:${bottomCropX}:0[gameplay_scaled]`
        : `[1:v]scale=${bottomViewportWidth}:${bottomViewportHeight}:flags=lanczos[gameplay_scaled]`;
      
      const backgroundFilter = `color=c=${config.backgroundColor}:s=${outputWidth}x${outputHeight}:d=${outputDuration.toFixed(2)}[bg]`;
      
      const topStream = topVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled';
      const bottomStream = bottomVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled';
      
      const topOverlay = `[bg][${topStream}]overlay=0:0:enable='between(t,0,${topVideo === 'webcam' ? webcamDuration.toFixed(2) : gameplayDuration.toFixed(2)})'[with_top]`;
      const bottomOverlay = `[with_top][${bottomStream}]overlay=0:${topHeight + config.gap}:enable='between(t,0,${bottomVideo === 'webcam' ? webcamDuration.toFixed(2) : gameplayDuration.toFixed(2)})'[final]`;
      
      filterComplex = `${webcamFilter};${gameplayFilter};${backgroundFilter};${topOverlay};${bottomOverlay}`;
    } else {
      const leftWidth = Math.floor((outputWidth * config.topRatio) / 100) - Math.floor(config.gap / 2);
      const rightWidth = Math.floor((outputWidth * config.bottomRatio) / 100) - Math.floor(config.gap / 2);
      const videoHeight = outputHeight;
      
      const leftScaledWidth = Math.floor(leftWidth * topZoom);
      const leftScaledHeight = Math.floor(videoHeight * topZoom);
      const rightScaledWidth = Math.floor(rightWidth * bottomZoom);
      const rightScaledHeight = Math.floor(videoHeight * bottomZoom);
      
      console.log('Horizontal layout dimensions:', {
        leftScaled: `${leftScaledWidth}x${leftScaledHeight}`,
        rightScaled: `${rightScaledWidth}x${rightScaledHeight}`,
        leftViewport: `${leftWidth}x${videoHeight}`,
        rightViewport: `${rightWidth}x${videoHeight}`,
        webcamOffset: webcamOffsetX,
        gameplayOffset: gameplayOffsetX
      });
      
      const leftOffsetX = config.swapVideos ? gameplayOffsetX : webcamOffsetX;
      const rightOffsetX = config.swapVideos ? webcamOffsetX : gameplayOffsetX;
      
      const leftCropX = Math.max(0, Math.floor((leftScaledWidth - leftWidth) / 2) + leftOffsetX);
      const rightCropX = Math.max(0, Math.floor((rightScaledWidth - rightWidth) / 2) + rightOffsetX);
      
      const webcamFilter = topZoom > 1
        ? `[0:v]scale=${leftScaledWidth}:${leftScaledHeight}:flags=lanczos,crop=${leftWidth}:${videoHeight}:${leftCropX}:0[webcam_scaled]`
        : `[0:v]scale=${leftWidth}:${videoHeight}:flags=lanczos[webcam_scaled]`;
      
      const gameplayFilter = bottomZoom > 1
        ? `[1:v]scale=${rightScaledWidth}:${rightScaledHeight}:flags=lanczos,crop=${rightWidth}:${videoHeight}:${rightCropX}:0[gameplay_scaled]`
        : `[1:v]scale=${rightWidth}:${videoHeight}:flags=lanczos[gameplay_scaled]`;
      
      const backgroundFilter = `color=c=${config.backgroundColor}:s=${outputWidth}x${outputHeight}:d=${outputDuration.toFixed(2)}[bg]`;
      
      const leftStream = topVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled';
      const rightStream = bottomVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled';
      
      const leftOverlay = `[bg][${leftStream}]overlay=0:0:enable='between(t,0,${topVideo === 'webcam' ? webcamDuration.toFixed(2) : gameplayDuration.toFixed(2)})'[with_left]`;
      const rightOverlay = `[with_left][${rightStream}]overlay=${leftWidth + config.gap}:0:enable='between(t,0,${bottomVideo === 'webcam' ? webcamDuration.toFixed(2) : gameplayDuration.toFixed(2)})'[final]`;
      
      filterComplex = `${webcamFilter};${gameplayFilter};${backgroundFilter};${leftOverlay};${rightOverlay}`;
    }
    
    const getOptimalSettings = (duration: number) => {
      if (duration > 7200) { // 2+ hours
        return { preset: 'veryfast', crf: 23, params: 'ref=1:bframes=1:me=dia:subme=4:rc-lookahead=20', threads: '12' };
      } else if (duration > 3600) { // 1-2 hours
        return { preset: 'faster', crf: 22, params: 'ref=2:bframes=2:me=hex:subme=5:rc-lookahead=25', threads: '10' };
      } else if (duration > 1800) { // 30min-1hr
        return { preset: 'fast', crf: 21, params: 'ref=2:bframes=2:me=hex:subme=6:rc-lookahead=30', threads: '8' };
      } else if (duration > 600) { // 10-30min
        return { preset: 'medium', crf: 20, params: 'ref=3:bframes=3:me=umh:subme=7:rc-lookahead=40', threads: '8' };
      } else { // < 10min
        return { preset: 'slow', crf: 19, params: 'ref=4:bframes=4:me=umh:subme=8:rc-lookahead=50', threads: '6' };
      }
    };
    
    const settings = getOptimalSettings(outputDuration);
    console.log(`Using ${settings.preset} preset for ${Math.floor(outputDuration/60)}min video (CRF ${settings.crf}, ${settings.threads} threads)`);
    
    const longerVideoIndex = webcamDuration >= gameplayDuration ? 0 : 1;
    console.log(`Using audio from ${longerVideoIndex === 0 ? 'webcam' : 'gameplay'} video`);
    
    const ffmpegArgs = [
      '-err_detect', 'ignore_err',
      '-fflags', '+genpts+igndts',
      '-hwaccel', 'auto', // Enable hardware acceleration if available
      '-i', webcamPath,
      '-err_detect', 'ignore_err',
      '-fflags', '+genpts+igndts',
      '-hwaccel', 'auto',
      '-i', gameplayPath,
      '-filter_complex', filterComplex,
      '-map', '[final]',
      '-map', `${longerVideoIndex}:a?`,
      '-c:v', 'libx264',
      '-preset', settings.preset,
      '-tune', 'film',
      '-crf', settings.crf.toString(),
      '-threads', settings.threads,
      '-x264-params', settings.params,
      '-profile:v', 'high',
      '-level', '4.1',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-max_muxing_queue_size', '8192', // Increased for better parallel processing
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '48000',
      '-ac', '2',
      '-aac_coder', 'twoloop',
      '-avoid_negative_ts', 'make_zero',
      '-vsync', 'cfr',
      '-aspect', config.orientation === 'vertical' ? '9:16' : '16:9', // Force correct aspect ratio
      '-max_alloc', '4294967296',
      '-probesize', '200M',
      '-analyzeduration', '200M',
      '-y',
      outputPath
    ];
    
    console.log('Executing FFmpeg...');
    const ffmpegStart = Date.now();
    
    await execFFmpeg(ffmpegArgs, outputDuration);
    
    console.log('Processing completed in', Date.now() - ffmpegStart, 'ms');
    
    const [stats, finalBuffer] = await Promise.all([
      fs.stat(outputPath),
      (async () => {
        try {
          const watermarkedPath = outputPath.replace('.mp4', '_watermarked.mp4');
          console.log('Applying watermark...');
          
          const { watermarkService } = await import('./watermark.service');
          
          await watermarkService.addWatermark(outputPath, watermarkedPath, {
            position: 'center' as const,
            opacity: parseFloat(process.env.WATERMARK_OPACITY || '0.95'),
            watermarkScale: parseFloat(process.env.WATERMARK_SCALE || '0.95')
          });
          
          console.log('Watermark applied successfully');
          return await fs.readFile(watermarkedPath);
        } catch (watermarkError) {
          console.error('Watermark failed:', watermarkError);
          console.warn('Using original video without watermark');
          return await fs.readFile(outputPath);
        }
      })()
    ]);
    
    console.log('Output file size:', stats.size, 'bytes');
    console.log('Buffer size:', finalBuffer.length, 'bytes');
    console.log('Video combination completed successfully');
    
    return finalBuffer;
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  }
};