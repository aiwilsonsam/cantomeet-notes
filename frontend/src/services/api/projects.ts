import apiClient from './client';
import { Project } from '@/types';

export const projectsApi = {
  list: async (workspaceId: string): Promise<Project[]> => {
    return apiClient.get(`/projects?workspace_id=${workspaceId}`);
  },

  get: async (id: string): Promise<Project> => {
    return apiClient.get(`/projects/${id}`);
  },

  create: async (data: {
    workspaceId: string;
    name: string;
    status: Project['status'];
    dueDate: string;
    members: string[];
    progress: number;
  }): Promise<Project> => {
    return apiClient.post('/projects', data);
  },

  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    return apiClient.patch(`/projects/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/projects/${id}`);
  },
};

