const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface SignUpData {
  name: string;
  email: string;
  password: string;
}

interface SignInData {
  email: string;
  password: string;
}

class APIClient {
  private getAuthHeader() {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    return {};
  }

  async signUp(data: SignUpData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Sign up failed');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('token', result.token);
    }

    return result;
  }

  async signIn(data: SignInData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Sign in failed');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('token', result.token);
    }

    return result;
  }

  async getMe(): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        ...this.getAuthHeader(),
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to get user');
    }

    return result;
  }

  signOut() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
  }

  async uploadVideo(file: File): Promise<{ video: any }> {
    const formData = new FormData();
    formData.append('video', file);

    const response = await fetch(`${API_BASE_URL}/api/videos/upload`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Upload failed');
    }

    return result;
  }

  async getVideos(): Promise<{ videos: any[] }> {
    const response = await fetch(`${API_BASE_URL}/api/videos`, {
      headers: {
        ...this.getAuthHeader(),
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch videos');
    }

    return result;
  }

  async generateSubtitles(videoId: string): Promise<{ message: string; videoId: string }> {
    const response = await fetch(`${API_BASE_URL}/api/subtitles/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({ videoId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to generate subtitles');
    }

    return result;
  }

  async getSubtitles(videoId: string): Promise<{ subtitles: any[]; status: string }> {
    const response = await fetch(`${API_BASE_URL}/api/subtitles/${videoId}`, {
      headers: {
        ...this.getAuthHeader(),
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to fetch subtitles');
    }

    return result;
  }
}

export const apiClient = new APIClient();
export type { User, AuthResponse, SignUpData, SignInData };