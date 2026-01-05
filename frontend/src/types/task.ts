export interface ProcessingTask {
  id: string;
  workspaceId: string; // Tenant ID
  filename: string;
  fileSize: number;
  status: 'queued' | 'processing' | 'review_ready' | 'completed' | 'failed';
  progress: number; // 0-100
  logs: string[];
  startTime: string;
}

