export interface Integration {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  lastSynced?: string;
  configFields?: { key: string; label: string; type: 'text' | 'password'; value: string }[];
}

export interface MeetingTemplate {
  id: string;
  name: string;
  description: string;
  structure: string[];
  type: 'standard' | 'digest' | 'crm'; // New field for template type
}

