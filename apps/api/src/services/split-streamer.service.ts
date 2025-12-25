import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { downloadFile } from '../lib/s3';

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
      
      // Skip logging common AAC decoder warnings/errors that we're handling with err_detect
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
    
    const timeout = setTimeout(() => {
      console.error('FFmpeg process timed out after 15 minutes');
      ffmpeg.kill('SIGKILL');
      reject(new Error('FFmpeg process timed out'));
    }, 15 * 60 * 1000);
    
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
  
  // Check FFmpeg availability first
  await checkFFmpegAvailability();
  
  // Create temporary directory
  const tempDir = join(tmpdir(), `split-streamer-${Date.now()}`);
  await fs.mkdir(tempDir, { recursive: true });
  
  try {
    // Download video files
    console.log('Downloading videos from S3...');
    const downloadStart = Date.now();
    
    const [webcamBuffer, gameplayBuffer] = await Promise.all([
      downloadFile(webcamS3Key),
      downloadFile(gameplayS3Key)
    ]);
    
    console.log('Download completed in', Date.now() - downloadStart, 'ms');

    // Write videos to temp files
    const webcamPath = join(tempDir, 'webcam.mp4');
    const gameplayPath = join(tempDir, 'gameplay.mp4');
    const outputPath = join(tempDir, 'output.mp4');
    
    console.log('Writing files to temp directory...');
    await Promise.all([
      fs.writeFile(webcamPath, webcamBuffer),
      fs.writeFile(gameplayPath, gameplayBuffer)
    ]);
    
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
    
    let topHeight: number, bottomHeight: number;
    
    if (config.orientation === 'vertical') {
      topHeight = Math.floor((outputHeight * config.topRatio) / 100) - Math.floor(config.gap / 2);
      bottomHeight = Math.floor((outputHeight * config.bottomRatio) / 100) - Math.floor(config.gap / 2);
    } else {
      // Horizontal layout (16:9 output)
      topHeight = 1080; // For horizontal, both videos are full height
      bottomHeight = 1080;
    }
    
    const topVideo = config.swapVideos ? 'gameplay' : 'webcam';
    const bottomVideo = config.swapVideos ? 'webcam' : 'gameplay';
    const topZoom = config.swapVideos ? gameplayZoom : webcamZoom;
    const bottomZoom = config.swapVideos ? webcamZoom : gameplayZoom;
    
    // Build filter complex with duration handling
    console.log('Building FFmpeg filter...');
    
    let filterComplex: string;
    
    // Probe video durations
    console.log('Analyzing video durations...');
    const [webcamDuration, gameplayDuration] = await Promise.all([
      probeVideoDuration(webcamPath),
      probeVideoDuration(gameplayPath)
    ]);
    
    // Use the longer duration as the final output duration
    const outputDuration = Math.max(webcamDuration, gameplayDuration);
    console.log(`Input durations: webcam=${Math.floor(webcamDuration / 60)}:${Math.floor(webcamDuration % 60).toString().padStart(2, '0')}, gameplay=${Math.floor(gameplayDuration / 60)}:${Math.floor(gameplayDuration % 60).toString().padStart(2, '0')}`);
    console.log(`Final duration: ${Math.floor(outputDuration / 60)}:${Math.floor(outputDuration % 60).toString().padStart(2, '0')}`);
    
    if (config.orientation === 'vertical') {
      const topScaledWidth = Math.floor(outputWidth * topZoom);
      const topScaledHeight = Math.floor(topHeight * topZoom);
      const bottomScaledWidth = Math.floor(outputWidth * bottomZoom);
      const bottomScaledHeight = Math.floor(bottomHeight * bottomZoom);
      
      console.log('📀 Vertical layout dimensions (updated):', {
        topScaled: `${topScaledWidth}x${topScaledHeight}`,
        bottomScaled: `${bottomScaledWidth}x${bottomScaledHeight}`
      });
      

      const webcamFilter = `[0:v]scale=${outputWidth}:${topHeight}[webcam_scaled]`;
      const gameplayFilter = `[1:v]scale=${outputWidth}:${bottomHeight}[gameplay_scaled]`;
      
      // Create background that lasts for the full output duration
      const backgroundFilter = `color=c=${config.backgroundColor}:s=${outputWidth}x${outputHeight}:d=${outputDuration.toFixed(2)}[bg]`;
      

      const topStream = topVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled';
      const bottomStream = bottomVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled';
      
      // Use enable parameter to handle video timing properly
      const topOverlay = `[bg][${topStream}]overlay=0:0:enable='between(t,0,${topVideo === 'webcam' ? webcamDuration.toFixed(2) : gameplayDuration.toFixed(2)})'[with_top]`;
      const bottomOverlay = `[with_top][${bottomStream}]overlay=0:${topHeight + config.gap}:enable='between(t,0,${bottomVideo === 'webcam' ? webcamDuration.toFixed(2) : gameplayDuration.toFixed(2)})'[final]`;
      
      filterComplex = `${webcamFilter};${gameplayFilter};${backgroundFilter};${topOverlay};${bottomOverlay}`;
    } else {
      // Horizontal layout
      const leftWidth = Math.floor((outputWidth * config.topRatio) / 100) - Math.floor(config.gap / 2);
      const rightWidth = Math.floor((outputWidth * config.bottomRatio) / 100) - Math.floor(config.gap / 2);
      
      // Create horizontal layout with proper timing controls
      const webcamFilter = `[0:v]scale=${leftWidth}:${outputHeight}[webcam_scaled]`;
      const gameplayFilter = `[1:v]scale=${rightWidth}:${outputHeight}[gameplay_scaled]`;
      const backgroundFilter = `color=c=${config.backgroundColor}:s=${outputWidth}x${outputHeight}:d=${outputDuration.toFixed(2)}[bg]`;
      
      const leftStream = topVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled';
      const rightStream = bottomVideo === 'webcam' ? 'webcam_scaled' : 'gameplay_scaled';
      
      // Use enable parameter for horizontal overlays
      const leftOverlay = `[bg][${leftStream}]overlay=0:0:enable='between(t,0,${topVideo === 'webcam' ? webcamDuration.toFixed(2) : gameplayDuration.toFixed(2)})'[with_left]`;
      const rightOverlay = `[with_left][${rightStream}]overlay=${leftWidth + config.gap}:0:enable='between(t,0,${bottomVideo === 'webcam' ? webcamDuration.toFixed(2) : gameplayDuration.toFixed(2)})'[final]`;
      
      filterComplex = `${webcamFilter};${gameplayFilter};${backgroundFilter};${leftOverlay};${rightOverlay}`;
    }
    
    // Determine which video has audio
    const longerVideoIndex = webcamDuration >= gameplayDuration ? 0 : 1;
    console.log(`Using audio from ${longerVideoIndex === 0 ? 'webcam' : 'gameplay'} video`);
    
    // Execute FFmpeg command - optimized for large files (500MB)
    const ffmpegArgs = [
      // Error detection and recovery for corrupted audio
      '-err_detect', 'ignore_err',
      '-fflags', '+genpts+igndts',
      // Input files
      '-i', webcamPath,
      '-err_detect', 'ignore_err',
      '-fflags', '+genpts+igndts',
      '-i', gameplayPath,
      '-filter_complex', filterComplex,
      '-map', '[final]',
      '-map', `${longerVideoIndex}:a?`,
      // Video encoding optimized for large files
      '-c:v', 'libx264',
      '-preset', 'fast', // Faster encoding for large files
      '-crf', '23', // Good quality/size balance
      '-pix_fmt', 'yuv420p', // Ensure compatibility
      '-movflags', '+faststart', // Web optimization
      '-threads', '0', // Use all CPU cores
      '-max_muxing_queue_size', '1024', // Handle large files
      // Audio encoding - force re-encode to fix corrupted audio
      '-c:a', 'aac',
      '-b:a', '128k', // Consistent audio bitrate
      '-ar', '44100', // Standard sample rate
      '-ac', '2', // Stereo audio
      '-strict', 'experimental', // Allow experimental AAC encoder if needed
      // Timing and synchronization
      '-avoid_negative_ts', 'make_zero',
      '-vsync', 'cfr', // Constant frame rate for stability
      // Memory management for large files
      '-max_alloc', '2147483647', // ~2GB max allocation
      '-probesize', '100M', // Increase probe size for large files
      '-analyzeduration', '100M', // Longer analysis for better sync
      '-y',
      outputPath
    ];
    
    console.log('Executing FFmpeg...');
    const ffmpegStart = Date.now();
    
    await execFFmpeg(ffmpegArgs, outputDuration);
    
    console.log('Processing completed in', Date.now() - ffmpegStart, 'ms');
    
    // Read the output file
    try {
      const stats = await fs.stat(outputPath);
      console.log('Output file size:', stats.size, 'bytes');
    } catch (error) {
      console.error('Output file not found:', error);
      throw new Error('FFmpeg failed to create output file');
    }
    
    // Apply watermark to combined video
    console.log('\n📍 [SPLIT-STREAMER] Applying watermark to combined video...');
    console.log('   Output path:', outputPath);
    
    let finalOutputPath = outputPath;
    
    try {
      const watermarkedPath = outputPath.replace('.mp4', '_watermarked.mp4');
      console.log('   Watermarked path:', watermarkedPath);
      
      const { watermarkService } = await import('./watermark.service');
      console.log('   Watermark service imported');
      
      await watermarkService.addWatermark(outputPath, watermarkedPath, {
        position: 'center' as const,
        opacity: parseFloat(process.env.WATERMARK_OPACITY || '0.95'),
        watermarkScale: parseFloat(process.env.WATERMARK_SCALE || '0.95')
      });
      
      finalOutputPath = watermarkedPath;
      console.log('✅ [SPLIT-STREAMER] Watermark applied successfully');
    } catch (watermarkError) {
      console.error('❌ [SPLIT-STREAMER] Watermark failed:', watermarkError);
      console.error('   Error:', watermarkError instanceof Error ? watermarkError.message : String(watermarkError));
      console.warn('⚠️ [SPLIT-STREAMER] Continuing without watermark...');
      // Continue without watermark if it fails
    }
    
    console.log('   Reading final output buffer from:', finalOutputPath);
    const outputBuffer = await fs.readFile(finalOutputPath);
    console.log('   Buffer size:', outputBuffer.length, 'bytes');
    console.log('✅ [SPLIT-STREAMER] Video combination completed successfully');
    
    return outputBuffer;
  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  }
};