import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Extend the AxiosRequestConfig to include _retry property
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response.data,
      async (error: AxiosError<any>) => {
        const originalRequest = error.config as InternalAxiosRequestConfig;
        
        // Handle network errors gracefully (don't logout)
        if (error.code === 'NETWORK_ERROR' || 
            error.code === 'ECONNABORTED' ||
            error.message?.includes('timeout') ||
            error.message?.includes('fetch failed')) {
          console.warn('Network error detected, not logging out user:', error.message);
          return Promise.reject(new Error('Connection error. Please check your internet connection and try again.'));
        }

        // Handle 503 Service Unavailable (don't logout)
        if (error.response?.status === 503) {
          console.warn('Service unavailable, not logging out user');
          return Promise.reject(new Error('Service temporarily unavailable. Please try again in a moment.'));
        }
        
        // Only handle 401 for actual authentication failures
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh the token
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refreshToken
              });
              
              if (response.data?.success && response.data?.data?.token) {
                const newToken = response.data.data.token;
                localStorage.setItem('auth_token', newToken);
                
                // Retry the original request with new token
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return this.client(originalRequest);
              }
            }
          } catch (refreshError: any) {
            console.error('Token refresh failed:', refreshError);
            
            // Only logout if refresh fails due to invalid token, not network issues
            if (refreshError.response?.status === 401) {
              // Actual auth failure - logout
              localStorage.removeItem('auth_token');
              localStorage.removeItem('refresh_token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            } else {
              // Network error during refresh - don't logout
              console.warn('Network error during token refresh, keeping user logged in');
              return Promise.reject(new Error('Connection error during authentication. Please try again.'));
            }
          }
          
          return Promise.reject(error);
        }
        
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'An error occurred';
        return Promise.reject(new Error(errorMessage));
      }
    );
  }

  // Generic methods
  async get<T>(url: string, params?: any): Promise<T> {
    return this.client.get(url, { params });
  }

  async post<T>(url: string, data?: any): Promise<T> {
    return this.client.post(url, data);
  }

  async put<T>(url: string, data?: any): Promise<T> {
    return this.client.put(url, data);
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    return this.client.patch(url, data);
  }

  async delete<T>(url: string): Promise<T> {
    return this.client.delete(url);
  }
}

export const apiClient = new ApiClient();