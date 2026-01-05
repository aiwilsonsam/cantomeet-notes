import { useState } from 'react';
import { CurrentUser } from '@/types';
import { X, User, CreditCard, Check, Zap } from 'lucide-react';

interface UserProfileModalProps {
  user: CurrentUser;
  onClose: () => void;
  onUpdateUser: (updatedUser: Partial<CurrentUser>) => void;
}

export const UserProfileModal = ({ user, onClose, onUpdateUser }: UserProfileModalProps) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('billing');
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);

  const handleProfileSave = () => {
    onUpdateUser({ name, email });
    // In a real app, this would show a toast
  };

  const handleUpgrade = () => {
    onUpdateUser({
      plan: 'Pro',
      quota: { ...user.quota, limit: 1000 },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="font-bold text-slate-900 text-lg">Account Settings</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <User size={16} /> Profile
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'billing'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard size={16} /> Subscription & Billing
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto bg-slate-50 flex-1">
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-md">
              <div className="flex items-center gap-4 mb-6">
                <img src={user.avatar} className="w-20 h-20 rounded-full border-4 border-white shadow-sm" />
                <div>
                  <button className="text-sm text-primary-600 font-medium hover:underline">Change Avatar</button>
                  <p className="text-xs text-slate-400 mt-1">JPG, GIF or PNG. Max size of 800K</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                />
              </div>

              <div className="pt-4">
                <button
                  onClick={handleProfileSave}
                  className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-8">
              {/* Current Usage Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h4 className="font-bold text-slate-800 mb-1">Current Usage</h4>
                <p className="text-sm text-slate-500 mb-4">Your plan renews on {user.quota.renewalDate}</p>

                <div className="mb-2 flex justify-between text-sm font-medium">
                  <span className="text-slate-700">Audio Transcription</span>
                  <span className="text-slate-900">
                    {user.quota.used} / {user.quota.limit} minutes
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 mb-6">
                  <div
                    className={`h-full rounded-full ${
                      user.quota.used / user.quota.limit > 0.8 ? 'bg-amber-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${Math.min((user.quota.used / user.quota.limit) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Plans Grid */}
              <div>
                <h4 className="font-bold text-slate-800 mb-4">Available Plans</h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Free Plan */}
                  <div
                    className={`p-5 rounded-xl border-2 ${
                      user.plan === 'Free' ? 'border-slate-300 bg-slate-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-bold text-slate-700">Free</h5>
                      {user.plan === 'Free' && (
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-4">
                      $0 <span className="text-sm text-slate-500 font-normal">/mo</span>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-600 mb-6">
                      <li className="flex gap-2">
                        <Check size={16} className="text-green-500" /> 60 mins/month
                      </li>
                      <li className="flex gap-2">
                        <Check size={16} className="text-green-500" /> Basic Summary
                      </li>
                      <li className="flex gap-2">
                        <Check size={16} className="text-green-500" /> 3 Team Members
                      </li>
                    </ul>
                    <button
                      disabled={user.plan === 'Free'}
                      className="w-full py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-500 disabled:opacity-50"
                    >
                      Selected
                    </button>
                  </div>

                  {/* Pro Plan */}
                  <div
                    className={`p-5 rounded-xl border-2 relative overflow-hidden ${
                      user.plan === 'Pro' ? 'border-primary-500 bg-primary-50' : 'border-primary-200 bg-white'
                    }`}
                  >
                    {user.plan !== 'Pro' && (
                      <div className="absolute top-0 right-0 bg-primary-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                        RECOMMENDED
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-bold text-slate-900 flex items-center gap-1">
                        <Zap size={16} className="text-amber-500 fill-amber-500" /> Pro
                      </h5>
                      {user.plan === 'Pro' && (
                        <span className="text-xs bg-primary-200 text-primary-800 px-2 py-1 rounded font-bold">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-4">
                      $29 <span className="text-sm text-slate-500 font-normal">/mo</span>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-600 mb-6">
                      <li className="flex gap-2">
                        <Check size={16} className="text-primary-600" /> 1,000 mins/month
                      </li>
                      <li className="flex gap-2">
                        <Check size={16} className="text-primary-600" /> Advanced AI Models
                      </li>
                      <li className="flex gap-2">
                        <Check size={16} className="text-primary-600" /> Unlimited Team
                      </li>
                      <li className="flex gap-2">
                        <Check size={16} className="text-primary-600" /> HubSpot Integration
                      </li>
                    </ul>
                    {user.plan === 'Pro' ? (
                      <button
                        disabled
                        className="w-full py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium"
                      >
                        Active Plan
                      </button>
                    ) : (
                      <button
                        onClick={handleUpgrade}
                        className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium shadow-lg shadow-primary-500/30 transition-all"
                      >
                        Upgrade to Pro
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

