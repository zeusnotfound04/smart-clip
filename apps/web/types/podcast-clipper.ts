export interface SubtitleStyle {
  styleKey: string;
  name: string;
  description: string;
  previewImage?: string;
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  highlightColor: string;
  borderWidth: number;
  shadowDepth: number;
  scaleNormal: number;
  scaleHighlight: number;
}

export type SubtitleStyleKey =
  | 'chris_cinematic'
  | 'clean_pop'
  | 'minimal_lowercase'
  | 'bold_emphasis'
  | 'karaoke_snap'
  | 'warm_italic';

export type VideoSourceType = 'upload' | 'youtube';

export interface YouTubeVideoInfo {
  title: string;
  duration: number;
  durationFormatted: string;
  thumbnail: string;
  channelName?: string;
  platform: string;
  url: string;
}

export interface UploadedVideoInfo {
  videoId: string;
  filename: string;
  size: number;
  duration?: number;
  previewUrl: string;
  uploadedAt: string;
}

export type ProjectStatus =
  | 'pending'
  | 'downloading'
  | 'processing'
  | 'analyzing'
  | 'rendering'
  | 'completed'
  | 'failed';

export interface PodcastClipperProject {
  id: string;
  userId: string;

  // Source
  sourceType: VideoSourceType;
  sourceUrl?: string;
  sourceVideoId?: string;

  // Metadata
  title?: string;
  thumbnail?: string;
  totalDuration?: number;

  // Clip config
  clipStartTime: number;
  clipEndTime: number;
  clipDuration: number;

  // Subtitle config
  subtitleStyle: SubtitleStyleKey;
  whisperModel: string;

  // Processing state
  status: ProjectStatus;
  processingStage?: string;
  progress: number;

  // Results
  speakersDetected?: number;
  layoutMode?: 'single' | 'split';
  outputUrl?: string;
  outputSignedUrl?: string;
  subtitlePath?: string;

  // Cost
  estimatedCost?: number;
  actualCost?: number;
  creditsUsed?: number;
  processingTimeMs?: number;

  // Error
  errorMessage?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ProjectListItem {
  id: string;
  title?: string;
  thumbnail?: string;
  sourceType: VideoSourceType;
  clipStartTime: number;
  clipEndTime: number;
  clipDuration: number;
  subtitleStyle: SubtitleStyleKey;
  status: ProjectStatus;
  progress: number;
  outputUrl?: string;
  outputSignedUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateProjectRequest {
  sourceType: VideoSourceType;
  sourceUrl?: string;
  videoId?: string;
  title?: string;
  thumbnail?: string;
  totalDuration?: number;
  clipStartTime: number;
  clipEndTime: number;
  subtitleStyle: SubtitleStyleKey;
  whisperModel?: string;
}

export interface CreateProjectResponse {
  projectId: string;
  estimatedCredits: number;
  estimatedProcessingTime: number;
}

export interface ProjectStatusResponse {
  id: string;
  status: ProjectStatus;
  progress: number;
  processingStage?: string;
  speakersDetected?: number;
  layoutMode?: string;
  outputUrl?: string;
  outputSignedUrl?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CalculateCreditsResponse {
  clipDuration: number;
  credits: number;
  estimatedProcessingTime: number;
}

export interface ProjectListResponse {
  projects: ProjectListItem[];
  total: number;
  limit: number;
  offset: number;
}

export type WizardStep =
  | 'source'      // Select video source (upload or YouTube)
  | 'preview'     // Preview video and select clip range
  | 'style'       // Select subtitle style
  | 'confirm'     // Review and confirm
  | 'processing'  // Processing in progress
  | 'complete';   // Done

export interface ClipRange {
  start: number;
  end: number;
}

export interface PodcastClipperState {
  // Current step
  step: WizardStep;

  // Source selection
  sourceType: VideoSourceType | null;
  youtubeUrl: string;
  youtubeInfo: YouTubeVideoInfo | null;
  uploadedVideo: UploadedVideoInfo | null;

  // Clip selection
  clipRange: ClipRange;

  // Style selection
  selectedStyle: SubtitleStyleKey;
  whisperModel: string;

  // Processing
  projectId: string | null;
  projectStatus: ProjectStatusResponse | null;

  // UI state
  isLoading: boolean;
  error: string | null;
}

export const PROCESSING_STAGES: Record<string, { label: string; icon: string }> = {
  'initializing': { label: 'Initializing...', icon: '⚙️' },
  'downloading': { label: 'Downloading video...', icon: '📥' },
  'queued_for_processing': { label: 'Queued for processing...', icon: '⏳' },
  'extracting_clip': { label: 'Extracting clip...', icon: '✂️' },
  'analyzing_faces': { label: 'Detecting speakers...', icon: '👤' },
  'transcribing': { label: 'Transcribing audio...', icon: '🎤' },
  'generating_subtitles': { label: 'Generating subtitles...', icon: '💬' },
  'rendering': { label: 'Rendering video...', icon: '🎬' },
  'uploading': { label: 'Uploading result...', icon: '📤' },
  'completed': { label: 'Complete!', icon: '✅' },
  'error': { label: 'Error occurred', icon: '❌' },
};

export const SUBTITLE_STYLE_PREVIEWS: Record<SubtitleStyleKey, {
  name: string;
  description: string;
  previewText: string;
  colors: { primary: string; highlight: string; background: string };
}> = {
  'chris_cinematic': {
    name: 'Cinematic',
    description: 'Bold 3D cinematic style with green highlights',
    previewText: 'This is AMAZING content',
    colors: { primary: '#FFFFFF', highlight: '#00FF5A', background: '#000000' },
  },
  'clean_pop': {
    name: 'Clean Pop',
    description: 'Modern italic style with soft shadows and pop-in animation',
    previewText: 'clean and fresh',
    colors: { primary: '#FFFFFF', highlight: '#FFFFFF', background: '#1a1a1a' },
  },
  'minimal_lowercase': {
    name: 'Minimal Lowercase',
    description: 'Ultra-clean minimal style with lowercase text',
    previewText: 'simple elegance',
    colors: { primary: '#FFFFFF', highlight: '#FFFFFF', background: '#0d0d0d' },
  },
  'bold_emphasis': {
    name: 'Bold Emphasis',
    description: 'High-impact 3D style with bold text and red highlight',
    previewText: 'MAXIMUM IMPACT',
    colors: { primary: '#FFFFFF', highlight: '#FF3232', background: '#000000' },
  },
  'karaoke_snap': {
    name: 'Karaoke Snap',
    description: 'Single word at a time with quick snap-in animation',
    previewText: 'ONE',
    colors: { primary: '#FFFFFF', highlight: '#FFFFFF', background: '#0a0a0a' },
  },
  'warm_italic': {
    name: 'Warm Italic',
    description: 'Elegant italic style with smooth green glow highlights',
    previewText: 'warm GREEN vibes',
    colors: { primary: '#FFFFFF', highlight: '#00E678', background: '#1a1a1a' },
  },
};

export const MAX_SOURCE_DURATION = 3 * 60 * 60; // 3 hours in seconds
export const MAX_CLIP_DURATION = 10 * 60; // 10 minutes in seconds
export const MIN_CLIP_DURATION = 5; // 5 seconds
export const CREDITS_PER_MINUTE = 2;

export const WHISPER_MODELS = [
  { value: 'tiny', label: 'Tiny (Fastest)', description: 'Quick but less accurate' },
  { value: 'base', label: 'Base (Recommended)', description: 'Good balance of speed and accuracy' },
  { value: 'small', label: 'Small', description: 'Better accuracy, slower' },
  { value: 'medium', label: 'Medium', description: 'High accuracy, much slower' },
] as const;

export type WhisperModel = typeof WHISPER_MODELS[number]['value'];
