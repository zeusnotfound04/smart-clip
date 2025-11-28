'use client';

import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function VideoGenerationPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new phased video generation page
    router.push('/video-generation-v2');
  }, [router]);

  if (!user) {
    router.push('/auth/signin');
    return null;
  }

  // Show loading while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
        <p className="text-muted-foreground">Redirecting to new video generation...</p>
      </div>
    </div>
  );
}