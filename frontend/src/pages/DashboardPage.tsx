import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useQuery } from '@tanstack/react-query';
import { meetingsApi } from '@/services/api/meetings';
import { Meeting } from '@/types';

const StatCard: React.FC<{ title: string; value: string; change: string; urgent?: boolean }> = ({
  title,
  value,
  change,
  urgent,
}) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
    <div className="mt-2 flex items-baseline gap-2">
      <span className="text-3xl font-bold text-slate-800">{value}</span>
    </div>
    <p className={`text-xs mt-2 font-medium ${urgent ? 'text-amber-600' : 'text-green-600'}`}>{change}</p>
  </div>
);

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeWorkspace } = useWorkspace();

  // Fetch meetings for the active workspace
  const { data: meetings = [], isLoading } = useQuery<Meeting[]>({
    queryKey: ['meetings', activeWorkspace?.id],
    queryFn: () => (activeWorkspace ? meetingsApi.list(activeWorkspace.id) : []),
    enabled: !!activeWorkspace,
  });

  // Calculate stats
  const thisWeekMeetings = meetings.filter((m) => {
    const meetingDate = new Date(m.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return meetingDate >= weekAgo;
  }).length;

  // Safely extract action items from meetings (handle cases where summary or actionItems might be undefined)
  const allActionItems = meetings
    .flatMap((m) => {
      // Check if summary exists and has actionItems
      if (m.summary && m.summary.actionItems && Array.isArray(m.summary.actionItems)) {
        return m.summary.actionItems;
      }
      return [];
    })
    .filter((item) => item != null); // Filter out any null/undefined items

  const pendingActionItems = allActionItems.filter((item) => item.status !== 'completed');
  const dueTodayActionItems = pendingActionItems.filter((item) => {
    if (!item.dueDate) return false;
    const dueDate = new Date(item.dueDate);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString();
  });

  // Get recent meetings (last 5, sorted by date)
  const recentMeetings = [...meetings]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Calculate saved hours from completed meetings
  const completedMeetings = meetings.filter((m) => m.status === 'completed');
  const savedMinutes = completedMeetings.reduce((total, meeting) => {
    // Extract minutes from duration string (e.g., "45 mins", "1.5h", "90 min")
    const duration = meeting.duration || '';
    const match = duration.match(/(\d+\.?\d*)/);
    if (!match) return total;
    
    const value = parseFloat(match[1]);
    if (duration.includes('h')) {
      return total + value * 60; // Convert hours to minutes
    }
    return total + value; // Already in minutes
  }, 0);
  
  const savedHours = savedMinutes > 0 ? (savedMinutes / 60).toFixed(1) : '0';

  const handleMeetingClick = (id: string) => {
    navigate(`/app/meetings/${id}`);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早晨';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-8 overflow-y-auto bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {greeting()}, {user?.name || 'User'}!
        </h1>
        <p className="text-slate-500">Here's what's happening in your workspace today.</p>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="This Week's Meetings"
          value={thisWeekMeetings.toString()}
          change={`${thisWeekMeetings > 0 ? '+' : ''}${thisWeekMeetings} from last week`}
        />
        <StatCard
          title="Pending Action Items"
          value={pendingActionItems.length.toString()}
          change={`${dueTodayActionItems.length} due today`}
          urgent={dueTodayActionItems.length > 0}
        />
        <StatCard 
          title="Saved Hours (AI)" 
          value={`${savedHours}h`} 
          change={`${completedMeetings.length} meetings processed`} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Meetings Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Recent Meetings</h2>
            <button
              onClick={() => navigate('/app/meetings')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View all
            </button>
          </div>

          {recentMeetings.length > 0 ? (
            recentMeetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => handleMeetingClick(meeting.id)}
                className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-primary-500"></div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-primary-600 transition-colors text-lg">
                      {meeting.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <Clock size={14} />
                      <span>
                        {new Date(meeting.date).toLocaleDateString()} • {meeting.duration}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      meeting.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : meeting.status === 'transcribing' || meeting.status === 'summarizing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {meeting.status === 'completed'
                      ? 'Processed'
                      : meeting.status === 'transcribing'
                        ? 'Transcribing'
                        : meeting.status === 'summarizing'
                          ? 'Summarizing'
                          : 'Processing'}
                  </span>
                </div>

                <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                  {meeting.summary?.executiveSummary || 'No summary available yet.'}
                </p>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex -space-x-2">
                    {(meeting.participants || []).slice(0, 4).map((p) => (
                      <img
                        key={p.id}
                        src={p.avatar || ''}
                        alt={p.name || 'Participant'}
                        className="w-6 h-6 rounded-full border-2 border-white"
                        onError={(e) => {
                          // Fallback to a default avatar if image fails to load
                          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'U')}&background=random`;
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {(meeting.tags || []).slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center text-slate-500">
              <p>No meetings yet. Upload your first meeting to get started!</p>
            </div>
          )}
        </div>

        {/* Action Items Column */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">My Tasks</h2>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            {pendingActionItems.length > 0 ? (
              <>
                <ul className="space-y-4">
                  {pendingActionItems.slice(0, 5).map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0"
                    >
                      <button className="mt-0.5 text-slate-400 hover:text-primary-600">
                        <CheckCircle2 size={18} />
                      </button>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">Due {item.dueDate}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              item.status === 'in-progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {item.status.replace('-', ' ')}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/app/tasks')}
                  className="w-full mt-4 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-primary-600 py-2 border-t border-slate-100 transition-colors"
                >
                  <span>View all tasks</span>
                  <ArrowRight size={14} />
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">
                <p>No pending action items</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
