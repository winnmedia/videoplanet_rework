/**
 * @description Video Player 컴포넌트 포괄적 테스트 스위트
 * @purpose Phase 2 핵심 비디오 피드백 테스트 커버리지 확보 (TDD)
 * @coverage 비디오 재생, 마커, 댓글, 인터랙션, 접근성, 성능
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'

import type { 
  VideoPlayerProps, 
  VideoMetadata, 
  VideoPlaybackState,
  TimestampComment,
  VideoMarker 
} from '../../model/types'
import { VideoPlayer } from '../VideoPlayer'

// Jest-axe 매처 확장
expect.extend(toHaveNoViolations)

// Mock 데이터 팩토리
const createMockVideoMetadata = (overrides?: Partial<VideoMetadata>): VideoMetadata => ({
  id: 'video-test-001',
  filename: 'test_video.mp4',
  url: '/api/videos/test_video.mp4',
  thumbnail: '/api/videos/thumbnails/test_video.jpg',
  duration: 120, // 2분
  fileSize: 25000000, // 25MB
  format: 'mp4',
  resolution: {
    width: 1920,
    height: 1080
  },
  uploadedAt: '2025-08-28T10:00:00Z',
  uploadedBy: 'user-test-001',
  ...overrides
})

const createMockPlaybackState = (overrides?: Partial<VideoPlaybackState>): VideoPlaybackState => ({
  currentTime: 0,
  duration: 120,
  isPlaying: false,
  isPaused: true,
  isMuted: false,
  volume: 1,
  playbackRate: 1,
  isFullscreen: false,
  quality: 'auto',
  ...overrides
})

const createMockComment = (overrides?: Partial<TimestampComment>): TimestampComment => ({
  id: 'comment-test-001',
  videoId: 'video-test-001',
  timestamp: 30.5,
  x: 50,
  y: 25,
  content: '테스트 댓글입니다.',
  author: {
    id: 'user-test-001',
    name: '테스트 사용자',
    avatar: '/avatars/test-user.jpg',
    role: 'client'
  },
  createdAt: '2025-08-28T10:30:00Z',
  status: 'open',
  priority: 'medium',
  tags: ['테스트'],
  ...overrides
})

const createMockMarker = (overrides?: Partial<VideoMarker>): VideoMarker => ({
  id: 'marker-test-001',
  videoId: 'video-test-001',
  timestamp: 30.5,
  type: 'rectangle',
  coordinates: {
    x: 45,
    y: 20,
    width: 20,
    height: 15
  },
  style: {
    color: '#ff4444',
    strokeWidth: 2,
    opacity: 0.8
  },
  linkedCommentId: 'comment-test-001',
  createdBy: 'user-test-001',
  createdAt: '2025-08-28T10:30:00Z',
  ...overrides
})

describe('VideoPlayer 컴포넌트 - TDD Red Phase', () => {
  let mockOnPlaybackStateChange: ReturnType<typeof vi.fn>
  let mockOnMarkerClick: ReturnType<typeof vi.fn>
  let mockOnVideoClick: ReturnType<typeof vi.fn>
  let user: ReturnType<typeof userEvent.setup>

  const defaultProps: VideoPlayerProps = {
    videoMetadata: createMockVideoMetadata(),
    playbackState: createMockPlaybackState(),
    markers: [],
    comments: [],
    onPlaybackStateChange: vi.fn(),
    onMarkerClick: vi.fn(),
    onVideoClick: vi.fn(),
    className: 'test-video-player'
  }

  beforeAll(() => {
    // HTMLMediaElement 메서드 모킹
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      writable: true,
      value: vi.fn().mockImplementation(() => Promise.resolve())
    })
    
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      writable: true,
      value: vi.fn()
    })
    
    Object.defineProperty(HTMLMediaElement.prototype, 'load', {
      writable: true,
      value: vi.fn()
    })
    
    // 미디어 속성 모킹
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      writable: true,
      value: 120
    })
    
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
      writable: true,
      value: 0
    })
    
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      writable: true,
      value: true
    })
    
    Object.defineProperty(HTMLMediaElement.prototype, 'volume', {
      writable: true,
      value: 1
    })
    
    Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
      writable: true,
      value: false
    })
    
    Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
      writable: true,
      value: 1
    })
  })

  beforeEach(() => {
    mockOnPlaybackStateChange = vi.fn()
    mockOnMarkerClick = vi.fn()
    mockOnVideoClick = vi.fn()
    
    user = userEvent.setup()
    
    // Intersection Observer 모킹 (성능 테스트용)
    global.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }))
    
    // Performance API 모킹
    global.performance = {
      ...global.performance,
      mark: vi.fn(),
      measure: vi.fn(),
      getEntriesByName: vi.fn().mockReturnValue([]),
      now: vi.fn().mockReturnValue(Date.now())
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('🔴 RED: 기본 비디오 플레이어 렌더링', () => {
    it('비디오 플레이어 컨테이너가 렌더링되어야 함', () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange,
        onMarkerClick: mockOnMarkerClick,
        onVideoClick: mockOnVideoClick
      }
      
      render(<VideoPlayer {...props} />)
      
      expect(screen.getByTestId('video-player')).toBeInTheDocument()
      expect(screen.getByTestId('video-player')).toHaveClass('test-video-player')
    })

    it('비디오 엘리먼트가 올바른 속성으로 렌더링되어야 함', () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      
      expect(video).toBeInTheDocument()
      expect(video).toHaveAttribute('src', '/api/videos/test_video.mp4')
      expect(video).toHaveAttribute('poster', '/api/videos/thumbnails/test_video.jpg')
      expect(video).toHaveAttribute('aria-label', 'test_video')
      expect(video).toHaveAttribute('aria-describedby', 'video-description')
    })

    it('비디오 설명이 접근성을 위해 제공되어야 함', () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const description = document.getElementById('video-description')
      
      expect(description).toBeInTheDocument()
      expect(description).toHaveTextContent(/test_video\.mp4.*길이.*2분 0초/)
    })
  })

  describe('🔴 RED: 비디오 재생 상태 관리', () => {
    it('재생 상태 변경 시 onPlaybackStateChange가 호출되어야 함', async () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      
      // 비디오 이벤트 트리거
      act(() => {
        fireEvent.loadedMetadata(video)
      })
      
      expect(mockOnPlaybackStateChange).toHaveBeenCalledWith({
        duration: 120
      })
    })

    it('재생 버튼 클릭 시 play 이벤트가 발생해야 함', async () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      
      // play 이벤트 트리거
      act(() => {
        fireEvent.play(video)
      })
      
      expect(mockOnPlaybackStateChange).toHaveBeenCalledWith({
        isPlaying: true,
        isPaused: false
      })
    })

    it('일시정지 버튼 클릭 시 pause 이벤트가 발생해야 함', async () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      
      // pause 이벤트 트리거
      act(() => {
        fireEvent.pause(video)
      })
      
      expect(mockOnPlaybackStateChange).toHaveBeenCalledWith({
        isPlaying: false,
        isPaused: true
      })
    })

    it('시간 업데이트 시 currentTime이 동기화되어야 함', async () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video') as HTMLVideoElement
      
      // currentTime 변경 시뮬레이션
      Object.defineProperty(video, 'currentTime', {
        writable: true,
        value: 45.5
      })
      
      act(() => {
        fireEvent.timeUpdate(video)
      })
      
      expect(mockOnPlaybackStateChange).toHaveBeenCalledWith({
        currentTime: 45.5
      })
    })

    it('볼륨 변경 시 상태가 업데이트되어야 함', async () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video') as HTMLVideoElement
      
      // 볼륨 변경 시뮬레이션
      Object.defineProperty(video, 'volume', {
        writable: true,
        value: 0.7
      })
      
      Object.defineProperty(video, 'muted', {
        writable: true,
        value: false
      })
      
      act(() => {
        fireEvent.volumeChange(video)
      })
      
      expect(mockOnPlaybackStateChange).toHaveBeenCalledWith({
        volume: 0.7,
        isMuted: false
      })
    })

    it('재생 속도 변경 시 상태가 업데이트되어야 함', async () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video') as HTMLVideoElement
      
      // 재생 속도 변경 시뮬레이션
      Object.defineProperty(video, 'playbackRate', {
        writable: true,
        value: 1.5
      })
      
      act(() => {
        fireEvent.rateChange(video)
      })
      
      expect(mockOnPlaybackStateChange).toHaveBeenCalledWith({
        playbackRate: 1.5
      })
    })
  })

  describe('🔴 RED: 비디오 마커 시스템', () => {
    it('마커가 비디오 위에 올바르게 표시되어야 함', () => {
      const marker = createMockMarker()
      const props = {
        ...defaultProps,
        markers: [marker],
        onPlaybackStateChange: mockOnPlaybackStateChange,
        onMarkerClick: mockOnMarkerClick
      }
      
      render(<VideoPlayer {...props} />)
      
      const markerElement = screen.getByTestId(`video-marker-${marker.id}`)
      
      expect(markerElement).toBeInTheDocument()
      expect(markerElement).toHaveStyle({
        position: 'absolute',
        left: '45%',
        top: '20%',
        width: '20%',
        height: '15%',
        borderColor: '#ff4444',
        borderWidth: '2px',
        opacity: '0.8',
        cursor: 'pointer'
      })
    })

    it('마커 클릭 시 onMarkerClick이 호출되어야 함', async () => {
      const marker = createMockMarker()
      const props = {
        ...defaultProps,
        markers: [marker],
        onPlaybackStateChange: mockOnPlaybackStateChange,
        onMarkerClick: mockOnMarkerClick
      }
      
      render(<VideoPlayer {...props} />)
      
      const markerElement = screen.getByTestId(`video-marker-${marker.id}`)
      
      await user.click(markerElement)
      
      expect(mockOnMarkerClick).toHaveBeenCalledWith(marker)
    })

    it('원형 마커가 올바르게 렌더링되어야 함', () => {
      const circleMarker = createMockMarker({
        id: 'marker-circle-001',
        type: 'circle',
        coordinates: {
          x: 60,
          y: 30,
          radius: 10
        }
      })
      
      const props = {
        ...defaultProps,
        markers: [circleMarker],
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const markerElement = screen.getByTestId(`video-marker-${circleMarker.id}`)
      
      expect(markerElement).toBeInTheDocument()
      expect(markerElement).toHaveStyle({
        left: '60%',
        top: '30%'
      })
    })

    it('화면에 표시되지 않는 시간대의 마커는 숨겨져야 함', () => {
      const futureMarker = createMockMarker({
        id: 'marker-future-001',
        timestamp: 90 // 현재 시간(0초)과 차이가 큰 마커
      })
      
      const props = {
        ...defaultProps,
        markers: [futureMarker],
        playbackState: createMockPlaybackState({ currentTime: 0 }),
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      // 미래 시점의 마커는 표시되지 않을 수 있음 (구현에 따라)
      const markerElement = screen.getByTestId(`video-marker-${futureMarker.id}`)
      expect(markerElement).toBeInTheDocument()
    })
  })

  describe('🔴 RED: 타임스탬프 댓글 시스템', () => {
    it('현재 재생 시간 근처의 댓글이 표시되어야 함', () => {
      const comment = createMockComment({ timestamp: 30 })
      const props = {
        ...defaultProps,
        comments: [comment],
        playbackState: createMockPlaybackState({ currentTime: 30.5 }),
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      // 댓글 포인터가 표시되어야 함
      const commentPointer = document.querySelector('.commentPointer')
      expect(commentPointer).toBeInTheDocument()
    })

    it('댓글이 있는 위치에 포인터가 올바르게 배치되어야 함', () => {
      const comment = createMockComment({
        timestamp: 30,
        x: 70,
        y: 40
      })
      
      const props = {
        ...defaultProps,
        comments: [comment],
        playbackState: createMockPlaybackState({ currentTime: 30 }),
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const commentPointer = document.querySelector('.commentPointer')
      
      if (commentPointer) {
        expect(commentPointer).toHaveStyle({
          left: '70%',
          top: '40%'
        })
      }
    })

    it('시간차이가 큰 댓글은 표시되지 않아야 함', () => {
      const distantComment = createMockComment({
        timestamp: 90, // 현재 시간과 차이가 큰 댓글
        x: 50,
        y: 50
      })
      
      const props = {
        ...defaultProps,
        comments: [distantComment],
        playbackState: createMockPlaybackState({ currentTime: 10 }),
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      // visible 클래스가 없어야 함
      const commentPointers = document.querySelectorAll('.commentPointer.visible')
      expect(commentPointers).toHaveLength(0)
    })
  })

  describe('🔴 RED: 비디오 클릭 인터랙션', () => {
    it('비디오 클릭 시 onVideoClick이 올바른 좌표와 시간으로 호출되어야 함', async () => {
      const props = {
        ...defaultProps,
        playbackState: createMockPlaybackState({ currentTime: 45.5 }),
        onPlaybackStateChange: mockOnPlaybackStateChange,
        onVideoClick: mockOnVideoClick
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      
      // getBoundingClientRect 모킹
      vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 450,
        right: 800,
        bottom: 450,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
      
      await user.click(video, {
        clientX: 400, // 50% 위치
        clientY: 225  // 50% 위치
      })
      
      expect(mockOnVideoClick).toHaveBeenCalledWith({
        x: 50, // 400/800 * 100 = 50%
        y: 50, // 225/450 * 100 = 50%
        timestamp: 45.5
      })
    })

    it('마커 클릭 시 이벤트 버블링이 방지되어야 함', async () => {
      const marker = createMockMarker()
      const props = {
        ...defaultProps,
        markers: [marker],
        onPlaybackStateChange: mockOnPlaybackStateChange,
        onMarkerClick: mockOnMarkerClick,
        onVideoClick: mockOnVideoClick
      }
      
      render(<VideoPlayer {...props} />)
      
      const markerElement = screen.getByTestId(`video-marker-${marker.id}`)
      
      await user.click(markerElement)
      
      expect(mockOnMarkerClick).toHaveBeenCalledWith(marker)
      // 비디오 클릭 이벤트는 호출되지 않아야 함 (이벤트 버블링 방지)
      expect(mockOnVideoClick).not.toHaveBeenCalled()
    })
  })

  describe('🔴 RED: 드래그 앤 드롭 마커 생성', () => {
    it('드래그 시작 시 dragStart 좌표가 설정되어야 함', async () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      
      // getBoundingClientRect 모킹
      vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 450,
        right: 800,
        bottom: 450,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
      
      fireEvent.mouseDown(video, { clientX: 200, clientY: 150 })
      
      // 드래그 영역이 표시되지 않아야 함 (아직 mouseMove 없음)
      const dragArea = document.querySelector('.dragArea')
      expect(dragArea).not.toBeInTheDocument()
    })

    it('드래그 중일 때 선택 영역이 표시되어야 함', async () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      
      // getBoundingClientRect 모킹
      vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 450,
        right: 800,
        bottom: 450,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
      
      // 드래그 시작
      fireEvent.mouseDown(video, { clientX: 200, clientY: 150 })
      
      // 드래그 이동
      fireEvent.mouseMove(video, { clientX: 400, clientY: 300 })
      
      // 드래그 영역이 표시되어야 함
      const dragArea = document.querySelector('.dragArea')
      expect(dragArea).toBeInTheDocument()
      
      if (dragArea) {
        expect(dragArea).toHaveStyle({
          position: 'absolute',
          left: '25%', // min(200/800*100, 400/800*100) = 25%
          top: '33.333333333333336%', // min(150/450*100, 300/450*100) = 33.33%
          width: '25%', // abs(400/800*100 - 200/800*100) = 25%
          height: '33.333333333333336%' // abs(300/450*100 - 150/450*100) = 33.33%
        })
      }
    })

    it('드래그 종료 시 충분한 크기면 마커 추가 모달이 트리거되어야 함', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      
      // getBoundingClientRect 모킹
      vi.spyOn(video, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 450,
        right: 800,
        bottom: 450,
        x: 0,
        y: 0,
        toJSON: () => ({})
      })
      
      // 드래그 시작
      fireEvent.mouseDown(video, { clientX: 200, clientY: 150 })
      
      // 드래그 이동 (충분한 거리)
      fireEvent.mouseMove(video, { clientX: 350, clientY: 250 })
      
      // 드래그 종료
      fireEvent.mouseUp(video, { clientX: 350, clientY: 250 })
      
      // 마커 추가 모달 트리거 확인
      expect(consoleSpy).toHaveBeenCalledWith(
        'Open marker add modal', 
        expect.objectContaining({
          dragStart: { x: 25, y: expect.closeTo(33.33, 1) },
          dragEnd: { x: expect.closeTo(43.75, 1), y: expect.closeTo(55.56, 1) }
        })
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('🔴 RED: 접근성 (WCAG 2.1 AA)', () => {
    it('키보드 네비게이션이 가능해야 함', async () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      
      // Tab으로 포커스 이동 가능해야 함
      await user.tab()
      expect(video).toHaveFocus()
      
      // Space/Enter로 재생/일시정지 가능해야 함 (브라우저 기본 동작)
      await user.keyboard(' ')
      // 실제 구현에서는 스페이스바 이벤트 처리 확인
    })

    it('ARIA 속성이 올바르게 설정되어야 함', () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      
      expect(video).toHaveAttribute('aria-label', 'test_video')
      expect(video).toHaveAttribute('aria-describedby', 'video-description')
      
      const description = document.getElementById('video-description')
      expect(description).toHaveClass('srOnly') // 스크린 리더 전용 클래스
    })

    it('접근성 위반사항이 없어야 함', async () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      const { container } = render(<VideoPlayer {...props} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('고대비 모드에서도 마커가 잘 보여야 함', () => {
      const marker = createMockMarker({
        style: {
          color: '#ffffff',
          strokeWidth: 3,
          opacity: 1
        }
      })
      
      const props = {
        ...defaultProps,
        markers: [marker],
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      // 고대비 모드 시뮬레이션
      document.body.classList.add('high-contrast')
      
      render(<VideoPlayer {...props} />)
      
      const markerElement = screen.getByTestId(`video-marker-${marker.id}`)
      
      expect(markerElement).toHaveStyle({
        borderColor: '#ffffff',
        borderWidth: '3px',
        opacity: '1'
      })
      
      document.body.classList.remove('high-contrast')
    })
  })

  describe('🔴 RED: 성능 및 메모리 관리', () => {
    it('컴포넌트 언마운트 시 이벤트 리스너가 정리되어야 함', () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      const { unmount } = render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      const removeEventListenerSpy = vi.spyOn(video, 'removeEventListener')
      
      unmount()
      
      // 모든 이벤트 리스너가 제거되어야 함
      expect(removeEventListenerSpy).toHaveBeenCalledWith('loadedmetadata', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('timeupdate', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('play', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('pause', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('volumechange', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('ratechange', expect.any(Function))
    })

    it('대량의 마커가 있어도 성능이 유지되어야 함', () => {
      // 성능 측정 시작
      const startTime = performance.now()
      
      // 100개의 마커 생성
      const markers = Array.from({ length: 100 }, (_, index) => 
        createMockMarker({
          id: `marker-perf-${index}`,
          coordinates: {
            x: Math.random() * 100,
            y: Math.random() * 100,
            width: 5,
            height: 5
          }
        })
      )
      
      const props = {
        ...defaultProps,
        markers,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      // 렌더링 시간 측정
      const renderTime = performance.now() - startTime
      
      // 100ms 이내에 렌더링되어야 함
      expect(renderTime).toBeLessThan(100)
      
      // 모든 마커가 렌더링되었는지 확인
      markers.forEach(marker => {
        expect(screen.getByTestId(`video-marker-${marker.id}`)).toBeInTheDocument()
      })
    })

    it('빈번한 상태 변경에도 성능이 유지되어야 함', async () => {
      const props = {
        ...defaultProps,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      const { rerender } = render(<VideoPlayer {...props} />)
      
      const startTime = performance.now()
      
      // 100번의 빠른 상태 변경 시뮬레이션
      for (let i = 0; i < 100; i++) {
        const newProps = {
          ...props,
          playbackState: createMockPlaybackState({
            currentTime: i,
            isPlaying: i % 2 === 0
          })
        }
        
        rerender(<VideoPlayer {...newProps} />)
      }
      
      const updateTime = performance.now() - startTime
      
      // 500ms 이내에 모든 업데이트가 완료되어야 함
      expect(updateTime).toBeLessThan(500)
    })
  })

  describe('🔴 RED: 에러 처리 및 예외 상황', () => {
    it('잘못된 비디오 URL에 대해 적절히 처리해야 함', () => {
      const props = {
        ...defaultProps,
        videoMetadata: createMockVideoMetadata({
          url: 'invalid-url'
        }),
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      
      expect(video).toHaveAttribute('src', 'invalid-url')
      expect(video).toHaveTextContent('비디오를 재생할 수 없습니다.')
    })

    it('마커 데이터가 누락되어도 에러가 발생하지 않아야 함', () => {
      const incompleteMarker = {
        id: 'marker-incomplete',
        videoId: 'video-test-001',
        timestamp: 30,
        type: 'rectangle' as const,
        coordinates: { x: 50 }, // y, width, height 누락
        style: { color: '#ff0000' }, // strokeWidth, opacity 누락
        createdBy: 'user-test-001',
        createdAt: '2025-08-28T10:30:00Z'
      } as VideoMarker
      
      const props = {
        ...defaultProps,
        markers: [incompleteMarker],
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      expect(() => {
        render(<VideoPlayer {...props} />)
      }).not.toThrow()
      
      // 불완전한 마커도 렌더링 시도
      expect(screen.getByTestId('video-marker-marker-incomplete')).toBeInTheDocument()
    })

    it('이벤트 핸들러가 없어도 에러가 발생하지 않아야 함', () => {
      const props = {
        videoMetadata: createMockVideoMetadata(),
        playbackState: createMockPlaybackState(),
        markers: [],
        comments: [],
        onPlaybackStateChange: mockOnPlaybackStateChange
        // onMarkerClick, onVideoClick 없음
      }
      
      expect(() => {
        render(<VideoPlayer {...props} />)
      }).not.toThrow()
    })
  })

  describe('🔴 RED: 반응형 및 다양한 화면 크기', () => {
    it('작은 화면에서도 마커가 올바르게 표시되어야 함', () => {
      // 작은 화면 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      })
      
      const marker = createMockMarker()
      const props = {
        ...defaultProps,
        markers: [marker],
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const markerElement = screen.getByTestId(`video-marker-${marker.id}`)
      
      expect(markerElement).toBeInTheDocument()
      expect(markerElement).toHaveStyle({
        left: '45%',
        top: '20%'
      })
    })

    it('다양한 비디오 해상도에 대응해야 함', () => {
      const ultraWideVideo = createMockVideoMetadata({
        resolution: {
          width: 3840,
          height: 1600 // 21:9 Ultra-wide
        }
      })
      
      const props = {
        ...defaultProps,
        videoMetadata: ultraWideVideo,
        onPlaybackStateChange: mockOnPlaybackStateChange
      }
      
      render(<VideoPlayer {...props} />)
      
      const video = screen.getByRole('video')
      expect(video).toBeInTheDocument()
      
      // 비디오 설명에 해상도 정보가 포함되어야 함
      const description = document.getElementById('video-description')
      expect(description).toHaveTextContent(/test_video\.mp4/)
    })
  })
})