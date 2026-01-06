import apiClient from './client';
import { ProcessingTask } from '@/types';
import { ENABLE_MOCK_API } from '@/lib/constants';
import { mockDataService } from './mockData';

export const tasksApi = {
  list: async (workspaceId: string): Promise<ProcessingTask[]> => {
    // console.log('[tasksApi.list] ENABLE_MOCK_API:', ENABLE_MOCK_API);
    // console.log('[tasksApi.list] workspaceId:', workspaceId);
    if (ENABLE_MOCK_API) {
      console.warn('[tasksApi.list] Using MOCK data!');
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockDataService.getTasks(workspaceId);
    }
    // console.log('[tasksApi.list] Calling real API:', `/tasks?workspace_id=${workspaceId}`);
    try {
      const result = await apiClient.get(`/tasks?workspace_id=${workspaceId}`) as ProcessingTask[];
      // console.log('[tasksApi.list] API response:', result);
      return result;
    } catch (error) {
      // console.error('[tasksApi.list] API error:', error);
      throw error;
    }
  },

  get: async (id: string): Promise<ProcessingTask> => {
    if (ENABLE_MOCK_API) {
      console.warn('[tasksApi.get] Using MOCK data!');
      await new Promise((resolve) => setTimeout(resolve, 200));
      const task = mockDataService.getTask(id);
      if (!task) throw new Error('Task not found');
      return task;
    }
    // console.log('[tasksApi.get] Calling real API:', `/tasks/${id}`);
    try {
      const result = await apiClient.get(`/tasks/${id}`) as ProcessingTask;
      // console.log('[tasksApi.get] API response:', result);
      return result;
    } catch (error) {
      // console.error('[tasksApi.get] API error:', error);
      throw error;
    }
  },

  finalize: async (
    taskId: string,
    data: { title: string; template: string; tags: string[]; workspaceId: string }
  ): Promise<{ id: string }> => {
    if (ENABLE_MOCK_API) {
      // console.warn('[tasksApi.finalize] Using MOCK data!');
      await new Promise((resolve) => setTimeout(resolve, 500));
      return mockDataService.finalizeTask(taskId, data);
    }
    // console.log('[tasksApi.finalize] Calling real API:', `/tasks/${taskId}/finalize`, data);
    try {
      const result = await apiClient.post(`/tasks/${taskId}/finalize`, data) as { id: string };
      // console.log('[tasksApi.finalize] API response:', result);
      return result;
    } catch (error) {
      // console.error('[tasksApi.finalize] API error:', error);
      throw error;
    }
  },
};

