// 스토리 도메인 타입 정의
export interface StoryProject {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Act {
  id: string;
  title: string;
  description: string;
  duration: number; // 분 단위
  order: number;
}

export interface Shot {
  id: string;
  actId: string;
  title: string;
  description: string;
  duration: number; // 초 단위
  cameraAngle?: string;
  dialogue?: string;
  action?: string;
  order: number;
}

export interface FourActStructure {
  projectId: string;
  acts: [Act, Act, Act, Act]; // 정확히 4개의 막
  totalDuration: number;
  createdAt: Date;
}

export interface TwelveShotPlan {
  projectId: string;
  actId: string;
  shots: Shot[];
  totalDuration: number;
  createdAt: Date;
}

export interface StoryQualityMetrics {
  consistency: number; // 0-100
  characterDevelopment: number; // 0-100
  narrativeFlow: number; // 0-100
  overallScore: number; // 0-100
}

export interface StoryGenerationRequest {
  projectId: string;
  briefing: string;
  genre?: string;
  targetDuration?: number; // 분 단위
  targetAudience?: string;
}

export interface StoryGenerationResult {
  fourActStructure: FourActStructure;
  qualityMetrics: StoryQualityMetrics;
  suggestions: string[];
}