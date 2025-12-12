import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';

interface WatermarkOptions {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  fontSize?: number;
  fontColor?: string;
  text?: string;
}

export const watermarkService = {
  /**
   * Add watermark to video
   */
  async addWatermark(
    inputPath: string,
    outputPath: string,
    options?: WatermarkOptions
  ): Promise<string> {
    const {
      position = process.env.WATERMARK_POSITION || 'bottom-right',
      opacity = parseFloat(process.env.WATERMARK_OPACITY || '0.7'),
      fontSize = parseInt(process.env.WATERMARK_FONT_SIZE || '24'),
      fontColor = process.env.WATERMARK_FONT_COLOR || 'white',
      text = process.env.WATERMARK_TEXT || 'Smart Clip',
    } = options || {};

    // Calculate position coordinates
    const positions = {
      'top-left': 'x=10:y=10',
      'top-right': 'x=w-tw-10:y=10',
      'bottom-left': 'x=10:y=h-th-10',
      'bottom-right': 'x=w-tw-10:y=h-th-10',
      'center': 'x=(w-tw)/2:y=(h-th)/2',
    };

    const positionStr = positions[position] || positions['bottom-right'];

    // Create drawtext filter for watermark
    const watermarkFilter = `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}@${opacity}:${positionStr}:box=1:boxcolor=black@0.5:boxborderw=5`;

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(watermarkFilter)
        .outputOptions([
          '-c:a copy', // Copy audio without re-encoding
          '-preset fast',
        ])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err) => reject(new Error(`Watermark error: ${err.message}`)))
        .run();
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
