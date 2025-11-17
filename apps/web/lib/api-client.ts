import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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
      if (typeof window !== 'undefined') {
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
    const requestData = { filename: fileName, fileType };
    
    try {
      const response = await axiosInstance.post('/api/videos/upload-url', requestData);
      
      return {
        success: true,
        data: {
          uploadUrl: response.data.presignedUrl || '',
          key: response.data.s3Key || ''
        }
      };
    } catch (error: any) {
      throw error;
    }
  }

  async confirmUpload(key: string, originalName: string, size?: number, mimeType?: string): Promise<ApiResponse<Video>> {
    const requestData = { s3Key: key, originalName, size, mimeType };
    
    try {
      const response = await axiosInstance.post('/api/videos/confirm-upload', requestData);
      
      return {
        success: true,
        data: response.data.video
      };
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
    try {
      const uploadUrlResponse = await this.getUploadUrl(file.name, file.type);
      if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, key } = uploadUrlResponse.data;
      
      // Validate the URL format
      try {
        new URL(uploadUrl);
      } catch (urlError) {
        throw new Error('Invalid presigned URL format');
      }

      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (readError) {
          // Ignore read error
        }
        throw new Error(`S3 upload failed with status ${response.status}: ${errorText || response.statusText}`);
      }
      const confirmResponse = await this.confirmUpload(key, file.name, file.size, file.type);
      if (!confirmResponse.success || !confirmResponse.data) {
        throw new Error('Failed to confirm upload');
      }

      return confirmResponse.data;
    } catch (error: any) {
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

  private getAuthHeader(): { Authorization?: string } {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('smartclips_token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    return {};
  }
}

export const apiClient = new APIClient();