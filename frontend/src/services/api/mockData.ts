import { ProcessingTask, Meeting, Speaker } from '@/types';

// Mock Speakers
const MOCK_SPEAKERS: Speaker[] = [
  { id: 'u1', name: 'Christina Lau', role: 'Product Lead', avatar: 'https://picsum.photos/id/1012/200/200' },
  { id: 'alex', name: 'Alex Wong', role: 'CTO', avatar: 'https://picsum.photos/id/1025/200/200' },
  { id: 'sarah', name: 'Sarah Ye', role: 'Product Manager', avatar: 'https://picsum.photos/id/1011/200/200' },
];

// Mock Tasks Storage (in-memory for demo)
let mockTasks: ProcessingTask[] = [
  {
    id: 'task_1',
    workspaceId: 'ws_1',
    filename: 'Q3_Product_Review_2024.m4a',
    fileSize: 45 * 1024 * 1024, // 45 MB
    status: 'review_ready',
    progress: 100,
    logs: [
      '[10:30:15] File uploaded successfully',
      '[10:30:20] Starting transcription...',
      '[10:35:45] Transcription 50% complete',
      '[10:41:20] Transcription complete',
      '[10:41:25] Starting summarization...',
      '[10:43:10] Summarization complete',
      '[10:43:15] Ready for review',
    ],
    startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: 'task_2',
    workspaceId: 'ws_1',
    filename: 'Weekly_Sync_Meeting.m4a',
    fileSize: 28 * 1024 * 1024, // 28 MB
    status: 'processing',
    progress: 65,
    logs: [
      '[14:20:10] File uploaded successfully',
      '[14:20:15] Starting transcription...',
      '[14:25:30] Transcription 30% complete',
      '[14:30:45] Transcription 60% complete',
      '[14:32:20] Transcription 65% complete...',
    ],
    startTime: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
];

// Mock Meetings Storage
let mockMeetings: Meeting[] = [
  {
    id: 'm_20241024_q3_review',
    workspaceId: 'ws_1',
    title: 'Q3 Product Roadmap Review & Tech Infra',
    date: '2024-10-24T10:30:00',
    duration: '45 mins',
    participants: MOCK_SPEAKERS,
    tags: ['Strategic', 'Engineering', 'Budget'],
    hubSpotSynced: false,
    status: 'completed',
    template: 'Product Review',
    transcript: [
      {
        id: 'seg_1',
        speakerId: 'sarah',
        timestamp: '00:05',
        text: "Hello everyone, let's start. 今日主要過一次 Q3 嘅 Roadmap 同埋 review 返上個禮拜個 usage spike 嘅問題。",
        sentiment: 'neutral',
      },
      {
        id: 'seg_2',
        speakerId: 'alex',
        timestamp: '00:24',
        text: 'Right. 关于 usage spike 嗰度，Backend check 過 logs，發現係 Monday morning 9點幾嗰阵，Concurrent users 突然升咗 3 倍。我哋個 AWS RDS instance 顶唔顺，latency 飙到去 2000ms。',
        sentiment: 'concerned',
      },
      {
        id: 'seg_3',
        speakerId: 'u1',
        timestamp: '00:45',
        text: 'Okay, 咁我哋有咩 solution？係咪要 scale up 個 database？',
        sentiment: 'neutral',
      },
      {
        id: 'seg_4',
        speakerId: 'alex',
        timestamp: '01:02',
        text: '我哋有兩個 options：一個係 Read Replicas，另一個係 Sharding。Read Replicas 比較簡單，可以 immediate fix，但係 Sharding 就 long-term solution。',
        sentiment: 'neutral',
      },
    ],
    summary: {
      executiveSummary:
        'The team discussed the Q3 product roadmap and addressed a recent system latency spike. The spike was caused by a 3x increase in concurrent users on Monday morning, pushing AWS RDS latency to 2000ms. Two solutions were proposed: Read Replicas for immediate relief, and Sharding for long-term scalability.',
      decisions: [
        {
          id: 'dec_1',
          description: 'Implement AWS RDS Read Replicas as immediate solution for latency issues',
          relatedSegmentId: 'seg_4',
        },
        {
          id: 'dec_2',
          description: 'Keep Smart Search feature release on schedule for Q3',
          relatedSegmentId: 'seg_1',
        },
      ],
      actionItems: [
        {
          id: 'act_1',
          description: 'Set up AWS RDS Read Replicas by next Wednesday',
          owner: 'Alex Wong',
          dueDate: '2024-10-30',
          status: 'in-progress',
          priority: 'high',
          relatedSegmentId: 'seg_4',
        },
        {
          id: 'act_2',
          description: 'Reply to customer support inquiry about feature request',
          owner: 'Sarah Ye',
          dueDate: '2024-10-26',
          status: 'pending',
          priority: 'medium',
          relatedSegmentId: 'seg_1',
        },
      ],
    },
  },
];

// Helper functions to manage mock data
export const mockDataService = {
  // Tasks
  getTasks: (workspaceId: string): ProcessingTask[] => {
    return mockTasks.filter((t) => t.workspaceId === workspaceId);
  },

  createTask: (workspaceId: string, filename: string, fileSize: number): ProcessingTask => {
    const newTask: ProcessingTask = {
      id: `task_${Date.now()}`,
      workspaceId,
      filename,
      fileSize,
      status: 'queued',
      progress: 0,
      logs: [`[${new Date().toLocaleTimeString()}] File uploaded successfully`],
      startTime: new Date().toISOString(),
    };
    mockTasks.push(newTask);

    // Simulate processing progression
    setTimeout(() => {
      const task = mockTasks.find((t) => t.id === newTask.id);
      if (task) {
        task.status = 'processing';
        task.progress = 10;
        task.logs.push(`[${new Date().toLocaleTimeString()}] Starting transcription...`);
      }
    }, 2000);

    setTimeout(() => {
      const task = mockTasks.find((t) => t.id === newTask.id);
      if (task) {
        task.progress = 50;
        task.logs.push(`[${new Date().toLocaleTimeString()}] Transcription 50% complete`);
      }
    }, 8000);

    setTimeout(() => {
      const task = mockTasks.find((t) => t.id === newTask.id);
      if (task) {
        task.progress = 100;
        task.status = 'review_ready';
        task.logs.push(`[${new Date().toLocaleTimeString()}] Transcription complete`);
        task.logs.push(`[${new Date().toLocaleTimeString()}] Starting summarization...`);
        task.logs.push(`[${new Date().toLocaleTimeString()}] Summarization complete`);
        task.logs.push(`[${new Date().toLocaleTimeString()}] Ready for review`);
      }
    }, 15000);

    return newTask;
  },

  getTask: (id: string): ProcessingTask | undefined => {
    return mockTasks.find((t) => t.id === id);
  },

  finalizeTask: (
    taskId: string,
    data: { title: string; template: string; tags: string[] }
  ): { id: string } => {
    const task = mockTasks.find((t) => t.id === taskId);
    if (!task) throw new Error('Task not found');

    // Create meeting from task
    const newMeeting: Meeting = {
      id: `m_${Date.now()}`,
      workspaceId: task.workspaceId,
      title: data.title,
      date: new Date().toISOString(),
      duration: '45 mins',
      participants: MOCK_SPEAKERS,
      tags: data.tags,
      hubSpotSynced: false,
      status: 'completed',
      template: data.template,
      transcript: [
        {
          id: 'seg_1',
          speakerId: 'u1',
          timestamp: '00:00',
          text: 'This is a sample transcript generated from the uploaded audio file.',
          sentiment: 'neutral',
        },
      ],
      summary: {
        executiveSummary: `Meeting summary for ${data.title}`,
        decisions: [],
        actionItems: [],
      },
    };

    mockMeetings.push(newMeeting);

    // Remove task
    mockTasks = mockTasks.filter((t) => t.id !== taskId);

    return { id: newMeeting.id };
  },

  // Meetings
  getMeetings: (workspaceId: string): Meeting[] => {
    return mockMeetings.filter((m) => m.workspaceId === workspaceId);
  },

  getMeeting: (id: string): Meeting | undefined => {
    return mockMeetings.find((m) => m.id === id);
  },

  createMeetingFromUpload: (
    workspaceId: string,
    filename: string,
    fileSize: number
  ): { taskId: string } => {
    const task = mockDataService.createTask(workspaceId, filename, fileSize);
    return { taskId: task.id };
  },
};

