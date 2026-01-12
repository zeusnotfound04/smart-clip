'use client';

import { motion } from 'framer-motion';
import { Settings, Languages, Type, Palette, ArrowLeft, Subtitles, AlignLeft, AlignCenter, AlignRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// Helper function to get font family and weight for Montserrat and TikTok Sans variants
const getFontFamilyAndWeight = (fontFamily: string, isBold: boolean = false) => {
  // Handle Montserrat weight variants
  if (fontFamily.startsWith('Montserrat')) {
    const mapping: { [key: string]: number } = {
      'Montserrat Black': 900,
      'Montserrat ExtraBold': 800,
      'Montserrat Bold': 700,
      'Montserrat SemiBold': 600,
      'Montserrat Medium': 500,
      'Montserrat': 400,
    };
    return {
      fontFamily: 'var(--font-montserrat)',
      fontWeight: mapping[fontFamily] || 400
    };
  }
  
  // Handle TikTok Sans weight variants
  if (fontFamily.startsWith('TikTok Sans')) {
    const mapping: { [key: string]: number } = {
      'TikTok Sans Black': 900,
      'TikTok Sans ExtraBold': 800,
      'TikTok Sans Bold': 700,
      'TikTok Sans SemiBold': 600,
      'TikTok Sans Medium': 500,
      'TikTok Sans': 400,
    };
    return {
      fontFamily: 'var(--font-tiktok-sans)',
      fontWeight: mapping[fontFamily] || 400
    };
  }
  
  // Handle Poppins Thin
  if (fontFamily === 'Poppins Thin') {
    return {
      fontFamily: 'Poppins',
      fontWeight: 100
    };
  }
  
  // For other fonts, return as is
  return {
    fontFamily: fontFamily,
    fontWeight: isBold ? 'bold' : 'normal'
  };
};

interface SubtitleStyle {
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
  maxWordsPerLine?: number; // Max words per subtitle line (default: 8, TikTok style: 3)
  // Gradient support
  useGradient?: boolean;
  gradientType?: 'linear' | 'radial';
  gradientColors?: string[]; // Array of colors for gradient (2+ colors)
  gradientDirection?: number; // Angle in degrees for linear gradient (0-360)
  // Enhanced shadow
  shadowIntensity?: number; // 1-10 for multi-layer shadow depth
  shadowOffsetX?: number; // Horizontal shadow offset
  shadowOffsetY?: number; // Vertical shadow offset
}

interface SubtitleOptions {
  detectAllLanguages: boolean;
  style: SubtitleStyle;
}

interface SubtitleConfigurationPanelProps {
  subtitleOptions: SubtitleOptions;
  onOptionsChange: (options: SubtitleOptions) => void;
  onApplyTheme: (theme: any) => void;
  onBack: () => void;
  onGenerate: () => void;
  onConfigurationChange?: (config: SubtitleOptions) => Promise<void>;
  hasVideo?: boolean;
  hasLanguageSelected?: boolean;
}

const FONT_FAMILIES = [
  { value: 'Bangers', label: 'Bangers - VIRAL CHAMPION' },
  { value: 'Anton', label: 'Anton - BOLD IMPACT' },
  { value: 'Montserrat', label: 'Montserrat - Best Overall (Regular)' },
  { value: 'Montserrat Medium', label: 'Montserrat - Medium Weight' },
  { value: 'Montserrat SemiBold', label: 'Montserrat - SemiBold Weight' },
  { value: 'Montserrat Bold', label: 'Montserrat - Bold Weight' },
  { value: 'Montserrat ExtraBold', label: 'Montserrat - ExtraBold Weight' },
  { value: 'Montserrat Black', label: 'Montserrat - Black Weight (HEAVIEST)' },
  { value: 'Rubik', label: 'Rubik - Punchy Messages' },
  { value: 'Gabarito', label: 'Gabarito - Fitness & TikTok' },
  { value: 'Poppins', label: 'Poppins - Educational Videos' },
  { value: 'Poppins Thin', label: 'Poppins Thin - Elegant & Light' },
  { value: 'DM Serif Display', label: 'DM Serif - Storytelling' },
  { value: 'Fira Sans Condensed', label: 'Fira Sans - Strong Visuals' },
  { value: 'Roboto', label: 'Roboto - Health Videos' },
  { value: 'Teko', label: 'Teko - Modern Impact' },
  { value: 'TikTok Sans', label: 'TikTok Sans - Official TikTok Font' },
  { value: 'TikTok Sans Medium', label: 'TikTok Sans - Medium Weight' },
  { value: 'Arial', label: 'Arial - Professional' }
];

const STYLE_THEMES = [
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#00FF00',
      outlineColor: '#000000',
      shadowColor: '#000000',
      fontFamily: 'Bangers',
      fontSize: 34,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#FF0000',
      outlineColor: '#000000',
      shadowColor: '#000000',
      fontFamily: 'Bangers',
      fontSize: 34,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      shadowColor: '#000000',
      fontFamily: 'Bangers',
      fontSize: 34,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      shadowColor: '#1a1a1a',
      fontFamily: 'Montserrat',
      fontSize: 28,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#FFE600',
      outlineColor: '#000000',
      shadowColor: '#333333',
      fontFamily: 'Rubik',
      fontSize: 30,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#FF4444',
      outlineColor: '#FFFFFF',
      shadowColor: '#000000',
      fontFamily: 'Gabarito',
      fontSize: 32,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#4A90E2',
      outlineColor: '#FFFFFF',
      shadowColor: '#1a1a1a',
      fontFamily: 'Poppins',
      fontSize: 26,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },

  {
    name: 'Subtitle',
    
    style: {
      primaryColor: '#FFFFFF',
      outlineColor: '#1a1a1a',
      shadowColor: '#000000',
      fontFamily: 'Fira Sans Condensed',
      fontSize: 27,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },

  {
    name: 'Subtitle',
    style: {
      primaryColor: '#2C3E50',
      outlineColor: '#FFFFFF',
      shadowColor: '#000000',
      fontFamily: 'Arial',
      fontSize: 24,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
 
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#FF0000',
      outlineColor: '#FFFFFF',
      shadowColor: '#000000',
      fontFamily: 'Montserrat',
      fontSize: 32,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#00FF00',
      outlineColor: '#000000',
      shadowColor: '#1a5c1a',
      fontFamily: 'Poppins',
      fontSize: 28,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#E0E0E0',
      outlineColor: '#2C2C2C',
      shadowColor: '#000000',
      fontFamily: 'Roboto',
      fontSize: 26,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  // Anton Font Viral Presets
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#FF0000',
      outlineColor: '#000000',
      shadowColor: '#660000',
      fontFamily: 'Anton',
      fontSize: 36,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      shadowColor: '#333333',
      fontFamily: 'Anton',
      fontSize: 36,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      shadowColor: '#1a1a1a',
      fontFamily: 'Anton',
      fontSize: 36,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },

  {
    name: 'Subtitle',
    style: {
      primaryColor: '#FF0000',
      outlineColor: '#000000',
      shadowColor: '#000000',
      fontFamily: 'Bangers',
      fontSize: 36,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true,
      useGradient: true,
      gradientType: 'linear' as const,
      gradientColors: ['#FFFF00', '#FF6600', '#FF0000'],
      gradientDirection: 180,
      shadowIntensity: 3,
      shadowOffsetX: 2,
      shadowOffsetY: 2
    }
  },
  {
    name: 'Subtitle',
    style: {
      primaryColor: '#FF0000',
      outlineColor: '#FFFFFF',
      shadowColor: '#000000',
      fontFamily: 'Teko',
      fontSize: 36,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true,
      useGradient: true,
      gradientType: 'linear' as const,
      gradientColors: ['#FFFFFF', '#FF6B6B', '#C41E3A'],
      gradientDirection: 180,
      shadowIntensity: 3,
      shadowOffsetX: 2,
      shadowOffsetY: 2
    }
  },
  {
    name: 'SUBTITLE',
    style: {
      textCase: 'uppercase' as const,
      primaryColor: '#FFFFFF',
      outlineColor: 'transparent',
      shadowColor: '#FFFFFF',
      fontFamily: 'Montserrat ExtraBold',
      fontSize: 34,
      bold: false,
      italic: false,
      alignment: 'center' as const,
      showShadow: true,
      shadowIntensity: 8,
      shadowOffsetX: 0,
      shadowOffsetY: 0
    }
  },
  {
    name: 'Subtitle',
    style: {
      textCase: 'uppercase' as const,
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      shadowColor: '#000000',
      fontFamily: 'TikTok Sans Medium',
      fontSize: 32,
      bold: false,
      italic: false,
      alignment: 'center' as const,
      showShadow: true,
      shadowIntensity: 3,
      shadowOffsetX: 2,
      shadowOffsetY: 2
    }
  },
  {
    name: 'Subtitle',
    style: {
      textCase: 'normal' as const,
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      shadowColor: '#000000',
      fontFamily: 'Poppins Thin',
      fontSize: 30,
      bold: false,
      italic: false,
      alignment: 'center' as const,
      showShadow: true,
      shadowIntensity: 2,
      shadowOffsetX: 1,
      shadowOffsetY: 1
    }
  },



];

export function SubtitleConfigurationPanel({
  subtitleOptions,
  onOptionsChange,
  onApplyTheme,
  onBack,
  onGenerate,
  onConfigurationChange,
  hasVideo = true,
  hasLanguageSelected = true,
}: SubtitleConfigurationPanelProps) {
  console.log('🎨 SubtitleConfigurationPanel render:');
  console.log('   - hasVideo:', hasVideo);
  console.log('   - hasLanguageSelected:', hasLanguageSelected);
  console.log('   - Generate button will be disabled:', !hasVideo || !hasLanguageSelected);
  
  const updateStyle = async (updates: Partial<SubtitleStyle>) => {
    const newOptions = {
      ...subtitleOptions,
      style: { ...subtitleOptions.style, ...updates }
    };
    
    // Update local state immediately for responsive UI
    onOptionsChange(newOptions);
    
    // Send changes to backend if handler is provided (debounced)
    if (onConfigurationChange) {
      try {
        await onConfigurationChange(newOptions);
      } catch (error) {
        console.error('Failed to save configuration changes:', error);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="shrink-0 p-4 border-b">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Subtitle Configuration</h3>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Language Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-blue-400" />
            <h4 className="font-medium">Language Detection</h4>
          </div>
          <div className="flex items-center space-x-3">
            <Switch
              id="detect-all-languages"
              checked={subtitleOptions.detectAllLanguages}
              onCheckedChange={(checked) => 
                onOptionsChange({ ...subtitleOptions, detectAllLanguages: checked })
              }
            />
            <Label htmlFor="detect-all-languages" className="text-xs">
              Detect all languages
            </Label>
          </div>
        </div>

        {/* Text Style Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-green-400" />
            <h4 className="font-medium">Text Styling</h4>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">Text Case</Label>
              <Select
                value={subtitleOptions.style.textCase}
                onValueChange={(value: 'normal' | 'uppercase' | 'lowercase' | 'capitalize') =>
                  updateStyle({ textCase: value })
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select text case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal Text</SelectItem>
                  <SelectItem value="uppercase">UPPERCASE</SelectItem>
                  <SelectItem value="lowercase">lowercase</SelectItem>
                  <SelectItem value="capitalize">Capitalize Words</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Font Family</Label>
              <Select
                value={subtitleOptions.style.fontFamily}
                onValueChange={(value) => updateStyle({ fontFamily: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Choose a font" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {FONT_FAMILIES.map((font) => (
                    <SelectItem 
                      key={font.value} 
                      value={font.value}
                      className="text-xs"
                    >
                      {font.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Font Size</Label>
              <Input
                type="number"
                min="12"
                max="48"
                value={subtitleOptions.style.fontSize}
                onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) || 20 })}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Words Per Line</Label>
              <Select
                value={String(subtitleOptions.style.maxWordsPerLine || 8)}
                onValueChange={(value) => updateStyle({ maxWordsPerLine: parseInt(value) })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Words per line" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 words (Ultra Short)</SelectItem>
                  <SelectItem value="3">3 words (TikTok/Shorts)</SelectItem>
                  <SelectItem value="4">4 words (Short)</SelectItem>
                  <SelectItem value="5">5 words (Medium)</SelectItem>
                  <SelectItem value="6">6 words (Standard)</SelectItem>
                  <SelectItem value="8">8 words (Default)</SelectItem>
                  <SelectItem value="10">10 words (Long)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">Lower = faster captions (viral style)</p>
            </div>

            <div className="flex gap-3">
              <div className="flex items-center space-x-1">
                <Switch
                  id="bold"
                  checked={subtitleOptions.style.bold}
                  onCheckedChange={(checked) => updateStyle({ bold: checked })}
                />
                <Label htmlFor="bold" className="text-xs">Bold</Label>
              </div>
              <div className="flex items-center space-x-1">
                <Switch
                  id="italic"
                  checked={subtitleOptions.style.italic}
                  onCheckedChange={(checked) => updateStyle({ italic: checked })}
                />
                <Label htmlFor="italic" className="text-xs">Italic</Label>
              </div>
            </div>
          </div>
        </div>

        {/* Alignment & Display Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlignCenter className="w-4 h-4 text-orange-400" />
            <h4 className="font-medium">Alignment & Display</h4>
          </div>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">Text Alignment</Label>
              <div className="flex gap-1 mt-1">
                <Button
                  variant={subtitleOptions.style.alignment === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateStyle({ alignment: 'left' })}
                  className="flex-1 h-8 px-2"
                >
                  <AlignLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant={subtitleOptions.style.alignment === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateStyle({ alignment: 'center' })}
                  className="flex-1 h-8 px-2"
                >
                  <AlignCenter className="w-3 h-3" />
                </Button>
                <Button
                  variant={subtitleOptions.style.alignment === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateStyle({ alignment: 'right' })}
                  className="flex-1 h-8 px-2"
                >
                  <AlignRight className="w-3 h-3" />
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Text Shadow</Label>
                <div className="flex items-center space-x-2">
                  {subtitleOptions.style.showShadow ? (
                    <Eye className="w-3 h-3 text-green-500" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-gray-500" />
                  )}
                  <Switch
                    id="showShadow"
                    checked={subtitleOptions.style.showShadow}
                    onCheckedChange={(checked) => updateStyle({ showShadow: checked })}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        

        {/* Color Options */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-purple-400" />
            <h4 className="font-semibold">Viral Subtitle Presets</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {STYLE_THEMES.map((theme, index) => {
              // Create gradient style if useGradient is enabled
              const getTextStyle = () => {
                // Map font family to actual font family and weight
                const { fontFamily, fontWeight } = getFontFamilyAndWeight(theme.style.fontFamily, theme.style.bold);
                
                const baseStyle: any = {
                  fontFamily: fontFamily,
                  fontWeight: fontWeight,
                  fontStyle: theme.style.italic ? 'italic' : 'normal',
                };

                if (theme.style.useGradient && theme.style.gradientColors) {
                  // Create linear gradient
                  const direction = theme.style.gradientDirection || 180;
                  const colors = theme.style.gradientColors.join(', ');
                  baseStyle.background = `linear-gradient(${direction}deg, ${colors})`;
                  baseStyle.WebkitBackgroundClip = 'text';
                  baseStyle.WebkitTextFillColor = 'transparent';
                  baseStyle.backgroundClip = 'text';
                  
                  // Simple black drop shadow for gradient text
                  const offsetX = theme.style.shadowOffsetX || 2;
                  const offsetY = theme.style.shadowOffsetY || 2;
                  baseStyle.filter = `drop-shadow(${offsetX}px ${offsetY}px 4px rgba(0, 0, 0, 0.8))`;
                } else {
                  // Regular solid color with outline and shadow
                  baseStyle.color = theme.style.primaryColor;
                  
                  // Check if this is a glow effect (no offset)
                  const offsetX = theme.style.shadowOffsetX || 0;
                  const offsetY = theme.style.shadowOffsetY || 0;
                  const isGlow = offsetX === 0 && offsetY === 0 && theme.style.showShadow;
                  
                  if (isGlow) {
                    // Create smooth glow effect with multiple shadow layers
                    const glowColor = theme.style.shadowColor;
                    const intensity = theme.style.shadowIntensity || 5;
                    baseStyle.textShadow = [
                      // Outline
                      `-1px -1px 0 ${theme.style.outlineColor}`,
                      `1px -1px 0 ${theme.style.outlineColor}`,
                      `-1px 1px 0 ${theme.style.outlineColor}`,
                      `1px 1px 0 ${theme.style.outlineColor}`,
                      // Smooth multi-layer glow
                      `0 0 ${intensity * 2}px ${glowColor}`,
                      `0 0 ${intensity * 4}px ${glowColor}`,
                      `0 0 ${intensity * 6}px ${glowColor}`
                    ].join(', ');
                  } else {
                    // Regular shadow with outline
                    baseStyle.textShadow = theme.style.showShadow 
                      ? `-1px -1px 0 ${theme.style.outlineColor}, 1px -1px 0 ${theme.style.outlineColor}, -1px 1px 0 ${theme.style.outlineColor}, 1px 1px 0 ${theme.style.outlineColor}, 0 0 4px ${theme.style.shadowColor}`
                      : `-1px -1px 0 ${theme.style.outlineColor}, 1px -1px 0 ${theme.style.outlineColor}, -1px 1px 0 ${theme.style.outlineColor}, 1px 1px 0 ${theme.style.outlineColor}`;
                  }
                }

                return baseStyle;
              };

              return (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyTheme(theme)}
                  className="h-auto p-2 flex flex-col items-center gap-1 hover:bg-black/80 hover:scale-105 transition-all bg-black"
                >
                  <span 
                    className="text-[20px] leading-tight"
                    style={getTextStyle()}
                  >
                    {theme.name}
                  </span>
                 
                </Button>
              );
            })}
          </div>
          
          <div className="space-y-2">
            <div>
              <Label className="text-xs font-medium">Text Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={subtitleOptions.style.primaryColor}
                  onChange={(e) => updateStyle({ primaryColor: e.target.value })}
                  className="w-8 h-6 p-0 border-none"
                />
                <Input
                  type="text"
                  value={subtitleOptions.style.primaryColor}
                  onChange={(e) => updateStyle({ primaryColor: e.target.value })}
                  className="flex-1 h-6 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Outline Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={subtitleOptions.style.outlineColor}
                  onChange={(e) => updateStyle({ outlineColor: e.target.value })}
                  className="w-8 h-6 p-0 border-none"
                />
                <Input
                  type="text"
                  value={subtitleOptions.style.outlineColor}
                  onChange={(e) => updateStyle({ outlineColor: e.target.value })}
                  className="flex-1 h-6 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Shadow Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={subtitleOptions.style.shadowColor}
                  onChange={(e) => updateStyle({ shadowColor: e.target.value })}
                  className="w-8 h-6 p-0 border-none"
                />
                <Input
                  type="text"
                  value={subtitleOptions.style.shadowColor}
                  onChange={(e) => updateStyle({ shadowColor: e.target.value })}
                  className="flex-1 h-6 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Fixed Preview and Action Buttons */}
      <div className="shrink-0 border-t bg-background">

        <div className="p-4 pb-2 space-y-2">
          {/* <Label className="text-xs font-medium">Live Preview</Label>
          <div 
            className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6 rounded-lg relative overflow-hidden" 
            style={{ textAlign: subtitleOptions.style.alignment }}
          >
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />
            
            <span 
              style={{
                fontFamily: subtitleOptions.style.fontFamily,
                fontSize: `${Math.max(14, subtitleOptions.style.fontSize * 0.7)}px`,
                color: subtitleOptions.style.primaryColor,
                fontWeight: subtitleOptions.style.bold ? 'bold' : 'normal',
                fontStyle: subtitleOptions.style.italic ? 'italic' : 'normal',
                textShadow: subtitleOptions.style.showShadow 
                  ? `-2px -2px 0 ${subtitleOptions.style.outlineColor}, 2px -2px 0 ${subtitleOptions.style.outlineColor}, -2px 2px 0 ${subtitleOptions.style.outlineColor}, 2px 2px 0 ${subtitleOptions.style.outlineColor}, 0 0 8px ${subtitleOptions.style.shadowColor}, 0 0 16px ${subtitleOptions.style.shadowColor}`
                  : `-2px -2px 0 ${subtitleOptions.style.outlineColor}, 2px -2px 0 ${subtitleOptions.style.outlineColor}, -2px 2px 0 ${subtitleOptions.style.outlineColor}, 2px 2px 0 ${subtitleOptions.style.outlineColor}`,
                display: 'inline-block',
                letterSpacing: '0.5px',
                position: 'relative',
                zIndex: 1
              }}
            >
              THIS IS A VIRAL CAPTION! 🔥
            </span>
          </div> */}
        </div>
        
        {/* Action Buttons */}
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={onBack}
              size="sm"
              className="flex-1"
            >
              <ArrowLeft className="w-3 h-3 mr-1" />
              Back
            </Button>
            <Button 
              onClick={() => {
                console.log('🔴 Generate button clicked');
                console.log('   - hasVideo:', hasVideo);
                console.log('   - hasLanguageSelected:', hasLanguageSelected);
                console.log('   - disabled:', !hasVideo || !hasLanguageSelected);
                onGenerate();
              }}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!hasVideo || !hasLanguageSelected}
            >
              <Subtitles className="w-3 h-3 mr-1" />
              Generate
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}