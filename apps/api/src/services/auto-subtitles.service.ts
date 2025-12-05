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
  detectAllLanguages: boolean;
  style: SubtitleStyle;
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

const transcribeAudio = async (audioPath: string, options?: SubtitleOptions): Promise<{ results: any[], detectedLanguages: string[] }> => {
  const audioBuffer = readFileSync(audioPath);
  
  const languageConfigs = [
    {
      languageCode: 'hi-IN',
      alternativeLanguageCodes: ['ur-PK', 'en-IN', 'ur-IN'],
      phrases: ['aaj', 'maker', 'scam', 'instagram', 'video', 'content']
    },
    {
      languageCode: 'ur-PK',
      alternativeLanguageCodes: ['hi-IN', 'en-PK', 'en-IN'],
      phrases: ['aaj', 'maker', 'scam', 'instagram', 'video', 'content']
    },
    {
      languageCode: 'en-IN',
      alternativeLanguageCodes: ['hi-IN', 'ur-PK', 'en-US'],
      phrases: ['aaj', 'maker', 'scam', 'instagram', 'video', 'content']
    },
    {
      languageCode: 'en-US',
      alternativeLanguageCodes: ['en-GB', 'en-AU', 'en-IN'],
      phrases: ['video', 'maker', 'scam', 'instagram', 'content', 'speech']
    }
  ];

  const allResults: any[] = [];
  const detectedLanguages: string[] = [];
  let bestResult = null;
  let bestConfidence = 0;

  for (const config of languageConfigs) {
    try {
      const request = {
        audio: { content: audioBuffer.toString('base64') },
        config: {
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
        }
      };
      console.log(`Pushing the request : `, request);
      const [response] = await speechClient.recognize(request);
      const results = response.results || [];
      console.log(`Transcription results for ${config.languageCode}:`, results);
      
      if (results.length > 0) {
        const confidence = results[0].alternatives?.[0]?.confidence || 0;
        
        if (confidence > 0.3) {
          detectedLanguages.push(config.languageCode);
          
          if (options?.detectAllLanguages) {
            results.forEach(result => {
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
            transcript: results[0].alternatives?.[0]?.transcript || ''
          };
        }
      }
    } catch (error: any) {
      console.warn(`Transcription failed for ${config.languageCode}:`, error.message);
    }
  }

  const finalResults = options?.detectAllLanguages && allResults.length > 0 ? allResults : (bestResult ? bestResult.results : []);
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
      } else if (alternative.transcript && alternative.transcript.trim()) {
        const processedText = options?.style ? applyTextCase(alternative.transcript.trim(), options.style.textCase) : alternative.transcript.trim();
        
        segments.push({
          text: processedText,
          startTime: 0,
          endTime: 5,
          confidence: alternative.confidence || 0,
          language: (alternative as any).detectedLanguage || 'unknown',
          rawTranscript: alternative.transcript
        });
      }
    }
  });

  if (segments.length === 0 && process.env.NODE_ENV === 'development') {
    segments.push(
      {
        text: 'This is a test subtitle',
        startTime: 1,
        endTime: 3,
        confidence: 0.9
      },
      {
        text: 'Testing ASS subtitle format',
        startTime: 4,
        endTime: 7,
        confidence: 0.9
      },
      {
        text: 'SmartClip subtitle generation',
        startTime: 8,
        endTime: 10,
        confidence: 0.9
      }
    );
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
    
    const { results: transcriptionResults, detectedLanguages } = await transcribeAudio(audioPath, options);
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