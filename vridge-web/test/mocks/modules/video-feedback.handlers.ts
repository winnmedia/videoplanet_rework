/**
 * 영상 피드백 모듈 MSW 핸들러
 */

import { http, HttpResponse, delay } from 'msw'

import { API_BASE_URL } from '../handlers'

// Mock 데이터 - API와 일치하도록 구성
const mockVideoMetadata = {
  id: 'video-001',
  filename: 'brand_promotion_v2.mp4',
  url: '/api/videos/brand_promotion_v2.mp4',
  thumbnail: '/api/videos/thumbnails/brand_promotion_v2.jpg',
  duration: 180,
  fileSize: 52428800,
  format: 'mp4',
  resolution: { width: 1920, height: 1080 },
  uploadedAt: '2025-08-25T14:30:00Z',
  uploadedBy: 'user-editor-001'
}

const mockComments = [
  {
    id: 'comment-001',
    videoId: 'video-001',
    timestamp: 15.5,
    x: 45.2,
    y: 32.1,
    content: '로고 크기가 너무 작습니다',
    author: {
      id: 'user-client-001',
      name: '김클라이언트',
      avatar: '/avatars/client-001.jpg',
      role: 'client'
    },
    createdAt: '2025-08-26T09:15:00Z',
    status: 'open',
    priority: 'high',
    tags: ['로고', '브랜딩']
  }
]

const mockMarkers = [
  {
    id: 'marker-001',
    videoId: 'video-001',
    timestamp: 15.5,
    type: 'rectangle',
    coordinates: { x: 40.0, y: 25.0, width: 15.0, height: 20.0 },
    style: { color: '#ff4444', strokeWidth: 2, opacity: 0.8 },
    linkedCommentId: 'comment-001',
    createdBy: 'user-client-001',
    createdAt: '2025-08-26T09:15:30Z'
  }
]

const mockFeedbackSession = {
  id: 'session-001',
  projectId: 'project-brand-promo',
  videoMetadata: mockVideoMetadata,
  status: 'in_review',
  title: '브랜드 홍보 영상 v2.0 피드백',
  description: '클라이언트 1차 검토 후 수정된 버전입니다',
  version: 'v2.0',
  createdBy: 'user-editor-001',
  createdAt: '2025-08-25T14:30:00Z',
  updatedAt: '2025-08-26T12:00:00Z',
  deadline: '2025-08-28T18:00:00Z',
  reviewers: ['user-client-001', 'user-client-002'],
  comments: mockComments,
  markers: mockMarkers,
  totalComments: 1,
  resolvedComments: 0,
  pendingComments: 1
}

const mockStats = {
  totalSessions: 12,
  activeSessions: 3,
  completedSessions: 9,
  averageResolutionTime: 48,
  commentsByStatus: { open: 15, resolved: 8, archived: 2 },
  commentsByPriority: { low: 3, medium: 12, high: 7, urgent: 3 }
}

export const videoFeedbackHandlers = [
  // 비디오 피드백 세션 조회
  http.get(`${API_BASE_URL}/video-feedback/sessions/:sessionId`, async ({ params }) => {
    const { sessionId } = params
    
    // 테스트 환경에서는 지연 최소화
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }

    if (sessionId === 'session-001' || !sessionId) {
      return HttpResponse.json({
        session: mockFeedbackSession,
        success: true
      })
    }

    if (sessionId === 'not-found') {
      return HttpResponse.json({
        session: {},
        success: false,
        message: '세션을 찾을 수 없습니다.',
        errors: ['SESSION_NOT_FOUND']
      }, { status: 404 })
    }

    if (sessionId === 'network-error') {
      return HttpResponse.json({}, { status: 500 })
    }

    // 기본값
    return HttpResponse.json({
      session: mockFeedbackSession,
      success: true
    })
  }),

  // 피드백 세션 목록 조회
  http.get(`${API_BASE_URL}/video-feedback/sessions`, async () => {
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }
    
    return HttpResponse.json({
      sessions: [mockFeedbackSession],
      total: 1,
      page: 1,
      pageSize: 10,
      hasMore: false
    })
  }),

  // 피드백 통계 조회
  http.get(`${API_BASE_URL}/video-feedback/stats`, async () => {
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }
    
    return HttpResponse.json({
      stats: mockStats,
      success: true
    })
  }),

  // 댓글 추가
  http.post(`${API_BASE_URL}/video-feedback/sessions/:sessionId/comments`, async ({ request, params }) => {
    const { sessionId } = params
    const body = await request.json()
    
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }

    const newComment = {
      ...(typeof body === 'object' && body !== null ? body : {}),
      id: `comment-${Date.now()}`,
      createdAt: new Date().toISOString()
    }

    return HttpResponse.json({
      session: {
        ...mockFeedbackSession,
        comments: [...mockFeedbackSession.comments, newComment]
      },
      success: true,
      message: '코멘트가 추가되었습니다.'
    })
  }),

  // 댓글 업데이트
  http.put(`${API_BASE_URL}/video-feedback/sessions/:sessionId/comments/:commentId`, async ({ request, params }) => {
    const { sessionId, commentId } = params
    const updates = await request.json()
    
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }

    return HttpResponse.json({
      session: mockFeedbackSession,
      success: true,
      message: '코멘트가 업데이트되었습니다.'
    })
  }),

  // 기타 프로젝트 목록 (기존 유지)
  http.get(`${API_BASE_URL}/feedback/projects`, async () => {
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }
    return HttpResponse.json({ projects: [], total: 0 })
  })
]

export const videoFeedbackTestUtils = {
  clearFeedback: () => {},
  getMockSession: () => mockFeedbackSession,
  getMockStats: () => mockStats
}