'use client';

import { Button } from '@/components/ui/button';
import { ContentTypeSelector } from '@/components/smart-clipper/content-type-selector';
import { ContentTypeConfig, SmartClipperProject } from '@/types/smart-clipper';

interface ConfigureViewProps {
  contentTypes: ContentTypeConfig[];
  selectedContentType: string | null;
  setSelectedContentType: (type: string | null) => void;
  contentConfig: Partial<ContentTypeConfig>;
  setContentConfig: (config: Partial<ContentTypeConfig>) => void;
  loading: boolean;
  currentProject: SmartClipperProject | null;
  onAnalyzeVideo: (videoId: string, contentType: string, config: any) => Promise<void>;
}

export function ConfigureView({
  contentTypes,
  selectedContentType,
  setSelectedContentType,
  contentConfig,
  setContentConfig,
  loading,
  currentProject,
  onAnalyzeVideo
}: ConfigureViewProps) {
  console.log('🎛️ [SMART_CLIPPER] Rendering configure view');
  console.log('📊 Content types count:', contentTypes.length);
  console.log('📋 Content types:', contentTypes);
  console.log('🎯 Selected type:', selectedContentType);
  console.log('⚙️ Content config:', contentConfig);
  console.log('🔄 Loading state:', loading);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Select Content Type</h2>
      {contentTypes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Loading content types...</p>
          <p className="text-sm text-gray-400 mt-2">Count: {contentTypes.length}</p>
        </div>
      ) : (
        <ContentTypeSelector
          contentTypes={contentTypes}
          selectedType={selectedContentType}
          onTypeSelect={setSelectedContentType}
          onConfigChange={setContentConfig}
          customConfig={contentConfig}
          loading={loading}
        />
      )}
      
      {selectedContentType && (
        <div className="flex justify-center">
          <Button
            onClick={() => {
              if (currentProject?.video?.id) {
                onAnalyzeVideo(currentProject.video.id, selectedContentType, contentConfig);
              }
            }}
            disabled={loading || !currentProject?.video?.id}
            className="px-8 py-2"
          >
            {loading ? 'Analyzing...' : 'Start Analysis'}
          </Button>
        </div>
      )}
    </div>
  );
}