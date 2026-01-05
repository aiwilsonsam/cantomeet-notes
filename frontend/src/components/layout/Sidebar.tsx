import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Settings,
  Users,
  FolderKanban,
  PlusCircle,
  Activity,
  MoreHorizontal,
  LogOut,
  CreditCard,
  User,
  ChevronDown,
  Plus,
  Check,
  ArrowRightCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/services/api/tasks';
import { CreateWorkspaceModal } from '@/components/modals/CreateWorkspaceModal';
import { JoinWorkspaceModal } from '@/components/modals/JoinWorkspaceModal';
import { UserProfileModal } from '@/components/modals/UserProfileModal';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { activeWorkspace, workspaces, switchWorkspace, createWorkspace, joinWorkspace } = useWorkspace();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [isJoinWorkspaceModalOpen, setIsJoinWorkspaceModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);

  // Fetch task count for active workspace
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', activeWorkspace?.id],
    queryFn: () => (activeWorkspace ? tasksApi.list(activeWorkspace.id) : []),
    enabled: !!activeWorkspace,
  });

  const taskCount = tasks.filter((t) => t.status === 'processing' || t.status === 'queued').length;

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setIsWorkspaceMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSwitchWorkspace = async (id: string) => {
    try {
      await switchWorkspace(id);
      setIsWorkspaceMenuOpen(false);
      navigate('/app'); // Reset to dashboard on workspace switch
    } catch (error) {
      console.error('Failed to switch workspace:', error);
    }
  };

  const handleCreateWorkspace = async (name: string, plan: 'Free' | 'Pro' | 'Enterprise') => {
    try {
      await createWorkspace(name, plan);
      setIsCreateWorkspaceModalOpen(false);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const handleJoinWorkspace = async (inviteCode: string) => {
    try {
      setJoinError(null);
      await joinWorkspace(inviteCode);
      setIsJoinWorkspaceModalOpen(false);
    } catch (error: any) {
      setJoinError(error.message || 'Invalid invitation code. Workspace not found.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  if (!user || !activeWorkspace) {
    return null;
  }

  const usagePercent = Math.min((user.quota.used / user.quota.limit) * 100, 100);
  const isUsageHigh = usagePercent > 80;

  const workspaceItems = [
    { path: '/app', icon: LayoutDashboard, label: '儀表板 Dashboard' },
    { path: '/app/meetings', icon: FileText, label: '會議記錄 My Meetings' },
    { path: '/app/projects', icon: FolderKanban, label: '項目 Projects' },
    { path: '/app/calendar', icon: Calendar, label: '日程 Calendar' },
    { path: '/app/tasks', icon: Activity, label: '任務中心 Tasks', badge: taskCount },
  ];

  const knowledgeBaseItems = [
    { path: '/app/team', icon: Users, label: '團隊 Team' },
    { path: '/app/settings', icon: Settings, label: '設定 Settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/app') {
      return location.pathname === '/app' || location.pathname === '/app/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 flex-shrink-0 transition-all z-40">
        {/* Workspace Switcher */}
        <div className="p-4 mb-2 relative" ref={workspaceMenuRef}>
          <button
            onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-primary-900/20">
                {activeWorkspace.logo || 'W'}
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-sm tracking-tight leading-none mb-1">
                  {activeWorkspace.name}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  {activeWorkspace.plan} Plan
                </div>
              </div>
            </div>
            <ChevronDown size={14} className="text-slate-500 group-hover:text-slate-300" />
          </button>

          {/* Workspace Dropdown */}
          {isWorkspaceMenuOpen && (
            <div className="absolute top-full left-4 right-4 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-100 z-50">
              <div className="p-1">
                <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Your Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitchWorkspace(ws.id)}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 bg-slate-600 rounded flex items-center justify-center text-[10px] text-white font-bold">
                        {ws.logo}
                      </span>
                      {ws.name}
                    </div>
                    {ws.id === activeWorkspace.id && <Check size={14} className="text-primary-500" />}
                  </button>
                ))}
                <div className="h-px bg-slate-700 my-1"></div>
                <div className="grid grid-cols-1 gap-1">
                  <button
                    onClick={() => {
                      setIsCreateWorkspaceModalOpen(true);
                      setIsWorkspaceMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
                  >
                    <Plus size={14} /> Create New
                  </button>
                  <button
                    onClick={() => {
                      setIsJoinWorkspaceModalOpen(true);
                      setJoinError(null);
                      setIsWorkspaceMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
                  >
                    <ArrowRightCircle size={14} /> Join Existing
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Primary Action */}
        <div className="px-4 mb-6">
          <Link
            to="/app/upload"
            className="w-full bg-primary-600 hover:bg-primary-500 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-all shadow-lg shadow-primary-900/20"
          >
            <PlusCircle size={18} />
            <span>New Upload</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">
            Workspace
          </div>

          {workspaceItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <div key={item.path} className="relative">
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
                    active
                      ? 'bg-primary-600/10 text-primary-500 font-medium'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border border-slate-900">
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 mt-8 px-2">
            Knowledge Base
          </div>

          {knowledgeBaseItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <div key={item.path} className="relative">
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
                    active
                      ? 'bg-primary-600/10 text-primary-500 font-medium'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Quota Widget & User Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          {/* Usage Bar */}
          <div className="mb-4 bg-slate-800 rounded-lg p-3 border border-slate-700">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs font-medium text-slate-400">Monthly Usage</span>
              <span className={`text-xs font-bold ${isUsageHigh ? 'text-amber-500' : 'text-slate-300'}`}>
                {user.quota.used} / {user.quota.limit} mins
              </span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isUsageHigh ? 'bg-amber-500' : 'bg-primary-500'
                }`}
                style={{ width: `${usagePercent}%` }}
              ></div>
            </div>
            {isUsageHigh && (
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="text-[10px] text-primary-400 hover:text-primary-300 mt-2 font-medium w-full text-left"
              >
                Upgrade for more quota →
              </button>
            )}
          </div>

          {/* User Menu Trigger */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-slate-800 transition-colors group text-left"
            >
              <img src={user.avatar} alt="User" className="w-8 h-8 rounded-full border border-slate-600" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">{user.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1">{user.plan} Plan</div>
              </div>
              <MoreHorizontal size={16} className="text-slate-500 group-hover:text-slate-300" />
            </button>

            {/* Popover Menu */}
            {isUserMenuOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-100 z-50">
                <div className="p-1">
                  <button
                    onClick={() => {
                      setIsProfileModalOpen(true);
                      setIsUserMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
                  >
                    <User size={14} /> Profile
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileModalOpen(true);
                      setIsUserMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-lg transition-colors"
                  >
                    <CreditCard size={14} /> Billing & Plans
                  </button>
                  <div className="h-px bg-slate-700 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 rounded-lg transition-colors"
                  >
                    <LogOut size={14} /> Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isCreateWorkspaceModalOpen && (
        <CreateWorkspaceModal
          onClose={() => setIsCreateWorkspaceModalOpen(false)}
          onCreate={handleCreateWorkspace}
        />
      )}

      {isJoinWorkspaceModalOpen && (
        <JoinWorkspaceModal
          onClose={() => {
            setIsJoinWorkspaceModalOpen(false);
            setJoinError(null);
          }}
          onJoin={handleJoinWorkspace}
          error={joinError}
        />
      )}

      {isProfileModalOpen && (
        <UserProfileModal
          user={user}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdateUser={updateUser}
        />
      )}
    </>
  );
};
