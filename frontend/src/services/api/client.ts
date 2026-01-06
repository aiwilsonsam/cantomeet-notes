import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@/lib/constants';
import { ApiError } from '@/types/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token');
    // console.log('[apiClient] Request:', config.method?.toUpperCase(), config.url);
    // console.log('[apiClient] Has token:', !!token);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // console.error('[apiClient] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => {
    // console.log('[apiClient] Response:', response.status, response.config.url);
    // console.log('[apiClient] Response data:', response.data);
    // Return data directly if it exists
    return response.data;
  },
  (error: AxiosError) => {
    // console.error('[apiClient] Response error:', error);
    // console.error('[apiClient] Error details:', {
    //   status: error.response?.status,
    //   statusText: error.response?.statusText,
    //   data: error.response?.data,
    //   message: error.message,
    // });
    // Handle errors
    if (error.response) {
      // Server responded with error
      // FastAPI uses 'detail' field for error messages
      const errorData = error.response.data as any;
      const apiError: ApiError = {
        message: errorData?.detail || errorData?.message || error.message || 'An error occurred',
        code: errorData?.code,
        details: errorData?.details,
      };
      return Promise.reject(apiError);
    } else if (error.request) {
      // Request made but no response
      const apiError: ApiError = {
        message: 'Network error. Please check your connection.',
      };
      return Promise.reject(apiError);
    } else {
      // Something else happened
      const apiError: ApiError = {
        message: error.message || 'An unexpected error occurred',
      };
      return Promise.reject(apiError);
    }
  }
);

export default apiClient;

