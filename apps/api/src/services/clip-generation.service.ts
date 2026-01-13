import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { prisma } from '../lib/prisma';
import { downloadFile, downloadFileToPath } from '../lib/s3';

const execAsync = promisify(exec);

interface ClipExportSettings {
  format: 'mp4' | 'mov' | 'webm';
  quality: 'low' | 'medium' | 'high' | 'source';
  resolution?: '720p' | '1080p' | '1440p' | '4k' | 'original';
  framerate?: number;
  bitrate?: string;
  addWatermark?: boolean;
  watermarkText?: string;
  addSubtitles?: boolean;
  includeAudio?: boolean;
  fadeInOut?: boolean;
  cropToAspectRatio?: '16:9' | '9:16' | '1:1' | 'original';
  outputDirectory?: string;
}

interface BatchExportOptions {
  segments: string[];
  exportSettings: ClipExportSettings;
  createCompilation?: boolean;
  compilationTitle?: string;
  maxCompilationLength?: number;
}

interface ExportProgress {
  segmentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputPath?: string;
  error?: string;
}

export class ClipGenerationService {
  private uploadsDir: string;
  private outputDir: string;
  private tempDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.outputDir = path.join(process.cwd(), 'uploads', 'clips');
    this.tempDir = process.env.TEMP_DIR || path.join(os.tmpdir(), 'smart-clipper');
  }

  private normalizePathForFFmpeg(filePath: string): string {
    const resolved = path.resolve(filePath);
    
    if (process.platform === 'win32' && resolved.match(/^[A-Za-z]:\\/)) {
      return resolved.replace(/\\/g, '/');
    }
    
    return resolved;
  }

  async generateSingleClip(
    segmentId: string,
    videoPath: string,
    startTime: number,
    endTime: number,
    userId: string,
    exportSettings: ClipExportSettings
  ): Promise<string> {
    console.log(`Generating clip for segment ${segmentId}: ${startTime}s - ${endTime}s`);

    try {
      const clipDuration = endTime - startTime;
      
      const { CreditService } = await import('./credit.service');
      
      const validation = await CreditService.validateAndPrepareProcessing(
        userId,
        clipDuration,
        'Clip Generation'
      );
      
      if (!validation.canProcess) {
        throw new Error(validation.message || 'Insufficient credits');
      }
      
      console.log(`[CREDITS] User has sufficient credits (${validation.currentCredits}/${validation.creditsRequired})`);
      console.log(`[WATERMARK] Will apply watermark: ${validation.shouldWatermark ? 'Yes' : 'No'}`);

      await this.ensureOutputDirectory();

      await prisma.highlightSegment.update({
        where: { id: segmentId },
        data: { status: 'generating' }
      });

      const outputPath = await this.extractClipWithSettings(
        videoPath,
        startTime,
        endTime,
        segmentId,
        userId,
        exportSettings
      );

      await prisma.highlightSegment.update({
        where: { id: segmentId },
        data: { 
          status: 'generated',
          outputPath,
          generatedAt: new Date()
        }
      });
      try {
        await CreditService.deductCredits(
          userId,
          validation.creditsRequired,
          `Clip Generation: ${Math.floor(clipDuration)}s clip`,
          {
            segmentId,
            feature: 'clip-generation',
            clipDuration,
            creditsUsed: validation.creditsRequired,
          }
        );
        console.log(`[CREDITS] Successfully deducted ${validation.creditsRequired} credits`);
      } catch (creditError) {
        console.error('[CREDITS] Failed to deduct credits:', creditError);
      }
      console.log(`Clip generated successfully: ${outputPath}`);
      return outputPath;

    } catch (error) {
      console.error(`Clip generation failed for segment ${segmentId}:`, error);
      
      await prisma.highlightSegment.update({
        where: { id: segmentId },
        data: { 
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error)
        }
      });
      
      throw error;
    }
  }

  async generateBatchClips(
    projectId: string,
    segmentIds: string[],
    options: BatchExportOptions
  ): Promise<ExportProgress[]> {
    console.log(`Starting batch export for project ${projectId}: ${segmentIds.length} clips`);

    const project = await prisma.smartClipperProject.findUnique({
      where: { id: projectId },
      include: {
        video: true,
        highlightSegments: {
          where: { id: { in: segmentIds } }
        }
      }
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const progress: ExportProgress[] = segmentIds.map(id => ({
      segmentId: id,
      status: 'pending',
      progress: 0
    }));

    try {
      for (let i = 0; i < project.highlightSegments.length; i++) {
        const segment = project.highlightSegments[i];
        const progressIndex = progress.findIndex(p => p.segmentId === segment.id);
        
        if (progressIndex === -1) continue;

        try {
          progress[progressIndex].status = 'processing';
          progress[progressIndex].progress = 0;

          const outputPath = await this.generateSingleClip(
            segment.id,
            project.video.filePath,
            segment.startTime,
            segment.endTime,
            project.userId,
            options.exportSettings
          );

          progress[progressIndex].status = 'completed';
          progress[progressIndex].progress = 100;
          progress[progressIndex].outputPath = outputPath;

        } catch (error) {
          progress[progressIndex].status = 'failed';
          progress[progressIndex].error = error instanceof Error ? error.message : String(error);
        }
      }

      if (options.createCompilation && progress.filter(p => p.status === 'completed').length > 1) {
        await this.createCompilation(
          projectId,
          progress.filter(p => p.status === 'completed' && p.outputPath),
          options
        );
      }

      console.log(`Batch export completed for project ${projectId}`);
      return progress;

    } catch (error) {
      console.error(`Batch export failed for project ${projectId}:`, error);
      throw error;
    }
  }

  private async extractClipWithSettings(
    inputPath: string,
    startTime: number,
    endTime: number,
    segmentId: string,
    userId: string,
    settings: ClipExportSettings
  ): Promise<string> {
    const duration = endTime - startTime;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `clip_${segmentId}_${timestamp}.${settings.format}`;
    const outputPath = path.join(this.outputDir, filename);

    let localVideoPath = inputPath;
    let cleanupPath: string | null = null;

    try {
      if (inputPath.startsWith('videos/')) {
        console.log(`Streaming video from S3: ${inputPath}`);
        await this.ensureTempDir();
        
        const videoExtension = path.extname(inputPath) || '.mp4';
        localVideoPath = path.join(this.tempDir, `clip_${segmentId}_input${videoExtension}`);
        await downloadFileToPath(inputPath, localVideoPath);
        cleanupPath = localVideoPath;
        
        console.log(`Video streamed to: ${localVideoPath}`);
      }

      const normalizedInputPath = this.normalizePathForFFmpeg(localVideoPath);
      const normalizedOutputPath = this.normalizePathForFFmpeg(outputPath);
      let command = `ffmpeg -y -i "${normalizedInputPath}" -ss ${startTime} -t ${duration}`;

    command += this.buildVideoFilters(settings);
    command += this.buildEncodingOptions(settings);

    if (settings.includeAudio !== false) {
      command += ' -c:a aac -b:a 128k';
    } else {
      command += ' -an';
    }

    command += ` "${normalizedOutputPath}"`;

    console.log(`Executing FFmpeg command: ${command}`);

      const { stdout, stderr } = await execAsync(command);
      
      if (stderr && !stderr.includes('frame=')) {
        console.warn(`FFmpeg warnings: ${stderr}`);
      }

      const stats = await fs.stat(outputPath);
      if (stats.size === 0) {
        throw new Error('Generated file is empty');
      }

      if (settings.addWatermark) {
        console.log(`\n[CLIP-GENERATION] Applying watermark to clip`);
        console.log('   Segment ID:', segmentId);
        console.log('   Output path:', outputPath);
        
        try {
          const { watermarkService } = await import('./watermark.service');
          const watermarkedPath = outputPath.replace(/(\.\w+)$/, '_watermarked$1');
          console.log('   Watermarked path:', watermarkedPath);
          
          await watermarkService.addWatermark(outputPath, watermarkedPath, {
            position: 'center' as const,
            opacity: parseFloat(process.env.WATERMARK_OPACITY || '0.95'),
            watermarkScale: parseFloat(process.env.WATERMARK_SCALE || '0.95'),
            userId
          });
          
          await fs.unlink(outputPath);
          await fs.rename(watermarkedPath, outputPath);
          console.log(`[CLIP-GENERATION] Watermark applied successfully`);
        } catch (watermarkError) {
          console.error('[CLIP-GENERATION] Watermark failed:', watermarkError);
          console.error('   Error:', watermarkError instanceof Error ? watermarkError.message : String(watermarkError));
          console.warn('[CLIP-GENERATION] Continuing without watermark...');
        }
      }

      return outputPath;

    } catch (error) {
      console.error(`FFmpeg execution failed:`, error);
      throw new Error(`Video processing failed: ${error}`);
    } finally {
      if (cleanupPath) {
        try {
          await fs.unlink(cleanupPath);
          console.log(`Cleaned up temporary file: ${cleanupPath}`);
        } catch (cleanupError) {
          console.warn(`Failed to cleanup temporary file ${cleanupPath}:`, cleanupError);
        }
      }
    }
  }

  private buildVideoFilters(settings: ClipExportSettings): string {
    const filters: string[] = [];

    if (settings.resolution && settings.resolution !== 'original') {
      const resolutionMap = {
        '720p': 'scale=-2:720',
        '1080p': 'scale=-2:1080',
        '1440p': 'scale=-2:1440',
        '4k': 'scale=-2:2160'
      };
      filters.push(resolutionMap[settings.resolution]);
    }

    if (settings.cropToAspectRatio && settings.cropToAspectRatio !== 'original') {
      const cropMap = {
        '16:9': 'crop=ih*16/9:ih',
        '9:16': 'crop=iw:iw*16/9',
        '1:1': 'crop=min(iw\\,ih):min(iw\\,ih)'
      };
      filters.push(cropMap[settings.cropToAspectRatio]);
    }

    if (settings.fadeInOut) {
      filters.push('fade=in:0:15,fade=out:st=0:d=1');
    }


    return filters.length > 0 ? ` -vf "${filters.join(',')}"` : '';
  }

  private buildEncodingOptions(settings: ClipExportSettings): string {
    let options = '';

    const qualityMap = {
      low: '-c:v libx264 -crf 28 -preset fast',
      medium: '-c:v libx264 -crf 23 -preset medium',
      high: '-c:v libx264 -crf 18 -preset slow',
      source: '-c:v copy'
    };

    options += ` ${qualityMap[settings.quality]}`;

    if (settings.bitrate && settings.quality !== 'source') {
      options += ` -b:v ${settings.bitrate}`;
    }

    if (settings.framerate) {
      options += ` -r ${settings.framerate}`;
    }

    return options;
  }

  private async createCompilation(
    projectId: string,
    completedClips: ExportProgress[],
    options: BatchExportOptions
  ): Promise<string> {
    console.log(`Creating compilation for project ${projectId} with ${completedClips.length} clips`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const compilationPath = path.join(this.outputDir, `compilation_${projectId}_${timestamp}.${options.exportSettings.format}`);
    
    const fileListPath = path.join(this.outputDir, `filelist_${projectId}_${timestamp}.txt`);
    const fileList = completedClips
      .filter(clip => clip.outputPath)
      .map((clip: any) => `file '${this.normalizePathForFFmpeg(clip.outputPath!)}'`)
      .join('\n');
    
    await fs.writeFile(fileListPath, fileList);

    const normalizedFileListPath = this.normalizePathForFFmpeg(fileListPath);
    const normalizedCompilationPath = this.normalizePathForFFmpeg(compilationPath);
    let command = `ffmpeg -y -f concat -safe 0 -i "${normalizedFileListPath}"`;
    
    if (options.compilationTitle) {
      const titleFilter = `drawtext=text='${options.compilationTitle}':fontsize=48:fontcolor=white:x=(w-tw)/2:y=(h-th)/2:enable='between(t,0,3)'`;
      command += ` -vf "${titleFilter}"`;
    }
    
    command += ` -c copy "${normalizedCompilationPath}"`;

    try {
      await execAsync(command);
      
      await fs.unlink(fileListPath);
      
      console.log(`Compilation created: ${compilationPath}`);
      return compilationPath;

    } catch (error) {
      console.error('Compilation creation failed:', error);
      throw error;
    }
  }

  async getExportFormats(): Promise<Array<{
    format: string;
    name: string;
    description: string;
    recommendedFor: string[];
  }>> {
    return [
      {
        format: 'mp4',
        name: 'MP4 (H.264)',
        description: 'Most compatible format for web and social media',
        recommendedFor: ['web', 'youtube', 'instagram', 'twitter']
      },
      {
        format: 'mov',
        name: 'MOV (QuickTime)',
        description: 'High quality format preferred by video editors',
        recommendedFor: ['editing', 'professional', 'apple']
      },
      {
        format: 'webm',
        name: 'WebM',
        description: 'Open standard optimized for web streaming',
        recommendedFor: ['web', 'streaming', 'chrome']
      }
    ];
  }

  async getQualityPresets(): Promise<Array<{
    quality: string;
    name: string;
    description: string;
    estimatedSize: string;
    recommendedFor: string[];
  }>> {
    return [
      {
        quality: 'low',
        name: 'Low Quality',
        description: 'Smallest file size, good for previews',
        estimatedSize: '~5MB per minute',
        recommendedFor: ['preview', 'draft', 'mobile']
      },
      {
        quality: 'medium',
        name: 'Medium Quality',
        description: 'Balanced quality and file size',
        estimatedSize: '~15MB per minute',
        recommendedFor: ['social-media', 'web', 'general']
      },
      {
        quality: 'high',
        name: 'High Quality',
        description: 'Best quality for final exports',
        estimatedSize: '~40MB per minute',
        recommendedFor: ['final', 'professional', 'archival']
      },
      {
        quality: 'source',
        name: 'Source Quality',
        description: 'Copy original quality (fastest)',
        estimatedSize: 'Varies by source',
        recommendedFor: ['lossless', 'editing', 'maximum-quality']
      }
    ];
  }

  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.access(this.tempDir);
    } catch {
      await fs.mkdir(this.tempDir, { recursive: true });
    }
  }

  async cleanupOldFiles(daysOld: number = 7): Promise<number> {
    console.log(`Cleaning up clip files older than ${daysOld} days`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let cleanedCount = 0;

    try {
      const files = await fs.readdir(this.outputDir);
      
      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      console.log(`Cleaned up ${cleanedCount} old clip files`);
      return cleanedCount;

    } catch (error) {
      console.error('Cleanup failed:', error);
      return 0;
    }
  }

  async estimateClipSize(
    duration: number,
    quality: ClipExportSettings['quality'],
    resolution?: string
  ): Promise<{
    estimatedSizeMB: number;
    estimatedProcessingTime: number;
  }> {
    const baseSizePerSecond = {
      low: 0.1,     // ~100KB per second
      medium: 0.3,  // ~300KB per second  
      high: 0.8,    // ~800KB per second
      source: 1.5   // ~1.5MB per second (varies greatly)
    };

    const resolutionMultiplier = {
      '720p': 1,
      '1080p': 2.25,
      '1440p': 4,
      '4k': 9,
      'original': 1
    };

    const multiplier = resolution ? (resolutionMultiplier[resolution as keyof typeof resolutionMultiplier] || 1) : 1;
    const estimatedSizeMB = (duration * baseSizePerSecond[quality] * multiplier);
    
    const processingTimeMultiplier = quality === 'source' ? 0.1 : (quality === 'high' ? 1.5 : 1);
    const estimatedProcessingTime = duration * processingTimeMultiplier * 0.2; // ~0.2x real-time for medium quality

    return {
      estimatedSizeMB: Math.round(estimatedSizeMB * 100) / 100,
      estimatedProcessingTime: Math.round(estimatedProcessingTime)
    };
  }
}

export const clipGeneration = new ClipGenerationService();