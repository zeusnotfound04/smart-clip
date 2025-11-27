'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ViewMode } from '@/types/smart-clipper';
import { 
  Upload, 
  Settings2, 
  Clock, 
  Play, 
  CheckCircle
} from 'lucide-react';

interface NavigationStepsProps {
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;
  loading: boolean;
}

const navigationSteps = [
  { key: 'upload', label: 'Upload', icon: Upload },
  { key: 'configure', label: 'Configure', icon: Settings2 },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'preview', label: 'Preview', icon: Play },
  { key: 'dashboard', label: 'Dashboard', icon: CheckCircle }
];

export function NavigationSteps({ currentView, setCurrentView, loading }: NavigationStepsProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          {navigationSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentView === step.key;
            const isCompleted = navigationSteps.findIndex(s => s.key === currentView) > index;
            
            return (
              <div key={step.key} className="flex items-center">
                <Button
                  variant={isActive ? "default" : isCompleted ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentView(step.key as ViewMode)}
                  className="gap-2"
                  disabled={loading}
                >
                  <Icon className="w-4 h-4" />
                  {step.label}
                </Button>
                {index < navigationSteps.length - 1 && (
                  <div className={`w-8 h-px mx-2 ${isCompleted ? 'bg-primary' : 'bg-border'}`} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}