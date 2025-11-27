'use client';

import Link from 'next/link';
import { ArrowLeft, Scissors, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ViewMode } from '@/types/smart-clipper';

interface SmartClipperHeaderProps {
  currentView: ViewMode;
  loading: boolean;
}

const getViewTitle = (view: ViewMode): string => {
  switch (view) {
    case 'upload': return 'Upload Video';
    case 'configure': return 'Configure Analysis';
    case 'timeline': return 'Video Timeline';
    case 'preview': return 'Preview Segments';
    case 'dashboard': return 'Project Dashboard';
    default: return 'Smart Clipper';
  }
};

export function SmartClipperHeader({ currentView, loading }: SmartClipperHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-3">
          <Scissors className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Smart Clipper</h1>
            <p className="text-sm text-muted-foreground">{getViewTitle(currentView)}</p>
          </div>
        </div>
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </div>
      )}
    </div>
  );
}