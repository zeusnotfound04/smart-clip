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
  async signUp(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await axiosInstance.post('/api/auth/signup', { name, email, password });
    
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

  // Video methods
  async getUploadUrl(fileName: string, fileType: string): Promise<ApiResponse<{ uploadUrl: string; key: string }>> {
    console.log('🔗 [API_CLIENT] getUploadUrl called:', { fileName, fileType });
    const requestData = { filename: fileName, fileType };
    
    try {
      console.log('📤 Sending request to /api/videos/upload-url...');
      const response = await axiosInstance.post('/api/videos/upload-url', requestData);
      console.log('📥 Upload URL response:', response.status, response.statusText);
      
      const result = {
        success: true,
        data: {
          uploadUrl: response.data.presignedUrl || '',
          key: response.data.s3Key || ''
        }
      };
      console.log('✅ Upload URL generated successfully');
      return result;
    } catch (error: any) {
      throw error;
    }
  }

  async confirmUpload(key: string, originalName: string, size?: number, mimeType?: string): Promise<ApiResponse<Video>> {
    console.log('💾 [API_CLIENT] confirmUpload called:', { key, originalName, size, mimeType });
    const requestData = { s3Key: key, originalName, size, mimeType };
    
    try {
      console.log('📤 Sending request to /api/videos/confirm-upload...');
      const response = await axiosInstance.post('/api/videos/confirm-upload', requestData);
      console.log('📥 Confirmation response:', response.status, response.statusText);
      
      const result = {
        success: true,
        data: response.data.video
      };
      console.log('✅ Upload confirmed successfully:', result.data?.id);
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

  async uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<Video> {
    console.log('🟢 [API_CLIENT] uploadVideo started');
    console.log('📁 File details:', { name: file.name, size: file.size, type: file.type });
    
    try {
      console.log('🔗 Step 1: Getting upload URL...');
      const uploadUrlResponse = await this.getUploadUrl(file.name, file.type);
      console.log('📡 Upload URL response:', { success: uploadUrlResponse.success, hasData: !!uploadUrlResponse.data });
      
      if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, key } = uploadUrlResponse.data;
      console.log('🔑 Received S3 key:', key);
      
      // Validate the URL format
      try {
        new URL(uploadUrl);
        console.log('✅ Upload URL format is valid');
      } catch (urlError) {
        console.error('❌ Invalid upload URL format:', uploadUrl);
        throw new Error('Invalid presigned URL format');
      }

      console.log('📤 Step 2: Uploading to S3...');
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      console.log('📥 S3 upload response:', { status: response.status, ok: response.ok });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (readError) {
          // Ignore read error
        }
        console.error('❌ S3 upload failed:', { status: response.status, statusText: response.statusText, errorText });
        throw new Error(`S3 upload failed with status ${response.status}: ${errorText || response.statusText}`);
      }
      
      console.log('✅ S3 upload successful, confirming upload...');
      console.log('💾 Step 3: Confirming upload in database...');
      
      const confirmResponse = await this.confirmUpload(key, file.name, file.size, file.type);
      console.log('📋 Confirmation response:', { success: confirmResponse.success, hasData: !!confirmResponse.data });
      
      if (!confirmResponse.success || !confirmResponse.data) {
        throw new Error('Failed to confirm upload');
      }

      console.log('🎉 Upload complete!', confirmResponse.data);
      return confirmResponse.data;
    } catch (error: any) {
      console.error('❌ [API_CLIENT] Upload failed:', error);
      throw new Error('Failed to upload video: ' + (error.response?.data?.message || error.message));
    }
  }

  async generateSubtitles(videoId: string, options?: any): Promise<{ 
    message: string; 
    videoId: string; 
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
      body: JSON.stringify({ videoId, options }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate subtitles');
    }

    return result;
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
    maxAttempts: number = 180, // 15 minutes with 5s intervals
    interval: number = 5000 // 5 seconds
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

  private getAuthHeader(): { Authorization?: string } {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('smartclips_token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    return {};
  }
}

export const apiClient = new APIClient();