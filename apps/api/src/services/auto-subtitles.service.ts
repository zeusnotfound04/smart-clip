import ffmpeg from 'fluent-ffmpeg';
import { SpeechClient } from '@google-cloud/speech';
import { downloadFile, uploadFile, downloadFileToPath } from '../lib/s3';
import { readFileSync, unlinkSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { readFile, unlink, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const prisma = new PrismaClient();

export interface SubtitleSegment {
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  language?: string;
  words?: Array<{
    word: string;
    startTime: number;
    endTime: number;
    confidence: number;
  }>;
  rawTranscript?: string;
}

export interface SubtitleStyle {
  textCase: 'normal' | 'uppercase' | 'lowercase' | 'capitalize';
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  outlineColor: string;
  shadowColor: string;
  bold: boolean;
  italic: boolean;
  alignment: 'left' | 'center' | 'right';
  showShadow: boolean;
  maxWordsPerLine?: number; // Max words per subtitle line (default: 8, TikTok style: 3)
  position?: { x: number; y: number }; // Custom position offset from center
  scale?: number; // Scale multiplier for font size
  useGradient?: boolean;
  gradientType?: 'linear' | 'radial';
  gradientColors?: string[]; // Array of colors for gradient (2+ colors)
  gradientDirection?: number; // Angle in degrees for linear gradient (0-360)
  shadowIntensity?: number; // 1-10 for multi-layer shadow depth
  shadowOffsetX?: number; // Horizontal shadow offset
  shadowOffsetY?: number; // Vertical shadow offset
}

export interface SubtitleOptions {
  detectAllLanguages?: boolean;
  language?: string;
  style?: SubtitleStyle;
  onProgress?: (progress: number) => Promise<void>;
}

export interface VideoWithSubtitlesResult {
  success: boolean;
  videoId: string;
  subtitledVideoUrl: string;
  srtContent: string;
  segments: SubtitleSegment[];
  detectedLanguages: string[];
  srtS3Key?: string;
  audioS3Key?: string;
}

if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
  console.error('GOOGLE_CLOUD_PROJECT_ID is not configured');
}
if (!process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
  console.error('GOOGLE_CLOUD_CLIENT_EMAIL is not configured');
}
if (!process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
  console.error('GOOGLE_CLOUD_PRIVATE_KEY is not configured');
}

const speechClient = new SpeechClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }
});

const tempDir = tmpdir();

if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

// ===========================
// ===========================

/**
 * Check if Inkscape or rsvg-convert is available
 */
async function getSVGRasterizer(): Promise<'inkscape' | 'rsvg' | null> {
  if (process.platform === 'win32') {
    const inkscapePath = 'C:\\Program Files\\Inkscape\\bin';
    if (!process.env.PATH?.includes(inkscapePath)) {
      process.env.PATH = `${process.env.PATH};${inkscapePath}`;
      console.log(`[SVG_GRADIENT] Added Inkscape to PATH: ${inkscapePath}`);
    }
  }
  
  try {
    await execAsync('inkscape --version');
    return 'inkscape';
  } catch {
    try {
      await execAsync('rsvg-convert --version');
      return 'rsvg';
    } catch {
      return null;
    }
  }
}

/**
 * Generate SVG mask for text (white text on transparent background)
 */
function generateTextMaskSVG(
  text: string,
  fontFamily: string,
  fontSize: number,
  bold: boolean,
  italic: boolean,
  width: number,
  height: number
): string {
  const fontWeight = bold ? '700' : '400';
  const fontStyle = italic ? 'italic' : 'normal';
  
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    text {
      font-family: '${fontFamily}', sans-serif;
      font-weight: ${fontWeight};
      font-style: ${fontStyle};
      font-size: ${fontSize}px;
      text-anchor: middle;
      dominant-baseline: central;
      fill: #ffffff;
    }
  </style>
  <text x="50%" y="50%">${escapedText}</text>
</svg>`;
}

/**
 * Rasterize SVG to PNG using available tool
 */
async function rasterizeSVG(
  svgPath: string,
  outputPath: string,
  width: number,
  height: number,
  rasterizer: 'inkscape' | 'rsvg'
): Promise<void> {
  if (rasterizer === 'inkscape') {
    await execAsync(
      `inkscape "${svgPath}" --export-filename="${outputPath}" --export-width=${width} --export-height=${height}`
    );
  } else {
    await execAsync(
      `rsvg-convert -w ${width} -h ${height} "${svgPath}" -o "${outputPath}"`
    );
  }
}

/**
 * Save gradient SVG to file (or copy red-storm.svg)
 */
async function prepareGradientImage(
  videoId: string,
  gradientColors: string[],
  width: number,
  height: number
): Promise<string> {
  const gradientPath = join(tempDir, `${videoId}_gradient.png`);
  
  const redStormPath = join(process.cwd(), 'red-storm.svg');
  
  if (existsSync(redStormPath)) {
    console.log('[GRADIENT] Using red-storm.svg');
    const rasterizer = await getSVGRasterizer();
    if (!rasterizer) {
      throw new Error('SVG rasterizer (Inkscape or rsvg-convert) not found');
    }
    await rasterizeSVG(redStormPath, gradientPath, width, height, rasterizer);
    return gradientPath;
  }
  
  console.log(`[GRADIENT] Generating gradient with ${gradientColors.length} colors`);
  if (gradientColors.length === 2) {
    await execAsync(
      `convert -size ${width}x${height} gradient:"${gradientColors[0]}"-"${gradientColors[1]}" "${gradientPath}"`
    );
  } else {
    const gradSvgPath = join(tempDir, `${videoId}_grad.svg`);
    const stops = gradientColors.map((color, i) => 
      `<stop offset="${i / (gradientColors.length - 1)}" stop-color="${color}"/>`
    ).join('\n      ');
    
    const gradSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      ${stops}
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad)"/>
</svg>`;
    
    writeFileSync(gradSvgPath, gradSvg, 'utf8');
    const rasterizer = await getSVGRasterizer();
    if (!rasterizer) {
      throw new Error('SVG rasterizer (Inkscape or rsvg-convert) not found');
    }
    await rasterizeSVG(gradSvgPath, gradientPath, width, height, rasterizer);
    unlinkSync(gradSvgPath);
  }
  
  return gradientPath;
}

/**
 * Parse SRT content back into segments (for SVG rendering)
 */
function parseSRTContent(srtContent: string): SubtitleSegment[] {
  const segments: SubtitleSegment[] = [];
  const blocks = srtContent.trim().split('\n\n');
  
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 3) continue;
    
    const timeLine = lines[1];
    const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!timeMatch) continue;
    
    const startTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
    const endTime = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
    const text = lines.slice(2).join(' ');
    
    segments.push({
      text,
      startTime,
      endTime,
      confidence: 1.0
    });
  }
  
  return segments;
}


console.log(`\ud83d\udccf [AUTO-SUBTITLES] Temp directory: ${tempDir}`);

const getFontPath = (fontFolder: string, fontFile: string): string => {
  const localPath = join(process.cwd(), 'fonts', fontFolder, fontFile);
  if (existsSync(localPath)) {
    console.log(`\ud83d\udc4d [FONT] Using local font: ${localPath}`);
    return localPath;
  }
  
  const webPath = join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', fontFolder, fontFile);
  if (existsSync(webPath)) {
    console.log(`\ud83d\udc4d [FONT] Using web font: ${webPath}`);
    return webPath;
  }
  
  console.warn(`\u26a0\ufe0f  [FONT] Font file not found: ${fontFile} in ${fontFolder}`);
  return webPath; // Return web path as fallback
};

const FONT_FILE_MAP: Record<string, { regular: string; bold?: string }> = {
  'Bangers': {
    regular: getFontPath('Bangers', 'Bangers-Regular.ttf')
  },
  'Anton': {
    regular: getFontPath('Anton', 'Anton-Regular.ttf')
  },
  'Montserrat': {
    regular: getFontPath('Montserrat', 'Montserrat-Regular.ttf'),
    bold: getFontPath('Montserrat', 'Montserrat-Bold.ttf')
  },
  'Montserrat Medium': {
    regular: getFontPath('Montserrat', 'Montserrat-Medium.ttf'),
    bold: getFontPath('Montserrat', 'Montserrat-SemiBold.ttf')
  },
  'Montserrat SemiBold': {
    regular: getFontPath('Montserrat', 'Montserrat-SemiBold.ttf'),
    bold: getFontPath('Montserrat', 'Montserrat-Bold.ttf')
  },
  'Montserrat Bold': {
    regular: getFontPath('Montserrat', 'Montserrat-Bold.ttf'),
    bold: getFontPath('Montserrat', 'Montserrat-ExtraBold.ttf')
  },
  'Montserrat ExtraBold': {
    regular: getFontPath('Montserrat', 'Montserrat-ExtraBold.ttf'),
    bold: getFontPath('Montserrat', 'Montserrat-Black.ttf')
  },
  'Montserrat Black': {
    regular: getFontPath('Montserrat', 'Montserrat-Black.ttf'),
    bold: getFontPath('Montserrat', 'Montserrat-Black.ttf')
  },
  'Rubik': {
    regular: getFontPath('Rubik', 'Rubik-Regular.ttf'),
    bold: getFontPath('Rubik', 'Rubik-Black.ttf')
  },
  'Gabarito': {
    regular: getFontPath('Gabarito', 'Gabarito-Regular.ttf'),
    bold: getFontPath('Gabarito', 'Gabarito-Black.ttf')
  },
  'Poppins': {
    regular: getFontPath('Poppins', 'Poppins-Regular.ttf'),
    bold: getFontPath('Poppins', 'Poppins-Black.ttf')
  },
  'Poppins Thin': {
    regular: getFontPath('Poppins', 'Poppins-Thin.ttf'),
    bold: getFontPath('Poppins', 'Poppins-Light.ttf')
  },
  'Roboto': {
    regular: getFontPath('Roboto', 'Roboto-Regular.ttf'),
    bold: getFontPath('Roboto', 'Roboto-Black.ttf')
  },
  'DM Serif Display': {
    regular: getFontPath('DM_Serif_Display', 'DMSerifDisplay-Regular.ttf')
  },
  'Fira Sans Condensed': {
    regular: getFontPath('Fira_Sans_Condensed', 'FiraSansCondensed-Regular.ttf'),
    bold: getFontPath('Fira_Sans_Condensed', 'FiraSansCondensed-Black.ttf')
  },
  'Teko': {
    regular: getFontPath('Teko', 'Teko-Regular.ttf'),
    bold: getFontPath('Teko', 'Teko-Bold.ttf')
  },
  'TikTok Sans': {
    regular: getFontPath('TikTok_Sans', 'TikTokSans-Regular.ttf'),
    bold: getFontPath('TikTok_Sans', 'TikTokSans-Bold.ttf')
  },
  'TikTok Sans Medium': {
    regular: getFontPath('TikTok_Sans', 'TikTokSans-Medium.ttf'),
    bold: getFontPath('TikTok_Sans', 'TikTokSans-SemiBold.ttf')
  },
  'Arial': {
    regular: 'Arial' // System font fallback
  }
};

const getFontFilePath = (fontFamily: string, bold: boolean = false): string => {
  const fontConfig = FONT_FILE_MAP[fontFamily] || FONT_FILE_MAP['Arial'];
  const fontPath = bold && fontConfig.bold ? fontConfig.bold : fontConfig.regular;
  
  if (fontPath === fontFamily) {
    return fontFamily;
  }
  
  if (existsSync(fontPath)) {
    console.log(`Font found: ${fontFamily} -> ${fontPath}`);
    return fontPath;
  }
  
  console.warn(`Font not found: ${fontPath}, falling back to Arial`);
  return 'Arial';
};

const validateFFmpeg = (): Promise<boolean> => {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err);
    });
  });
};

const downloadVideoFromS3 = async (s3Key: string, videoId: string): Promise<string> => {
  const videoPath = join(tempDir, `${randomUUID()}_input.mp4`);
  await downloadFileToPath(s3Key, videoPath);
  return videoPath;
};

const getVideoDuration = async (videoPath: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const duration = metadata.format.duration || 0;
        resolve(Math.ceil(duration)); // Round up to nearest second
      }
    });
  });
};

const extractAudioFromVideo = async (videoPath: string, videoId: string): Promise<{ audioPath: string; s3Key: string }> => {
  let localVideoPath: string | null = null;
  let audioPath: string | null = null;

  try {
    if (videoPath.startsWith('videos/')) {
      console.log(`[AUDIO_EXTRACT] Streaming video from S3: ${videoPath}`);
      
      const videoExtension = videoPath.split('.').pop() || 'mp4';
      localVideoPath = join(tempDir, `${randomUUID()}_input.${videoExtension}`);
      await downloadFileToPath(videoPath, localVideoPath);
      console.log(`[AUDIO_EXTRACT] Video streamed to: ${localVideoPath}`);
      
      videoPath = localVideoPath;
    }

    return new Promise((resolve, reject) => {
      audioPath = join(tempDir, `${randomUUID()}_audio.wav`);
      
      console.log(`\ud83c\udfb5 [AUDIO_EXTRACT] Extracting audio to: ${audioPath}`);
      console.log(`\ud83c\udfb5 [AUDIO_EXTRACT] From video: ${videoPath}`);
      
      ffmpeg(videoPath)
        .toFormat('wav')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', async () => {
          try {
            if (!existsSync(audioPath!)) {
              throw new Error(`Audio file was not created: ${audioPath}`);
            }
            
            const audioBuffer = readFileSync(audioPath!);
            const audioS3Key = `audio/${videoId}_extracted.wav`;
            await uploadFile(audioS3Key, audioBuffer, 'audio/wav');
            
            console.log(`\u2705 [AUDIO_EXTRACT] Audio uploaded to S3: ${audioS3Key}`);
            console.log(`\ud83d\udcbe [AUDIO_EXTRACT] Local audio file retained for transcription: ${audioPath}`);
            
            if (localVideoPath && existsSync(localVideoPath)) {
              unlinkSync(localVideoPath);
              console.log(`\ud83e\uddf9 [AUDIO_EXTRACT] Cleaned up video temp file: ${localVideoPath}`);
            }
            
            resolve({ audioPath: audioPath!, s3Key: audioS3Key });
          } catch (uploadError: any) {
            if (audioPath && existsSync(audioPath)) {
              unlinkSync(audioPath);
            }
            if (localVideoPath && existsSync(localVideoPath)) {
              unlinkSync(localVideoPath);
            }
            reject(new Error(`Audio upload failed: ${uploadError.message}`));
          }
        })
        .on('error', (err) => {
          console.error(`\u274c [AUDIO_EXTRACT] FFmpeg error:`, err);
          if (audioPath && existsSync(audioPath)) {
            unlinkSync(audioPath);
          }
          if (localVideoPath && existsSync(localVideoPath)) {
            unlinkSync(localVideoPath);
          }
          reject(new Error(`Audio extraction failed: ${err.message}`));
        })
        .save(audioPath);
    });
  } catch (error: any) {
    if (audioPath && existsSync(audioPath)) {
      unlinkSync(audioPath);
    }
    if (localVideoPath && existsSync(localVideoPath)) {
      unlinkSync(localVideoPath);
    }
    throw new Error(`Audio extraction setup failed: ${error.message}`);
  }
};

const splitAudioIntoChunks = (audioPath: string, chunkDurationSeconds: number = 30): Promise<string[]> => {
  const chunkPaths: string[] = [];
  const baseFileName = audioPath.replace('.wav', '');
  let chunkIndex = 0;
  
  return new Promise<string[]>((resolve, reject) => {
    const getAudioDuration = (): Promise<number> => {
      return new Promise((res, rej) => {
        ffmpeg.ffprobe(audioPath, (err, metadata) => {
          if (err) rej(err);
          else res(metadata.format.duration || 0);
        });
      });
    };

    getAudioDuration().then(duration => {
      if (duration <= chunkDurationSeconds) {
        resolve([audioPath]);
        return;
      }

      console.log(`Splitting ${duration.toFixed(2)}s audio into ${Math.ceil(duration / chunkDurationSeconds)} chunks`);
      
      const processChunk = (startTime: number) => {
        if (startTime >= duration) {
          resolve(chunkPaths);
          return;
        }

        const chunkPath = `${baseFileName}_chunk${chunkIndex}.wav`;
        chunkPaths.push(chunkPath);
        
        ffmpeg(audioPath)
          .setStartTime(startTime)
          .setDuration(chunkDurationSeconds)
          .toFormat('wav')
          .audioChannels(1)
          .audioFrequency(16000)
          .on('end', () => {
            console.log(`Chunk ${chunkIndex} created: ${chunkPath}`);
            chunkIndex++;
            processChunk(startTime + chunkDurationSeconds);
          })
          .on('error', (err) => {
            reject(new Error(`Failed to create chunk: ${err.message}`));
          })
          .save(chunkPath);
      };

      processChunk(0);
    }).catch(reject);
  });
};

const transcribeAudioChunk = async (audioPath: string, config: any, timeOffset: number = 0): Promise<any[]> => {
  const audioBuffer = await readFile(audioPath);
  const request = {
    audio: { content: audioBuffer.toString('base64') },
    config
  };
  
  try {
    const [response] = await speechClient.recognize(request);
    const results = response.results || [];
    
    if (!results || results.length === 0) {
      console.warn('No results in response:', JSON.stringify(response, null, 2).substring(0, 500));
    }
    
    return processChunkResults(results, timeOffset);
  } catch (error: any) {
    console.error('Speech API Error:', error.message);
    if (error.code) {
      console.error('   Error Code:', error.code);
    }
    if (error.details) {
      console.error('   Details:', error.details);
    }
    throw error;
  }
};

const processChunkResults = (results: any[], timeOffset: number): any[] => {
  const processedResults = results || [];
  
  if (processedResults.length > 0) {
    processedResults.forEach((result: any) => {
      if (result.alternatives?.[0]?.words) {
        result.alternatives[0].words.forEach((word: any) => {
          if (word.startTime) {
            const startSeconds = parseFloat(String(word.startTime.seconds || '0'));
            const startNanos = parseFloat(String(word.startTime.nanos || '0'));
            const totalStartSeconds = startSeconds + (startNanos / 1000000000) + timeOffset;
            word.startTime = {
              seconds: String(Math.floor(totalStartSeconds)),
              nanos: String(Math.floor((totalStartSeconds % 1) * 1000000000))
            };
          }
          if (word.endTime) {
            const endSeconds = parseFloat(String(word.endTime.seconds || '0'));
            const endNanos = parseFloat(String(word.endTime.nanos || '0'));
            const totalEndSeconds = endSeconds + (endNanos / 1000000000) + timeOffset;
            word.endTime = {
              seconds: String(Math.floor(totalEndSeconds)),
              nanos: String(Math.floor((totalEndSeconds % 1) * 1000000000))
            };
          }
        });
      }
    });
  }
  
  return processedResults;
};

const transcribeAudio = async (audioPath: string, options?: SubtitleOptions, audioS3Key?: string): Promise<{ results: any[], detectedLanguages: string[] }> => {
  const audioSizeInBytes = statSync(audioPath).size;
  const audioDurationEstimate = audioSizeInBytes / (16000 * 2);
  
  console.log(`Audio file size: ${(audioSizeInBytes / 1024 / 1024).toFixed(2)}MB, estimated duration: ${audioDurationEstimate.toFixed(2)}s`);
  
  const languageConfigs = [
    {
      languageCode: 'en-US',
      alternativeLanguageCodes: ['en-GB', 'en-AU', 'en-IN'],
      phrases: ['video', 'content', 'today', 'make', 'how'],
      priority: 1
    },
    {
      languageCode: 'hi-IN',
      alternativeLanguageCodes: ['en-IN'],
      phrases: ['aaj', 'video', 'content', 'करना', 'कैसे'],
      priority: 1
    },
    {
      languageCode: 'es-ES',
      alternativeLanguageCodes: ['es-US', 'es-MX'],
      phrases: ['video', 'contenido', 'hoy', 'hacer'],
      priority: 2
    },
    {
      languageCode: 'fr-FR',
      alternativeLanguageCodes: ['fr-CA'],
      phrases: ['vidéo', 'contenu', 'aujourd\'hui', 'faire'],
      priority: 2
    },
    {
      languageCode: 'de-DE',
      alternativeLanguageCodes: [],
      phrases: ['video', 'inhalt', 'heute', 'machen'],
      priority: 2
    },
    {
      languageCode: 'pt-BR',
      alternativeLanguageCodes: ['pt-PT'],
      phrases: ['vídeo', 'conteúdo', 'hoje', 'fazer'],
      priority: 2
    },
    {
      languageCode: 'ja-JP',
      alternativeLanguageCodes: [],
      phrases: ['ビデオ', '動画', 'コンテンツ', '今日'],
      priority: 3
    },
    {
      languageCode: 'ko-KR',
      alternativeLanguageCodes: [],
      phrases: ['비디오', '영상', '콘텐츠', '오늘'],
      priority: 3
    },
    {
      languageCode: 'ar-SA',
      alternativeLanguageCodes: ['ar-AE'],
      phrases: ['فيديو', 'محتوى', 'اليوم', 'كيف'],
      priority: 3
    },
    {
      languageCode: 'ru-RU',
      alternativeLanguageCodes: [],
      phrases: ['видео', 'контент', 'сегодня', 'как'],
      priority: 3
    },
    {
      languageCode: 'it-IT',
      alternativeLanguageCodes: [],
      phrases: ['video', 'contenuto', 'oggi', 'come'],
      priority: 3
    },
    {
      languageCode: 'nl-NL',
      alternativeLanguageCodes: ['nl-BE'],
      phrases: ['video', 'inhoud', 'vandaag', 'hoe'],
      priority: 3
    },
    {
      languageCode: 'tr-TR',
      alternativeLanguageCodes: [],
      phrases: ['video', 'içerik', 'bugün', 'nasıl'],
      priority: 3
    },
    {
      languageCode: 'zh-Hans',
      alternativeLanguageCodes: [],
      phrases: ['视频', '内容', '今天', '怎么'],
      priority: 3
    },
    {
      languageCode: 'id-ID',
      alternativeLanguageCodes: [],
      phrases: ['video', 'konten', 'hari', 'bagaimana'],
      priority: 3
    }
  ];

  const allResults: any[] = [];
  const detectedLanguages: string[] = [];
  let bestResult = null;
  let bestConfidence = 0;

  const chunkDurationSeconds = 30;
  const chunkPaths = await splitAudioIntoChunks(audioPath, chunkDurationSeconds);
  const isChunked = chunkPaths.length > 1;
  
  if (isChunked) {
    console.log(`Processing ${chunkPaths.length} audio chunks`);
  }

  const configsToTest = options?.language 
    ? languageConfigs.filter(c => c.languageCode === options.language)
    : languageConfigs.sort((a, b) => (a.priority || 999) - (b.priority || 999));

  if (options?.language) {
    console.log(`Using specified language: ${options.language} (skipping detection for 10-30s speed boost)`);
  } else {
    console.log(`Auto-detecting language (will stop at first good match)...`);
  }

  try {
    for (const config of configsToTest) {
      try {
        const requestConfig = {
          encoding: 'LINEAR16' as const,
          sampleRateHertz: 16000,
          languageCode: config.languageCode,
          enableWordTimeOffsets: true,
          enableAutomaticPunctuation: true,
          model: 'latest_long',
          useEnhanced: true,
          speechContexts: [{
            phrases: config.phrases
          }],
          profanityFilter: false,
          alternativeLanguageCodes: config.alternativeLanguageCodes
        };

        console.log(`Testing ${config.languageCode}...`);
        
        const allChunkResults: any[] = [];
        let successfulChunks = 0;
        
        const chunkPromises = chunkPaths.map((chunkPath, i) => 
          transcribeAudioChunk(chunkPath, requestConfig, i * chunkDurationSeconds)
            .then(results => ({ success: true, results, index: i }))
            .catch(error => ({ success: false, error, index: i }))
        );
        
        const chunkResults = await Promise.all(chunkPromises);
        
        for (const result of chunkResults) {
          if (result.success) {
            const successResult = result as { success: true; results: any[]; index: number };
            if (successResult.results.length > 0) {
              allChunkResults.push(...successResult.results);
              successfulChunks++;
              console.log(`   Chunk ${successResult.index + 1}/${chunkPaths.length}: ${successResult.results.length} segments`);
            } else {
              console.warn(`   Chunk ${successResult.index + 1}/${chunkPaths.length}: No results`);
            }
          } else {
            const errorResult = result as { success: false; error: any; index: number };
            console.warn(`   Chunk ${errorResult.index + 1}/${chunkPaths.length} failed: ${errorResult.error.message}`);
          }
        }
        
        const results = allChunkResults;
        
        if (results.length > 0) {
          let totalConfidence = 0;
          let confidenceCount = 0;
          results.forEach((result: any) => {
            const conf = result.alternatives?.[0]?.confidence;
            if (conf !== undefined && conf !== null) {
              totalConfidence += conf;
              confidenceCount++;
            }
          });
          const confidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;
          
          const transcriptPreview = results[0].alternatives?.[0]?.transcript?.substring(0, 50) || '';
          console.log(`${config.languageCode}: ${results.length} segments (${successfulChunks}/${chunkPaths.length} chunks), ${(confidence * 100).toFixed(0)}% avg confidence - "${transcriptPreview}..."`);
          
          
          if (confidence > 0.3) {
            detectedLanguages.push(config.languageCode);
            
            if (options?.detectAllLanguages) {
              results.forEach((result: any) => {
                if (result.alternatives?.[0]) {
                  (result.alternatives[0] as any).detectedLanguage = config.languageCode;
                }
              });
              allResults.push(...results);
            }
          }
          
          if (confidence > bestConfidence) {
            bestConfidence = confidence;
            bestResult = {
              results,
              languageUsed: config.languageCode,
              confidence,
              transcript: results.map((r: any) => r.alternatives?.[0]?.transcript || '').join(' ')
            };
          }

          if (confidence > 0.7 && !options?.detectAllLanguages && !options?.language) {
            console.log(`High confidence (${(confidence * 100).toFixed(0)}%) - stopping search`);
            break;
          }
        } else {
          console.log(`${config.languageCode}: No transcription`);
        }
      } catch (error: any) {
        console.warn(`${config.languageCode}: ${error.message}`);
      }
    }
  } finally {
    const cleanupPromises = chunkPaths
      .filter(chunkPath => chunkPath !== audioPath && existsSync(chunkPath))
      .map(chunkPath => unlink(chunkPath).catch(() => {}));
    
    await Promise.all(cleanupPromises);
    
    if (cleanupPromises.length > 0) {
      console.log(`Cleaned up ${cleanupPromises.length} temporary chunk files`);
    }
  }

  if (bestResult) {
    console.log(`\nSelected: ${bestResult.languageUsed} (${(bestResult.confidence * 100).toFixed(0)}% confidence)`);
  } else {
    console.error('Failed to generate subtitles: No transcription results from any language');
    throw new Error('Failed to generate subtitles: Audio could not be transcribed in any supported language. Please ensure the audio is clear and contains speech.');
  }

  const finalResults = options?.detectAllLanguages && allResults.length > 0 ? allResults : bestResult.results;
  return { results: finalResults, detectedLanguages };
};

const processTranscriptionToSegments = (results: any[], options?: SubtitleOptions): SubtitleSegment[] => {
  const segments: SubtitleSegment[] = [];
  
  const applyTextCase = (text: string, caseType: string): string => {
    switch (caseType) {
      case 'uppercase': return text.toUpperCase();
      case 'lowercase': return text.toLowerCase();
      case 'capitalize': return text.replace(/\b\w/g, l => l.toUpperCase());
      default: return text;
    }
  };

  results.forEach((result: any, resultIndex: number) => {
    if (result.alternatives && result.alternatives[0]) {
      const alternative = result.alternatives[0];
      const words = alternative.words || [];
      
      if (words.length > 0) {
        let currentSegment = '';
        let currentWords: any[] = [];
        let startTime = 0;
        let wordCount = 0;
        
        const maxWords = options?.style?.maxWordsPerLine || 8;
        
        words.forEach((word: any, index: number) => {
          if (wordCount === 0) {
            startTime = parseFloat(String(word.startTime?.seconds || '0')) + 
                       parseFloat(String(word.startTime?.nanos || '0')) / 1000000000;
          }
          
          const wordStartTime = parseFloat(String(word.startTime?.seconds || '0')) + 
                               parseFloat(String(word.startTime?.nanos || '0')) / 1000000000;
          const wordEndTime = parseFloat(String(word.endTime?.seconds || '0')) + 
                             parseFloat(String(word.endTime?.nanos || '0')) / 1000000000;
          
          currentSegment += word.word + ' ';
          currentWords.push({
            word: word.word,
            startTime: wordStartTime,
            endTime: wordEndTime,
            confidence: word.confidence || 0
          });
          wordCount++;
          
          if (wordCount >= maxWords || index === words.length - 1) {
            const endTime = parseFloat(String(word.endTime?.seconds || '0')) + 
                           parseFloat(String(word.endTime?.nanos || '0')) / 1000000000;
            
            const processedText = options?.style ? applyTextCase(currentSegment.trim(), options.style.textCase) : currentSegment.trim();
            
            const segment: SubtitleSegment = {
              text: processedText,
              startTime,
              endTime,
              confidence: alternative.confidence || 0,
              language: (alternative as any).detectedLanguage || 'unknown',
              words: [...currentWords],
              rawTranscript: alternative.transcript
            };
            
            segments.push(segment);
            
            currentSegment = '';
            currentWords = [];
            wordCount = 0;
          }
        });
      }
    }
  });
  
  if (segments.length === 0) {
    throw new Error('Failed to process transcription: No valid subtitle segments were generated. The audio may not contain recognizable speech or word timestamps are missing.');
  }
  
  return segments;
};

const saveSubtitlesToDatabase = async (videoId: string, segments: SubtitleSegment[]) => {
  try {
    await prisma.subtitle.deleteMany({
      where: { videoId }
    });
    
    const subtitleData = segments.map((segment: any) => ({
      videoId,
      text: segment.text,
      startTime: segment.startTime,
      endTime: segment.endTime,
      confidence: segment.confidence,
      speaker: null
    }));
    
    await prisma.subtitle.createMany({
      data: subtitleData
    });
  } catch (error) {
    console.error('Failed to save subtitles to database:', error);
  }
};

export const generateVideoWithSubtitles = async (videoId: string, s3Key: string, userId: string, options?: SubtitleOptions): Promise<VideoWithSubtitlesResult> => {
  let videoPath: string | null = null;
  let audioPath: string | null = null;
  let subtitledVideoPath: string | null = null;
  
  try {
    const ffmpegValid = await validateFFmpeg();
    if (!ffmpegValid) {
      throw new Error('FFmpeg is not properly installed or configured');
    }
    
    videoPath = await downloadVideoFromS3(s3Key, videoId);
    
    const videoDuration = await getVideoDuration(videoPath);
    console.log(`[AUTO-SUBTITLES] Video duration: ${videoDuration}s`);
    
    const { CreditService } = await import('./credit.service');
    
    const validation = await CreditService.validateAndPrepareProcessing(
      userId,
      videoDuration,
      'Auto-Subtitles'
    );
    
    if (!validation.canProcess) {
      throw new Error(validation.message || 'Insufficient credits');
    }
    
    console.log(`[CREDITS] User has sufficient credits (${validation.currentCredits}/${validation.creditsRequired})`);
    console.log(`[WATERMARK] Will apply watermark: ${validation.shouldWatermark ? 'Yes' : 'No'}`);
    
    const audioResult = await extractAudioFromVideo(videoPath, videoId);
    audioPath = audioResult.audioPath;
    
    console.log(`\ud83c\udfb5 [AUTO-SUBTITLES] Audio extracted successfully: ${audioPath}`);
    console.log(`\ud83c\udfb5 [AUTO-SUBTITLES] Starting transcription...`);
    
    const { results: transcriptionResults, detectedLanguages } = await transcribeAudio(audioPath, options, audioResult.s3Key);
    const segments = processTranscriptionToSegments(transcriptionResults, options);
    const srtContent = generateSRT(segments, options);
    
    await saveSubtitlesToDatabase(videoId, segments);
    
    if (audioPath && existsSync(audioPath)) {
      unlinkSync(audioPath);
      console.log(`\ud83e\uddf9 [AUTO-SUBTITLES] Cleaned up audio temp file: ${audioPath}`);
    }
    
    const burnResult = await burnSubtitlesIntoVideo(videoPath, srtContent, videoId, userId, options);
    subtitledVideoPath = burnResult.videoPath;
    
    const subtitledVideoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${burnResult.videoS3Key}`;
    
    try {
      await CreditService.deductCredits(
        userId,
        validation.creditsRequired,
        `Auto-Subtitles: ${Math.floor(videoDuration)}s video`,
        {
          videoId,
          feature: 'auto-subtitles',
          videoDuration,
          creditsUsed: validation.creditsRequired,
        }
      );
      console.log(`[CREDITS] Successfully deducted ${validation.creditsRequired} credits`);
    } catch (creditError) {
      console.error('[CREDITS] Failed to deduct credits:', creditError);
    }
    
    return {
      success: true,
      videoId,
      subtitledVideoUrl,
      srtContent,
      segments,
      detectedLanguages,
      srtS3Key: burnResult.srtS3Key,
      audioS3Key: audioResult.s3Key
    };
  } catch (error: any) {
    const tempFiles = [videoPath, audioPath, subtitledVideoPath];
    
    try {
      const { readdirSync } = await import('fs');
      const currentDirContents = readdirSync(process.cwd());
      currentDirContents
        .filter((file: string) => file.startsWith('out_') && file.endsWith('.mp4'))
        .forEach((file: string) => {
          tempFiles.push(join(process.cwd(), file));
        });
    } catch (e) {
      console.warn('Could not read current directory for cleanup:', e);
    }

    try {
      const { readdirSync } = await import('fs');
      const tempDirContents = readdirSync(tempDir);
      tempDirContents
        .filter((file: string) => file.includes(videoId.substring(0, 8)) || file.includes('smart-clip'))
        .forEach((file: string) => {
          tempFiles.push(join(tempDir, file));
        });
    } catch (e) {
      console.warn('Could not read temp directory for cleanup:', e);
    }
    
    tempFiles.forEach(filePath => {
      if (filePath && existsSync(filePath)) {
        try {
          const stats = statSync(filePath);
          if (stats.isDirectory()) {
            return;
          }
          unlinkSync(filePath);
        } catch (e) { 
          console.warn('Failed to cleanup file:', filePath, e); 
        }
      }
    });
    
    throw new Error(`Subtitle generation failed: ${error.message}`);
  }
};

/**
 * Render gradient text using SVG + FFmpeg alphamerge pipeline
 * This produces TRUE smooth gradients (not blur tricks)
 */
async function renderGradientTextOverlay(
  videoPath: string,
  segments: SubtitleSegment[],
  videoId: string,
  style: SubtitleStyle,
  videoWidth: number,
  videoHeight: number
): Promise<string> {
  console.log('[SVG_GRADIENT] Starting true gradient text rendering pipeline');
  
  const rasterizer = await getSVGRasterizer();
  if (!rasterizer) {
    console.warn('[SVG_GRADIENT] No SVG rasterizer found (Inkscape/rsvg-convert). Falling back to ASS rendering.');
    throw new Error('No SVG rasterizer available - will use ASS fallback');
  }
  
  console.log(`[SVG_GRADIENT] Using ${rasterizer} for rasterization`);
  
  const renderWidth = videoWidth * 2;
  const renderHeight = videoHeight * 2;
  const scaledFontSize = Math.round((style.fontSize * 2.5) * 2); // Scale for high-res
  
  const gradientPath = await prepareGradientImage(
    videoId,
    style.gradientColors || ['#FFFFFF', '#FF6B6B', '#C41E3A'],
    renderWidth,
    renderHeight
  );
  
  console.log(`[SVG_GRADIENT] Gradient image ready: ${gradientPath}`);
  
  const textMasks: Array<{ start: number; end: number; maskPath: string }> = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const maskSvgPath = join(tempDir, `${videoId}_mask_${i}.svg`);
    const maskPngPath = join(tempDir, `${videoId}_mask_${i}.png`);
    
    const maskSvg = generateTextMaskSVG(
      segment.text,
      style.fontFamily,
      scaledFontSize,
      style.bold,
      style.italic,
      renderWidth,
      renderHeight
    );
    
    writeFileSync(maskSvgPath, maskSvg, 'utf8');
    
    await rasterizeSVG(maskSvgPath, maskPngPath, renderWidth, renderHeight, rasterizer);
    
    textMasks.push({
      start: segment.startTime,
      end: segment.endTime,
      maskPath: maskPngPath
    });
    
    unlinkSync(maskSvgPath); // Clean up SVG
  }
  
  console.log(`[SVG_GRADIENT] Generated ${textMasks.length} text masks`);
  
  const outputPath = join(tempDir, `${videoId}_gradient_out.mp4`);
  
  const filterParts: string[] = [];
  const inputs: string[] = ['-i', videoPath, '-i', gradientPath];
  
  textMasks.forEach((mask, idx) => {
    inputs.push('-i', mask.maskPath);
    const maskInput = idx + 2; // mask inputs start at index 2 (0=video, 1=gradient)
    
    filterParts.push(
      `[1]format=rgba,scale=${videoWidth}:${videoHeight}[grad${idx}];` +
      `[${maskInput}]format=gray,scale=${videoWidth}:${videoHeight}[mask${idx}];` +
      `[grad${idx}][mask${idx}]alphamerge[txt${idx}]`
    );
  });
  
  let overlayChain = '[0:v]';
  textMasks.forEach((mask, idx) => {
    const enable = `enable='between(t,${mask.start},${mask.end})'`;
    if (idx === textMasks.length - 1) {
      filterParts.push(
        `${overlayChain}[txt${idx}]overlay=(W-w)/2:(H-h)/2:${enable}[outv]`
      );
    } else {
      filterParts.push(
        `${overlayChain}[txt${idx}]overlay=(W-w)/2:(H-h)/2:${enable}[v${idx}]`
      );
      overlayChain = `[v${idx}]`;
    }
  });
  
  const filterComplex = filterParts.join(';');
  
  console.log('[SVG_GRADIENT] Running FFmpeg alphamerge + overlay pipeline...');
  
  await new Promise<void>((resolve, reject) => {
    const ffmpegCmd = ffmpeg(videoPath);
    
    ffmpegCmd.input(gradientPath);
    
    textMasks.forEach(mask => {
      ffmpegCmd.input(mask.maskPath);
    });
    
    ffmpegCmd
      .complexFilter(filterComplex)
      .outputOptions([
        '-map', '[outv]',
        '-map', '0:a',
        '-c:v', 'libx264',
        '-crf', '18',
        '-preset', 'slow',
        '-c:a', 'copy',
        '-movflags', '+faststart'
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('[SVG_GRADIENT] Gradient text rendering complete');
        resolve();
      })
      .on('error', (err) => {
        console.error('[SVG_GRADIENT] FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
  
  textMasks.forEach(mask => {
    if (existsSync(mask.maskPath)) unlinkSync(mask.maskPath);
  });
  if (existsSync(gradientPath)) unlinkSync(gradientPath);
  
  return outputPath;
}

const burnSubtitlesIntoVideo = async (
  videoPath: string,
  srtContent: string,
  videoId: string,
  userId: string,
  options?: SubtitleOptions
): Promise<{ videoPath: string; srtS3Key: string; videoS3Key: string }> => {
  return new Promise(async (resolve, reject) => {
    console.log('[BURN_SUBTITLES] Options received:', JSON.stringify(options, null, 2));
    console.log('[BURN_SUBTITLES] Style object:', JSON.stringify(options?.style, null, 2));
    console.log('[BURN_SUBTITLES] useGradient:', options?.style?.useGradient);
    console.log('[BURN_SUBTITLES] gradientColors:', options?.style?.gradientColors);
    
    const outputFilename = `${videoId}_out.mp4`;
    const srtFilename = `${videoId}_sub.srt`;

    const outputPath = join(tempDir, outputFilename);
    const srtPath = join(tempDir, srtFilename);

    try {
      const fontsDir = join(process.cwd(), 'fonts');
      const fontConfigPath = join(fontsDir, 'fonts.conf');
      
      if (existsSync(fontConfigPath)) {
        process.env.FONTCONFIG_FILE = fontConfigPath;
        process.env.FONTCONFIG_PATH = fontsDir;
        console.log(`[FONT CONFIG] Set FONTCONFIG_FILE: ${fontConfigPath}`);
        console.log(`[FONT CONFIG] Set FONTCONFIG_PATH: ${fontsDir}`);
      } else {
        console.warn(`[FONT CONFIG] fonts.conf not found at ${fontConfigPath}`);
      }
      
      [outputPath, srtPath].forEach((filePath) => {
        if (existsSync(filePath)) {
          try {
            unlinkSync(filePath);
          } catch (e) {
            console.warn("Could not remove existing file:", filePath, e);
          }
        }
      });

      writeFileSync(srtPath, srtContent, "utf8");

      if (!srtContent || srtContent.trim().length === 0) {
        throw new Error("No subtitle content generated - transcription may have failed");
      }

      let videoWidth = 1920;
      let videoHeight = 1080;
      
      try {
        await new Promise<void>((resolveProbe, rejectProbe) => {
          ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
              console.warn('Could not probe video dimensions, using defaults');
              resolveProbe();
              return;
            }
            const videoStream = metadata.streams?.find((s: any) => s.codec_type === 'video');
            if (videoStream) {
              videoWidth = videoStream.width || 1920;
              videoHeight = videoStream.height || 1080;
              console.log(`Video dimensions: ${videoWidth}x${videoHeight}`);
            }
            resolveProbe();
          });
        });
      } catch (probeError) {
        console.warn('Error probing video:', probeError);
      }

      // ===== CHECK IF WE SHOULD USE SVG GRADIENT RENDERING =====
      let useGradientPipeline = options?.style?.useGradient && 
                                  options?.style?.gradientColors && 
                                  options?.style?.gradientColors.length >= 2;
      
      let finalVideoPath = outputPath;
      let srtS3Key: string = '';
      
      if (useGradientPipeline) {
        console.log('[RENDER_MODE] Using SVG + FFmpeg alphamerge for TRUE gradient rendering');
        
        const segments = parseSRTContent(srtContent);
        
        try {
          finalVideoPath = await renderGradientTextOverlay(
            videoPath,
            segments,
            videoId,
            options?.style!,
            videoWidth,
            videoHeight
          );
          
          console.log('[SVG_GRADIENT] Gradient rendering successful');
          
          const srtBuffer = Buffer.from(srtContent, "utf8");
          srtS3Key = `subtitles/${videoId}.srt`;
          await uploadFile(srtS3Key, srtBuffer, "text/plain");
          
        } catch (gradientError) {
          console.error('[SVG_GRADIENT] Error, falling back to ASS:', gradientError);
          useGradientPipeline = false;
        }
      }
      
      // ===== FALLBACK: ASS RENDERING (for non-gradient or if SVG failed) =====
      if (!useGradientPipeline) {
        console.log('[RENDER_MODE] Using ASS subtitle rendering');

        const assContent = convertSRTToASS(srtContent, options?.style, videoWidth, videoHeight);
        const assPath = join(tempDir, `${videoId}.ass`);
        writeFileSync(assPath, assContent, "utf8");

        const srtBuffer = Buffer.from(srtContent, "utf8");
        srtS3Key = `subtitles/${videoId}.srt`;
        await uploadFile(srtS3Key, srtBuffer, "text/plain");

        const testPath = join(tempDir, `test_${videoId}.tmp`);
        writeFileSync(testPath, "test");
        unlinkSync(testPath);

        const shortAssFilename = `sub_${videoId.substring(0, 8)}.ass`;
        const shortAssPath = join(process.cwd(), shortAssFilename);
        
        const existingAssContent = readFileSync(assPath, 'utf8');
        writeFileSync(shortAssPath, existingAssContent, 'utf8');
        
        const assPathForFFmpeg = `./${shortAssFilename}`;

        const fontFile = options?.style ? getFontFilePath(options.style.fontFamily, options.style.bold) : 'Arial';
        
        console.log(`\n[FFMPEG DEBUG] Path Information:`);
        console.log(`   Current working directory: ${process.cwd()}`);
        console.log(`   Short ASS filename: ${shortAssFilename}`);
        console.log(`   Short ASS full path: ${shortAssPath}`);
        console.log(`   ASS file exists: ${existsSync(shortAssPath)}`);
        console.log(`   Font file: ${fontFile}`);
        
        const fontsTempDir = join(process.cwd(), 'fonts');
        if (!existsSync(fontsTempDir)) {
          mkdirSync(fontsTempDir, { recursive: true });
        }
        
        if (fontFile !== 'Arial' && fontFile !== options?.style?.fontFamily && existsSync(fontFile)) {
          try {
            const fontFileName = fontFile.split(/[\\\/]/).pop() || 'font.ttf';
            
            const userFontsDir = join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts');
            const systemFontsDir = 'C:\\Windows\\Fonts';
            
            if (existsSync(userFontsDir)) {
              const userFontPath = join(userFontsDir, fontFileName);
              if (!existsSync(userFontPath)) {
                try {
                  const fontBuffer = readFileSync(fontFile);
                  writeFileSync(userFontPath, fontBuffer);
                  
                  const { execSync } = await import('child_process');
                  const fontNameBase = fontFileName.replace(/\.[^.]+$/, '');
                  try {
                    execSync(`reg add "HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts" /v "${fontNameBase} (TrueType)" /t REG_SZ /d "${userFontPath}" /f`, { 
                      stdio: 'pipe',
                      windowsHide: true 
                    });
                    console.log(`   Installed font to Windows (user): ${fontFileName}`);
                  } catch (regError) {
                    console.log(`   Font copied but registry update failed (font may still work)`);
                  }
                } catch (userInstallError) {
                  console.error(`   Failed to install to user fonts:`, userInstallError);
                }
              } else {
                console.log(`   Font already installed in Windows: ${fontFileName}`);
              }
            }
            
            const tempFontPath = join(fontsTempDir, fontFileName);
            if (!existsSync(tempFontPath)) {
              const fontBuffer = readFileSync(fontFile);
              writeFileSync(tempFontPath, fontBuffer);
              console.log(`   Copied font to: ${tempFontPath}`);
            }
            
            const assDirFontPath = join(process.cwd(), fontFileName);
            if (!existsSync(assDirFontPath)) {
              writeFileSync(assDirFontPath, readFileSync(fontFile));
              console.log(`   Copied font to ASS directory: ${assDirFontPath}`);
            }
          } catch (fontInstallError) {
            console.error(`   Failed to install font:`, fontInstallError);
          }
        }
        
        const relativeAssPath = shortAssFilename;
        
        console.log(`   Relative ASS path for FFmpeg: ${relativeAssPath}`);
        console.log(`   Fonts directory: ${fontsTempDir}`);
        console.log(`\n[FFMPEG] Using ASS filter\n`);
        
        const assContentCheck = readFileSync(shortAssPath, 'utf8');
        console.log(`   ASS file size: ${assContentCheck.length} bytes`);
        console.log(`   ASS first 200 chars: ${assContentCheck.substring(0, 200)}`);
        console.log(`\n[FFMPEG] Starting video processing...`);
        console.log(`   Input: ${videoPath}`);
        console.log(`   Output: ${outputPath}\n`);
        
        const needsProGlow = options?.style?.shadowOffsetX === 0 && options?.style?.shadowOffsetY === 0 && options?.style?.showShadow;
        
        const glowIntensity = options?.style?.shadowIntensity || 5;
        const glowSigma = Math.min(glowIntensity * 2.5, 25); // Blur size: 2.5–25
        const glowColorHex = options?.style?.shadowColor?.replace('#', '') || 'FFFFFF';
        
        await new Promise<void>((resolveASS, rejectASS) => {
          const command = ffmpeg(videoPath)
            .videoCodec("libx264")
            .audioCodec("copy");
          
          if (needsProGlow) {
            const glowColor = glowColorHex;
            
            const r = parseInt(glowColor.substring(0, 2), 16) / 255;
            const g = parseInt(glowColor.substring(2, 4), 16) / 255;
            const b = parseInt(glowColor.substring(4, 6), 16) / 255;
            
            console.log(`[PRO GLOW] Applying professional glow effect`);
            console.log(`   Glow sigma: ${glowSigma}`);
            console.log(`   Glow color: #${glowColor} (RGB: ${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)})`);
            
            const filterComplex = [
              `[0:v]split=2[base][glow]`,
              `[glow]subtitles=${relativeAssPath}:alpha=1,format=rgba,gblur=sigma=${glowSigma},colorchannelmixer=rr=${r}:rg=0:rb=0:gr=0:gg=${g}:gb=0:br=0:bg=0:bb=${b}:ar=1:ag=1:ab=1,eq=contrast=1.2:brightness=0.05[glowlayer]`,
              `[base]subtitles=${relativeAssPath}[txt]`,
              `[base][glowlayer]blend=all_mode=screen:all_opacity=1[tmp]`,
              `[tmp][txt]overlay`
            ].join(';');
            
            command
              .complexFilter(filterComplex)
              .outputOptions([
                "-preset", "ultrafast",
                "-pix_fmt", "yuv420p",
                "-movflags", "+faststart"
              ]);
          } else {
            command.outputOptions([
              "-vf", `ass=${relativeAssPath}`,
              "-preset", "ultrafast",
              "-pix_fmt", "yuv420p",
              "-movflags", "+faststart",
            ]);
          }
          
          command.format("mp4");

          command
            .on("start", (commandLine) => {
              console.log(`[FFMPEG] Command: ${commandLine}`);
            })
            .on("progress", (progress) => {
              if (progress.percent) {
                console.log(`[FFMPEG] Progress: ${Math.round(progress.percent)}%`);
              }
            })
            .on("stderr", (stderrLine) => {
              console.log(`[FFMPEG] ${stderrLine}`);
            })
            .on("end", async () => {
              try {
                if (!existsSync(outputPath)) {
                  throw new Error(`Output file not created: ${outputPath}`);
                }

                const stats = statSync(outputPath);
                if (stats.size === 0) {
                  throw new Error("Output file is empty");
                }
                
                console.log('[ASS] ASS subtitle rendering complete');
                finalVideoPath = outputPath;
                resolveASS();
              } catch (err: any) {
                rejectASS(err);
              }
            })
            .on("error", (err, stdout, stderr) => {
              console.error('\n[FFMPEG ERROR] Video processing failed');
              console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
              console.error('Error Message:', err.message);
              console.error('Error Code:', (err as any).code);
              console.error('\nSTDOUT:');
              console.error(stdout || '(empty)');
              console.error('\nSTDERR:');
              console.error(stderr || '(empty)');
              console.error('\nConfiguration:');
              console.error('   - Video Path:', videoPath);
              console.error('   - Output Path:', outputPath);
              console.error('   - ASS Path (relative):', relativeAssPath);
              console.error('   - ASS Path (full):', shortAssPath);
              console.error('   - Font Family:', options?.style?.fontFamily);
              console.error('   - Font File:', fontFile);
              console.error('\nFile Checks:');
              console.error('   - ASS file exists:', existsSync(shortAssPath));
              console.error('   - Video file exists:', existsSync(videoPath));
              console.error('   - Fonts dir exists:', existsSync(fontsTempDir));
              if (fontFile !== 'Arial' && fontFile !== options?.style?.fontFamily) {
                console.error('   - Font file exists:', existsSync(fontFile));
              }
              console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
              
              rejectASS(new Error(`FFmpeg failed: ${err.message}. Check server logs for details.`));
            })
            .save(outputPath);
        });
        
        try {
          if (existsSync(assPath)) unlinkSync(assPath);
          if (existsSync(shortAssPath)) unlinkSync(shortAssPath);
        } catch (e) {
          console.warn("ASS cleanup failed:", e);
        }
      }
      
      // ===== COMMON: Apply watermark and upload to S3 (works for both SVG and ASS) =====
      console.log('\n[AUTO-SUBTITLES] Applying watermark to subtitled video...');
      console.log('   Video ID:', videoId);
      console.log('   Render mode:', useGradientPipeline ? 'SVG Gradient' : 'ASS');
      console.log('   Current video path:', finalVideoPath);
      
      let watermarkedPath: string | null = null;
      
      try {
        watermarkedPath = finalVideoPath.replace('.mp4', '_watermarked.mp4');
        console.log('   Watermarked path:', watermarkedPath);
        
        const { watermarkService } = await import('./watermark.service');
        console.log('   Watermark service imported successfully');
        
        const watermarkOptions = {
          position: 'center' as const,
          opacity: parseFloat(process.env.WATERMARK_OPACITY || '0.95'),
          watermarkScale: parseFloat(process.env.WATERMARK_SCALE || '0.95'),
          userId
        };
        console.log('   Watermark options:', JSON.stringify(watermarkOptions, null, 2));
        
        await watermarkService.addWatermark(finalVideoPath, watermarkedPath, watermarkOptions);
        console.log('[AUTO-SUBTITLES] Watermark applied successfully');
        
        finalVideoPath = watermarkedPath;
      } catch (watermarkError) {
        console.error('[AUTO-SUBTITLES] Watermark application failed:', watermarkError);
        console.error('   Error message:', watermarkError instanceof Error ? watermarkError.message : String(watermarkError));
        console.error('   Error stack:', watermarkError instanceof Error ? watermarkError.stack : 'N/A');
        console.warn('[AUTO-SUBTITLES] Continuing without watermark...');
      }

      console.log('   Reading final video buffer from:', finalVideoPath);
      const finalVideoBuffer = readFileSync(finalVideoPath);
      console.log('   Final video buffer size:', finalVideoBuffer.length, 'bytes');
      
      const videoS3Key = `videos/${videoId}_with_subtitles.mp4`;
      console.log('   Uploading to S3:', videoS3Key);
      await uploadFile(videoS3Key, finalVideoBuffer, "video/mp4");
      console.log('[AUTO-SUBTITLES] Video uploaded to S3 successfully');

      const filesToCleanup = [srtPath, outputPath, videoPath];
      if (watermarkedPath) filesToCleanup.push(watermarkedPath);
      filesToCleanup.forEach((filePath) => {
        if (existsSync(filePath)) {
          try {
            unlinkSync(filePath);
          } catch (e) {
            console.warn("Cleanup failed:", filePath, e);
          }
        }
      });

      resolve({ videoPath: finalVideoPath, srtS3Key, videoS3Key });
    } catch (setupError: any) {
      try {
        if (existsSync(srtPath)) unlinkSync(srtPath);
        if (existsSync(outputPath)) unlinkSync(outputPath);
        if (existsSync(videoPath)) unlinkSync(videoPath);
      } catch (cleanupError) {
        console.warn("Cleanup failed:", cleanupError);
      }
      
      reject(new Error(`Subtitle processing failed: ${setupError.message || setupError}`));
    }
  });
};

export { extractAudioFromVideo };

/**
 * Extract transcript from video for podcast/interview analysis
 * Returns segments with timestamps for Gemini analysis
 */
export interface TranscriptResult {
  segments: Array<{
    startTime: number;
    endTime: number;
    text: string;
  }>;
  fullText: string;
  duration: number;
}

export const extractTranscriptFromVideo = async (
  videoPath: string,
  projectId: string
): Promise<TranscriptResult> => {
  console.log(`[${projectId}] Extracting transcript from video: ${videoPath}`);
  
  let localVideoPath: string | null = null;
  let audioPath: string | null = null;
  
  try {
    if (videoPath.startsWith('videos/')) {
      console.log(`[${projectId}] Downloading video from S3...`);
      const videoExtension = videoPath.split('.').pop() || 'mp4';
      localVideoPath = join(tempDir, `${randomUUID()}_transcript_input.${videoExtension}`);
      await downloadFileToPath(videoPath, localVideoPath);
      videoPath = localVideoPath;
      console.log(`[${projectId}] Video downloaded to: ${localVideoPath}`);
    }
    
    console.log(`[${projectId}] Extracting audio...`);
    audioPath = join(tempDir, `${randomUUID()}_transcript_audio.wav`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .toFormat('wav')
        .audioFrequency(16000)
        .audioChannels(1)
        .on('end', () => {
          console.log(`[${projectId}] Audio extracted`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[${projectId}] Audio extraction failed:`, err);
          reject(err);
        })
        .save(audioPath!);
    });
    
    const duration = await getVideoDuration(videoPath);
    console.log(`[${projectId}] Video duration: ${duration}s`);
    
    console.log(`[${projectId}] Transcribing audio...`);
    const segments = await transcribeAudioForPodcast(audioPath, projectId, duration);
    
    const fullText = segments.map(s => s.text).join(' ');
    
    console.log(`[${projectId}] Transcript extracted: ${segments.length} segments, ${fullText.split(' ').length} words`);
    
    return {
      segments,
      fullText,
      duration
    };
    
  } finally {
    if (localVideoPath && existsSync(localVideoPath)) {
      try { unlinkSync(localVideoPath); } catch (e) {}
    }
    if (audioPath && existsSync(audioPath)) {
      try { unlinkSync(audioPath); } catch (e) {}
    }
  }
};

/**
 * Transcribe audio file for podcast analysis
 * Uses chunk-based approach for long audio to avoid 10MB limit
 */
const transcribeAudioForPodcast = async (
  audioPath: string,
  projectId: string,
  duration: number
): Promise<Array<{ startTime: number; endTime: number; text: string }>> => {
  const CHUNK_DURATION = 55; // seconds per chunk (under 60s limit for sync API)
  
  if (duration <= 60) {
    console.log(`[${projectId}] Using sync recognition for ${duration}s audio...`);
    const audioBuffer = readFileSync(audioPath);
    
    const [response] = await speechClient.recognize({
      audio: {
        content: audioBuffer.toString('base64'),
      },
      config: {
        encoding: 'LINEAR16' as any,
        sampleRateHertz: 16000,
        languageCode: 'en-US',
        enableWordTimeOffsets: true,
        enableAutomaticPunctuation: true,
        model: 'latest_short',
      },
    });
    
    return extractSegmentsFromSpeechResponse(response as any, projectId, 0);
  }
  
  const numChunks = Math.ceil(duration / CHUNK_DURATION);
  console.log(`[${projectId}] Splitting ${duration.toFixed(0)}s audio into ${numChunks} chunks...`);
  
  const allSegments: Array<{ startTime: number; endTime: number; text: string }> = [];
  
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION;
    const chunkPath = join(tempDir, `${randomUUID()}_chunk_${i}.wav`);
    
    console.log(`[${projectId}] Processing chunk ${i + 1}/${numChunks} (${startTime}s - ${Math.min(startTime + CHUNK_DURATION, duration)}s)...`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(audioPath)
        .setStartTime(startTime)
        .setDuration(CHUNK_DURATION)
        .toFormat('wav')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(chunkPath);
    });
    
    try {
      const chunkBuffer = readFileSync(chunkPath);
      
      const [response] = await speechClient.recognize({
        audio: {
          content: chunkBuffer.toString('base64'),
        },
        config: {
          encoding: 'LINEAR16' as any,
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          alternativeLanguageCodes: ['hi-IN', 'es-ES'],
          enableWordTimeOffsets: true,
          enableAutomaticPunctuation: true,
          model: 'latest_short',
        },
      });
      
      const chunkSegments = extractSegmentsFromSpeechResponse(response as any, projectId, startTime);
      allSegments.push(...chunkSegments);
      
      console.log(`[${projectId}] Chunk ${i + 1} transcribed: ${chunkSegments.length} segments`);
      
    } finally {
      if (existsSync(chunkPath)) {
        try { unlinkSync(chunkPath); } catch (e) {}
      }
    }
  }
  
  console.log(`[${projectId}] Total segments extracted: ${allSegments.length}`);
  return allSegments;
};

/**
 * Extract segments from Google Speech response
 */
const extractSegmentsFromSpeechResponse = (
  response: any,
  projectId: string,
  timeOffset: number = 0
): Array<{ startTime: number; endTime: number; text: string }> => {
  const segments: Array<{ startTime: number; endTime: number; text: string }> = [];
  
  if (!response.results) {
    console.warn(`[${projectId}] No results in speech response`);
    return segments;
  }
  
  for (const result of response.results) {
    if (!result.alternatives || result.alternatives.length === 0) continue;
    
    const alternative = result.alternatives[0];
    const words = alternative.words || [];
    
    if (words.length === 0 && alternative.transcript) {
      segments.push({
        startTime: timeOffset,
        endTime: timeOffset,
        text: alternative.transcript
      });
      continue;
    }
    
    const WORDS_PER_SEGMENT = 12;
    
    for (let i = 0; i < words.length; i += WORDS_PER_SEGMENT) {
      const segmentWords = words.slice(i, Math.min(i + WORDS_PER_SEGMENT, words.length));
      
      if (segmentWords.length === 0) continue;
      
      const firstWord = segmentWords[0];
      const lastWord = segmentWords[segmentWords.length - 1];
      
      const startTime = parseGoogleDuration(firstWord.startTime) + timeOffset;
      const endTime = parseGoogleDuration(lastWord.endTime) + timeOffset;
      const text = segmentWords.map((w: any) => w.word).join(' ');
      
      segments.push({ startTime, endTime, text });
    }
  }
  
  console.log(`[${projectId}] Extracted ${segments.length} transcript segments`);
  return segments;
};

/**
 * Parse Google duration format to seconds
 */
const parseGoogleDuration = (duration: any): number => {
  if (!duration) return 0;
  
  const seconds = Number(duration.seconds || 0);
  const nanos = Number(duration.nanos || 0) / 1e9;
  
  return seconds + nanos;
};

export const generateSubtitles = async (videoS3Key: string, userId: string): Promise<SubtitleSegment[]> => {
  const videoId = uuidv4();
  const result = await generateVideoWithSubtitles(videoId, videoS3Key, userId);
  return result.segments;
};

const formatSRTTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
};

export const generateSRT = (segments: SubtitleSegment[], options?: SubtitleOptions): string => {
  let srt = '';
  
  segments.forEach((segment, index) => {
    const startTime = formatSRTTime(segment.startTime);
    const endTime = formatSRTTime(segment.endTime);
    
    srt += `${index + 1}\n`;
    srt += `${startTime} --> ${endTime}\n`;
    srt += `${segment.text}\n\n`;
  });
  
  return srt;
};

const formatASSTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centiseconds = Math.floor((seconds % 1) * 100);
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
};

const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

export const convertSRTToASS = (srtContent: string, style?: SubtitleStyle, videoWidth: number = 1920, videoHeight: number = 1080): string => {
  const lines = srtContent.trim().split('\n');
  
  const defaultStyle = {
    fontFamily: 'Arial',
    fontSize: 20,
    primaryColor: '&H00FFFFFF',
    outlineColor: '&H00000000',
    shadowColor: '&H00000000',
    backgroundColor: '&H00000000',
    bold: false,
    italic: false
  };
  
  const getAlignment = (alignment?: string) => {
    switch (alignment) {
      case 'left': return 1;
      case 'right': return 3;
      default: return 2; // center
    }
  };
  
  const hexToAssBgr = (hexColor: string, alpha: string = '00'): string => {
    const hex = hexColor.replace('#', '').toUpperCase();
    if (hex.length === 6) {
      const r = hex.substring(0, 2);
      const g = hex.substring(2, 4);
      const b = hex.substring(4, 6);
      return `&H${alpha}${b}${g}${r}`; // ASS uses BGR format
    }
    return `&H${alpha}FFFFFF`; // Default to white
  };

  const fontFilePath = style ? getFontFilePath(style.fontFamily, style.bold) : 'Arial';
  
  const scaleFontSize = (baseFontSize: number): number => {
    const referenceHeight = 1080; // Reference resolution height (1080p)
    const videoScaleFactor = videoHeight / referenceHeight;
    
    const userScale = style?.scale || 1;
    const userScaledSize = baseFontSize * userScale;
    
    const scaledSize = Math.round(userScaledSize * videoScaleFactor);
    
    const finalSize = Math.round(scaledSize * 2.5);
    
    console.log(`[FONT SCALE] Base: ${baseFontSize}px, User Scale: ${userScale}x, Video: ${videoHeight}p (${videoScaleFactor.toFixed(2)}x), Final: ${finalSize}px`);
    return finalSize;
  };
  
  const hasTransparentOutline = style?.outlineColor === 'transparent' || style?.outlineColor?.toLowerCase() === 'transparent';
  const isGradientStyle = style?.useGradient && style?.gradientColors && style?.gradientColors.length >= 2;
  const outlineBorderWidth = isGradientStyle ? 4 : (hasTransparentOutline ? 0 : 3); // Force border for gradients
  
  const isGlowEffect = style?.shadowOffsetX === 0 && style?.shadowOffsetY === 0 && style?.showShadow;
  const shadowDepth = isGlowEffect ? 0 : (style?.showShadow ? 3 : 0);
  
  console.log(`[ASS STYLE] Gradient: ${isGradientStyle}, Outline: ${hasTransparentOutline ? 'TRANSPARENT' : style?.outlineColor}, Border Width: ${outlineBorderWidth}`);
  console.log(`[ASS STYLE] Glow Effect: ${isGlowEffect}, Shadow Depth: ${shadowDepth}`);
  
  const finalStyle = style ? {
    fontFamily: style.fontFamily,
    fontFile: fontFilePath,
    fontSize: scaleFontSize(style.fontSize),
    primaryColor: style.primaryColor.startsWith('&H') ? style.primaryColor : hexToAssBgr(style.primaryColor),
    outlineColor: hasTransparentOutline ? '&H00000000' : (style.outlineColor.startsWith('&H') ? style.outlineColor : hexToAssBgr(style.outlineColor)),
    shadowColor: style.shadowColor.startsWith('&H') ? style.shadowColor : hexToAssBgr(style.shadowColor),
    backgroundColor: '&H00000000', // Always transparent background
    bold: style.bold ? 1 : 0,
    italic: style.italic ? 1 : 0,
    alignment: getAlignment(style.alignment),
    border: outlineBorderWidth, // 0 for transparent outline, 3 for visible
    shadow: shadowDepth // Shadow depth
  } : {...defaultStyle, fontFile: 'Arial', alignment: 2, border: 3, shadow: scaleFontSize(20)};
  
  
  const baseMarginV = 120; // Default bottom margin (in pixels)
  let marginL = 10;
  let marginR = 10;
  let customMarginV = baseMarginV;
  
  if (style?.position) {
    customMarginV = Math.max(10, Math.round(baseMarginV - style.position.y));
    
    marginL = Math.max(0, Math.round(style.position.x));
    marginR = Math.max(0, Math.round(-style.position.x));
  }
  
  console.log(`[ASS] Using font: ${finalStyle.fontFamily} (${finalStyle.fontSize}px, bold: ${!!finalStyle.bold})`);
  console.log(`[ASS] Font file path: ${finalStyle.fontFile}`);
  console.log(`[ASS] Video resolution: ${videoWidth}x${videoHeight}`);
  console.log(`[ASS] Position: X=${style?.position?.x || 0}, Y=${style?.position?.y || 0} → Margins: L=${marginL}, R=${marginR}, V=${customMarginV}`);
  
  let assContent = `[Script Info]\nTitle: SmartClip Subtitles\nScriptType: v4.00+\nPlayResX: ${videoWidth}\nPlayResY: ${videoHeight}\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${finalStyle.fontFamily},${finalStyle.fontSize},${finalStyle.primaryColor},&H000000FF,${finalStyle.outlineColor},${finalStyle.backgroundColor},${finalStyle.bold},${finalStyle.italic},0,0,100,100,0,0,1,${finalStyle.border},${finalStyle.shadow},${finalStyle.alignment},${marginL},${marginR},${customMarginV},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  
  let i = 0;
  while (i < lines.length) {
    if (lines[i] && /^\d+$/.test(lines[i].trim())) {
      i++;
      
      if (lines[i] && lines[i].includes(' --> ')) {
        const timeRange = lines[i].trim();
        const [startSRT, endSRT] = timeRange.split(' --> ');
        
        const parseTime = (srtTime: string): number => {
          const [time, ms] = srtTime.split(',');
          const [h, m, s] = time.split(':').map(Number);
          return h * 3600 + m * 60 + s + (parseInt(ms) / 1000);
        };
        
        const startSeconds = parseTime(startSRT);
        const endSeconds = parseTime(endSRT);
        
        const startASS = formatASSTime(startSeconds);
        const endASS = formatASSTime(endSeconds);
        
        i++;
        
        let text = '';
        while (i < lines.length && lines[i].trim() !== '') {
          if (text) text += '\\N'; // ASS line break
          text += lines[i].trim();
          i++;
        }
        
        if (text) {
          text = text.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
          
          if (style?.useGradient && style.gradientColors && style.gradientColors.length >= 2) {
            console.log(`[ASS GRADIENT] Applying gradient effect with ${style.gradientColors.length} colors`);
            
            // 1. Primary color (text fill) - USE MIDDLE GRADIENT COLOR for better gradient illusion
            // 2. Outline color (\3c) - Use last gradient color (darker) - VISIBLE with thick border
            // 3. Secondary color (\2c) - Use first gradient color (lighter) for edge highlight
            // 4. Black shadow for depth
            // 5. Blur for smooth color blending
            
            const gradientStart = hexToAssBgr(style.gradientColors[0]);
            const gradientEnd = hexToAssBgr(style.gradientColors[style.gradientColors.length - 1]);
            
            const gradientMid = style.gradientColors.length > 2 
              ? hexToAssBgr(style.gradientColors[Math.floor(style.gradientColors.length / 2)]) 
              : hexToAssBgr(style.gradientColors[0]);
            
            const shadowDepth = Math.min(style.shadowIntensity || 3, 5);
            const blurStrength = 3; // Stronger blur for smoother gradient blend
            
            // - \c: Primary text color = MIDDLE gradient color (not white!)
            // - \2c: Secondary color = FIRST gradient color (lightest)
            // - \3c: Outline/border color = LAST gradient color (darkest)
            // - \4c: Shadow color = Black for depth
            // - \bord: Thick border (5-6px) to show gradient layers
            // - \blur: Strong blur for smooth blending
            // - \shad: Shadow depth
            
            text = `{\\c${gradientMid}\\3c${gradientEnd}\\4c&H00000000\\bord6\\blur${blurStrength}\\shad${shadowDepth}}${text}`;
            
            console.log(`[ASS GRADIENT] Applied gradient: Text=${style.gradientColors[Math.floor(style.gradientColors.length / 2)] || style.gradientColors[0]}, Outline=${style.gradientColors[style.gradientColors.length - 1]}, Border=6, Blur=${blurStrength}, Shadow=${shadowDepth}`);
          } else if (style?.shadowOffsetX === 0 && style?.shadowOffsetY === 0 && style?.showShadow) {
            console.log(`[ASS GLOW] Glow will be applied via FFmpeg filter_complex (professional split-blur-blend)`);
          } else if (style?.shadowIntensity && style.shadowIntensity > 3) {
            text = `{\\shad3}${text}`;
          }
          
          assContent += `Dialogue: 0,${startASS},${endASS},Default,,0,0,0,,${text}\n`;
        }
      }
    }
    i++;
  }
  
  return assContent;
};