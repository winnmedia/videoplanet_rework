/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import VideoPlayer, { VideoPlayerRef } from './VideoPlayer'

expect.extend(toHaveNoViolations)

// Mock HTMLVideoElement methods
const mockPlay = jest.fn()
const mockPause = jest.fn()
const mockLoad = jest.fn()

Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  writable: true,
  value: mockPlay.mockResolvedValue(undefined)
})

Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  writable: true,
  value: mockPause
})

Object.defineProperty(HTMLMediaElement.prototype, 'load', {
  writable: true,
  value: mockLoad
})

// Mock requestFullscreen/exitFullscreen
Object.defineProperty(Element.prototype, 'requestFullscreen', {
  writable: true,
  value: jest.fn().mockResolvedValue(undefined)
})

Object.defineProperty(Document.prototype, 'exitFullscreen', {
  writable: true,
  value: jest.fn().mockResolvedValue(undefined)
})

// Mock pictureInPictureEnabled
Object.defineProperty(document, 'pictureInPictureEnabled', {
  writable: true,
  value: true
})

describe('VideoPlayer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock video element properties
    Object.defineProperty(HTMLVideoElement.prototype, 'duration', {
      writable: true,
      value: 120 // 2분
    })
    
    Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', {
      writable: true,
      value: 0
    })
    
    Object.defineProperty(HTMLVideoElement.prototype, 'buffered', {
      writable: true,
      value: {
        length: 1,
        start: () => 0,
        end: () => 60
      }
    })
  })

  describe('기본 렌더링', () => {
    it('기본 props로 정상 렌더링된다', () => {
      render(<VideoPlayer src="/test-video.mp4" />)
      
      expect(screen.getByTestId('video-player')).toBeInTheDocument()
      expect(screen.getByTestId('video-player-element')).toBeInTheDocument()
    })
    
    it('title과 poster가 올바르게 설정된다', () => {
      render(
        <VideoPlayer 
          src="/test-video.mp4" 
          title="테스트 비디오"
          poster="/test-poster.jpg"
        />
      )
      
      const video = screen.getByTestId('video-player-element')
      expect(video).toHaveAttribute('poster', '/test-poster.jpg')
      
      const container = screen.getByTestId('video-player')
      expect(container).toHaveAttribute('aria-label', '비디오 플레이어: 테스트 비디오')
    })
    
    it('다중 소스를 지원한다', () => {
      const sources = [
        { src: '/video.mp4', label: '1080p', type: 'video/mp4' },
        { src: '/video-720.mp4', label: '720p', type: 'video/mp4' }
      ]
      
      render(<VideoPlayer src={sources} />)
      
      const video = screen.getByTestId('video-player-element')
      const sourceTags = video.querySelectorAll('source')
      
      expect(sourceTags).toHaveLength(2)
      expect(sourceTags[0]).toHaveAttribute('src', '/video.mp4')
      expect(sourceTags[0]).toHaveAttribute('type', 'video/mp4')
    })
  })

  describe('재생 제어', () => {
    it('재생/일시정지 버튼이 작동한다', async () => {
      const user = userEvent.setup()
      
      render(<VideoPlayer src="/test-video.mp4" />)
      
      // 로딩 완료 시뮬레이션
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      const playButton = screen.getByTestId('video-player-play-button')
      
      await user.click(playButton)
      expect(mockPlay).toHaveBeenCalled()
      
      // 재생 상태로 변경
      await act(async () => {
        fireEvent.play(video)
      })
      
      await user.click(playButton)
      expect(mockPause).toHaveBeenCalled()
    })
    
    it('키보드 단축키가 작동한다', async () => {
      const user = userEvent.setup()
      
      render(<VideoPlayer src="/test-video.mp4" enableKeyboardShortcuts />)
      
      const container = screen.getByTestId('video-player')
      container.focus()
      
      // 로딩 완료 시뮬레이션
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      // 스페이스바로 재생
      await user.keyboard(' ')
      expect(mockPlay).toHaveBeenCalled()
      
      // K키로 재생/일시정지
      await user.keyboard('k')
      expect(mockPlay).toHaveBeenCalledTimes(2)
      
      // M키로 음소거
      await user.keyboard('m')
      expect(video.muted).toBe(true)
    })
    
    it('프로그레스 바 클릭으로 시간 이동이 가능하다', async () => {
      const user = userEvent.setup()
      const onSeek = jest.fn()
      
      render(<VideoPlayer src="/test-video.mp4" onSeek={onSeek} />)
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      const progressBar = screen.getByTestId('video-player-progress-bar')
      
      // 프로그레스 바 중간 클릭 (50% 지점)
      await act(async () => {
        fireEvent.click(progressBar, {
          clientX: 100, // 50% 지점 가정
          currentTarget: { getBoundingClientRect: () => ({ left: 0, width: 200 }) }
        })
      })
      
      expect(video.currentTime).toBe(60) // 전체 길이(120초)의 50%
    })
  })

  describe('볼륨 제어', () => {
    it('볼륨 슬라이더가 작동한다', async () => {
      const user = userEvent.setup()
      
      render(<VideoPlayer src="/test-video.mp4" />)
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      const volumeSlider = screen.getByTestId('video-player-volume-slider')
      
      await act(async () => {
        fireEvent.change(volumeSlider, { target: { value: '0.5' } })
      })
      
      expect(video.volume).toBe(0.5)
    })
    
    it('음소거 버튼이 작동한다', async () => {
      const user = userEvent.setup()
      
      render(<VideoPlayer src="/test-video.mp4" />)
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      const muteButton = screen.getByTestId('video-player-volume-button')
      
      await user.click(muteButton)
      expect(video.muted).toBe(true)
      
      await user.click(muteButton)
      expect(video.muted).toBe(false)
    })
  })

  describe('화질 및 배속 제어', () => {
    it('화질 선택기가 표시되고 작동한다', async () => {
      const user = userEvent.setup()
      const onQualityChange = jest.fn()
      
      const sources = [
        { src: '/video-1080p.mp4', label: '1080p' },
        { src: '/video-720p.mp4', label: '720p' }
      ]
      
      render(
        <VideoPlayer 
          src={sources} 
          enableQualitySelector 
          onQualityChange={onQualityChange}
        />
      )
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      const qualitySelector = screen.getByTestId('video-player-quality-selector')
      expect(qualitySelector).toBeInTheDocument()
      
      await user.selectOptions(qualitySelector, '720p')
      expect(onQualityChange).toHaveBeenCalledWith('720p')
    })
    
    it('재생 속도 조절이 작동한다', async () => {
      const user = userEvent.setup()
      const onSpeedChange = jest.fn()
      
      render(
        <VideoPlayer 
          src="/test-video.mp4" 
          enableSpeedControl 
          onSpeedChange={onSpeedChange}
        />
      )
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      const speedSelector = screen.getByTestId('video-player-playback-rate-menu')
      
      await user.selectOptions(speedSelector, '1.5')
      expect(video.playbackRate).toBe(1.5)
      expect(onSpeedChange).toHaveBeenCalledWith(1.5)
    })
  })

  describe('댓글 마커', () => {
    const commentMarkers = [
      {
        id: 'comment-1',
        time: 30,
        type: 'comment' as const,
        author: '사용자1',
        content: '첫 번째 댓글'
      },
      {
        id: 'comment-2', 
        time: 90,
        type: 'important' as const,
        author: '사용자2',
        content: '중요한 댓글'
      }
    ]
    
    it('댓글 마커가 타임라인에 표시된다', async () => {
      render(
        <VideoPlayer 
          src="/test-video.mp4"
          enableCommentMarkers
          commentMarkers={commentMarkers}
        />
      )
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      const markers = screen.getAllByTestId('video-player-comment-marker')
      expect(markers).toHaveLength(2)
      
      // 첫 번째 마커는 25% 위치 (30초 / 120초)
      expect(markers[0]).toHaveStyle({ left: '25%' })
      // 두 번째 마커는 75% 위치 (90초 / 120초)  
      expect(markers[1]).toHaveStyle({ left: '75%' })
    })
    
    it('댓글 마커 클릭 시 해당 시간으로 이동한다', async () => {
      const user = userEvent.setup()
      const onCommentMarkerClick = jest.fn()
      
      render(
        <VideoPlayer 
          src="/test-video.mp4"
          enableCommentMarkers
          commentMarkers={commentMarkers}
          onCommentMarkerClick={onCommentMarkerClick}
        />
      )
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      const markers = screen.getAllByTestId('video-player-comment-marker')
      
      await user.click(markers[0])
      expect(video.currentTime).toBe(30)
      expect(onCommentMarkerClick).toHaveBeenCalledWith('comment-1', 30)
    })
  })

  describe('전체화면', () => {
    it('전체화면 버튼이 작동한다', async () => {
      const user = userEvent.setup()
      const mockRequestFullscreen = jest.fn().mockResolvedValue(undefined)
      
      render(<VideoPlayer src="/test-video.mp4" enableFullscreen />)
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      const container = screen.getByTestId('video-player')
      container.requestFullscreen = mockRequestFullscreen
      
      const fullscreenButton = screen.getByTestId('video-player-fullscreen-button')
      
      await user.click(fullscreenButton)
      expect(mockRequestFullscreen).toHaveBeenCalled()
    })
    
    it('전체화면 상태 변경을 감지한다', async () => {
      const onFullscreenChange = jest.fn()
      
      render(
        <VideoPlayer 
          src="/test-video.mp4" 
          onFullscreenChange={onFullscreenChange}
        />
      )
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      // 전체화면 진입 시뮬레이션
      Object.defineProperty(document, 'fullscreenElement', {
        writable: true,
        value: screen.getByTestId('video-player')
      })
      
      await act(async () => {
        fireEvent(document, new Event('fullscreenchange'))
      })
      
      expect(onFullscreenChange).toHaveBeenCalledWith(true)
    })
  })

  describe('타임코드 표시', () => {
    it('시간이 올바른 형식으로 표시된다', async () => {
      render(<VideoPlayer src="/test-video.mp4" enableTimecodeDisplay />)
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
        // 현재 시간을 65.5초로 설정
        Object.defineProperty(video, 'currentTime', { value: 65.5 })
        fireEvent.timeUpdate(video)
      })
      
      const currentTime = screen.getByTestId('video-player-current-time-display')
      const duration = screen.getByTestId('video-player-duration-display')
      
      // 65.5초는 01:05:015 (1분 5초 015프레임)로 표시
      expect(currentTime).toHaveTextContent('01:05:015')
      // 120초는 02:00:000으로 표시
      expect(duration).toHaveTextContent('02:00:000')
    })
  })

  describe('에러 처리', () => {
    it('비디오 로드 에러를 올바르게 처리한다', async () => {
      const onError = jest.fn()
      
      render(<VideoPlayer src="/nonexistent-video.mp4" onError={onError} />)
      
      const video = screen.getByTestId('video-player-element')
      
      await act(async () => {
        Object.defineProperty(video, 'error', {
          value: { message: '비디오를 찾을 수 없습니다' }
        })
        fireEvent.error(video)
      })
      
      expect(screen.getByTestId('video-player-error')).toBeInTheDocument()
      expect(screen.getByText('비디오 오류')).toBeInTheDocument()
      expect(onError).toHaveBeenCalledWith('비디오를 찾을 수 없습니다')
    })
  })

  describe('Imperative API', () => {
    it('ref를 통한 제어 메서드가 작동한다', async () => {
      const ref = React.createRef<VideoPlayerRef>()
      
      render(<VideoPlayer ref={ref} src="/test-video.mp4" />)
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      // play 메서드
      await act(async () => {
        await ref.current?.play()
      })
      expect(mockPlay).toHaveBeenCalled()
      
      // pause 메서드
      act(() => {
        ref.current?.pause()
      })
      expect(mockPause).toHaveBeenCalled()
      
      // seek 메서드
      act(() => {
        ref.current?.seek(45)
      })
      expect(video.currentTime).toBe(45)
      
      // setVolume 메서드
      act(() => {
        ref.current?.setVolume(0.7)
      })
      expect(video.volume).toBe(0.7)
      
      // 상태 조회 메서드
      expect(ref.current?.getCurrentTime()).toBe(45)
      expect(ref.current?.getDuration()).toBe(120)
    })
    
    it('스크린샷 기능이 작동한다', async () => {
      const ref = React.createRef<VideoPlayerRef>()
      
      render(<VideoPlayer ref={ref} src="/test-video.mp4" />)
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
        // 비디오 크기 설정
        Object.defineProperty(video, 'videoWidth', { value: 1920 })
        Object.defineProperty(video, 'videoHeight', { value: 1080 })
      })
      
      // Canvas mock
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn(() => ({
          drawImage: jest.fn()
        })),
        toDataURL: jest.fn(() => 'data:image/jpeg;base64,mockdata')
      }
      
      document.createElement = jest.fn().mockReturnValue(mockCanvas)
      
      await act(async () => {
        const screenshot = await ref.current?.screenshot()
        expect(screenshot).toBe('data:image/jpeg;base64,mockdata')
        expect(mockCanvas.width).toBe(1920)
        expect(mockCanvas.height).toBe(1080)
      })
    })
  })

  describe('접근성', () => {
    it('ARIA 속성이 올바르게 설정된다', async () => {
      render(<VideoPlayer src="/test-video.mp4" title="접근성 테스트 비디오" />)
      
      const container = screen.getByTestId('video-player')
      expect(container).toHaveAttribute('role', 'application')
      expect(container).toHaveAttribute('aria-label', '비디오 플레이어: 접근성 테스트 비디오')
      expect(container).toHaveAttribute('tabIndex', '0')
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      const currentTime = screen.getByTestId('video-player-current-time-display')
      expect(currentTime).toHaveAttribute('aria-live', 'polite')
    })
    
    it('버튼들이 적절한 aria-label을 가진다', async () => {
      render(<VideoPlayer src="/test-video.mp4" />)
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      expect(screen.getByTestId('video-player-play-button')).toHaveAttribute('aria-label', '재생')
      expect(screen.getByTestId('video-player-volume-button')).toHaveAttribute('aria-label', '소리 끄기')
      expect(screen.getByTestId('video-player-fullscreen-button')).toHaveAttribute('aria-label', '전체화면')
    })
    
    it('접근성 위반이 없다', async () => {
      const { container } = render(
        <VideoPlayer 
          src="/test-video.mp4" 
          title="접근성 테스트"
          enableCommentMarkers
          commentMarkers={[
            { id: 'test', time: 30, type: 'comment', content: '테스트 댓글' }
          ]}
        />
      )
      
      const video = screen.getByTestId('video-player-element')
      await act(async () => {
        fireEvent.loadedMetadata(video)
      })
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('성능', () => {
    it('메모리 누수 없이 언마운트된다', () => {
      const { unmount } = render(<VideoPlayer src="/test-video.mp4" />)
      
      // 이벤트 리스너 등록 확인을 위한 spy
      const addEventListenerSpy = jest.spyOn(HTMLVideoElement.prototype, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(HTMLVideoElement.prototype, 'removeEventListener')
      
      unmount()
      
      // 등록된 이벤트 리스너 수만큼 제거되었는지 확인
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(addEventListenerSpy.mock.calls.length)
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })
})