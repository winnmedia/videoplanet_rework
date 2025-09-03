/**
 * Dashboard 전용 DTO → View Model 변환 레이어
 * @author Data Lead Daniel
 * @since 2025-09-03
 * 
 * 변환 원칙:
 * 1. 백엔드 DTO를 UI 친화적 View Model로 변환
 * 2. 날짜 포맷팅, 상태 변환, 국제화 준비
 * 3. 계산된 필드 자동 생성 (진행률, 완료율 등)
 * 4. 타입 안전성 보장 및 null 안전성 처리
 */

import { 
  DashboardData, 
  ProjectSummary, 
  ActivityItem, 
  ProjectStatus,
  Priority,
  ActivityType 
} from '../api/schemas/dashboard';

// =============================================================================
// View Model 타입 정의 (View Model Type Definitions)
// =============================================================================

/**
 * UI용 프로젝트 카드 View Model
 */
export interface ProjectCardViewModel {
  id: string;
  title: string;
  status: {
    key: ProjectStatus;
    label: string;
    color: string; // Tailwind 색상 클래스
    bgColor: string;
  };
  progress: {
    percentage: number;
    label: string; // "75% 완료"
    color: string; // 진행률에 따른 색상
  };
  priority: {
    key: Priority;
    label: string;
    color: string;
    icon: string; // 우선순위 아이콘
  };
  timeline: {
    created: string; // "2024년 8월 15일"
    updated: string; // "3시간 전"
    deadline?: string; // "5일 남음" | "2일 지연"
    isOverdue: boolean;
  };
  team: {
    memberCount: number;
    label: string; // "팀 5명"
  };
  metrics: {
    videoCount: number;
    feedbackCount: number;
    completionRate: number; // 계산된 필드
  };
}

/**
 * UI용 통계 카드 View Model
 */
export interface StatCardViewModel {
  key: string;
  title: string;
  value: string; // 포맷된 숫자 문자열
  rawValue: number;
  icon: string; // 아이콘 키 (이모지 대신)
  color: string; // 카드 강조 색상
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    label: string; // "전주 대비 15% 증가"
  };
}

/**
 * UI용 활동 아이템 View Model
 */
export interface ActivityItemViewModel {
  id: string;
  type: {
    key: ActivityType;
    label: string;
    icon: string;
    color: string;
  };
  title: string;
  description?: string;
  project?: {
    id: string;
    title: string;
  };
  timestamp: {
    absolute: string; // "2024년 8월 15일 14:30"
    relative: string; // "3시간 전"
    iso: string; // ISO 문자열 (정렬용)
  };
  createdBy: string; // 마스킹된 사용자명
}

/**
 * 전체 Dashboard View Model
 */
export interface DashboardViewModel {
  stats: StatCardViewModel[];
  notifications: {
    totalCount: number;
    unreadCount: number;
    hasUnread: boolean;
    breakdown: {
      feedback: number;
      schedule: number;
      mention: number;
    };
  };
  recentProjects: ProjectCardViewModel[];
  recentActivities: ActivityItemViewModel[];
  quickActions: Array<{
    id: string;
    title: string;
    icon: string;
    route: string;
    enabled: boolean;
  }>;
  meta: {
    lastUpdated: string;
    timezone: string;
    isStale: boolean; // 캐시 만료 여부
  };
}

// =============================================================================
// 상태/우선순위 매핑 테이블 (Status/Priority Mapping Tables)
// =============================================================================

const PROJECT_STATUS_MAP: Record<ProjectStatus, { label: string; color: string; bgColor: string }> = {
  planning: { label: '기획', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  in_progress: { label: '진행중', color: 'text-green-600', bgColor: 'bg-green-50' },
  review: { label: '검토', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  completed: { label: '완료', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  cancelled: { label: '취소', color: 'text-red-600', bgColor: 'bg-red-50' }
};

const PRIORITY_MAP: Record<Priority, { label: string; color: string; icon: string }> = {
  low: { label: '낮음', color: 'text-green-500', icon: 'arrow-down' },
  medium: { label: '보통', color: 'text-yellow-500', icon: 'minus' },
  high: { label: '높음', color: 'text-orange-500', icon: 'arrow-up' },
  urgent: { label: '긴급', color: 'text-red-500', icon: 'exclamation' }
};

const ACTIVITY_TYPE_MAP: Record<ActivityType, { label: string; icon: string; color: string }> = {
  project_created: { label: '프로젝트 생성', icon: 'folder-plus', color: 'text-blue-500' },
  project_updated: { label: '프로젝트 수정', icon: 'edit', color: 'text-green-500' },
  feedback_received: { label: '피드백 수신', icon: 'message-circle', color: 'text-purple-500' },
  video_uploaded: { label: '영상 업로드', icon: 'video', color: 'text-red-500' },
  schedule_created: { label: '일정 생성', icon: 'calendar', color: 'text-indigo-500' },
  team_member_added: { label: '팀 멤버 추가', icon: 'user-plus', color: 'text-orange-500' }
};

// =============================================================================
// 유틸리티 함수 (Utility Functions)
// =============================================================================

/**
 * 날짜 포맷팅 유틸리티
 */
function formatDate(isoString: string): { absolute: string; relative: string; iso: string } {
  const date = new Date(isoString);
  const now = new Date();
  
  return {
    absolute: date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    relative: getRelativeTime(date, now),
    iso: isoString
  };
}

/**
 * 상대 시간 계산
 */
function getRelativeTime(date: Date, now: Date): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

/**
 * 마감일 처리 유틸리티
 */
function processDeadline(deadline?: string): { label?: string; isOverdue: boolean } {
  if (!deadline) return { isOverdue: false };
  
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { 
      label: `${Math.abs(diffDays)}일 지연`, 
      isOverdue: true 
    };
  } else if (diffDays === 0) {
    return { 
      label: '오늘 마감', 
      isOverdue: false 
    };
  } else {
    return { 
      label: `${diffDays}일 남음`, 
      isOverdue: false 
    };
  }
}

/**
 * 진행률 색상 계산
 */
function getProgressColor(percentage: number): string {
  if (percentage < 30) return 'text-red-500';
  if (percentage < 70) return 'text-yellow-500';
  return 'text-green-500';
}

/**
 * 숫자 포맷팅 (한국어)
 */
function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

// =============================================================================
// 주요 변환 함수들 (Main Transformation Functions)
// =============================================================================

/**
 * 프로젝트 요약 → 프로젝트 카드 View Model 변환
 */
export function transformProjectToViewModel(project: ProjectSummary): ProjectCardViewModel {
  const statusInfo = PROJECT_STATUS_MAP[project.status];
  const priorityInfo = PRIORITY_MAP[project.priority];
  const deadlineInfo = processDeadline(project.deadline);
  
  // 완료율 계산 (비즈니스 로직)
  const completionRate = project.video_count > 0 
    ? Math.round((project.progress / 100) * 100) 
    : 0;
  
  return {
    id: project.id,
    title: project.title,
    status: {
      key: project.status,
      label: statusInfo.label,
      color: statusInfo.color,
      bgColor: statusInfo.bgColor
    },
    progress: {
      percentage: project.progress,
      label: `${project.progress}% 완료`,
      color: getProgressColor(project.progress)
    },
    priority: {
      key: project.priority,
      label: priorityInfo.label,
      color: priorityInfo.color,
      icon: priorityInfo.icon
    },
    timeline: {
      created: formatDate(project.created_at).absolute,
      updated: formatDate(project.updated_at).relative,
      deadline: deadlineInfo.label,
      isOverdue: deadlineInfo.isOverdue
    },
    team: {
      memberCount: project.team_member_count,
      label: `팀 ${project.team_member_count}명`
    },
    metrics: {
      videoCount: project.video_count,
      feedbackCount: project.feedback_count,
      completionRate
    }
  };
}

/**
 * 활동 아이템 → 활동 View Model 변환
 */
export function transformActivityToViewModel(activity: ActivityItem): ActivityItemViewModel {
  const typeInfo = ACTIVITY_TYPE_MAP[activity.type];
  
  return {
    id: activity.id,
    type: {
      key: activity.type,
      label: typeInfo.label,
      icon: typeInfo.icon,
      color: typeInfo.color
    },
    title: activity.title,
    description: activity.description,
    project: activity.project_id && activity.project_title ? {
      id: activity.project_id,
      title: activity.project_title
    } : undefined,
    timestamp: formatDate(activity.created_at),
    createdBy: activity.created_by
  };
}

/**
 * 통계 데이터 → 통계 카드 View Model 변환
 */
export function transformStatsToViewModel(stats: DashboardData['stats']): StatCardViewModel[] {
  return [
    {
      key: 'active_projects',
      title: '진행 중인 프로젝트',
      value: formatNumber(stats.active_projects),
      rawValue: stats.active_projects,
      icon: 'folder',
      color: 'text-blue-600'
    },
    {
      key: 'new_feedback', 
      title: '새 피드백',
      value: formatNumber(stats.new_feedback),
      rawValue: stats.new_feedback,
      icon: 'message-circle',
      color: 'text-purple-600'
    },
    {
      key: 'today_schedule',
      title: '오늘 일정',
      value: formatNumber(stats.today_schedule),
      rawValue: stats.today_schedule,
      icon: 'calendar',
      color: 'text-green-600'
    },
    {
      key: 'completed_videos',
      title: '완료된 영상',
      value: formatNumber(stats.completed_videos),
      rawValue: stats.completed_videos,
      icon: 'video',
      color: 'text-red-600'
    }
  ];
}

// =============================================================================
// 메인 변환 함수 (Main Transform Function)
// =============================================================================

/**
 * Dashboard 데이터 → Dashboard View Model 변환
 * 메인 변환 진입점
 */
export function transformDashboardToViewModel(data: DashboardData): DashboardViewModel {
  // 캐시 만료 여부 계산
  const cacheExpiresAt = new Date(data.meta.cache_expires_at);
  const now = new Date();
  const isStale = now > cacheExpiresAt;
  
  return {
    stats: transformStatsToViewModel(data.stats),
    notifications: {
      totalCount: data.notifications.total_count,
      unreadCount: data.notifications.unread_count,
      hasUnread: data.notifications.unread_count > 0,
      breakdown: {
        feedback: data.notifications.feedback_count,
        schedule: data.notifications.schedule_count,
        mention: data.notifications.mention_count
      }
    },
    recentProjects: data.recent_projects.map(transformProjectToViewModel),
    recentActivities: data.recent_activities.map(transformActivityToViewModel),
    quickActions: data.quick_actions,
    meta: {
      lastUpdated: formatDate(data.meta.last_updated).relative,
      timezone: data.meta.user_timezone,
      isStale
    }
  };
}

// =============================================================================
// 캐시 최적화 도우미 (Cache Optimization Helpers)  
// =============================================================================

/**
 * View Model 메모이제이션을 위한 키 생성
 */
export function generateViewModelCacheKey(data: DashboardData): string {
  return `dashboard-vm-${data.meta.last_updated}`;
}

/**
 * View Model 변환 결과 검증
 */
export function validateViewModel(viewModel: DashboardViewModel): boolean {
  try {
    // 기본적인 구조 검증
    if (!viewModel.stats || !Array.isArray(viewModel.stats)) return false;
    if (!viewModel.recentProjects || !Array.isArray(viewModel.recentProjects)) return false;
    if (!viewModel.recentActivities || !Array.isArray(viewModel.recentActivities)) return false;
    
    // 데이터 일관성 검증
    if (viewModel.notifications.unreadCount > viewModel.notifications.totalCount) return false;
    
    return true;
  } catch {
    return false;
  }
}