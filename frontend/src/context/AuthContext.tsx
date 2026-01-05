import { createContext, useState, useEffect, ReactNode } from 'react';
import { CurrentUser } from '@/types';
import { authApi } from '@/services/api/auth';

interface AuthContextType {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<CurrentUser>) => void;
  refetchUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Development mode: Skip authentication (set to false when backend is ready)
const SKIP_AUTH = false; // Backend auth is ready

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (SKIP_AUTH) {
          setIsLoading(false);
          return;
        }

        const token = localStorage.getItem('auth_token');
        if (token) {
          // Fetch user from backend using token
          try {
            const userData = await authApi.getCurrentUser();
            setUser(userData);
          } catch (error) {
            // Token might be invalid, clear it
            console.error('Failed to fetch user:', error);
            localStorage.removeItem('auth_token');
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      if (SKIP_AUTH) {
        return;
      }

      // Real authentication
      const response = await authApi.login({ email, password });
      // Map backend response to CurrentUser format
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
      setUser(userData);
      localStorage.setItem('auth_token', response.token);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
  };

  const updateUser = (updates: Partial<CurrentUser> | CurrentUser) => {
    // If updates is a complete CurrentUser object, use it directly
    // Otherwise merge with existing user
    if ('id' in updates && 'email' in updates) {
      setUser(updates as CurrentUser);
    } else if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const refetchUser = async () => {
    if (SKIP_AUTH) {
      return;
    }

    try {
      const userData = await authApi.getCurrentUser();
      // Map backend response to CurrentUser format
      const mappedUser: CurrentUser = {
        id: userData.id,
        name: userData.name || userData.email.split('@')[0],
        email: userData.email,
        role: userData.role || 'Member',
        avatar: userData.avatar || '',
        status: userData.status as 'active' | 'invited',
        workspaceId: userData.workspaceId || '',
        accessLevel: (userData.accessLevel || 'member') as 'admin' | 'member' | 'viewer',
        plan: (userData.plan || 'Free') as 'Free' | 'Pro' | 'Enterprise',
        quota: userData.quota || { used: 0, limit: 60, renewalDate: '' },
        workspaces: userData.workspaces || [],
      };
      setUser(mappedUser);
    } catch (error) {
      console.error('Failed to refetch user:', error);
      // If token is invalid, clear it and logout
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        updateUser,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
