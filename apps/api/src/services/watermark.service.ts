import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { CreditService } from './credit.service';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface WatermarkOptions {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  fontSize?: number;
  fontColor?: string;
  text?: string;
  watermarkImagePath?: string;
  watermarkScale?: number; // Scale factor for watermark size (0.1 = 10% of video width)
  userId?: string; // User ID to check subscription tier
}

export const watermarkService = {
  /**
   * Add watermark to video (only for free tier users)
   * Paid tier users (Basic, Premium, Enterprise) skip watermark
   */
  async addWatermark(
    inputPath: string,
    outputPath: string,
    options?: WatermarkOptions
  ): Promise<string> {
    console.log('\n🔧 [WATERMARK DEBUG] Starting watermark application');
    console.log('   Input path:', inputPath);
    console.log('   Output path:', outputPath);
    console.log('   Options:', JSON.stringify(options, null, 2));

    const {
      position = process.env.WATERMARK_POSITION || 'center',
      opacity = parseFloat(process.env.WATERMARK_OPACITY || '0.95'),
      watermarkImagePath = path.join(__dirname, '..', '..', '..', '..', 'apps', 'web', 'public', 'watermark.png'),
      watermarkScale = 0.95, // 95% of video width - MAXIMUM anti-piracy watermark
      userId,
    } = options || {};

    // Check subscription tier - skip watermark for paid users
    if (userId) {
      const shouldWatermark = await CreditService.shouldApplyWatermark(userId);
      if (!shouldWatermark) {
        console.log('✨ [WATERMARK] Skipping watermark for paid tier user');
        // Just copy the file without watermark
        await fs.copyFile(inputPath, outputPath);
        return outputPath;
      }
      console.log('🎨 [WATERMARK] Applying watermark for free tier user');
    }

    console.log('   Watermark image path:', watermarkImagePath);
    console.log('   Position:', position);
    console.log('   Opacity:', opacity);
    console.log('   Scale:', watermarkScale);

    // Check if input file exists
    try {
      const inputStats = await fs.stat(inputPath);
      console.log('   Input file size:', inputStats.size, 'bytes');
    } catch (error) {
      console.error('❌ [WATERMARK DEBUG] Input file does not exist:', inputPath);
      throw new Error(`Input video file not found: ${inputPath}`);
    }

    // Calculate position coordinates for image overlay
    const positions: Record<string, string> = {
      'top-left': 'x=10:y=10',
      'top-right': 'x=W-w-10:y=10',
      'bottom-left': 'x=10:y=H-h-10',
      'bottom-right': 'x=W-w-10:y=H-h-10',
      'center': 'x=(W-w)/2:y=(H-h)/2',
    };

    const positionStr = positions[position] || positions['bottom-right'];
    console.log('   Position string:', positionStr);

    // Check if watermark image exists
    try {
      await fs.access(watermarkImagePath);
      const watermarkStats = await fs.stat(watermarkImagePath);
      console.log('   Watermark image found, size:', watermarkStats.size, 'bytes');
    } catch (error) {
      console.error('❌ [WATERMARK DEBUG] Watermark image not found at:', watermarkImagePath);
      console.error('   Error:', error);
      console.warn(`⚠️ Watermark image not found at ${watermarkImagePath}, skipping watermark`);
      // Copy file without watermark if image doesn't exist
      if (inputPath !== outputPath) {
        console.log('   Copying input to output without watermark...');
        await fs.copyFile(inputPath, outputPath);
      }
      return outputPath;
    }

    // Create overlay filter for image watermark with scaling and opacity
    // Use scale2ref to scale watermark to 15% of video width, maintaining aspect ratio
    // main_w = reference video width, -1 = auto-calculate height to maintain aspect ratio
    const watermarkFilter = `[1:v][0:v]scale2ref=w=main_w*${watermarkScale}:h=-1[wm][vid];[wm]format=rgba,colorchannelmixer=aa=${opacity}[wm_alpha];[vid][wm_alpha]overlay=${positionStr}`;
    console.log('   FFmpeg filter:', watermarkFilter);
    console.log('   Note: Watermark will be scaled to', (watermarkScale * 100).toFixed(0), '% of video width');

    return new Promise((resolve, reject) => {
      console.log('🎥 [WATERMARK DEBUG] Starting FFmpeg process...');
      
      // Use a temporary output file to avoid faststart reopen issues
      const tempOutputPath = outputPath + '.tmp.mp4';
      
      const ffmpegCommand = ffmpeg(inputPath)
        .input(watermarkImagePath) // Add watermark image as second input
        .complexFilter(watermarkFilter)
        .outputOptions([
          '-c:a copy', // Copy audio without re-encoding
          '-preset fast',
          '-movflags', 'faststart', // Enable fast start for web playback (without +)
        ])
        .output(tempOutputPath)
        .on('start', (commandLine) => {
          console.log('   FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`   Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('stderr', (stderrLine) => {
          console.log('   FFmpeg:', stderrLine);
        })
        .on('end', async () => {
          try {
            // Move temp file to final output path
            await fs.rename(tempOutputPath, outputPath);
            
            const outputStats = await fs.stat(outputPath);
            console.log(`✅ [WATERMARK DEBUG] Watermark applied successfully`);
            console.log('   Output file:', outputPath);
            console.log('   Output size:', outputStats.size, 'bytes');
            resolve(outputPath);
          } catch (statError) {
            console.error('❌ [WATERMARK DEBUG] Output file verification failed:', statError);
            // Clean up temp file if it exists
            try {
              await fs.unlink(tempOutputPath);
            } catch {}
            reject(new Error(`Output file not created: ${outputPath}`));
          }
        })
        .on('error', async (err, stdout, stderr) => {
          console.error('❌ [WATERMARK DEBUG] FFmpeg error occurred');
          console.error('   Error message:', err.message);
          console.error('   Error stack:', err.stack);
          if (stdout) console.error('   stdout:', stdout);
          if (stderr) console.error('   stderr:', stderr);
          
          // Clean up temp file if it exists
          try {
            await fs.unlink(tempOutputPath);
          } catch {}
          
          reject(new Error(`Watermark error: ${err.message}`));
        });
      
      ffmpegCommand.run();
    });
  },

  /**
   * Check if user should have watermark
   */
  shouldApplyWatermark(subscriptionTier: string): boolean {
    return subscriptionTier === 'free';
  },

  /**
   * Process video with conditional watermark
   */
  async processVideoWithConditionalWatermark(
    inputPath: string,
    outputPath: string,
    subscriptionTier: string,
    options?: WatermarkOptions
  ): Promise<string> {
    if (this.shouldApplyWatermark(subscriptionTier)) {
      return this.addWatermark(inputPath, outputPath, options);
    }

    // No watermark needed - copy or return original path
    if (inputPath !== outputPath) {
      await fs.copyFile(inputPath, outputPath);
    }
    return outputPath;
  },

  /**
   * Create temporary output path for watermarked video
   */
  createWatermarkedPath(originalPath: string): string {
    const dir = path.dirname(originalPath);
    const ext = path.extname(originalPath);
    const name = path.basename(originalPath, ext);
    return path.join(dir, `${name}_watermarked${ext}`);
  },
};
