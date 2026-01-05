import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Share2,
  Download,
  Bot,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Edit2,
  X,
  Plus,
  Check,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from '@/services/api/meetings';
import { Meeting, ChatMessage, ActionItem } from '@/types';
import { TranscriptView } from '@/components/meeting/TranscriptView';
import { SummaryView } from '@/components/meeting/SummaryView';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export const MeetingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch meeting data
  const { data: meeting, isLoading, refetch } = useQuery<Meeting>({
    queryKey: ['meeting', id],
    queryFn: () => meetingsApi.get(id!),
    enabled: !!id,
    staleTime: 0, // Always consider data stale to ensure fresh data on navigation
    gcTime: 0, // Don't cache to ensure we always fetch fresh data (formerly cacheTime in v4)
    refetchInterval: (query) => {
      // Poll for updates if meeting is still being summarized
      const meeting = query.state.data;
      return meeting?.status === 'summarizing' ? 3000 : false;
    },
  });

  // Refetch when id changes (e.g., after navigation)
  useEffect(() => {
    if (id) {
      refetch();
    }
  }, [id, refetch]);

  // Initialize local state when meeting loads
  useEffect(() => {
    if (meeting) {
      // Safely extract action items (handle cases where summary might be undefined)
      setActionItems(meeting.summary?.actionItems || []);
      setTags(meeting.tags || []);
    }
  }, [meeting]);

  // Update meeting mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      tags?: string[];
      actionItems?: ActionItem[];
      summary_update?: { overview?: string; decisions?: any[]; highlights?: any[] };
    }) => {
      if (!id) throw new Error('Meeting ID is required');
      const updatePayload: any = {};
      if (data.tags !== undefined) updatePayload.tags = data.tags;
      if (data.actionItems !== undefined) {
        updatePayload.summary = {
          ...(meeting!.summary || {}),
          actionItems: data.actionItems,
        };
      }
      if (data.summary_update !== undefined) {
        updatePayload.summary_update = data.summary_update;
      }
      return meetingsApi.update(id, updatePayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', id] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      toast.success('Meeting updated');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update meeting');
    },
  });

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatExpanded) {
      scrollToBottom();
    }
  }, [chatHistory, isAiThinking, isChatExpanded]);

  // Sync Action Items changes
  const handleAddActionItem = (newItem: ActionItem) => {
    const updated = [newItem, ...actionItems];
    setActionItems(updated);
    updateMutation.mutate({ actionItems: updated });
  };

  const handleUpdateActionItem = (updatedItem: ActionItem) => {
    const updated = actionItems.map((item) => (item.id === updatedItem.id ? updatedItem : item));
    setActionItems(updated);
    updateMutation.mutate({ actionItems: updated });
  };

  const handleDeleteActionItem = (id: string) => {
    const updated = actionItems.filter((item) => item.id !== id);
    setActionItems(updated);
    updateMutation.mutate({ actionItems: updated });
  };

  // Tag Handlers
  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      const updated = [...tags, newTag];
      setTags(updated);
      setNewTag('');
      updateMutation.mutate({ tags: updated });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    updateMutation.mutate({ tags: updated });
  };

  const handleSaveTags = () => {
    updateMutation.mutate({ tags });
    setIsEditingTags(false);
  };

  const handleSync = () => {
    setIsSyncing(true);
    // TODO: Implement HubSpot sync
    setTimeout(() => {
      setIsSyncing(false);
      toast.success('Synced to HubSpot');
    }, 1500);
  };

  // Simulated AI Logic
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: chatInput,
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsAiThinking(true);
    setIsChatExpanded(true);

    // Simulate AI response
    setTimeout(() => {
      let aiResponseText = "I'm sorry, I couldn't find specific information about that in the transcript.";
      let suggestedAction: ActionItem | undefined;

      const lowerInput = userMsg.content.toLowerCase();

      if (lowerInput.includes('decision') || lowerInput.includes('decide')) {
        aiResponseText =
          "Based on the transcript, I can help you find key decisions. Let me search through the meeting summary.";
        suggestedAction = {
          id: `ai_act_${Date.now()}`,
          description: 'Review key decisions from meeting',
          owner: 'Current User',
          dueDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          priority: 'medium',
          relatedSegmentId: '',
        };
      } else if (lowerInput.includes('summary') || lowerInput.includes('recap')) {
        aiResponseText = meeting?.summary?.executiveSummary || 'No summary available yet.';
      } else if (lowerInput.includes('action') || lowerInput.includes('task')) {
        aiResponseText = `I found ${actionItems.length} action items in this meeting.`;
      } else if (lowerInput.includes('hello') || lowerInput.includes('hi')) {
        aiResponseText = "Hello! I am your CantoMeet AI assistant. Ask me anything about this meeting's transcript or decisions.";
      }

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'ai',
        content: aiResponseText,
        timestamp: new Date(),
        suggestedAction: suggestedAction,
      };

      setChatHistory((prev) => [...prev, aiMsg]);
      setIsAiThinking(false);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-500 mb-4">Meeting not found</p>
          <button
            onClick={() => navigate('/app/meetings')}
            className="text-primary-600 hover:text-primary-700"
          >
            Go back to meetings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/meetings')}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{meeting.title}</h1>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>{new Date(meeting.date).toLocaleString('zh-HK')}</span>
              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                {meeting.duration}
              </span>

              {/* Tag Editor */}
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                {!isEditingTags ? (
                  <>
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"
                      >
                        #{t}
                      </span>
                    ))}
                    <button
                      onClick={() => setIsEditingTags(true)}
                      className="p-1 text-slate-400 hover:text-primary-600 hover:bg-slate-100 rounded-full transition-colors ml-1"
                    >
                      <Edit2 size={12} />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-primary-50 text-primary-700 rounded border border-primary-100"
                      >
                        #{t}
                        <button
                          onClick={() => handleRemoveTag(t)}
                          className="text-primary-400 hover:text-red-500"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    <div className="relative">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="New tag"
                        className="w-20 px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:border-primary-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleAddTag}
                        className="absolute right-1 top-1 text-slate-400 hover:text-primary-600"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <button
                      onClick={handleSaveTags}
                      className="p-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 ml-1"
                    >
                      <Check size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={meeting.hubSpotSynced || isSyncing}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              meeting.hubSpotSynced
                ? 'bg-orange-50 text-orange-700 border border-orange-200 cursor-default'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isSyncing ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                Syncing...
              </span>
            ) : meeting.hubSpotSynced ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 size={16} /> Synced to HubSpot
              </span>
            ) : (
              <span>Export to HubSpot</span>
            )}
          </button>
          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          <button className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
            <Share2 size={18} />
          </button>
          <button className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
            <Download size={18} />
          </button>
        </div>
      </header>

      {/* Content Area - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Transcript (45%) */}
        <div className="w-[45%] border-r border-slate-200 flex flex-col min-w-[350px]">
          <TranscriptView
            segments={meeting.transcript || []}
            participants={meeting.participants || []}
            highlightedId={highlightedSegmentId}
          />
        </div>

        {/* Right: Summary & AI Tools (55%) */}
        <div className="flex-1 flex flex-col bg-slate-50 min-w-[400px] relative">
          {/* Scrollable Summary Content */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            <SummaryView
              summary={{
                executiveSummary: meeting.summary?.executiveSummary || '',
                detailedMinutes: meeting.summary?.detailedMinutes,
                decisions: meeting.summary?.decisions || [],
                actionItems: actionItems,
              }}
              onHighlight={setHighlightedSegmentId}
              actionItems={actionItems}
              onAddActionItem={handleAddActionItem}
              onUpdateActionItem={handleUpdateActionItem}
              onDeleteActionItem={handleDeleteActionItem}
              onUpdateSummary={async (summaryUpdate) => {
                if (!id) return;
                try {
                  await updateMutation.mutateAsync({
                    summary_update: summaryUpdate,
                  } as any);
                  toast.success('Summary updated successfully');
                } catch (error: any) {
                  toast.error(error.message || 'Failed to update summary');
                  throw error;
                }
              }}
              meetingId={id}
              meetingStatus={meeting.status}
            />

            {/* Chat History Overlay */}
            {chatHistory.length > 0 && (
              <div
                className={`absolute bottom-0 left-0 right-0 transition-all duration-300 ease-in-out flex flex-col justify-end px-8 pb-4 pointer-events-none ${
                  isChatExpanded ? 'max-h-[60%]' : 'max-h-auto'
                }`}
              >
                <div className="w-full bg-white border border-slate-200 rounded-t-2xl shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] pointer-events-auto flex flex-col">
                  {/* Chat Header */}
                  <div
                    onClick={() => setIsChatExpanded(!isChatExpanded)}
                    className="p-3 border-b border-slate-100 bg-slate-50/80 backdrop-blur-sm rounded-t-2xl flex justify-between items-center cursor-pointer hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <Sparkles size={14} className="text-primary-600" />
                      AI Assistant
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatHistory([]);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 hover:bg-slate-200 rounded"
                      >
                        Clear
                      </button>
                      <button className="text-slate-400 hover:text-slate-600">
                        {isChatExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Chat Content */}
                  {isChatExpanded && (
                    <div className="overflow-y-auto p-4 space-y-4 max-h-96 min-h-[200px] bg-white">
                      {chatHistory.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              msg.role === 'ai'
                                ? 'bg-primary-100 text-primary-600'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {msg.role === 'ai' ? <Bot size={16} /> : <span className="text-xs font-bold">You</span>}
                          </div>
                          <div className="max-w-[80%] flex flex-col gap-2">
                            <div
                              className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                msg.role === 'user'
                                  ? 'bg-slate-800 text-white rounded-br-none'
                                  : 'bg-slate-100 text-slate-800 rounded-bl-none'
                              }`}
                            >
                              {msg.content}
                            </div>
                            {/* AI Suggested Action Button */}
                            {msg.suggestedAction && (
                              <div>
                                {actionItems.some((item) => item.description === msg.suggestedAction?.description) ? (
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg border border-green-200">
                                    <CheckCircle2 size={12} /> Action Item Added
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => msg.suggestedAction && handleAddActionItem(msg.suggestedAction)}
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-primary-200 text-primary-700 text-xs font-medium rounded-lg hover:bg-primary-50 transition-colors shadow-sm group"
                                  >
                                    <Sparkles size={12} className="text-primary-500" />
                                    Create Action Item
                                    <ArrowRight
                                      size={12}
                                      className="opacity-0 group-hover:opacity-100 -ml-1 group-hover:ml-0 transition-all"
                                    />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {isAiThinking && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center flex-shrink-0">
                            <Bot size={16} />
                          </div>
                          <div className="bg-slate-100 p-3 rounded-2xl rounded-bl-none flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ask AI Input Area */}
          <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0 z-20">
            <div className="relative">
              <div className="absolute left-3 top-3 text-primary-600">
                <Bot size={20} />
              </div>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask AI about this meeting (e.g., 'What was the decision on AWS costs?')"
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isAiThinking}
                className="absolute right-2 top-2 p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
