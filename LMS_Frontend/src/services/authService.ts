import { apiClient } from './api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      fullName: string;
      role: string;
      isActive: boolean;
    };
  };
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    
    if (response.success && response.data) {
      // Store tokens
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('refresh_token', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },

  async getProfile(): Promise<User> {
    const response = await apiClient.get<{ success: boolean; data: User }>('/auth/profile');
    return response.data;
  },

  async getSession(): Promise<{ user: User }> {
    const response = await apiClient.get<{ success: boolean; data: { user: User } }>('/auth/session');
    return response.data;
  },

  async resetPassword(email: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { email });
  },

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<{ success: boolean; data: { token: string } }>(
      '/auth/refresh',
      { refreshToken }
    );

    if (response.success && response.data) {
      localStorage.setItem('auth_token', response.data.token);
      return response.data.token;
    }

    throw new Error('Failed to refresh token');
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  },
};
