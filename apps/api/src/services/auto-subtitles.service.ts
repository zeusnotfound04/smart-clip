import ffmpeg from 'fluent-ffmpeg';
import { SpeechClient } from '@google-cloud/speech';
import { downloadFile, uploadFile } from '../lib/s3';
import { readFileSync, unlinkSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
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
}

export interface SubtitleOptions {
  detectAllLanguages?: boolean;
  language?: string;
  style?: SubtitleStyle;
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

const validateFFmpeg = (): Promise<boolean> => {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err) => {
      resolve(!err);
    });
  });
};

const downloadVideoFromS3 = async (s3Key: string, videoId: string): Promise<string> => {
  const videoBuffer = await downloadFile(s3Key);
  const videoPath = join(tempDir, `${randomUUID()}_input.mp4`);
  writeFileSync(videoPath, videoBuffer);
  return videoPath;
};

const extractAudioFromVideo = async (videoPath: string, videoId: string): Promise<{ audioPath: string; s3Key: string }> => {
  return new Promise((resolve, reject) => {
    const audioPath = join(tempDir, `${randomUUID()}_audio.wav`);
    
    ffmpeg(videoPath)
      .toFormat('wav')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', async () => {
        try {
          const audioBuffer = readFileSync(audioPath);
          const audioS3Key = `audio/${videoId}_extracted.wav`;
          await uploadFile(audioS3Key, audioBuffer, 'audio/wav');
          resolve({ audioPath, s3Key: audioS3Key });
        } catch (uploadError: any) {
          reject(new Error(`Audio upload failed: ${uploadError.message}`));
        }
      })
      .on('error', (err) => {
        reject(new Error(`Audio extraction failed: ${err.message}`));
      })
      .save(audioPath);
  });
};

const splitAudioIntoChunks = (audioPath: string, chunkDurationSeconds: number = 50): Promise<string[]> => {
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
  const audioBuffer = readFileSync(audioPath);
  const request = {
    audio: { content: audioBuffer.toString('base64') },
    config
  };
  
  const [response] = await speechClient.recognize(request);
  const results = response.results || [];
  
  // Adjust timestamps based on chunk offset for ALL chunks
  if (results.length > 0) {
    results.forEach((result: any) => {
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
  
  return results;
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

  // Split audio into chunks if needed
  const chunkPaths = await splitAudioIntoChunks(audioPath, 50);
  const isChunked = chunkPaths.length > 1;
  
  if (isChunked) {
    console.log(`📦 Processing ${chunkPaths.length} audio chunks`);
  }

  // Filter and sort configs based on options
  const configsToTest = options?.language 
    ? languageConfigs.filter(c => c.languageCode === options.language)
    : languageConfigs.sort((a, b) => (a.priority || 999) - (b.priority || 999));

  if (options?.language) {
    console.log(`🎯 Using specified language: ${options.language}`);
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
        let timeOffset = 0;
        
        // Process each chunk sequentially
        for (let i = 0; i < chunkPaths.length; i++) {
          const chunkPath = chunkPaths[i];
          
          try {
            const chunkResults = await transcribeAudioChunk(chunkPath, requestConfig, timeOffset);
            allChunkResults.push(...chunkResults);
            timeOffset += 50;
          } catch (chunkError: any) {
            console.warn(`⚠️ ${config.languageCode} chunk ${i + 1} failed: ${chunkError.message}`);
          }
        }
        
        const results = allChunkResults;
        
        if (results.length > 0) {
          const confidence = results[0].alternatives?.[0]?.confidence || 0;
          const transcriptPreview = results[0].alternatives?.[0]?.transcript?.substring(0, 50) || '';
          console.log(`✅ ${config.languageCode}: ${results.length} segments, ${(confidence * 100).toFixed(0)}% confidence - "${transcriptPreview}..."`);
          
          
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
    // Clean up all chunk files
    for (const chunkPath of chunkPaths) {
      if (chunkPath !== audioPath && existsSync(chunkPath)) {
        try {
          unlinkSync(chunkPath);
        } catch {}
      }
    }
    console.log(`🧹 Cleaned up ${chunkPaths.length - 1} temporary chunk files`);
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
          
          if (wordCount >= 8 || index === words.length - 1) {
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

export const generateVideoWithSubtitles = async (videoId: string, s3Key: string, options?: SubtitleOptions): Promise<VideoWithSubtitlesResult> => {
  let videoPath: string | null = null;
  let audioPath: string | null = null;
  let subtitledVideoPath: string | null = null;
  
  try {
    const ffmpegValid = await validateFFmpeg();
    if (!ffmpegValid) {
      throw new Error('FFmpeg is not properly installed or configured');
    }
    
    videoPath = await downloadVideoFromS3(s3Key, videoId);
    const audioResult = await extractAudioFromVideo(videoPath, videoId);
    audioPath = audioResult.audioPath;
    
    const { results: transcriptionResults, detectedLanguages } = await transcribeAudio(audioPath, options, audioResult.s3Key);
    const segments = processTranscriptionToSegments(transcriptionResults, options);
    const srtContent = generateSRT(segments, options);
    
    await saveSubtitlesToDatabase(videoId, segments);
    
    if (existsSync(audioPath)) {
      unlinkSync(audioPath);
    }
    
    const burnResult = await burnSubtitlesIntoVideo(videoPath, srtContent, videoId, options);
    subtitledVideoPath = burnResult.videoPath;
    
    const subtitledVideoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${burnResult.videoS3Key}`;
    
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
  options?: SubtitleOptions
): Promise<{ videoPath: string; srtS3Key: string; videoS3Key: string }> => {
  return new Promise(async (resolve, reject) => {
    const outputFilename = `${videoId}_out.mp4`;
    const srtFilename = `${videoId}_sub.srt`;

    const outputPath = join(tempDir, outputFilename);
    const srtPath = join(tempDir, srtFilename);

    try {
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

      const assContent = convertSRTToASS(srtContent, options?.style);
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

      const command = ffmpeg(videoPath)
        .videoCodec("libx264")
        .audioCodec("copy")
        .outputOptions([
          "-vf",
          `ass=${assPathForFFmpeg}`,
          "-preset",
          "ultrafast",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
        ])
        .format("mp4");

      command
        .on("end", async () => {
          try {
            if (!existsSync(outputPath)) {
              throw new Error(`Output file not created: ${outputPath}`);
            }

            const stats = statSync(outputPath);
            if (stats.size === 0) {
              throw new Error("Output file is empty");
            }

            const finalVideoBuffer = readFileSync(outputPath);
            const videoS3Key = `videos/${videoId}_with_subtitles.mp4`;
            await uploadFile(videoS3Key, finalVideoBuffer, "video/mp4");

            [srtPath, assPath, shortAssPath, outputPath, videoPath].forEach((filePath) => {
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
          try {
            if (existsSync(srtPath)) unlinkSync(srtPath);
            if (existsSync(assPath)) unlinkSync(assPath);
            if (existsSync(shortAssPath)) unlinkSync(shortAssPath);
            if (existsSync(outputPath)) unlinkSync(outputPath);
          } catch {}

          reject(new Error(`FFmpeg failed: ${err.message}`));
        })
        .save(outputPath);
    } catch (setupError: any) {
      reject(new Error(`Setup failed: ${setupError.message || setupError}`));
    }
  });
};

export { extractAudioFromVideo };

export const generateSubtitles = async (videoS3Key: string): Promise<SubtitleSegment[]> => {
  const videoId = uuidv4();
  const result = await generateVideoWithSubtitles(videoId, videoS3Key);
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

export const convertSRTToASS = (srtContent: string, style?: SubtitleStyle): string => {
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

  const finalStyle = style ? {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    primaryColor: style.primaryColor.startsWith('&H') ? style.primaryColor : hexToAssBgr(style.primaryColor),
    outlineColor: style.outlineColor.startsWith('&H') ? style.outlineColor : hexToAssBgr(style.outlineColor),
    shadowColor: style.shadowColor.startsWith('&H') ? style.shadowColor : hexToAssBgr(style.shadowColor),
    backgroundColor: '&H00000000', // Always transparent background
    bold: style.bold ? 1 : 0,
    italic: style.italic ? 1 : 0,
    alignment: getAlignment(style.alignment),
    shadow: style.showShadow ? 3 : 0 // Shadow depth
  } : {...defaultStyle, alignment: 2, shadow: 0};
  
  let assContent = `[Script Info]\nTitle: SmartClip Subtitles\nScriptType: v4.00+\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,${finalStyle.fontFamily},${finalStyle.fontSize},${finalStyle.primaryColor},&H000000FF,${finalStyle.outlineColor},${finalStyle.backgroundColor},${finalStyle.bold},${finalStyle.italic},0,0,100,100,0,0,1,2,${finalStyle.shadow},${finalStyle.alignment},10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  
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