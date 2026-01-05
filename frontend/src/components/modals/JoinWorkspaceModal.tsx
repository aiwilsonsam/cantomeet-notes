import { useState } from 'react';
import { X, Building, ArrowRight, Hash } from 'lucide-react';

interface JoinWorkspaceModalProps {
  onClose: () => void;
  onJoin: (inviteCode: string) => void;
  error?: string | null;
}

export const JoinWorkspaceModal = ({ onClose, onJoin, error }: JoinWorkspaceModalProps) => {
  const [inviteCode, setInviteCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode) {
      onJoin(inviteCode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-900 text-lg">Join Workspace</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-primary-50 p-4 rounded-lg flex gap-3 items-start mb-2">
            <div className="p-2 bg-white rounded-lg shadow-sm text-primary-600">
              <Building size={20} />
            </div>
            <div>
              <h4 className="font-bold text-primary-900 text-sm">Have an invite code?</h4>
              <p className="text-xs text-primary-700 mt-1">
                Enter the code shared by your admin to join an existing team.
                <br />
                <span className="opacity-75 italic">(Try: ws_global_fin)</span>
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Invitation Code
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. ws_8d9a7..."
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono text-sm ${
                  error ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}
                autoFocus
                required
              />
            </div>
            {error && <p className="text-xs text-red-500 mt-2 font-medium">{error}</p>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!inviteCode}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
            >
              Join Workspace
              <ArrowRight size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

