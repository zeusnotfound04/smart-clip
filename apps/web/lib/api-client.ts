import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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
    const response = await axiosInstance.post<AuthResponse>('/auth/register', { name, email, password });
    
    if (response.data.success && typeof window !== 'undefined') {
      localStorage.setItem('smartclips_token', response.data.data.token);
      localStorage.setItem('smartclips_user', JSON.stringify(response.data.data.user));
    }
    
    return response.data;
  }

  async signIn(email: string, password: string): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>('/auth/login', { email, password });
    
    if (response.data.success && typeof window !== 'undefined') {
      localStorage.setItem('smartclips_token', response.data.data.token);
      localStorage.setItem('smartclips_user', JSON.stringify(response.data.data.user));
    }
    
    return response.data;
  }

  async getMe(): Promise<ApiResponse<User>> {
    const response = await axiosInstance.get<ApiResponse<User>>('/auth/me');
    return response.data;
  }

  signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('smartclips_token');
      localStorage.removeItem('smartclips_user');
    }
  }

  // Video methods
  async getUploadUrl(fileName: string, fileType: string): Promise<ApiResponse<{ uploadUrl: string; key: string }>> {
    const response = await axiosInstance.post<ApiResponse<{ uploadUrl: string; key: string }>>('/videos/upload-url', { 
      fileName, 
      fileType 
    });
    return response.data;
  }

  async confirmUpload(key: string, originalName: string): Promise<ApiResponse<Video>> {
    const response = await axiosInstance.post<ApiResponse<Video>>('/videos/confirm-upload', { key, originalName });
    return response.data;
  }

  async getVideos(): Promise<ApiResponse<Video[]>> {
    const response = await axiosInstance.get<ApiResponse<Video[]>>('/videos');
    return response.data;
  }

  async deleteVideo(id: string): Promise<ApiResponse> {
    const response = await axiosInstance.delete<ApiResponse>(`/videos/${id}`);
    return response.data;
  }

  // Project methods
  async getProjects(): Promise<ApiResponse<Project[]>> {
    const response = await axiosInstance.get<ApiResponse<Project[]>>('/projects');
    return response.data;
  }

  async getProject(id: string): Promise<ApiResponse<Project>> {
    const response = await axiosInstance.get<ApiResponse<Project>>(`/projects/${id}`);
    return response.data;
  }

  async deleteProject(id: string): Promise<ApiResponse> {
    const response = await axiosInstance.delete<ApiResponse>(`/projects/${id}`);
    return response.data;
  }

  async uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<any> {
    try {
      const response = await axiosInstance.post('/upload', 
        { video: file },
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent: any) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              onProgress?.(progress);
            }
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload video');
    }
  }

  async generateSubtitles(videoId: string): Promise<{ message: string; videoId: string }> {
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
      body: JSON.stringify({ videoId }),
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