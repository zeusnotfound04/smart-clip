export interface SmartClipperProject {
  id: string;
  videoId: string;
  contentType: string;
  status: 'analyzing' | 'completed' | 'processing' | 'error';
  config: any;
  totalSegmentsFound?: number;
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  updatedAt: string;
  video: {
    id: string;
    originalName: string;
    duration?: number;
    filePath: string;
  };
  highlightSegments?: HighlightSegment[];
}

export interface HighlightSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  finalScore: number;
  confidenceLevel: number;
  highlightType?: string;
  reasoning: string;
  status: 'pending' | 'recommended' | 'available' | 'generating' | 'generated' | 'failed' | 'ready';
  userApproval?: 'approved' | 'rejected' | 'modified';
  customStartTime?: number;
  customEndTime?: number;
  audioEnergyAvg?: number;
  silenceRatio?: number;
  sceneChanges?: number;
  s3Url?: string; // S3 URL for generated clip
  clipReady?: boolean; // Boolean flag indicating if clip is ready
}

export interface ContentTypeConfig {
  type: string;
  name: string;
  description: string;
  icon?: string;
  audioEnergyWeight: number;
  visualMotionWeight: number;
  speechPatternWeight: number;
  sceneChangeWeight: number;
  excitementKeywords: string[];
  actionKeywords: string[];
  emotionalKeywords: string[];
  technicalKeywords: string[];
  preferredClipLength: number;
  minClipLength: number;
  maxClipLength: number;
  maxSegments: number;
  minimumConfidence: number;
  geminiFlashPromptTemplate: string;
  geminiProPromptTemplate: string;
}

export type ViewMode = 'upload' | 'configure' | 'timeline' | 'preview' | 'dashboard';

export interface VideoModalState {
  isOpen: boolean;
  videoUrl: string;
  startTime: number;
  endTime: number;
}

export interface SmartClipperProps {
  currentProject: SmartClipperProject | null;
  setCurrentProject: (project: SmartClipperProject | null) => void;
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  contentTypes: ContentTypeConfig[];
  selectedSegments: HighlightSegment[];
  setSelectedSegments: (segments: HighlightSegment[]) => void;
  videoModal: VideoModalState;
  setVideoModal: (modal: VideoModalState) => void;
}