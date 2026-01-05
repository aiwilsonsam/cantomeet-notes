export interface Speaker {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  timestamp: string;
  text: string; // The Cantonese + English raw text
  sentiment?: 'neutral' | 'positive' | 'negative' | 'concerned';
}

export interface ActionItem {
  id: string;
  description: string;
  owner: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority?: 'high' | 'medium' | 'low';
  relatedSegmentId: string; // For linking back to transcript
  reminder?: string;
}

export interface KeyDecision {
  id: string;
  description: string;
  relatedSegmentId: string;
}

export interface MeetingSummary {
  executiveSummary?: string;
  detailedMinutes?: string; // Detailed structured meeting minutes in Markdown format
  decisions?: KeyDecision[];
  actionItems?: ActionItem[];
}

export interface Meeting {
  id: string;
  workspaceId: string; // Tenant ID
  title: string;
  date: string;
  duration: string;
  participants?: Speaker[];
  tags?: string[];
  transcript?: TranscriptSegment[];
  summary?: MeetingSummary;
  hubSpotSynced?: boolean;
  status: 'uploaded' | 'transcribing' | 'summarizing' | 'completed' | 'failed' | 'scheduled';
  template?: string; // e.g., 'Product Review', 'Sales', 'General'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  suggestedAction?: ActionItem;
}

