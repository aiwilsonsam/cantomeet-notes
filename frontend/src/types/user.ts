import { Speaker } from './meeting';

export interface UserQuota {
  used: number; // in minutes
  limit: number; // in minutes
  renewalDate: string;
}

export interface TeamMember extends Speaker {
  email: string;
  workspaceId: string; // Tenant ID
  status: 'active' | 'invited';
  accessLevel: 'admin' | 'member' | 'viewer';
}

import { Workspace } from './workspace';

export interface CurrentUser extends TeamMember {
  plan: 'Free' | 'Pro' | 'Enterprise';
  quota: UserQuota;
  workspaces: Workspace[]; // List of available workspaces
}

