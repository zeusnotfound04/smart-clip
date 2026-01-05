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

// Validate Google Cloud credentials
if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
  console.error('❌ GOOGLE_CLOUD_PROJECT_ID is not configured');
}
if (!process.env.GOOGLE_CLOUD_CLIENT_EMAIL) {
  console.error('❌ GOOGLE_CLOUD_CLIENT_EMAIL is not configured');
}
if (!process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
  console.error('❌ GOOGLE_CLOUD_PRIVATE_KEY is not configured');
}

const speechClient = new SpeechClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentials: {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }
});

const tempDir = tmpdir();

// Ensure temp directory exists
if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

console.log(`\ud83d\udccf [AUTO-SUBTITLES] Temp directory: ${tempDir}`);

// Font file path mapping for FFmpeg
const FONT_FILE_MAP: Record<string, { regular: string; bold?: string }> = {
  'Bangers': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Bangers', 'Bangers-Regular.ttf')
  },
  'Anton': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Anton', 'Anton-Regular.ttf')
  },
  'Montserrat': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-Regular.ttf'),
    bold: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-Black.ttf')
  },
  'Montserrat Black': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-Black.ttf'),
    bold: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-Black.ttf')
  },
  'Montserrat ExtraBold': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-ExtraBold.ttf'),
    bold: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-ExtraBold.ttf')
  },
  'Montserrat Bold': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-Bold.ttf'),
    bold: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-Bold.ttf')
  },
  'Montserrat SemiBold': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-SemiBold.ttf'),
    bold: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-SemiBold.ttf')
  },
  'Montserrat Medium': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-Medium.ttf'),
    bold: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Montserrat', 'Montserrat-Medium.ttf')
  },
  'Rubik': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Rubik', 'Rubik-Regular.ttf'),
    bold: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Rubik', 'Rubik-Black.ttf')
  },
  'Gabarito': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Gabarito', 'Gabarito-Regular.ttf'),
    bold: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Gabarito', 'Gabarito-Black.ttf')
  },
  'Poppins': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Poppins', 'Poppins-Regular.ttf'),
    bold: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Poppins', 'Poppins-Black.ttf')
  },
  'Roboto': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Roboto', 'Roboto-Regular.ttf'),
    bold: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Roboto', 'Roboto-Black.ttf')
  },
  'DM Serif Display': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'DM_Serif_Display', 'DMSerifDisplay-Regular.ttf')
  },
  'Fira Sans Condensed': {
    regular: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Fira_Sans_Condensed', 'FiraSansCondensed-Regular.ttf'),
    bold: join(process.cwd(), '..', '..', 'apps', 'web', 'public', 'fonts', 'Fira_Sans_Condensed', 'FiraSansCondensed-Black.ttf')
  },
  'Arial': {
    regular: 'Arial' // System font fallback
  }
};

// Helper function to get font file path
const getFontFilePath = (fontFamily: string, bold: boolean = false): string => {
  const fontConfig = FONT_FILE_MAP[fontFamily] || FONT_FILE_MAP['Arial'];
  const fontPath = bold && fontConfig.bold ? fontConfig.bold : fontConfig.regular;
  
  // For system fonts (like Arial), return the name
  if (fontPath === fontFamily) {
    return fontFamily;
  }
  
  // Check if font file exists
  if (existsSync(fontPath)) {
    console.log(`✅ Font found: ${fontFamily} -> ${fontPath}`);
    return fontPath;
  }
  
  console.warn(`⚠️ Font not found: ${fontPath}, falling back to Arial`);
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
  // 🔥 Use streaming download to file (much faster, avoids RAM usage)
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
    // Check if videoPath is an S3 key or local path
    if (videoPath.startsWith('videos/')) {
      console.log(`📥 [AUDIO_EXTRACT] Streaming video from S3: ${videoPath}`);
      
      // 🔥 Use streaming download to file (much faster)
      const videoExtension = videoPath.split('.').pop() || 'mp4';
      localVideoPath = join(tempDir, `${randomUUID()}_input.${videoExtension}`);
      await downloadFileToPath(videoPath, localVideoPath);
      console.log(`✅ [AUDIO_EXTRACT] Video streamed to: ${localVideoPath}`);
      
      // Use local path for processing
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
            // Verify audio file exists before proceeding
            if (!existsSync(audioPath!)) {
              throw new Error(`Audio file was not created: ${audioPath}`);
            }
            
            const audioBuffer = readFileSync(audioPath!);
            const audioS3Key = `audio/${videoId}_extracted.wav`;
            await uploadFile(audioS3Key, audioBuffer, 'audio/wav');
            
            console.log(`\u2705 [AUDIO_EXTRACT] Audio uploaded to S3: ${audioS3Key}`);
            console.log(`\ud83d\udcbe [AUDIO_EXTRACT] Local audio file retained for transcription: ${audioPath}`);
            
            // Clean up video temp file only (keep audio for transcription)
            if (localVideoPath && existsSync(localVideoPath)) {
              unlinkSync(localVideoPath);
              console.log(`\ud83e\uddf9 [AUDIO_EXTRACT] Cleaned up video temp file: ${localVideoPath}`);
            }
            
            // Return both local path and S3 key - local file will be cleaned up after transcription
            resolve({ audioPath: audioPath!, s3Key: audioS3Key });
          } catch (uploadError: any) {
            // Clean up on error
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
          // Clean up on error
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
    // Clean up on error
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

      console.log(`🔪 Splitting ${duration.toFixed(2)}s audio into ${Math.ceil(duration / chunkDurationSeconds)} chunks`);
      
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
            console.log(`✂️ Chunk ${chunkIndex} created: ${chunkPath}`);
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
    
    // Debug: Log response structure if no results
    if (!results || results.length === 0) {
      console.warn('⚠️ No results in response:', JSON.stringify(response, null, 2).substring(0, 500));
    }
    
    return processChunkResults(results, timeOffset);
  } catch (error: any) {
    console.error('❌ Speech API Error:', error.message);
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
  
  // Adjust timestamps based on chunk offset for ALL chunks
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
  
  console.log(`🎵 Audio file size: ${(audioSizeInBytes / 1024 / 1024).toFixed(2)}MB, estimated duration: ${audioDurationEstimate.toFixed(2)}s`);
  
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

  // Split audio into chunks if needed (reduced to 30s for better parallelization)
  const chunkDurationSeconds = 30;
  const chunkPaths = await splitAudioIntoChunks(audioPath, chunkDurationSeconds);
  const isChunked = chunkPaths.length > 1;
  
  if (isChunked) {
    console.log(`📦 Processing ${chunkPaths.length} audio chunks`);
  }

  // Filter and sort configs based on options
  const configsToTest = options?.language 
    ? languageConfigs.filter(c => c.languageCode === options.language)
    : languageConfigs.sort((a, b) => (a.priority || 999) - (b.priority || 999));

  if (options?.language) {
    console.log(`🎯 Using specified language: ${options.language} (skipping detection for 10-30s speed boost)`);
  } else {
    console.log(`🔍 Auto-detecting language (will stop at first good match)...`);
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

        console.log(`🎤 Testing ${config.languageCode}...`);
        
        const allChunkResults: any[] = [];
        let successfulChunks = 0;
        
        // Process all chunks in parallel for 3-5x speed improvement
        const chunkPromises = chunkPaths.map((chunkPath, i) => 
          transcribeAudioChunk(chunkPath, requestConfig, i * chunkDurationSeconds)
            .then(results => ({ success: true, results, index: i }))
            .catch(error => ({ success: false, error, index: i }))
        );
        
        const chunkResults = await Promise.all(chunkPromises);
        
        // Process results from all chunks
        for (const result of chunkResults) {
          if (result.success) {
            const successResult = result as { success: true; results: any[]; index: number };
            if (successResult.results.length > 0) {
              allChunkResults.push(...successResult.results);
              successfulChunks++;
              console.log(`   ✓ Chunk ${successResult.index + 1}/${chunkPaths.length}: ${successResult.results.length} segments`);
            } else {
              console.warn(`   ⚠️ Chunk ${successResult.index + 1}/${chunkPaths.length}: No results`);
            }
          } else {
            const errorResult = result as { success: false; error: any; index: number };
            console.warn(`   ❌ Chunk ${errorResult.index + 1}/${chunkPaths.length} failed: ${errorResult.error.message}`);
          }
        }
        
        const results = allChunkResults;
        
        if (results.length > 0) {
          // Calculate average confidence across ALL result segments
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
          console.log(`✅ ${config.languageCode}: ${results.length} segments (${successfulChunks}/${chunkPaths.length} chunks), ${(confidence * 100).toFixed(0)}% avg confidence - "${transcriptPreview}..."`);
          
          
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

          // 🚀 EARLY STOP: If we found a great match and not detecting all languages, stop here
          if (confidence > 0.7 && !options?.detectAllLanguages && !options?.language) {
            console.log(`🎯 High confidence (${(confidence * 100).toFixed(0)}%) - stopping search`);
            break;
          }
        } else {
          console.log(`❌ ${config.languageCode}: No transcription`);
        }
      } catch (error: any) {
        console.warn(`❌ ${config.languageCode}: ${error.message}`);
      }
    }
  } finally {
    // Clean up all chunk files in parallel (excluding the original audio file)
    const cleanupPromises = chunkPaths
      .filter(chunkPath => chunkPath !== audioPath && existsSync(chunkPath))
      .map(chunkPath => unlink(chunkPath).catch(() => {}));
    
    await Promise.all(cleanupPromises);
    
    if (cleanupPromises.length > 0) {
      console.log(`🧹 Cleaned up ${cleanupPromises.length} temporary chunk files`);
    }
  }

  if (bestResult) {
    console.log(`\n🏆 Selected: ${bestResult.languageUsed} (${(bestResult.confidence * 100).toFixed(0)}% confidence)`);
  } else {
    console.error('❌ Failed to generate subtitles: No transcription results from any language');
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
        
        // Use maxWordsPerLine from style options (default: 8, TikTok/Shorts style: 3)
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
          
          // Use dynamic maxWords instead of hardcoded 8
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
    
    const subtitleData = segments.map(segment => ({
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
    
    // Download video to get duration
    videoPath = await downloadVideoFromS3(s3Key, videoId);
    
    // Get video duration for credit calculation
    const videoDuration = await getVideoDuration(videoPath);
    console.log(`📹 [AUTO-SUBTITLES] Video duration: ${videoDuration}s`);
    
    // Import credit service
    const { CreditService } = await import('./credit.service');
    
    // Validate credits before processing
    const validation = await CreditService.validateAndPrepareProcessing(
      userId,
      videoDuration,
      'Auto-Subtitles'
    );
    
    if (!validation.canProcess) {
      throw new Error(validation.message || 'Insufficient credits');
    }
    
    console.log(`✅ [CREDITS] User has sufficient credits (${validation.currentCredits}/${validation.creditsRequired})`);
    console.log(`🎨 [WATERMARK] Will apply watermark: ${validation.shouldWatermark ? 'Yes' : 'No'}`);
    
    const audioResult = await extractAudioFromVideo(videoPath, videoId);
    audioPath = audioResult.audioPath;
    
    console.log(`\ud83c\udfb5 [AUTO-SUBTITLES] Audio extracted successfully: ${audioPath}`);
    console.log(`\ud83c\udfb5 [AUTO-SUBTITLES] Starting transcription...`);
    
    const { results: transcriptionResults, detectedLanguages } = await transcribeAudio(audioPath, options, audioResult.s3Key);
    const segments = processTranscriptionToSegments(transcriptionResults, options);
    const srtContent = generateSRT(segments, options);
    
    await saveSubtitlesToDatabase(videoId, segments);
    
    // Clean up audio file after transcription is complete
    if (audioPath && existsSync(audioPath)) {
      unlinkSync(audioPath);
      console.log(`\ud83e\uddf9 [AUTO-SUBTITLES] Cleaned up audio temp file: ${audioPath}`);
    }
    
    const burnResult = await burnSubtitlesIntoVideo(videoPath, srtContent, videoId, userId, options);
    subtitledVideoPath = burnResult.videoPath;
    
    const subtitledVideoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${burnResult.videoS3Key}`;
    
    // Deduct credits after successful processing
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
      console.log(`✅ [CREDITS] Successfully deducted ${validation.creditsRequired} credits`);
    } catch (creditError) {
      console.error('❌ [CREDITS] Failed to deduct credits:', creditError);
      // Continue even if credit deduction fails (video already processed)
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
            // Skip directories - only clean up files
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
const burnSubtitlesIntoVideo = async (
  videoPath: string,
  srtContent: string,
  videoId: string,
  userId: string,
  options?: SubtitleOptions
): Promise<{ videoPath: string; srtS3Key: string; videoS3Key: string }> => {
  return new Promise(async (resolve, reject) => {
    const outputFilename = `${videoId}_out.mp4`;
    const srtFilename = `${videoId}_sub.srt`;

    const outputPath = join(tempDir, outputFilename);
    const srtPath = join(tempDir, srtFilename);

    try {
      // Set up fontconfig to use custom font directory
      const fontsDir = join(process.cwd(), 'fonts');
      const fontConfigPath = join(fontsDir, 'fonts.conf');
      
      if (existsSync(fontConfigPath)) {
        process.env.FONTCONFIG_FILE = fontConfigPath;
        process.env.FONTCONFIG_PATH = fontsDir;
        console.log(`🎨 [FONT CONFIG] Set FONTCONFIG_FILE: ${fontConfigPath}`);
        console.log(`🎨 [FONT CONFIG] Set FONTCONFIG_PATH: ${fontsDir}`);
      } else {
        console.warn(`⚠️ [FONT CONFIG] fonts.conf not found at ${fontConfigPath}`);
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

      // Get video dimensions for proper ASS scaling
      let videoWidth = 1920;
      let videoHeight = 1080;
      
      try {
        await new Promise<void>((resolveProbe, rejectProbe) => {
          ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
              console.warn('⚠️ Could not probe video dimensions, using defaults');
              resolveProbe();
              return;
            }
            const videoStream = metadata.streams?.find((s: any) => s.codec_type === 'video');
            if (videoStream) {
              videoWidth = videoStream.width || 1920;
              videoHeight = videoStream.height || 1080;
              console.log(`📐 Video dimensions: ${videoWidth}x${videoHeight}`);
            }
            resolveProbe();
          });
        });
      } catch (probeError) {
        console.warn('⚠️ Error probing video:', probeError);
      }

      const assContent = convertSRTToASS(srtContent, options?.style, videoWidth, videoHeight);
      const assPath = join(tempDir, `${videoId}.ass`);
      writeFileSync(assPath, assContent, "utf8");

      const srtBuffer = Buffer.from(srtContent, "utf8");
      const srtS3Key = `subtitles/${videoId}.srt`;
      await uploadFile(srtS3Key, srtBuffer, "text/plain");

      const testPath = join(tempDir, `test_${videoId}.tmp`);
      writeFileSync(testPath, "test");
      unlinkSync(testPath);

      const shortAssFilename = `sub_${videoId.substring(0, 8)}.ass`;
      const shortAssPath = join(process.cwd(), shortAssFilename);
      
      const existingAssContent = readFileSync(assPath, 'utf8');
      writeFileSync(shortAssPath, existingAssContent, 'utf8');
      
      const assPathForFFmpeg = `./${shortAssFilename}`;

      // Build subtitles filter with font configuration
      const fontFile = options?.style ? getFontFilePath(options.style.fontFamily, options.style.bold) : 'Arial';
      
      console.log(`\n🎬 [FFMPEG DEBUG] Path Information:`);
      console.log(`   Current working directory: ${process.cwd()}`);
      console.log(`   Short ASS filename: ${shortAssFilename}`);
      console.log(`   Short ASS full path: ${shortAssPath}`);
      console.log(`   ASS file exists: ${existsSync(shortAssPath)}`);
      console.log(`   Font file: ${fontFile}`);
      
      // SOLUTION: Install font to Windows system or user fonts directory
      const fontsTempDir = join(process.cwd(), 'fonts');
      if (!existsSync(fontsTempDir)) {
        mkdirSync(fontsTempDir, { recursive: true });
      }
      
      // Install the required font to Windows
      if (fontFile !== 'Arial' && fontFile !== options?.style?.fontFamily && existsSync(fontFile)) {
        try {
          const fontFileName = fontFile.split(/[\\\/]/).pop() || 'font.ttf';
          
          // Try to install to Windows user fonts directory (no admin required)
          const userFontsDir = join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Windows', 'Fonts');
          const systemFontsDir = 'C:\\Windows\\Fonts';
          
          // First, try user fonts directory
          if (existsSync(userFontsDir)) {
            const userFontPath = join(userFontsDir, fontFileName);
            if (!existsSync(userFontPath)) {
              try {
                const fontBuffer = readFileSync(fontFile);
                writeFileSync(userFontPath, fontBuffer);
                
                // Register font in Windows registry (user scope)
                const { execSync } = await import('child_process');
                const fontNameBase = fontFileName.replace(/\.[^.]+$/, '');
                try {
                  execSync(`reg add "HKCU\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts" /v "${fontNameBase} (TrueType)" /t REG_SZ /d "${userFontPath}" /f`, { 
                    stdio: 'pipe',
                    windowsHide: true 
                  });
                  console.log(`   ✅ Installed font to Windows (user): ${fontFileName}`);
                } catch (regError) {
                  console.log(`   ⚠️ Font copied but registry update failed (font may still work)`);
                }
              } catch (userInstallError) {
                console.error(`   ⚠️ Failed to install to user fonts:`, userInstallError);
              }
            } else {
              console.log(`   ✅ Font already installed in Windows: ${fontFileName}`);
            }
          }
          
          // Copy to local directory as fallback
          const tempFontPath = join(fontsTempDir, fontFileName);
          if (!existsSync(tempFontPath)) {
            const fontBuffer = readFileSync(fontFile);
            writeFileSync(tempFontPath, fontBuffer);
            console.log(`   ✅ Copied font to: ${tempFontPath}`);
          }
          
          const assDirFontPath = join(process.cwd(), fontFileName);
          if (!existsSync(assDirFontPath)) {
            writeFileSync(assDirFontPath, readFileSync(fontFile));
            console.log(`   ✅ Copied font to ASS directory: ${assDirFontPath}`);
          }
        } catch (fontInstallError) {
          console.error(`   ⚠️ Failed to install font:`, fontInstallError);
        }
      }
      
      // Try using relative path from current working directory
      const relativeAssPath = shortAssFilename;
      
      console.log(`   Relative ASS path for FFmpeg: ${relativeAssPath}`);
      console.log(`   Fonts directory: ${fontsTempDir}`);
      console.log(`\n🎬 [FFMPEG] Using ASS filter\n`);
      
      // Read ASS content to verify it's valid
      const assContentCheck = readFileSync(shortAssPath, 'utf8');
      console.log(`   ASS file size: ${assContentCheck.length} bytes`);
      console.log(`   ASS first 200 chars: ${assContentCheck.substring(0, 200)}`);
      console.log(`\n🎬 [FFMPEG] Starting video processing...`);
      console.log(`   Input: ${videoPath}`);
      console.log(`   Output: ${outputPath}\n`);
      
      const command = ffmpeg(videoPath)
        .videoCodec("libx264")
        .audioCodec("copy")
        .outputOptions([
          "-vf", `ass=${relativeAssPath}`,
          "-preset",
          "ultrafast",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
        ])
        .format("mp4");

      command
        .on("start", (commandLine) => {
          console.log(`🎬 [FFMPEG] Command: ${commandLine}`);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(`🎬 [FFMPEG] Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on("stderr", (stderrLine) => {
          console.log(`🎬 [FFMPEG] ${stderrLine}`);
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

            // Apply watermark to subtitled video
            console.log('\n📍 [AUTO-SUBTITLES] Applying watermark to subtitled video...');
            console.log('   Video ID:', videoId);
            console.log('   Output path:', outputPath);
            
            let finalVideoPath = outputPath;
            let watermarkedPath: string | null = null;
            
            try {
              watermarkedPath = outputPath.replace('.mp4', '_watermarked.mp4');
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
              
              await watermarkService.addWatermark(outputPath, watermarkedPath, watermarkOptions);
              console.log('✅ [AUTO-SUBTITLES] Watermark applied successfully');
              
              finalVideoPath = watermarkedPath;
            } catch (watermarkError) {
              console.error('❌ [AUTO-SUBTITLES] Watermark application failed:', watermarkError);
              console.error('   Error message:', watermarkError instanceof Error ? watermarkError.message : String(watermarkError));
              console.error('   Error stack:', watermarkError instanceof Error ? watermarkError.stack : 'N/A');
              console.warn('⚠️ [AUTO-SUBTITLES] Continuing without watermark...');
              // Continue without watermark if it fails
            }

            console.log('   Reading final video buffer from:', finalVideoPath);
            const finalVideoBuffer = readFileSync(finalVideoPath);
            console.log('   Final video buffer size:', finalVideoBuffer.length, 'bytes');
            
            const videoS3Key = `videos/${videoId}_with_subtitles.mp4`;
            console.log('   Uploading to S3:', videoS3Key);
            await uploadFile(videoS3Key, finalVideoBuffer, "video/mp4");
            console.log('✅ [AUTO-SUBTITLES] Video uploaded to S3 successfully');

            const filesToCleanup = [srtPath, assPath, shortAssPath, outputPath, videoPath];
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

            resolve({ videoPath: outputPath, srtS3Key, videoS3Key });
          } catch (uploadError: any) {
            [srtPath, assPath, shortAssPath, outputPath, videoPath].forEach((filePath) => {
              if (existsSync(filePath)) {
                try {
                  unlinkSync(filePath);
                } catch {}
              }
            });

            reject(new Error(`Post-processing failed: ${uploadError.message}`));
          }
        })
        .on("error", (err, stdout, stderr) => {
          console.error('\n❌ [FFMPEG ERROR] Video processing failed');
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.error('📋 Error Message:', err.message);
          console.error('📋 Error Code:', (err as any).code);
          console.error('\n📝 STDOUT:');
          console.error(stdout || '(empty)');
          console.error('\n📝 STDERR:');
          console.error(stderr || '(empty)');
          console.error('\n🎯 Configuration:');
          console.error('   - Video Path:', videoPath);
          console.error('   - Output Path:', outputPath);
          console.error('   - ASS Path (relative):', relativeAssPath);
          console.error('   - ASS Path (full):', shortAssPath);
          console.error('   - Font Family:', options?.style?.fontFamily);
          console.error('   - Font File:', fontFile);
          console.error('\n📂 File Checks:');
          console.error('   - ASS file exists:', existsSync(shortAssPath));
          console.error('   - Video file exists:', existsSync(videoPath));
          console.error('   - Fonts dir exists:', existsSync(fontsTempDir));
          if (fontFile !== 'Arial' && fontFile !== options?.style?.fontFamily) {
            console.error('   - Font file exists:', existsSync(fontFile));
          }
          console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          
          try {
            if (existsSync(srtPath)) unlinkSync(srtPath);
            if (existsSync(assPath)) unlinkSync(assPath);
            if (existsSync(shortAssPath)) unlinkSync(shortAssPath);
            if (existsSync(outputPath)) unlinkSync(outputPath);
          } catch {}

          reject(new Error(`FFmpeg failed: ${err.message}. Check server logs for details.`));
        })
        .save(outputPath);
    } catch (setupError: any) {
      reject(new Error(`Setup failed: ${setupError.message || setupError}`));
    }
  });
};

export { extractAudioFromVideo };

/**
 * 🎙️ Extract transcript from video for podcast/interview analysis
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
  console.log(`[${projectId}] 🎙️ Extracting transcript from video: ${videoPath}`);
  
  let localVideoPath: string | null = null;
  let audioPath: string | null = null;
  
  try {
    // Download video if it's an S3 key
    if (videoPath.startsWith('videos/')) {
      console.log(`[${projectId}] 📥 Downloading video from S3...`);
      const videoExtension = videoPath.split('.').pop() || 'mp4';
      localVideoPath = join(tempDir, `${randomUUID()}_transcript_input.${videoExtension}`);
      await downloadFileToPath(videoPath, localVideoPath);
      videoPath = localVideoPath;
      console.log(`[${projectId}] ✅ Video downloaded to: ${localVideoPath}`);
    }
    
    // Extract audio from video
    console.log(`[${projectId}] 🎵 Extracting audio...`);
    audioPath = join(tempDir, `${randomUUID()}_transcript_audio.wav`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .toFormat('wav')
        .audioFrequency(16000)
        .audioChannels(1)
        .on('end', () => {
          console.log(`[${projectId}] ✅ Audio extracted`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[${projectId}] ❌ Audio extraction failed:`, err);
          reject(err);
        })
        .save(audioPath!);
    });
    
    // Get audio duration
    const duration = await getVideoDuration(videoPath);
    console.log(`[${projectId}] ⏱️ Video duration: ${duration}s`);
    
    // Transcribe using Google Speech-to-Text
    console.log(`[${projectId}] 🎤 Transcribing audio...`);
    const segments = await transcribeAudioForPodcast(audioPath, projectId, duration);
    
    // Build full text
    const fullText = segments.map(s => s.text).join(' ');
    
    console.log(`[${projectId}] ✅ Transcript extracted: ${segments.length} segments, ${fullText.split(' ').length} words`);
    
    return {
      segments,
      fullText,
      duration
    };
    
  } finally {
    // Cleanup temp files
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
  
  // For short audio, use direct recognition
  if (duration <= 60) {
    console.log(`[${projectId}] 📤 Using sync recognition for ${duration}s audio...`);
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
  
  // For long audio, split into chunks
  const numChunks = Math.ceil(duration / CHUNK_DURATION);
  console.log(`[${projectId}] 🔪 Splitting ${duration.toFixed(0)}s audio into ${numChunks} chunks...`);
  
  const allSegments: Array<{ startTime: number; endTime: number; text: string }> = [];
  
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * CHUNK_DURATION;
    const chunkPath = join(tempDir, `${randomUUID()}_chunk_${i}.wav`);
    
    console.log(`[${projectId}] ✂️ Processing chunk ${i + 1}/${numChunks} (${startTime}s - ${Math.min(startTime + CHUNK_DURATION, duration)}s)...`);
    
    // Extract chunk with ffmpeg
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
      // Transcribe chunk
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
      
      // Extract segments with time offset
      const chunkSegments = extractSegmentsFromSpeechResponse(response as any, projectId, startTime);
      allSegments.push(...chunkSegments);
      
      console.log(`[${projectId}] ✅ Chunk ${i + 1} transcribed: ${chunkSegments.length} segments`);
      
    } finally {
      // Cleanup chunk file
      if (existsSync(chunkPath)) {
        try { unlinkSync(chunkPath); } catch (e) {}
      }
    }
  }
  
  console.log(`[${projectId}] ✅ Total segments extracted: ${allSegments.length}`);
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
      // No word timings, create a single segment
      segments.push({
        startTime: timeOffset,
        endTime: timeOffset,
        text: alternative.transcript
      });
      continue;
    }
    
    // Group words into sentences (roughly 10-15 words per segment)
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
  
  console.log(`[${projectId}] ✅ Extracted ${segments.length} transcript segments`);
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
  
  // Map alignment to ASS alignment values (1=left, 2=center, 3=right)
  const getAlignment = (alignment?: string) => {
    switch (alignment) {
      case 'left': return 1;
      case 'right': return 3;
      default: return 2; // center
    }
  };
  
  // Convert hex color to ASS BGR format
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
  
  // Scale font size based on video resolution
  // The font size from frontend is designed for 1080p (1920x1080)
  // We scale it proportionally based on actual video height
  const scaleFontSize = (baseFontSize: number): number => {
    const referenceHeight = 1080; // Reference resolution height (1080p)
    const scaleFactor = videoHeight / referenceHeight;
    const scaledSize = Math.round(baseFontSize * scaleFactor);
    
    // Apply additional multiplier to make subtitles more visible
    // ASS renders fonts smaller than expected, so we boost them
    const visibilityMultiplier = 2.5; // Increase font size by 2.5x for better visibility
    const finalSize = Math.round(scaledSize * visibilityMultiplier);
    
    console.log(`📏 [FONT SCALE] Base: ${baseFontSize}px, Video: ${videoHeight}p, Scale: ${scaleFactor.toFixed(2)}x, Final: ${finalSize}px (${visibilityMultiplier}x boost)`);
    
    return finalSize;
  };
  
  const finalStyle = style ? {
    fontFamily: style.fontFamily,
    fontFile: fontFilePath,
    fontSize: scaleFontSize(style.fontSize),
    primaryColor: style.primaryColor.startsWith('&H') ? style.primaryColor : hexToAssBgr(style.primaryColor),
    outlineColor: style.outlineColor.startsWith('&H') ? style.outlineColor : hexToAssBgr(style.outlineColor),
    shadowColor: style.shadowColor.startsWith('&H') ? style.shadowColor : hexToAssBgr(style.shadowColor),
    backgroundColor: '&H00000000', // Always transparent background
    bold: style.bold ? 1 : 0,
    italic: style.italic ? 1 : 0,
    alignment: getAlignment(style.alignment),
    shadow: style.showShadow ? 3 : 0 // Shadow depth
  } : {...defaultStyle, fontFile: 'Arial', alignment: 2, shadow: scaleFontSize(20)};
  
  console.log(`📝 [ASS] Using font: ${finalStyle.fontFamily} (${finalStyle.fontSize}px, bold: ${!!finalStyle.bold})`);
  console.log(`📝 [ASS] Font file path: ${finalStyle.fontFile}`);
  console.log(`📐 [ASS] Video resolution: ${videoWidth}x${videoHeight}`);
  
  // Build ASS header with actual video dimensions for proper font scaling
  let assContent = `[Script Info]\nTitle: SmartClip Subtitles\nScriptType: v4.00+\nPlayResX: ${videoWidth}\nPlayResY: ${videoHeight}\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${finalStyle.fontFamily},${finalStyle.fontSize},${finalStyle.primaryColor},&H000000FF,${finalStyle.outlineColor},${finalStyle.backgroundColor},${finalStyle.bold},${finalStyle.italic},0,0,100,100,0,0,1,3,${finalStyle.shadow},${finalStyle.alignment},10,10,30,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  
  let i = 0;
  while (i < lines.length) {
    // Skip subtitle number
    if (lines[i] && /^\d+$/.test(lines[i].trim())) {
      i++;
      
      // Parse time range
      if (lines[i] && lines[i].includes(' --> ')) {
        const timeRange = lines[i].trim();
        const [startSRT, endSRT] = timeRange.split(' --> ');
        
        // Convert SRT time to seconds
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
        
        // Collect text lines until empty line or end
        let text = '';
        while (i < lines.length && lines[i].trim() !== '') {
          if (text) text += '\\N'; // ASS line break
          text += lines[i].trim();
          i++;
        }
        
        if (text) {
          // Escape special ASS characters
          text = text.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
          assContent += `Dialogue: 0,${startASS},${endASS},Default,,0,0,0,,${text}\n`;
        }
      }
    }
    i++;
  }
  
  return assContent;
};