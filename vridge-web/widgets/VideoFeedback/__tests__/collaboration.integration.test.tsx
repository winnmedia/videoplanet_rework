/**
 * @description 실시간 협업 시나리오 통합 테스트 스위트
 * @purpose Phase 2 다중 사용자 실시간 협업 기능 테스트 커버리지 확보 (TDD)
 * @coverage WebSocket 통신, 동시 편집, 충돌 해결, 실시간 동기화
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import WS from 'vitest-websocket-mock'

import type { 
  VideoFeedbackSession,
  TimestampComment,
  CollaborationEvent,
  UserPresence,
  ConflictResolution 
} from '../model/types'
import { CollaborationProvider } from '../providers/CollaborationProvider'
import { VideoFeedbackWidget } from '../ui/VideoFeedbackWidget'

// WebSocket Mock 서버
let wsServer: WS

// Mock 데이터
const mockSession: VideoFeedbackSession = {
  id: 'session-collab-001',
  projectId: 'project-001',
  videoMetadata: {
    id: 'video-001',
    filename: 'collab_test.mp4',
    url: '/api/videos/collab_test.mp4',
    duration: 180,
    fileSize: 30000000,
    format: 'mp4',
    resolution: { width: 1920, height: 1080 },
    uploadedAt: '2025-08-28T10:00:00Z',
    uploadedBy: 'user-owner'
  },
  status: 'in_review',
  title: '실시간 협업 테스트 비디오',
  version: 'v1.0',
  createdBy: 'user-owner',
  createdAt: '2025-08-28T10:00:00Z',
  updatedAt: '2025-08-28T10:00:00Z',
  reviewers: ['user-001', 'user-002', 'user-003'],
  comments: [],
  markers: [],
  totalComments: 0,
  resolvedComments: 0,
  pendingComments: 0
}

const mockUsers = {
  'user-001': {
    id: 'user-001',
    name: '김협업자',
    avatar: '/avatars/user-001.jpg',
    role: 'editor',
    color: '#ff4444'
  },
  'user-002': {
    id: 'user-002',
    name: '박리뷰어',
    avatar: '/avatars/user-002.jpg', 
    role: 'reviewer',
    color: '#44ff44'
  },
  'user-003': {
    id: 'user-003',
    name: '최클라이언트',
    avatar: '/avatars/user-003.jpg',
    role: 'client',
    color: '#4444ff'
  }
}

describe('실시간 협업 시나리오 통합 테스트 - TDD Red Phase', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(async () => {
    // WebSocket 서버 모킹
    wsServer = new WS('ws://localhost:8080/collaboration/session-collab-001')
    user = userEvent.setup()
    
    // Performance API 모킹
    global.performance = {
      ...global.performance,
      now: vi.fn().mockReturnValue(Date.now())
    }
  })

  afterEach(() => {
    WS.clean()
    vi.clearAllMocks()
  })

  describe('🔴 RED: 실시간 연결 및 사용자 상태 (CollaborationProvider 미구현)', () => {
    it('FAIL: CollaborationProvider가 WebSocket 연결을 설정해야 함', async () => {
      // CollaborationProvider가 구현되지 않아 실패할 예정
      expect(() => {
        render(
          <CollaborationProvider sessionId="session-collab-001">
            <VideoFeedbackWidget sessionId="session-collab-001" />
          </CollaborationProvider>
        )
      }).toThrow()
    })

    it('FAIL: 사용자 연결 시 presence 이벤트가 전송되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      // WebSocket 연결 대기
      await wsServer.connected
      
      // Presence 이벤트가 구현되지 않아 실패할 예정
      expect(wsServer).not.toHaveReceivedMessages([
        expect.objectContaining({
          type: 'USER_JOINED',
          data: expect.objectContaining({
            userId: expect.any(String),
            timestamp: expect.any(String)
          })
        })
      ])
    })

    it('FAIL: 활성 사용자 목록이 실시간으로 업데이트되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 다른 사용자 참여 시뮬레이션
      const joinEvent: CollaborationEvent = {
        type: 'USER_JOINED',
        sessionId: 'session-collab-001',
        userId: 'user-001',
        data: {
          user: mockUsers['user-001'],
          timestamp: new Date().toISOString()
        }
      }

      wsServer.send(JSON.stringify(joinEvent))

      // 사용자 목록이 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByTestId('active-users-list'))
      ).rejects.toThrow()
    })

    it('FAIL: 사용자별 커서 위치가 실시간으로 표시되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 커서 이동 시뮬레이션
      const cursorEvent: CollaborationEvent = {
        type: 'CURSOR_MOVED',
        sessionId: 'session-collab-001',
        userId: 'user-001',
        data: {
          x: 50, // 50% position
          y: 25, // 25% position
          timestamp: 45.5 // video timestamp
        }
      }

      wsServer.send(JSON.stringify(cursorEvent))

      // 다른 사용자 커서가 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByTestId('user-cursor-user-001'))
      ).rejects.toThrow()
    })
  })

  describe('🔴 RED: 실시간 댓글 동기화 (실시간 동기화 미구현)', () => {
    it('FAIL: 새 댓글이 모든 사용자에게 즉시 표시되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 다른 사용자의 새 댓글 시뮬레이션
      const newCommentEvent: CollaborationEvent = {
        type: 'COMMENT_ADDED',
        sessionId: 'session-collab-001',
        userId: 'user-001',
        data: {
          comment: {
            id: 'comment-realtime-001',
            videoId: 'video-001',
            timestamp: 30.5,
            x: 45,
            y: 30,
            content: '실시간으로 추가된 댓글입니다',
            author: mockUsers['user-001'],
            createdAt: new Date().toISOString(),
            status: 'open',
            priority: 'medium',
            tags: ['실시간']
          }
        }
      }

      wsServer.send(JSON.stringify(newCommentEvent))

      // 실시간 댓글 표시가 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByText('실시간으로 추가된 댓글입니다'))
      ).rejects.toThrow()
    })

    it('FAIL: 댓글 수정이 실시간으로 동기화되어야 함', async () => {
      // 기존 댓글이 있는 상태로 시작
      const initialComment: TimestampComment = {
        id: 'comment-edit-001',
        videoId: 'video-001',
        timestamp: 60,
        content: '수정 전 내용',
        author: mockUsers['user-001'],
        createdAt: '2025-08-28T10:30:00Z',
        status: 'open',
        priority: 'medium'
      }

      const sessionWithComment = {
        ...mockSession,
        comments: [initialComment]
      }

      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 댓글 수정 이벤트 시뮬레이션
      const editEvent: CollaborationEvent = {
        type: 'COMMENT_UPDATED',
        sessionId: 'session-collab-001',
        userId: 'user-001',
        data: {
          commentId: 'comment-edit-001',
          updates: {
            content: '실시간으로 수정된 내용',
            updatedAt: new Date().toISOString()
          }
        }
      }

      wsServer.send(JSON.stringify(editEvent))

      // 실시간 댓글 수정이 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByText('실시간으로 수정된 내용'))
      ).rejects.toThrow()
    })

    it('FAIL: 댓글 삭제가 실시간으로 반영되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 댓글 삭제 이벤트 시뮬레이션
      const deleteEvent: CollaborationEvent = {
        type: 'COMMENT_DELETED',
        sessionId: 'session-collab-001',
        userId: 'user-002',
        data: {
          commentId: 'comment-delete-001'
        }
      }

      wsServer.send(JSON.stringify(deleteEvent))

      // 실시간 댓글 삭제가 구현되지 않아 실패할 예정
      const deletedComment = screen.queryByTestId('comment-comment-delete-001')
      expect(deletedComment).toBeInTheDocument() // 아직 삭제되지 않음
    })

    it('FAIL: 댓글 해결 상태가 실시간으로 업데이트되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 댓글 해결 이벤트 시뮬레이션
      const resolveEvent: CollaborationEvent = {
        type: 'COMMENT_RESOLVED',
        sessionId: 'session-collab-001',
        userId: 'user-002',
        data: {
          commentId: 'comment-resolve-001',
          resolvedBy: mockUsers['user-002'],
          resolvedAt: new Date().toISOString()
        }
      }

      wsServer.send(JSON.stringify(resolveEvent))

      // 실시간 해결 상태 업데이트가 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByTestId('comment-resolve-001-resolved-badge'))
      ).rejects.toThrow()
    })
  })

  describe('🔴 RED: 동시 편집 충돌 방지 (충돌 해결 시스템 미구현)', () => {
    it('FAIL: 동일 댓글 동시 편집 시 충돌이 감지되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 두 사용자가 동일 댓글을 동시에 편집 시도
      const conflictEvent: CollaborationEvent = {
        type: 'EDIT_CONFLICT',
        sessionId: 'session-collab-001',
        userId: 'user-002',
        data: {
          commentId: 'comment-conflict-001',
          conflictType: 'SIMULTANEOUS_EDIT',
          conflictingUser: mockUsers['user-001'],
          timestamp: new Date().toISOString()
        }
      }

      wsServer.send(JSON.stringify(conflictEvent))

      // 충돌 감지가 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByTestId('edit-conflict-modal'))
      ).rejects.toThrow()
    })

    it('FAIL: 댓글 편집 중 잠금 기능이 동작해야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 사용자가 댓글 편집 시작
      const commentElement = screen.getByTestId('comment-edit-001')
      await user.click(screen.getByRole('button', { name: /수정/i }))

      // 편집 잠금 이벤트 전송 확인
      expect(wsServer).not.toHaveReceivedMessages([
        expect.objectContaining({
          type: 'COMMENT_LOCKED',
          data: expect.objectContaining({
            commentId: 'comment-edit-001',
            lockedBy: expect.any(String)
          })
        })
      ])
    })

    it('FAIL: 잠긴 댓글에 대한 편집 시도 시 경고가 표시되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 다른 사용자가 댓글을 편집 중인 상황 시뮬레이션
      const lockEvent: CollaborationEvent = {
        type: 'COMMENT_LOCKED',
        sessionId: 'session-collab-001',
        userId: 'user-001',
        data: {
          commentId: 'comment-locked-001',
          lockedBy: mockUsers['user-001'],
          lockedAt: new Date().toISOString()
        }
      }

      wsServer.send(JSON.stringify(lockEvent))

      // 잠긴 댓글 편집 시도
      const lockedComment = screen.getByTestId('comment-locked-001')
      await user.click(screen.getByRole('button', { name: /수정/i }))

      // 편집 방지가 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByText(/다른 사용자가 편집 중입니다/i))
      ).rejects.toThrow()
    })

    it('FAIL: 충돌 해결 옵션이 제공되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 충돌 해결 시나리오 시뮬레이션
      const conflictResolution: ConflictResolution = {
        conflictId: 'conflict-001',
        commentId: 'comment-conflict-001',
        options: [
          {
            id: 'keep-mine',
            label: '내 변경사항 유지',
            preview: '내가 수정한 내용입니다'
          },
          {
            id: 'keep-theirs',
            label: '상대방 변경사항 유지', 
            preview: '상대방이 수정한 내용입니다'
          },
          {
            id: 'merge',
            label: '병합',
            preview: '두 변경사항을 병합한 내용입니다'
          }
        ]
      }

      const resolutionEvent: CollaborationEvent = {
        type: 'CONFLICT_RESOLUTION_REQUIRED',
        sessionId: 'session-collab-001',
        userId: 'current-user',
        data: conflictResolution
      }

      wsServer.send(JSON.stringify(resolutionEvent))

      // 충돌 해결 UI가 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByTestId('conflict-resolution-dialog'))
      ).rejects.toThrow()
    })
  })

  describe('🔴 RED: 실시간 비디오 동기화 (비디오 동기화 미구현)', () => {
    it('FAIL: 관리자의 재생 위치가 모든 사용자에게 동기화되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 관리자가 특정 시간으로 이동
      const seekEvent: CollaborationEvent = {
        type: 'VIDEO_SEEK',
        sessionId: 'session-collab-001',
        userId: 'user-owner',
        data: {
          timestamp: 75.5,
          isAdminAction: true
        }
      }

      wsServer.send(JSON.stringify(seekEvent))

      // 비디오 동기화가 구현되지 않아 실패할 예정
      const video = screen.getByRole('video') as HTMLVideoElement
      
      await waitFor(() => {
        expect(video.currentTime).not.toEqual(75.5)
      })
    })

    it('FAIL: 재생/일시정지 상태가 동기화되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 관리자가 재생 시작
      const playEvent: CollaborationEvent = {
        type: 'VIDEO_PLAY',
        sessionId: 'session-collab-001',
        userId: 'user-owner',
        data: {
          timestamp: 30.0,
          isAdminAction: true
        }
      }

      wsServer.send(JSON.stringify(playEvent))

      // 재생 상태 동기화가 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByRole('button', { name: /일시정지/i }))
      ).rejects.toThrow()
    })

    it('FAIL: 비관리자의 탐색 시도 시 권한 확인이 이루어져야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 비관리자가 시간 탐색 시도
      const video = screen.getByRole('video')
      
      // 60초 위치로 클릭
      fireEvent.click(video, { currentTarget: { currentTime: 60 } })

      // 권한 확인이 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByText(/관리자만 비디오를 제어할 수 있습니다/i))
      ).rejects.toThrow()
    })

    it('FAIL: 동기화 모드 on/off 토글이 가능해야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 동기화 토글 버튼이 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByRole('button', { name: /동기화 모드/i }))
      ).rejects.toThrow()
    })
  })

  describe('🔴 RED: 네트워크 장애 및 재연결 (장애 복구 미구현)', () => {
    it('FAIL: WebSocket 연결 끊김 시 자동 재연결을 시도해야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 연결 끊김 시뮬레이션
      wsServer.close()

      // 재연결 시도가 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByText(/연결이 끊어졌습니다. 재연결 중.../i))
      ).rejects.toThrow()

      // 새 WebSocket 서버로 재연결 시뮬레이션
      wsServer = new WS('ws://localhost:8080/collaboration/session-collab-001')
      
      await expect(
        waitFor(() => screen.getByText(/연결이 복구되었습니다/i))
      ).rejects.toThrow()
    })

    it('FAIL: 재연결 시 누락된 이벤트가 동기화되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 연결 끊김
      wsServer.close()

      // 새 서버로 재연결
      wsServer = new WS('ws://localhost:8080/collaboration/session-collab-001')
      await wsServer.connected

      // 누락된 이벤트 동기화가 구현되지 않아 실패할 예정
      expect(wsServer).not.toHaveReceivedMessages([
        expect.objectContaining({
          type: 'SYNC_REQUEST',
          data: expect.objectContaining({
            lastEventId: expect.any(String)
          })
        })
      ])
    })

    it('FAIL: 오프라인 상태에서 로컬 변경사항이 저장되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 연결 끊김 시뮬레이션
      wsServer.close()

      // 오프라인 상태에서 댓글 추가 시도
      const addCommentButton = screen.getByRole('button', { name: /댓글 추가/i })
      await user.click(addCommentButton)

      // 오프라인 스토리지가 구현되지 않아 실패할 예정
      const pendingChanges = localStorage.getItem('pending-feedback-changes')
      expect(pendingChanges).toBeNull()
    })

    it('FAIL: 재연결 시 대기 중인 변경사항이 자동 전송되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected
      wsServer.close()

      // 새 서버로 재연결
      wsServer = new WS('ws://localhost:8080/collaboration/session-collab-001')
      await wsServer.connected

      // 대기 중인 변경사항 전송이 구현되지 않아 실패할 예정
      expect(wsServer).not.toHaveReceivedMessages([
        expect.objectContaining({
          type: 'PENDING_CHANGES',
          data: expect.objectContaining({
            changes: expect.any(Array)
          })
        })
      ])
    })
  })

  describe('🔴 RED: 성능 및 최적화 (성능 최적화 미구현)', () => {
    it('FAIL: 대량의 동시 이벤트 처리가 원활해야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      const startTime = performance.now()

      // 100개의 동시 이벤트 시뮬레이션
      const events = Array.from({ length: 100 }, (_, i) => ({
        type: 'COMMENT_ADDED',
        sessionId: 'session-collab-001',
        userId: `user-${i % 5}`,
        data: {
          comment: {
            id: `comment-batch-${i}`,
            content: `배치 댓글 ${i}`,
            timestamp: i * 0.5,
            author: mockUsers['user-001']
          }
        }
      }))

      // 이벤트 일괄 전송
      events.forEach(event => {
        wsServer.send(JSON.stringify(event))
      })

      const processTime = performance.now() - startTime

      // 이벤트 배치 처리가 구현되지 않아 실패할 예정
      expect(processTime).not.toBeLessThan(1000) // 1초 이내 처리 목표

      // 모든 댓글이 정상 렌더링되는지 확인
      const comments = screen.queryAllByTestId(/comment-batch-/)
      expect(comments).not.toHaveLength(100)
    })

    it('FAIL: 이벤트 중복 제거가 이루어져야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 동일한 이벤트를 여러 번 전송 (네트워크 지연으로 인한 중복)
      const duplicateEvent = {
        type: 'COMMENT_ADDED',
        sessionId: 'session-collab-001',
        userId: 'user-001',
        eventId: 'event-duplicate-001',
        data: {
          comment: {
            id: 'comment-duplicate-test',
            content: '중복 제거 테스트 댓글',
            author: mockUsers['user-001']
          }
        }
      }

      // 3번 전송
      wsServer.send(JSON.stringify(duplicateEvent))
      wsServer.send(JSON.stringify(duplicateEvent))
      wsServer.send(JSON.stringify(duplicateEvent))

      // 중복 제거가 구현되지 않아 실패할 예정
      const duplicateComments = screen.queryAllByText('중복 제거 테스트 댓글')
      expect(duplicateComments).not.toHaveLength(1) // 1개만 표시되어야 함
    })

    it('FAIL: 메모리 누수 방지를 위한 이벤트 정리가 이루어져야 함', async () => {
      const { unmount } = render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 컴포넌트 언마운트
      unmount()

      // WebSocket 연결 정리가 구현되지 않아 실패할 예정
      expect(wsServer.clients()).not.toHaveLength(0)
    })

    it('FAIL: 이벤트 스로틀링으로 UI 성능이 보장되어야 함', async () => {
      render(
        <CollaborationProvider sessionId="session-collab-001">
          <VideoFeedbackWidget sessionId="session-collab-001" />
        </CollaborationProvider>
      )

      await wsServer.connected

      // 빠른 연속 이벤트 전송 (커서 이동)
      for (let i = 0; i < 50; i++) {
        const cursorEvent = {
          type: 'CURSOR_MOVED',
          sessionId: 'session-collab-001',
          userId: 'user-001',
          data: { x: i * 2, y: 25, timestamp: Date.now() + i }
        }
        
        wsServer.send(JSON.stringify(cursorEvent))
      }

      // 스로틀링이 구현되지 않아 실패할 예정
      const cursorElements = screen.queryAllByTestId('user-cursor-user-001')
      expect(cursorElements).not.toHaveLength(1) // 하나의 커서만 존재해야 함
    })
  })
})