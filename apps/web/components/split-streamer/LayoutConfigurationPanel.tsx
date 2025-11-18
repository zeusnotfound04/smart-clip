'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2, 
  RotateCcw, 
  Smartphone, 
  Monitor, 
  ArrowUpDown,
  Palette,
  Layout,
  Sliders,
  CornerUpLeft,
  Shuffle,
  Zap,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Focus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface LayoutConfig {
  orientation: 'vertical' | 'horizontal';
  topRatio: number;
  bottomRatio: number;
  gap: number;
  backgroundColor: string;
  cornerRadius: number;
  swapVideos: boolean;
  webcamZoom: number;
  gameplayZoom: number;
}

interface LayoutConfigurationPanelProps {
  layoutConfig: LayoutConfig;
  onConfigChange: (config: LayoutConfig) => void;
  disabled: boolean;
}

const presetLayouts = [
  {
    name: 'TikTok Style',
    description: '50/50 vertical split',
    icon: Smartphone,
    config: {
      orientation: 'vertical' as const,
      topRatio: 50,
      bottomRatio: 50,
      gap: 4,
      backgroundColor: '#000000',
      cornerRadius: 8,
      swapVideos: false,
      webcamZoom: 1,
      gameplayZoom: 1
    }
  },
  {
    name: 'Reaction Focus',
    description: '60% webcam, 40% gameplay',
    icon: Sparkles,
    config: {
      orientation: 'vertical' as const,
      topRatio: 60,
      bottomRatio: 40,
      gap: 4,
      backgroundColor: '#000000',
      cornerRadius: 12,
      swapVideos: false,
      webcamZoom: 1,
      gameplayZoom: 1
    }
  },
  {
    name: 'Gameplay Focus',
    description: '30% webcam, 70% gameplay',
    icon: Zap,
    config: {
      orientation: 'vertical' as const,
      topRatio: 30,
      bottomRatio: 70,
      gap: 4,
      backgroundColor: '#000000',
      cornerRadius: 8,
      swapVideos: false,
      webcamZoom: 1,
      gameplayZoom: 1
    }
  },
  {
    name: 'Landscape Split',
    description: 'Side-by-side layout',
    icon: Monitor,
    config: {
      orientation: 'horizontal' as const,
      topRatio: 50,
      bottomRatio: 50,
      gap: 4,
      backgroundColor: '#000000',
      cornerRadius: 8,
      swapVideos: false,
      webcamZoom: 1,
      gameplayZoom: 1
    }
  }
];

const backgroundColors = [
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#1a1a1a' },
  { name: 'Blue', value: '#1e3a8a' },
  { name: 'Purple', value: '#581c87' },
  { name: 'Green', value: '#14532d' },
  { name: 'Red', value: '#7f1d1d' }
];

export function LayoutConfigurationPanel({
  layoutConfig,
  onConfigChange,
  disabled
}: LayoutConfigurationPanelProps) {
  const [activeTab, setActiveTab] = useState('layout');

  const updateConfig = (updates: Partial<LayoutConfig>) => {
    const newConfig = { ...layoutConfig, ...updates };
    
    // Ensure ratios add up to 100
    if (updates.topRatio !== undefined) {
      newConfig.bottomRatio = 100 - updates.topRatio;
    } else if (updates.bottomRatio !== undefined) {
      newConfig.topRatio = 100 - updates.bottomRatio;
    }
    
    onConfigChange(newConfig);
  };

  const applyPreset = (preset: typeof presetLayouts[0]) => {
    onConfigChange(preset.config);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Layout Configuration
        </h3>
        <p className="text-sm text-muted-foreground">
          Customize your split-screen layout and styling
        </p>
      </div>

      {/* Configuration Tabs */}
      <div className="flex-1 p-4 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="layout" className="text-xs">
              <Layout className="w-3 h-3 mr-1" />
              Layout
            </TabsTrigger>
            <TabsTrigger value="zoom" className="text-xs">
              <Focus className="w-3 h-3 mr-1" />
              Zoom
            </TabsTrigger>
            <TabsTrigger value="style" className="text-xs">
              <Palette className="w-3 h-3 mr-1" />
              Style
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Presets
            </TabsTrigger>
          </TabsList>

          {/* Layout Tab */}
          <TabsContent value="layout" className="space-y-4 mt-4">
            {/* Orientation */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Orientation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={layoutConfig.orientation === 'vertical' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig({ orientation: 'vertical' })}
                    disabled={disabled}
                    className="flex flex-col h-auto py-3"
                  >
                    <Smartphone className="w-4 h-4 mb-1" />
                    <span className="text-xs">Vertical</span>
                    <span className="text-xs text-muted-foreground">9:16</span>
                  </Button>
                  <Button
                    variant={layoutConfig.orientation === 'horizontal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateConfig({ orientation: 'horizontal' })}
                    disabled={disabled}
                    className="flex flex-col h-auto py-3"
                  >
                    <Monitor className="w-4 h-4 mb-1" />
                    <span className="text-xs">Horizontal</span>
                    <span className="text-xs text-muted-foreground">16:9</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Video Ratios */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Video Ratios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">
                    {layoutConfig.swapVideos ? 'Gameplay' : 'Webcam'} Size: {layoutConfig.topRatio}%
                  </Label>
                  <Slider
                    value={[layoutConfig.topRatio]}
                    onValueChange={(value) => updateConfig({ topRatio: value[0] })}
                    min={20}
                    max={80}
                    step={5}
                    disabled={disabled}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">
                    {layoutConfig.swapVideos ? 'Webcam' : 'Gameplay'} Size: {layoutConfig.bottomRatio}%
                  </Label>
                  <Slider
                    value={[layoutConfig.bottomRatio]}
                    onValueChange={(value) => updateConfig({ bottomRatio: value[0] })}
                    min={20}
                    max={80}
                    step={5}
                    disabled={disabled}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Swap Videos */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Swap Video Positions</Label>
                    <p className="text-xs text-muted-foreground">
                      Put {layoutConfig.swapVideos ? 'webcam on top' : 'gameplay on top'}
                    </p>
                  </div>
                  <Switch
                    checked={layoutConfig.swapVideos}
                    onCheckedChange={(checked) => updateConfig({ swapVideos: checked })}
                    disabled={disabled}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Zoom Tab */}
          <TabsContent value="zoom" className="space-y-4 mt-4">
            {/* Webcam Zoom */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Focus className="w-4 h-4" />
                  Webcam Video Zoom
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Zoom Level</span>
                    <span>{Math.round(layoutConfig.webcamZoom * 100)}%</span>
                  </div>
                  <Slider
                    value={[layoutConfig.webcamZoom]}
                    onValueChange={(value) => updateConfig({ webcamZoom: value[0] })}
                    min={0.5}
                    max={3}
                    step={0.1}
                    disabled={disabled}
                    className="w-full"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateConfig({ webcamZoom: Math.max(0.5, layoutConfig.webcamZoom - 0.1) })}
                    disabled={disabled || layoutConfig.webcamZoom <= 0.5}
                    className="flex-1"
                  >
                    <ZoomOut className="w-3 h-3 mr-1" />
                    Zoom Out
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateConfig({ webcamZoom: Math.min(3, layoutConfig.webcamZoom + 0.1) })}
                    disabled={disabled || layoutConfig.webcamZoom >= 3}
                    className="flex-1"
                  >
                    <ZoomIn className="w-3 h-3 mr-1" />
                    Zoom In
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateConfig({ webcamZoom: 1 })}
                  disabled={disabled}
                  className="w-full text-xs"
                >
                  Reset to 100%
                </Button>
              </CardContent>
            </Card>

            {/* Gameplay Zoom */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Focus className="w-4 h-4" />
                  Gameplay Video Zoom
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Zoom Level</span>
                    <span>{Math.round(layoutConfig.gameplayZoom * 100)}%</span>
                  </div>
                  <Slider
                    value={[layoutConfig.gameplayZoom]}
                    onValueChange={(value) => updateConfig({ gameplayZoom: value[0] })}
                    min={0.5}
                    max={3}
                    step={0.1}
                    disabled={disabled}
                    className="w-full"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateConfig({ gameplayZoom: Math.max(0.5, layoutConfig.gameplayZoom - 0.1) })}
                    disabled={disabled || layoutConfig.gameplayZoom <= 0.5}
                    className="flex-1"
                  >
                    <ZoomOut className="w-3 h-3 mr-1" />
                    Zoom Out
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateConfig({ gameplayZoom: Math.min(3, layoutConfig.gameplayZoom + 0.1) })}
                    disabled={disabled || layoutConfig.gameplayZoom >= 3}
                    className="flex-1"
                  >
                    <ZoomIn className="w-3 h-3 mr-1" />
                    Zoom In
                  </Button>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateConfig({ gameplayZoom: 1 })}
                  disabled={disabled}
                  className="w-full text-xs"
                >
                  Reset to 100%
                </Button>
              </CardContent>
            </Card>

            {/* Quick Zoom Presets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Quick Zoom Presets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateConfig({ webcamZoom: 1.5, gameplayZoom: 1.5 })}
                    disabled={disabled}
                    className="text-xs"
                  >
                    Both 150%
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateConfig({ webcamZoom: 0.8, gameplayZoom: 1.2 })}
                    disabled={disabled}
                    className="text-xs"
                  >
                    Focus Game
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateConfig({ webcamZoom: 1.2, gameplayZoom: 0.8 })}
                    disabled={disabled}
                    className="text-xs"
                  >
                    Focus Face
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateConfig({ webcamZoom: 1, gameplayZoom: 1 })}
                    disabled={disabled}
                    className="text-xs"
                  >
                    Reset All
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style" className="space-y-4 mt-4">
            {/* Background Color */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Background Color</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {backgroundColors.map((color) => (
                    <Button
                      key={color.value}
                      variant="outline"
                      size="sm"
                      onClick={() => updateConfig({ backgroundColor: color.value })}
                      disabled={disabled}
                      className={`h-auto p-2 ${layoutConfig.backgroundColor === color.value ? 'ring-2 ring-primary' : ''}`}
                    >
                      <div className="flex flex-col items-center space-y-1">
                        <div 
                          className="w-6 h-6 rounded border-2 border-white/20"
                          style={{ backgroundColor: color.value }}
                        />
                        <span className="text-xs">{color.name}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Gap Between Videos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Gap Between Videos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Gap Size</span>
                  <span>{layoutConfig.gap}px</span>
                </div>
                <Slider
                  value={[layoutConfig.gap]}
                  onValueChange={(value) => updateConfig({ gap: value[0] })}
                  min={0}
                  max={20}
                  step={2}
                  disabled={disabled}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Corner Radius */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Corner Radius</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Roundness</span>
                  <span>{layoutConfig.cornerRadius}px</span>
                </div>
                <Slider
                  value={[layoutConfig.cornerRadius]}
                  onValueChange={(value) => updateConfig({ cornerRadius: value[0] })}
                  min={0}
                  max={20}
                  step={2}
                  disabled={disabled}
                  className="w-full"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Presets Tab */}
          <TabsContent value="presets" className="space-y-4 mt-4">
            <div className="space-y-3">
              {presetLayouts.map((preset, index) => (
                <motion.div
                  key={preset.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={`cursor-pointer transition-all hover:shadow-md ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => !disabled && applyPreset(preset)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                          <preset.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{preset.name}</h4>
                          <p className="text-xs text-muted-foreground">{preset.description}</p>
                        </div>
                        <Button variant="ghost" size="sm" disabled={disabled}>
                          Apply
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Reset to Default */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  variant="outline"
                  onClick={() => applyPreset(presetLayouts[0])}
                  disabled={disabled}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Default
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border/50 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateConfig({ swapVideos: !layoutConfig.swapVideos })}
            disabled={disabled}
            className="text-xs"
          >
            <Shuffle className="w-3 h-3 mr-1" />
            Swap
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateConfig({ 
              orientation: layoutConfig.orientation === 'vertical' ? 'horizontal' : 'vertical' 
            })}
            disabled={disabled}
            className="text-xs"
          >
            <ArrowUpDown className="w-3 h-3 mr-1" />
            Rotate
          </Button>
        </div>
      </div>
    </div>
  );
}