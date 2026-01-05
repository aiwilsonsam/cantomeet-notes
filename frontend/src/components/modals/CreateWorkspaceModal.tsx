import { useState } from 'react';
import { X, Building2, Briefcase } from 'lucide-react';

interface CreateWorkspaceModalProps {
  onClose: () => void;
  onCreate: (name: string, plan: 'Free' | 'Pro' | 'Enterprise') => void;
}

export const CreateWorkspaceModal = ({ onClose, onCreate }: CreateWorkspaceModalProps) => {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<'Free' | 'Pro' | 'Enterprise'>('Free');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      onCreate(name, plan);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-900 text-lg">Create New Workspace</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Workspace Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Starting Plan
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setPlan('Free')}
                className={`p-3 border rounded-lg cursor-pointer ${
                  plan === 'Free'
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                    : 'border-slate-200 hover:border-primary-300'
                }`}
              >
                <div className="font-bold text-slate-800 text-sm">Free Team</div>
                <div className="text-xs text-slate-500">For small teams</div>
              </div>
              <div
                onClick={() => setPlan('Pro')}
                className={`p-3 border rounded-lg cursor-pointer ${
                  plan === 'Pro'
                    ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                    : 'border-slate-200 hover:border-primary-300'
                }`}
              >
                <div className="font-bold text-slate-800 text-sm">Pro Team</div>
                <div className="text-xs text-slate-500">For growing businesses</div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!name}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl font-medium shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Briefcase size={18} />
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

