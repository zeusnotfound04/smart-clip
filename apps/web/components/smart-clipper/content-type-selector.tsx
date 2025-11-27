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
        "cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected && "ring-2 ring-blue-500 bg-blue-50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {contentType.name}
          </CardTitle>
          {contentType.icon && (
            <div className="text-2xl" role="img" aria-label={`${contentType.name} icon`}>
              {contentType.icon}
            </div>
          )}
        </div>
        <CardDescription className="text-sm text-gray-600">
          {contentType.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Clip Length:</span>
            <span className="font-medium">{contentType.preferredClipLength}s</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Max Segments:</span>
            <span className="font-medium">{contentType.maxSegments}</span>
          </div>
          {keywordPreview && (
            <div className="text-sm">
              <span className="text-gray-500">Keywords: </span>
              <span className="text-gray-700">{keywordPreview}</span>
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
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Select Content Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
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
      <div className="flex items-center justify-between">
        {/* <h2 className="text-xl font-semibold">Select Content Type</h2> */}
        {selectedType && (
          <Badge variant="outline" className="text-sm">
            {contentTypes.find(t => t.type === selectedType)?.name}
          </Badge>
        )}
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
        <div className="border-t pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {selectedConfig.name} Configuration
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleCustomization}
              disabled={disabled}
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
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                This content type is optimized for {selectedConfig.description.toLowerCase()}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Clip Length:</span>
                  <br />
                  {selectedConfig.preferredClipLength}s
                </div>
                <div>
                  <span className="font-medium">Max Segments:</span>
                  <br />
                  {selectedConfig.maxSegments}
                </div>
                <div>
                  <span className="font-medium">Keywords:</span>
                  <br />
                  {selectedConfig.excitementKeywords.length + selectedConfig.actionKeywords.length + selectedConfig.emotionalKeywords.length}
                </div>
                <div>
                  <span className="font-medium">Audio Focus:</span>
                  <br />
                  {Math.round(selectedConfig.audioEnergyWeight * 100)}%
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