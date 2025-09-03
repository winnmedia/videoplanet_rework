/**
 * MSW API 모킹 핸들러
 * 계약 검증과 연계된 결정론적 API 모킹 제공
 */

import { http, HttpResponse } from 'msw'
import { planningHandlers } from './planning-handlers'
import { dashboardHandlers } from './dashboard-handlers'
import { notificationHandlers } from './notification-handlers'

// 모킹 상태 관리
interface MockState {
  users: Array<{
    id: string
    username: string
    email: string
    password: string
    createdAt: string
    updatedAt: string
  }>
  videos: Array<{
    id: string
    userId: string
    filename: string
    size: number
    duration: number
    resolution: { width: number; height: number }
    format: string
    quality: string
    uploadedAt: string
    status: string
  }>
  feedback: Array<{
    id: string
    videoId: string
    userId: string
    rating: number
    comment?: string
    category: string
    createdAt: string
  }>
  processingJobs: Map<string, { progress: number; estimatedTime: number }>
}

// 초기 모킹 데이터
const mockState: MockState = {
  users: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      username: 'existing-user',
      email: 'existing@example.com',
      password: 'hashedPassword123',
      createdAt: '2025-09-01T00:00:00Z',
      updatedAt: '2025-09-01T00:00:00Z',
    },
  ],
  videos: [
    {
      id: 'video-123',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      filename: 'sample-video.mp4',
      size: 50000000,
      duration: 180.5,
      resolution: { width: 1920, height: 1080 },
      format: 'mp4',
      quality: '1080p',
      uploadedAt: '2025-09-02T00:00:00Z',
      status: 'completed',
    },
  ],
  feedback: [],
  processingJobs: new Map([
    ['video-processing-123', { progress: 45, estimatedTime: 300 }],
  ]),
}

// 유틸리티 함수
const generateId = () => crypto.randomUUID()
const getCurrentTimestamp = () => new Date().toISOString()

// 성공 응답 생성
const createSuccessResponse = (data?: unknown) => ({
  success: true,
  data,
  timestamp: getCurrentTimestamp(),
})

// 에러 응답 생성
const createErrorResponse = (error: string) => ({
  success: false,
  error,
  timestamp: getCurrentTimestamp(),
})

// 인증 토큰 생성 (모킹용)
const generateTokens = (userId: string) => ({
  accessToken: `mock-access-token-${userId}`,
  refreshToken: `mock-refresh-token-${userId}`,
  expiresIn: 3600,
  tokenType: 'Bearer' as const,
})

// 인증 헤더에서 사용자 ID 추출
const getUserIdFromAuth = (authHeader: string | null): string | null => {
  if (!authHeader?.startsWith('Bearer mock-access-token-')) return null
  return authHeader.replace('Bearer mock-access-token-', '')
}

export const handlers = [
  // 인증 API
  http.post('/api/auth/signup', async ({ request }) => {
    try {
      const body = await request.json()
      
      // 요청 검증 (기본적인 필수 필드 확인)
      if (!body.username || !body.email || !body.password) {
        return HttpResponse.json(
          createErrorResponse('필수 필드가 누락되었습니다.'),
          { status: 400 }
        )
      }
      
      const validatedRequest = body
      
      // 중복 이메일 검사
      const existingUser = mockState.users.find(u => u.email === validatedRequest.email)
      if (existingUser) {
        return HttpResponse.json(
          createErrorResponse('이미 존재하는 이메일입니다.'),
          { status: 409 }
        )
      }
      
      // 중복 사용자명 검사
      const existingUsername = mockState.users.find(u => u.username === validatedRequest.username)
      if (existingUsername) {
        return HttpResponse.json(
          createErrorResponse('이미 존재하는 사용자명입니다.'),
          { status: 409 }
        )
      }
      
      // 새 사용자 생성
      const newUser = {
        id: generateId(),
        username: validatedRequest.username,
        email: validatedRequest.email,
        password: `hashed-${validatedRequest.password}`,
        createdAt: getCurrentTimestamp(),
        updatedAt: getCurrentTimestamp(),
      }
      
      mockState.users.push(newUser)
      
      const responseData = createSuccessResponse({
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
        },
        tokens: generateTokens(newUser.id),
      })
      
      return HttpResponse.json(responseData, { status: 201 })
    } catch (error) {
      return HttpResponse.json(
        createErrorResponse('잘못된 요청 데이터입니다.'),
        { status: 400 }
      )
    }
  }),

  http.post('/api/auth/login', async ({ request }) => {
    try {
      const body = await request.json()
      
      if (!body.email || !body.password) {
        return HttpResponse.json(
          createErrorResponse('이메일과 비밀번호가 필요합니다.'),
          { status: 400 }
        )
      }
      
      const validatedRequest = body
      
      // 사용자 인증
      const user = mockState.users.find(u => 
        u.email === validatedRequest.email && 
        u.password === `hashed-${validatedRequest.password}`
      )
      
      if (!user) {
        return HttpResponse.json(
          createErrorResponse('이메일 또는 비밀번호가 올바르지 않습니다.'),
          { status: 401 }
        )
      }
      
      const responseData = createSuccessResponse({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        tokens: generateTokens(user.id),
      })
      
      return HttpResponse.json(responseData)
    } catch (error) {
      return HttpResponse.json(
        createErrorResponse('잘못된 요청 데이터입니다.'),
        { status: 400 }
      )
    }
  }),

  http.get('/api/auth/me', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }
    
    const user = mockState.users.find(u => u.id === userId)
    if (!user) {
      return HttpResponse.json(
        createErrorResponse('사용자를 찾을 수 없습니다.'),
        { status: 404 }
      )
    }
    
    return HttpResponse.json(createSuccessResponse({
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: {
        displayName: user.username,
        avatar: `https://api.dicebear.com/6.x/avataaars/svg?seed=${user.username}`,
      },
    }))
  }),

  // 비디오 API
  http.post('/api/video/upload', async ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }
    
    // 실제 파일 처리는 복잡하므로 모킹된 응답 반환
    const newVideo = {
      id: generateId(),
      userId,
      filename: 'uploaded-video.mp4',
      size: 25000000,
      duration: 150.2,
      resolution: { width: 1920, height: 1080 },
      format: 'mp4',
      quality: '1080p',
      uploadedAt: getCurrentTimestamp(),
      status: 'uploading',
    }
    
    mockState.videos.push(newVideo)
    
    // 처리 작업 시뮬레이션
    setTimeout(() => {
      const video = mockState.videos.find(v => v.id === newVideo.id)
      if (video) {
        video.status = 'processing'
        mockState.processingJobs.set(newVideo.id, { progress: 0, estimatedTime: 600 })
      }
    }, 1000)
    
    return HttpResponse.json(createSuccessResponse({
      id: newVideo.id,
      filename: newVideo.filename,
      size: newVideo.size,
      duration: newVideo.duration,
      resolution: newVideo.resolution,
      format: newVideo.format,
      quality: newVideo.quality,
      uploadedAt: newVideo.uploadedAt,
      status: newVideo.status,
    }), { status: 201 })
  }),

  http.get('/api/video/:id/status', ({ request, params }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    const videoId = params.id as string
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }
    
    const video = mockState.videos.find(v => v.id === videoId && v.userId === userId)
    if (!video) {
      return HttpResponse.json(
        createErrorResponse('비디오를 찾을 수 없습니다.'),
        { status: 404 }
      )
    }
    
    const processingInfo = mockState.processingJobs.get(videoId)
    
    return HttpResponse.json(createSuccessResponse({
      videoId: video.id,
      status: video.status,
      progress: processingInfo?.progress || 100,
      estimatedTimeRemaining: processingInfo?.estimatedTime,
    }))
  }),

  http.get('/api/video', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }
    
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    
    const userVideos = mockState.videos.filter(v => v.userId === userId)
    const total = userVideos.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const paginatedVideos = userVideos.slice(startIndex, startIndex + limit)
    
    return HttpResponse.json(createSuccessResponse({
      videos: paginatedVideos.map(v => ({
        id: v.id,
        filename: v.filename,
        size: v.size,
        duration: v.duration,
        resolution: v.resolution,
        format: v.format,
        quality: v.quality,
        uploadedAt: v.uploadedAt,
        status: v.status,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }))
  }),

  // 피드백 API
  http.post('/api/feedback', async ({ request }) => {
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
      
      if (!body.videoId || !body.rating) {
        return HttpResponse.json(
          createErrorResponse('비디오 ID와 평점이 필요합니다.'),
          { status: 400 }
        )
      }
      
      const validatedRequest = body
      
      // 비디오 존재 확인
      const video = mockState.videos.find(v => v.id === validatedRequest.videoId && v.userId === userId)
      if (!video) {
        return HttpResponse.json(
          createErrorResponse('비디오를 찾을 수 없습니다.'),
          { status: 404 }
        )
      }
      
      const newFeedback = {
        id: generateId(),
        videoId: validatedRequest.videoId,
        userId,
        rating: validatedRequest.rating,
        comment: validatedRequest.comment,
        category: validatedRequest.category,
        createdAt: getCurrentTimestamp(),
      }
      
      mockState.feedback.push(newFeedback)
      
      return HttpResponse.json(createSuccessResponse(newFeedback), { status: 201 })
    } catch (error) {
      return HttpResponse.json(
        createErrorResponse('잘못된 요청 데이터입니다.'),
        { status: 400 }
      )
    }
  }),

  http.get('/api/feedback', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    const userId = getUserIdFromAuth(authHeader)
    
    if (!userId) {
      return HttpResponse.json(
        createErrorResponse('인증이 필요합니다.'),
        { status: 401 }
      )
    }
    
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const videoId = url.searchParams.get('videoId')
    
    let userFeedback = mockState.feedback.filter(f => f.userId === userId)
    
    if (videoId) {
      userFeedback = userFeedback.filter(f => f.videoId === videoId)
    }
    
    const total = userFeedback.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const paginatedFeedback = userFeedback.slice(startIndex, startIndex + limit)
    
    return HttpResponse.json(createSuccessResponse({
      feedback: paginatedFeedback,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    }))
  }),
  
  // Planning API handlers
  ...planningHandlers,
  
  // Dashboard API handlers
  ...dashboardHandlers,
  
  // Notification API handlers
  ...notificationHandlers,
]

// 테스트용 상태 재설정 함수
export const resetMockState = () => {
  mockState.users.length = 1 // 기본 사용자 하나만 유지
  mockState.videos.length = 1 // 기본 비디오 하나만 유지
  mockState.feedback.length = 0
  mockState.processingJobs.clear()
  mockState.processingJobs.set('video-processing-123', { progress: 45, estimatedTime: 300 })
}

// 특정 시나리오를 위한 상태 설정 함수
export const setupMockScenario = (scenario: 'empty' | 'with-data' | 'processing-videos') => {
  resetMockState()
  
  switch (scenario) {
    case 'empty':
      mockState.users.length = 0
      mockState.videos.length = 0
      mockState.feedback.length = 0
      break
      
    case 'with-data':
      // 기본 상태 유지 (이미 데이터가 있음)
      break
      
    case 'processing-videos':
      mockState.videos.forEach(video => {
        video.status = 'processing'
        mockState.processingJobs.set(video.id, { progress: Math.random() * 100, estimatedTime: 300 })
      })
      break
  }
}