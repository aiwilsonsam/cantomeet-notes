export interface Project {
  id: string;
  workspaceId: string; // Tenant ID
  name: string;
  status: 'planning' | 'active' | 'completed';
  dueDate: string;
  members: string[]; // references Speaker IDs
  progress: number;
}

