/**
 * Dashboard MSW 모킹 핸들러
 * @author Data Lead Daniel
 * @since 2025-09-03
 * 
 * 모킹 원칙:
 * 1. 현실적인 데이터 시뮬레이션 (시간대별 변화 포함)
 * 2. 에러 시나리오 모킹 (네트워크 오류, 서버 오류 등)
 * 3. 스키마 계약 준수 및 런타임 검증
 * 4. 개발자 디버깅을 위한 로깅 제공
 */

import { http, HttpResponse, delay } from 'msw';
import { 
  DashboardData, 
  DashboardDataSchema,
  ProjectSummary,
  ActivityItem,
  ProjectStatus,
  Priority,
  ActivityType
} from '../schemas/dashboard';

// =============================================================================
// 모킹 데이터 생성 유틸리티 (Mock Data Generation Utilities)
// =============================================================================

/**
 * 결정론적 UUID 생성 (테스트 환경용)
 */
function generateTestUUID(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit 정수로 변환
  }
  const uuid = Math.abs(hash).toString(16);
  return `${uuid.slice(0, 8)}-${uuid.slice(8, 12)}-${uuid.slice(12, 16)}-${uuid.slice(16, 20)}-${uuid.slice(20, 32)}`.padEnd(36, '0');
}

/**
 * 현실적인 프로젝트 데이터 생성
 */
function generateMockProjects(): ProjectSummary[] {
  const now = new Date();
  const projects: Array<Omit<ProjectSummary, 'created_at' | 'updated_at' | 'deadline'> & {
    created_at: string;
    updated_at: string; 
    deadline?: string;
  }> = [
    {
      id: generateTestUUID('project-1'),
      title: '브랜드 소개 영상 제작',
      status: 'in_progress' as ProjectStatus,
      progress: 75,
      priority: 'high' as Priority,
      created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      team_member_count: 5,
      video_count: 3,
      feedback_count: 12
    },
    {
      id: generateTestUUID('project-2'), 
      title: '제품 데모 영상',
      status: 'review' as ProjectStatus,
      progress: 90,
      priority: 'medium' as Priority,
      created_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      team_member_count: 3,
      video_count: 2,
      feedback_count: 8
    },
    {
      id: generateTestUUID('project-3'),
      title: '고객 인터뷰 영상',
      status: 'planning' as ProjectStatus,
      progress: 25,
      priority: 'low' as Priority,
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      team_member_count: 2,
      video_count: 0,
      feedback_count: 2
    },
    {
      id: generateTestUUID('project-4'),
      title: '회사 홍보 영상',
      status: 'completed' as ProjectStatus,
      progress: 100,
      priority: 'urgent' as Priority,
      created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      team_member_count: 7,
      video_count: 5,
      feedback_count: 25
    },
    {
      id: generateTestUUID('project-5'),
      title: '내부 교육 콘텐츠',
      status: 'in_progress' as ProjectStatus,
      progress: 45,
      priority: 'medium' as Priority,
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      deadline: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      team_member_count: 4,
      video_count: 1,
      feedback_count: 7
    }
  ];
  
  return projects as ProjectSummary[];
}

/**
 * 현실적인 활동 데이터 생성
 */
function generateMockActivities(): ActivityItem[] {
  const now = new Date();
  const activities: Array<Omit<ActivityItem, 'created_at'> & { created_at: string }> = [
    {
      id: generateTestUUID('activity-1'),
      type: 'project_created' as ActivityType,
      title: '새 프로젝트가 생성되었습니다',
      description: '브랜드 소개 영상 제작 프로젝트가 시작되었습니다',
      project_id: generateTestUUID('project-1'),
      project_title: '브랜드 소개 영상 제작',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      created_by: '김**'
    },
    {
      id: generateTestUUID('activity-2'),
      type: 'feedback_received' as ActivityType,
      title: '새로운 피드백이 도착했습니다',
      description: '제품 데모 영상에 대한 검토 의견',
      project_id: generateTestUUID('project-2'),
      project_title: '제품 데모 영상',
      created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      created_by: '이**'
    },
    {
      id: generateTestUUID('activity-3'),
      type: 'video_uploaded' as ActivityType,
      title: '영상이 업로드되었습니다',
      description: '최종 편집 버전 업로드 완료',
      project_id: generateTestUUID('project-4'),
      project_title: '회사 홍보 영상',
      created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      created_by: '박**'
    },
    {
      id: generateTestUUID('activity-4'),
      type: 'schedule_created' as ActivityType,
      title: '새 일정이 추가되었습니다',
      description: '프로젝트 리뷰 미팅 일정',
      project_id: generateTestUUID('project-2'),
      project_title: '제품 데모 영상',
      created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      created_by: '최**'
    },
    {
      id: generateTestUUID('activity-5'),
      type: 'team_member_added' as ActivityType,
      title: '팀 멤버가 추가되었습니다',
      description: '새로운 편집자가 프로젝트에 참여했습니다',
      project_id: generateTestUUID('project-1'),
      project_title: '브랜드 소개 영상 제작',
      created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      created_by: '정**'
    },
    {
      id: generateTestUUID('activity-6'),
      type: 'project_updated' as ActivityType,
      title: '프로젝트가 업데이트되었습니다',
      description: '진행률이 75%로 업데이트됨',
      project_id: generateTestUUID('project-1'),
      project_title: '브랜드 소개 영상 제작',
      created_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      created_by: '홍**'
    }
  ];
  
  return activities as ActivityItem[];
}

/**
 * 시간대별 변화하는 통계 데이터 생성
 */
function generateTimeBasedStats(): DashboardData['stats'] {
  const hour = new Date().getHours();
  
  // 시간대별로 활동량이 다르게 시뮬레이션
  const timeMultiplier = hour >= 9 && hour <= 18 ? 1.2 : 0.8; // 업무시간 가중치
  
  return {
    active_projects: Math.floor(12 * timeMultiplier),
    new_feedback: Math.floor(24 * (0.8 + Math.random() * 0.4)), // 일정한 변동성
    today_schedule: Math.floor(5 * timeMultiplier),
    completed_videos: 48 + Math.floor(Math.random() * 3) // 완료 영상은 천천히 증가
  };
}

/**
 * 빠른 작업 옵션 생성
 */
function generateQuickActions(): DashboardData['quick_actions'] {
  return [
    {
      id: 'create-project',
      title: '새 프로젝트 만들기',
      icon: 'folder-plus',
      route: '/projects/new',
      enabled: true
    },
    {
      id: 'plan-video',
      title: '영상 기획하기', 
      icon: 'video',
      route: '/planning/new',
      enabled: true
    },
    {
      id: 'add-schedule',
      title: '일정 추가하기',
      icon: 'calendar-plus',
      route: '/calendar/new',
      enabled: true
    },
    {
      id: 'invite-member',
      title: '팀 멤버 초대하기',
      icon: 'user-plus',
      route: '/team/invite',
      enabled: true
    }
  ];
}

// =============================================================================
// 모킹 시나리오 관리 (Mock Scenario Management)
// =============================================================================

interface MockScenario {
  name: string;
  description: string;
  modifier: (data: DashboardData) => DashboardData;
}

const mockScenarios: Record<string, MockScenario> = {
  'normal': {
    name: '정상 상태',
    description: '일반적인 대시보드 상태',
    modifier: (data) => data
  },
  'high-activity': {
    name: '높은 활동량',
    description: '많은 프로젝트와 피드백이 활발한 상태',
    modifier: (data) => ({
      ...data,
      stats: {
        ...data.stats,
        active_projects: data.stats.active_projects + 8,
        new_feedback: data.stats.new_feedback + 15
      },
      notifications: {
        ...data.notifications,
        unread_count: data.notifications.total_count
      }
    })
  },
  'low-activity': {
    name: '낮은 활동량',
    description: '프로젝트가 적고 조용한 상태',
    modifier: (data) => ({
      ...data,
      stats: {
        active_projects: Math.max(1, data.stats.active_projects - 5),
        new_feedback: Math.max(0, data.stats.new_feedback - 10),
        today_schedule: Math.max(0, data.stats.today_schedule - 2),
        completed_videos: data.stats.completed_videos
      },
      recent_projects: data.recent_projects.slice(0, 2),
      recent_activities: data.recent_activities.slice(0, 3)
    })
  },
  'overdue-projects': {
    name: '지연된 프로젝트',
    description: '마감일이 지난 프로젝트들이 있는 상태',
    modifier: (data) => ({
      ...data,
      recent_projects: data.recent_projects.map(project => ({
        ...project,
        deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3일 전 마감
      }))
    })
  }
};

// =============================================================================
// MSW 핸들러 정의 (MSW Handlers Definition)
// =============================================================================

export const dashboardHandlers = [
  /**
   * Dashboard 요약 데이터 조회
   * GET /api/dashboard/summary
   */
  http.get('/api/dashboard/summary', async ({ request }) => {
    // 요청 헤더에서 시나리오 확인
    const scenario = request.headers.get('x-mock-scenario') || 'normal';
    
    // 네트워크 지연 시뮬레이션
    const delayMs = parseInt(request.headers.get('x-mock-delay') || '100');
    await delay(delayMs);
    
    // 에러 시나리오 시뮬레이션
    const errorRate = parseFloat(request.headers.get('x-mock-error-rate') || '0');
    if (Math.random() < errorRate) {
      console.warn('[Dashboard MSW] 모킹된 서버 오류 발생');
      return new HttpResponse(null, { status: 500 });
    }
    
    try {
      const now = new Date();
      const cacheExpiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5분 후 만료
      
      // 기본 대시보드 데이터 생성
      let dashboardData: DashboardData = {
        stats: generateTimeBasedStats(),
        notifications: {
          total_count: 45,
          unread_count: 12,
          feedback_count: 8,
          schedule_count: 3,
          mention_count: 1
        },
        recent_projects: generateMockProjects().slice(0, 5), // 최대 5개
        recent_activities: generateMockActivities().slice(0, 10), // 최대 10개
        quick_actions: generateQuickActions(),
        meta: {
          last_updated: now.toISOString(),
          cache_expires_at: cacheExpiresAt.toISOString(),
          user_timezone: 'Asia/Seoul'
        }
      };
      
      // 시나리오 적용
      const scenarioConfig = mockScenarios[scenario];
      if (scenarioConfig) {
        console.log(`[Dashboard MSW] 시나리오 적용: ${scenarioConfig.name}`);
        dashboardData = scenarioConfig.modifier(dashboardData);
      }
      
      // 스키마 검증
      const validatedData = DashboardDataSchema.parse(dashboardData);
      
      // API 응답 형식으로 래핑
      const response = {
        success: true,
        data: validatedData,
        meta: {
          timestamp: now.toISOString(),
          version: '1.0.0'
        }
      };
      
      console.log('[Dashboard MSW] 대시보드 데이터 반환:', {
        scenario,
        projectCount: validatedData.recent_projects.length,
        activityCount: validatedData.recent_activities.length,
        stats: validatedData.stats
      });
      
      return HttpResponse.json(response);
      
    } catch (error) {
      console.error('[Dashboard MSW] 데이터 생성 실패:', error);
      return new HttpResponse(
        JSON.stringify({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: '대시보드 데이터를 불러올 수 없습니다',
            timestamp: new Date().toISOString()
          }
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }),

  /**
   * Dashboard 통계만 조회 (경량 요청)
   * GET /api/dashboard/stats
   */
  http.get('/api/dashboard/stats', async ({ request }) => {
    await delay(50); // 빠른 응답
    
    try {
      const stats = generateTimeBasedStats();
      
      const response = {
        success: true,
        data: { stats },
        meta: {
          timestamp: new Date().toISOString(),
          cached: false
        }
      };
      
      return HttpResponse.json(response);
      
    } catch (error) {
      return new HttpResponse(null, { status: 500 });
    }
  }),

  /**
   * 알림 요약 조회
   * GET /api/dashboard/notifications/summary
   */
  http.get('/api/dashboard/notifications/summary', async ({ request }) => {
    await delay(80);
    
    try {
      const notifications = {
        total_count: 45 + Math.floor(Math.random() * 10), // 약간의 변동성
        unread_count: Math.floor(Math.random() * 15),
        feedback_count: Math.floor(Math.random() * 12),
        schedule_count: Math.floor(Math.random() * 5),
        mention_count: Math.floor(Math.random() * 3)
      };
      
      const response = {
        success: true,
        data: { notifications },
        meta: {
          timestamp: new Date().toISOString()
        }
      };
      
      return HttpResponse.json(response);
      
    } catch (error) {
      return new HttpResponse(null, { status: 500 });
    }
  })
];

// =============================================================================
// 개발자 디버깅 도구 (Developer Debugging Tools)
// =============================================================================

/**
 * 모킹 상태 디버깅을 위한 로그 출력
 */
export function logMockingStatus() {
  console.group('[Dashboard MSW] 모킹 상태');
  console.log('사용 가능한 시나리오:', Object.keys(mockScenarios));
  console.log('현재 시간:', new Date().toISOString());
  console.log('시간대별 가중치:', new Date().getHours() >= 9 && new Date().getHours() <= 18 ? '업무시간(1.2x)' : '업무외시간(0.8x)');
  console.groupEnd();
}

/**
 * 특정 시나리오로 대시보드 데이터 미리보기
 */
export function previewScenario(scenarioName: keyof typeof mockScenarios): DashboardData | null {
  const scenario = mockScenarios[scenarioName];
  if (!scenario) {
    console.error(`존재하지 않는 시나리오: ${scenarioName}`);
    return null;
  }
  
  const baseData: DashboardData = {
    stats: generateTimeBasedStats(),
    notifications: {
      total_count: 45,
      unread_count: 12,
      feedback_count: 8,
      schedule_count: 3,
      mention_count: 1
    },
    recent_projects: generateMockProjects().slice(0, 5),
    recent_activities: generateMockActivities().slice(0, 10),
    quick_actions: generateQuickActions(),
    meta: {
      last_updated: new Date().toISOString(),
      cache_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      user_timezone: 'Asia/Seoul'
    }
  };
  
  return scenario.modifier(baseData);
}