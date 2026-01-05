import { createContext, useState, useEffect, ReactNode } from 'react';
import { Workspace } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { workspacesApi } from '@/services/api/workspaces';

interface WorkspaceContextType {
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  switchWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name: string, plan: 'Free' | 'Pro' | 'Enterprise') => Promise<void>;
  joinWorkspace: (inviteCode: string) => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider = ({ children }: WorkspaceProviderProps) => {
  const { user } = useAuth();
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize workspaces from user
  useEffect(() => {
    if (user?.workspaces) {
      setWorkspaces(user.workspaces);
      // Set active workspace from user's workspaceId or first workspace
      const active = user.workspaces.find((w) => w.id === user.workspaceId) || user.workspaces[0];
      setActiveWorkspace(active || null);
      setIsLoading(false);
    } else {
      // No user or no workspaces
      setWorkspaces([]);
      setActiveWorkspace(null);
      setIsLoading(false);
    }
  }, [user]);

  const switchWorkspace = async (id: string) => {
    try {
      await workspacesApi.switch(id);
      const workspace = workspaces.find((w) => w.id === id);
      if (workspace) {
        setActiveWorkspace(workspace);
      }
    } catch (error) {
      console.error('Failed to switch workspace:', error);
      throw error;
    }
  };

  const createWorkspace = async (name: string, plan: 'Free' | 'Pro' | 'Enterprise') => {
    try {
      const newWorkspace = await workspacesApi.create({ name, plan });
      setWorkspaces((prev) => [...prev, newWorkspace]);
      setActiveWorkspace(newWorkspace);
    } catch (error) {
      console.error('Failed to create workspace:', error);
      throw error;
    }
  };

  const joinWorkspace = async (inviteCode: string) => {
    try {
      const workspace = await workspacesApi.join({ inviteCode });
      setWorkspaces((prev) => [...prev, workspace]);
      setActiveWorkspace(workspace);
    } catch (error) {
      console.error('Failed to join workspace:', error);
      throw error;
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        workspaces,
        isLoading,
        switchWorkspace,
        createWorkspace,
        joinWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

