import { createClient } from 'redis';
import crypto from 'crypto';

/**
 * Admission Control Service
 * 
 * Protects the system from overload by validating and rate-limiting
 * download requests before they enter the queue.
 * 
 * Features:
 * - URL validation per platform
 * - Per-user rate limiting
 * - Max active jobs per user
 * - Global queue depth limits
 * - Request deduplication
 */

export interface AdmissionRequest {
  url: string;
  userId: string;
  platform: string;
}

export interface AdmissionResult {
  admitted: boolean;
  reason?: string;
  estimatedWaitTime?: number;
  jobId?: string;
  cached?: boolean;
}

export class AdmissionControlService {
  private static instance: AdmissionControlService;
  private redisClient: any = null;
  
  // Configuration
  private readonly MAX_QUEUE_DEPTH = 500; // Global limit
  private readonly MAX_USER_ACTIVE_JOBS = 3; // Per user
  private readonly USER_RATE_LIMIT_WINDOW = 60; // 60 seconds
  private readonly USER_RATE_LIMIT_MAX = 5; // 5 requests per minute
  private readonly MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
  
  private constructor() {
    this.initRedis();
  }

  public static getInstance(): AdmissionControlService {
    if (!AdmissionControlService.instance) {
      AdmissionControlService.instance = new AdmissionControlService();
    }
    return AdmissionControlService.instance;
  }

  private async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('[Admission Control] Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('[Admission Control] Redis connected');
    } catch (error) {
      console.error('[Admission Control] Failed to connect to Redis:', error);
    }
  }

  /**
   * Check if a download request should be admitted
   */
  async checkAdmission(request: AdmissionRequest): Promise<AdmissionResult> {
    console.log(`[Admission Control] Checking admission for user ${request.userId}, platform: ${request.platform}`);
    
    // 1. Validate URL format and platform
    const urlValidation = this.validateUrl(request.url, request.platform);
    if (!urlValidation.valid) {
      return {
        admitted: false,
        reason: urlValidation.error,
      };
    }

    // 2. Check for existing job (deduplication)
    const existingJob = await this.findExistingJob(request.url, request.userId);
    if (existingJob) {
      console.log(`[Admission Control] Found existing job for URL: ${existingJob.jobId}`);
      return {
        admitted: false,
        reason: 'This URL is already being processed or was recently processed',
        jobId: existingJob.jobId,
        cached: true,
      };
    }

    // 3. Check user rate limit
    const rateLimitCheck = await this.checkUserRateLimit(request.userId);
    if (!rateLimitCheck.allowed) {
      return {
        admitted: false,
        reason: `Rate limit exceeded. You can make ${this.USER_RATE_LIMIT_MAX} requests per minute. Please try again in ${rateLimitCheck.retryAfter} seconds.`,
        estimatedWaitTime: rateLimitCheck.retryAfter,
      };
    }

    // 4. Check user active jobs limit
    const activeJobsCheck = await this.checkUserActiveJobs(request.userId);
    if (!activeJobsCheck.allowed) {
      return {
        admitted: false,
        reason: `You have reached the maximum of ${this.MAX_USER_ACTIVE_JOBS} active downloads. Please wait for one to complete.`,
        estimatedWaitTime: activeJobsCheck.estimatedWaitTime,
      };
    }

    // 5. Check global queue depth
    const queueDepthCheck = await this.checkQueueDepth();
    if (!queueDepthCheck.allowed) {
      return {
        admitted: false,
        reason: `System is at capacity (${queueDepthCheck.current}/${this.MAX_QUEUE_DEPTH} jobs). Please try again in a few minutes.`,
        estimatedWaitTime: 300, // 5 minutes
      };
    }

    // All checks passed!
    console.log(`[Admission Control] Request admitted for user ${request.userId}`);
    
    // Record the admission
    await this.recordAdmission(request);
    
    return {
      admitted: true,
    };
  }

  /**
   * Validate URL format and platform-specific requirements
   */
  private validateUrl(url: string, platform: string): { valid: boolean; error?: string } {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();

      switch (platform.toLowerCase()) {
        case 'rumble':
          if (!hostname.includes('rumble.com')) {
            return { valid: false, error: 'Invalid Rumble URL. Must be from rumble.com' };
          }
          break;

        case 'kick':
          if (!hostname.includes('kick.com')) {
            return { valid: false, error: 'Invalid Kick URL. Must be from kick.com' };
          }
          break;

        case 'twitch':
          if (!hostname.includes('twitch.tv')) {
            return { valid: false, error: 'Invalid Twitch URL. Must be from twitch.tv' };
          }
          // Check for VOD or clip
          if (!urlObj.pathname.includes('/videos/') && !urlObj.pathname.includes('/clip/')) {
            return { valid: false, error: 'Only Twitch VODs and clips are supported' };
          }
          break;

        case 'google-drive':
          if (!hostname.includes('drive.google.com') && !hostname.includes('docs.google.com')) {
            return { valid: false, error: 'Invalid Google Drive URL' };
          }
          // Check for file ID
          if (!urlObj.pathname.includes('/file/d/') && !urlObj.searchParams.get('id')) {
            return { valid: false, error: 'Google Drive URL must point to a specific file, not a folder' };
          }
          break;

        default:
          return { valid: false, error: `Unsupported platform: ${platform}` };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Check user rate limit
   */
  private async checkUserRateLimit(userId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
    if (!this.redisClient) return { allowed: true };

    try {
      const key = `ratelimit:user:${userId}`;
      const current = await this.redisClient.incr(key);
      
      if (current === 1) {
        // First request in window - set expiry
        await this.redisClient.expire(key, this.USER_RATE_LIMIT_WINDOW);
      }
      
      if (current > this.USER_RATE_LIMIT_MAX) {
        const ttl = await this.redisClient.ttl(key);
        console.log(`[Admission Control] Rate limit exceeded for user ${userId}: ${current}/${this.USER_RATE_LIMIT_MAX}`);
        return {
          allowed: false,
          retryAfter: ttl > 0 ? ttl : this.USER_RATE_LIMIT_WINDOW,
        };
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('[Admission Control] Rate limit check error:', error);
      return { allowed: true }; // Fail open
    }
  }

  /**
   * Check user active jobs limit
   */
  private async checkUserActiveJobs(userId: string): Promise<{ allowed: boolean; estimatedWaitTime?: number }> {
    if (!this.redisClient) return { allowed: true };

    try {
      const key = `activejobs:user:${userId}`;
      const activeCount = await this.redisClient.sCard(key);
      
      if (activeCount >= this.MAX_USER_ACTIVE_JOBS) {
        console.log(`[Admission Control] Max active jobs reached for user ${userId}: ${activeCount}/${this.MAX_USER_ACTIVE_JOBS}`);
        return {
          allowed: false,
          estimatedWaitTime: 180, // Estimate 3 minutes
        };
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('[Admission Control] Active jobs check error:', error);
      return { allowed: true };
    }
  }

  /**
   * Check global queue depth
   */
  private async checkQueueDepth(): Promise<{ allowed: boolean; current?: number }> {
    if (!this.redisClient) return { allowed: true };

    try {
      const key = 'queue:depth:global';
      const current = await this.redisClient.get(key);
      const depth = current ? parseInt(current) : 0;
      
      if (depth >= this.MAX_QUEUE_DEPTH) {
        console.log(`[Admission Control] Queue depth limit reached: ${depth}/${this.MAX_QUEUE_DEPTH}`);
        return {
          allowed: false,
          current: depth,
        };
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('[Admission Control] Queue depth check error:', error);
      return { allowed: true };
    }
  }

  /**
   * Find existing job for URL (deduplication)
   */
  private async findExistingJob(url: string, userId: string): Promise<{ jobId: string } | null> {
    if (!this.redisClient) return null;

    try {
      const urlHash = this.hashUrl(url);
      const key = `job:url:${urlHash}`;
      const jobId = await this.redisClient.get(key);
      
      if (jobId) {
        // Check if job is still active
        const jobKey = `job:${jobId}`;
        const exists = await this.redisClient.exists(jobKey);
        
        if (exists) {
          return { jobId };
        } else {
          // Job completed/failed - clean up stale reference
          await this.redisClient.del(key);
        }
      }
      
      return null;
    } catch (error) {
      console.error('[Admission Control] Find existing job error:', error);
      return null;
    }
  }

  /**
   * Record admission (for tracking)
   */
  private async recordAdmission(request: AdmissionRequest): Promise<void> {
    if (!this.redisClient) return;

    try {
      // Increment user active jobs
      const activeJobsKey = `activejobs:user:${request.userId}`;
      await this.redisClient.sAdd(activeJobsKey, request.url);
      await this.redisClient.expire(activeJobsKey, 7200); // 2 hour safety
      
      // Increment global queue depth
      const depthKey = 'queue:depth:global';
      await this.redisClient.incr(depthKey);
      
      console.log(`[Admission Control] Recorded admission for user ${request.userId}`);
    } catch (error) {
      console.error('[Admission Control] Record admission error:', error);
    }
  }

  /**
   * Record job completion (cleanup)
   */
  async recordCompletion(url: string, userId: string, jobId: string): Promise<void> {
    if (!this.redisClient) return;

    try {
      // Remove from user active jobs
      const activeJobsKey = `activejobs:user:${userId}`;
      await this.redisClient.sRem(activeJobsKey, url);
      
      // Decrement global queue depth
      const depthKey = 'queue:depth:global';
      const current = await this.redisClient.get(depthKey);
      if (current && parseInt(current) > 0) {
        await this.redisClient.decr(depthKey);
      }
      
      // Store URL -> JobID mapping for deduplication (with TTL)
      const urlHash = this.hashUrl(url);
      const key = `job:url:${urlHash}`;
      await this.redisClient.setEx(key, 3600, jobId); // Cache for 1 hour
      
      console.log(`[Admission Control] Recorded completion for job ${jobId}`);
    } catch (error) {
      console.error('[Admission Control] Record completion error:', error);
    }
  }

  /**
   * Record job failure (cleanup)
   */
  async recordFailure(url: string, userId: string): Promise<void> {
    if (!this.redisClient) return;

    try {
      // Remove from user active jobs
      const activeJobsKey = `activejobs:user:${userId}`;
      await this.redisClient.sRem(activeJobsKey, url);
      
      // Decrement global queue depth
      const depthKey = 'queue:depth:global';
      const current = await this.redisClient.get(depthKey);
      if (current && parseInt(current) > 0) {
        await this.redisClient.decr(depthKey);
      }
      
      console.log(`[Admission Control] Recorded failure for user ${userId}`);
    } catch (error) {
      console.error('[Admission Control] Record failure error:', error);
    }
  }

  /**
   * Hash URL for deduplication
   */
  private hashUrl(url: string): string {
    return crypto.createHash('sha256').update(url.toLowerCase().trim()).digest('hex');
  }

  /**
   * Get admission statistics
   */
  async getStats() {
    if (!this.redisClient) return null;

    try {
      const depthKey = 'queue:depth:global';
      const depth = await this.redisClient.get(depthKey);
      
      return {
        globalQueueDepth: depth ? parseInt(depth) : 0,
        maxQueueDepth: this.MAX_QUEUE_DEPTH,
        utilizationPercent: depth ? Math.round((parseInt(depth) / this.MAX_QUEUE_DEPTH) * 100) : 0,
      };
    } catch (error) {
      console.error('[Admission Control] Get stats error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const admissionControl = AdmissionControlService.getInstance();
