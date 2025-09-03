/**
 * MSW Notification API 핸들러
 * 알림 시스템을 위한 모킹 데이터 및 API 엔드포인트 제공
 */

import { http, HttpResponse } from 'msw'
import { 
  Notification, 
  NotificationType, 
  NotificationStatus, 
  NotificationPriority 
} from '../../../entities/notification'

// 모킹 상태 관리
interface NotificationMockState {
  notifications: Notification[]
  userUnreadCounts: Map<string, number>
}

// 초기 모킹 데이터
const mockState: NotificationMockState = {
  notifications: [
    {
      id: '1',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.PROJECT_UPDATE,
      title: '프로젝트가 업데이트되었습니다',
      message: '비디오 프로젝트 "홍보 영상 A"에 새로운 변경사항이 있습니다.',
      metadata: {
        sourceId: 'project-1',
        sourceType: 'project',
        actorId: 'user-2',
        actorName: '김프로듀서',
        contextData: { projectName: '홍보 영상 A' }
      },
      status: NotificationStatus.UNREAD,
      priority: NotificationPriority.MEDIUM,
      createdAt: new Date('2024-01-15T10:00:00Z'),
      actionUrl: '/projects/project-1',
      actionLabel: '프로젝트 보기'
    },
    {
      id: '2',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.FEEDBACK_RECEIVED,
      title: '새로운 피드백을 받았습니다',
      message: '업로드한 영상에 대한 새로운 피드백이 도착했습니다.',
      metadata: {
        sourceId: 'feedback-1',
        sourceType: 'feedback',
        actorId: 'user-3',
        actorName: '이검토자'
      },
      status: NotificationStatus.UNREAD,
      priority: NotificationPriority.HIGH,
      createdAt: new Date('2024-01-14T15:30:00Z'),
      actionUrl: '/feedback/feedback-1',
      actionLabel: '피드백 확인'
    },
    {
      id: '3',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.TEAM_INVITATION,
      title: '팀 초대를 받았습니다',
      message: '"마케팅팀"에서 당신을 팀원으로 초대했습니다.',
      metadata: {
        sourceId: 'team-1',
        sourceType: 'team',
        actorId: 'user-4',
        actorName: '박팀장',
        contextData: { teamName: '마케팅팀' }
      },
      status: NotificationStatus.READ,
      priority: NotificationPriority.MEDIUM,
      createdAt: new Date('2024-01-13T09:00:00Z'),
      actionUrl: '/teams/team-1/invitation',
      actionLabel: '초대 수락하기'
    },
    {
      id: '4',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.DEADLINE_REMINDER,
      title: '마감일이 다가옵니다',
      message: '프로젝트 "홍보 영상 B"의 마감일이 내일입니다.',
      metadata: {
        sourceId: 'project-2',
        sourceType: 'project',
        contextData: { 
          projectName: '홍보 영상 B',
          deadline: '2024-01-16T23:59:59Z'
        }
      },
      status: NotificationStatus.UNREAD,
      priority: NotificationPriority.URGENT,
      createdAt: new Date('2024-01-14T18:00:00Z'),
      actionUrl: '/projects/project-2',
      actionLabel: '프로젝트 확인'
    },
    {
      id: '5',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.STORY_APPROVED,
      title: '스토리가 승인되었습니다',
      message: '제출한 스토리 "제품 소개 시나리오"가 승인되었습니다.',
      metadata: {
        sourceId: 'story-1',
        sourceType: 'story',
        actorId: 'user-5',
        actorName: '최승인자'
      },
      status: NotificationStatus.READ,
      priority: NotificationPriority.MEDIUM,
      createdAt: new Date('2024-01-12T14:30:00Z'),
      actionUrl: '/stories/story-1',
      actionLabel: '스토리 보기'
    },
    {
      id: '6',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: '시스템 점검 안내',
      message: '금일 자정부터 새벽 2시까지 시스템 점검이 예정되어 있습니다.',
      metadata: {
        sourceType: 'system',
        contextData: {
          maintenanceStart: '2024-01-16T00:00:00Z',
          maintenanceEnd: '2024-01-16T02:00:00Z'
        }
      },
      status: NotificationStatus.UNREAD,
      priority: NotificationPriority.HIGH,
      createdAt: new Date('2024-01-14T12:00:00Z')
    },
    {
      id: '7',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.MENTION,
      title: '댓글에서 언급되었습니다',
      message: '김동료님이 프로젝트 댓글에서 당신을 언급했습니다.',
      metadata: {
        sourceId: 'comment-1',
        sourceType: 'feedback',
        actorId: 'user-6',
        actorName: '김동료'
      },
      status: NotificationStatus.READ,
      priority: NotificationPriority.LOW,
      createdAt: new Date('2024-01-11T16:45:00Z'),
      actionUrl: '/projects/project-1#comment-1',
      actionLabel: '댓글 보기'
    },
    {
      id: '8',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.COLLABORATION_REQUEST,
      title: '협업 요청이 도착했습니다',
      message: '이파트너님이 "브랜드 영상 제작" 프로젝트에 협업을 요청했습니다.',
      metadata: {
        sourceId: 'collab-1',
        sourceType: 'project',
        actorId: 'user-7',
        actorName: '이파트너'
      },
      status: NotificationStatus.UNREAD,
      priority: NotificationPriority.MEDIUM,
      createdAt: new Date('2024-01-10T11:20:00Z'),
      actionUrl: '/collaboration/collab-1',
      actionLabel: '요청 확인'
    },
    {
      id: '9',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.SECURITY_ALERT,
      title: '보안 알림',
      message: '새로운 위치에서 로그인이 감지되었습니다.',
      metadata: {
        sourceType: 'system',
        contextData: {
          loginLocation: 'Seoul, South Korea',
          loginTime: '2024-01-09T20:15:00Z',
          ipAddress: '203.***.***.***'
        }
      },
      status: NotificationStatus.READ,
      priority: NotificationPriority.HIGH,
      createdAt: new Date('2024-01-09T20:16:00Z'),
      actionUrl: '/settings/security',
      actionLabel: '보안 설정'
    },
    {
      id: '10',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      type: NotificationType.STORY_REJECTED,
      title: '스토리가 반려되었습니다',
      message: '제출한 스토리 "이벤트 홍보"가 수정이 필요하여 반려되었습니다.',
      metadata: {
        sourceId: 'story-2',
        sourceType: 'story',
        actorId: 'user-8',
        actorName: '정검토자',
        contextData: {
          rejectionReason: '스토리 구성이 명확하지 않음'
        }
      },
      status: NotificationStatus.UNREAD,
      priority: NotificationPriority.MEDIUM,
      createdAt: new Date('2024-01-08T13:45:00Z'),
      actionUrl: '/stories/story-2',
      actionLabel: '스토리 수정'
    }
  ],
  userUnreadCounts: new Map()
}

// 초기 읽지 않은 개수 계산
mockState.userUnreadCounts.set(
  '123e4567-e89b-12d3-a456-426614174000',
  mockState.notifications.filter(n => 
    n.userId === '123e4567-e89b-12d3-a456-426614174000' && 
    n.status === NotificationStatus.UNREAD
  ).length
)

// 유틸리티 함수
const generateId = () => `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
const getCurrentTimestamp = () => new Date().toISOString()

const createSuccessResponse = (data?: unknown) => ({
  success: true,
  data,
  timestamp: getCurrentTimestamp(),
})

const createErrorResponse = (error: string) => ({
  success: false,
  error,
  timestamp: getCurrentTimestamp(),
})

// 인증 헤더에서 사용자 ID 추출
const getUserIdFromAuth = (authHeader: string | null): string | null => {
  if (!authHeader?.startsWith('Bearer mock-access-token-')) return null
  return authHeader.replace('Bearer mock-access-token-', '')
}

// 읽지 않은 알림 개수 업데이트
const updateUnreadCount = (userId: string) => {
  const count = mockState.notifications.filter(n => 
    n.userId === userId && n.status === NotificationStatus.UNREAD
  ).length
  mockState.userUnreadCounts.set(userId, count)
  return count
}

export const notificationHandlers = [
  // 알림 목록 조회
  http.get('/api/v1/notifications', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const status = url.searchParams.get('status')?.split(',')
    const types = url.searchParams.get('types')?.split(',')
    const priority = url.searchParams.get('priority')?.split(',')

    let userNotifications = mockState.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // 필터링
    if (status) {
      userNotifications = userNotifications.filter(n => status.includes(n.status))
    }
    if (types) {
      userNotifications = userNotifications.filter(n => types.includes(n.type))
    }
    if (priority) {
      userNotifications = userNotifications.filter(n => priority.includes(n.priority))
    }

    const total = userNotifications.length
    const hasMore = offset + limit < total
    const paginatedNotifications = userNotifications.slice(offset, offset + limit)
    const unreadCount = mockState.userUnreadCounts.get(userId) || 0

    return HttpResponse.json(createSuccessResponse({
      notifications: paginatedNotifications,
      total,
      unreadCount,
      hasMore
    }))
  }),

  // 읽지 않은 알림 개수 조회
  http.get('/api/v1/notifications/unread-count', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }

    const unreadCount = updateUnreadCount(userId)

    return HttpResponse.json(createSuccessResponse({
      unreadCount
    }))
  }),

  // 알림 읽음 처리
  http.patch('/api/v1/notifications/:notificationId/read', async ({ request, params }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    const notificationId = params.notificationId as string
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }

    try {
      const body = await request.json()
      const requestUserId = (body as any).user_id

      if (requestUserId !== userId) {
        return HttpResponse.json(
          createErrorResponse('권한이 없습니다.'),
          { status: 403 }
        )
      }

      const notification = mockState.notifications.find(n => 
        n.id === notificationId && n.userId === userId
      )

      if (!notification) {
        return HttpResponse.json(
          createErrorResponse('알림을 찾을 수 없습니다.'),
          { status: 404 }
        )
      }

      if (notification.status === NotificationStatus.UNREAD) {
        notification.status = NotificationStatus.READ
        notification.readAt = new Date()
        updateUnreadCount(userId)
      }

      return HttpResponse.json(createSuccessResponse({
        success: true,
        notification
      }))
    } catch (error) {
      return HttpResponse.json(
        createErrorResponse('잘못된 요청 데이터입니다.'),
        { status: 400 }
      )
    }
  }),

  // 여러 알림 일괄 읽음 처리
  http.patch('/api/v1/notifications/bulk-read', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }

    try {
      const body = await request.json()
      const { notification_ids: notificationIds, user_id: requestUserId } = body as any

      if (requestUserId !== userId) {
        return HttpResponse.json(
          createErrorResponse('권한이 없습니다.'),
          { status: 403 }
        )
      }

      const updatedNotifications: Notification[] = []
      let updatedCount = 0

      for (const notificationId of notificationIds) {
        const notification = mockState.notifications.find(n => 
          n.id === notificationId && n.userId === userId
        )

        if (notification && notification.status === NotificationStatus.UNREAD) {
          notification.status = NotificationStatus.READ
          notification.readAt = new Date()
          updatedNotifications.push(notification)
          updatedCount++
        }
      }

      if (updatedCount > 0) {
        updateUnreadCount(userId)
      }

      return HttpResponse.json(createSuccessResponse({
        success: true,
        updatedCount,
        notifications: updatedNotifications
      }))
    } catch (error) {
      return HttpResponse.json(
        createErrorResponse('잘못된 요청 데이터입니다.'),
        { status: 400 }
      )
    }
  }),

  // 모든 알림 읽음 처리
  http.patch('/api/v1/notifications/mark-all-read', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }

    try {
      const body = await request.json()
      const requestUserId = (body as any).user_id

      if (requestUserId !== userId) {
        return HttpResponse.json(
          createErrorResponse('권한이 없습니다.'),
          { status: 403 }
        )
      }

      let updatedCount = 0
      const now = new Date()

      mockState.notifications.forEach(notification => {
        if (notification.userId === userId && notification.status === NotificationStatus.UNREAD) {
          notification.status = NotificationStatus.READ
          notification.readAt = now
          updatedCount++
        }
      })

      if (updatedCount > 0) {
        updateUnreadCount(userId)
      }

      return HttpResponse.json(createSuccessResponse({
        success: true,
        updatedCount
      }))
    } catch (error) {
      return HttpResponse.json(
        createErrorResponse('잘못된 요청 데이터입니다.'),
        { status: 400 }
      )
    }
  }),

  // 알림 아카이브
  http.patch('/api/v1/notifications/:notificationId/archive', async ({ request, params }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    const notificationId = params.notificationId as string
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }

    try {
      const body = await request.json()
      const requestUserId = (body as any).user_id

      if (requestUserId !== userId) {
        return HttpResponse.json(
          createErrorResponse('권한이 없습니다.'),
          { status: 403 }
        )
      }

      const notification = mockState.notifications.find(n => 
        n.id === notificationId && n.userId === userId
      )

      if (!notification) {
        return HttpResponse.json(
          createErrorResponse('알림을 찾을 수 없습니다.'),
          { status: 404 }
        )
      }

      notification.status = NotificationStatus.ARCHIVED
      updateUnreadCount(userId)

      return HttpResponse.json(createSuccessResponse({
        success: true,
        notification
      }))
    } catch (error) {
      return HttpResponse.json(
        createErrorResponse('잘못된 요청 데이터입니다.'),
        { status: 400 }
      )
    }
  }),

  // 알림 새로고침 (폴링용)
  http.get('/api/v1/notifications/refresh', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const lastFetch = url.searchParams.get('last_fetch')
    
    let userNotifications = mockState.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10) // 최근 10개만

    // 마지막 fetch 이후 데이터만 필터링 (실제로는 더 복잡한 로직)
    if (lastFetch) {
      const lastFetchDate = new Date(lastFetch)
      userNotifications = userNotifications.filter(n => 
        new Date(n.createdAt) > lastFetchDate
      )
    }

    const unreadCount = mockState.userUnreadCounts.get(userId) || 0

    return HttpResponse.json(createSuccessResponse({
      notifications: userNotifications,
      total: userNotifications.length,
      unreadCount,
      hasMore: false
    }))
  })
]

// 테스트 및 개발용 유틸리티 함수
export const addMockNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
  const newNotification: Notification = {
    ...notification,
    id: generateId(),
    createdAt: new Date()
  }
  
  mockState.notifications.unshift(newNotification)
  
  if (newNotification.status === NotificationStatus.UNREAD) {
    updateUnreadCount(newNotification.userId)
  }
  
  return newNotification
}

export const resetNotificationMockState = () => {
  // 기본 데이터만 유지
  const defaultUserId = '123e4567-e89b-12d3-a456-426614174000'
  mockState.notifications.length = 0
  mockState.userUnreadCounts.clear()
  
  // 초기 데이터 추가
  mockState.notifications.push(
    {
      id: '1',
      userId: defaultUserId,
      type: NotificationType.PROJECT_UPDATE,
      title: 'Test Notification',
      message: 'This is a test notification',
      metadata: {},
      status: NotificationStatus.UNREAD,
      priority: NotificationPriority.MEDIUM,
      createdAt: new Date()
    }
  )
  
  updateUnreadCount(defaultUserId)
}