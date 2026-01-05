import { useState } from 'react';
import { Mail, Shield, MoreVertical, UserPlus, Search, X, Check, User } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamApi } from '@/services/api/team';
import { TeamMember } from '@/types';
import toast from 'react-hot-toast';
import { EmptyState } from '@/components/shared/EmptyState';

export const TeamPage = () => {
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: '',
    accessLevel: 'member' as 'admin' | 'member' | 'viewer',
  });

  const { data: members = [] } = useQuery<TeamMember[]>({
    queryKey: ['team', activeWorkspace?.id],
    queryFn: () => (activeWorkspace ? teamApi.list(activeWorkspace.id) : []),
    enabled: !!activeWorkspace,
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      name: string;
      role: string;
      accessLevel: 'admin' | 'member' | 'viewer';
    }) => {
      if (!activeWorkspace) throw new Error('No active workspace');
      return teamApi.invite(activeWorkspace.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', activeWorkspace?.id] });
      toast.success('Invitation sent successfully!');
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', name: '', role: '', accessLevel: 'member' });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });

  const handleInviteSubmit = () => {
    if (inviteForm.email && inviteForm.name) {
      inviteMutation.mutate(inviteForm);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-slate-50 flex flex-col h-full overflow-hidden p-8 relative">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">團隊 Team</h1>
          <p className="text-slate-500">Manage members and access permissions.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search member..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
            />
          </div>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
          >
            <UserPlus size={18} /> Invite Member
          </button>
        </div>
      </header>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 overflow-y-auto">
        {filteredMembers.length > 0 ? (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Access
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                      />
                      <div>
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail size={12} />
                          <span>{member.email}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Shield
                        size={14}
                        className={member.accessLevel === 'admin' ? 'text-primary-600' : 'text-slate-400'}
                      />
                      <span className="capitalize">{member.accessLevel}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {member.status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Invited
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            icon={Search}
            title="No members found"
            description={searchTerm ? `No members matching "${searchTerm}"` : 'No team members yet'}
          />
        )}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-lg">Invite Team Member</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200/50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="e.g. David Wong"
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Job Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Designer"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Access Level
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'admin', label: 'Admin', desc: 'Full access' },
                    { id: 'member', label: 'Member', desc: 'Can edit' },
                    { id: 'viewer', label: 'Viewer', desc: 'Read only' },
                  ].map((level) => (
                    <div
                      key={level.id}
                      onClick={() =>
                        setInviteForm({ ...inviteForm, accessLevel: level.id as any })
                      }
                      className={`cursor-pointer border rounded-lg p-3 relative transition-all ${
                        inviteForm.accessLevel === level.id
                          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                          : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="font-semibold text-sm text-slate-900">{level.label}</div>
                      <div className="text-xs text-slate-500">{level.desc}</div>
                      {inviteForm.accessLevel === level.id && (
                        <div className="absolute top-2 right-2 text-primary-600">
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteSubmit}
                disabled={!inviteForm.email || !inviteForm.name || inviteMutation.isPending}
                className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Mail size={16} /> {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
