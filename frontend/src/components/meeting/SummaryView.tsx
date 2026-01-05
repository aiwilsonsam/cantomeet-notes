import { useState, useEffect } from 'react';
import { MeetingSummary, ActionItem } from '@/types';
import {
  Sparkles,
  CheckSquare,
  Target,
  Lightbulb,
  MoreHorizontal,
  Edit2,
  Trash2,
  User,
  Plus,
  Bell,
  Save,
  X,
} from 'lucide-react';

interface SummaryViewProps {
  summary: MeetingSummary;
  onHighlight: (segmentId: string) => void;
  actionItems?: ActionItem[];
  onAddActionItem?: (item: ActionItem) => void;
  onUpdateActionItem?: (item: ActionItem) => void;
  onDeleteActionItem?: (id: string) => void;
  onUpdateSummary?: (summary: { overview?: string; detailed_minutes?: string; decisions?: any[]; highlights?: any[] }) => void | Promise<void>;
  meetingId?: string;
  meetingStatus?: 'uploaded' | 'transcribing' | 'summarizing' | 'completed' | 'failed' | 'scheduled';
}

export const SummaryView = ({
  summary,
  onHighlight,
  actionItems: propActionItems,
  onAddActionItem,
  onUpdateActionItem,
  onDeleteActionItem,
  onUpdateSummary,
  meetingId,
  meetingStatus,
}: SummaryViewProps) => {
  const [activeTab, setActiveTab] = useState<'minutes' | 'detailed' | 'actions'>('minutes');
  const [localItems, setLocalItems] = useState<ActionItem[]>(summary.actionItems || []);
  const items: ActionItem[] = propActionItems || localItems || [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ActionItem>>({});
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [editedSummary, setEditedSummary] = useState(summary.executiveSummary || '');
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [isEditingDetailedMinutes, setIsEditingDetailedMinutes] = useState(false);
  const [editedDetailedMinutes, setEditedDetailedMinutes] = useState(summary.detailedMinutes || '');
  const [isSavingDetailedMinutes, setIsSavingDetailedMinutes] = useState(false);

  // Update editedSummary when summary changes externally (but not while editing)
  useEffect(() => {
    if (!isEditingSummary) {
      setEditedSummary(summary.executiveSummary || '');
    }
  }, [summary.executiveSummary, isEditingSummary]);

  // Update editedDetailedMinutes when summary changes externally (but not while editing)
  useEffect(() => {
    if (!isEditingDetailedMinutes) {
      setEditedDetailedMinutes(summary.detailedMinutes || '');
    }
  }, [summary.detailedMinutes, isEditingDetailedMinutes]);

  const toggleStatus = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const updatedItem = {
      ...item,
      status: item.status === 'completed' ? 'pending' : 'completed',
    } as ActionItem;

    if (onUpdateActionItem) {
      onUpdateActionItem(updatedItem);
    } else {
      setLocalItems((prev) => (prev || []).map((i) => (i.id === id ? updatedItem : i)));
    }
  };

  const deleteItem = (id: string) => {
    if (onDeleteActionItem) {
      onDeleteActionItem(id);
    } else {
      setLocalItems((items || []).filter((i) => i.id !== id));
    }
  };

  const startEditing = (item: ActionItem) => {
    setEditingId(item.id);
    setEditForm(item);
  };

  const saveEdit = () => {
    if (editingId && editForm.description) {
      const original = items.find((i) => i.id === editingId);
      if (original) {
        const updatedItem = { ...original, ...editForm } as ActionItem;
        if (onUpdateActionItem) {
          onUpdateActionItem(updatedItem);
        } else {
          setLocalItems((prev) => (prev || []).map((item) => (item.id === editingId ? updatedItem : item)));
        }
      }
      setEditingId(null);
      setEditForm({});
    }
  };

  const handleAddManualItem = () => {
    const newItem: ActionItem = {
      id: `manual_${Date.now()}`,
      description: '',
      owner: 'Current User', // Will be replaced with actual user
      dueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      priority: 'medium',
      relatedSegmentId: '',
      reminder: '',
    };

    if (onAddActionItem) {
      onAddActionItem(newItem);
    } else {
      setLocalItems([newItem, ...(items || [])]);
    }

    setEditingId(newItem.id);
    setEditForm(newItem);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 flex flex-col">
      {/* AI Header */}
      <div className="p-4 bg-white border-b border-slate-200 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('minutes')}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'minutes'
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            智能紀要 AI Minutes
          </button>
          {/* Always show detailed minutes tab if summary exists (even if empty, user can edit) */}
          <button
            onClick={() => setActiveTab('detailed')}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'detailed'
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            會議紀要 Meeting Minutes
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'actions'
                ? 'bg-primary-50 text-primary-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            待辦事項 Action Items
          </button>
        </div>
        <div className="flex items-center gap-1 text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
          <Sparkles size={12} />
          <span>AI Generated</span>
        </div>
      </div>

      <div className="p-8 max-w-3xl mx-auto w-full pb-24">
        {activeTab === 'minutes' ? (
          <div className="space-y-8">
            {/* Executive Summary */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wide">
                  <Lightbulb size={16} /> 摘要 Executive Summary
                </h4>
                {!isEditingSummary && summary.executiveSummary && (
                  <button
                    onClick={() => {
                      setIsEditingSummary(true);
                      setEditedSummary(summary.executiveSummary || '');
                    }}
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="Edit summary"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
              {isEditingSummary ? (
                <div className="space-y-3">
                  <textarea
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    className="w-full min-h-[200px] p-3 border border-slate-300 rounded-lg text-slate-800 leading-7 text-base focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-y"
                    placeholder="Enter meeting summary..."
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setIsEditingSummary(false);
                        setEditedSummary(summary.executiveSummary || '');
                      }}
                      disabled={isSavingSummary}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X size={16} className="inline mr-1" />
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!onUpdateSummary || !meetingId) return;
                        setIsSavingSummary(true);
                        try {
                          await onUpdateSummary({ overview: editedSummary });
                          setIsEditingSummary(false);
                        } catch (error) {
                          console.error('Failed to save summary:', error);
                        } finally {
                          setIsSavingSummary(false);
                        }
                      }}
                      disabled={isSavingSummary || !editedSummary.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSavingSummary ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {meetingStatus === 'summarizing' && !summary.executiveSummary ? (
                    <div className="flex items-center gap-3 py-8">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-600 leading-7 text-base">
                        <span className="font-medium">AI 正在总结中...</span>
                        <span className="text-slate-400 ml-2">(AI is generating summary...)</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-800 leading-7 text-base">
                      {summary.executiveSummary || 'No summary available yet.'}
                    </p>
                  )}
                </>
              )}
            </section>

            {/* Key Decisions */}
            <section>
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wide mb-4 pl-2">
                <Target size={16} /> 關鍵決策 Key Decisions
              </h4>
              {summary.decisions && summary.decisions.length > 0 ? (
                <div className="space-y-3">
                  {summary.decisions.map((decision) => (
                    <div
                      key={decision.id}
                      onClick={() => onHighlight(decision.relatedSegmentId)}
                      className="group bg-white p-4 rounded-lg border border-slate-200 hover:border-primary-400 hover:shadow-md cursor-pointer transition-all"
                    >
                      <p className="text-slate-800 group-hover:text-primary-900">{decision.description}</p>
                      <span className="text-xs text-slate-400 mt-2 block group-hover:text-primary-500">
                        Click to locate in transcript
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  <p>No decisions recorded yet.</p>
                </div>
              )}
            </section>
          </div>
        ) : activeTab === 'detailed' ? (
          <div className="space-y-6">
            {/* Detailed Meeting Minutes */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wide">
                  <Lightbulb size={16} /> 会议纪要 Meeting Minutes
                </h4>
                {!isEditingDetailedMinutes && summary.detailedMinutes && (
                  <button
                    onClick={() => {
                      setIsEditingDetailedMinutes(true);
                      setEditedDetailedMinutes(summary.detailedMinutes || '');
                    }}
                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    title="Edit detailed minutes"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
              {isEditingDetailedMinutes ? (
                <div className="space-y-3">
                  <textarea
                    value={editedDetailedMinutes}
                    onChange={(e) => setEditedDetailedMinutes(e.target.value)}
                    className="w-full min-h-[600px] p-3 border border-slate-300 rounded-lg text-slate-800 leading-7 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 resize-y"
                    placeholder="Enter detailed meeting minutes in Markdown format..."
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setIsEditingDetailedMinutes(false);
                        setEditedDetailedMinutes(summary.detailedMinutes || '');
                      }}
                      disabled={isSavingDetailedMinutes}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <X size={16} className="inline mr-1" />
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        if (!onUpdateSummary || !meetingId) return;
                        setIsSavingDetailedMinutes(true);
                        try {
                          await onUpdateSummary({ detailed_minutes: editedDetailedMinutes });
                          setIsEditingDetailedMinutes(false);
                        } catch (error) {
                          console.error('Failed to save detailed minutes:', error);
                        } finally {
                          setIsSavingDetailedMinutes(false);
                        }
                      }}
                      disabled={isSavingDetailedMinutes || !editedDetailedMinutes.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSavingDetailedMinutes ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-slate max-w-none">
                  {summary.detailedMinutes ? (
                    <div className="text-slate-800 leading-7 text-base markdown-content">
                      {(() => {
                        // Pre-process: Aggressively remove extra blank lines
                        // Strategy: Remove all blank lines, spacing will be handled by CSS margins
                        const lines = summary.detailedMinutes.split('\n');
                        const cleanedLines: string[] = [];
                        
                        for (let i = 0; i < lines.length; i++) {
                          const line = lines[i];
                          const trimmed = line.trim();
                          
                          // Skip blank lines entirely - spacing will be handled by block margins
                          if (!trimmed) {
                            continue;
                          }
                          
                          cleanedLines.push(line);
                        }
                        
                        // Group lines into blocks (headers, lists, paragraphs, etc.)
                        type BlockType = 'header' | 'ordered-list' | 'unordered-list' | 'paragraph' | 'hr' | 'blank';
                        interface Block {
                          type: BlockType;
                          lines: string[];
                          startIdx: number;
                        }
                        
                        const blocks: Block[] = [];
                        let currentBlock: Block | null = null;
                        
                        for (let i = 0; i < cleanedLines.length; i++) {
                          const line = cleanedLines[i];
                          const trimmed = line.trim();
                          
                          // Determine block type
                          let blockType: BlockType;
                          if (trimmed.match(/^#{1,6}\s+/)) {
                            blockType = 'header';
                          } else if (trimmed === '------' || trimmed === '---') {
                            blockType = 'hr';
                          } else if (/^\d+\.\s+/.test(trimmed)) {
                            blockType = 'ordered-list';
                          } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                            blockType = 'unordered-list';
                          } else {
                            blockType = 'paragraph';
                          }
                          
                          // Start new block or continue current one
                          // Note: blank lines are already filtered out, so we don't need to handle 'blank' type
                          if (!currentBlock || currentBlock.type !== blockType || blockType === 'header' || blockType === 'hr') {
                            // Save previous block
                            if (currentBlock) {
                              blocks.push(currentBlock);
                            }
                            // Start new block
                            currentBlock = {
                              type: blockType,
                              lines: [line],
                              startIdx: i,
                            };
                          } else {
                            // Continue current block (for lists and paragraphs)
                            currentBlock.lines.push(line);
                          }
                        }
                        
                        // Don't forget the last block
                        if (currentBlock) {
                          blocks.push(currentBlock);
                        }
                        
                        // Render blocks
                        return blocks.map((block, blockIdx) => {
                          if (block.type === 'header') {
                            const line = block.lines[0];
                            let cleanedLine = line;
                            
                            // Remove ** from headers if present
                            if (line.includes('**')) {
                              cleanedLine = line.replace(/\*\*/g, '');
                            }
                            
                            const headerMatch = cleanedLine.match(/^(#{1,6})\s+(.+)$/);
                            if (headerMatch) {
                              const level = headerMatch[1].length;
                              const text = headerMatch[2].trim();
                              
                              if (level === 1) {
                                return (
                                  <h1 key={blockIdx} className="text-2xl font-bold mt-10 mb-5 text-slate-900 border-b border-slate-200 pb-2">
                                    {text}
                                  </h1>
                                );
                              } else if (level === 2) {
                                return (
                                  <h2 key={blockIdx} className="text-xl font-bold mt-8 mb-4 text-slate-900">
                                    {text}
                                  </h2>
                                );
                              } else if (level === 3) {
                                return (
                                  <h3 key={blockIdx} className="text-lg font-bold mt-6 mb-3 text-slate-900">
                                    {text}
                                  </h3>
                                );
                              }
                            }
                            return null;
                          }
                          
                          if (block.type === 'hr') {
                            return <hr key={blockIdx} className="my-6 border-slate-200" />;
                          }
                          
                          if (block.type === 'ordered-list') {
                            return (
                              <ol key={blockIdx} className="ml-6 mb-4 list-decimal space-y-1">
                                {block.lines.map((line, lineIdx) => {
                                  const processedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
                                  const content = processedLine.replace(/^\d+\.\s+/, '');
                                  return (
                                    <li key={lineIdx} className="text-slate-700" dangerouslySetInnerHTML={{ __html: content }} />
                                  );
                                })}
                              </ol>
                            );
                          }
                          
                          if (block.type === 'unordered-list') {
                            return (
                              <ul key={blockIdx} className="ml-6 mb-4 list-disc space-y-1">
                                {block.lines.map((line, lineIdx) => {
                                  const processedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
                                  const content = processedLine.replace(/^[-*]\s+/, '');
                                  return (
                                    <li key={lineIdx} className="text-slate-700" dangerouslySetInnerHTML={{ __html: content }} />
                                  );
                                })}
                              </ul>
                            );
                          }
                          
                          if (block.type === 'paragraph') {
                            return block.lines.map((line, lineIdx) => {
                              const processedLine = line.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');
                              return (
                                <p key={`${blockIdx}-${lineIdx}`} className="mb-3 text-slate-700" dangerouslySetInnerHTML={{ __html: processedLine }} />
                              );
                            });
                          }
                          
                          return null;
                        });
                      })()}
                    </div>
                  ) : meetingStatus === 'summarizing' ? (
                    <div className="flex items-center gap-3 py-8">
                      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-600 leading-7 text-base">
                        <span className="font-medium">AI 正在生成会议纪要...</span>
                        <span className="text-slate-400 ml-2">(AI is generating meeting minutes...)</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic">No detailed minutes available yet. Detailed minutes are only generated for substantial meetings (longer than 10 minutes or with multiple discussion topics).</p>
                  )}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-500 uppercase tracking-wide">
                <CheckSquare size={16} /> Action Items
              </h4>
              <button
                onClick={handleAddManualItem}
                className="text-sm text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1 font-medium"
              >
                <Plus size={16} /> Add Manually
              </button>
            </div>

            {items.length > 0 ? (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white p-4 rounded-xl border transition-all flex items-start gap-4 ${
                    editingId === item.id
                      ? 'border-primary-500 ring-1 ring-primary-500 shadow-md'
                      : 'border-slate-200 hover:border-primary-300'
                  }`}
                >
                  <div className="mt-1">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      checked={item.status === 'completed'}
                      onChange={() => toggleStatus(item.id)}
                      disabled={editingId === item.id}
                    />
                  </div>
                  <div className="flex-1">
                    {editingId === item.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full text-slate-900 font-medium border-b border-slate-300 focus:border-primary-500 outline-none pb-1 placeholder:text-slate-300"
                          placeholder="Describe the action item..."
                          autoFocus
                        />
                        <div className="flex gap-2 flex-wrap items-center">
                          <input
                            type="date"
                            value={editForm.dueDate || ''}
                            onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                            className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-600 focus:border-primary-500 outline-none"
                          />
                          <select
                            value={editForm.priority || 'medium'}
                            onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}
                            className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-600 focus:border-primary-500 outline-none"
                          >
                            <option value="high">High Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="low">Low Priority</option>
                          </select>
                          <select
                            value={editForm.reminder || ''}
                            onChange={(e) => setEditForm({ ...editForm, reminder: e.target.value })}
                            className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-600 focus:border-primary-500 outline-none"
                          >
                            <option value="">No Reminder</option>
                            <option value="1 hour before">1 hr before</option>
                            <option value="1 day before">1 day before</option>
                            <option value="2 days before">2 days before</option>
                            <option value="1 week before">1 week before</option>
                          </select>
                          <input
                            type="text"
                            value={editForm.owner || ''}
                            onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                            placeholder="Owner name"
                            className="text-xs border border-slate-300 rounded px-2 py-1 text-slate-600 focus:border-primary-500 outline-none w-32"
                          />
                        </div>
                        <div className="flex justify-end pt-2">
                          <button
                            onClick={saveEdit}
                            className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-3 py-1.5 rounded font-medium transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => item.relatedSegmentId && onHighlight(item.relatedSegmentId)}
                        className="cursor-pointer"
                      >
                        <p
                          className={`text-slate-900 font-medium ${
                            item.status === 'completed' ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {item.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                            <span className="w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-700 uppercase">
                              {item.owner.slice(0, 2)}
                            </span>
                            <span className="text-xs text-slate-600 font-medium">{item.owner}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">Due:</span>
                            <span className="text-xs font-mono bg-slate-50 px-1.5 py-0.5 rounded text-slate-600 border border-slate-100">
                              {item.dueDate}
                            </span>
                          </div>
                          {item.reminder && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                              <Bell size={10} />
                              <span>{item.reminder}</span>
                            </div>
                          )}
                          {item.priority === 'high' && (
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                              High Priority
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Menu Trigger */}
                  <div className="relative group/menu">
                    <button className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
                      <MoreHorizontal size={16} />
                    </button>
                    <div className="absolute right-0 top-6 w-32 bg-white rounded-lg shadow-lg border border-slate-100 hidden group-hover/menu:block z-20">
                      <button
                        onClick={() => startEditing(item)}
                        className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button className="w-full text-left px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                        <User size={12} /> Reassign
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                <p>No action items yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

