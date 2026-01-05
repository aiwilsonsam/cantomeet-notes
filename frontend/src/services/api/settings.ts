import apiClient from './client';
import { Integration, MeetingTemplate } from '@/types';

export const settingsApi = {
  getIntegrations: async (workspaceId: string): Promise<Integration[]> => {
    return apiClient.get(`/settings/integrations?workspace_id=${workspaceId}`);
  },

  connectIntegration: async (
    workspaceId: string,
    integrationId: string,
    config: Record<string, string>
  ): Promise<Integration> => {
    return apiClient.post(`/settings/integrations/${integrationId}/connect`, {
      workspace_id: workspaceId,
      config,
    });
  },

  disconnectIntegration: async (workspaceId: string, integrationId: string): Promise<void> => {
    return apiClient.post(`/settings/integrations/${integrationId}/disconnect`, {
      workspace_id: workspaceId,
    });
  },

  getTemplates: async (workspaceId: string): Promise<MeetingTemplate[]> => {
    return apiClient.get(`/settings/templates?workspace_id=${workspaceId}`);
  },

  saveTemplate: async (workspaceId: string, template: MeetingTemplate): Promise<MeetingTemplate> => {
    return apiClient.post(`/settings/templates`, {
      workspace_id: workspaceId,
      ...template,
    });
  },

  deleteTemplate: async (workspaceId: string, templateId: string): Promise<void> => {
    return apiClient.delete(`/settings/templates/${templateId}?workspace_id=${workspaceId}`);
  },
};

