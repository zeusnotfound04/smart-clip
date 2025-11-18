'use client';

import { motion } from 'framer-motion';
import { Settings, Languages, Type, Palette, ArrowLeft, Subtitles, AlignLeft, AlignCenter, AlignRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

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
}

const FONT_FAMILIES = [
  { value: 'Inter', label: 'Inter (Modern Sans-serif)' },
  { value: 'Poppins', label: 'Poppins (Trendy Geometric)' },
  { value: 'Montserrat', label: 'Montserrat (Clean & Bold)' },
  { value: 'Roboto', label: 'Roboto (Google\'s Classic)' },
  { value: 'Open Sans', label: 'Open Sans (Friendly)' },
  { value: 'Lato', label: 'Lato (Professional)' },
  { value: 'Source Sans Pro', label: 'Source Sans Pro (Adobe)' },
  { value: 'Nunito', label: 'Nunito (Rounded & Soft)' },
  { value: 'Raleway', label: 'Raleway (Elegant Thin)' },
  { value: 'Oswald', label: 'Oswald (Condensed Bold)' },
  { value: 'Playfair Display', label: 'Playfair Display (Luxury Serif)' },
  { value: 'Merriweather', label: 'Merriweather (Readable Serif)' },
  { value: 'Bebas Neue', label: 'Bebas Neue (Impact Style)' },
  { value: 'Quicksand', label: 'Quicksand (Modern Rounded)' },
  { value: 'Dancing Script', label: 'Dancing Script (Handwritten)' },
  { value: 'Pacifico', label: 'Pacifico (Fun Script)' },
  { value: 'Fira Code', label: 'Fira Code (Code Style)' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono (Developer)' },
  { value: 'Arial', label: 'Arial (Classic)' },
  { value: 'Helvetica', label: 'Helvetica (Swiss)' },
  { value: 'Times New Roman', label: 'Times New Roman (Traditional)' },
  { value: 'Georgia', label: 'Georgia (Web Serif)' }
];

const STYLE_THEMES = [
  {
    name: 'Modern White',
    style: {
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      shadowColor: '#000000',
      fontFamily: 'Inter',
      fontSize: 22,
      bold: false,
      italic: false,
      alignment: 'center' as const,
      showBackground: true
    }
  },
  {
    name: 'Bold Impact',
    style: {
      primaryColor: '#FFFF00',
      outlineColor: '#000000',
      shadowColor: '#000000',
      fontFamily: 'Bebas Neue',
      fontSize: 26,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Netflix Style',
    style: {
      primaryColor: '#E50914',
      outlineColor: '#FFFFFF',
      shadowColor: '#000000',
      fontFamily: 'Montserrat',
      fontSize: 24,
      bold: true,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Luxury Serif',
    style: {
      primaryColor: '#FFD700',
      outlineColor: '#000000',
      shadowColor: '#000000',
      fontFamily: 'Playfair Display',
      fontSize: 20,
      bold: false,
      italic: true,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Tech Mono',
    style: {
      primaryColor: '#00FF41',
      outlineColor: '#000000',
      shadowColor: '#000000',
      fontFamily: 'JetBrains Mono',
      fontSize: 18,
      bold: false,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  },
  {
    name: 'Friendly Pop',
    style: {
      primaryColor: '#FF6B9D',
      outlineColor: '#FFFFFF',
      shadowColor: '#000000',
      fontFamily: 'Quicksand',
      fontSize: 22,
      bold: false,
      italic: false,
      alignment: 'center' as const,
      showShadow: true
    }
  }
];

export function SubtitleConfigurationPanel({
  subtitleOptions,
  onOptionsChange,
  onApplyTheme,
  onBack,
  onGenerate,
  onConfigurationChange
}: SubtitleConfigurationPanelProps) {
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
            <h4 className="font-medium">Colors & Themes</h4>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {STYLE_THEMES.map((theme, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => onApplyTheme(theme)}
                className="h-12 p-2 flex flex-col items-center gap-1"
              >
                <div 
                  className="w-4 h-4 rounded border border-gray-600" 
                  style={{ backgroundColor: theme.style.primaryColor }} 
                />
                <span className="text-xs leading-none">{theme.name}</span>
              </Button>
            ))}
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
        {/* Quick Preview */}
        <div className="p-4 pb-2 space-y-2">
          <Label className="text-xs font-medium">Preview</Label>
          <div 
            className="bg-gray-900/30 p-3 rounded-lg" 
            style={{ textAlign: subtitleOptions.style.alignment }}
          >
            <span 
              style={{
                fontFamily: subtitleOptions.style.fontFamily,
                fontSize: `${Math.max(12, subtitleOptions.style.fontSize * 0.6)}px`,
                color: subtitleOptions.style.primaryColor,
                fontWeight: subtitleOptions.style.bold ? 'bold' : 'normal',
                fontStyle: subtitleOptions.style.italic ? 'italic' : 'normal',
                textShadow: subtitleOptions.style.showShadow 
                  ? `2px 2px 4px ${subtitleOptions.style.shadowColor}, 1px 1px 2px ${subtitleOptions.style.outlineColor}`
                  : `1px 1px 2px ${subtitleOptions.style.outlineColor}`,
                display: 'inline-block'
              }}
            >
              Sample Text
            </span>
          </div>
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
              onClick={onGenerate}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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