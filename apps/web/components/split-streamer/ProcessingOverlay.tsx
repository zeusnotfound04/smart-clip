'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RotateCcw, Upload, Cog, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProcessingOverlayProps {
  processingStage: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  uploadProgress: { webcam: number; gameplay: number };
  processingProgress: number;
  error: string;
  onRetry: () => void;
}

export function ProcessingOverlay({
  processingStage,
  uploadProgress,
  processingProgress,
  error,
  onRetry
}: ProcessingOverlayProps) {
  const showOverlay = processingStage === 'uploading' || processingStage === 'processing' || processingStage === 'error';

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <Card className="w-full max-w-md bg-background/95 backdrop-blur border-white/20">
              <CardContent className="p-6">
                {/* Upload Stage */}
                {processingStage === 'uploading' && (
                  <div className="text-center space-y-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto"
                    >
                      <Upload className="w-8 h-8 text-blue-400" />
                    </motion.div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">Uploading Videos</h3>
                      <p className="text-muted-foreground">Please wait while we upload your videos...</p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Webcam Video</span>
                          <span>{Math.round(uploadProgress.webcam)}%</span>
                        </div>
                        <Progress value={uploadProgress.webcam} className="h-2" />
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Gameplay Video</span>
                          <span>{Math.round(uploadProgress.gameplay)}%</span>
                        </div>
                        <Progress value={uploadProgress.gameplay} className="h-2" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Processing Stage */}
                {processingStage === 'processing' && (
                  <div className="text-center space-y-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto"
                    >
                      <Cog className="w-8 h-8 text-purple-400" />
                    </motion.div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold">Combining Videos</h3>
                      <p className="text-muted-foreground">Creating your split-screen video...</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Processing</span>
                        <span>{Math.round(processingProgress)}%</span>
                      </div>
                      <Progress value={processingProgress} className="h-3" />
                    </div>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Analyzing video dimensions</p>
                      <p>• Applying layout configuration</p>
                      <p>• Rendering split-screen video</p>
                      <p>• Optimizing for mobile playback</p>
                    </div>
                  </div>
                )}

                {/* Error Stage */}
                {processingStage === 'error' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-semibold text-red-400">Processing Failed</h3>
                      <p className="text-muted-foreground">{error || 'An unexpected error occurred'}</p>
                    </div>

                    <Button onClick={onRetry} className="w-full">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}