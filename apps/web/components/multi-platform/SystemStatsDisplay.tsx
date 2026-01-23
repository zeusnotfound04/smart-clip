"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, AlertCircle } from "lucide-react";
import { apiClient } from "@/lib/api-client";

interface PlatformStats {
  platform: string;
  slotsUsed: number;
  maxSlots: number;
  utilization: number;
}

interface SystemStats {
  platforms: PlatformStats[];
  proxies: {
    total: number;
    healthy: number;
    quarantined: number;
    utilization: number;
  };
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
  admissionControl: {
    userActiveJobs: number;
    userRateLimitRemaining: number;
  };
}

const PLATFORM_INFO: Record<string, { name: string; icon: string }> = {
  rumble: { name: 'Rumble', icon: '🎬' },
  kick: { name: 'Kick', icon: '🎮' },
  twitch: { name: 'Twitch', icon: '📺' },
  'google-drive': { name: 'Google Drive', icon: '📁' },
};

interface SystemStatsDisplayProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  compact?: boolean;
}

export function SystemStatsDisplay({
  autoRefresh = true,
  refreshInterval = 5000,
  compact = false,
}: SystemStatsDisplayProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.multiPlatform.getSystemStats();
      setStats(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    if (autoRefresh) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading stats...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="grid gap-2 md:grid-cols-4">
        {stats.platforms.map((platform) => {
          const info = PLATFORM_INFO[platform.platform];
          return (
            <div key={platform.platform} className="flex items-center gap-2 text-sm">
              <span>{info.icon}</span>
              <span className="text-muted-foreground">
                {platform.slotsUsed}/{platform.maxSlots}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">System Status</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {stats.platforms.map((platform) => {
          const info = PLATFORM_INFO[platform.platform];
          return (
            <Card key={platform.platform}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span className="text-xl">{info.icon}</span>
                  {info.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {platform.slotsUsed}/{platform.maxSlots}
                </div>
                <Progress value={platform.utilization} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {platform.utilization.toFixed(0)}% utilization
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Proxy Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.proxies.healthy}/{stats.proxies.total}
            </div>
            <p className="text-xs text-muted-foreground">Healthy proxies</p>
            {stats.proxies.quarantined > 0 && (
              <Badge variant="destructive" className="mt-2">
                {stats.proxies.quarantined} quarantined
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waiting:</span>
                <span className="font-semibold">{stats.queue.waiting}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active:</span>
                <span className="font-semibold text-blue-500">{stats.queue.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span className="font-semibold text-green-500">{stats.queue.completed}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Your Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Active Jobs</span>
                  <span className="font-semibold">
                    {stats.admissionControl.userActiveJobs}/3
                  </span>
                </div>
                <Progress
                  value={(stats.admissionControl.userActiveJobs / 3) * 100}
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Rate Limit</span>
                  <span className="font-semibold">
                    {stats.admissionControl.userRateLimitRemaining}/5
                  </span>
                </div>
                <Progress
                  value={(stats.admissionControl.userRateLimitRemaining / 5) * 100}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
