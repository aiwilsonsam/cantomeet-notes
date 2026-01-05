// API Request/Response Types
import type { CurrentUser } from './user';

// Re-export types used in API responses
export type { CurrentUser };

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

// Upload Request
export interface UploadMeetingRequest {
  file: File;
  workspaceId: string;
  title?: string;
  template?: string;
  tags?: string[];
}

export interface UploadMeetingResponse {
  meetingId: string;
  taskId: string;
  message: string;
}

// Meeting Update Request
export interface UpdateMeetingRequest {
  title?: string;
  tags?: string[];
  summary?: {
    actionItems?: Array<{
      id: string;
      description?: string;
      owner?: string;
      dueDate?: string;
      status?: 'pending' | 'in-progress' | 'completed';
      priority?: 'high' | 'medium' | 'low';
    }>;
  };
  summary_update?: {
    overview?: string;
    decisions?: any[];
    highlights?: any[];
  };
}

// Auth Request/Response
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: CurrentUser;
  token: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// Workspace Request/Response
export interface CreateWorkspaceRequest {
  name: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
}

export interface JoinWorkspaceRequest {
  inviteCode: string;
}
