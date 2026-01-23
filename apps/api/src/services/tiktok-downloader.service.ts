import fetch from 'node-fetch';
import { createClient } from 'redis';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';

/**
 * TikTok Video Downloader Service
 * 
 * Features:
 * - Multiple API endpoints with automatic fallback
 * - Proxy rotation with Webshare proxies
 * - Redis caching (1-2 hour TTL)
 * - Rate limiting per proxy
 * - Automatic retry with different proxies on failure
 * - Circuit breaker pattern for API failures
 */

interface ProxyConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  country?: string;
  city?: string;
}

interface DownloadResult {
  downloadUrl: string;
  thumbnail?: string;
  duration?: number;
  title?: string;
  author?: string;
  cached: boolean;
}

interface APIEndpoint {
  name: string;
  url: string;
  method: 'POST' | 'GET';
  headers: Record<string, string>;
  bodyFormatter: (url: string) => any;
  responseParser: (response: any) => { downloadUrl: string; thumbnail?: string; title?: string } | null;
}

// Multiple API endpoints for redundancy (more endpoints can be added)
const API_ENDPOINTS: APIEndpoint[] = [
  {
    name: 'ssstik.io',
    url: 'https://ssstik.io/abc?url=dl',
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'origin': 'https://ssstik.io',
      'referer': 'https://ssstik.io/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    bodyFormatter: (url: string) => `id=${encodeURIComponent(url)}&locale=en&tt=aVBQdGRJ`,
    responseParser: (html: string) => {
      const downloadMatch = html.match(/href="([^"]+)"\s+class="[^"]*download[^"]*"/i) ||
                           html.match(/href="([^"]+)"\s+download/i);
      if (!downloadMatch || !downloadMatch[1]) return null;
      
      const thumbnailMatch = html.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
      const titleMatch = html.match(/<p[^>]*class="[^"]*maintext[^"]*"[^>]*>([^<]+)<\/p>/i);
      
      return {
        downloadUrl: downloadMatch[1],
        thumbnail: thumbnailMatch ? thumbnailMatch[1] : undefined,
        title: titleMatch ? titleMatch[1].trim() : undefined
      };
    }
  }
];

// Webshare proxy pool
const PROXY_POOL: ProxyConfig[] = [
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

class TikTokDownloaderService {
  private redisClient: any = null;
  private proxyIndex: number = 0;
  private lastRequestTime: Map<string, number> = new Map();
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerResetTime: number = 0;
  private failureCount: number = 0;
  private currentEndpointIndex: number = 0; // Track which API endpoint to use
  private endpointFailures: Map<string, number> = new Map(); // endpoint name -> failure count
  
  // Configuration
  private readonly CACHE_TTL = 5400; // 1.5 hours in seconds
  private readonly RATE_LIMIT_MS = 1000; // 1 request per second per proxy
  private readonly MAX_RETRIES = 5;
  private readonly REQUEST_TIMEOUT = 15000; // 15 seconds
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes
  private readonly ENDPOINT_FAILURE_THRESHOLD = 3; // Switch endpoint after 3 consecutive failures

  constructor() {
    this.initRedis();
  }

  private async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('[TikTok Downloader] Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('[TikTok Downloader] Redis connected');
    } catch (error) {
      console.error('[TikTok Downloader] Failed to connect to Redis:', error);
    }
  }

  /**
   * Get the current API endpoint with automatic rotation on failures
   */
  private getCurrentEndpoint(): APIEndpoint {
    const endpoint = API_ENDPOINTS[this.currentEndpointIndex];
    const failures = this.endpointFailures.get(endpoint.name) || 0;
    
    // If current endpoint has too many failures, try next one
    if (failures >= this.ENDPOINT_FAILURE_THRESHOLD) {
      console.log(`[TikTok Downloader] Endpoint ${endpoint.name} has ${failures} failures, switching...`);
      this.currentEndpointIndex = (this.currentEndpointIndex + 1) % API_ENDPOINTS.length;
      const newEndpoint = API_ENDPOINTS[this.currentEndpointIndex];
      console.log(`[TikTok Downloader] Now using endpoint: ${newEndpoint.name}`);
      return newEndpoint;
    }
    
    return endpoint;
  }

  /**
   * Record endpoint failure
   */
  private recordEndpointFailure(endpointName: string): void {
    const failures = (this.endpointFailures.get(endpointName) || 0) + 1;
    this.endpointFailures.set(endpointName, failures);
    console.log(`[TikTok Downloader] Endpoint ${endpointName} failure count: ${failures}`);
  }

  /**
   * Reset endpoint failure count on success
   */
  private recordEndpointSuccess(endpointName: string): void {
    if (this.endpointFailures.has(endpointName)) {
      console.log(`[TikTok Downloader] Endpoint ${endpointName} succeeded, resetting failure count`);
      this.endpointFailures.set(endpointName, 0);
    }
  }

  private getCacheKey(tiktokUrl: string): string {
    const hash = crypto.createHash('sha256').update(tiktokUrl).digest('hex');
    return `tiktok:video:${hash}`;
  }

  private async getCached(tiktokUrl: string): Promise<DownloadResult | null> {
    if (!this.redisClient) return null;

    try {
      const cacheKey = this.getCacheKey(tiktokUrl);
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        console.log('[TikTok Downloader] Cache HIT:', tiktokUrl);
        const data = JSON.parse(cached);
        return { ...data, cached: true };
      }
      
      console.log('[TikTok Downloader] Cache MISS:', tiktokUrl);
    } catch (error) {
      console.error('[TikTok Downloader] Cache read error:', error);
    }
    
    return null;
  }

  private async setCached(tiktokUrl: string, result: DownloadResult): Promise<void> {
    if (!this.redisClient) return;

    try {
      const cacheKey = this.getCacheKey(tiktokUrl);
      const data = { ...result, cached: undefined };
      await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(data));
      console.log(`[TikTok Downloader] Cached for ${this.CACHE_TTL}s:`, tiktokUrl);
    } catch (error) {
      console.error('[TikTok Downloader] Cache write error:', error);
    }
  }

  private getNextProxy(): ProxyConfig {
    const proxy = PROXY_POOL[this.proxyIndex];
    this.proxyIndex = (this.proxyIndex + 1) % PROXY_POOL.length;
    return proxy;
  }

  private createProxyAgent(proxy: ProxyConfig): HttpsProxyAgent {
    const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    return new HttpsProxyAgent(proxyUrl);
  }

  private async enforceRateLimit(proxyKey: string): Promise<void> {
    const lastRequest = this.lastRequestTime.get(proxyKey) || 0;
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      const waitTime = this.RATE_LIMIT_MS - timeSinceLastRequest;
      const jitter = Math.floor(Math.random() * 1000) + 500;
      const totalWait = waitTime + jitter;
      
      console.log(`[TikTok Downloader] Rate limit: waiting ${totalWait}ms`);
      await new Promise(resolve => setTimeout(resolve, totalWait));
    }

    this.lastRequestTime.set(proxyKey, Date.now());
  }

  private checkCircuitBreaker(): void {
    if (this.circuitBreakerOpen) {
      const now = Date.now();
      if (now < this.circuitBreakerResetTime) {
        const remainingTime = Math.ceil((this.circuitBreakerResetTime - now) / 1000);
        throw new Error(`Circuit breaker is OPEN. Service will retry in ${remainingTime} seconds.`);
      } else {
        console.log('[TikTok Downloader] Circuit breaker RESET');
        this.circuitBreakerOpen = false;
        this.failureCount = 0;
      }
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerOpen = true;
      this.circuitBreakerResetTime = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
      console.error(`[TikTok Downloader] Circuit breaker OPENED after ${this.failureCount} failures`);
    }
  }

  private recordSuccess(): void {
    if (this.failureCount > 0) {
      console.log('[TikTok Downloader] Success - resetting failure count');
      this.failureCount = 0;
    }
  }

  private normalizeUrl(url: string): string {
    // Handle vm.tiktok.com short URLs and regular URLs
    try {
      const urlObj = new URL(url);
      return url;
    } catch {
      return url;
    }
  }

  private async fetchWithProxy(tiktokUrl: string, proxy: ProxyConfig, retryAttempt: number): Promise<string> {
    const proxyKey = `${proxy.host}:${proxy.port}`;
    
    await this.enforceRateLimit(proxyKey);

    const agent = this.createProxyAgent(proxy);
    
    // Get current endpoint (automatically rotates on failures)
    const endpoint = this.getCurrentEndpoint();

    console.log(`[TikTok Downloader] Attempt ${retryAttempt + 1} via ${proxy.city}, ${proxy.country} using ${endpoint.name}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const requestBody = endpoint.bodyFormatter(tiktokUrl);
      
      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: endpoint.headers,
        body: endpoint.method === 'POST' ? requestBody : undefined,
        // @ts-ignore
        agent,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.recordEndpointFailure(endpoint.name);
        throw new Error(`API responded with ${response.status}: ${response.statusText}`);
      }

      // Parse response based on content type
      let data: any;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Handle HTML/text response
        data = await response.text();
      }

      console.log(`[TikTok Downloader] API response from ${endpoint.name} (first 200 chars):`, 
                  typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data).substring(0, 200));

      // Parse using endpoint-specific parser
      const parsed = endpoint.responseParser(data);
      
      if (!parsed || !parsed.downloadUrl) {
        this.recordEndpointFailure(endpoint.name);
        throw new Error(`No download URL found in response from ${endpoint.name}`);
      }

      console.log(`[TikTok Downloader] Successfully extracted download URL from ${endpoint.name}`);
      this.recordEndpointSuccess(endpoint.name);
      
      return parsed.downloadUrl;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        this.recordEndpointFailure(endpoint.name);
        throw new Error(`Request timeout after ${this.REQUEST_TIMEOUT}ms on ${endpoint.name}`);
      }
      
      console.error(`[TikTok Downloader] Error with ${endpoint.name}:`, error.message);
      this.recordEndpointFailure(endpoint.name);
      throw error;
    }
  }

  async getDownloadUrl(tiktokUrl: string): Promise<DownloadResult> {
    if (!this.isValidTikTokUrl(tiktokUrl)) {
      throw new Error('Invalid TikTok URL. Supported: tiktok.com/*, vm.tiktok.com/*');
    }

    this.checkCircuitBreaker();

    const cached = await this.getCached(tiktokUrl);
    if (cached) {
      return cached;
    }

    console.log(`[TikTok Downloader] Fetching: ${tiktokUrl}`);

    let lastError: Error | null = null;
    const triedProxies = new Set<string>();

    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      const proxy = this.getNextProxy();
      const proxyKey = `${proxy.host}:${proxy.port}`;

      if (triedProxies.has(proxyKey)) {
        continue;
      }
      triedProxies.add(proxyKey);

      try {
        const downloadUrl = await this.fetchWithProxy(tiktokUrl, proxy, attempt);
        
        const result: DownloadResult = {
          downloadUrl,
          cached: false
        };

        await this.setCached(tiktokUrl, result);
        this.recordSuccess();

        return result;

      } catch (error: any) {
        lastError = error;
        console.error(`[TikTok Downloader] Failed via ${proxy.city}, ${proxy.country}:`, error.message);
        
        if (attempt < this.MAX_RETRIES - 1) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`[TikTok Downloader] Retrying in ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    }

    this.recordFailure();
    
    throw new Error(
      `Failed to download TikTok video after ${this.MAX_RETRIES} attempts. ` +
      `Last error: ${lastError?.message || 'Unknown error'}`
    );
  }

  private isValidTikTokUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      return hostname.includes('tiktok.com') || hostname.includes('vm.tiktok.com');
      
    } catch {
      return false;
    }
  }

  getStats() {
    return {
      endpoints: API_ENDPOINTS.map((ep, idx) => ({
        name: ep.name,
        active: idx === this.currentEndpointIndex,
        failures: this.endpointFailures.get(ep.name) || 0
      })),
      proxyCount: PROXY_POOL.length,
      currentProxyIndex: this.proxyIndex,
      circuitBreakerOpen: this.circuitBreakerOpen,
      failureCount: this.failureCount,
      cacheTTL: this.CACHE_TTL,
      rateLimit: `${this.RATE_LIMIT_MS}ms per proxy`
    };
  }

  async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('[TikTok Downloader] Redis connection closed');
    }
  }
}

export const tiktokDownloader = new TikTokDownloaderService();
export default tiktokDownloader;
