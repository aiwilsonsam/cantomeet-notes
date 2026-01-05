import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Clock,
  FileAudio,
  CheckCircle2,
  ChevronRight,
  Terminal,
  LayoutTemplate,
  Tag,
  X,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '@/services/api/tasks';
import { meetingsApi } from '@/services/api/meetings';
import { ProcessingTask } from '@/types';
import toast from 'react-hot-toast';
import { ENABLE_MOCK_API } from '@/lib/constants';

// Mock templates - TODO: Move to API
const MOCK_TEMPLATES = [
  { id: 't1', name: 'General', description: 'Standard meeting notes' },
  { id: 't2', name: 'Product Review', description: 'Product-focused meetings' },
  { id: 't3', name: 'Sales', description: 'Sales and customer meetings' },
];

export const TasksPage = () => {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewTemplate, setReviewTemplate] = useState('t1');
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const { data: tasks = [], isLoading, error } = useQuery<ProcessingTask[]>({
    queryKey: ['tasks', activeWorkspace?.id],
    queryFn: async () => {
      if (!activeWorkspace) {
        console.log('[TasksPage] No active workspace, returning empty array');
        return Promise.resolve([]);
      }
      console.log('[TasksPage] Fetching tasks for workspace:', activeWorkspace.id);
      console.log('[TasksPage] ENABLE_MOCK_API:', ENABLE_MOCK_API);
      try {
        const result = await tasksApi.list(activeWorkspace.id);
        console.log('[TasksPage] Tasks fetched:', result);
        return result;
      } catch (err) {
        console.error('[TasksPage] Error fetching tasks:', err);
        throw err;
      }
    },
    enabled: !!activeWorkspace,
    refetchInterval: (query) => {
      // Poll for updates if there are processing tasks or tasks at 100% but not yet review_ready
      const hasProcessing = query.state.data?.some(
        (t: ProcessingTask) => 
          t.status === 'queued' || 
          t.status === 'processing' ||
          (t.progress === 100 && t.status !== 'review_ready' && t.status !== 'completed' && t.status !== 'failed')
      );
      return hasProcessing ? 3000 : false;
    },
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error((error as any)?.message || 'Failed to load tasks');
    }
  }, [error]);

  const finalizeMutation = useMutation({
    mutationFn: async ({
      taskId,
      title,
      template,
      tags,
    }: {
      taskId: string;
      title: string;
      template: string;
      tags: string[];
    }) => {
      if (!activeWorkspace) throw new Error('No active workspace');
      return tasksApi.finalize(taskId, {
        title,
        template,
        tags,
        workspaceId: activeWorkspace.id,
      });
    },
    onSuccess: async (meeting) => {
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['tasks', activeWorkspace?.id] });
      await queryClient.invalidateQueries({ queryKey: ['meetings', activeWorkspace?.id] });
      // Prefetch the meeting data before navigation to ensure it's loaded
      await queryClient.prefetchQuery({
        queryKey: ['meeting', meeting.id],
        queryFn: () => meetingsApi.get(meeting.id),
      });
      toast.success('Meeting created successfully!');
      setSelectedTaskId(null);
      navigate(`/meetings/${meeting.id}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to finalize task');
    },
  });

  const selectedTask = tasks.find((t: ProcessingTask) => t.id === selectedTaskId);

  const handleTaskClick = (task: ProcessingTask) => {
    setSelectedTaskId(task.id);
    if (task.status === 'review_ready' || 
        (task.status === 'completed' && task.progress === 100) ||
        (task.status === 'processing' && task.progress === 100)) {
      setReviewTitle(task.filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      setReviewTags(['Internal', 'Project Alpha']);
    }
  };

  const handleSave = () => {
    if (selectedTaskId) {
      const selectedTemplateName =
        MOCK_TEMPLATES.find((t) => t.id === reviewTemplate)?.name || 'General';
      finalizeMutation.mutate({
        taskId: selectedTaskId,
        title: reviewTitle,
        template: selectedTemplateName,
        tags: reviewTags,
      });
    }
  };

  const addTag = () => {
    if (newTag && !reviewTags.includes(newTag)) {
      setReviewTags([...reviewTags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tToRemove: string) => {
    setReviewTags(reviewTags.filter((t) => t !== tToRemove));
  };

  // Helper function to determine processing stage from logs
  const getProcessingStageMessage = (task: ProcessingTask): string => {
    if (!task.logs || task.logs.length === 0) {
      return 'Processing in progress...';
    }

    // Get the last few log messages to determine current stage
    const recentLogs = task.logs.slice(-5).join(' ').toLowerCase();

    // Check for transcription stage
    if (recentLogs.includes('transcribing') || recentLogs.includes('whisper') || recentLogs.includes('speechmatics')) {
      if (recentLogs.includes('completed')) {
        return 'Transcription completed. Generating AI summary...';
      }
      return 'Transcribing audio...';
    }

    // Check for summarization stage
    if (recentLogs.includes('summarization') || recentLogs.includes('llm') || recentLogs.includes('generating summary')) {
      if (recentLogs.includes('completed')) {
        return 'AI summarization completed. Finalizing...';
      }
      return 'Generating AI summary...';
    }

    // Check for action items extraction
    if (recentLogs.includes('action items') || recentLogs.includes('extracting')) {
      return 'Extracting action items...';
    }

    // Default message
    return 'Processing in progress...';
  };

  if (isLoading) {
    return (
      <div className="flex h-full bg-slate-50 items-center justify-center">
        <div className="text-slate-500">Loading tasks...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full bg-slate-50 items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Failed to load tasks</p>
          <p className="text-slate-500 text-sm">{(error as any)?.message || 'Unknown error'}</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks', activeWorkspace?.id] })}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Task List (Left Side) */}
      <div
        className={`${
          selectedTaskId ? 'w-1/2' : 'w-full max-w-4xl mx-auto'
        } flex flex-col p-8 transition-all duration-300`}
      >
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">任務中心 Task Center</h1>
            <p className="text-slate-500">Monitor processing jobs and finalize transcripts.</p>
            {ENABLE_MOCK_API && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ Using mock data (ENABLE_MOCK_API={String(ENABLE_MOCK_API)}, env={String(import.meta.env.VITE_ENABLE_MOCK_API)})
              </p>
            )}
            {!ENABLE_MOCK_API && (
              <p className="text-xs text-green-600 mt-1">
                ✅ Using real API (API_BASE_URL: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'})
              </p>
            )}
          </div>
          {tasks.length === 0 && (
            <button
              onClick={() => navigate('/app/upload')}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              + New Upload
            </button>
          )}
        </header>

        <div className="space-y-4 overflow-y-auto pb-10">
          {tasks.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
              <Activity size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No active tasks</p>
              <button
                onClick={() => navigate('/app/upload')}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
              >
                Start new upload
              </button>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={`bg-white p-5 rounded-xl border cursor-pointer transition-all shadow-sm group ${
                  selectedTaskId === task.id
                    ? 'border-primary-500 ring-1 ring-primary-500'
                    : 'border-slate-200 hover:border-primary-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        (task.status === 'review_ready' || 
                         (task.status === 'completed' && task.progress === 100) ||
                         (task.status === 'processing' && task.progress === 100))
                          ? 'bg-green-100 text-green-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {(task.status === 'review_ready' || 
                        (task.status === 'completed' && task.progress === 100) ||
                        (task.status === 'processing' && task.progress === 100)) ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <FileAudio size={20} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{task.filename}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock size={12} />
                        <span>Started {new Date(task.startTime).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span>{(task.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-500" />
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (task.status === 'review_ready' || 
                       (task.status === 'completed' && task.progress === 100) ||
                       (task.status === 'processing' && task.progress === 100)) ? 'bg-green-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-slate-600">
                    {task.status === 'queued' && 'Queued...'}
                    {task.status === 'processing' && task.progress < 100 && 'Processing...'}
                    {(task.status === 'review_ready' || 
                      (task.status === 'completed' && task.progress === 100) ||
                      (task.status === 'processing' && task.progress === 100)) && 'Ready for Review'}
                    {task.status === 'completed' && task.progress < 100 && 'Completed'}
                    {task.status === 'failed' && 'Failed'}
                  </span>
                  <span className="text-slate-400">{task.progress}%</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Task Detail (Right Side) */}
      {selectedTaskId && selectedTask && (
        <div className="w-1/2 bg-white border-l border-slate-200 flex flex-col h-full shadow-2xl z-10">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="font-bold text-slate-900 text-lg">
              {(selectedTask.status === 'review_ready' || 
                (selectedTask.status === 'completed' && selectedTask.progress === 100) ||
                (selectedTask.status === 'processing' && selectedTask.progress === 100)) ? 'Review & Configure' : 'Task Details'}
            </h2>
            <button
              onClick={() => setSelectedTaskId(null)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Log View for Processing */}
            {selectedTask.status !== 'review_ready' && 
             !(selectedTask.status === 'completed' && selectedTask.progress === 100) &&
             !(selectedTask.status === 'processing' && selectedTask.progress === 100) && (
              <div className="mb-8">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Terminal size={14} /> Process Logs
                </h3>
                <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto">
                  {selectedTask.logs && selectedTask.logs.length > 0 ? (
                    selectedTask.logs.map((log: string, i: number) => {
                      // Log format: "[2:21:06 PM] message" or just "message"
                      const logMatch = log.match(/^\[([^\]]+)\]\s*(.*)$/);
                      const timestamp = logMatch ? logMatch[1] : null;
                      const message = logMatch ? logMatch[2] : log;
                      
                      return (
                        <div key={i} className="mb-1.5 border-l-2 border-slate-700 pl-2">
                          {timestamp ? (
                            <>
                              <span className="text-slate-500 mr-2">[{timestamp}]</span>
                              <span>{message}</span>
                            </>
                          ) : (
                            <span>{log}</span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-slate-500 italic">No logs available yet...</div>
                  )}
                  {selectedTask.status === 'processing' && (
                    <div className="animate-pulse text-primary-400 mt-2">_ Processing...</div>
                  )}
                </div>
              </div>
            )}

            {/* Review Form */}
            {(selectedTask.status === 'review_ready' || 
              (selectedTask.status === 'completed' && selectedTask.progress === 100) ||
              (selectedTask.status === 'processing' && selectedTask.progress === 100)) ? (
              <div>
                {/* Success Banner */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 mb-8">
                  <div className="w-6 h-6 rounded-full bg-green-100 border border-green-200 flex items-center justify-center text-green-600">
                    <CheckCircle2 size={16} strokeWidth={3} />
                  </div>
                  <span className="text-green-700 text-sm font-semibold">Transcription Complete!</span>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Meeting Title
                    </label>
                    <input
                      type="text"
                      value={reviewTitle}
                      onChange={(e) => setReviewTitle(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white text-slate-700 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <LayoutTemplate size={14} /> Template
                    </label>
                    <div className="relative">
                      <select
                        value={reviewTemplate}
                        onChange={(e) => setReviewTemplate(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white text-slate-700 shadow-sm appearance-none"
                      >
                        {MOCK_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} – {t.description}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronRight size={16} className="rotate-90" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Tag size={14} /> Tags
                    </label>
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 shadow-inner">
                      <div className="flex flex-wrap gap-2 mb-3">
                        {reviewTags.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-md shadow-sm text-xs font-medium"
                          >
                            {t}
                            <button
                              onClick={() => removeTag(t)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add tag..."
                          className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-primary-500 bg-white"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addTag()}
                        />
                        <button
                          onClick={addTag}
                          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    disabled={!reviewTitle || finalizeMutation.isPending}
                    className="w-full mt-6 bg-primary-600 hover:bg-primary-700 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-primary-900/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {finalizeMutation.isPending ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <span>Generate Minutes & Save</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                <Loader2 size={32} className="mx-auto text-primary-500 animate-spin mb-3" />
                <p className="text-slate-600 font-medium">{getProcessingStageMessage(selectedTask)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedTask.progress < 100
                    ? `Processing... ${selectedTask.progress}% complete`
                    : 'You will be able to review this meeting once processing reaches 100%.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
