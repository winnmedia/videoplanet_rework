/**
 * VideoFeedback 위젯 간단한 테스트 (타임아웃 문제 해결)
 */

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { VideoFeedbackWidget } from './VideoFeedbackWidget'
import { VideoFeedbackApi } from '../api/videoFeedbackApi'

// VideoFeedbackApi 모킹
vi.mock('../api/videoFeedbackApi', () => ({
  VideoFeedbackApi: {
    getSession: vi.fn(),
    getStats: vi.fn(),
    formatTimestamp: vi.fn((seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`),
  }
}))

const mockSession = {
  id: 'session-001',
  projectId: 'project-001',
  title: '테스트 비디오 피드백',
  version: 'v1.0',
  status: 'in_review' as const,
  videoMetadata: {
    id: 'video-001',
    filename: 'test.mp4',
    url: '/test.mp4',
    duration: 120,
    fileSize: 1000000,
    format: 'mp4',
    resolution: { width: 1920, height: 1080 },
    uploadedAt: '2025-01-01T00:00:00Z',
    uploadedBy: 'user-001'
  },
  comments: [],
  markers: [],
  totalComments: 0,
  resolvedComments: 0,
  pendingComments: 0,
  createdBy: 'user-001',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  reviewers: []
}

describe('VideoFeedbackWidget (Simple)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const mockApi = vi.mocked(VideoFeedbackApi)
    mockApi.getSession.mockResolvedValue({
      success: true,
      session: mockSession
    })
    mockApi.getStats.mockResolvedValue({
      stats: {
        totalComments: 0,
        resolvedComments: 0,
        pendingComments: 0
      }
    })
  })

  it('렌더링이 성공해야 함', async () => {
    render(<VideoFeedbackWidget sessionId="session-001" />)
    
    // 초기 로딩 상태 확인
    expect(screen.getByTestId('video-feedback-loading')).toBeInTheDocument()
    
    // 메인 위젯 렌더링 대기
    await waitFor(() => {
      expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('세션 제목이 표시되어야 함', async () => {
    render(<VideoFeedbackWidget sessionId="session-001" />)
    
    await waitFor(() => {
      expect(screen.getByText('테스트 비디오 피드백')).toBeInTheDocument()
    })
  })

  it('비디오 플레이어가 렌더링되어야 함', async () => {
    render(<VideoFeedbackWidget sessionId="session-001" />)
    
    await waitFor(() => {
      expect(screen.getByTestId('video-player')).toBeInTheDocument()
    })
  })
})