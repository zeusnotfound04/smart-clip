"use client";

import { useAuth } from "@/lib/auth-context";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useState, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export default function AutoSubtitlesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await apiClient.uploadVideo(file);
      setVideos(prev => [result.video, ...prev]);
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

  const handleGenerateSubtitles = async (videoId: string) => {
    setProcessing(true);
    try {
      await apiClient.generateSubtitles(videoId);
      alert('Subtitle generation started! This may take a few minutes.');
    } catch (error) {
      console.error('Subtitle generation failed:', error);
      alert('Failed to generate subtitles. Please try again.');
    } finally {
      setProcessing(false);
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

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileUpload}
              className="hidden"
              id="video-upload"
            />
            <label
              htmlFor="video-upload"
              className={`cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {uploading ? 'Uploading...' : 'Upload Video'}
            </label>
            <p className="text-sm text-muted-foreground mt-2">
              Supported formats: MP4, MOV, AVI, WebM (Max: 500MB)
            </p>
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
                        <button
                          onClick={() => handleGenerateSubtitles(video.id)}
                          disabled={processing}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 py-2"
                        >
                          {processing ? 'Processing...' : 'Generate Subtitles'}
                        </button>
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
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}