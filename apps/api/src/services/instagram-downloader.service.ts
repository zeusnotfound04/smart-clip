 import fetch from 'node-fetch';
import { createClient } from 'redis';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';
import youtubeDl from 'youtube-dl-exec';

/**
 * Instagram Video Downloader Service
 * 
 * Features:
 * - Multiple API endpoints with automatic fallback
 * - yt-dlp fallback for reliability
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
  cached: boolean;
}

interface APIEndpoint {
  name: string;
  url: string;
  method: 'POST' | 'GET';
  headers: Record<string, string>;
  bodyFormatter: (url: string) => any;
  responseParser: (response: any) => { downloadUrl: string; thumbnail?: string } | null;
}

interface InstagramAPIResponse {
  data?: {
    resources?: Array<{
      type: string;
      download_url: string;
      thumbnail?: string;
      duration?: number;
    }>;
  };
  error?: string;
}

// Multiple API endpoints for redundancy (more endpoints can be added)
const API_ENDPOINTS: APIEndpoint[] = [
  {
    name: 'imginn.com',
    url: 'https://imginn.com/p/{postId}/',
    method: 'GET',
    headers: {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'accept-encoding': 'gzip, deflate, br',
      'accept-language': 'en-US,en;q=0.9',
      'cache-control': 'max-age=0',
      'dnt': '1',
      'referer': 'https://imginn.com/',
      'sec-ch-ua': '"Chromium";v="144", "Google Chrome";v="144", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'document',
      'sec-fetch-mode': 'navigate',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-user': '?1',
      'upgrade-insecure-requests': '1',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36'
    },
    bodyFormatter: (url: string) => {
      // For imginn, we don't need body, but we need to convert URL
      // This will be handled in fetchFromEndpoint
      return null;
    },
    responseParser: (data: any) => {
      try {
        // imginn.com returns HTML, parse it to extract video URL
        if (typeof data !== 'string') {
          console.log('[Instagram Downloader] imginn.com expected HTML string, got:', typeof data);
          return null;
        }

        // Pattern 1: Look for download link with class "download"
        // Example: <a download rel="noreferrer" href="https://scontent-iad3-2.cdninstagram.com/o1/v/t2/f2/m86/...mp4?..." class="download">
        const downloadLinkMatch = data.match(/<a[^>]*class="download"[^>]*href="([^"]+)"/i);
        if (downloadLinkMatch && downloadLinkMatch[1]) {
          // Remove &dl=1 parameter if present and decode HTML entities
          let url = downloadLinkMatch[1].replace(/&dl=1$/, '');
          url = url.replace(/&#38;/g, '&').replace(/&amp;/g, '&');
          console.log('[Instagram Downloader] Found video URL in download link');
          return {
            downloadUrl: url
          };
        }

        // Pattern 2: Look for data-src attribute in media-wrap
        // Example: <div class="media-wrap proxy-video" ... data-src="https://...mp4?...">
        const dataSrcMatch = data.match(/class="[^"]*media-wrap[^"]*"[^>]*data-src="([^"]+)"/i);
        if (dataSrcMatch && dataSrcMatch[1]) {
          let url = dataSrcMatch[1].replace(/&#38;/g, '&').replace(/&amp;/g, '&');
          console.log('[Instagram Downloader] Found video URL in data-src attribute');
          return {
            downloadUrl: url
          };
        }

        // Pattern 3: Look for <video> tag with src
        const videoTagMatch = data.match(/<video[^>]*src="([^"]+)"/i);
        if (videoTagMatch && videoTagMatch[1]) {
          let url = videoTagMatch[1].replace(/&#38;/g, '&').replace(/&amp;/g, '&');
          console.log('[Instagram Downloader] Found video URL in <video> tag');
          return {
            downloadUrl: url
          };
        }

        // Pattern 4: Look for meta property og:video
        const ogVideoMatch = data.match(/<meta\s+property="og:video"\s+content="([^"]+)"/i);
        if (ogVideoMatch && ogVideoMatch[1]) {
          let url = ogVideoMatch[1].replace(/&#38;/g, '&').replace(/&amp;/g, '&');
          console.log('[Instagram Downloader] Found video URL in og:video meta tag');
          return {
            downloadUrl: url
          };
        }

        // Pattern 5: Look for direct .mp4 URLs in HTML
        const mp4Match = data.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
        if (mp4Match && mp4Match[0]) {
          let url = mp4Match[0].replace(/&#38;/g, '&').replace(/&amp;/g, '&');
          console.log('[Instagram Downloader] Found .mp4 URL in HTML');
          return {
            downloadUrl: url
          };
        }

        console.log('[Instagram Downloader] No video URL found in imginn.com HTML');
        console.log('[Instagram Downloader] HTML preview:', data.substring(0, 1000));
        return null;
      } catch (error: any) {
        console.error('[Instagram Downloader] Error parsing imginn.com response:', error.message);
        return null;
      }
    }
  },
  {
    name: 'igvideodownloader.net',
    url: 'https://igvideodownloader.net/api/proxy',
    method: 'POST',
    headers: {
      'accept': '*/*',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'accept-language': 'en-GB,en;q=0.5',
      'content-type': 'application/json',
      'cookie': 'vdm_did=e09fc974-47bc-44db-995a-45e100fbd8dc; uid=589e87d-ad254c47-a84111de-cde297ff%3D1769198434897',
      'origin': 'https://igvideodownloader.net',
      'priority': 'u=1, i',
      'referer': 'https://igvideodownloader.net/',
      'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Brave";v="144"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'sec-gpc': '1',
      'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36'
    },
    bodyFormatter: (url: string) => JSON.stringify({
      url: '/media/parse',
      data: {
        origin: 'source',
        link: url
      },
      token: ''
    }),
    responseParser: (data: any) => {
      // Check for error response
      if (data?.msg && data.msg.includes('parse error')) {
        console.log('[Instagram Downloader] API returned error:', data.msg);
        return null;
      }
      
      // Find video resource
      const videoResource = data?.data?.resources?.find((r: any) => r.type === 'video');
      
      if (videoResource?.download_url) {
        return {
          downloadUrl: videoResource.download_url,
          thumbnail: videoResource.thumbnail
        };
      }
      
      return null;
    }
  },
  {
    name: 'vidssave.com',
    url: 'https://api.vidssave.com/api/contentsite_api/media/parse',
    method: 'POST',
    headers: {
      'accept': '*/*',
      'accept-language': 'en-GB,en;q=0.6',
      'content-type': 'application/x-www-form-urlencoded',
      'origin': 'https://vidssave.com',
      'priority': 'u=1, i',
      'referer': 'https://vidssave.com/',
      'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Brave";v="144"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'sec-gpc': '1',
      'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Mobile Safari/537.36'
    },
    bodyFormatter: (url: string) => {
      const encodedUrl = encodeURIComponent(url);
      return `auth=20250901majwlqo&domain=api-ak.vidssave.com&origin=source&link=${encodedUrl}`;
    },
    responseParser: (data: any) => {
      // Check for error or invalid status
      if (!data?.status || data.status !== 1) {
        console.log('[Instagram Downloader] vidssave.com returned error status:', data?.status);
        console.log('[Instagram Downloader] vidssave.com full error response:', JSON.stringify(data, null, 2));
        return null;
      }
      
      // Find video resource
      const videoResource = data?.data?.resources?.find((r: any) => r.type === 'video');
      
      if (videoResource?.download_url) {
        return {
          downloadUrl: videoResource.download_url,
          thumbnail: data.data.thumbnail
        };
      }
      
      // Log when video resource not found
      console.log('[Instagram Downloader] vidssave.com: No video resource found in response');
      console.log('[Instagram Downloader] Available resources:', data?.data?.resources?.map((r: any) => r.type));
      
      return null;
    }
  }
];

/**
 * Extract post ID from Instagram URL
 * Supports:
 * - https://www.instagram.com/reels/DT-Y6xukuwG/
 * - https://www.instagram.com/p/DT-Y6xukuwG/
 * - https://instagram.com/reel/DT-Y6xukuwG/
 */
function extractPostId(instagramUrl: string): string {
  try {
    const urlObj = new URL(instagramUrl);
    const path = urlObj.pathname;
    
    // Match patterns: /reels/{id}/ or /p/{id}/ or /reel/{id}/
    const match = path.match(/\/(reels?|p)\/([a-zA-Z0-9_-]+)/);
    
    if (match && match[2]) {
      return match[2];
    }
    
    throw new Error('Could not extract post ID from Instagram URL');
  } catch (error: any) {
    throw new Error(`Invalid Instagram URL: ${error.message}`);
  }
}

/**
 * Convert Instagram URL to imginn.com URL
 * Example: https://www.instagram.com/reels/DT-Y6xukuwG/ -> https://imginn.com/p/DT-Y6xukuwG/
 */
function convertToImginnUrl(instagramUrl: string): string {
  const postId = extractPostId(instagramUrl);
  return `https://imginn.com/p/${postId}/`;
}

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

class InstagramDownloaderService {
  private redisClient: any = null;
  private proxyIndex: number = 0;
  private lastRequestTime: Map<string, number> = new Map(); // proxy -> timestamp
  private circuitBreakerOpen: boolean = false;
  private circuitBreakerResetTime: number = 0;
  private failureCount: number = 0;
  private currentEndpointIndex: number = 0; // Track which API endpoint to use
  private endpointFailures: Map<string, number> = new Map(); // endpoint name -> failure count
  
  // Configuration
  private readonly CACHE_TTL = 7200; // 2 hours in seconds
  private readonly RATE_LIMIT_MS = 1000; // 1 request per second per proxy
  private readonly MAX_RETRIES = 5; // Try up to 5 different proxies
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening
  private readonly CIRCUIT_BREAKER_TIMEOUT = 300000; // 5 minutes
  private readonly ENDPOINT_FAILURE_THRESHOLD = 3; // Switch endpoint after 3 consecutive failures

  constructor() {
    this.initRedis();
  }

  /**
   * Initialize Redis client
   */
  private async initRedis() {
    try {
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });
      
      this.redisClient.on('error', (err: Error) => {
        console.error('Redis Client Error:', err);
      });

      await this.redisClient.connect();
      console.log('[Instagram Downloader] Redis connected');
    } catch (error) {
      console.error('[Instagram Downloader] Failed to connect to Redis:', error);
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
      console.log(`[Instagram Downloader] Endpoint ${endpoint.name} has ${failures} failures, switching...`);
      this.currentEndpointIndex = (this.currentEndpointIndex + 1) % API_ENDPOINTS.length;
      const newEndpoint = API_ENDPOINTS[this.currentEndpointIndex];
      console.log(`[Instagram Downloader] Now using endpoint: ${newEndpoint.name}`);
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
    console.log(`[Instagram Downloader] Endpoint ${endpointName} failure count: ${failures}`);
  }

  /**
   * Reset endpoint failure count on success
   */
  private recordEndpointSuccess(endpointName: string): void {
    if (this.endpointFailures.has(endpointName)) {
      console.log(`[Instagram Downloader] Endpoint ${endpointName} succeeded, resetting failure count`);
      this.endpointFailures.set(endpointName, 0);
    }
  }

  /**
   * Generate cache key from Instagram URL
   */
  private getCacheKey(instagramUrl: string): string {
    const hash = crypto.createHash('sha256').update(instagramUrl).digest('hex');
    return `instagram:video:${hash}`;
  }

  /**
   * Get cached download URL
   */
  private async getCached(instagramUrl: string): Promise<DownloadResult | null> {
    if (!this.redisClient) return null;

    try {
      const cacheKey = this.getCacheKey(instagramUrl);
      const cached = await this.redisClient.get(cacheKey);
      
      if (cached) {
        console.log('[Instagram Downloader] Cache HIT:', instagramUrl);
        const data = JSON.parse(cached);
        return { ...data, cached: true };
      }
      
      console.log('[Instagram Downloader] Cache MISS:', instagramUrl);
    } catch (error) {
      console.error('[Instagram Downloader] Cache read error:', error);
    }
    
    return null;
  }

  /**
   * Cache download URL
   */
  private async setCached(instagramUrl: string, result: DownloadResult): Promise<void> {
    if (!this.redisClient) return;

    try {
      const cacheKey = this.getCacheKey(instagramUrl);
      const data = { ...result, cached: undefined }; // Remove cached flag
      await this.redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(data));
      console.log(`[Instagram Downloader] Cached for ${this.CACHE_TTL}s:`, instagramUrl);
    } catch (error) {
      console.error('[Instagram Downloader] Cache write error:', error);
    }
  }

  /**
   * Get next proxy from pool (round-robin)
   */
  private getNextProxy(): ProxyConfig {
    const proxy = PROXY_POOL[this.proxyIndex];
    this.proxyIndex = (this.proxyIndex + 1) % PROXY_POOL.length;
    return proxy;
  }

  /**
   * Create proxy agent
   */
  private createProxyAgent(proxy: ProxyConfig): HttpsProxyAgent<string> {
    const proxyUrl = `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
    return new HttpsProxyAgent<string>(proxyUrl);
  }

  /**
   * Rate limiting per proxy
   */
  private async enforceRateLimit(proxyKey: string): Promise<void> {
    const lastRequest = this.lastRequestTime.get(proxyKey) || 0;
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequest;

    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      const waitTime = this.RATE_LIMIT_MS - timeSinceLastRequest;
      // Add jitter (500-1500ms)
      const jitter = Math.floor(Math.random() * 1000) + 500;
      const totalWait = waitTime + jitter;
      
      console.log(`[Instagram Downloader] Rate limit: waiting ${totalWait}ms`);
      await new Promise(resolve => setTimeout(resolve, totalWait));
    }

    this.lastRequestTime.set(proxyKey, Date.now());
  }

  /**
   * Check circuit breaker status
   */
  private checkCircuitBreaker(): void {
    if (this.circuitBreakerOpen) {
      const now = Date.now();
      if (now < this.circuitBreakerResetTime) {
        const remainingTime = Math.ceil((this.circuitBreakerResetTime - now) / 1000);
        throw new Error(`Circuit breaker is OPEN. Service will retry in ${remainingTime} seconds.`);
      } else {
        // Reset circuit breaker
        console.log('[Instagram Downloader] Circuit breaker RESET');
        this.circuitBreakerOpen = false;
        this.failureCount = 0;
      }
    }
  }

  /**
   * Record failure and check if circuit breaker should open
   */
  private recordFailure(): void {
    this.failureCount++;
    
    if (this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreakerOpen = true;
      this.circuitBreakerResetTime = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
      console.error(`[Instagram Downloader] Circuit breaker OPENED after ${this.failureCount} failures`);
    }
  }

  /**
   * Reset failure count on success
   */
  private recordSuccess(): void {
    if (this.failureCount > 0) {
      console.log('[Instagram Downloader] Success - resetting failure count');
      this.failureCount = 0;
    }
  }

  /**
   * Fetch download URL from API - tries direct connection first, then proxy
   */
  private async fetchWithProxy(instagramUrl: string, proxy: ProxyConfig, retryAttempt: number): Promise<string> {
    const endpoint = this.getCurrentEndpoint();
    
    // Try direct connection first (no proxy) on first attempt
    if (retryAttempt === 0) {
      console.log(`[Instagram Downloader] Attempt ${retryAttempt + 1} using ${endpoint.name} (direct connection)`);
      
      try {
        const result = await this.fetchFromEndpoint(instagramUrl, endpoint, null);
        console.log('[Instagram Downloader] Direct connection succeeded');
        return result;
      } catch (directError: any) {
        console.log('[Instagram Downloader] Direct connection failed, will try with proxy:', directError.message);
      }
    }
    
    // Fallback to proxy
    const proxyKey = `${proxy.host}:${proxy.port}`;
    await this.enforceRateLimit(proxyKey);
    const agent = this.createProxyAgent(proxy);
    
    console.log(`[Instagram Downloader] Attempt ${retryAttempt + 1} via ${proxy.city}, ${proxy.country} using ${endpoint.name}`);
    
    return await this.fetchFromEndpoint(instagramUrl, endpoint, agent);
  }

  /**
   * Fetch from API endpoint with optional proxy agent
   */
  private async fetchFromEndpoint(
    instagramUrl: string,
    endpoint: APIEndpoint,
    agent: HttpsProxyAgent<string> | null
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      // For imginn.com, convert Instagram URL to imginn URL
      let targetUrl = endpoint.url;
      if (endpoint.name === 'imginn.com') {
        targetUrl = convertToImginnUrl(instagramUrl);
        console.log(`[Instagram Downloader] Converted to imginn URL: ${targetUrl}`);
      }
      
      const requestBody = endpoint.bodyFormatter(instagramUrl);
      
      const response = await fetch(targetUrl, {
        method: endpoint.method,
        headers: endpoint.headers,
        body: endpoint.method === 'POST' ? requestBody : undefined,
        // @ts-ignore
        agent,
        signal: controller.signal,
        redirect: 'follow', // Follow redirects
        // @ts-ignore - node-fetch specific options
        follow: 10, // Max redirects
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.recordEndpointFailure(endpoint.name);
        
        // Special handling for Cloudflare or rate limiting
        if (response.status === 403) {
          console.log(`[Instagram Downloader] ${endpoint.name} returned 403 - likely blocked by Cloudflare/rate limit`);
        } else if (response.status === 429) {
          console.log(`[Instagram Downloader] ${endpoint.name} returned 429 - rate limited`);
        }
        
        throw new Error(`API responded with ${response.status}: ${response.statusText}`);
      }

      // Parse response based on content type
      let data: any;
      const contentType = response.headers.get('content-type') || '';
      
      // imginn.com returns HTML, which is expected
      if (endpoint.name === 'imginn.com' && contentType.includes('text/html')) {
        data = await response.text();
      } else if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/html')) {
        const text = await response.text();
        console.log(`[Instagram Downloader] ${endpoint.name} returned HTML instead of JSON:`, text.substring(0, 500));
        throw new Error(`${endpoint.name} returned HTML instead of JSON - possible blocking or rate limit`);
      } else {
        // Handle other text response
        data = { data: await response.text() };
      }

      // Log full response for debugging (limit to first 2000 chars to avoid spam)
      const dataStr = JSON.stringify(data, null, 2);
      console.log(`[Instagram Downloader] API response from ${endpoint.name} (${dataStr.length} chars):`, 
        dataStr.length > 2000 ? dataStr.substring(0, 2000) + '...[truncated]' : dataStr);

      // Parse using endpoint-specific parser
      const parsed = endpoint.responseParser(data);
      
      if (!parsed || !parsed.downloadUrl) {
        this.recordEndpointFailure(endpoint.name);
        throw new Error(`No download URL found in response from ${endpoint.name}`);
      }

      console.log(`[Instagram Downloader] Successfully extracted download URL from ${endpoint.name}`);
      this.recordEndpointSuccess(endpoint.name);
      
      return parsed.downloadUrl;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        this.recordEndpointFailure(endpoint.name);
        throw new Error(`Request timeout after ${this.REQUEST_TIMEOUT}ms on ${endpoint.name}`);
      }
      
      console.error(`[Instagram Downloader] Error with ${endpoint.name}:`, error.message);
      this.recordEndpointFailure(endpoint.name);
      throw error;
    }
  }

  /**
   * Download Instagram video with retry and proxy rotation
   */
  async getDownloadUrl(instagramUrl: string): Promise<DownloadResult> {
    // Validate Instagram URL
    if (!this.isValidInstagramUrl(instagramUrl)) {
      throw new Error('Invalid Instagram URL. Supported: reels, posts, stories');
    }

    // Check circuit breaker
    this.checkCircuitBreaker();

    // Check cache first
    const cached = await this.getCached(instagramUrl);
    if (cached) {
      return cached;
    }

    console.log(`[Instagram Downloader] Fetching: ${instagramUrl}`);

    let lastError: Error | null = null;
    const triedProxies = new Set<string>();

    // Try up to MAX_RETRIES with different proxies
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      const proxy = this.getNextProxy();
      const proxyKey = `${proxy.host}:${proxy.port}`;

      // Skip if we already tried this proxy
      if (triedProxies.has(proxyKey)) {
        continue;
      }
      triedProxies.add(proxyKey);

      try {
        const downloadUrl = await this.fetchWithProxy(instagramUrl, proxy, attempt);
        
        const result: DownloadResult = {
          downloadUrl,
          cached: false
        };

        // Cache the result
        await this.setCached(instagramUrl, result);
        
        // Record success
        this.recordSuccess();

        return result;

      } catch (error: any) {
        lastError = error;
        console.error(`[Instagram Downloader] Failed via ${proxy.city}, ${proxy.country}:`, error.message);
        
        // Wait before retrying with exponential backoff
        if (attempt < this.MAX_RETRIES - 1) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`[Instagram Downloader] Retrying in ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
        }
      }
    }

    // All retries failed with API endpoints, try yt-dlp as last resort
    console.log('[Instagram Downloader] All API endpoints failed, trying yt-dlp fallback...');
    
    try {
      const downloadUrl = await this.fetchWithYtDlp(instagramUrl);
      
      const result: DownloadResult = {
        downloadUrl,
        cached: false
      };

      // Cache the result
      await this.setCached(instagramUrl, result);
      
      // Record success
      this.recordSuccess();

      console.log('[Instagram Downloader] Successfully extracted download URL via yt-dlp');
      return result;
    } catch (ytDlpError: any) {
      console.error('[Instagram Downloader] yt-dlp fallback also failed:', ytDlpError.message);
      this.recordFailure();
      
      throw new Error(
        `Failed to download Instagram video after ${this.MAX_RETRIES} attempts with API endpoints and yt-dlp fallback. ` +
        `Last API error: ${lastError?.message || 'Unknown error'}. ` +
        `yt-dlp error: ${ytDlpError.message}`
      );
    }
  }

  /**
   * Fallback method using yt-dlp
   */
  private async fetchWithYtDlp(instagramUrl: string): Promise<string> {
    try {
      const info: any = await youtubeDl(instagramUrl, {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        preferFreeFormats: true,
      });

      if (info.url) {
        return info.url;
      }

      // If direct URL not available, get best format
      if (info.formats && info.formats.length > 0) {
        const sortedFormats = info.formats
          .filter((f: any) => f.url && f.vcodec !== 'none')
          .sort((a: any, b: any) => (b.height || 0) - (a.height || 0));

        if (sortedFormats.length > 0) {
          return sortedFormats[0].url;
        }
      }

      throw new Error('No download URL found in yt-dlp response');
    } catch (error: any) {
      throw new Error(`yt-dlp extraction failed: ${error.message}`);
    }
  }

  /**
   * Validate Instagram URL
   */
  private isValidInstagramUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      if (!hostname.includes('instagram.com')) {
        return false;
      }

      // Check if it's a valid Instagram content type
      const path = urlObj.pathname.toLowerCase();
      return path.includes('/reel') || path.includes('/p/') || path.includes('/stories/');
      
    } catch {
      return false;
    }
  }

  /**
   * Get service stats
   */
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

  /**
   * Cleanup resources
   */
  async cleanup() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('[Instagram Downloader] Redis connection closed');
    }
  }
}

export const instagramDownloader = new InstagramDownloaderService();
export default instagramDownloader;
