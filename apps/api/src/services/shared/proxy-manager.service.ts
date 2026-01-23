import { createClient } from 'redis';
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * Shared Proxy Manager Service
 * 
 * Centralized proxy management for all platform downloaders.
 * Implements safe, non-abusive proxy usage patterns.
 * 
 * Key Features:
 * - One active download per proxy at a time
 * - Automatic failure tracking and proxy quarantine
 * - Even distribution across proxy pool
 * - Conservative rate limiting
 */

export interface ProxyConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  country?: string;
  city?: string;
}

export interface ProxyLease {
  proxy: ProxyConfig;
  leaseId: string;
  agent: HttpsProxyAgent;
}

interface ProxyStats {
  totalRequests: number;
  failures: number;
  lastUsed: number;
  quarantinedUntil: number;
}

export class ProxyManagerService {
  private static instance: ProxyManagerService;
  private redisClient: any = null;
  private readonly PROXY_POOL: ProxyConfig[];
  private proxyStats: Map<string, ProxyStats> = new Map();
  
  // Configuration
  private readonly RATE_LIMIT_MS = 2000; // 2 seconds between requests per proxy
  private readonly QUARANTINE_DURATION = 300000; // 5 minutes
  private readonly FAILURE_THRESHOLD = 3; // Quarantine after 3 failures
  private readonly MAX_CONCURRENT_PER_PROXY = 1; // One download per proxy
  
  private constructor() {
    // Same proxy pool from TikTok downloader - 10 datacenter proxies
    this.PROXY_POOL = [
      { host: '142.111.48.253', port: 7030, username: 'zswtodaf', password: '65jraof60tyw', country: 'US', city: 'Los Angeles' },
      { host: '23.95.150.145', port: 6114, username: 'zswtodaf', password: '65jraof60tyw', country: 'US', city: 'Buffalo' },
      { host: '198.23.239.134', port: 6540, username: 'zswtodaf', password: '65jraof60tyw', country: 'US', city: 'Buffalo' },
      { host: '107.172.163.27', port: 6543, username: 'zswtodaf', password: '65jraof60tyw', country: 'US', city: 'Bloomingdale' },
      { host: '198.105.121.200', port: 6462, username: 'zswtodaf', password: '65jraof60tyw', country: 'GB', city: 'London' },
      { host: '64.137.96.74', port: 6641, username: 'zswtodaf', password: '65jraof60tyw', country: 'ES', city: 'Madrid' },
      { host: '84.247.60.125', port: 6095, username: 'zswtodaf', password: '65jraof60tyw', country: 'PL', city: 'Warsaw' },
      { host: '216.10.27.159', port: 6837, username: 'zswtodaf', password: '65jraof60tyw', country: 'US', city: 'Dallas' },
      { host: '23.26.71.145', port: 5628, username: 'zswtodaf', password: '65jraof60tyw', country: 'US', city: 'Orem' },
      { host: '23.27.208.120', port: 5830, username: 'zswtodaf', password: '65jraof60tyw', country: 'US', city: 'Reston' },
    ];
    
    // Initialize stats for each proxy
    this.PROXY_POOL.forEach(proxy => {
      const key = this.getProxyKey(proxy);
      this.proxyStats.set(key, {
        totalRequests: 0,
        failures: 0,
        lastUsed: 0,
        quarantinedUntil: 0,
      });
    });
    
    this.initRedis();
  }

  public static getInstance(): ProxyManagerService {
    if (!ProxyManagerService.instance) {
      ProxyManagerService.instance = new ProxyManagerService();
    }
    return ProxyManagerService.instance;
  }

  private async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('[Proxy Manager] Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('[Proxy Manager] Redis connected');
    } catch (error) {
      console.error('[Proxy Manager] Failed to connect to Redis:', error);
    }
  }

  private getProxyKey(proxy: ProxyConfig): string {
    return `${proxy.host}:${proxy.port}`;
  }

  /**
   * Acquire a proxy lease for a download operation.
   * Implements:
   * - One download per proxy at a time
   * - Even distribution across pool
   * - Automatic quarantine avoidance
   * - Rate limiting
   */
  async acquireLease(platform: string, timeout: number = 30000): Promise<ProxyLease> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Find best available proxy
      const proxy = await this.findAvailableProxy(platform);
      
      if (proxy) {
        const leaseId = `${platform}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
        const proxyKey = this.getProxyKey(proxy);
        
        // Acquire Redis lock
        const locked = await this.acquireRedisLock(proxyKey, leaseId);
        
        if (locked) {
          // Enforce rate limiting
          await this.enforceRateLimit(proxyKey);
          
          // Update stats
          const stats = this.proxyStats.get(proxyKey)!;
          stats.lastUsed = Date.now();
          stats.totalRequests++;
          
          console.log(`[Proxy Manager] Leased proxy ${proxyKey} for ${platform} (lease: ${leaseId})`);
          
          return {
            proxy,
            leaseId,
            agent: this.createProxyAgent(proxy),
          };
        }
      }
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`Failed to acquire proxy lease for ${platform} within ${timeout}ms`);
  }

  /**
   * Release a proxy lease
   */
  async releaseLease(lease: ProxyLease): Promise<void> {
    const proxyKey = this.getProxyKey(lease.proxy);
    
    try {
      await this.releaseRedisLock(proxyKey, lease.leaseId);
      console.log(`[Proxy Manager] Released proxy ${proxyKey} (lease: ${lease.leaseId})`);
    } catch (error) {
      console.error(`[Proxy Manager] Failed to release lease:`, error);
    }
  }

  /**
   * Record a successful operation with a proxy
   */
  recordSuccess(lease: ProxyLease): void {
    const proxyKey = this.getProxyKey(lease.proxy);
    const stats = this.proxyStats.get(proxyKey);
    
    if (stats) {
      // Reset failure count on success
      stats.failures = 0;
      console.log(`[Proxy Manager] Success recorded for ${proxyKey}`);
    }
  }

  /**
   * Record a failure with a proxy
   * Automatically quarantines proxy if threshold exceeded
   */
  recordFailure(lease: ProxyLease, error: any): void {
    const proxyKey = this.getProxyKey(lease.proxy);
    const stats = this.proxyStats.get(proxyKey);
    
    if (stats) {
      stats.failures++;
      console.log(`[Proxy Manager] Failure recorded for ${proxyKey} (count: ${stats.failures})`);
      
      // Quarantine if too many failures
      if (stats.failures >= this.FAILURE_THRESHOLD) {
        stats.quarantinedUntil = Date.now() + this.QUARANTINE_DURATION;
        console.warn(`[Proxy Manager] Proxy ${proxyKey} quarantined until ${new Date(stats.quarantinedUntil).toISOString()}`);
      }
    }
  }

  /**
   * Find the best available proxy for a platform
   */
  private async findAvailableProxy(platform: string): Promise<ProxyConfig | null> {
    const now = Date.now();
    let bestProxy: ProxyConfig | null = null;
    let lowestUsage = Infinity;
    
    for (const proxy of this.PROXY_POOL) {
      const proxyKey = this.getProxyKey(proxy);
      const stats = this.proxyStats.get(proxyKey)!;
      
      // Skip quarantined proxies
      if (stats.quarantinedUntil > now) {
        continue;
      }
      
      // Check if proxy is available (not locked)
      const isLocked = await this.isProxyLocked(proxyKey);
      if (isLocked) {
        continue;
      }
      
      // Choose proxy with lowest usage for even distribution
      if (stats.totalRequests < lowestUsage) {
        lowestUsage = stats.totalRequests;
        bestProxy = proxy;
      }
    }
    
    return bestProxy;
  }

  /**
   * Enforce rate limiting for a proxy
   */
  private async enforceRateLimit(proxyKey: string): Promise<void> {
    const stats = this.proxyStats.get(proxyKey)!;
    const timeSinceLastUse = Date.now() - stats.lastUsed;
    
    if (timeSinceLastUse < this.RATE_LIMIT_MS) {
      const waitTime = this.RATE_LIMIT_MS - timeSinceLastUse;
      console.log(`[Proxy Manager] Rate limiting ${proxyKey}: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  /**
   * Create HTTPS proxy agent
   */
  private createProxyAgent(proxy: ProxyConfig): HttpsProxyAgent {
    const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    return new HttpsProxyAgent(proxyUrl);
  }

  /**
   * Acquire Redis lock for proxy
   */
  private async acquireRedisLock(proxyKey: string, leaseId: string): Promise<boolean> {
    if (!this.redisClient) return true; // Fallback if Redis not available
    
    try {
      const lockKey = `proxy:lock:${proxyKey}`;
      const result = await this.redisClient.set(lockKey, leaseId, {
        NX: true, // Only set if not exists
        EX: 300, // Expire after 5 minutes (safety)
      });
      
      return result === 'OK';
    } catch (error) {
      console.error('[Proxy Manager] Redis lock error:', error);
      return false;
    }
  }

  /**
   * Release Redis lock for proxy
   */
  private async releaseRedisLock(proxyKey: string, leaseId: string): Promise<void> {
    if (!this.redisClient) return;
    
    try {
      const lockKey = `proxy:lock:${proxyKey}`;
      // Only delete if we own the lock
      const currentLease = await this.redisClient.get(lockKey);
      if (currentLease === leaseId) {
        await this.redisClient.del(lockKey);
      }
    } catch (error) {
      console.error('[Proxy Manager] Redis unlock error:', error);
    }
  }

  /**
   * Check if proxy is locked
   */
  private async isProxyLocked(proxyKey: string): Promise<boolean> {
    if (!this.redisClient) return false;
    
    try {
      const lockKey = `proxy:lock:${proxyKey}`;
      const exists = await this.redisClient.exists(lockKey);
      return exists === 1;
    } catch (error) {
      console.error('[Proxy Manager] Redis check error:', error);
      return false;
    }
  }

  /**
   * Get proxy statistics for monitoring
   */
  getStats() {
    const stats: any[] = [];
    const now = Date.now();
    
    for (const proxy of this.PROXY_POOL) {
      const proxyKey = this.getProxyKey(proxy);
      const proxyStats = this.proxyStats.get(proxyKey)!;
      
      stats.push({
        proxy: proxyKey,
        country: proxy.country,
        city: proxy.city,
        totalRequests: proxyStats.totalRequests,
        failures: proxyStats.failures,
        quarantined: proxyStats.quarantinedUntil > now,
        quarantinedUntil: proxyStats.quarantinedUntil > now ? new Date(proxyStats.quarantinedUntil).toISOString() : null,
      });
    }
    
    return stats;
  }
}

// Export singleton instance
export const proxyManager = ProxyManagerService.getInstance();
