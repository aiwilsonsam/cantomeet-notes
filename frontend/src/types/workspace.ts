export interface Workspace {
  id: string;
  name: string;
  logo: string; // Initials or URL
  plan: 'Free' | 'Pro' | 'Enterprise';
  role: 'admin' | 'member'; // User's role in this workspace
}

