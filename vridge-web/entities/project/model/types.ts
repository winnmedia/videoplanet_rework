export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'archived' | 'completed';
  ownerId: string;
  members: ProjectMember[];
  videos: string[];
  tags: string[];
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
}

export interface ProjectSettings {
  isPublic: boolean;
  allowComments: boolean;
  allowDownload: boolean;
  requireApproval: boolean;
  watermarkEnabled: boolean;
  expirationDate?: string;
}

export interface CreateProjectDto {
  title: string;
  description?: string;
  tags?: string[];
  settings?: Partial<ProjectSettings>;
  autoSchedule?: {
    planning: { duration: number }
    shooting: { duration: number }
    editing: { duration: number }
  }
}

export interface UpdateProjectDto {
  title?: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived' | 'completed';
  tags?: string[];
  settings?: Partial<ProjectSettings>;
}

export interface InviteProjectMemberDto {
  email: string;
  role: 'editor' | 'viewer';
  message?: string;
}

// Auto-scheduling types
export interface AutoScheduleResult {
  planning: {
    startDate: Date
    endDate: Date
    duration: number
    unit: 'days' | 'weeks'
  }
  filming: {
    startDate: Date
    endDate: Date  
    duration: number
    unit: 'days'
  }
  editing: {
    startDate: Date
    endDate: Date
    duration: number
    unit: 'days' | 'weeks'  
  }
  totalDays: number
}