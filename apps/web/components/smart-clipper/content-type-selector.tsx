"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Gamepad2, Mic, Smartphone, GraduationCap, LucideIcon } from 'lucide-react';

// Icon mapping for content types
const iconMap: Record<string, LucideIcon> = {
  'Gamepad2': Gamepad2,
  'Mic': Mic,
  'Smartphone': Smartphone,
  'GraduationCap': GraduationCap,
};

interface ContentTypeConfig {
  type: string;
  name: string;
  description: string;
  icon?: string;
  audioEnergyWeight: number;
  visualMotionWeight: number;
  speechPatternWeight: number;
  sceneChangeWeight: number;
  excitementKeywords: string[];
  actionKeywords: string[];
  emotionalKeywords: string[];
  technicalKeywords: string[];
  preferredClipLength: number;
  minClipLength: number;
  maxClipLength: number;
  maxSegments: number;
  minimumConfidence: number;
  geminiFlashPromptTemplate: string;
  geminiProPromptTemplate: string;
}

interface ContentTypeSelectorProps {
  contentTypes: ContentTypeConfig[];
  selectedType: string | null;
  onTypeSelect: (type: string) => void;
  onConfigChange: (config: Partial<ContentTypeConfig>) => void;
  customConfig?: Partial<ContentTypeConfig>;
  loading?: boolean;
  disabled?: boolean;
}

interface CustomConfigurationProps {
  config: ContentTypeConfig;
  customConfig: Partial<ContentTypeConfig>;
  onConfigChange: (config: Partial<ContentTypeConfig>) => void;
}

const ContentTypeCard = React.memo<{
  contentType: ContentTypeConfig;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}>(({ contentType, isSelected, onSelect, disabled }) => {
  const handleClick = useCallback(() => {
    if (!disabled) {
      onSelect();
    }
  }, [onSelect, disabled]);

  const keywordPreview = useMemo(() => {
    const allKeywords = [
      ...contentType.excitementKeywords, 
      ...contentType.actionKeywords, 
      ...contentType.emotionalKeywords
    ];
    return allKeywords.slice(0, 3).join(', ') + (allKeywords.length > 3 ? '...' : '');
  }, [contentType.excitementKeywords, contentType.actionKeywords, contentType.emotionalKeywords]);

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-2",
        isSelected 
          ? "ring-2 ring-primary shadow-lg bg-primary/5 border-primary" 
          : "border-border hover:border-primary/50",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100"
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "text-lg font-semibold",
            isSelected ? "text-primary" : "text-foreground"
          )}>
            {contentType.name}
          </CardTitle>
          {contentType.icon && (() => {
            const IconComponent = iconMap[contentType.icon];
            return IconComponent ? (
              <IconComponent 
                className={cn(
                  "w-7 h-7 transition-colors",
                  isSelected ? "text-primary" : "text-muted-foreground"
                )} 
                aria-label={`${contentType.name} icon`} 
              />
            ) : null;
          })()}
        </div>
        <CardDescription className={cn(
          "text-sm mt-1",
          isSelected ? "text-foreground/80" : "text-muted-foreground"
        )}>
          {contentType.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={cn(
              isSelected ? "text-foreground/70" : "text-muted-foreground"
            )}>Clip Length:</span>
            <span className={cn(
              "font-semibold",
              isSelected ? "text-primary" : "text-foreground"
            )}>{contentType.preferredClipLength}s</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className={cn(
              isSelected ? "text-foreground/70" : "text-muted-foreground"
            )}>Max Segments:</span>
            <span className={cn(
              "font-semibold",
              isSelected ? "text-primary" : "text-foreground"
            )}>{contentType.maxSegments}</span>
          </div>
          {keywordPreview && (
            <div className="text-sm">
              <span className={cn(
                isSelected ? "text-foreground/70" : "text-muted-foreground"
              )}>Keywords: </span>
              <span className={cn(
                "font-medium",
                isSelected ? "text-foreground" : "text-foreground/80"
              )}>{keywordPreview}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

ContentTypeCard.displayName = 'ContentTypeCard';

const WeightSlider = React.memo<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  description?: string;
}>(({ label, value, onChange, description }) => {
  const handleValueChange = useCallback((newValues: number[]) => {
    onChange(newValues[0]);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-sm text-gray-600">{Math.round(value * 100)}%</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={handleValueChange}
        min={0}
        max={1}
        step={0.05}
        className="w-full"
      />
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
});

WeightSlider.displayName = 'WeightSlider';

const KeywordInput = React.memo<{
  keywords: string[];
  onChange: (keywords: string[]) => void;
  placeholder: string;
  label: string;
}>(({ keywords, onChange, placeholder, label }) => {
  const keywordString = useMemo(() => keywords.join(', '), [keywords]);

  const handleKeywordChange = useCallback((value: string) => {
    const newKeywords = value
      .split(',')
      .map(keyword => keyword.trim())
      .filter(keyword => keyword.length > 0);
    onChange(newKeywords);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <Textarea
        value={keywordString}
        onChange={(e) => handleKeywordChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[80px]"
      />
      <p className="text-xs text-gray-500">
        Separate keywords with commas. Currently: {keywords.length} keywords
      </p>
    </div>
  );
});

KeywordInput.displayName = 'KeywordInput';

const CustomConfiguration: React.FC<CustomConfigurationProps> = ({ 
  config, 
  customConfig, 
  onConfigChange 
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateWeight = useCallback((key: keyof ContentTypeConfig, value: number) => {
    onConfigChange({ [key]: value });
  }, [onConfigChange]);

  const updateKeywords = useCallback((key: keyof ContentTypeConfig, keywords: string[]) => {
    onConfigChange({ [key]: keywords });
  }, [onConfigChange]);

  const updateClipLength = useCallback((key: keyof ContentTypeConfig, value: number[]) => {
    onConfigChange({ [key]: value[0] });
  }, [onConfigChange]);

  const currentConfig = useMemo(() => ({ ...config, ...customConfig }), [config, customConfig]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Configuration</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Analysis Weights</h4>
          
          <WeightSlider
            label="Audio Energy"
            value={currentConfig.audioEnergyWeight}
            onChange={(value) => updateWeight('audioEnergyWeight', value)}
            description="Importance of audio volume and energy patterns"
          />
          
          <WeightSlider
            label="Visual Motion"
            value={currentConfig.visualMotionWeight}
            onChange={(value) => updateWeight('visualMotionWeight', value)}
            description="Importance of visual movement and scene changes"
          />
          
          <WeightSlider
            label="Speech Patterns"
            value={currentConfig.speechPatternWeight}
            onChange={(value) => updateWeight('speechPatternWeight', value)}
            description="Importance of speech tempo and vocal emphasis"
          />
          
          <WeightSlider
            label="Scene Changes"
            value={currentConfig.sceneChangeWeight}
            onChange={(value) => updateWeight('sceneChangeWeight', value)}
            description="Importance of cuts and scene transitions"
          />
        </div>

        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Clip Settings</h4>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Preferred Clip Length</Label>
            <Slider
              value={[currentConfig.preferredClipLength]}
              onValueChange={(value) => updateClipLength('preferredClipLength', value)}
              min={5}
              max={180}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              {currentConfig.preferredClipLength} seconds
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Maximum Segments</Label>
            <Slider
              value={[currentConfig.maxSegments]}
              onValueChange={(value) => updateClipLength('maxSegments', value)}
              min={1}
              max={50}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              Up to {currentConfig.maxSegments} highlight segments
            </p>
          </div>
        </div>
      </div>

      {showAdvanced && (
        <div className="space-y-4 border-t pt-6">
          <h4 className="font-medium text-gray-900">Advanced Settings</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <KeywordInput
              label="Excitement Keywords"
              keywords={currentConfig.excitementKeywords}
              onChange={(keywords) => updateKeywords('excitementKeywords', keywords)}
              placeholder="action, intense, wow, amazing, incredible"
            />
            
            <KeywordInput
              label="Action Keywords"
              keywords={currentConfig.actionKeywords}
              onChange={(keywords) => updateKeywords('actionKeywords', keywords)}
              placeholder="action, fast, intense, dynamic, movement"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Min Clip Length</Label>
              <Slider
                value={[currentConfig.minClipLength]}
                onValueChange={(value) => updateClipLength('minClipLength', value)}
                min={3}
                max={currentConfig.preferredClipLength}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                {currentConfig.minClipLength} seconds minimum
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Max Clip Length</Label>
              <Slider
                value={[currentConfig.maxClipLength]}
                onValueChange={(value) => updateClipLength('maxClipLength', value)}
                min={currentConfig.preferredClipLength}
                max={300}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-gray-500">
                {currentConfig.maxClipLength} seconds maximum
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({
  contentTypes,
  selectedType,
  onTypeSelect,
  onConfigChange,
  customConfig = {},
  loading = false,
  disabled = false
}) => {
  const [showCustomization, setShowCustomization] = useState(false);

  const selectedConfig = useMemo(() => {
    return contentTypes.find(type => type.type === selectedType);
  }, [contentTypes, selectedType]);

  const handleTypeSelect = useCallback((type: string) => {
    onTypeSelect(type);
    setShowCustomization(false);
  }, [onTypeSelect]);

  const toggleCustomization = useCallback(() => {
    setShowCustomization(!showCustomization);
  }, [showCustomization]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Select Content Type</h2>
          <p className="text-muted-foreground">Choose the type of content you want to analyze for smart clipping</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse border-2">
              <CardHeader>
                <div className="h-6 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Choose the type that best matches your video content</p>
          </div>
          {selectedType && (
            <Badge variant="default" className="text-sm px-3 py-1">
              ✓ {contentTypes.find(t => t.type === selectedType)?.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {contentTypes.map((contentType) => (
          <ContentTypeCard
            key={contentType.type}
            contentType={contentType}
            isSelected={selectedType === contentType.type}
            onSelect={() => handleTypeSelect(contentType.type)}
            disabled={disabled}
          />
        ))}
      </div>

      {selectedConfig && (
        <div className="border-t border-border pt-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">
              {selectedConfig.name} Configuration
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCustomization}
              disabled={disabled}
              className="font-medium"
            >
              {showCustomization ? 'Hide Configuration' : 'Customize Settings'}
            </Button>
          </div>

          {showCustomization && (
            <CustomConfiguration
              config={selectedConfig}
              customConfig={customConfig}
              onConfigChange={onConfigChange}
            />
          )}

          {!showCustomization && (
            <div className="bg-muted/50 p-6 rounded-lg border border-border">
              <p className="text-sm text-foreground/80 mb-4">
                This content type is optimized for {selectedConfig.description.toLowerCase()}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="font-semibold text-foreground block">Clip Length:</span>
                  <span className="text-lg font-bold text-primary">{selectedConfig.preferredClipLength}s</span>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-foreground block">Max Segments:</span>
                  <span className="text-lg font-bold text-primary">{selectedConfig.maxSegments}</span>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-foreground block">Keywords:</span>
                  <span className="text-lg font-bold text-primary">{selectedConfig.excitementKeywords.length + selectedConfig.actionKeywords.length + selectedConfig.emotionalKeywords.length}</span>
                </div>
                <div className="space-y-1">
                  <span className="font-semibold text-foreground block">Audio Focus:</span>
                  <span className="text-lg font-bold text-primary">{Math.round(selectedConfig.audioEnergyWeight * 100)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentTypeSelector;