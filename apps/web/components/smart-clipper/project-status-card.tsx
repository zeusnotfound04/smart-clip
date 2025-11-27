'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SmartClipperProject } from '@/types/smart-clipper';

interface ProjectStatusCardProps {
  currentProject: SmartClipperProject | null;
}

export function ProjectStatusCard({ currentProject }: ProjectStatusCardProps) {
  if (!currentProject) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline">
              {currentProject.status}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {currentProject.video.originalName}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {currentProject.totalSegmentsFound && (
              <span>{currentProject.totalSegmentsFound} segments found</span>
            )}
            {currentProject.estimatedCost && (
              <span>Est. cost: ${currentProject.estimatedCost}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}