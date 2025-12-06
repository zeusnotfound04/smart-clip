'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DownloadButtonProps {
  s3Url: string;
  fileName: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'destructive' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
  onDownloadError?: (error: Error) => void;
}

export function DownloadButton({
  s3Url,
  fileName,
  variant = 'default',
  size = 'default',
  className = '',
  showIcon = true,
  children,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError,
}: DownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const downloadFile = async () => {
    try {
      setDownloading(true);
      onDownloadStart?.();

      // Fetch the file
      const response = await fetch(s3Url);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup
      window.URL.revokeObjectURL(url);

      onDownloadComplete?.();
    } catch (error) {
      console.error('Download failed:', error);
      const err = error instanceof Error ? error : new Error('Download failed');
      onDownloadError?.(err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      onClick={downloadFile}
      disabled={downloading}
      variant={variant}
      size={size}
      className={className}
    >
      {downloading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : showIcon ? (
        <Download className="w-4 h-4 mr-2" />
      ) : null}
      {downloading ? 'Downloading...' : children || 'Download'}
    </Button>
  );
}

interface DownloadButtonWithProgressProps extends DownloadButtonProps {
  showProgress?: boolean;
}

export function DownloadButtonWithProgress({
  s3Url,
  fileName,
  variant = 'default',
  size = 'default',
  className = '',
  showIcon = true,
  showProgress = true,
  children,
  onDownloadStart,
  onDownloadComplete,
  onDownloadError,
}: DownloadButtonWithProgressProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadFile = async () => {
    try {
      setDownloading(true);
      setProgress(0);
      onDownloadStart?.();

      const response = await fetch(s3Url);
      if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const contentLength = +(response.headers.get('Content-Length') || 0);

      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      let receivedLength = 0;
      const chunks: BlobPart[] = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        // Update progress
        if (contentLength > 0) {
          const percent = Math.round((receivedLength / contentLength) * 100);
          setProgress(percent);
        }
      }

      // Create blob and download
      const blob = new Blob(chunks);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onDownloadComplete?.();
    } catch (error) {
      console.error('Download failed:', error);
      const err = error instanceof Error ? error : new Error('Download failed');
      onDownloadError?.(err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={downloadFile}
        disabled={downloading}
        variant={variant}
        size={size}
        className={className}
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : showIcon ? (
          <Download className="w-4 h-4 mr-2" />
        ) : null}
        {downloading && progress > 0
          ? `Downloading... ${progress}%`
          : downloading
          ? 'Downloading...'
          : children || 'Download'}
      </Button>

      {downloading && showProgress && progress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Simple download utility function
export const downloadFromS3 = async (s3Url: string, fileName: string) => {
  try {
    const response = await fetch(s3Url);
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.setAttribute('target', '_blank');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};
