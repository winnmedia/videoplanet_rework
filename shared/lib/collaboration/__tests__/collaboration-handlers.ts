/**
 * @fileoverview 협업 시스템 MSW 핸들러
 * @description 폴링 시스템 테스트를 위한 Mock Service Worker 핸들러
 */

import { http, HttpResponse } from 'msw'

import type {
  CollaborationUser,
  CollaborationChange,
  CollaborationConflict,
  CollaborationApiResponse,
  SubmitChangeApiResponse
} from '../types'

// ===========================
// 시뮬레이션 데이터 저장소
// ===========================

let mockActiveUsers: CollaborationUser[] = [
  {
    id: 'user1',
    name: '김작가',
    avatar: '',
    role: 'editor',
    lastActivity: new Date().toISOString(),
    isOnline: true
  },
  {
    id: 'user2',
    name: '박편집자',
    role: 'editor',
    lastActivity: new Date(Date.now() - 30000).toISOString(),
    isOnline: false
  },
  {
    id: 'user3',
    name: '이디렉터',
    role: 'owner',
    lastActivity: new Date(Date.now() - 10000).toISOString(),
    isOnline: true
  }
]

let mockRecentChanges: CollaborationChange[] = [
  {
    id: 'change1',
    userId: 'user2',
    userName: '박편집자',
    type: 'video-planning',
    action: 'update',
    resourceId: 'stage-1',
    resourceType: 'planning-stage',
    data: { title: '도입부 수정', duration: '30초' },
    timestamp: new Date(Date.now() - 60000).toISOString(),
    version: 1
  },
  {
    id: 'change2', 
    userId: 'user3',
    userName: '이디렉터',
    type: 'calendar-event',
    action: 'create',
    resourceId: 'event-1',
    resourceType: 'calendar-event',
    data: { title: '촬영 일정', startDate: '2024-01-15', endDate: '2024-01-16' },
    timestamp: new Date(Date.now() - 120000).toISOString(),
    version: 1
  }
]

let mockConflicts: CollaborationConflict[] = []

// 서버 버전 (동시성 제어용)
let serverVersion = Date.now()

// ===========================
// 데이터 시뮬레이션 함수들
// ===========================

/**
 * 새로운 변경사항 시뮬레이션 (2초마다 발생)
 */
function simulateRandomChange(): CollaborationChange | null {
  // 30% 확률로 새로운 변경사항 발생
  if (Math.random() < 0.3) {
    const changeTypes = ['video-planning', 'calendar-event'] as const
    const actions = ['create', 'update', 'delete'] as const
    const users = mockActiveUsers.filter(u => u.isOnline)
    
    if (users.length === 0) return null
    
    const randomUser = users[Math.floor(Math.random() * users.length)]
    const randomType = changeTypes[Math.floor(Math.random() * changeTypes.length)]
    const randomAction = actions[Math.floor(Math.random() * actions.length)]
    
    const change: CollaborationChange = {
      id: `sim-change-${Date.now()}-${Math.random()}`,
      userId: randomUser.id,
      userName: randomUser.name,
      type: randomType,
      action: randomAction,
      resourceId: `resource-${Date.now()}`,
      resourceType: randomType === 'video-planning' ? 'planning-stage' : 'calendar-event',
      data: randomType === 'video-planning' 
        ? { title: '시뮬레이션 단계', duration: '45초' }
        : { title: '시뮬레이션 일정', date: new Date().toISOString() },
      timestamp: new Date().toISOString(),
      version: ++serverVersion
    }
    
    return change
  }
  
  return null
}

/**
 * 사용자 상태 시뮬레이션
 */
function simulateUserActivity() {
  mockActiveUsers.forEach(user => {
    // 10% 확률로 온라인/오프라인 상태 변경
    if (Math.random() < 0.1) {
      user.isOnline = !user.isOnline
      if (user.isOnline) {
        user.lastActivity = new Date().toISOString()
      }
    } else if (user.isOnline && Math.random() < 0.3) {
      // 30% 확률로 활동 시간 업데이트
      user.lastActivity = new Date().toISOString()
    }
  })
}

/**
 * 충돌 감지 시뮬레이션
 */
function detectConflicts(newChange: CollaborationChange): CollaborationConflict[] {
  const conflicts: CollaborationConflict[] = []
  
  // 같은 리소스에 대한 최근 변경사항 찾기
  const conflictingChanges = mockRecentChanges.filter(existing => 
    existing.resourceId === newChange.resourceId &&
    existing.resourceType === newChange.resourceType &&
    existing.id !== newChange.id &&
    new Date(existing.timestamp).getTime() > (Date.now() - 10000) // 10초 내
  )
  
  conflictingChanges.forEach(conflictingChange => {
    const conflict: CollaborationConflict = {
      id: `conflict-${Date.now()}-${Math.random()}`,
      resourceId: newChange.resourceId,
      resourceType: newChange.resourceType,
      localChange: newChange,
      remoteChange: conflictingChange
    }
    
    conflicts.push(conflict)
  })
  
  return conflicts
}

// ===========================
// MSW 핸들러들
// ===========================

export const collaborationHandlers = [
  // 폴링 API - 협업 데이터 조회
  http.get('/api/collaboration/poll', async ({ request }) => {
    console.log('🔄 협업 폴링 요청 수신')
    
    // 실제 네트워크 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
    
    // 사용자 활동 시뮬레이션
    simulateUserActivity()
    
    // 새로운 변경사항 시뮬레이션
    const newChange = simulateRandomChange()
    if (newChange) {
      mockRecentChanges.unshift(newChange)
      
      // 최대 50개 유지
      if (mockRecentChanges.length > 50) {
        mockRecentChanges = mockRecentChanges.slice(0, 50)
      }
    }
    
    const response: CollaborationApiResponse = {
      success: true,
      data: {
        activeUsers: [...mockActiveUsers],
        changes: [...mockRecentChanges],
        serverVersion,
        timestamp: new Date().toISOString()
      }
    }
    
    return HttpResponse.json(response)
  }),

  // 변경사항 제출 API
  http.post('/api/collaboration/submit', async ({ request }) => {
    console.log('📤 협업 변경사항 제출 요청 수신')
    
    const change = await request.json() as CollaborationChange
    
    // 네트워크 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300))
    
    // 5% 확률로 네트워크 오류 시뮬레이션
    if (Math.random() < 0.05) {
      console.log('❌ 시뮬레이션된 네트워크 오류')
      return HttpResponse.json({
        success: false,
        error: '네트워크 오류가 발생했습니다'
      }, { status: 500 })
    }
    
    // 충돌 감지
    const conflicts = detectConflicts(change)
    
    // 변경사항을 목록에 추가
    change.version = ++serverVersion
    mockRecentChanges.unshift(change)
    
    // 최대 50개 유지
    if (mockRecentChanges.length > 50) {
      mockRecentChanges = mockRecentChanges.slice(0, 50)
    }
    
    // 충돌이 있다면 전역 충돌 목록에 추가
    if (conflicts.length > 0) {
      mockConflicts.push(...conflicts)
      console.log('⚠️ 충돌 감지:', conflicts.length, '개')
    }
    
    const response: SubmitChangeApiResponse = {
      success: true,
      data: {
        changeId: change.id,
        version: change.version,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      }
    }
    
    return HttpResponse.json(response)
  }),

  // 충돌 해결 API
  http.post('/api/collaboration/resolve-conflict', async ({ request }) => {
    console.log('🔧 충돌 해결 요청 수신')
    
    const { conflictId, resolution, mergedData } = await request.json()
    
    // 네트워크 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 150))
    
    // 해결된 충돌을 목록에서 제거
    mockConflicts = mockConflicts.filter(c => c.id !== conflictId)
    
    return HttpResponse.json({
      success: true,
      data: {
        conflictId,
        resolvedAt: new Date().toISOString(),
        resolution
      }
    })
  }),

  // 테스트용 - 데이터 초기화
  http.post('/api/collaboration/reset', async () => {
    console.log('🔄 협업 데이터 초기화')
    
    mockActiveUsers = [
      {
        id: 'user1',
        name: '김작가',
        role: 'editor',
        lastActivity: new Date().toISOString(),
        isOnline: true
      },
      {
        id: 'user2',
        name: '박편집자',
        role: 'editor',
        lastActivity: new Date(Date.now() - 30000).toISOString(),
        isOnline: false
      }
    ]
    
    mockRecentChanges = []
    mockConflicts = []
    serverVersion = Date.now()
    
    return HttpResponse.json({
      success: true,
      data: { message: '초기화 완료' }
    })
  }),

  // 테스트용 - 사용자 추가/제거
  http.post('/api/collaboration/simulate-user', async ({ request }) => {
    const { action, userId, userData } = await request.json()
    
    if (action === 'join') {
      const newUser: CollaborationUser = {
        id: userId || `user-${Date.now()}`,
        name: userData?.name || '새 사용자',
        role: userData?.role || 'viewer',
        lastActivity: new Date().toISOString(),
        isOnline: true,
        ...userData
      }
      
      mockActiveUsers.push(newUser)
      console.log('👤 사용자 참여 시뮬레이션:', newUser.name)
    } else if (action === 'leave') {
      mockActiveUsers = mockActiveUsers.filter(u => u.id !== userId)
      console.log('👤 사용자 퇴장 시뮬레이션:', userId)
    }
    
    return HttpResponse.json({
      success: true,
      data: { activeUsers: mockActiveUsers }
    })
  }),

  // 테스트용 - 강제 충돌 생성
  http.post('/api/collaboration/force-conflict', async ({ request }) => {
    const { resourceId, resourceType } = await request.json()
    
    const conflictChange: CollaborationChange = {
      id: `forced-conflict-${Date.now()}`,
      userId: 'other_user',
      userName: '충돌사용자',
      type: 'video-planning',
      action: 'update',
      resourceId: resourceId || 'test-resource',
      resourceType: resourceType || 'planning-stage',
      data: { conflictData: true },
      timestamp: new Date().toISOString(),
      version: ++serverVersion
    }
    
    const conflict: CollaborationConflict = {
      id: `forced-conflict-${Date.now()}`,
      resourceId: conflictChange.resourceId,
      resourceType: conflictChange.resourceType,
      localChange: conflictChange,
      remoteChange: {
        ...conflictChange,
        id: 'local-change',
        userId: 'current_user',
        userName: '현재사용자'
      }
    }
    
    mockConflicts.push(conflict)
    mockRecentChanges.unshift(conflictChange)
    
    console.log('⚠️ 강제 충돌 생성:', conflict.id)
    
    return HttpResponse.json({
      success: true,
      data: { conflict }
    })
  })
]