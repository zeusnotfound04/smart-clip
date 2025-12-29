import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { prisma } from '../lib/prisma';
import { downloadFile, downloadFileToPath } from '../lib/s3';

const execAsync = promisify(exec);
const execAsyncLargeBuffer = (command: string) => execAsync(command, { maxBuffer: 100 * 1024 * 1024 });

interface AudioAnalysisResult {
  averageEnergy: number;
  energyPeaks: Array<{
    timestamp: number;
    energy: number;
  }>;
  silenceSegments: Array<{
    start: number;
    end: number;
    duration: number;
  }>;
  rmsValues: number[];
  totalDuration: number;
  silenceRatio: number;
}

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  format: string;
  hasAudio: boolean;
  audioSampleRate?: number;
  audioChannels?: number;
}

interface SceneChangeResult {
  sceneChanges: Array<{
    timestamp: number;
    score: number;
  }>;
  totalScenes: number;
  averageSceneLength: number;
}

interface PreprocessingResult {
  videoMetadata: VideoMetadata;
  audioAnalysis: AudioAnalysisResult;
  sceneChanges: SceneChangeResult;
  waveformData: number[];
  processingTime: number;
}

export class FFmpegPreprocessingService {
  private tempDir: string;
  private maxConcurrentTasks: number;

  constructor() {
    const defaultTempDir = this.getDefaultTempDir();
    this.tempDir = process.env.TEMP_DIR || path.join(process.env.TEMP || process.env.TMPDIR || defaultTempDir, 'smart-clipper');
    this.maxConcurrentTasks = os.cpus().length;
    console.log(`FFmpeg Service initialized with ${this.maxConcurrentTasks} concurrent tasks on ${os.cpus().length}-core CPU (16GB RAM optimized)`);
  }

  private getDefaultTempDir(): string {
    // Use Node.js os.tmpdir() for cross-platform compatibility
    // This returns /tmp on Linux/macOS and C:\Users\{user}\AppData\Local\Temp on Windows
    return os.tmpdir();
  }

  private normalizePathForFFmpeg(filePath: string): string {
    // Normalize path for FFmpeg command line usage
    // FFmpeg works with forward slashes on all platforms, but we need to handle Windows paths carefully
    const resolved = path.resolve(filePath);
    
    // On Windows, if we have a drive letter, ensure the path is properly formatted for FFmpeg
    if (process.platform === 'win32' && resolved.match(/^[A-Za-z]:\\/)) {
      // Convert backslashes to forward slashes for FFmpeg on Windows
      return resolved.replace(/\\/g, '/');
    }
    
    // On Unix-like systems, return as-is (already uses forward slashes)
    return resolved;
  }

  async preprocessVideo(
    videoPath: string,
    projectId: string,
    options: {
      enableSceneDetection?: boolean;
      enableWaveformGeneration?: boolean;
      silenceThreshold?: number;
      energySampleInterval?: number;
    } = {}
  ): Promise<PreprocessingResult> {
    console.log(`[${projectId}] Starting FFmpeg preprocessing for video: ${videoPath}`);
    const startTime = Date.now();
    let localVideoPath: string | null = null;

    try {
      await this.ensureTempDir();

      // Check if videoPath is an S3 key or local path
      if (videoPath.startsWith('videos/')) {
        console.log(`[${projectId}] 🚀 Streaming video from S3: ${videoPath}`);
        
        // Create local temp file path
        const videoExtension = path.extname(videoPath) || '.mp4';
        localVideoPath = path.join(this.tempDir, `${projectId}-input${videoExtension}`);
        
        // 🔥 Use streaming download to file (much faster, avoids RAM usage)
        await downloadFileToPath(videoPath, localVideoPath);
        console.log(`[${projectId}] ✅ Video streamed to: ${localVideoPath}`);
        
        // Use local path for processing
        videoPath = localVideoPath;
      }

      // Run analysis tasks in parallel for efficiency
      const [videoMetadata, audioAnalysis, sceneChanges, waveformData] = await Promise.all([
        this.extractVideoMetadata(videoPath, projectId),
        this.analyzeAudioEnergy(videoPath, projectId, options),
        options.enableSceneDetection ? this.detectSceneChanges(videoPath, projectId) : this.getEmptySceneResult(),
        options.enableWaveformGeneration ? this.generateWaveformData(videoPath, projectId) : Promise.resolve([])
      ]);

      const processingTime = Date.now() - startTime;
      
      console.log(`[${projectId}] Preprocessing completed in ${processingTime}ms`);
      console.log(`[${projectId}] Results: ${audioAnalysis.energyPeaks.length} energy peaks, ${sceneChanges.totalScenes} scenes, ${audioAnalysis.silenceSegments.length} silence segments`);

      return {
        videoMetadata,
        audioAnalysis,
        sceneChanges,
        waveformData,
        processingTime
      };

    } catch (error) {
      console.error(`[${projectId}] Preprocessing failed:`, error);
      throw error;
    } finally {
      // Clean up downloaded file
      if (localVideoPath) {
        try {
          await fs.unlink(localVideoPath);
          console.log(`[${projectId}] Cleaned up local video file: ${localVideoPath}`);
        } catch (cleanupError) {
          console.warn(`[${projectId}] Failed to cleanup local video file:`, cleanupError);
        }
      }
    }
  }

  private async extractVideoMetadata(videoPath: string, projectId: string): Promise<VideoMetadata> {
    console.log(`[${projectId}] Extracting video metadata`);

    const normalizedVideoPath = this.normalizePathForFFmpeg(videoPath);
    const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${normalizedVideoPath}"`;
    
    try {
      const { stdout } = await execAsyncLargeBuffer(command);
      const probe = JSON.parse(stdout);
      
      const videoStream = probe.streams.find((s: any) => s.codec_type === 'video');
      const audioStream = probe.streams.find((s: any) => s.codec_type === 'audio');
      
      if (!videoStream) {
        throw new Error('No video stream found');
      }

      return {
        duration: parseFloat(probe.format.duration),
        width: videoStream.width,
        height: videoStream.height,
        fps: eval(videoStream.r_frame_rate), // e.g., "30/1" -> 30
        bitrate: parseInt(probe.format.bit_rate),
        format: probe.format.format_name,
        hasAudio: !!audioStream,
        audioSampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate) : undefined,
        audioChannels: audioStream?.channels
      };

    } catch (error) {
      console.error(`[${projectId}] Metadata extraction failed:`, error);
      throw new Error(`Failed to extract video metadata: ${error}`);
    }
  }

  private async analyzeAudioEnergy(
    videoPath: string, 
    projectId: string,
    options: {
      silenceThreshold?: number;
      energySampleInterval?: number;
    }
  ): Promise<AudioAnalysisResult> {
    console.log(`[${projectId}] Analyzing audio energy and silence`);
    
    const silenceThreshold = options.silenceThreshold || -30; // dB
    const sampleInterval = options.energySampleInterval || 0.5; // seconds
    
    const tempAudioFile = path.join(this.tempDir, `${projectId}-audio.wav`);

    try {
      // Extract audio and analyze energy
      const normalizedVideoPath = this.normalizePathForFFmpeg(videoPath);
      const normalizedTempAudioFile = this.normalizePathForFFmpeg(tempAudioFile);
      const audioCommand = `ffmpeg -i "${normalizedVideoPath}" -vn -acodec pcm_s16le -ar 44100 -ac 1 -threads ${this.maxConcurrentTasks} "${normalizedTempAudioFile}" -y`;
      await execAsyncLargeBuffer(audioCommand);

      // Analyze RMS energy levels using astats filter without problematic file output
      // Output metadata to stderr which we can capture directly
      const energyCommand = `ffmpeg -i "${normalizedTempAudioFile}" -af "astats=metadata=1:reset=1" -f null -`;
      const { stderr } = await execAsyncLargeBuffer(energyCommand);

      // Detect silence segments - Windows compatible
      const silenceCommand = `ffmpeg -i "${normalizedTempAudioFile}" -af "silencedetect=noise=${silenceThreshold}dB:duration=0.5" -f null -`;
      
      let silenceOutput = '';
      try {
        const { stderr } = await execAsyncLargeBuffer(silenceCommand);
        silenceOutput = stderr; // silence detection output goes to stderr
      } catch (error: any) {
        // silencedetect might not find any silence, which is okay
        console.log(`[${projectId}] No silence detected or command failed (this is okay)`);
        // Extract stderr from error if available
        if (error && error.stderr) {
          silenceOutput = error.stderr;
        }
      }

      // Parse energy data from stderr output
      const { rmsValues, energyPeaks, averageEnergy } = this.parseEnergyDataFromStderr(stderr, sampleInterval);
      
      // Parse silence segments
      const silenceSegments = this.parseSilenceSegments(silenceOutput);
      
      // Calculate silence ratio
      const totalSilenceDuration = silenceSegments.reduce((sum, seg) => sum + seg.duration, 0);
      const videoDuration = rmsValues.length * sampleInterval;
      const silenceRatio = totalSilenceDuration / videoDuration;

      // Clean up temp files
      await this.cleanupTempFiles([tempAudioFile]);

      return {
        averageEnergy,
        energyPeaks,
        silenceSegments,
        rmsValues,
        totalDuration: videoDuration,
        silenceRatio
      };

    } catch (error) {
      console.error(`[${projectId}] Audio analysis failed:`, error);
      await this.cleanupTempFiles([tempAudioFile]);
      throw error;
    }
  }

  private async detectSceneChanges(videoPath: string, projectId: string): Promise<SceneChangeResult> {
    console.log(`[${projectId}] Detecting scene changes`);
    
    try {
      // Use FFmpeg's scene detection filter
      const normalizedVideoPath = this.normalizePathForFFmpeg(videoPath);
      const command = `ffmpeg -i "${normalizedVideoPath}" -vf "select='gt(scene,0.3)',showinfo" -vsync vfr -f null - 2>&1 | grep "pts_time"`;
      
      let sceneOutput = '';
      try {
        const { stdout } = await execAsyncLargeBuffer(command);
        sceneOutput = stdout;
      } catch (error) {
        // Scene detection might not find significant changes
        console.log(`[${projectId}] No significant scene changes detected`);
      }

      const sceneChanges = this.parseSceneChanges(sceneOutput);
      const totalScenes = sceneChanges.length + 1; // +1 for the initial scene
      const averageSceneLength = sceneChanges.length > 0 
        ? sceneChanges[sceneChanges.length - 1].timestamp / totalScenes 
        : 0;

      return {
        sceneChanges,
        totalScenes,
        averageSceneLength
      };

    } catch (error) {
      console.error(`[${projectId}] Scene detection failed:`, error);
      return this.getEmptySceneResult();
    }
  }

  private async generateWaveformData(videoPath: string, projectId: string): Promise<number[]> {
    console.log(`[${projectId}] Generating waveform data`);
    
    const tempWaveFile = path.join(this.tempDir, `${projectId}-waveform.wav`);
    const tempDataFile = path.join(this.tempDir, `${projectId}-waveform.dat`);

    try {
      // Extract audio at lower sample rate for waveform visualization
      const normalizedVideoPath = this.normalizePathForFFmpeg(videoPath);
      const normalizedTempWaveFile = this.normalizePathForFFmpeg(tempWaveFile);
      const normalizedTempDataFile = this.normalizePathForFFmpeg(tempDataFile);
      const audioCommand = `ffmpeg -i "${normalizedVideoPath}" -vn -acodec pcm_s16le -ar 8000 -ac 1 "${normalizedTempWaveFile}" -y`;
      await execAsyncLargeBuffer(audioCommand);

      // Generate raw audio data for waveform
      const dataCommand = `ffmpeg -i "${normalizedTempWaveFile}" -f f64le "${normalizedTempDataFile}" -y`;
      await execAsyncLargeBuffer(dataCommand);

      // Read and process the raw data
      const rawData = await fs.readFile(tempDataFile);
      const sampleCount = rawData.length / 8; // 8 bytes per f64 sample
      const waveformData: number[] = [];

      // Downsample for visualization (keep every Nth sample)
      const downsampleRate = Math.max(1, Math.floor(sampleCount / 2000)); // Target ~2000 points
      
      for (let i = 0; i < sampleCount; i += downsampleRate) {
        const sample = rawData.readDoubleLE(i * 8);
        waveformData.push(Math.abs(sample)); // Use absolute value for visualization
      }

      await this.cleanupTempFiles([tempWaveFile, tempDataFile]);
      
      return waveformData;

    } catch (error) {
      console.error(`[${projectId}] Waveform generation failed:`, error);
      await this.cleanupTempFiles([tempWaveFile, tempDataFile]);
      return [];
    }
  }

  async extractVideoChunk(
    videoPath: string,
    startTime: number,
    duration: number,
    projectId: string
  ): Promise<Buffer> {
    console.log(`[${projectId}] Extracting video chunk: ${startTime}s for ${duration}s`);
    
    const outputPath = path.join(this.tempDir, `${projectId}-chunk-${startTime}-${duration}.mp4`);

    try {
      const normalizedVideoPath = this.normalizePathForFFmpeg(videoPath);
      const normalizedOutputPath = this.normalizePathForFFmpeg(outputPath);
      const command = `ffmpeg -ss ${startTime} -i "${normalizedVideoPath}" -t ${duration} -c copy "${normalizedOutputPath}" -y`;
      await execAsyncLargeBuffer(command);
      
      const chunkData = await fs.readFile(outputPath);
      await this.cleanupTempFiles([outputPath]);
      
      return chunkData;

    } catch (error) {
      console.error(`[${projectId}] Video chunk extraction failed:`, error);
      await this.cleanupTempFiles([outputPath]);
      throw error;
    }
  }

  async extractClip(
    videoPath: string,
    startTime: number,
    endTime: number,
    outputPath: string,
    userId: string
  ): Promise<void> {
    console.log(`[${userId}] Extracting clip: ${startTime}s to ${endTime}s`);
    let localVideoPath: string | null = null;

    try {
      await this.ensureTempDir();

      // Check if videoPath is an S3 key or local path
      if (videoPath.startsWith('videos/')) {
        console.log(`[${userId}] Downloading video from S3: ${videoPath}`);
        const videoBuffer = await downloadFile(videoPath);
        
        // Create local temp file
        const videoExtension = path.extname(videoPath) || '.mp4';
        localVideoPath = path.join(this.tempDir, `${userId}-input-${Date.now()}${videoExtension}`);
        await fs.writeFile(localVideoPath, videoBuffer);
        console.log(`[${userId}] Video downloaded to: ${localVideoPath}`);
        
        // Use local path for processing
        videoPath = localVideoPath;
      }

      const duration = endTime - startTime;
      // Use precise seeking with -ss before input for efficiency and accuracy
      const normalizedVideoPath = this.normalizePathForFFmpeg(videoPath);
      const normalizedOutputPath = this.normalizePathForFFmpeg(outputPath);
      const command = `ffmpeg -ss ${startTime} -i "${normalizedVideoPath}" -t ${duration} -c copy "${normalizedOutputPath}" -y`;
      
      console.log(`[${userId}] Running FFmpeg command:`, command);
      const { stderr } = await execAsyncLargeBuffer(command);
      
      // Check if file was created successfully
      try {
        const stats = await fs.stat(outputPath);
        if (stats.size === 0) {
          throw new Error('Output file is empty');
        }
        console.log(`[${userId}] Clip extracted successfully: ${stats.size} bytes`);
      } catch (statError) {
        throw new Error('Output file was not created or is invalid');
      }

    } catch (error) {
      console.error(`[${userId}] Clip extraction failed:`, error);
      throw error;
    } finally {
      // Clean up downloaded file
      if (localVideoPath) {
        try {
          await fs.unlink(localVideoPath);
          console.log(`[${userId}] Cleaned up local video file: ${localVideoPath}`);
        } catch (cleanupError) {
          console.warn(`[${userId}] Failed to cleanup local video file:`, cleanupError);
        }
      }
    }
  }

  private parseEnergyDataFromStderr(stderr: string, sampleInterval: number): {
    rmsValues: number[];
    energyPeaks: Array<{ timestamp: number; energy: number }>;
    averageEnergy: number;
  } {
    try {
      const lines = stderr.split('\n').filter(line => line.includes('lavfi.astats.Overall.RMS_level'));
      
      const rmsValues: number[] = [];
      const energyPeaks: Array<{ timestamp: number; energy: number }> = [];
      
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/lavfi\.astats\.Overall\.RMS_level=(-?\d+\.?\d*)/);
        if (match) {
          const rmsDb = parseFloat(match[1]);
          const energyLinear = Math.pow(10, rmsDb / 20); // Convert dB to linear
          rmsValues.push(energyLinear);
          
          const timestamp = i * sampleInterval;
          
          // Identify peaks (values significantly above average)
          if (i > 2 && energyLinear > 0.1) { // Threshold for peak detection
            const recentAvg = rmsValues.slice(-5).reduce((sum, val) => sum + val, 0) / 5;
            if (energyLinear > recentAvg * 1.5) {
              energyPeaks.push({ timestamp, energy: energyLinear });
            }
          }
        }
      }
      
      const averageEnergy = rmsValues.length > 0 ? rmsValues.reduce((sum, val) => sum + val, 0) / rmsValues.length : 0;
      
      return { rmsValues, energyPeaks, averageEnergy };

    } catch (error) {
      console.error('Failed to parse energy data from stderr:', error);
      return { rmsValues: [], energyPeaks: [], averageEnergy: 0 };
    }
  }

  private async parseEnergyData(filePath: string, sampleInterval: number): Promise<{
    rmsValues: number[];
    energyPeaks: Array<{ timestamp: number; energy: number }>;
    averageEnergy: number;
  }> {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const lines = data.split('\n').filter(line => line.includes('lavfi.astats.Overall.RMS_level'));
      
      const rmsValues: number[] = [];
      const energyPeaks: Array<{ timestamp: number; energy: number }> = [];
      
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/lavfi\.astats\.Overall\.RMS_level=(-?\d+\.?\d*)/);
        if (match) {
          const rmsDb = parseFloat(match[1]);
          const energyLinear = Math.pow(10, rmsDb / 20); // Convert dB to linear
          rmsValues.push(energyLinear);
          
          const timestamp = i * sampleInterval;
          
          // Identify peaks (values significantly above average)
          if (i > 2 && energyLinear > 0.1) { // Threshold for peak detection
            const recentAvg = rmsValues.slice(-5).reduce((sum, val) => sum + val, 0) / 5;
            if (energyLinear > recentAvg * 1.5) {
              energyPeaks.push({ timestamp, energy: energyLinear });
            }
          }
        }
      }
      
      const averageEnergy = rmsValues.reduce((sum, val) => sum + val, 0) / rmsValues.length;
      
      return { rmsValues, energyPeaks, averageEnergy };

    } catch (error) {
      console.error('Failed to parse energy data:', error);
      return { rmsValues: [], energyPeaks: [], averageEnergy: 0 };
    }
  }

  private parseSilenceSegments(silenceOutput: string): Array<{ start: number; end: number; duration: number }> {
    const segments: Array<{ start: number; end: number; duration: number }> = [];
    const lines = silenceOutput.split('\n');
    
    let currentStart: number | null = null;
    
    for (const line of lines) {
      const startMatch = line.match(/silence_start: (\d+\.?\d*)/);
      const endMatch = line.match(/silence_end: (\d+\.?\d*)/);
      
      if (startMatch) {
        currentStart = parseFloat(startMatch[1]);
      }
      
      if (endMatch && currentStart !== null) {
        const end = parseFloat(endMatch[1]);
        const duration = end - currentStart;
        segments.push({ start: currentStart, end, duration });
        currentStart = null;
      }
    }
    
    return segments;
  }

  private parseSceneChanges(sceneOutput: string): Array<{ timestamp: number; score: number }> {
    const changes: Array<{ timestamp: number; score: number }> = [];
    const lines = sceneOutput.split('\n');
    
    for (const line of lines) {
      const match = line.match(/pts_time:(\d+\.?\d*)/);
      if (match) {
        const timestamp = parseFloat(match[1]);
        changes.push({ timestamp, score: 1.0 }); // Score is not available from basic detection
      }
    }
    
    return changes;
  }

  private getEmptySceneResult(): SceneChangeResult {
    return {
      sceneChanges: [],
      totalScenes: 1,
      averageSceneLength: 0
    };
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // File might not exist or already deleted
        console.log(`Could not delete temp file ${filePath}:`, error);
      }
    }
  }

  async validateFFmpegInstallation(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');
      await execAsync('ffprobe -version');
      return true;
    } catch (error) {
      console.error('FFmpeg not found or not working properly:', error);
      return false;
    }
  }

  async getOptimalChunkSize(videoDuration: number, targetChunks: number = 10): Promise<number> {
    // Calculate optimal chunk size (in seconds) for Gemini processing
    const baseChunkSize = 120; // 2 minutes
    const calculatedSize = Math.max(60, Math.min(300, videoDuration / targetChunks)); // Between 1-5 minutes
    
    return Math.round(calculatedSize);
  }
}

export const ffmpegPreprocessing = new FFmpegPreprocessingService();