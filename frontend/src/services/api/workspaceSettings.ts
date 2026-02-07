import apiClient from './client';

export interface SummarizationModel {
  id: string;
  name: string;
  provider: string;
}

export interface WorkspaceSettings {
  summarization_model: string | null;
  available_models: SummarizationModel[];
}

export const workspaceSettingsApi = {
  get: async (workspaceId: string): Promise<WorkspaceSettings> => {
    return apiClient.get(`/workspaces/${workspaceId}/settings`);
  },

  update: async (
    workspaceId: string,
    data: { summarization_model?: string | null }
  ): Promise<WorkspaceSettings> => {
    return apiClient.patch(`/workspaces/${workspaceId}/settings`, data);
  },
};
