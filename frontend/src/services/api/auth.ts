import apiClient from './client';
import { LoginRequest, LoginResponse, RegisterRequest, CurrentUser } from '@/types/api';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return apiClient.post('/auth/login', data);
  },

  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    return apiClient.post('/auth/register', data);
  },

  logout: async (): Promise<void> => {
    return apiClient.post('/auth/logout');
  },

  getCurrentUser: async (): Promise<CurrentUser> => {
    return apiClient.get('/auth/me');
  },
};

