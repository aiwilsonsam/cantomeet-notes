import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MoreHorizontal, FileAudio, Search, Filter, ChevronDown, Check, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from '@/services/api/meetings';
import { Meeting } from '@/types';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export const MeetingsPage = () => {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'completed' | 'transcribing' | 'summarizing' | 'failed' | 'scheduled'
  >('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<string | null>(null);

  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ['meetings', activeWorkspace?.id],
    queryFn: () => (activeWorkspace ? meetingsApi.list(activeWorkspace.id) : []),
    enabled: !!activeWorkspace,
  });

  // Delete meeting mutation
  const deleteMutation = useMutation({
    mutationFn: (meetingId: string) => meetingsApi.delete(meetingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', activeWorkspace?.id] });
      toast.success('Meeting deleted successfully');
      setDeleteConfirmOpen(null);
      setDeleteMenuOpen(null);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete meeting');
    },
  });

  const handleDelete = (meetingId: string) => {
    deleteMutation.mutate(meetingId);
  };

  // Filter Logic
  const filteredMeetings = meetings
    .filter((meeting) => {
      const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || meeting.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

  const getStatusBadge = (status: Meeting['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            Processed
          </span>
        );
      case 'transcribing':
      case 'summarizing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            {status === 'transcribing' ? 'Transcribing' : 'Summarizing'}
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Scheduled
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 bg-slate-50 overflow-y-auto flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div
      className="flex-1 p-8 bg-slate-50 overflow-y-auto"
      onClick={() => isFilterOpen && setIsFilterOpen(false)}
    >
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">會議記錄 My Meetings</h1>
          <p className="text-slate-500">Manage and review your transcripts and minutes.</p>
        </div>
        <div className="flex gap-3 relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsFilterOpen(!isFilterOpen);
              }}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${
                isFilterOpen
                  ? 'bg-slate-100 border-slate-300 text-slate-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Filter size={18} />
              Filter
              <ChevronDown size={14} className={`transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Filter Dropdown */}
            {isFilterOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 z-20"
              >
                <div className="mb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5">
                    Status
                  </h4>
                  {['all', 'completed', 'transcribing', 'summarizing', 'failed', 'scheduled'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status as any)}
                      className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded hover:bg-slate-50 text-slate-700 capitalize"
                    >
                      {status}
                      {statusFilter === status && <Check size={14} className="text-primary-600" />}
                    </button>
                  ))}
                </div>
                <div className="border-t border-slate-100 pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5">
                    Sort Order
                  </h4>
                  <button
                    onClick={() => setSortOrder('newest')}
                    className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded hover:bg-slate-50 text-slate-700"
                  >
                    Newest First
                    {sortOrder === 'newest' && <Check size={14} className="text-primary-600" />}
                  </button>
                  <button
                    onClick={() => setSortOrder('oldest')}
                    className="flex items-center justify-between w-full px-2 py-1.5 text-sm rounded hover:bg-slate-50 text-slate-700"
                  >
                    Oldest First
                    {sortOrder === 'oldest' && <Check size={14} className="text-primary-600" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
        {filteredMeetings.length > 0 ? (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[40%]">
                  Title
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Participants
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMeetings.map((meeting) => (
                <tr
                  key={meeting.id}
                  onClick={() => navigate(`/app/meetings/${meeting.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg mt-0.5 ${
                          meeting.status === 'scheduled'
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-primary-50 text-primary-600'
                        }`}
                      >
                        {meeting.status === 'scheduled' ? <Calendar size={20} /> : <FileAudio size={20} />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">
                          {meeting.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          {(meeting.tags || []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-medium border border-slate-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{new Date(meeting.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <Clock size={14} />
                        <span>{meeting.duration}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(meeting.status)}</td>
                  <td className="px-6 py-4">
                    <div className="flex -space-x-2">
                      {(meeting.participants || []).slice(0, 4).map((p) => (
                        <img
                          key={p.id}
                          src={p.avatar}
                          alt={p.name}
                          title={p.name}
                          className="w-8 h-8 rounded-full border-2 border-white ring-1 ring-slate-100"
                        />
                      ))}
                      {(!meeting.participants || meeting.participants.length === 0) && (
                        <span className="text-xs text-slate-400 italic">No participants</span>
                      )}
                      {meeting.participants && meeting.participants.length > 4 && (
                        <span className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs text-slate-600 font-medium">
                          +{meeting.participants.length - 4}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteMenuOpen(deleteMenuOpen === meeting.id ? null : meeting.id);
                        }}
                        className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                      {deleteMenuOpen === meeting.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-slate-200 z-30"
                        >
                          <button
                            onClick={() => {
                              setDeleteConfirmOpen(meeting.id);
                              setDeleteMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={Search}
            title="No meetings found"
            description="Try adjusting your filters or search terms."
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirmOpen(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Meeting</h3>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete this meeting? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirmOpen(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmOpen)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
