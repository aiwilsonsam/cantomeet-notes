import apiClient from './client';

export interface WorkspaceTag {
  id: string;
  workspace_id: string;
  name: string;
}

export const workspaceTagsApi = {
  list: async (workspaceId: string): Promise<WorkspaceTag[]> => {
    return apiClient.get(`/workspace-tags?workspace_id=${workspaceId}`);
  },

  create: async (data: { workspace_id: string; name: string }): Promise<WorkspaceTag> => {
    return apiClient.post('/workspace-tags', data);
  },

  delete: async (tagId: string): Promise<void> => {
    return apiClient.delete(`/workspace-tags/${tagId}`);
  },
};
