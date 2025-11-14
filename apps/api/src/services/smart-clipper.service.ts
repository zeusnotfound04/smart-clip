import { analyzeVideo } from './ai.service';
import { s3Service } from '../lib/s3';

export interface Highlight {
  startTime: number;
  endTime: number;
  confidence: number;
  type: string;
}

export const detectHighlights = async (videoS3Key: string): Promise<Highlight[]> => {
  const videoBuffer = await s3Service.downloadFile(videoS3Key);
  const analysis = await analyzeVideo(videoBuffer);
  
  const highlights: Highlight[] = [];
  
  if (analysis.annotationResults?.[0]?.shotLabelAnnotations) {
    analysis.annotationResults[0].shotLabelAnnotations.forEach((annotation: any) => {
      annotation.segments?.forEach((segment: any) => {
        if (segment.confidence && segment.confidence > 0.7) {
          highlights.push({
            startTime: parseFloat(String(segment.startTimeOffset?.seconds || 0)),
            endTime: parseFloat(String(segment.endTimeOffset?.seconds || 0)),
            confidence: segment.confidence,
            type: annotation.entity?.description || 'unknown'
          });
        }
      });
    });
  }
  
  return highlights;
};