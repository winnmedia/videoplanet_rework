/**
 * 대시보드 모듈 MSW 핸들러
 * 실시간 피드 집계, 읽지 않음 배지, 간트 요약, 빠른 액션 모킹
 */

import { http, HttpResponse, delay } from 'msw'

import { API_BASE_URL } from '../handlers'

// Mock 피드 데이터
let unreadCount = 7 // 읽지 않음 배지 테스트용

const mockActivities = [
  {
    id: '1',
    type: 'PROJECT_CREATED',
    title: '새 프로젝트 생성',
    description: '브랜드 홍보 영상 프로젝트가 생성되었습니다.',
    projectId: '1',
    projectName: 'Brand Video',
    userId: '1',
    userName: '관리자',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30분 전
    isRead: false
  },
  {
    id: '2', 
    type: 'COMMENT_ADDED',
    title: '새 댓글',
    description: '영상 피드백에 새로운 댓글이 추가되었습니다.',
    projectId: '2',
    projectName: 'Product Demo',
    userId: '2',
    userName: '편집자',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
    isRead: false
  },
  {
    id: '3',
    type: 'SCHEDULE_UPDATED', 
    title: '일정 변경',
    description: '촬영 일정이 변경되었습니다.',
    projectId: '1',
    projectName: 'Brand Video',
    userId: '1', 
    userName: '관리자',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4시간 전
    isRead: true
  },
  {
    id: '4',
    type: 'FEEDBACK_RECEIVED',
    title: '피드백 도착',
    description: '클라이언트로부터 피드백이 도착했습니다.',
    projectId: '3',
    projectName: 'Training Video',
    userId: '3',
    userName: '뷰어',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1일 전
    isRead: true
  }
]

const mockProjectStats = {
  totalProjects: 12,
  activeProjects: 8,
  completedProjects: 3,
  onHoldProjects: 1,
  
  // 간트 차트 요약 데이터
  ganttSummary: {
    upcomingDeadlines: [
      {
        projectId: '1',
        projectName: 'Brand Video',
        phase: '편집',
        dueDate: '2025-08-30T09:00:00Z',
        daysRemaining: 4,
        progress: 65
      },
      {
        projectId: '2', 
        projectName: 'Product Demo',
        phase: '촬영',
        dueDate: '2025-08-28T14:00:00Z',
        daysRemaining: 2,
        progress: 30
      }
    ],
    overdueTasks: [
      {
        projectId: '4',
        projectName: 'Social Media',
        phase: '기획',
        dueDate: '2025-08-24T17:00:00Z',
        daysOverdue: 2,
        progress: 80
      }
    ],
    completedToday: 3,
    totalTasks: 47
  },
  
  // 성과 지표
  metrics: {
    averageCompletionTime: 14, // days
    clientSatisfactionScore: 4.7,
    onTimeDeliveryRate: 0.85,
    resourceUtilization: 0.73
  }
}

// 빠른 액션용 데이터
const quickActions = [
  {
    id: 'create-project',
    title: '새 프로젝트',
    icon: 'plus',
    color: '#0031ff',
    url: '/projects/create'
  },
  {
    id: 'schedule-meeting',
    title: '미팅 예약',
    icon: 'calendar',
    color: '#28a745', 
    url: '/calendar/create'
  },
  {
    id: 'upload-video',
    title: '영상 업로드',
    icon: 'video',
    color: '#ffc107',
    url: '/videos/upload'
  },
  {
    id: 'invite-member',
    title: '멤버 초대',
    icon: 'user-plus',
    color: '#17a2b8',
    url: '/team/invite'
  }
]

export const dashboardHandlers = [
  // 피드 요약 정보
  http.get(`${API_BASE_URL}/dashboard/feed`, async ({ request }) => {
    await delay(200) // 실시간 데이터 집계 시간
    
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    
    const activities = mockActivities.slice(offset, offset + limit)
    
    return HttpResponse.json({
      activities,
      unreadCount,
      total: mockActivities.length,
      hasMore: offset + limit < mockActivities.length
    })
  }),

  // 읽지 않음 배지 카운트
  http.get(`${API_BASE_URL}/dashboard/unread-count`, async () => {
    await delay(50)
    
    // 9+ 표시 로직 테스트
    const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString()
    
    return HttpResponse.json({
      count: unreadCount,
      displayCount,
      hasUnread: unreadCount > 0
    })
  }),

  // 활동 읽음 처리
  http.post(`${API_BASE_URL}/dashboard/mark-read`, async ({ request }) => {
    const body = await request.json() as { activityIds: string[] }
    await delay(100)
    
    // 읽음 처리
    body.activityIds.forEach(id => {
      const activity = mockActivities.find(a => a.id === id)
      if (activity && !activity.isRead) {
        activity.isRead = true
        unreadCount = Math.max(0, unreadCount - 1)
      }
    })
    
    return HttpResponse.json({
      success: true,
      newUnreadCount: unreadCount
    })
  }),

  // 모든 활동 읽음 처리
  http.post(`${API_BASE_URL}/dashboard/mark-all-read`, async () => {
    await delay(150)
    
    mockActivities.forEach(activity => {
      activity.isRead = true
    })
    unreadCount = 0
    
    return HttpResponse.json({
      success: true,
      newUnreadCount: 0
    })
  }),

  // 프로젝트 통계
  http.get(`${API_BASE_URL}/dashboard/project-stats`, async () => {
    await delay(300) // 통계 집계 시간
    
    return HttpResponse.json(mockProjectStats)
  }),

  // 간트 차트 요약
  http.get(`${API_BASE_URL}/dashboard/gantt-summary`, async () => {
    await delay(250)
    
    return HttpResponse.json({
      upcomingDeadlines: mockProjectStats.ganttSummary.upcomingDeadlines,
      overdueTasks: mockProjectStats.ganttSummary.overdueTasks,
      completedToday: mockProjectStats.ganttSummary.completedToday,
      totalTasks: mockProjectStats.ganttSummary.totalTasks,
      progressSummary: {
        onTrack: mockProjectStats.ganttSummary.upcomingDeadlines.length,
        atRisk: 2,
        overdue: mockProjectStats.ganttSummary.overdueTasks.length
      }
    })
  }),

  // 빠른 액션 목록
  http.get(`${API_BASE_URL}/dashboard/quick-actions`, async () => {
    await delay(100)
    
    return HttpResponse.json({
      actions: quickActions
    })
  })
]

// 테스트 유틸리티 함수들
export const dashboardTestUtils = {
  getUnreadCount: () => unreadCount,
  setUnreadCount: (count: number) => {
    unreadCount = count
  },
  addActivity: (activity: typeof mockActivities[0]) => {
    mockActivities.unshift(activity)
    if (!activity.isRead) {
      unreadCount++
    }
  },
  clearActivities: () => {
    mockActivities.length = 0
    unreadCount = 0
  },
  getActivities: () => mockActivities,
  resetToDefaults: () => {
    unreadCount = 7
    // 기본 활동 데이터 재설정
  }
}