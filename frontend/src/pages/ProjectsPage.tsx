import { useState } from 'react';
import { Plus, MoreHorizontal, Calendar, X, Briefcase, Check } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/services/api/projects';
import { Project, Speaker } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

// Mock team members - TODO: Get from API
const MOCK_TEAM: Speaker[] = [
  { id: '1', name: 'Christina Lau', role: 'Product Lead', avatar: 'https://picsum.photos/id/1012/200/200' },
  { id: '2', name: 'Sarah Ye', role: 'CEO', avatar: 'https://picsum.photos/id/1025/200/200' },
  { id: '3', name: 'James Zhu', role: 'PM', avatar: 'https://picsum.photos/id/1011/200/200' },
];

const StatusColumn = ({
  title,
  status,
  color,
  projects,
  onProjectClick,
  onCreateClick,
}: {
  title: string;
  status: Project['status'];
  color: string;
  projects: Project[];
  onProjectClick: (id: string) => void;
  onCreateClick: (status: Project['status']) => void;
}) => {
  const filteredProjects = projects.filter((p) => p.status === status);

  const getMembers = (ids: string[]) => MOCK_TEAM.filter((m) => ids.includes(m.id));

  return (
    <div className="flex-1 min-w-[300px] flex flex-col">
      <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${color}`}>
        <h3 className="font-bold text-slate-700">{title}</h3>
        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">
          {filteredProjects.length}
        </span>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-2 pb-20">
        {filteredProjects.map((project) => (
          <div
            key={project.id}
            onClick={() => onProjectClick(project.id)}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {project.id.toUpperCase()}
              </span>
              <button className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity">
                <MoreHorizontal size={16} />
              </button>
            </div>
            <h4 className="font-bold text-slate-800 mb-3">{project.name}</h4>

            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Progress</span>
                <span className="font-medium text-primary-600">{project.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-primary-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${project.progress}%` }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
              <div className="flex -space-x-2">
                {getMembers(project.members).map((m) => (
                  <img
                    key={m.id}
                    src={m.avatar}
                    title={m.name}
                    className="w-6 h-6 rounded-full border-2 border-white"
                    alt={m.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
                <Calendar size={12} />
                <span>{new Date(project.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => onCreateClick(status)}
          className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium hover:border-slate-300 hover:text-slate-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={16} /> New Project
        </button>
      </div>
    </div>
  );
};

export const ProjectsPage = () => {
  const { activeWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    status: 'planning' as Project['status'],
    dueDate: '',
    members: [] as string[],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects', activeWorkspace?.id],
    queryFn: () => (activeWorkspace ? projectsApi.list(activeWorkspace.id) : []),
    enabled: !!activeWorkspace,
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      status: Project['status'];
      dueDate: string;
      members: string[];
    }) => {
      if (!activeWorkspace) throw new Error('No active workspace');
      return projectsApi.create({
        workspaceId: activeWorkspace.id,
        name: data.name,
        status: data.status,
        dueDate: data.dueDate,
        members: data.members.length > 0 ? data.members : [user?.id || ''],
        progress: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', activeWorkspace?.id] });
      toast.success('Project created successfully!');
      setIsModalOpen(false);
      setNewProject({ name: '', status: 'planning', dueDate: '', members: [] });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create project');
    },
  });

  const handleCreateProject = () => {
    if (newProject.name && newProject.dueDate) {
      createMutation.mutate(newProject);
    }
  };

  const toggleMember = (id: string) => {
    setNewProject((prev) => ({
      ...prev,
      members: prev.members.includes(id)
        ? prev.members.filter((m) => m !== id)
        : [...prev.members, id],
    }));
  };

  const handleProjectClick = (id: string) => {
    // TODO: Navigate to project detail page
    // console.log('Project clicked:', id);
  };

  const handleCreateClick = (status: Project['status']) => {
    setNewProject((prev) => ({ ...prev, status }));
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden p-8 relative">
      <header className="mb-8 flex justify-between items-center flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">項目 Projects</h1>
          <p className="text-slate-500">Track initiatives across the Greater Bay Area.</p>
        </div>
        <button
          onClick={() => {
            setNewProject({ name: '', status: 'planning', dueDate: '', members: [] });
            setIsModalOpen(true);
          }}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} /> Create Project
        </button>
      </header>

      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-6 h-full pb-4">
          <StatusColumn
            title="Planning"
            status="planning"
            color="border-slate-300"
            projects={projects}
            onProjectClick={handleProjectClick}
            onCreateClick={handleCreateClick}
          />
          <StatusColumn
            title="In Progress"
            status="active"
            color="border-primary-500"
            projects={projects}
            onProjectClick={handleProjectClick}
            onCreateClick={handleCreateClick}
          />
          <StatusColumn
            title="Completed"
            status="completed"
            color="border-green-500"
            projects={projects}
            onProjectClick={handleProjectClick}
            onCreateClick={handleCreateClick}
          />
        </div>
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 text-lg">Create New Project</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Project Name
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="e.g. Series C Fundraising"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <select
                    value={newProject.status}
                    onChange={(e) =>
                      setNewProject({ ...newProject, status: e.target.value as Project['status'] })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Due Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400" size={18} />
                    <input
                      type="date"
                      value={newProject.dueDate}
                      onChange={(e) => setNewProject({ ...newProject, dueDate: e.target.value })}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Team Members
                </label>
                <div className="border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                  {MOCK_TEAM.map((member) => (
                    <div
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0 ${
                        newProject.members.includes(member.id) ? 'bg-primary-50' : ''
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          newProject.members.includes(member.id)
                            ? 'bg-primary-600 border-primary-600'
                            : 'border-slate-300'
                        }`}
                      >
                        {newProject.members.includes(member.id) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <img src={member.avatar} className="w-8 h-8 rounded-full" alt={member.name} />
                      <span className="text-sm font-medium text-slate-700">{member.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                disabled={!newProject.name || !newProject.dueDate || createMutation.isPending}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
