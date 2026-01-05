import apiClient from './client';
import { TeamMember } from '@/types';

export const teamApi = {
  list: async (workspaceId: string): Promise<TeamMember[]> => {
    return apiClient.get(`/team?workspace_id=${workspaceId}`);
  },

  get: async (id: string): Promise<TeamMember> => {
    return apiClient.get(`/team/${id}`);
  },

  invite: async (
    workspaceId: string,
    data: {
      email: string;
      name: string;
      role: string;
      accessLevel: 'admin' | 'member' | 'viewer';
    }
  ): Promise<TeamMember> => {
    return apiClient.post('/team/invite', {
      workspace_id: workspaceId,
      ...data,
    });
  },

  update: async (id: string, data: Partial<TeamMember>): Promise<TeamMember> => {
    return apiClient.patch(`/team/${id}`, data);
  },

  remove: async (id: string): Promise<void> => {
    return apiClient.delete(`/team/${id}`);
  },
};

