export interface Feedback {
  id: string;
  projectId: string;
  videoId: string;
  userId: string;
  content: string;
  timestamp?: number;
  position?: {
    x: number;
    y: number;
  };
  type: 'comment' | 'annotation' | 'approval' | 'rejection';
  status: 'open' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  attachments?: Attachment[];
  replies?: FeedbackReply[];
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackReply {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface CreateFeedbackDto {
  projectId: string;
  videoId: string;
  content: string;
  timestamp?: number;
  position?: {
    x: number;
    y: number;
  };
  type?: 'comment' | 'annotation' | 'approval' | 'rejection';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface UpdateFeedbackDto {
  content?: string;
  status?: 'open' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface CreateReplyDto {
  content: string;
}