import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Mic, Zap, Globe } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/services/api/auth';
import { CurrentUser } from '@/types';
import toast from 'react-hot-toast';

export const AuthPage = () => {
  const navigate = useNavigate();
  const { login, updateUser } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isLogin) {
        // Login
        await login(email, password);
        toast.success('Welcome back!');
        navigate('/app');
      } else {
        // Register - API returns token and user info
        const response = await authApi.register({ name, email, password });
        // Store token
        localStorage.setItem('auth_token', response.token);
        // Map backend response to CurrentUser format and set user state
        const userData: CurrentUser = {
          id: response.user.id,
          name: response.user.name || email.split('@')[0],
          email: response.user.email,
          role: response.user.role || 'Member',
          avatar: response.user.avatar || '',
          status: response.user.status as 'active' | 'invited',
          workspaceId: response.user.workspaceId || '',
          accessLevel: (response.user.accessLevel || 'member') as 'admin' | 'member' | 'viewer',
          plan: (response.user.plan || 'Free') as 'Free' | 'Pro' | 'Enterprise',
          quota: response.user.quota || { used: 0, limit: 60, renewalDate: '' },
          workspaces: response.user.workspaces || [],
        };
        // Update user context directly
        updateUser(userData);
        toast.success('Account created successfully!');
        navigate('/app');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-white overflow-hidden font-sans">
      {/* Left Panel - Product Showcase */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-600 rounded-full blur-[120px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-[120px] opacity-20 translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary-900/50">
              M
            </div>
            <span className="text-2xl font-bold tracking-tight">CantoMeet Notes</span>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6">
            Unlock the intelligence <br />
            <span className="text-primary-400">hidden in your meetings.</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-lg mb-12 leading-relaxed">
            The AI-powered meeting assistant tailored for the Greater Bay Area business environment.
          </p>

          <div className="space-y-6">
            <FeatureItem
              icon={<Mic className="text-primary-400" />}
              title="Trilingual Mastery"
              desc="Seamlessly processes mixed Cantonese, English, and Mandarin conversations with high accuracy."
            />
            <FeatureItem
              icon={<Zap className="text-primary-400" />}
              title="Instant Actionable Insights"
              desc="Automatically extracts key decisions, action items, and owners from your transcripts."
            />
            <FeatureItem
              icon={<Globe className="text-primary-400" />}
              title="GBA Context Aware"
              desc="Optimized for local business terminologies across finance, tech, and manufacturing sectors."
            />
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500">
          © 2025 CantoMeet Notes. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-slate-500 text-sm">
              {isLogin
                ? 'Enter your details to access your workspace.'
                : 'Start your 14-day free trial. No credit card required.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Christina Lau"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                {isLogin && (
                  <a href="#" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary-900/10 flex items-center justify-center gap-2 transition-all mt-6 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Get Started'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary-600 hover:text-primary-700 font-bold ml-1"
              >
                {isLogin ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeatureItem: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({
  icon,
  title,
  desc,
}) => (
  <div className="flex gap-4">
    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0 border border-slate-700">
      {icon}
    </div>
    <div>
      <h3 className="font-bold text-white text-lg">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed mt-1">{desc}</p>
    </div>
  </div>
);
