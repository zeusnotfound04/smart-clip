'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  FileVideo, 
  Play, 
  Download, 
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertCircle,
  Subtitles,
  Sparkles,
  Settings,
  Palette,
  Type,
  Languages
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/lib/auth-context';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { apiClient } from '@/lib/api-client';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type UploadStage = 'idle' | 'configuring' | 'uploading' | 'processing' | 'completed' | 'error';

interface VideoData {
  id: string;
  name: string;
  size: number;
  filePath: string;
  subtitles?: string;
  detectedLanguages?: string[];
}

interface SubtitleStyle {
  textCase: 'normal' | 'uppercase' | 'lowercase' | 'capitalize';
  fontFamily: string;
  fontSize: number;
  primaryColor: string;
  outlineColor: string;
  backgroundColor: string;
  bold: boolean;
  italic: boolean;
}

interface SubtitleOptions {
  detectAllLanguages: boolean;
  style: SubtitleStyle;
}

const FONT_FAMILIES = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Comic Sans MS', label: 'Comic Sans MS' }
];

const STYLE_THEMES = [
  {
    name: 'Classic White',
    style: {
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      backgroundColor: '#000000',
      fontFamily: 'Arial',
      fontSize: 20,
      bold: false,
      italic: false
    }
  },
  {
    name: 'Bold Yellow',
    style: {
      primaryColor: '#FFFF00',
      outlineColor: '#000000',
      backgroundColor: '#000000',
      fontFamily: 'Arial',
      fontSize: 22,
      bold: true,
      italic: false
    }
  },
  {
    name: 'Netflix Red',
    style: {
      primaryColor: '#E50914',
      outlineColor: '#FFFFFF',
      backgroundColor: '#000000',
      fontFamily: 'Helvetica',
      fontSize: 24,
      bold: true,
      italic: false
    }
  },
  {
    name: 'Elegant Blue',
    style: {
      primaryColor: '#4A90E2',
      outlineColor: '#FFFFFF',
      backgroundColor: '#000000',
      fontFamily: 'Georgia',
      fontSize: 18,
      bold: false,
      italic: true
    }
  }
];

export default function AutoSubtitlesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState<string>('');
  
  const [subtitleOptions, setSubtitleOptions] = useState<SubtitleOptions>({
    detectAllLanguages: true,
    style: {
      textCase: 'normal',
      fontFamily: 'Arial',
      fontSize: 20,
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      backgroundColor: '#000000',
      bold: false,
      italic: false
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const proceedToConfiguration = () => {
    setUploadStage('configuring');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadStage('uploading');
      setUploadProgress(0);
      setError('');

      const video = await apiClient.uploadVideo(selectedFile, (progress) => {
        setUploadProgress(progress);
      });
      setVideoData({
        id: video.id,
        name: video.originalName || selectedFile.name,
        size: selectedFile.size,
        filePath: video.filePath
      });

      setUploadStage('processing');
      setProcessingProgress(0);

      // Simulate processing progress
      const progressInterval = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 1000);

      const subtitleResult = await apiClient.generateSubtitles(video.id, subtitleOptions);
      clearInterval(progressInterval);
      setProcessingProgress(100);

      setVideoData(prev => prev ? { 
        ...prev, 
        subtitles: 'Generated successfully',
        detectedLanguages: subtitleResult.detectedLanguages || []
      } : null);
      setUploadStage('completed');

    } catch (error: any) {
      setError(error.message || 'Failed to process video');
      setUploadStage('error');
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setVideoData(null);
    setUploadStage('idle');
    setUploadProgress(0);
    setProcessingProgress(0);
    setError('');
  };

  const getStageIcon = (stage: UploadStage) => {
    switch (stage) {
      case 'uploading': return <Upload className="w-5 h-5 text-blue-500" />;
      case 'processing': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Subtitles className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStageText = (stage: UploadStage) => {
    switch (stage) {
      case 'configuring': return 'Configure options';
      case 'uploading': return 'Uploading video...';
      case 'processing': return 'Generating subtitles...';
      case 'completed': return 'Subtitles generated!';
      case 'error': return 'Processing failed';
      default: return 'Ready to process';
    }
  };

  const applyStyleTheme = (theme: typeof STYLE_THEMES[0]) => {
    setSubtitleOptions(prev => ({
      ...prev,
      style: {
        ...prev.style,
        ...theme.style
      }
    }));
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center gap-4 border-b p-4 bg-background/95 backdrop-blur-sm">
        <SidebarTrigger />
        <Button
          variant="ghost"
          onClick={() => router.push('/choose-feature')}
          className="gap-2 hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Features
        </Button>
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-linear-to-r from-blue-500 to-cyan-500 flex items-center justify-center">
              <Subtitles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Auto Subtitles</h1>
              <p className="text-muted-foreground text-sm">
                Generate accurate subtitles using AI speech recognition
              </p>
            </div>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Upload Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="border-2 border-dashed border-gray-600 hover:border-blue-400 transition-colors duration-300">
              <CardHeader>
                <CardTitle className="text-center text-2xl">Upload Your Video</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <AnimatePresence mode="wait">
                  {!selectedFile ? (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="text-center"
                    >
                      <motion.div
                        className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Upload className="w-12 h-12 text-blue-400" />
                      </motion.div>
                      
                      <h3 className="text-xl font-semibold mb-2">Choose a video file</h3>
                      <p className="text-muted-foreground mb-6">
                        Support for MP4, MOV, AVI and other video formats
                      </p>
                      
                      <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="video-upload"
                      />
                      
                      <label htmlFor="video-upload">
                        <Button 
                          asChild
                          size="lg"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg cursor-pointer"
                        >
                          <span>
                            <Upload className="w-5 h-5 mr-2" />
                            Select Video File
                          </span>
                        </Button>
                      </label>
                      
                      <p className="text-sm text-muted-foreground mt-4">
                        Maximum file size: 500MB
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="selected"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      {/* File Info */}
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                        <div className="w-16 h-16 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                          <FileVideo className="w-8 h-8 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{selectedFile.name}</h4>
                          <p className="text-muted-foreground">
                            Size: {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        </div>
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                          className="w-12 h-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 flex items-center justify-center"
                        >
                          <Sparkles className="w-6 h-6 text-blue-400" />
                        </motion.div>
                      </div>

                      <div className="flex gap-4 justify-center">
                        <Button 
                          variant="outline" 
                          onClick={resetUpload}
                          disabled={uploadStage === 'uploading' || uploadStage === 'processing'}
                          className="px-6"
                        >
                          Change File
                        </Button>
                        <Button 
                          onClick={proceedToConfiguration}
                          disabled={uploadStage === 'uploading' || uploadStage === 'processing'}
                          size="lg"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                        >
                          <Settings className="w-5 h-5 mr-2" />
                          Configure Subtitles
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.section>

          {/* Configuration Section */}
          <AnimatePresence>
            {uploadStage === 'configuring' && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6 }}
              >
                <Card className="border-2 border-blue-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Settings className="w-6 h-6" />
                      Subtitle Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    {/* Language Options */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Languages className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold">Language Detection</h3>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Switch
                          id="detect-all-languages"
                          checked={subtitleOptions.detectAllLanguages}
                          onCheckedChange={(checked) => 
                            setSubtitleOptions(prev => ({ ...prev, detectAllLanguages: checked }))
                          }
                        />
                        <Label htmlFor="detect-all-languages" className="text-sm">
                          Detect and include all languages in the video
                        </Label>
                      </div>
                      <p className="text-sm text-muted-foreground ml-8">
                        When enabled, subtitles will be generated for Hindi, Urdu, English and other detected languages
                      </p>
                    </div>

                    {/* Text Style Options */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Type className="w-5 h-5 text-green-400" />
                        <h3 className="text-lg font-semibold">Text Styling</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Text Case</Label>
                          <Select
                            value={subtitleOptions.style.textCase}
                            onValueChange={(value: 'normal' | 'uppercase' | 'lowercase' | 'capitalize') =>
                              setSubtitleOptions(prev => ({
                                ...prev,
                                style: { ...prev.style, textCase: value }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal Text</SelectItem>
                              <SelectItem value="uppercase">UPPERCASE</SelectItem>
                              <SelectItem value="lowercase">lowercase</SelectItem>
                              <SelectItem value="capitalize">Capitalize Words</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Font Family</Label>
                          <Select
                            value={subtitleOptions.style.fontFamily}
                            onValueChange={(value) =>
                              setSubtitleOptions(prev => ({
                                ...prev,
                                style: { ...prev.style, fontFamily: value }
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {FONT_FAMILIES.map((font) => (
                                <SelectItem key={font.value} value={font.value}>
                                  {font.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Font Size</Label>
                          <Input
                            type="number"
                            min="12"
                            max="48"
                            value={subtitleOptions.style.fontSize}
                            onChange={(e) =>
                              setSubtitleOptions(prev => ({
                                ...prev,
                                style: { ...prev.style, fontSize: parseInt(e.target.value) || 20 }
                              }))
                            }
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Style Options</Label>
                          <div className="flex gap-4">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="bold"
                                checked={subtitleOptions.style.bold}
                                onCheckedChange={(checked) =>
                                  setSubtitleOptions(prev => ({
                                    ...prev,
                                    style: { ...prev.style, bold: checked }
                                  }))
                                }
                              />
                              <Label htmlFor="bold" className="text-sm">Bold</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="italic"
                                checked={subtitleOptions.style.italic}
                                onCheckedChange={(checked) =>
                                  setSubtitleOptions(prev => ({
                                    ...prev,
                                    style: { ...prev.style, italic: checked }
                                  }))
                                }
                              />
                              <Label htmlFor="italic" className="text-sm">Italic</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Color Options */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-semibold">Colors & Themes</h3>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {STYLE_THEMES.map((theme, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => applyStyleTheme(theme)}
                            className="h-auto p-3 flex flex-col items-center gap-2 hover:bg-white/10"
                          >
                            <div className="w-8 h-8 rounded" style={{ backgroundColor: theme.style.primaryColor }} />
                            <span className="text-xs">{theme.name}</span>
                          </Button>
                        ))}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Text Color</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={subtitleOptions.style.primaryColor}
                              onChange={(e) =>
                                setSubtitleOptions(prev => ({
                                  ...prev,
                                  style: { ...prev.style, primaryColor: e.target.value }
                                }))
                              }
                              className="w-12 h-8 p-0 border-none"
                            />
                            <Input
                              type="text"
                              value={subtitleOptions.style.primaryColor}
                              onChange={(e) =>
                                setSubtitleOptions(prev => ({
                                  ...prev,
                                  style: { ...prev.style, primaryColor: e.target.value }
                                }))
                              }
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Outline Color</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={subtitleOptions.style.outlineColor}
                              onChange={(e) =>
                                setSubtitleOptions(prev => ({
                                  ...prev,
                                  style: { ...prev.style, outlineColor: e.target.value }
                                }))
                              }
                              className="w-12 h-8 p-0 border-none"
                            />
                            <Input
                              type="text"
                              value={subtitleOptions.style.outlineColor}
                              onChange={(e) =>
                                setSubtitleOptions(prev => ({
                                  ...prev,
                                  style: { ...prev.style, outlineColor: e.target.value }
                                }))
                              }
                              className="flex-1"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Background</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={subtitleOptions.style.backgroundColor}
                              onChange={(e) =>
                                setSubtitleOptions(prev => ({
                                  ...prev,
                                  style: { ...prev.style, backgroundColor: e.target.value }
                                }))
                              }
                              className="w-12 h-8 p-0 border-none"
                            />
                            <Input
                              type="text"
                              value={subtitleOptions.style.backgroundColor}
                              onChange={(e) =>
                                setSubtitleOptions(prev => ({
                                  ...prev,
                                  style: { ...prev.style, backgroundColor: e.target.value }
                                }))
                              }
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Preview</Label>
                      <div className="bg-black p-6 rounded-lg text-center relative">
                        <span 
                          style={{
                            fontFamily: subtitleOptions.style.fontFamily,
                            fontSize: `${subtitleOptions.style.fontSize}px`,
                            color: subtitleOptions.style.primaryColor,
                            fontWeight: subtitleOptions.style.bold ? 'bold' : 'normal',
                            fontStyle: subtitleOptions.style.italic ? 'italic' : 'normal',
                            textShadow: `1px 1px 1px ${subtitleOptions.style.outlineColor}`,
                            backgroundColor: subtitleOptions.style.backgroundColor + '40',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}
                        >
                          Sample Subtitle Text
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 justify-center pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setUploadStage('idle')}
                        className="px-6"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                      </Button>
                      <Button 
                        onClick={handleUpload}
                        size="lg"
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                      >
                        <Subtitles className="w-5 h-5 mr-2" />
                        Generate Subtitles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Progress Section */}
          <AnimatePresence>
            {(uploadStage === 'uploading' || uploadStage === 'processing') && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-gray-900/50 border border-gray-700">
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Upload Progress */}
                      {uploadStage === 'uploading' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-blue-400 font-medium">Uploading to cloud storage...</span>
                            <span className="text-blue-400 font-mono">{Math.round(uploadProgress)}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-3" />
                        </div>
                      )}

                      {/* Processing Progress */}
                      {uploadStage === 'processing' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-yellow-400 font-medium">Generating subtitles with AI...</span>
                            <span className="text-yellow-400 font-mono">{Math.round(processingProgress)}%</span>
                          </div>
                          <Progress value={processingProgress} className="h-3" />
                        </div>
                      )}

                      {/* Status Message */}
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5"
                        >
                          {getStageIcon(uploadStage)}
                        </motion.div>
                        <span>{getStageText(uploadStage)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Results Section */}
          <AnimatePresence>
            {uploadStage === 'completed' && videoData && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="bg-green-950/30 border border-green-500/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-400">
                      <CheckCircle className="w-6 h-6" />
                      Subtitles Generated Successfully!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Video Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">File Name:</span>
                            <span>{videoData.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">File Size:</span>
                            <span>{(videoData.size / (1024 * 1024)).toFixed(1)} MB</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="text-green-400">Processing Complete</span>
                          </div>
                          {videoData.detectedLanguages && videoData.detectedLanguages.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Detected Languages:</span>
                              <span className="text-blue-400">
                                {videoData.detectedLanguages.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-lg">Actions</h4>
                        <div className="space-y-2">
                          <Button className="w-full" variant="outline">
                            <Play className="w-4 h-4 mr-2" />
                            Preview Video
                          </Button>
                          <Button className="w-full bg-green-600 hover:bg-green-700">
                            <Download className="w-4 h-4 mr-2" />
                            Download Subtitles
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Error Section */}
          <AnimatePresence>
            {uploadStage === 'error' && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-red-950/30 border border-red-500/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertCircle className="w-6 h-6 text-red-400" />
                      <h3 className="text-lg font-semibold text-red-400">Processing Failed</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button 
                      onClick={resetUpload}
                      variant="outline"
                      className="border-red-500/30 hover:bg-red-500/10"
                    >
                      Try Again
                    </Button>
                  </CardContent>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}