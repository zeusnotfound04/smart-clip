"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface HighlightSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  finalScore: number;
  confidenceLevel: number;
  highlightType?: string;
  reasoning: string;
  status: string;
  userApproval?: 'approved' | 'rejected' | 'modified';
}

interface FeedbackItem {
  segmentId: string;
  userRating: number;
  feedback: string;
  feedbackType: 'rating' | 'comment' | 'correction' | 'suggestion';
  timestamp: Date;
  processed?: boolean;
}

interface FeedbackSummary {
  totalFeedback: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  commonIssues: Array<{ issue: string; count: number }>;
  improvementSuggestions: string[];
  processingAccuracy: number;
  userSatisfaction: number;
}

interface UserFeedbackCollectionProps {
  segments: HighlightSegment[];
  onSubmitFeedback: (feedback: FeedbackItem[]) => Promise<void>;
  onRequestImprovement: (projectId: string, feedback: FeedbackItem[]) => Promise<void>;
  feedbackHistory?: FeedbackItem[];
  feedbackSummary?: FeedbackSummary;
  projectId: string;
  loading?: boolean;
}

interface RatingComponentProps {
  value: number;
  onChange: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readonly?: boolean;
  showLabels?: boolean;
}

interface SegmentFeedbackFormProps {
  segment: HighlightSegment;
  onFeedbackChange: (segmentId: string, feedback: Partial<FeedbackItem>) => void;
  existingFeedback?: Partial<FeedbackItem>;
}

interface FeedbackSummaryDisplayProps {
  summary: FeedbackSummary;
  segments: HighlightSegment[];
}

interface FeedbackHistoryProps {
  feedback: FeedbackItem[];
  segments: HighlightSegment[];
  onReprocessFeedback: (feedbackIds: string[]) => void;
}

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const RatingComponent: React.FC<RatingComponentProps> = ({
  value,
  onChange,
  size = 'md',
  readonly = false,
  showLabels = false
}) => {
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-8 h-8 text-base',
    lg: 'w-10 h-10 text-lg'
  };

  const labels = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            onClick={() => !readonly && onChange(rating)}
            disabled={readonly}
            className={cn(
              "rounded-full border-2 transition-all duration-200",
              sizeClasses[size],
              value >= rating
                ? "bg-yellow-400 border-yellow-500 text-white"
                : "border-gray-300 text-gray-400 hover:border-gray-400",
              !readonly && "hover:scale-110 cursor-pointer",
              readonly && "cursor-default"
            )}
          >
            
          </button>
        ))}
      </div>
      {showLabels && value > 0 && (
        <div className="text-sm text-gray-600 text-center">
          {labels[value - 1]}
        </div>
      )}
    </div>
  );
};

const SegmentFeedbackForm: React.FC<SegmentFeedbackFormProps> = ({
  segment,
  onFeedbackChange,
  existingFeedback = {}
}) => {
  const [rating, setRating] = useState(existingFeedback.userRating || 0);
  const [comment, setComment] = useState(existingFeedback.feedback || '');
  const [feedbackType, setFeedbackType] = useState(existingFeedback.feedbackType || 'rating');

  useEffect(() => {
    onFeedbackChange(segment.id, {
      userRating: rating,
      feedback: comment,
      feedbackType: feedbackType as FeedbackItem['feedbackType']
    });
  }, [rating, comment, feedbackType, segment.id, onFeedbackChange]);

  const getScoreColor = (score: number): string => {
    if (score >= 85) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 65) return 'text-yellow-600';
    if (score >= 55) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Segment info */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">
              {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
            </div>
            <div className="text-xs text-gray-500">
              {segment.highlightType || 'Highlight'}
            </div>
          </div>
          <div className="text-right">
            <div className={cn("text-lg font-bold", getScoreColor(segment.finalScore))}>
              {segment.finalScore}
            </div>
            <div className="text-xs text-gray-500">AI Score</div>
          </div>
        </div>

        {/* AI reasoning */}
        {segment.reasoning && (
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            <span className="font-medium">AI Analysis:</span> {segment.reasoning}
          </div>
        )}

        {/* Feedback type selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Feedback Type</label>
          <Select value={feedbackType} onValueChange={(value: string) => setFeedbackType(value as typeof feedbackType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Quality Rating</SelectItem>
              <SelectItem value="comment">General Comment</SelectItem>
              <SelectItem value="correction">Score Correction</SelectItem>
              <SelectItem value="suggestion">Improvement Suggestion</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Your Rating</label>
          <RatingComponent
            value={rating}
            onChange={setRating}
            size="md"
            showLabels={true}
          />
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {feedbackType === 'correction' ? 'Why should the score be different?' :
             feedbackType === 'suggestion' ? 'How can we improve?' :
             'Additional Comments'}
          </label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              feedbackType === 'rating' ? 'What did you think about this highlight?' :
              feedbackType === 'correction' ? 'Explain why you think the AI score is incorrect...' :
              feedbackType === 'suggestion' ? 'Suggest improvements to our analysis...' :
              'Share your thoughts...'
            }
            className="min-h-[80px]"
          />
        </div>

        {/* Quick feedback buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRating(5);
              setComment('Perfect highlight! Great choice.');
              setFeedbackType('rating');
            }}
          >
            Perfect
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRating(1);
              setComment('This should not be a highlight.');
              setFeedbackType('correction');
            }}
          >
            Not a highlight
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRating(3);
              setComment('Timing needs adjustment.');
              setFeedbackType('correction');
            }}
          >
            Wrong timing
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setComment('Consider including more context before/after this moment.');
              setFeedbackType('suggestion');
            }}
          >
            Needs context
          </Button>
        </div>
      </div>
    </Card>
  );
};

const FeedbackSummaryDisplay: React.FC<FeedbackSummaryDisplayProps> = ({
  summary,
  segments
}) => {
  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Feedback Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {summary.totalFeedback}
              </div>
              <div className="text-sm text-gray-500">Total Feedback</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {summary.averageRating.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(summary.processingAccuracy * 100)}%
              </div>
              <div className="text-sm text-gray-500">AI Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(summary.userSatisfaction * 100)}%
              </div>
              <div className="text-sm text-gray-500">User Satisfaction</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1 min-w-0 w-20">
                    <span className="text-sm">{rating}</span>
                    <div className="text-yellow-400"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Progress 
                        value={summary.totalFeedback > 0 ? (summary.ratingDistribution[rating] / summary.totalFeedback) * 100 : 0} 
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600 min-w-0 w-8">
                        {summary.ratingDistribution[rating] || 0}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Common Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.commonIssues.length === 0 ? (
                <div className="text-gray-500 text-sm">No common issues identified</div>
              ) : (
                summary.commonIssues.map((issue, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{issue.issue}</span>
                    <Badge variant="outline">{issue.count}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {summary.improvementSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Improvement Suggestions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.improvementSuggestions.map((suggestion, index) => (
                <div key={index} className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                  {suggestion}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const FeedbackHistory: React.FC<FeedbackHistoryProps> = ({
  feedback,
  segments,
  onReprocessFeedback
}) => {
  const [selectedFeedback, setSelectedFeedback] = useState<string[]>([]);

  const getSegmentInfo = (segmentId: string) => {
    return segments.find(s => s.id === segmentId);
  };

  const handleSelectFeedback = (feedbackId: string, checked: boolean) => {
    if (checked) {
      setSelectedFeedback([...selectedFeedback, feedbackId]);
    } else {
      setSelectedFeedback(selectedFeedback.filter(id => id !== feedbackId));
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Feedback History</CardTitle>
          <Button
            variant="outline"
            onClick={() => onReprocessFeedback(selectedFeedback)}
            disabled={selectedFeedback.length === 0}
          >
            Reprocess Selected ({selectedFeedback.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {feedback.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No feedback submitted yet
              </div>
            ) : (
              feedback.map((item, index) => {
                const segment = getSegmentInfo(item.segmentId);
                const feedbackId = `${item.segmentId}-${index}`;
                
                return (
                  <div key={feedbackId} className="border rounded p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedFeedback.includes(feedbackId)}
                          onChange={(e) => handleSelectFeedback(feedbackId, e.target.checked)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {segment && (
                              <span className="text-sm font-medium">
                                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {item.feedbackType}
                            </Badge>
                            {item.processed && (
                              <Badge variant="secondary" className="text-xs">
                                processed
                              </Badge>
                            )}
                          </div>
                          
                          <div className="mt-2">
                            <RatingComponent
                              value={item.userRating}
                              onChange={() => {}}
                              size="sm"
                              readonly={true}
                            />
                          </div>
                          
                          {item.feedback && (
                            <div className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                              {item.feedback}
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500 mt-2">
                            {item.timestamp.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export const UserFeedbackCollection: React.FC<UserFeedbackCollectionProps> = ({
  segments,
  onSubmitFeedback,
  onRequestImprovement,
  feedbackHistory = [],
  feedbackSummary,
  projectId,
  loading = false
}) => {
  const [feedbackData, setFeedbackData] = useState<Record<string, Partial<FeedbackItem>>>({});
  const [activeTab, setActiveTab] = useState('collect');

  const handleFeedbackChange = useCallback((segmentId: string, feedback: Partial<FeedbackItem>) => {
    setFeedbackData(prev => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        ...feedback,
        segmentId,
        timestamp: new Date()
      }
    }));
  }, []);

  const handleSubmitAll = useCallback(async () => {
    const completeFeedback = Object.values(feedbackData)
      .filter(item => item.userRating && item.userRating > 0)
      .map(item => ({
        segmentId: item.segmentId!,
        userRating: item.userRating!,
        feedback: item.feedback || '',
        feedbackType: item.feedbackType || 'rating',
        timestamp: item.timestamp || new Date()
      }));

    if (completeFeedback.length > 0) {
      await onSubmitFeedback(completeFeedback);
      setFeedbackData({}); // Clear feedback after submission
    }
  }, [feedbackData, onSubmitFeedback]);

  const handleRequestImprovement = useCallback(async () => {
    const allFeedback = Object.values(feedbackData)
      .filter(item => item.userRating || item.feedback)
      .map(item => ({
        segmentId: item.segmentId!,
        userRating: item.userRating || 0,
        feedback: item.feedback || '',
        feedbackType: item.feedbackType || 'suggestion',
        timestamp: item.timestamp || new Date()
      }));

    if (allFeedback.length > 0) {
      await onRequestImprovement(projectId, allFeedback);
    }
  }, [feedbackData, projectId, onRequestImprovement]);

  const handleReprocessFeedback = useCallback((feedbackIds: string[]) => {
    console.log('Reprocessing feedback:', feedbackIds);
    // This would trigger reprocessing of selected feedback items
  }, []);

  const completedFeedback = Object.values(feedbackData).filter(item => item.userRating && item.userRating > 0).length;
  const totalSegments = segments.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">User Feedback</h2>
        <Badge variant="outline">
          {completedFeedback} / {totalSegments} completed
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="collect">Collect Feedback</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="collect" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Rate Highlight Quality</CardTitle>
                <div className="text-sm text-gray-600">
                  Progress: {completedFeedback} / {totalSegments}
                </div>
              </div>
              <Progress value={totalSegments > 0 ? (completedFeedback / totalSegments) * 100 : 0} />
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {segments.map((segment) => (
                    <SegmentFeedbackForm
                      key={segment.id}
                      segment={segment}
                      onFeedbackChange={handleFeedbackChange}
                      existingFeedback={feedbackData[segment.id]}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {completedFeedback} segments have feedback ready to submit
            </div>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleRequestImprovement}
                disabled={loading || Object.keys(feedbackData).length === 0}
              >
                Request AI Improvement
              </Button>
              
              <Button
                onClick={handleSubmitAll}
                disabled={loading || completedFeedback === 0}
              >
                {loading ? 'Submitting...' : `Submit Feedback (${completedFeedback})`}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="summary">
          {feedbackSummary ? (
            <FeedbackSummaryDisplay
              summary={feedbackSummary}
              segments={segments}
            />
          ) : (
            <Card className="p-8">
              <div className="text-center text-gray-500">
                <div className="text-lg font-medium mb-2">No feedback summary available</div>
                <div className="text-sm">
                  Submit some feedback to see analysis and insights here.
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <FeedbackHistory
            feedback={feedbackHistory}
            segments={segments}
            onReprocessFeedback={handleReprocessFeedback}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserFeedbackCollection;