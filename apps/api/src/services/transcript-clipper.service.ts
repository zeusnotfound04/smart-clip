/**
 * Transcript-Based Smart Clipper Service
 * 
 * Simplified workflow for Podcast/Interview content:
 * 1. Extract subtitles/transcription with timestamps
 * 2. Send transcript to Gemini Pro
 * 3. Gemini selects best clips based on content
 * 4. FFmpeg cuts the clips
 * 
 * No audio energy detection, scene detection, or embeddings.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../lib/prisma';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export interface TranscriptSegment {
  startTime: number;
  endTime: number;
  text: string;
}

export interface ClipRecommendation {
  startTime: number;
  endTime: number;
  title: string;
  reasoning: string;
  highlightType: 'revelation' | 'funny' | 'emotional' | 'educational' | 'debate' | 'story' | 'insight';
  score: number;
}

export interface TranscriptClipperConfig {
  numberOfClips: number;
  minClipDuration: number;
  maxClipDuration: number;
  contentType: 'podcast' | 'interview';
}

class TranscriptClipperService {
  
  /**
   * Main entry point for transcript-based clipping
   */
  async analyzeTranscriptAndGetClips(
    transcript: TranscriptSegment[],
    config: TranscriptClipperConfig,
    projectId: string
  ): Promise<ClipRecommendation[]> {
    console.log(`[${projectId}] Starting transcript-based analysis`);
    console.log(`[${projectId}] Transcript has ${transcript.length} segments`);
    
    const formattedTranscript = this.formatTranscriptForAI(transcript);
    
    const recommendations = await this.getGeminiClipRecommendations(
      formattedTranscript,
      config,
      projectId
    );
    
    console.log(`[${projectId}] Got ${recommendations.length} clip recommendations`);
    
    return recommendations;
  }

  /**
   * Format transcript with timestamps for AI analysis
   */
  private formatTranscriptForAI(transcript: TranscriptSegment[]): string {
    return transcript.map(seg => {
      const startMin = Math.floor(seg.startTime / 60);
      const startSec = Math.floor(seg.startTime % 60);
      const endMin = Math.floor(seg.endTime / 60);
      const endSec = Math.floor(seg.endTime % 60);
      
      return `[${startMin}:${startSec.toString().padStart(2, '0')} - ${endMin}:${endSec.toString().padStart(2, '0')}] ${seg.text}`;
    }).join('\n');
  }

  /**
   * Get clip recommendations from Gemini Pro
   */
  private async getGeminiClipRecommendations(
    formattedTranscript: string,
    config: TranscriptClipperConfig,
    projectId: string
  ): Promise<ClipRecommendation[]> {
    console.log(`[${projectId}] Sending transcript to Gemini Pro...`);
    
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    
    const prompt = this.buildPrompt(formattedTranscript, config);
    
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`[${projectId}] Received Gemini response`);
      
      const recommendations = this.parseGeminiResponse(text, projectId);
      
      const validatedRecommendations = this.validateClipDurations(
        recommendations,
        config.minClipDuration,
        config.maxClipDuration
      );
      
      return validatedRecommendations;
    } catch (error) {
      console.error(`[${projectId}] Gemini API error:`, error);
      throw error;
    }
  }

  /**
   * Build the prompt for Gemini Pro
   */
  private buildPrompt(transcript: string, config: TranscriptClipperConfig): string {
    const contentTypeDesc = config.contentType === 'podcast' 
      ? 'podcast conversation' 
      : 'interview';
    
    return `You are an expert video editor analyzing a ${contentTypeDesc} transcript to find the most engaging clips for social media.

TRANSCRIPT:
${transcript}

YOUR TASK:
Find exactly ${config.numberOfClips} clips that would make great standalone content for social media (TikTok, YouTube Shorts, Instagram Reels).

WHAT MAKES A GREAT CLIP:
1. **Revelation/Insight**: Surprising information, "aha" moments, mind-blowing facts
2. **Funny Moments**: Natural humor, witty exchanges, laugh-out-loud moments
3. **Emotional Peaks**: Personal stories, vulnerable moments, passionate speeches
4. **Educational Value**: Clear explanations, actionable advice, valuable tips
5. **Debates/Arguments**: Strong opinions, compelling disagreements, spicy takes
6. **Compelling Stories**: Engaging narratives with clear beginning, middle, end

CLIP REQUIREMENTS:
- Duration: ${config.minClipDuration}-${config.maxClipDuration} seconds each
- Each clip should be SELF-CONTAINED (makes sense without context)
- Start slightly before the key moment (give context)
- End with impact (don't cut mid-thought)

IMPORTANT: 
- Use the EXACT timestamps from the transcript
- Prefer clips where one complete thought or story is captured
- Avoid clips that start or end mid-sentence

Respond ONLY with valid JSON in this exact format:
{
  "clips": [
    {
      "startTime": <number in seconds>,
      "endTime": <number in seconds>,
      "title": "<catchy 5-10 word title for the clip>",
      "reasoning": "<why this makes a great clip in 1-2 sentences>",
      "highlightType": "<one of: revelation, funny, emotional, educational, debate, story, insight>",
      "score": <1-100 virality score>
    }
  ]
}

Return exactly ${config.numberOfClips} clips, ordered by score (highest first).`;
  }

  /**
   * Parse Gemini's JSON response
   */
  private parseGeminiResponse(text: string, projectId: string): ClipRecommendation[] {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`[${projectId}] No JSON found in response`);
        return [];
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.clips || !Array.isArray(parsed.clips)) {
        console.error(`[${projectId}] Invalid response structure`);
        return [];
      }
      
      return parsed.clips.map((clip: any) => ({
        startTime: Number(clip.startTime),
        endTime: Number(clip.endTime),
        title: clip.title || 'Untitled Clip',
        reasoning: clip.reasoning || '',
        highlightType: clip.highlightType || 'insight',
        score: Number(clip.score) || 50
      }));
    } catch (error) {
      console.error(`[${projectId}] Failed to parse Gemini response:`, error);
      console.error(`[${projectId}] Raw response:`, text.substring(0, 500));
      return [];
    }
  }

  /**
   * Validate and adjust clip durations
   */
  private validateClipDurations(
    clips: ClipRecommendation[],
    minDuration: number,
    maxDuration: number
  ): ClipRecommendation[] {
    return clips.map((clip: any) => {
      let duration = clip.endTime - clip.startTime;
      
      if (duration < minDuration) {
        clip.endTime = clip.startTime + minDuration;
      }
      
      if (duration > maxDuration) {
        clip.endTime = clip.startTime + maxDuration;
      }
      
      return clip;
    });
  }

  /**
   * Convert SRT/VTT format to TranscriptSegment array
   */
  parseSubtitlesToTranscript(srtContent: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    
    const blocks = srtContent.trim().split(/\n\n+/);
    
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      
      if (lines.length < 2) continue;
      
      const timestampLine = lines.find(line => line.includes('-->'));
      if (!timestampLine) continue;
      
      const [startStr, endStr] = timestampLine.split('-->').map(s => s.trim());
      const startTime = this.parseTimestamp(startStr);
      const endTime = this.parseTimestamp(endStr);
      
      const textStartIndex = lines.indexOf(timestampLine) + 1;
      const text = lines.slice(textStartIndex).join(' ').trim();
      
      if (text && !isNaN(startTime) && !isNaN(endTime)) {
        segments.push({ startTime, endTime, text });
      }
    }
    
    return segments;
  }

  /**
   * Parse timestamp string to seconds
   * Supports: "00:01:23,456" or "00:01:23.456" or "01:23.456"
   */
  private parseTimestamp(timestamp: string): number {
    timestamp = timestamp.trim();
    
    timestamp = timestamp.replace(',', '.');
    
    const parts = timestamp.split(':');
    
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
    } else if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return Number(minutes) * 60 + Number(seconds);
    }
    
    return 0;
  }

  /**
   * Merge consecutive transcript segments for better context
   */
  mergeTranscriptSegments(segments: TranscriptSegment[], maxGapSeconds: number = 2): TranscriptSegment[] {
    if (segments.length === 0) return [];
    
    const merged: TranscriptSegment[] = [];
    let current = { ...segments[0] };
    
    for (let i = 1; i < segments.length; i++) {
      const next = segments[i];
      const gap = next.startTime - current.endTime;
      
      if (gap <= maxGapSeconds) {
        current.endTime = next.endTime;
        current.text += ' ' + next.text;
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    
    merged.push(current);
    return merged;
  }
}

export const transcriptClipper = new TranscriptClipperService();
