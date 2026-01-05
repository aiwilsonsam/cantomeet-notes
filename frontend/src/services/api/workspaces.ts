import apiClient from './client';
import { Workspace } from '@/types';
import { CreateWorkspaceRequest, JoinWorkspaceRequest } from '@/types/api';

export const workspacesApi = {
  list: async (): Promise<Workspace[]> => {
    return apiClient.get('/workspaces');
  },

  get: async (id: string): Promise<Workspace> => {
    return apiClient.get(`/workspaces/${id}`);
  },

  create: async (data: CreateWorkspaceRequest): Promise<Workspace> => {
    return apiClient.post('/workspaces', data);
  },

  join: async (data: JoinWorkspaceRequest): Promise<Workspace> => {
    return apiClient.post('/workspaces/join', data);
  },

  switch: async (id: string): Promise<void> => {
    return apiClient.post(`/workspaces/${id}/switch`);
  },
};

