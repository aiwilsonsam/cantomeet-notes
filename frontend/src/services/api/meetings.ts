import apiClient from './client';
import { Meeting, UpdateMeetingRequest } from '@/types';
import { PaginatedResponse, UploadMeetingRequest, UploadMeetingResponse } from '@/types/api';
import { ENABLE_MOCK_API } from '@/lib/constants';
import { mockDataService } from './mockData';

export const meetingsApi = {
  list: async (workspaceId: string): Promise<Meeting[]> => {
    if (ENABLE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockDataService.getMeetings(workspaceId);
    }
    return apiClient.get(`/meetings?workspace_id=${workspaceId}`);
  },

  get: async (id: string): Promise<Meeting> => {
    if (ENABLE_MOCK_API) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const meeting = mockDataService.getMeeting(id);
      if (!meeting) throw new Error('Meeting not found');
      return meeting;
    }
    return apiClient.get(`/meetings/${id}`);
  },

  create: async (data: UploadMeetingRequest): Promise<UploadMeetingResponse> => {
    if (ENABLE_MOCK_API) {
      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result = mockDataService.createMeetingFromUpload(
        data.workspaceId,
        data.file.name,
        data.file.size
      );
      return {
        meetingId: '',
        taskId: result.taskId,
        message: 'File uploaded successfully. Processing started.',
      };
    }

    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('workspaceId', data.workspaceId);
    if (data.title) formData.append('title', data.title);
    if (data.template) formData.append('template', data.template);
    if (data.tags) formData.append('tags', JSON.stringify(data.tags));

    return apiClient.post('/meetings/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  update: async (id: string, data: UpdateMeetingRequest): Promise<Meeting> => {
    return apiClient.patch(`/meetings/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/meetings/${id}`);
  },

  createScheduled: async (data: {
    workspaceId: string;
    title: string;
    date: string;
    duration: string;
    participants: any[];
  }): Promise<Meeting> => {
    return apiClient.post('/meetings/scheduled', data);
  },
};

