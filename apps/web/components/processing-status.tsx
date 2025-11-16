'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Info,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProcessingJob {
  id: string;
  type: 'upload' | 'subtitles' | 'clipper' | 'streamer' | 'script' | 'conversation';
  title: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  endTime?: Date;
  message?: string;
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export function ProcessingStatus() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const mockJobs: ProcessingJob[] = [
      {
        id: '1',
        type: 'subtitles',
        title: 'Marketing Video - Auto Subtitles',
        status: 'processing',
        progress: 65,
        startTime: new Date(Date.now() - 2 * 60 * 1000),
        message: 'Analyzing audio track...'
      },
      {
        id: '2',
        type: 'clipper',
        title: 'Gaming Stream - Smart Clips',
        status: 'completed',
        progress: 100,
        startTime: new Date(Date.now() - 10 * 60 * 1000),
        endTime: new Date(Date.now() - 2 * 60 * 1000),
        message: 'Generated 5 clips successfully'
      }
    ];
    
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'success',
        title: 'Processing Complete',
        message: 'Your video has been processed successfully',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        read: false
      },
      {
        id: '2',
        type: 'info',
        title: 'Upload Started',
        message: 'Video upload in progress',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        read: true
      }
    ];

    setJobs(mockJobs);
    setNotifications(mockNotifications);

    const interval = setInterval(() => {
      setJobs(prev => 
        prev.map(job => {
          if (job.status === 'processing' && job.progress < 100) {
            const newProgress = Math.min(job.progress + Math.random() * 10, 100);
            if (newProgress >= 100) {
              return {
                ...job,
                status: 'completed',
                progress: 100,
                endTime: new Date(),
                message: 'Processing completed successfully'
              };
            }
            return { ...job, progress: newProgress };
          }
          return job;
        })
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getJobIcon = (type: string, status: string) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'failed') return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-muted-foreground animate-spin" />;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      )
    );
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 max-w-[calc(100vw-2rem)] md:max-w-none">
      <AnimatePresence>
        {jobs.filter(job => job.status === 'processing').map((job) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="w-full md:w-80"
          >
            <Card className="bg-card/95 backdrop-blur-sm border shadow-lg">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-start gap-2 md:gap-3">
                  {getJobIcon(job.type, job.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.message}</p>
                    <div className="mt-2">
                      <Progress value={job.progress} className="h-1.5 md:h-2" />
                      <p className="text-xs text-muted-foreground text-right mt-1">
                        {Math.round(job.progress)}%
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          className="relative bg-card/95 backdrop-blur-sm shadow-lg"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>

        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-12 w-full md:w-80 max-w-[calc(100vw-2rem)]"
            >
              <Card className="bg-card/95 backdrop-blur-sm border shadow-lg max-h-96 overflow-hidden">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Notifications</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowNotifications(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    <div className="space-y-1">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 border-b hover:bg-slate-50 cursor-pointer ${
                            !notification.read ? 'bg-muted' : ''
                          }`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{notification.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-muted-foreground rounded-full mt-2" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No notifications</p>
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}