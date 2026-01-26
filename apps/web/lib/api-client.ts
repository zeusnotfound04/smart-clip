import axios from 'axios';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for video operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('smartclips_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect on authentication check or user profile endpoints
      const isAuthEndpoint = error.config?.url?.includes('/me') ||
        error.config?.url?.includes('/auth/') ||
        error.config?.url?.includes('/profile');

      if (isAuthEndpoint && typeof window !== 'undefined') {
        localStorage.removeItem('smartclips_token');
        localStorage.removeItem('smartclips_user');
        window.location.href = '/auth/signin';
      }
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  isAdmin?: boolean;
  credits?: number;
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface JobResponse {
  success: boolean;
  jobId: string;
  projectId: string;
  message: string;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputPath?: string;
  config?: any;
  createdAt: string;
  updatedAt: string;
  video?: {
    id: string;
    originalName: string;
    duration?: number;
  };
}

export interface Video {
  id: string;
  originalName: string;
  filePath: string;
  thumbnailPath?: string;
  duration?: number;
  size?: number;
  mimeType: string;
  status: string;
  createdAt: string;
}

// API Class
class APIClient {
  // Auth methods
  async signUp(name: string, email: string, password: string, otp: string, tosAccepted: boolean = true): Promise<AuthResponse> {
    const response = await axiosInstance.post('/api/auth/signup', { name, email, password, otp, tosAccepted });

    if (response.data.token && typeof window !== 'undefined') {
      localStorage.setItem('smartclips_token', response.data.token);
      localStorage.setItem('smartclips_user', JSON.stringify(response.data.user));
    }

    return {
      success: true,
      data: {
        user: response.data.user,
        token: response.data.token
      }
    };
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await axiosInstance.post('/api/auth/signin', { email, password });

    if (response.data.token && typeof window !== 'undefined') {
      localStorage.setItem('smartclips_token', response.data.token);
      localStorage.setItem('smartclips_user', JSON.stringify(response.data.user));
    }

    return {
      success: true,
      data: {
        user: response.data.user,
        token: response.data.token
      }
    };
  }

  async getMe(): Promise<ApiResponse<User>> {
    const response = await axiosInstance.get('/api/auth/me');
    return {
      success: true,
      data: response.data.user
    };
  }

  signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('smartclips_token');
      localStorage.removeItem('smartclips_user');
    }
  }

  // Credits methods
  async getCreditsBalance(): Promise<ApiResponse<{ balance: number; stats: any }>> {
    const response = await axiosInstance.get('/api/credits/balance');
    // API already returns { success: true, data: { balance, stats } }
    return response.data;
  }

  async getCreditsHistory(limit?: number, offset?: number): Promise<ApiResponse<any[]>> {
    const response = await axiosInstance.get('/api/credits/history', {
      params: { limit, offset }
    });
    // API returns { success: true, data: { transactions, limit, offset } }
    const apiResponse = response.data;
    return {
      success: apiResponse.success,
      data: apiResponse.data?.transactions || []
    };
  }

  async calculateCredits(durationInMinutes: number): Promise<ApiResponse<{ creditsNeeded: number }>> {
    const response = await axiosInstance.post('/api/credits/calculate', { durationInMinutes });
    return {
      success: true,
      data: response.data
    };
  }

  async getCreditsStats(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get('/api/credits/stats');
    return {
      success: true,
      data: response.data
    };
  }

  // Subscription methods
  async getSubscriptionPlans(): Promise<ApiResponse<any[]>> {
    const response = await axiosInstance.get('/api/subscriptions/plans');
    // API returns { success: true, data: { plans } }
    const apiResponse = response.data;
    return {
      success: apiResponse.success,
      data: apiResponse.data?.plans || []
    };
  }

  async getSubscriptionDetails(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.get('/api/subscriptions/details');
    // API returns { success: true, data: subscriptionDetails }
    return response.data;
  }

  async createSubscription(tier: string, billingPeriod: string, paymentMethodId: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.post('/api/subscriptions/create', {
      tier,
      billingPeriod,
      paymentMethodId
    });
    return {
      success: true,
      data: response.data
    };
  }

  async cancelSubscription(cancelAtPeriodEnd: boolean = true): Promise<ApiResponse<any>> {
    const response = await axiosInstance.post('/api/subscriptions/cancel', { cancelAtPeriodEnd });
    return {
      success: true,
      data: response.data
    };
  }

  async resumeSubscription(): Promise<ApiResponse<any>> {
    const response = await axiosInstance.post('/api/subscriptions/resume');
    return {
      success: true,
      data: response.data
    };
  }

  async updateSubscription(newTier: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.put('/api/subscriptions/update', { newTier });
    return {
      success: true,
      data: response.data
    };
  }

  async createCheckoutSession(tier: string): Promise<ApiResponse<{ sessionId: string; url: string }>> {
    console.log('[API CLIENT] Creating checkout session');
    console.log('[API CLIENT] Tier:', tier);

    const token = typeof window !== 'undefined' ? localStorage.getItem('smartclips_token') : null;
    console.log('[API CLIENT] Token present:', !!token);
    if (token) {
      console.log('[API CLIENT] Token preview:', token.substring(0, 20) + '...');
    }

    console.log('[API CLIENT] Sending request to:', `${API_BASE_URL}/api/subscriptions/create-checkout-session`);

    const response = await axiosInstance.post('/api/subscriptions/create-checkout-session', {
      tier
    });

    console.log('[API CLIENT] Checkout session response:', response.data);

    return {
      success: true,
      data: response.data.data
    };
  }

  // TEMPORARY: Simulate checkout success for local testing
  async simulateCheckoutSuccess(tier: string, billingPeriod: string): Promise<ApiResponse<any>> {
    const response = await axiosInstance.post('/api/test/simulate-checkout-success', {
      tier,
      billingPeriod
    });
    return {
      success: true,
      data: response.data.data
    };
  }

  // Video methods
  async getUploadUrl(fileName: string, fileType: string): Promise<ApiResponse<{ uploadUrl: string; key: string }>> {
    console.log('[API_CLIENT] getUploadUrl called:', { fileName, fileType });
    const requestData = { filename: fileName, fileType };

    try {
      console.log('Sending request to /api/videos/upload-url...');
      const response = await axiosInstance.post('/api/videos/upload-url', requestData);
      console.log('Upload URL response:', response.status, response.statusText);

      const result = {
        success: true,
        data: {
          uploadUrl: response.data.presignedUrl || '',
          key: response.data.s3Key || ''
        }
      };
      console.log('Upload URL generated successfully');
      return result;
    } catch (error: any) {
      throw error;
    }
  }

  async confirmUpload(key: string, originalName: string, size?: number, mimeType?: string, language?: string): Promise<ApiResponse<Video>> {
    console.log('[API_CLIENT] confirmUpload called:', { key, originalName, size, mimeType, language });
    const requestData = { s3Key: key, originalName, size, mimeType, language };

    try {
      console.log('Sending request to /api/videos/confirm-upload...');
      const response = await axiosInstance.post('/api/videos/confirm-upload', requestData);
      console.log('Confirmation response:', response.status, response.statusText);

      const result = {
        success: true,
        data: response.data.video
      };
      console.log('Upload confirmed successfully:', result.data?.id);
      return result;
    } catch (error: any) {
      throw error;
    }
  }

  async getVideos(): Promise<ApiResponse<Video[]>> {
    const response = await axiosInstance.get<ApiResponse<Video[]>>('/api/videos');
    return response.data;
  }

  async deleteVideo(id: string): Promise<ApiResponse> {
    const response = await axiosInstance.delete<ApiResponse>(`/api/videos/${id}`);
    return response.data;
  }

  // Project methods
  async getProjects(): Promise<{ projects: Project[] }> {
    const response = await axiosInstance.get('/api/projects');
    return response.data;
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    const response = await axiosInstance.get<ApiResponse<Project>>(`/api/projects/${id}`);
    return response.data;
  }

  async createProject(data: {
    name: string;
    type: string;
    videoId?: string;
    config?: any;
  }): Promise<{ project: Project }> {
    const response = await axiosInstance.post('/api/projects', data);
    return response.data;
  }

  async deleteProject(id: string): Promise<ApiResponse> {
    const response = await axiosInstance.delete<ApiResponse>(`/api/projects/${id}`);
    return response.data;
  }

  async uploadVideo(file: File, onProgress?: (progress: number) => void, language?: string): Promise<Video> {
    console.log('[API_CLIENT] uploadVideo started', { language });
    console.log('File details:', { name: file.name, size: file.size, type: file.type });

    // Use multipart upload for files larger than 50MB
    const USE_MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50MB

    if (file.size > USE_MULTIPART_THRESHOLD) {
      console.log(`Large file detected (${Math.round(file.size / 1024 / 1024)}MB), using multipart upload`);
      return this.uploadVideoMultipart(file, onProgress, language);
    }

    try {
      console.log('Step 1: Getting upload URL...');
      const uploadUrlResponse = await this.getUploadUrl(file.name, file.type);
      console.log('Upload URL response:', { success: uploadUrlResponse.success, hasData: !!uploadUrlResponse.data });

      if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, key } = uploadUrlResponse.data;
      console.log('Received S3 key:', key);

      // Validate the URL format
      try {
        new URL(uploadUrl);
        console.log('Upload URL format is valid');
      } catch (urlError) {
        console.error('Invalid upload URL format:', uploadUrl);
        throw new Error('Invalid presigned URL format');
      }

      console.log('Step 2: Uploading to S3...');
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      console.log('S3 upload response:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (readError) {
          // Ignore read error
        }
        console.error('S3 upload failed:', { status: response.status, statusText: response.statusText, errorText });
        throw new Error(`S3 upload failed with status ${response.status}: ${errorText || response.statusText}`);
      }

      console.log('S3 upload successful, confirming upload...');
      console.log('Step 3: Confirming upload in database...');

      const confirmResponse = await this.confirmUpload(key, file.name, file.size, file.type, language);
      console.log('Confirmation response:', { success: confirmResponse.success, hasData: !!confirmResponse.data });

      if (!confirmResponse.success || !confirmResponse.data) {
        throw new Error('Failed to confirm upload');
      }

      console.log('Upload complete!', confirmResponse.data);
      return confirmResponse.data;
    } catch (error: any) {
      console.error('[API_CLIENT] Upload failed:', error);
      throw new Error('Failed to upload video: ' + (error.response?.data?.message || error.message));
    }
  }

  async uploadVideoMultipart(file: File, onProgress?: (progress: number) => void, language?: string): Promise<Video> {
    console.log('[API_CLIENT] uploadVideoMultipart started');
    const fileSizeMB = Math.round(file.size / 1024 / 1024);
    const startTime = Date.now();

    try {
      // Step 1: Initiate multipart upload
      console.log('Initiating multipart upload...');
      const initResponse = await axiosInstance.post('/api/videos/multipart/initiate', {
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
      });

      const { uploadId, s3Key, chunkSize } = initResponse.data;
      const chunkSizeMB = Math.round(chunkSize / 1024 / 1024);
      console.log(`Upload initiated: ID=${uploadId}, chunk=${chunkSizeMB}MB`);

      // Step 2: Upload chunks in parallel
      const totalChunks = Math.ceil(file.size / chunkSize);
      console.log(`Total chunks: ${totalChunks}`);

      const uploadedParts: Array<{ ETag: string; PartNumber: number }> = [];
      let uploadedBytes = 0;

      // OPTIMIZED: Dynamic concurrency based on file size for maximum speed
      let MAX_CONCURRENT: number;
      if (file.size > 2 * 1024 * 1024 * 1024) { // >2GB
        MAX_CONCURRENT = 16; // 16 parallel uploads for huge files
      } else if (file.size > 1024 * 1024 * 1024) { // >1GB
        MAX_CONCURRENT = 12; // 12 parallel uploads
      } else if (file.size > 500 * 1024 * 1024) { // >500MB
        MAX_CONCURRENT = 10; // 10 parallel uploads
      } else {
        MAX_CONCURRENT = 8; // 8 parallel uploads (default)
      }
      console.log(`Concurrency: ${MAX_CONCURRENT} parallel uploads`);

      // OPTIMIZED: Pre-fetch all presigned URLs for faster uploads
      console.log('Pre-fetching presigned URLs...');
      const presignedUrlPromises = Array.from({ length: totalChunks }, (_, i) =>
        axiosInstance.post('/api/videos/multipart/part-url', {
          s3Key,
          uploadId,
          partNumber: i + 1,
        }).then(res => res.data.presignedUrl)
      );

      // Batch fetch URLs (8 at a time to avoid overwhelming the server)
      const presignedUrls: string[] = [];
      for (let i = 0; i < totalChunks; i += 8) {
        const batch = presignedUrlPromises.slice(i, Math.min(i + 8, totalChunks));
        const urls = await Promise.all(batch);
        presignedUrls.push(...urls);
      }
      console.log(`Got ${presignedUrls.length} presigned URLs`);

      const uploadChunk = async (chunkIndex: number, retryCount = 0): Promise<{ ETag: string; PartNumber: number }> => {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        const partNumber = chunkIndex + 1;

        try {
          // Use pre-fetched presigned URL
          const presignedUrl = presignedUrls[chunkIndex];

          // Upload the chunk
          const response = await fetch(presignedUrl, {
            method: 'PUT',
            body: chunk,
            headers: { 'Content-Type': file.type },
          });

          if (!response.ok) {
            throw new Error(`Failed to upload part ${partNumber}: ${response.statusText}`);
          }

          const etag = response.headers.get('ETag');
          if (!etag) {
            throw new Error(`No ETag received for part ${partNumber}`);
          }

          uploadedBytes += chunk.size;
          const progress = Math.round((uploadedBytes / file.size) * 100);
          const elapsed = (Date.now() - startTime) / 1000;
          const speedMBps = (uploadedBytes / 1024 / 1024) / elapsed;
          const remaining = file.size - uploadedBytes;
          const eta = remaining / (uploadedBytes / elapsed);

          // Log every 10% or at completion
          if (progress % 10 === 0 || progress === 100) {
            console.log(`Part ${partNumber}/${totalChunks} (${progress}%) @ ${speedMBps.toFixed(1)}MB/s | ETA: ${Math.round(eta)}s`);
          }

          if (onProgress) {
            onProgress(progress);
          }

          return { ETag: etag, PartNumber: partNumber };
        } catch (error: any) {
          // Auto-retry on failure (up to 3 times)
          if (retryCount < 3) {
            console.warn(`Part ${partNumber} failed, retrying... (${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
            return uploadChunk(chunkIndex, retryCount + 1);
          }
          throw error;
        }
      };

      // Upload chunks with concurrency control
      for (let i = 0; i < totalChunks; i += MAX_CONCURRENT) {
        const batch = [];
        for (let j = i; j < Math.min(i + MAX_CONCURRENT, totalChunks); j++) {
          batch.push(uploadChunk(j));
        }
        const results = await Promise.all(batch);
        uploadedParts.push(...results);
      }

      // Sort parts by part number
      uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);

      // Step 3: Complete multipart upload
      console.log('Completing multipart upload...');
      const completeResponse = await axiosInstance.post('/api/videos/multipart/complete', {
        s3Key,
        uploadId,
        parts: uploadedParts,
        originalName: file.name,
        size: file.size,
        mimeType: file.type,
      });

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      const avgSpeed = (fileSizeMB / parseFloat(totalTime)).toFixed(1);
      console.log(`Multipart upload completed in ${totalTime}s (avg ${avgSpeed}MB/s)`);

      return completeResponse.data.video;
    } catch (error: any) {
      console.error('Multipart upload failed:', error);

      // Attempt to abort the multipart upload on error
      try {
        if (error.uploadId && error.s3Key) {
          await axiosInstance.post('/api/videos/multipart/abort', {
            s3Key: error.s3Key,
            uploadId: error.uploadId,
          });
          console.log('Multipart upload aborted');
        }
      } catch (abortError) {
        console.error('Failed to abort multipart upload:', abortError);
      }

      throw new Error('Failed to upload video: ' + (error.response?.data?.message || error.message));
    }
  }

  async generateSubtitles(videoId: string, options?: any, language?: string): Promise<{
    message: string;
    videoId: string;
    jobId: string;
    estimatedTimeMinutes: number;
    eta: number;
    pollUrl: string;
    videoWithSubtitles?: string;
    srtContent?: string;
    detectedLanguages?: string[];
    segments?: Array<{
      text: string;
      startTime: number;
      endTime: number;
      confidence: number;
      language?: string;
    }>;
  }> {
    const authHeader = this.getAuthHeader();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authHeader.Authorization) {
      headers.Authorization = authHeader.Authorization;
    }

    const response = await fetch(`${API_BASE_URL}/api/subtitles/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ videoId, language, options }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate subtitles');
    }

    return result;
  }

  async getSubtitleJobStatus(jobId: string): Promise<{
    jobId: string;
    status: string;
    progress: number;
    videoId: string;
    videoStatus: string;
    subtitledVideoUrl?: string;
    estimatedRemainingMinutes: number;
    error?: string;
    completedAt?: string;
  }> {
    const authHeader = this.getAuthHeader();
    const headers: Record<string, string> = {};

    if (authHeader.Authorization) {
      headers.Authorization = authHeader.Authorization;
    }

    const response = await fetch(`${API_BASE_URL}/api/subtitles/status/${jobId}`, {
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get job status');
    }

    return result;
  }

  async pollSubtitleJob(
    jobId: string,
    onProgress?: (progress: number, eta: number) => void,
    pollInterval: number = 3000
  ): Promise<{
    videoId: string;
    subtitledVideoUrl: string;
  }> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await this.getSubtitleJobStatus(jobId);

          // Report progress
          if (onProgress) {
            const etaMs = status.estimatedRemainingMinutes * 60 * 1000;
            onProgress(status.progress, etaMs);
          }

          // Check if completed
          if (status.status === 'completed' && status.subtitledVideoUrl) {
            resolve({
              videoId: status.videoId,
              subtitledVideoUrl: status.subtitledVideoUrl
            });
            return;
          }

          // Check if failed
          if (status.status === 'failed') {
            reject(new Error(status.error || 'Subtitle generation failed'));
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  async getSupportedLanguages(): Promise<{ languages: Array<{ code: string; name: string; priority: number }> }> {
    const response = await fetch(`${API_BASE_URL}/api/subtitles/languages`);
    return response.json();
  }

  async getSubtitles(videoId: string): Promise<{ subtitles: any[]; status: string }> {
    const authHeader = this.getAuthHeader();
    const headers: Record<string, string> = {};

    if (authHeader.Authorization) {
      headers.Authorization = authHeader.Authorization;
    }

    const response = await fetch(`${API_BASE_URL}/api/subtitles/${videoId}`, {
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch subtitles');
    }

    return result;
  }

  async updateSubtitleConfiguration(videoId: string, options: any): Promise<{ success: boolean; message: string; subtitledVideoUrl?: string }> {
    const authHeader = this.getAuthHeader();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authHeader.Authorization) {
      headers.Authorization = authHeader.Authorization;
    }

    const response = await fetch(`${API_BASE_URL}/api/subtitles/config/${videoId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ options }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update subtitle configuration');
    }

    return result;
  }

  // DEPRECATED: Downloads are now handled by the DownloadButton component using S3 URLs
  // These methods are kept for backward compatibility but should not be used in new code

  // Split Streamer methods
  async combineVideos(webcamVideoId: string, gameplayVideoId: string, layoutConfig: any): Promise<{
    projectId: string;
    jobId: string;
    status: string;
    outputUrl?: string;
  }> {
    const authHeader = this.getAuthHeader();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authHeader.Authorization) {
      headers.Authorization = authHeader.Authorization;
    }

    // Use AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout

    try {
      const response = await fetch(`${API_BASE_URL}/api/split-streamer/combine`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          webcamVideoId,
          gameplayVideoId,
          layoutConfig,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to combine videos');
      }

      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Video combination timed out. Please try again or use shorter videos.');
      }
      throw error;
    }
  }

  async updateVideoLayout(projectId: string, layoutConfig: any): Promise<{
    success: boolean;
    outputUrl?: string;
  }> {
    const authHeader = this.getAuthHeader();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authHeader.Authorization) {
      headers.Authorization = authHeader.Authorization;
    }

    const response = await fetch(`${API_BASE_URL}/api/split-streamer/update-layout/${projectId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ layoutConfig }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to update layout');
    }

    return result;
  }

  // DEPRECATED: Downloads are now handled by the DownloadButton component using S3 URLs
  // This method is kept for backward compatibility but should not be used in new code

  async getSplitStreamerProject(projectId: string): Promise<{
    id: string;
    name: string;
    status: string;
    outputUrl?: string;
    config: any;
  }> {
    const authHeader = this.getAuthHeader();
    const headers: Record<string, string> = {};

    if (authHeader.Authorization) {
      headers.Authorization = authHeader.Authorization;
    }

    const response = await fetch(`${API_BASE_URL}/api/split-streamer/project/${projectId}`, {
      headers,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get project details');
    }

    return result;
  }

  // Poll job status for long-running operations
  async pollJobStatus(
    projectId: string,
    onProgress?: (progress: { status: string; progress?: number; message?: string }) => void,
    maxAttempts: number = 36, // 15 minutes with 25s intervals
    interval: number = 25000 // 25 seconds to reduce server load
  ): Promise<{
    id: string;
    name: string;
    status: string;
    outputUrl?: string;
    config: any;
  }> {
    let attempts = 0;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          attempts++;
          const project = await this.getSplitStreamerProject(projectId);

          // Call progress callback if provided
          if (onProgress) {
            onProgress({
              status: project.status,
              message: `Processing video combination... (${attempts}/${maxAttempts})`
            });
          }

          // Check if job is complete
          if (project.status === 'completed') {
            resolve(project);
            return;
          }

          // Check if job failed
          if (project.status === 'failed' || project.status === 'error') {
            reject(new Error('Video combination failed'));
            return;
          }

          // Check if we've exceeded max attempts
          if (attempts >= maxAttempts) {
            reject(new Error('Video combination timed out'));
            return;
          }

          // Continue polling
          setTimeout(poll, interval);

        } catch (error) {
          reject(error);
        }
      };

      // Start polling
      poll();
    });
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: any): Promise<{ data: T }> {
    const response = await axiosInstance.get(url, config);
    return response;
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> {
    const response = await axiosInstance.post(url, data, config);
    return response;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }> {
    const response = await axiosInstance.put(url, data, config);
    return response;
  }

  async delete<T = any>(url: string, config?: any): Promise<{ data: T }> {
    const response = await axiosInstance.delete(url, config);
    return response;
  }

  // Video URL Upload methods
  async validateVideoUrl(url: string): Promise<{ success: boolean; platform?: string; error?: string }> {
    const response = await axiosInstance.post('/api/video-url-upload/validate', { url });
    return response.data;
  }

  async getVideoInfoFromUrl(url: string): Promise<{
    success: boolean;
    platform?: string;
    videoInfo?: {
      title: string;
      duration: number;
      durationFormatted: string;
      thumbnail: string;
      platform: string;
      url: string; // Direct video URL from yt-dlp (e.g., video.twimg.com for Twitter)
      originalUrl: string; // Original input URL (e.g., tweet URL)
    };
    error?: string;
  }> {
    const response = await axiosInstance.post('/api/video-url-upload/info', { url });
    console.log('API Response from getVideoInfoFromUrl:', response.data);
    return response.data;
  }

  async uploadFromUrl(params: {
    url: string;
    projectName?: string;
    processType?: 'none' | 'subtitles' | 'smart-clipper';
    options?: {
      language?: string;
      detectAllLanguages?: boolean;
      style?: any;
      contentType?: string;
      numberOfClips?: number;
      minClipDuration?: number;
      maxClipDuration?: number;
    };
  }): Promise<{
    success: boolean;
    video: {
      id: string;
      title: string;
      duration: number;
      s3Url: string;
      status: string;
    };
    platform: string;
    processType: string;
    jobId?: string;
    projectId?: string;
    message: string;
  }> {
    const response = await axiosInstance.post('/api/video-url-upload/upload', params);
    return response.data;
  }

  async getSupportedPlatforms(): Promise<{
    success: boolean;
    platforms: Array<{
      name: string;
      domains: string[];
      supported: boolean;
    }>;
  }> {
    const response = await axiosInstance.get('/api/video-url-upload/platforms');
    return response.data;
  }

  private getAuthHeader(): { Authorization?: string } {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('smartclips_token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    return {};
  }

  // ==========================================
  // Podcast Clipper Methods
  // ==========================================

  async getPodcastClipperYouTubeInfo(url: string): Promise<{
    success: boolean;
    videoInfo?: {
      title: string;
      duration: number;
      durationFormatted: string;
      thumbnail: string;
      channelName?: string;
      platform: string;
      url: string;
    };
    error?: string;
  }> {
    const response = await axiosInstance.get('/api/podcast-clipper/youtube-info', { params: { url } });
    return response.data;
  }

  async uploadPodcastClipperVideo(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{
    success: boolean;
    videoId: string;
    filename: string;
    size: number;
    duration?: number;
    previewUrl: string;
    uploadedAt: string;
  }> {
    // Use multipart upload for files larger than 50MB
    const USE_MULTIPART_THRESHOLD = 50 * 1024 * 1024;

    if (file.size > USE_MULTIPART_THRESHOLD) {
      // Use existing multipart upload and then register with podcast-clipper
      const video = await this.uploadVideoMultipart(file, onProgress);
      return {
        success: true,
        videoId: video.id,
        filename: video.originalName,
        size: video.size || file.size,
        duration: video.duration,
        previewUrl: video.thumbnailPath || '',
        uploadedAt: video.createdAt,
      };
    }

    // For smaller files, use direct upload
    const uploadUrlResponse = await this.getUploadUrl(file.name, file.type);
    if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
      throw new Error('Failed to get upload URL');
    }

    const { uploadUrl, key } = uploadUrlResponse.data;

    // Upload to S3
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.statusText}`);
    }

    // Confirm upload
    const confirmResponse = await this.confirmUpload(key, file.name, file.size, file.type);
    if (!confirmResponse.success || !confirmResponse.data) {
      throw new Error('Failed to confirm upload');
    }

    const video = confirmResponse.data;
    return {
      success: true,
      videoId: video.id,
      filename: video.originalName,
      size: video.size || file.size,
      duration: video.duration,
      previewUrl: video.thumbnailPath || '',
      uploadedAt: video.createdAt,
    };
  }

  async createPodcastClipperProject(params: {
    sourceType: 'upload' | 'youtube';
    sourceUrl?: string;
    videoId?: string;
    title?: string;
    thumbnail?: string;
    totalDuration?: number;
    clipStartTime: number;
    clipEndTime: number;
    subtitleStyle: string;
    whisperModel?: string;
  }): Promise<{
    success: boolean;
    projectId: string;
    estimatedCredits: number;
    estimatedProcessingTime: number;
  }> {
    const response = await axiosInstance.post('/api/podcast-clipper/projects', params);
    return response.data;
  }

  async getPodcastClipperProjectStatus(projectId: string): Promise<{
    id: string;
    status: string;
    progress: number;
    processingStage?: string;
    speakersDetected?: number;
    layoutMode?: string;
    outputUrl?: string;
    outputSignedUrl?: string;
    errorMessage?: string;
    createdAt: string;
    completedAt?: string;
  }> {
    const response = await axiosInstance.get(`/api/podcast-clipper/projects/${projectId}/status`);
    return response.data;
  }

  async pollPodcastClipperProject(
    projectId: string,
    onProgress?: (status: {
      status: string;
      progress: number;
      processingStage?: string;
      speakersDetected?: number;
      layoutMode?: string;
    }) => void,
    pollInterval: number = 3000,
    maxAttempts: number = 600 // 30 minutes max
  ): Promise<{
    id: string;
    status: string;
    outputUrl?: string;
    outputSignedUrl?: string;
  }> {
    return new Promise((resolve, reject) => {
      let attempts = 0;

      const poll = async () => {
        try {
          attempts++;
          const status = await this.getPodcastClipperProjectStatus(projectId);

          if (onProgress) {
            onProgress({
              status: status.status,
              progress: status.progress,
              processingStage: status.processingStage,
              speakersDetected: status.speakersDetected,
              layoutMode: status.layoutMode,
            });
          }

          if (status.status === 'completed') {
            resolve({
              id: status.id,
              status: status.status,
              outputUrl: status.outputUrl,
              outputSignedUrl: status.outputSignedUrl,
            });
            return;
          }

          if (status.status === 'failed') {
            reject(new Error(status.errorMessage || 'Processing failed'));
            return;
          }

          if (attempts >= maxAttempts) {
            reject(new Error('Processing timed out'));
            return;
          }

          setTimeout(poll, pollInterval);
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  async getPodcastClipperDownloadUrl(projectId: string): Promise<{
    success: boolean;
    downloadUrl: string;
    filename: string;
    expiresIn: number;
  }> {
    const response = await axiosInstance.get(`/api/podcast-clipper/projects/${projectId}/download`);
    return response.data;
  }

  async getPodcastClipperProjects(limit?: number, offset?: number): Promise<{
    success: boolean;
    projects: Array<{
      id: string;
      title?: string;
      thumbnail?: string;
      sourceType: string;
      clipStartTime: number;
      clipEndTime: number;
      clipDuration: number;
      subtitleStyle: string;
      status: string;
      progress: number;
      outputUrl?: string;
      outputSignedUrl?: string;
      createdAt: string;
      completedAt?: string;
    }>;
    total: number;
    limit: number;
    offset: number;
  }> {
    const response = await axiosInstance.get('/api/podcast-clipper/projects', {
      params: { limit, offset }
    });
    return response.data;
  }

  async calculatePodcastClipperCredits(clipDuration: number): Promise<{
    success: boolean;
    clipDuration: number;
    credits: number;
    estimatedProcessingTime: number;
  }> {
    const response = await axiosInstance.post('/api/podcast-clipper/calculate-credits', { clipDuration });
    return response.data;
  }

  async getPodcastClipperSubtitleStyles(): Promise<{
    success: boolean;
    styles: Array<{
      styleKey: string;
      name: string;
      description: string;
      previewImage?: string;
      fontFamily: string;
      fontSize: number;
      primaryColor: string;
      highlightColor: string;
      borderWidth: number;
      shadowDepth: number;
      scaleNormal: number;
      scaleHighlight: number;
    }>;
  }> {
    const response = await axiosInstance.get('/api/podcast-clipper/subtitle-styles');
    return response.data;
  }

  // ==========================================
  // Instagram Downloader Methods
  // ==========================================

  async getInstagramDownloadUrl(instagramUrl: string): Promise<{
    success: boolean;
    data?: {
      downloadUrl: string;
      thumbnail?: string;
      duration?: number;
      cached: boolean;
      expiresIn: string;
    };
    message?: string;
    error?: string;
  }> {
    const response = await axiosInstance.post('/api/instagram/download', { url: instagramUrl });
    return response.data;
  }

  async getInstagramServiceStats(): Promise<{
    success: boolean;
    data: {
      proxyCount: number;
      currentProxyIndex: number;
      circuitBreakerOpen: boolean;
      failureCount: number;
      cacheTTL: number;
      rateLimit: string;
    };
  }> {
    const response = await axiosInstance.get('/api/instagram/stats');
    return response.data;
  }

  async getInstagramServiceHealth(): Promise<{
    success: boolean;
    status: string;
    data: {
      service: string;
      version: string;
      features: string[];
      stats: any;
    };
  }> {
    const response = await axiosInstance.get('/api/instagram/health');
    return response.data;
  }

  // Multi-Platform Downloader API
  multiPlatform = {
    download: async (url: string, userId: string) => {
      return axiosInstance.post('/api/multi-platform/download', { url, userId });
    },

    downloadWithSubtitles: async (url: string, userId: string) => {
      return axiosInstance.post('/api/multi-platform/download-and-subtitle', { url, userId });
    },

    getStatus: async (videoId: string) => {
      return axiosInstance.get(`/api/multi-platform/status/${videoId}`);
    },

    getVideoInfo: async (url: string) => {
      return axiosInstance.get('/api/multi-platform/info', { params: { url } });
    },

    getSystemStats: async () => {
      return axiosInstance.get('/api/multi-platform/stats');
    },

    getMyDownloads: async () => {
      return axiosInstance.get('/api/videos');
    },
  };
}

export const apiClient = new APIClient();