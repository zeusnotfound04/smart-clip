import { createClient } from 'redis';

/**
 * Platform Concurrency Controller
 * 
 * Enforces per-platform concurrency limits to prevent spiky traffic.
 * Uses Redis semaphores for distributed coordination.
 * 
 * Platform Budgets (Conservative for 10 free proxies):
 * - Rumble: 3 concurrent downloads
 * - Kick: 2 concurrent downloads  
 * - Twitch: 1 concurrent download
 * - Google Drive: 1 concurrent download
 */

export type SupportedPlatform = 'rumble' | 'kick' | 'twitch' | 'google-drive' | 'zoom-clip' | 'tiktok' | 'instagram' | 'youtube' | 'twitter';

interface PlatformConfig {
  maxConcurrent: number;
  name: string;
}

const PLATFORM_CONFIGS: Record<SupportedPlatform, PlatformConfig> = {
  'rumble': { maxConcurrent: 3, name: 'Rumble' },
  'kick': { maxConcurrent: 2, name: 'Kick' },
  'twitch': { maxConcurrent: 1, name: 'Twitch' },
  'google-drive': { maxConcurrent: 1, name: 'Google Drive' },
  'zoom-clip': { maxConcurrent: 1, name: 'Zoom Clips' },
  'tiktok': { maxConcurrent: 4, name: 'TikTok' },
  'instagram': { maxConcurrent: 3, name: 'Instagram' },
  'youtube': { maxConcurrent: 5, name: 'YouTube' },
  'twitter': { maxConcurrent: 3, name: 'Twitter/X' },
};

export interface PlatformSlot {
  platform: SupportedPlatform;
  slotId: string;
  acquiredAt: number;
}

export class PlatformConcurrencyController {
  private static instance: PlatformConcurrencyController;
  private redisClient: any = null;
  
  // Configuration
  private readonly SLOT_TTL = 3600; // 1 hour safety TTL
  private readonly ACQUISITION_TIMEOUT = 60000; // 60 seconds default timeout
  
  private constructor() {
    this.initRedis();
  }

  public static getInstance(): PlatformConcurrencyController {
    if (!PlatformConcurrencyController.instance) {
      PlatformConcurrencyController.instance = new PlatformConcurrencyController();
    }
    return PlatformConcurrencyController.instance;
  }

  private async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('[Platform Concurrency] Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('[Platform Concurrency] Redis connected');
    } catch (error) {
      console.error('[Platform Concurrency] Failed to connect to Redis:', error);
    }
  }

  /**
   * Acquire a platform slot.
   * Will wait until a slot is available or timeout is reached.
   */
  async acquireSlot(
    platform: SupportedPlatform,
    timeout: number = this.ACQUISITION_TIMEOUT
  ): Promise<PlatformSlot> {
    const config = PLATFORM_CONFIGS[platform];
    const startTime = Date.now();
    
    console.log(`[Platform Concurrency] Attempting to acquire slot for ${config.name} (max: ${config.maxConcurrent})`);
    
    while (Date.now() - startTime < timeout) {
      const slot = await this.tryAcquireSlot(platform);
      
      if (slot) {
        console.log(`[Platform Concurrency] Acquired slot for ${config.name} (slot: ${slot.slotId})`);
        return slot;
      }
      
      // Wait before retrying
      const waitTime = 1000 + Math.random() * 1000; // 1-2 seconds with jitter
      console.log(`[Platform Concurrency] ${config.name} slots full, waiting ${Math.round(waitTime)}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    const currentCount = await this.getCurrentCount(platform);
    throw new Error(
      `Failed to acquire ${config.name} slot within ${timeout}ms. ` +
      `Current slots in use: ${currentCount}/${config.maxConcurrent}`
    );
  }

  /**
   * Try to acquire a slot (non-blocking)
   */
  private async tryAcquireSlot(platform: SupportedPlatform): Promise<PlatformSlot | null> {
    if (!this.redisClient) {
      // Fallback if Redis not available - allow all requests
      console.warn('[Platform Concurrency] Redis not available, allowing request');
      return {
        platform,
        slotId: `fallback:${Date.now()}`,
        acquiredAt: Date.now(),
      };
    }

    const config = PLATFORM_CONFIGS[platform];
    const semaphoreKey = `platform:semaphore:${platform}`;
    const slotId = `${platform}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Get current count
      const currentCount = await this.redisClient.sCard(semaphoreKey);
      
      if (currentCount < config.maxConcurrent) {
        // Add our slot ID to the set
        await this.redisClient.sAdd(semaphoreKey, slotId);
        
        // Set expiry on the slot (safety mechanism)
        await this.redisClient.expire(`platform:slot:${slotId}`, this.SLOT_TTL);
        
        // Verify we didn't exceed the limit due to race condition
        const newCount = await this.redisClient.sCard(semaphoreKey);
        
        if (newCount > config.maxConcurrent) {
          // Race condition - remove our slot
          await this.redisClient.sRem(semaphoreKey, slotId);
          console.log(`[Platform Concurrency] Race condition detected for ${config.name}, retrying...`);
          return null;
        }
        
        return {
          platform,
          slotId,
          acquiredAt: Date.now(),
        };
      }
      
      return null;
    } catch (error) {
      console.error(`[Platform Concurrency] Error acquiring slot:`, error);
      return null;
    }
  }

  /**
   * Release a platform slot
   */
  async releaseSlot(slot: PlatformSlot): Promise<void> {
    if (!this.redisClient) return;

    const config = PLATFORM_CONFIGS[slot.platform];
    const semaphoreKey = `platform:semaphore:${slot.platform}`;
    
    try {
      await this.redisClient.sRem(semaphoreKey, slot.slotId);
      await this.redisClient.del(`platform:slot:${slot.slotId}`);
      
      const duration = Date.now() - slot.acquiredAt;
      console.log(
        `[Platform Concurrency] Released slot for ${config.name} ` +
        `(slot: ${slot.slotId}, duration: ${Math.round(duration / 1000)}s)`
      );
    } catch (error) {
      console.error(`[Platform Concurrency] Error releasing slot:`, error);
    }
  }

  /**
   * Get current slot count for a platform
   */
  async getCurrentCount(platform: SupportedPlatform): Promise<number> {
    if (!this.redisClient) return 0;

    try {
      const semaphoreKey = `platform:semaphore:${platform}`;
      return await this.redisClient.sCard(semaphoreKey);
    } catch (error) {
      console.error(`[Platform Concurrency] Error getting count:`, error);
      return 0;
    }
  }

  /**
   * Get statistics for all platforms
   */
  async getStats(): Promise<Record<SupportedPlatform, { current: number; max: number; available: number }>> {
    const stats: any = {};
    
    for (const [platform, config] of Object.entries(PLATFORM_CONFIGS)) {
      const current = await this.getCurrentCount(platform as SupportedPlatform);
      stats[platform] = {
        current,
        max: config.maxConcurrent,
        available: config.maxConcurrent - current,
      };
    }
    
    return stats;
  }

  /**
   * Clean up stale slots (maintenance operation)
   */
  async cleanupStaleSlots(): Promise<void> {
    if (!this.redisClient) return;

    console.log('[Platform Concurrency] Running stale slot cleanup...');
    
    for (const platform of Object.keys(PLATFORM_CONFIGS) as SupportedPlatform[]) {
      try {
        const semaphoreKey = `platform:semaphore:${platform}`;
        const slotIds = await this.redisClient.sMembers(semaphoreKey);
        
        let removedCount = 0;
        for (const slotId of slotIds) {
          // Check if slot key exists
          const exists = await this.redisClient.exists(`platform:slot:${slotId}`);
          if (!exists) {
            // Slot expired but not removed from set
            await this.redisClient.sRem(semaphoreKey, slotId);
            removedCount++;
          }
        }
        
        if (removedCount > 0) {
          console.log(`[Platform Concurrency] Cleaned up ${removedCount} stale slots for ${platform}`);
        }
      } catch (error) {
        console.error(`[Platform Concurrency] Error cleaning up ${platform}:`, error);
      }
    }
  }

  /**
   * Wait for platform slot availability (useful for queue scheduling)
   */
  async waitForAvailability(platform: SupportedPlatform, timeout: number = 0): Promise<boolean> {
    const config = PLATFORM_CONFIGS[platform];
    const startTime = Date.now();
    
    while (true) {
      const current = await this.getCurrentCount(platform);
      
      if (current < config.maxConcurrent) {
        return true;
      }
      
      if (timeout > 0 && Date.now() - startTime >= timeout) {
        return false;
      }
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

// Export singleton instance
export const platformConcurrency = PlatformConcurrencyController.getInstance();
