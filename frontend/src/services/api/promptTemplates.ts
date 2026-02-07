import apiClient from './client';

export interface PromptTemplate {
  id: string;
  workspace_id: string;
  name: string;
  content: string;
}

export const promptTemplatesApi = {
  list: async (workspaceId: string): Promise<PromptTemplate[]> => {
    return apiClient.get(`/prompt-templates?workspace_id=${workspaceId}`);
  },

  create: async (data: {
    workspace_id: string;
    name: string;
    content: string;
  }): Promise<PromptTemplate> => {
    return apiClient.post('/prompt-templates', data);
  },

  get: async (id: string): Promise<PromptTemplate> => {
    return apiClient.get(`/prompt-templates/${id}`);
  },

  update: async (
    id: string,
    data: { name?: string; content?: string }
  ): Promise<PromptTemplate> => {
    return apiClient.put(`/prompt-templates/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/prompt-templates/${id}`);
  },
};
