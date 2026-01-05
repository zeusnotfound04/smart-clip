"use client";

import { useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useState, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { CreditExhaustedDialog } from "@/components/credit-exhausted-dialog";
import { useCreditError } from "@/hooks/use-credit-error";
import { SubtitleConfigurationPanel } from "@/components/auto-subtitles/SubtitleConfigurationPanel";
import { Button } from "@/components/ui/button";
import { Settings, Upload } from "lucide-react";
import { VideoSelectorModal } from "@/components/video-selector-modal";
import { VideoUrlUpload } from "@/components/video-url-upload";

export default function AutoSubtitlesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [subtitleResults, setSubtitleResults] = useState<{[key: string]: any}>({});
  const [debugData, setDebugData] = useState<{[key: string]: any}>({});
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [currentDebugVideoId, setCurrentDebugVideoId] = useState<string | null>(null);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { creditError, hideCreditError, handleApiError } = useCreditError();
  
  const [subtitleOptions, setSubtitleOptions] = useState<{
    detectAllLanguages: boolean;
    style: {
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
    };
  }>({
    detectAllLanguages: false,
    style: {
      textCase: 'normal',
      fontFamily: 'Bangers',
      fontSize: 34,
      primaryColor: '#FFFF00',
      outlineColor: '#000000',
      shadowColor: '#000000',
      bold: true,
      italic: false,
      alignment: 'center',
      showShadow: true
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push("/auth/signin");
    return null;
  }

  const handleVideoSelect = async (video: any) => {
    // If video is already in the list, don't add it again
    if (!videos.find(v => v.id === video.id)) {
      setVideos(prev => [video, ...prev]);
    }
    setShowVideoSelector(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await apiClient.uploadVideo(file);
      setVideos(prev => [result, ...prev]);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfigureAndGenerate = (videoId: string) => {
    setSelectedVideoId(videoId);
    setShowConfiguration(true);
  };

  const handleGenerateSubtitles = async (videoId: string) => {
    setProcessing(true);
    setShowConfiguration(false);
    try {
      const result = await apiClient.generateSubtitles(videoId, subtitleOptions);
      
      console.log('API Response:', result); // Debug log
      
      // Store the result - handle response format
      const apiResult = result as any; // Type assertion to handle dynamic properties
      const videoUrl = apiResult.videoWithSubtitles || apiResult.subtitledVideoUrl;
      const srtContent = apiResult.srtContent || apiResult.subtitles;
      
      if (videoUrl) {
        setSubtitleResults(prev => ({
          ...prev,
          [videoId]: {
            videoWithSubtitles: videoUrl,
            srtContent: srtContent,
            segments: apiResult.segments || [],
            srtS3Key: apiResult.srtS3Key,
            audioS3Key: apiResult.audioS3Key
          }
        }));
        alert('Subtitles generated successfully! Check the results below.');
      } else {
        alert('Subtitles generated but video URL not available. Check console for details.');
        console.error('No video URL in response:', result);
      }
    } catch (error: any) {
      console.error('Subtitle generation failed:', error);
      
      // Check if it's a credit error
      if (!handleApiError(error)) {
        // Not a credit error, show generic error
        alert('Failed to generate subtitles. Please try again.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const openDebugAnalysis = async (videoId: string) => {
    try {
      console.log('Loading debug analysis for video:', videoId);
      
      // Fetch detailed subtitle data from the debug endpoint
      const response = await fetch(`/api/subtitles/debug/${videoId}`, {
        method: 'GET',
        credentials: 'include', // Use cookies for auth instead
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch debug data: ${response.statusText}`);
      }

      const debugInfo = await response.json();
      console.log('Debug data loaded:', debugInfo);

      setDebugData(prev => ({
        ...prev,
        [videoId]: debugInfo
      }));
      
      setCurrentDebugVideoId(videoId);
      setShowDebugModal(true);
    } catch (error) {
      console.error('Failed to load debug analysis:', error);
      alert('Failed to load debug analysis. Please try again.');
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold font-poppins">Auto Subtitles</h1>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <div className="flex flex-col gap-4 mb-8">
            <h2 className="text-2xl font-bold font-poppins">
              Auto Subtitle Generation
            </h2>
            <p className="text-muted-foreground">
              Upload a video and generate accurate subtitles using AI speech recognition
            </p>
          </div>

          {/* URL Upload Section */}
          <VideoUrlUpload
            processType="subtitles"
            options={subtitleOptions}
            onUploadSuccess={(video) => {
              setVideos(prev => [video, ...prev]);
            }}
            onUploadStart={() => {
              setUploading(true);
            }}
            showPreview={true}
            className="mb-4"
          />

          {/* File Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <Button
                onClick={() => setShowVideoSelector(true)}
                disabled={uploading}
                size="lg"
                className="gap-2"
              >
                <Upload className="w-5 h-5" />
                {uploading ? 'Uploading...' : 'Select Video'}
              </Button>
              <p className="text-sm text-muted-foreground">
                Choose from My Clips or upload a new video
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: MP4, MOV, AVI, WebM (Max: 500MB)
              </p>
            </div>
          </div>

          {videos.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Your Videos</h3>
              <div className="space-y-4">
                {videos.map((video) => (
                  <div key={video.id} className="border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{video.originalName}</h4>
                      <p className="text-sm text-muted-foreground">
                        Status: {video.status} • Size: {Math.round(video.size / 1024 / 1024)}MB
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {video.status === 'uploaded' && (
                        <>
                          <Button
                            onClick={() => handleConfigureAndGenerate(video.id)}
                            disabled={processing}
                            variant="outline"
                            size="sm"
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Configure & Generate
                          </Button>
                          <button
                            onClick={() => handleGenerateSubtitles(video.id)}
                            disabled={processing}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 py-2"
                          >
                            {processing ? 'Processing...' : 'Quick Generate'}
                          </button>
                        </>
                      )}
                      {video.status === 'processing' && (
                        <div className="text-sm text-blue-600 font-medium px-3 py-2">
                          Processing...
                        </div>
                      )}
                      {video.status === 'completed' && (
                        <div className="text-sm text-green-600 font-medium px-3 py-2">
                          Completed
                        </div>
                      )}
                      {video.status === 'failed' && (
                        <div className="text-sm text-red-600 font-medium px-3 py-2">
                          Failed
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(subtitleResults).length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Generated Subtitles</h3>
              <div className="space-y-6">
                {Object.entries(subtitleResults).map(([videoId, result]) => {
                  const video = videos.find(v => v.id === videoId);
                  return (
                    <div key={videoId} className="border rounded-lg p-6">
                      <h4 className="font-semibold text-lg mb-4">
                        {video?.originalName || 'Video'} - Subtitled Version
                      </h4>
                      
                      {/* Video Player */}
                      <div className="mb-4">
                        <video 
                          controls 
                          className="w-full max-w-2xl rounded-lg"
                          src={result.videoWithSubtitles}
                        >
                          Your browser does not support the video tag.
                        </video>
                      </div>
                      
                      {/* Debug Info */}
                      <div className="mb-4 p-3 bg-gray-100 rounded text-sm">
                        <h6 className="font-semibold mb-1">Debug Info:</h6>
                        <p><strong>Video URL:</strong> {result.videoWithSubtitles}</p>
                        <p><strong>SRT S3 Key:</strong> {result.srtS3Key}</p>
                        <p><strong>Audio S3 Key:</strong> {result.audioS3Key}</p>
                      </div>
                      
                      {/* Download Links */}
                      <div className="flex gap-4 mb-4">
                        {result.videoWithSubtitles && (
                          <a 
                            href={result.videoWithSubtitles}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                          >
                            Preview Video with Subtitles
                          </a>
                        )}
                        
                        {result.videoWithSubtitles && (
                          <button
                            onClick={() => {
                              try {
                                console.log('Video URL:', result.videoWithSubtitles); // Debug log
                                
                                if (!result.videoWithSubtitles) {
                                  alert('No video available to download');
                                  return;
                                }
                                
                                const link = document.createElement('a');
                                link.href = result.videoWithSubtitles;
                                link.download = `${video?.originalName?.replace(/\.[^/.]+$/, "") || 'video'}_with_subtitles.mp4`;
                                link.target = '_blank'; // Open in new tab as fallback
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                console.log('Video download initiated successfully');
                              } catch (error) {
                                console.error('Video download failed:', error);
                                alert('Failed to download video. Please try the preview link instead.');
                              }
                            }}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-green-600 text-white hover:bg-green-700 h-9 px-4 py-2"
                          >
                            Download Video
                          </button>
                        )}
                        
                        {result.srtContent && (
                          <button
                            onClick={() => {
                              try {
                                console.log('SRT Content:', result.srtContent); // Debug log
                                console.log('SRT Content length:', result.srtContent?.length); // Debug log
                                
                                if (!result.srtContent || result.srtContent.trim().length === 0) {
                                  alert('No subtitle content available to download');
                                  return;
                                }
                                
                                const blob = new Blob([result.srtContent], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${video?.originalName?.replace(/\.[^/.]+$/, "") || 'subtitles'}.srt`;
                                document.body.appendChild(a); // Add to DOM for better compatibility
                                a.click();
                                document.body.removeChild(a); // Clean up
                                URL.revokeObjectURL(url);
                                console.log('SRT download initiated successfully');
                              } catch (error) {
                                console.error('SRT download failed:', error);
                                alert('Failed to download SRT file. Please try again.');
                              }
                            }}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                          >
                            Download SRT File
                          </button>
                        )}
                        
                        {result.srtS3Key && (
                          <button
                            onClick={async () => {
                              try {
                                console.log('Fetching SRT from S3 key:', result.srtS3Key);
                                // Try to construct S3 URL from the video URL pattern
                                const baseUrl = result.videoWithSubtitles?.split('/videos/')[0];
                                const srtUrl = baseUrl ? `${baseUrl}/${result.srtS3Key}` : null;
                                
                                if (srtUrl) {
                                  console.log('Constructed SRT URL:', srtUrl);
                                  const link = document.createElement('a');
                                  link.href = srtUrl;
                                  link.download = `${video?.originalName?.replace(/\.[^/.]+$/, "") || 'subtitles'}.srt`;
                                  link.target = '_blank';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                } else {
                                  alert('Unable to construct direct download URL');
                                }
                              } catch (error) {
                                console.error('Direct SRT download failed:', error);
                                alert('Direct download failed. Please try the other download button.');
                              }
                            }}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
                          >
                            Download SRT (Direct)
                          </button>
                        )}
                      </div>
                      
                      {/* Subtitle Preview */}
                      {result.segments && result.segments.length > 0 && (
                        <div className="mt-4">
                          <h5 className="font-medium mb-2">Subtitle Preview:</h5>
                          <div className="max-h-40 overflow-y-auto bg-gray-50 p-3 rounded text-sm">
                            {result.segments.slice(0, 5).map((segment: any, idx: number) => (
                              <div key={idx} className="mb-2">
                                <span className="text-gray-500 text-xs">
                                  {Math.floor(segment.startTime)}s - {Math.floor(segment.endTime)}s:
                                </span>
                                <span className="ml-2">{segment.text}</span>
                              </div>
                            ))}
                            {result.segments.length > 5 && (
                              <div className="text-gray-500 text-xs">...and {result.segments.length - 5} more segments</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Debug Analysis Button */}
                      <div className="mt-4">
                        <button
                          onClick={() => openDebugAnalysis(videoId)}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-9 px-4 py-2"
                        >
                          🔍 Debug Subtitle Accuracy
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SidebarInset>

      {/* Debug Analysis Modal */}
      {showDebugModal && currentDebugVideoId && debugData[currentDebugVideoId] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="border-b p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">🔍 Subtitle Debug Analysis</h2>
                <p className="text-sm text-gray-600">
                  {debugData[currentDebugVideoId]?.video?.originalName || 'Unknown Video'}
                </p>
              </div>
              <button
                onClick={() => setShowDebugModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Video Section */}
              <div className="w-1/2 p-4 border-r">
                <h3 className="font-semibold mb-3">📺 Video with Subtitles</h3>
                {subtitleResults[currentDebugVideoId]?.videoWithSubtitles && (
                  <video 
                    controls 
                    className="w-full rounded-lg mb-4"
                    src={subtitleResults[currentDebugVideoId].videoWithSubtitles}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}

                {/* Statistics */}
                {debugData[currentDebugVideoId]?.statistics && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium mb-2">📊 Statistics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Total Segments: {debugData[currentDebugVideoId].statistics.totalSegments}</div>
                      <div>Total Words: {debugData[currentDebugVideoId].statistics.totalWords}</div>
                      <div>Avg Confidence: {(debugData[currentDebugVideoId].statistics.averageConfidence * 100).toFixed(1)}%</div>
                      <div>Avg Duration: {debugData[currentDebugVideoId].statistics.averageSegmentDuration.toFixed(1)}s</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Subtitle Analysis Section */}
              <div className="w-1/2 p-4 flex flex-col">
                <h3 className="font-semibold mb-3">📝 Detailed Subtitle Analysis</h3>
                
                <div className="flex-1 overflow-y-auto space-y-2">
                  {debugData[currentDebugVideoId]?.subtitles?.map((subtitle: any, index: number) => (
                    <div key={subtitle.id} className="border rounded-lg p-3 bg-gray-50">
                      {/* Subtitle Header */}
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium text-blue-600">
                          Segment #{subtitle.index}
                        </div>
                        <div className="text-xs text-gray-500">
                          {subtitle.formattedStartTime} → {subtitle.formattedEndTime}
                        </div>
                      </div>

                      {/* Subtitle Text */}
                      <div className="mb-2">
                        <div className="font-medium text-gray-800 wrap-break-word">
                          "{subtitle.text}"
                        </div>
                      </div>

                      {/* Subtitle Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>
                          <span className="font-medium">Confidence:</span> 
                          <span className={`ml-1 ${subtitle.confidence > 0.8 ? 'text-green-600' : subtitle.confidence > 0.6 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {(subtitle.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Duration:</span> {subtitle.formattedDuration}
                        </div>
                        <div>
                          <span className="font-medium">Words:</span> {subtitle.wordCount}
                        </div>
                        <div>
                          <span className="font-medium">WPM:</span> {subtitle.wordsPerMinute}
                        </div>
                      </div>

                      {/* Low Confidence Warning */}
                      {subtitle.confidence < 0.6 && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
                          ⚠️ Low confidence - may be inaccurate
                        </div>
                      )}

                      {/* Unusual Speed Warning */}
                      {(subtitle.wordsPerMinute > 200 || subtitle.wordsPerMinute < 50) && subtitle.wordCount > 2 && (
                        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-700">
                          ⚡ Unusual speech rate: {subtitle.wordsPerMinute} WPM
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const data = debugData[currentDebugVideoId];
                        const debugReport = `SUBTITLE DEBUG REPORT
Video: ${data.video?.originalName || 'Unknown'}
Generated: ${new Date().toISOString()}

STATISTICS:
- Total Segments: ${data.statistics?.totalSegments || 0}
- Total Words: ${data.statistics?.totalWords || 0}
- Average Confidence: ${((data.statistics?.averageConfidence || 0) * 100).toFixed(1)}%
- Average Segment Duration: ${(data.statistics?.averageSegmentDuration || 0).toFixed(1)}s

DETAILED ANALYSIS:
${data.subtitles?.map((sub: any, i: number) => 
  `${i + 1}. [${sub.formattedStartTime} → ${sub.formattedEndTime}] (${(sub.confidence * 100).toFixed(1)}%)
     "${sub.text}"
     Words: ${sub.wordCount}, WPM: ${sub.wordsPerMinute}, Duration: ${sub.formattedDuration}`
).join('\n') || 'No subtitles found'}`;

                        const blob = new Blob([debugReport], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `subtitle_debug_report_${currentDebugVideoId}.txt`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      📄 Export Report
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('This will regenerate subtitles with enhanced settings. Continue?')) {
                          setShowDebugModal(false);
                          handleGenerateSubtitles(currentDebugVideoId);
                        }
                      }}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      🔄 Regenerate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Credit Exhausted Dialog */}
      <CreditExhaustedDialog
        open={creditError.show}
        onOpenChange={hideCreditError}
        message={creditError.message}
      />
      
      {/* Subtitle Configuration Panel */}
      {showConfiguration && selectedVideoId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <SubtitleConfigurationPanel
              subtitleOptions={subtitleOptions}
              onOptionsChange={setSubtitleOptions}
              onApplyTheme={(theme) => {
                setSubtitleOptions({
                  ...subtitleOptions,
                  style: { ...subtitleOptions.style, ...theme.style }
                });
              }}
              onBack={() => setShowConfiguration(false)}
              onGenerate={() => handleGenerateSubtitles(selectedVideoId)}
            />
          </div>
        </div>
      )}
      
      {/* Video Selector Modal - My Clips + Upload */}
      <VideoSelectorModal
        isOpen={showVideoSelector}
        onClose={() => setShowVideoSelector(false)}
        onSelect={handleVideoSelect}
        acceptedFileTypes="video/*"
        maxFileSize={500}
      />
    </SidebarProvider>
  );
}