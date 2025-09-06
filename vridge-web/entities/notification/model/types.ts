import { z } from 'zod'

// 알림 타입 정의
export const NotificationTypeSchema = z.enum([
  'invitation',    // 프로젝트 초대
  'comment',       // 댓글 및 피드백
  'reaction',      // 좋아요, 반응
  'conflict',      // 일정 충돌
  'mention',       // 멘션
  'approval',      // 승인 요청
  'system'         // 시스템 알림
])

export type NotificationType = z.infer<typeof NotificationTypeSchema>

// 우선순위 정의
export const NotificationPrioritySchema = z.enum(['high', 'medium', 'low'])
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>

// WebSocket 연결 상태
export const ConnectionStatusSchema = z.enum(['connected', 'disconnected', 'reconnecting', 'failed'])
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>

// 기본 알림 스키마 (Redis 직렬화 호환)
export const NotificationSchema = z.object({
  id: z.string(),
  type: NotificationTypeSchema,
  title: z.string(),
  message: z.string(),
  timestamp: z.string(), // ISO 8601 문자열로 저장 (직렬화 가능)
  isRead: z.boolean().default(false),
  priority: NotificationPrioritySchema.default('medium'),
  actionUrl: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  expiresAt: z.string().optional() // ISO 8601 문자열로 저장
})

export type Notification = z.infer<typeof NotificationSchema>

// 실시간 알림 이벤트 스키마 (WebSocket용)
export const RealtimeNotificationEventSchema = z.object({
  type: z.literal('notification'),
  payload: NotificationSchema,
  timestamp: z.string() // ISO string
})

export type RealtimeNotificationEvent = z.infer<typeof RealtimeNotificationEventSchema>

// 알림 상태 인터페이스 (Redux 직렬화 호환)
export interface NotificationState {
  items: Notification[]
  unreadCount: number
  isLoading: boolean
  lastFetched: string | null // ISO 8601 문자열로 저장
  connectionStatus: ConnectionStatus
  error: string | null
}

// 알림 필터 옵션
export interface NotificationFilters {
  type?: NotificationType[]
  isRead?: boolean
  priority?: NotificationPriority[]
  dateRange?: {
    from: Date
    to: Date
  }
}

// API 응답 스키마
export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  total: z.number(),
  unreadCount: z.number(),
  hasMore: z.boolean()
})

export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>

// WebSocket 메시지 스키마
export const WebSocketMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('notification'),
    payload: NotificationSchema
  }),
  z.object({
    type: z.literal('notification_read'),
    payload: z.object({
      notificationId: z.string(),
      userId: z.string()
    })
  }),
  z.object({
    type: z.literal('connection_status'),
    payload: z.object({
      status: ConnectionStatusSchema,
      timestamp: z.string()
    })
  })
])

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>

// 알림 설정
export interface NotificationSettings {
  enablePushNotifications: boolean
  enableEmailNotifications: boolean
  enableSoundNotifications: boolean
  notificationTypes: {
    [K in NotificationType]: boolean
  }
  quietHours: {
    enabled: boolean
    startTime: string // HH:mm format
    endTime: string   // HH:mm format
  }
}

// 알림 통계
export interface NotificationStats {
  totalNotifications: number
  unreadNotifications: number
  notificationsByType: Record<NotificationType, number>
  averageReadTime: number // 평균 읽기 시간 (분)
}

// 에러 타입
export const NotificationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional()
})

export type NotificationError = z.infer<typeof NotificationErrorSchema>