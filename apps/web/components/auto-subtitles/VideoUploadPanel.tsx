'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileVideo, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type UploadStage = 'idle' | 'configuring' | 'uploading' | 'processing' | 'completed' | 'error';

interface VideoUploadPanelProps {
  selectedFile: File | null;
  uploadStage: UploadStage;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
  onConfigure: () => void;
  availableLanguages: Array<{ code: string; name: string; priority: number }>;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
}

export function VideoUploadPanel({
  selectedFile,
  uploadStage,
  onFileSelect,
  onReset,
  onConfigure,
  availableLanguages,
  selectedLanguage,
  onLanguageChange
}: VideoUploadPanelProps) {
  return (
    <Card className="h-full border-2 border-dashed border-gray-600 hover:border-blue-400 transition-colors duration-300">
      <CardHeader>
        <CardTitle className="text-center text-lg">
          Upload Video
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center space-y-4"
            >
              <motion.div
                className="w-16 h-16 mx-auto rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Upload className="w-8 h-8 text-blue-400" />
              </motion.div>
              
              <h3 className="text-lg font-semibold">Choose a video file</h3>
              <p className="text-muted-foreground text-sm">
                Support for MP4, MOV, AVI formats
              </p>

              {/* Language Selection */}
              <div className="space-y-2 text-left">
                <label htmlFor="language-select" className="text-sm font-medium">
                  Video Language
                </label>
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Auto-detect (slower, tests multiple languages)</option>
                  {availableLanguages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name} ({lang.code})
                    </option>
                  ))}
                </select>
              </div>
            
              <input
                type="file"
                accept="video/*"
                onChange={onFileSelect}
                className="hidden"
                id="video-upload"
              />
              
              <label htmlFor="video-upload">
                <Button 
                  asChild
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 cursor-pointer"
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Select File
                  </span>
                </Button>
              </label>
              
              <p className="text-xs text-muted-foreground">
                Maximum: 500MB
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="selected"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* File Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="w-12 h-12 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                  <FileVideo className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm truncate">{selectedFile.name}</h4>
                  <p className="text-muted-foreground text-xs">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  onClick={onReset}
                  disabled={uploadStage === 'uploading' || uploadStage === 'processing'}
                  size="sm"
                >
                  Change File
                </Button>
                <Button 
                  onClick={onConfigure}
                  disabled={uploadStage === 'uploading' || uploadStage === 'processing'}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}