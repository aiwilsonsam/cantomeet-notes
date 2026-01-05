import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Clock,
  Calendar as CalendarIcon,
  Users,
  AlignLeft,
  Check,
} from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { meetingsApi } from '@/services/api/meetings';
import { Meeting, Speaker } from '@/types';
import toast from 'react-hot-toast';

export const CalendarPage = () => {
  const navigate = useNavigate();
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState('60 mins');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const { data: meetings = [] } = useQuery<Meeting[]>({
    queryKey: ['meetings', activeWorkspace?.id],
    queryFn: () => (activeWorkspace ? meetingsApi.list(activeWorkspace.id) : []),
    enabled: !!activeWorkspace,
  });

  const scheduleMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      date: string;
      time: string;
      duration: string;
      participants: Speaker[];
    }) => {
      if (!activeWorkspace) throw new Error('No active workspace');
      const meetingDate = new Date(`${data.date}T${data.time}`);
      return meetingsApi.createScheduled({
        workspaceId: activeWorkspace.id,
        title: data.title,
        date: meetingDate.toISOString(),
        duration: data.duration,
        participants: data.participants,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', activeWorkspace?.id] });
      toast.success('Meeting scheduled successfully!');
      setIsModalOpen(false);
      setTitle('');
      setSelectedMembers([]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to schedule meeting');
    },
  });

  const handleSave = () => {
    if (title && date && time) {
      // TODO: Get participants from team members API
      const participants: Speaker[] = selectedMembers.map((id) => ({
        id,
        name: `Member ${id}`,
        role: 'Member',
        avatar: `https://ui-avatars.com/api/?name=${id}&background=random`,
      }));

      scheduleMutation.mutate({
        title,
        date,
        time,
        duration,
        participants,
      });
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const getMeetingsForDay = (day: number) => {
    return meetings.filter((m) => {
      const d = new Date(m.date);
      return (
        d.getDate() === day &&
        d.getMonth() === currentMonth.getMonth() &&
        d.getFullYear() === currentMonth.getFullYear()
      );
    });
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const isToday = (day: number | null) => {
    if (day === null) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  const monthYearString = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Mock team members - TODO: Get from API
  const MOCK_TEAM: Speaker[] = [
    { id: '1', name: 'Christina Lau', role: 'Product Lead', avatar: 'https://picsum.photos/id/1012/200/200' },
    { id: '2', name: 'Sarah Ye', role: 'CEO', avatar: 'https://picsum.photos/id/1025/200/200' },
    { id: '3', name: 'James Zhu', role: 'PM', avatar: 'https://picsum.photos/id/1011/200/200' },
  ];

  return (
    <div className="flex-1 p-8 bg-slate-50 flex flex-col h-full overflow-hidden relative">
      <header className="mb-6 flex justify-between items-center flex-shrink-0">
        <h1 className="text-2xl font-bold text-slate-900">日程 Calendar</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-slate-50 rounded text-slate-500"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-4 font-semibold text-slate-700">{monthYearString}</span>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-slate-50 rounded text-slate-500"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            <Plus size={18} />
            Schedule
          </button>
        </div>
      </header>

      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
        {/* Weekday Header */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr">
          {getDaysInMonth().map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="border-r border-b border-slate-100"></div>;
            }

            const dayMeetings = getMeetingsForDay(day);
            const today = isToday(day);

            return (
              <div
                key={day}
                className={`border-r border-b border-slate-100 p-2 min-h-[100px] relative hover:bg-slate-50 transition-colors ${
                  idx % 7 === 6 ? 'border-r-0' : ''
                }`}
              >
                <span
                  className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${
                    today ? 'bg-primary-600 text-white shadow-md' : 'text-slate-700'
                  }`}
                >
                  {day}
                </span>

                <div className="space-y-1 mt-1">
                  {dayMeetings.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => navigate(`/meetings/${m.id}`)}
                      className={`px-2 py-1 rounded text-xs font-medium border truncate cursor-pointer transition-all shadow-sm ${
                        m.status === 'scheduled'
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-primary-50 text-primary-700 border-primary-100 hover:bg-primary-100 hover:border-primary-200'
                      }`}
                    >
                      {new Date(m.date).getHours()}:{new Date(m.date).getMinutes().toString().padStart(2, '0')}{' '}
                      {m.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">Schedule Meeting</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Title Input */}
              <div>
                <input
                  type="text"
                  placeholder="Add title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-2xl font-semibold text-slate-900 placeholder:text-slate-400 border-b-2 border-slate-200 focus:border-primary-500 outline-none pb-2 transition-colors"
                  autoFocus
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <CalendarIcon size={18} />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                  />
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Clock size={18} />
                  <div className="flex gap-2 w-full">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    />
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                    >
                      <option value="15 mins">15m</option>
                      <option value="30 mins">30m</option>
                      <option value="45 mins">45m</option>
                      <option value="60 mins">1h</option>
                      <option value="90 mins">1.5h</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div>
                <div className="flex items-center gap-3 text-slate-600 mb-3">
                  <Users size={18} />
                  <span className="text-sm font-medium">Participants</span>
                </div>
                <div className="pl-8 space-y-2 max-h-32 overflow-y-auto">
                  {MOCK_TEAM.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 hover:bg-slate-50 p-2 rounded-lg cursor-pointer"
                      onClick={() => toggleMember(member.id)}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          selectedMembers.includes(member.id)
                            ? 'bg-primary-600 border-primary-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {selectedMembers.includes(member.id) && <Check size={12} className="text-white" />}
                      </div>
                      <img src={member.avatar} className="w-6 h-6 rounded-full" alt={member.name} />
                      <span className="text-sm text-slate-700">{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description Placeholder */}
              <div className="flex gap-3">
                <AlignLeft size={18} className="text-slate-400 mt-1" />
                <textarea
                  placeholder="Add description..."
                  className="w-full h-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!title || scheduleMutation.isPending}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {scheduleMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
