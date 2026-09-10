import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types/index.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('cm_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Expiration & Standard Error Formatting
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If 401 and not already retrying, attempt refresh token
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/')) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('cm_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post<ApiResponse<{ accessToken: string; refreshToken: string }>>(
            `${API_BASE_URL}/auth/refresh-token`,
            { refreshToken }
          );

          if (res.data?.data?.accessToken) {
            localStorage.setItem('cm_access_token', res.data.data.accessToken);
            localStorage.setItem('cm_refresh_token', res.data.data.refreshToken);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
            }
            return apiClient(originalRequest);
          }
        } catch {
          // Token refresh failed - clean local storage
          localStorage.removeItem('cm_access_token');
          localStorage.removeItem('cm_refresh_token');
          localStorage.removeItem('cm_user');
          window.location.href = '/login?session_expired=1';
        }
      }
    }

    const errorMessage =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected network error occurred';

    return Promise.reject(new Error(errorMessage));
  }
);
