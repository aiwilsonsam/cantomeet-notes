// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

// Feature Flags
// Default to false to use real API - set VITE_ENABLE_MOCK_API=true to use mock data
export const ENABLE_MOCK_API = import.meta.env.VITE_ENABLE_MOCK_API === 'true';

// Debug: Log the actual value
// console.log('[constants] VITE_ENABLE_MOCK_API env:', import.meta.env.VITE_ENABLE_MOCK_API);
// console.log('[constants] ENABLE_MOCK_API:', ENABLE_MOCK_API);
// console.log('[constants] API_BASE_URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api');
export const ENABLE_DEV_TOOLS = import.meta.env.VITE_ENABLE_DEV_TOOLS === 'true';

// App Configuration
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'CantoMeet Notes';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// App Constants
export const MEETING_STATUS = {
  UPLOADED: 'uploaded',
  TRANSCRIBING: 'transcribing',
  SUMMARIZING: 'summarizing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const TASK_STATUS = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  REVIEW_READY: 'review_ready',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

