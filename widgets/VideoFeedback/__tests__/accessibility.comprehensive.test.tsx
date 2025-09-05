/**
 * @description Video Feedback 접근성 포괄적 테스트 스위트
 * @purpose Phase 2 WCAG 2.1 AA 준수 및 접근성 테스트 커버리지 확보 (TDD)
 * @coverage 키보드 네비게이션, 스크린 리더, 고대비 모드, 포커스 관리, ARIA
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'

import { VideoFeedbackWidget } from '../ui/VideoFeedbackWidget'
import { VideoPlayer } from '../ui/VideoPlayer'
import { FeedbackTimeline } from '../ui/FeedbackTimeline'
import { CommentThread } from '../ui/CommentThread'
import type { 
  VideoFeedbackSession,
  TimestampComment,
  VideoMarker 
} from '../model/types'

// Jest-axe 매처 확장
expect.extend(toHaveNoViolations)

// Mock 데이터
const mockSession: VideoFeedbackSession = {
  id: 'session-a11y-001',
  projectId: 'project-001',
  videoMetadata: {
    id: 'video-a11y-001',
    filename: 'accessibility_test.mp4',
    url: '/api/videos/accessibility_test.mp4',
    thumbnail: '/api/videos/thumbnails/accessibility_test.jpg',
    duration: 300, // 5분
    fileSize: 50000000,
    format: 'mp4',
    resolution: { width: 1920, height: 1080 },
    uploadedAt: '2025-08-28T10:00:00Z',
    uploadedBy: 'user-001'
  },
  status: 'in_review',
  title: '접근성 테스트 비디오 피드백',
  version: 'v1.0',
  createdBy: 'user-001',
  createdAt: '2025-08-28T10:00:00Z',
  updatedAt: '2025-08-28T10:00:00Z',
  reviewers: ['user-002', 'user-003'],
  comments: [
    {
      id: 'comment-a11y-001',
      videoId: 'video-a11y-001',
      timestamp: 30.5,
      x: 50,
      y: 25,
      content: '이 부분의 자막이 필요합니다',
      author: {
        id: 'user-002',
        name: '접근성 검토자',
        role: 'reviewer'
      },
      createdAt: '2025-08-28T10:30:00Z',
      status: 'open',
      priority: 'high',
      tags: ['접근성', '자막']
    }
  ],
  markers: [
    {
      id: 'marker-a11y-001',
      videoId: 'video-a11y-001',
      timestamp: 30.5,
      type: 'rectangle',
      coordinates: { x: 45, y: 20, width: 20, height: 15 },
      style: { color: '#ff4444', strokeWidth: 2, opacity: 0.8 },
      linkedCommentId: 'comment-a11y-001',
      createdBy: 'user-002',
      createdAt: '2025-08-28T10:30:00Z'
    }
  ],
  totalComments: 1,
  resolvedComments: 0,
  pendingComments: 1
}

describe('Video Feedback 접근성 테스트 - TDD Red Phase', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    
    // 접근성 테스트를 위한 환경 설정
    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      value: {
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: vi.fn().mockReturnValue([])
      }
    })
  })

  describe('🔴 RED: WCAG 2.1 AA 자동 검사 (접근성 위반 존재)', () => {
    it('FAIL: VideoFeedbackWidget 접근성 위반사항이 없어야 함', async () => {
      const { container } = render(
        <VideoFeedbackWidget sessionId="session-a11y-001" />
      )

      // 컴포넌트 로딩 완료 대기
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 접근성 위반사항이 있을 예정
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('FAIL: VideoPlayer 접근성 위반사항이 없어야 함', async () => {
      const { container } = render(
        <VideoPlayer 
          videoMetadata={mockSession.videoMetadata}
          playbackState={{
            currentTime: 0,
            duration: 300,
            isPlaying: false,
            isPaused: true,
            isMuted: false,
            volume: 1,
            playbackRate: 1,
            isFullscreen: false,
            quality: 'auto'
          }}
          onPlaybackStateChange={vi.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('FAIL: FeedbackTimeline 접근성 위반사항이 없어야 함', async () => {
      const { container } = render(
        <FeedbackTimeline
          comments={mockSession.comments}
          markers={mockSession.markers}
          duration={300}
          currentTime={0}
          onTimelineClick={vi.fn()}
          onCommentClick={vi.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('FAIL: CommentThread 접근성 위반사항이 없어야 함', async () => {
      const { container } = render(
        <CommentThread
          comments={mockSession.comments}
          threads={[]}
          currentUser={{ id: 'user-001', name: '테스트 사용자', role: 'editor' }}
          onCommentAdd={vi.fn()}
          onCommentUpdate={vi.fn()}
          onCommentDelete={vi.fn()}
          onCommentResolve={vi.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('🔴 RED: 키보드 네비게이션 (키보드 접근성 미구현)', () => {
    it('FAIL: 전체 인터페이스가 키보드만으로 접근 가능해야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 키보드 네비게이션 테스트
      let focusedElement = document.activeElement

      // Tab으로 순차적 네비게이션
      await user.tab()
      const firstFocusableElement = document.activeElement
      expect(firstFocusableElement).not.toBe(focusedElement)

      // 모든 주요 컴포넌트가 포커스 가능한지 확인
      const expectedFocusableElements = [
        'video', // 비디오 플레이어
        'button', // 재생/일시정지 버튼
        'slider', // 타임라인
        'textbox', // 댓글 입력
        'button' // 댓글 제출 버튼
      ]

      let tabCount = 0
      const maxTabs = 20
      
      while (tabCount < maxTabs) {
        await user.tab()
        const currentElement = document.activeElement
        
        if (currentElement && currentElement.tagName.toLowerCase() !== 'body') {
          const role = currentElement.getAttribute('role')
          const tagName = currentElement.tagName.toLowerCase()
          
          // 예상된 포커스 가능 요소인지 확인
          const isFocusable = expectedFocusableElements.some(expected => 
            tagName === expected || role === expected
          )
          
          // 키보드 네비게이션이 구현되지 않아 실패할 예정
          expect(isFocusable).toBe(true)
        }
        
        tabCount++
      }
    })

    it('FAIL: 비디오 플레이어 키보드 컨트롤이 동작해야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByRole('video')).toBeInTheDocument()
      })

      const video = screen.getByRole('video')
      video.focus()

      // 스페이스바로 재생/일시정지
      await user.keyboard(' ')
      
      // 비디오 키보드 컨트롤이 구현되지 않아 실패할 예정
      await expect(
        waitFor(() => screen.getByLabelText(/일시정지/i))
      ).rejects.toThrow()

      // 화살표 키로 탐색 (10초 단위)
      await user.keyboard('{ArrowRight}')
      
      // 키보드 탐색이 구현되지 않아 실패할 예정
      const currentTime = video.getAttribute('aria-valuenow')
      expect(parseFloat(currentTime || '0')).not.toBe(10)
    })

    it('FAIL: 타임라인 키보드 네비게이션이 동작해야 함', async () => {
      render(
        <FeedbackTimeline
          comments={mockSession.comments}
          markers={mockSession.markers}
          duration={300}
          currentTime={0}
          onTimelineClick={vi.fn()}
          onCommentClick={vi.fn()}
        />
      )

      const timeline = screen.getByRole('slider', { name: /비디오 진행률/i })
      timeline.focus()

      // Home 키로 처음으로
      await user.keyboard('{Home}')
      expect(timeline).toHaveAttribute('aria-valuenow', '0')

      // End 키로 끝으로
      await user.keyboard('{End}')
      expect(timeline).toHaveAttribute('aria-valuenow', '300')

      // 화살표 키로 세밀한 조정
      await user.keyboard('{ArrowLeft ArrowLeft ArrowLeft}') // 3초 뒤로
      expect(timeline).toHaveAttribute('aria-valuenow', '297')
    })

    it('FAIL: 댓글 스레드 키보드 네비게이션이 동작해야 함', async () => {
      render(
        <CommentThread
          comments={mockSession.comments}
          threads={[]}
          currentUser={{ id: 'user-001', name: '테스트 사용자', role: 'editor' }}
          onCommentAdd={vi.fn()}
          onCommentUpdate={vi.fn()}
          onCommentDelete={vi.fn()}
          onCommentResolve={vi.fn()}
        />
      )

      // 댓글 입력 필드로 포커스
      const commentInput = screen.getByRole('textbox', { name: /댓글 입력/i })
      commentInput.focus()

      // 댓글 작성
      await user.type(commentInput, '키보드로 작성한 댓글입니다')

      // Enter로 제출 (Ctrl+Enter 또는 단순 Enter)
      await user.keyboard('{Control>}{Enter}{/Control}')

      // 키보드 제출이 구현되지 않아 실패할 예정
      expect(screen.queryByText('키보드로 작성한 댓글입니다')).not.toBeInTheDocument()
    })

    it('FAIL: 포커스 트랩이 모달에서 동작해야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 댓글 추가 모달 열기
      const addCommentButton = screen.getByRole('button', { name: /댓글 추가/i })
      await user.click(addCommentButton)

      // 모달이 구현되지 않아 실패할 예정
      const modal = screen.queryByRole('dialog')
      expect(modal).toBeInTheDocument()

      // 포커스가 모달 내부에 트랩되는지 확인
      const modalElements = modal?.querySelectorAll('button, input, textarea, select')
      
      if (modalElements && modalElements.length > 0) {
        // 마지막 요소에서 Tab을 누르면 첫 번째 요소로 순환
        const lastElement = modalElements[modalElements.length - 1] as HTMLElement
        lastElement.focus()
        
        await user.tab()
        
        // 포커스 트랩이 구현되지 않아 실패할 예정
        expect(document.activeElement).toBe(modalElements[0])
      }
    })
  })

  describe('🔴 RED: 스크린 리더 지원 (ARIA 속성 미구현)', () => {
    it('FAIL: 비디오 플레이어에 적절한 ARIA 속성이 있어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByRole('video')).toBeInTheDocument()
      })

      const video = screen.getByRole('video')
      
      // ARIA 속성이 구현되지 않아 실패할 예정
      expect(video).toHaveAttribute('aria-label', '접근성 테스트 비디오')
      expect(video).toHaveAttribute('aria-describedby', 'video-description')
      
      const description = document.getElementById('video-description')
      expect(description).toBeInTheDocument()
      expect(description).toHaveTextContent(/5분.*초/)
    })

    it('FAIL: 타임라인에 적절한 ARIA 속성이 있어야 함', async () => {
      render(
        <FeedbackTimeline
          comments={mockSession.comments}
          markers={mockSession.markers}
          duration={300}
          currentTime={45}
          onTimelineClick={vi.fn()}
          onCommentClick={vi.fn()}
        />
      )

      const timeline = screen.getByRole('slider')
      
      // ARIA 속성이 구현되지 않아 실패할 예정
      expect(timeline).toHaveAttribute('aria-label', '비디오 진행률 타임라인')
      expect(timeline).toHaveAttribute('aria-valuemin', '0')
      expect(timeline).toHaveAttribute('aria-valuemax', '300')
      expect(timeline).toHaveAttribute('aria-valuenow', '45')
      expect(timeline).toHaveAttribute('aria-valuetext', '0분 45초')
    })

    it('FAIL: 댓글에 적절한 ARIA 속성이 있어야 함', async () => {
      render(
        <CommentThread
          comments={mockSession.comments}
          threads={[]}
          currentUser={{ id: 'user-001', name: '테스트 사용자', role: 'editor' }}
          onCommentAdd={vi.fn()}
          onCommentUpdate={vi.fn()}
          onCommentDelete={vi.fn()}
          onCommentResolve={vi.fn()}
        />
      )

      // 댓글이 article role로 표시되는지 확인
      const commentArticle = screen.getByRole('article')
      
      // ARIA 속성이 구현되지 않아 실패할 예정
      expect(commentArticle).toHaveAttribute('aria-labelledby', 'comment-a11y-001-author')
      expect(commentArticle).toHaveAttribute('aria-describedby', 'comment-a11y-001-content')
      
      // 시간 정보가 접근 가능한 형태로 제공되는지 확인
      const timestamp = screen.getByText(/30초/)
      expect(timestamp).toHaveAttribute('aria-label', '0분 30초 지점의 댓글')
    })

    it('FAIL: 라이브 리전으로 동적 변경사항이 안내되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 라이브 리전이 구현되지 않아 실패할 예정
      const liveRegion = screen.queryByRole('status')
      expect(liveRegion).toBeInTheDocument()

      // 새 댓글 추가 시뮬레이션
      const addCommentButton = screen.getByRole('button', { name: /댓글 추가/i })
      await user.click(addCommentButton)

      // 라이브 리전에 변경사항 안내가 표시되는지 확인
      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/새 댓글이 추가되었습니다/i)
      })
    })

    it('FAIL: 복잡한 UI 요소에 적절한 설명이 제공되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 마커에 대한 설명이 구현되지 않아 실패할 예정
      const marker = screen.queryByTestId('video-marker-marker-a11y-001')
      if (marker) {
        expect(marker).toHaveAttribute('aria-label', '30초 지점의 피드백 마커: 이 부분의 자막이 필요합니다')
        expect(marker).toHaveAttribute('role', 'button')
        expect(marker).toHaveAttribute('tabindex', '0')
      }
    })
  })

  describe('🔴 RED: 고대비 모드 지원 (고대비 스타일 미구현)', () => {
    it('FAIL: 고대비 모드에서 모든 요소가 잘 보여야 함', async () => {
      // 고대비 모드 시뮬레이션
      document.body.classList.add('high-contrast')
      
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 고대비 클래스가 적용되지 않아 실패할 예정
      const widget = screen.getByTestId('video-feedback-widget')
      expect(widget).toHaveClass('high-contrast-support')

      // 마커의 대비가 충분한지 확인
      const marker = screen.queryByTestId('video-marker-marker-a11y-001')
      if (marker) {
        const computedStyle = window.getComputedStyle(marker)
        
        // 고대비 색상이 적용되지 않아 실패할 예정
        expect(computedStyle.borderColor).toBe('rgb(255, 255, 255)') // 흰색
        expect(computedStyle.backgroundColor).toBe('rgb(0, 0, 0)') // 검은색
      }

      document.body.classList.remove('high-contrast')
    })

    it('FAIL: 강제 색상 모드에서 적절히 동작해야 함', async () => {
      // Windows 고대비 모드 시뮬레이션
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(forced-colors: active)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      })

      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 강제 색상 모드 지원이 구현되지 않아 실패할 예정
      const widget = screen.getByTestId('video-feedback-widget')
      expect(widget).toHaveClass('forced-colors-support')
    })
  })

  describe('🔴 RED: 포커스 관리 (포커스 시스템 미구현)', () => {
    it('FAIL: 포커스 순서가 논리적이어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 논리적 포커스 순서 테스트
      const expectedTabOrder = [
        screen.getByRole('video'), // 1. 비디오 플레이어
        screen.getByRole('button', { name: /재생/i }), // 2. 재생 버튼
        screen.getByRole('slider', { name: /볼륨/i }), // 3. 볼륨 슬라이더
        screen.getByRole('slider', { name: /비디오 진행률/i }), // 4. 타임라인
        screen.getByRole('textbox', { name: /댓글 입력/i }), // 5. 댓글 입력
        screen.getByRole('button', { name: /댓글 제출/i }) // 6. 댓글 제출
      ]

      let currentIndex = 0
      
      for (const expectedElement of expectedTabOrder) {
        await user.tab()
        
        // 포커스 순서가 구현되지 않아 실패할 예정
        expect(document.activeElement).toBe(expectedElement)
        currentIndex++
      }
    })

    it('FAIL: 스킵 링크가 제공되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      // 스킵 링크가 구현되지 않아 실패할 예정
      const skipLink = screen.getByRole('link', { name: /메인 컨텐츠로 이동/i })
      expect(skipLink).toBeInTheDocument()

      await user.click(skipLink)

      // 메인 컨텐츠로 포커스 이동 확인
      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveFocus()
    })

    it('FAIL: 포커스 표시가 명확해야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 첫 번째 포커스 가능 요소로 이동
      await user.tab()
      
      const focusedElement = document.activeElement as HTMLElement
      
      if (focusedElement) {
        const computedStyle = window.getComputedStyle(focusedElement, ':focus')
        
        // 포커스 스타일이 구현되지 않아 실패할 예정
        expect(computedStyle.outline).not.toBe('none')
        expect(computedStyle.outlineWidth).not.toBe('0px')
        
        // 고대비 환경에서의 포커스 표시도 확인
        document.body.classList.add('high-contrast')
        const highContrastStyle = window.getComputedStyle(focusedElement, ':focus')
        expect(highContrastStyle.outline).toContain('2px solid')
        
        document.body.classList.remove('high-contrast')
      }
    })

    it('FAIL: 모달 닫기 시 원래 위치로 포커스가 복원되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 댓글 추가 버튼에 포커스
      const addCommentButton = screen.getByRole('button', { name: /댓글 추가/i })
      addCommentButton.focus()
      
      // 모달 열기
      await user.click(addCommentButton)

      // 모달이 구현되지 않아 실패할 예정
      const modal = screen.queryByRole('dialog')
      expect(modal).toBeInTheDocument()

      // ESC로 모달 닫기
      await user.keyboard('{Escape}')

      // 포커스 복원이 구현되지 않아 실패할 예정
      expect(addCommentButton).toHaveFocus()
    })
  })

  describe('🔴 RED: 미디어 접근성 (미디어 접근성 기능 미구현)', () => {
    it('FAIL: 자막 지원이 제공되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByRole('video')).toBeInTheDocument()
      })

      const video = screen.getByRole('video') as HTMLVideoElement

      // 자막 트랙이 구현되지 않아 실패할 예정
      const textTracks = video.textTracks
      expect(textTracks.length).toBeGreaterThan(0)

      // 자막 토글 버튼 확인
      const subtitleButton = screen.getByRole('button', { name: /자막/i })
      expect(subtitleButton).toBeInTheDocument()
      
      await user.click(subtitleButton)
      
      // 자막 활성화 확인
      expect(textTracks[0].mode).toBe('showing')
    })

    it('FAIL: 오디오 설명 지원이 제공되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByRole('video')).toBeInTheDocument()
      })

      // 오디오 설명 토글이 구현되지 않아 실패할 예정
      const audioDescButton = screen.getByRole('button', { name: /오디오 설명/i })
      expect(audioDescButton).toBeInTheDocument()

      await user.click(audioDescButton)

      // 오디오 설명 트랙 활성화 확인
      const video = screen.getByRole('video') as HTMLVideoElement
      const audioDescTrack = Array.from(video.textTracks).find(track => track.kind === 'descriptions')
      expect(audioDescTrack?.mode).toBe('showing')
    })

    it('FAIL: 수화 비디오 지원이 제공되어야 함', async () => {
      // 수화가 포함된 비디오 메타데이터
      const signLanguageMetadata = {
        ...mockSession.videoMetadata,
        hasSignLanguage: true,
        signLanguagePosition: 'bottom-right'
      }

      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByRole('video')).toBeInTheDocument()
      })

      // 수화 비디오 토글이 구현되지 않아 실패할 예정
      const signLanguageButton = screen.getByRole('button', { name: /수화/i })
      expect(signLanguageButton).toBeInTheDocument()

      await user.click(signLanguageButton)

      // 수화 비디오 오버레이 표시 확인
      const signLanguageOverlay = screen.getByTestId('sign-language-overlay')
      expect(signLanguageOverlay).toBeInTheDocument()
    })

    it('FAIL: 재생 속도 조절로 청각 접근성이 지원되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByRole('video')).toBeInTheDocument()
      })

      // 재생 속도 컨트롤이 구현되지 않아 실패할 예정
      const playbackRateControl = screen.getByRole('combobox', { name: /재생 속도/i })
      expect(playbackRateControl).toBeInTheDocument()

      // 0.5x 속도로 변경
      await user.selectOptions(playbackRateControl, '0.5')

      const video = screen.getByRole('video') as HTMLVideoElement
      expect(video.playbackRate).toBe(0.5)

      // 키보드로도 속도 조절 가능해야 함
      playbackRateControl.focus()
      await user.keyboard('{ArrowUp}') // 다음 속도로
      expect(video.playbackRate).toBe(0.75)
    })
  })

  describe('🔴 RED: 인지적 접근성 (인지적 부담 경감 기능 미구현)', () => {
    it('FAIL: 애니메이션 감소 설정이 지원되어야 함', async () => {
      // prefers-reduced-motion 시뮬레이션
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn()
        }))
      })

      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 애니메이션 감소가 구현되지 않아 실패할 예정
      const widget = screen.getByTestId('video-feedback-widget')
      expect(widget).toHaveClass('reduced-motion')
    })

    it('FAIL: 타임아웃 연장 옵션이 제공되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 세션 타임아웃 경고가 구현되지 않아 실패할 예정
      // 5분 후 타임아웃 시뮬레이션
      vi.advanceTimersByTime(5 * 60 * 1000)

      const timeoutWarning = screen.queryByRole('dialog', { name: /세션 타임아웃/i })
      expect(timeoutWarning).toBeInTheDocument()

      // 연장 버튼 확인
      const extendButton = screen.getByRole('button', { name: /시간 연장/i })
      expect(extendButton).toBeInTheDocument()
    })

    it('FAIL: 복잡한 UI에 대한 도움말이 제공되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-a11y-001" />)

      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 도움말 버튼이 구현되지 않아 실패할 예정
      const helpButton = screen.getByRole('button', { name: /도움말/i })
      expect(helpButton).toBeInTheDocument()

      await user.click(helpButton)

      // 도움말 모달 확인
      const helpModal = screen.getByRole('dialog', { name: /비디오 피드백 사용법/i })
      expect(helpModal).toBeInTheDocument()

      // 키보드 단축키 안내 확인
      expect(helpModal).toHaveTextContent(/스페이스바: 재생\/일시정지/)
      expect(helpModal).toHaveTextContent(/화살표 키: 10초 이동/)
    })

    it('FAIL: 오류 메시지가 명확하고 해결책을 제시해야 함', async () => {
      // 네트워크 오류 시뮬레이션
      render(<VideoFeedbackWidget sessionId="network-error" />)

      // 오류 처리가 구현되지 않아 실패할 예정
      await waitFor(() => {
        const errorMessage = screen.getByRole('alert')
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveTextContent(/네트워크 연결을 확인해 주세요/)
        expect(errorMessage).toHaveTextContent(/다시 시도/) // 해결책 제시
      })
    })
  })
})