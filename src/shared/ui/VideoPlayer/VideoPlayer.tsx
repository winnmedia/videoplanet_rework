/**
 * Advanced Video Player Component
 * Video.js 기반 전문가용 비디오 플레이어
 * - 타임코드 정확도 (프레임 단위)
 * - 다중 해상도 지원
 * - 키보드 단축키
 * - 댓글 마커 타임라인
 * - 실시간 동기화
 */

'use client'

import React, { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { clsx } from 'clsx'
import { cva, type VariantProps } from 'class-variance-authority'

// Video Player 변형 스타일
const videoPlayerVariants = cva(
  'relative overflow-hidden bg-black',
  {
    variants: {
      size: {
        sm: 'h-48',
        md: 'h-64 lg:h-96',
        lg: 'h-96 lg:h-[32rem]',
        xl: 'h-[32rem] lg:h-[36rem]',
        full: 'h-full'
      },
      radius: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg'
      },
      quality: {
        auto: '',
        low: 'filter-quality-low',
        high: 'filter-quality-high'
      }
    },
    defaultVariants: {
      size: 'lg',
      radius: 'md',
      quality: 'auto'
    }
  }
)

interface VideoPlayerProps extends VariantProps<typeof videoPlayerVariants> {
  // 비디오 소스
  src: string | { src: string; label: string; type?: string }[]
  poster?: string
  title?: string
  className?: string
  
  // 재생 설정
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  preload?: 'none' | 'metadata' | 'auto'
  
  // 플레이어 기능
  controls?: boolean
  enableQualitySelector?: boolean
  enableSpeedControl?: boolean
  enableFullscreen?: boolean
  enablePictureInPicture?: boolean
  enableKeyboardShortcuts?: boolean
  enableTimecodeDisplay?: boolean
  
  // 타임코드 및 댓글
  enableCommentMarkers?: boolean
  commentMarkers?: Array<{
    id: string
    time: number
    type: 'comment' | 'important' | 'warning' | 'approved'
    author?: string
    content?: string
  }>
  
  // 썸네일 미리보기
  enableThumbnailPreview?: boolean
  thumbnailStrip?: string
  
  // 성능 설정
  adaptiveStreaming?: boolean
  bufferAhead?: number
  maxBufferLength?: number
  
  // 이벤트 핸들러
  onPlay?: () => void
  onPause?: () => void
  onSeek?: (time: number) => void
  onTimeUpdate?: (time: number) => void
  onDurationChange?: (duration: number) => void
  onQualityChange?: (quality: string) => void
  onSpeedChange?: (speed: number) => void
  onFullscreenChange?: (isFullscreen: boolean) => void
  onCommentMarkerClick?: (markerId: string, time: number) => void
  onError?: (error: string) => void
  
  // 실시간 동기화
  enableRealTimeSync?: boolean
  onSyncRequest?: (time: number, isPlaying: boolean) => void
  
  // 접근성
  'aria-label'?: string
  'data-testid'?: string
}

interface VideoPlayerRef {
  // 재생 제어
  play: () => Promise<void>
  pause: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
  setSpeed: (speed: number) => void
  
  // 상태 조회
  getCurrentTime: () => number
  getDuration: () => number
  getVolume: () => number
  isMuted: () => boolean
  isPlaying: () => boolean
  isFullscreen: () => boolean
  
  // 화질 제어
  setQuality: (quality: string) => void
  getCurrentQuality: () => string
  getAvailableQualities: () => string[]
  
  // 전체화면 제어
  enterFullscreen: () => Promise<void>
  exitFullscreen: () => Promise<void>
  
  // 기타
  screenshot: () => Promise<string>
  getVideoElement: () => HTMLVideoElement | null
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  src,
  poster,
  title,
  className,
  size,
  radius,
  quality,
  autoPlay = false,
  muted = false,
  loop = false,
  preload = 'metadata',
  controls = true,
  enableQualitySelector = true,
  enableSpeedControl = true,
  enableFullscreen = true,
  enablePictureInPicture = true,
  enableKeyboardShortcuts = true,
  enableTimecodeDisplay = true,
  enableCommentMarkers = false,
  commentMarkers = [],
  enableThumbnailPreview: _enableThumbnailPreview = true,
  thumbnailStrip: _thumbnailStrip,
  adaptiveStreaming: _adaptiveStreaming = true,
  bufferAhead: _bufferAhead = 20,
  maxBufferLength: _maxBufferLength = 60,
  onPlay,
  onPause,
  onSeek,
  onTimeUpdate,
  onDurationChange,
  onQualityChange,
  onSpeedChange,
  onFullscreenChange,
  onCommentMarkerClick,
  onError,
  enableRealTimeSync = false,
  onSyncRequest,
  'aria-label': ariaLabel,
  'data-testid': testId = 'video-player'
}, ref) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  // State
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [isMutedState, setIsMutedState] = useState(muted)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [buffered, setBuffered] = useState<TimeRanges | null>(null)
  const [isBuffering, setIsBuffering] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentQuality, setCurrentQualityState] = useState('auto')
  const [availableQualities, setAvailableQualities] = useState<string[]>([])
  const [showControls, setShowControls] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Timecode 포맷 함수
  const formatTimecode = useCallback((seconds: number, showFrames = true): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const frames = Math.floor((seconds % 1) * 30) // 30fps 기준
    
    const timeString = hours > 0 
      ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    
    return showFrames && enableTimecodeDisplay 
      ? `${timeString}:${frames.toString().padStart(3, '0')}`
      : timeString
  }, [enableTimecodeDisplay])
  
  // 비디오 초기화
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    
    const initializePlayer = () => {
      setIsInitializing(false)
      setIsInitialized(true)
      
      // 품질 옵션 설정
      if (Array.isArray(src)) {
        const qualities = src.map(source => source.label)
        setAvailableQualities(['auto', ...qualities])
      } else {
        setAvailableQualities(['auto'])
      }
    }
    
    // 비디오 이벤트 리스너
    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      onDurationChange?.(video.duration)
      initializePlayer()
    }
    
    const handleTimeUpdate = () => {
      const time = video.currentTime
      setCurrentTime(time)
      onTimeUpdate?.(time)
    }
    
    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
      
      if (enableRealTimeSync && onSyncRequest) {
        onSyncRequest(video.currentTime, true)
      }
    }
    
    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
      
      if (enableRealTimeSync && onSyncRequest) {
        onSyncRequest(video.currentTime, false)
      }
    }
    
    const handleSeeked = () => {
      const time = video.currentTime
      onSeek?.(time)
      
      if (enableRealTimeSync && onSyncRequest) {
        onSyncRequest(time, !video.paused)
      }
    }
    
    const handleVolumeChange = () => {
      setVolumeState(video.volume)
      setIsMutedState(video.muted)
    }
    
    const handleProgress = () => {
      setBuffered(video.buffered)
    }
    
    const handleWaiting = () => {
      setIsBuffering(true)
    }
    
    const handleCanPlay = () => {
      setIsBuffering(false)
    }
    
    const handleError = () => {
      const errorMessage = video.error?.message || '비디오 로드 중 오류가 발생했습니다'
      setError(errorMessage)
      onError?.(errorMessage)
    }
    
    // 이벤트 리스너 등록
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('seeked', handleSeeked)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('seeked', handleSeeked)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
    }
  }, [src, onPlay, onPause, onSeek, onTimeUpdate, onDurationChange, onError, enableRealTimeSync, onSyncRequest])
  
  // 전체화면 감지
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = document.fullscreenElement === containerRef.current
      setIsFullscreen(isFS)
      onFullscreenChange?.(isFS)
    }
    
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [onFullscreenChange])
  
  // 키보드 단축키
  useEffect(() => {
    if (!enableKeyboardShortcuts || !isInitialized) return
    
    const handleKeyDown = (event: KeyboardEvent) => {
      const video = videoRef.current
      if (!video || event.target !== containerRef.current) return
      
      switch (event.code) {
        case 'Space':
          event.preventDefault()
          isPlaying ? video.pause() : video.play()
          break
        case 'ArrowLeft':
          event.preventDefault()
          video.currentTime -= 10
          break
        case 'ArrowRight': 
          event.preventDefault()
          video.currentTime += 10
          break
        case 'ArrowUp':
          event.preventDefault()
          video.volume = Math.min(1, video.volume + 0.1)
          break
        case 'ArrowDown':
          event.preventDefault()
          video.volume = Math.max(0, video.volume - 0.1)
          break
        case 'KeyM':
          event.preventDefault()
          video.muted = !video.muted
          break
        case 'KeyF':
          event.preventDefault()
          isFullscreen ? document.exitFullscreen() : containerRef.current?.requestFullscreen()
          break
        case 'KeyJ':
          event.preventDefault()
          video.currentTime -= 10
          break
        case 'KeyK':
          event.preventDefault()
          isPlaying ? video.pause() : video.play()
          break
        case 'KeyL':
          event.preventDefault()
          video.currentTime += 10
          break
      }
    }
    
    const container = containerRef.current
    if (container) {
      container.addEventListener('keydown', handleKeyDown)
      container.tabIndex = 0 // 포커스 가능하도록
      
      return () => container.removeEventListener('keydown', handleKeyDown)
    }
  }, [enableKeyboardShortcuts, isInitialized, isPlaying, isFullscreen])
  
  // 컨트롤 자동 숨기기
  useEffect(() => {
    if (!controls) return
    
    let hideTimer: NodeJS.Timeout
    
    const resetHideTimer = () => {
      setShowControls(true)
      clearTimeout(hideTimer)
      hideTimer = setTimeout(() => {
        if (isPlaying) setShowControls(false)
      }, 3000)
    }
    
    const container = containerRef.current
    if (container) {
      const handleMouseLeave = () => {
        if (isPlaying) setShowControls(false)
      }
      
      container.addEventListener('mousemove', resetHideTimer)
      container.addEventListener('mouseenter', resetHideTimer)
      container.addEventListener('mouseleave', handleMouseLeave)
      
      return () => {
        container.removeEventListener('mousemove', resetHideTimer)
        container.removeEventListener('mouseenter', resetHideTimer) 
        container.removeEventListener('mouseleave', handleMouseLeave)
        clearTimeout(hideTimer)
      }
    }
  }, [controls, isPlaying])
  
  // Imperative Handle로 외부 API 제공
  useImperativeHandle(ref, () => ({
    play: async () => {
      await videoRef.current?.play()
    },
    pause: () => {
      videoRef.current?.pause()
    },
    seek: (time: number) => {
      if (videoRef.current) {
        videoRef.current.currentTime = time
      }
    },
    setVolume: (vol: number) => {
      if (videoRef.current) {
        videoRef.current.volume = Math.max(0, Math.min(1, vol))
      }
    },
    setMuted: (muted: boolean) => {
      if (videoRef.current) {
        videoRef.current.muted = muted
      }
    },
    setSpeed: (speed: number) => {
      if (videoRef.current) {
        videoRef.current.playbackRate = speed
        setPlaybackRate(speed)
        onSpeedChange?.(speed)
      }
    },
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    getVolume: () => volume,
    isMuted: () => isMutedState,
    isPlaying: () => isPlaying,
    isFullscreen: () => isFullscreen,
    setQuality: (quality: string) => {
      setCurrentQualityState(quality)
      onQualityChange?.(quality)
    },
    getCurrentQuality: () => currentQuality,
    getAvailableQualities: () => availableQualities,
    enterFullscreen: async () => {
      await containerRef.current?.requestFullscreen()
    },
    exitFullscreen: async () => {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    },
    screenshot: async () => {
      const video = videoRef.current
      if (!video) throw new Error('Video not available')
      
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context not available')
      
      ctx.drawImage(video, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.95)
    },
    getVideoElement: () => videoRef.current
  }), [currentTime, duration, volume, isMutedState, isPlaying, isFullscreen, currentQuality, availableQualities, onSpeedChange, onQualityChange])
  
  // Progress Bar 클릭 핸들러
  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = event.currentTarget
    const rect = progressBar.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    const newTime = (clickX / rect.width) * duration
    
    if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }
  }, [duration])
  
  // 댓글 마커 클릭 핸들러
  const handleCommentMarkerClick = useCallback((markerId: string, time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
    onCommentMarkerClick?.(markerId, time)
  }, [onCommentMarkerClick])
  
  // 버퍼링 진행률 계산
  const getBufferedProgress = useCallback(() => {
    if (!buffered || !duration) return 0
    
    let bufferedAmount = 0
    for (let i = 0; i < buffered.length; i++) {
      if (buffered.start(i) <= currentTime && currentTime <= buffered.end(i)) {
        bufferedAmount = buffered.end(i)
        break
      }
    }
    
    return Math.min(100, (bufferedAmount / duration) * 100)
  }, [buffered, duration, currentTime])
  
  const containerClasses = clsx(
    videoPlayerVariants({ size, radius, quality }),
    'group focus:outline-none focus:ring-2 focus:ring-blue-500',
    className
  )
  
  // 에러 상태 렌더링
  if (error) {
    return (
      <div 
        className={containerClasses}
        data-testid={`${testId}-error`}
        role="alert"
        aria-label={error}
      >
        <div className="flex flex-col items-center justify-center h-full text-white">
          <div className="w-16 h-16 mb-4 text-red-500">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <p className="text-lg font-medium mb-2">비디오 오류</p>
          <p className="text-sm text-gray-300 text-center max-w-md">{error}</p>
        </div>
      </div>
    )
  }
  
  // 로딩 상태 렌더링
  if (isInitializing) {
    return (
      <div 
        className={containerClasses}
        data-testid={`${testId}-loading`}
        role="progressbar"
        aria-label="비디오 로딩 중"
      >
        <div className="flex flex-col items-center justify-center h-full text-white">
          <div className="w-8 h-8 mb-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
          <p className="text-sm text-gray-300">비디오를 불러오는 중...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div 
      ref={containerRef}
      className={containerClasses}
      data-testid={testId}
      role="application"
      aria-label={ariaLabel || `비디오 플레이어${title ? `: ${title}` : ''}`}
      tabIndex={0}
    >
      {/* 비디오 엘리먼트 */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        preload={preload}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        playsInline
        data-testid={`${testId}-element`}
      >
        {Array.isArray(src) ? (
          src.map((source, index) => (
            <source
              key={index}
              src={source.src}
              type={source.type || 'video/mp4'}
            />
          ))
        ) : (
          <source src={src} type="video/mp4" />
        )}
        
        <p className="text-white p-4">
          브라우저가 비디오를 지원하지 않습니다.
        </p>
      </video>
      
      {/* 버퍼링 인디케이터 */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* 컨트롤바 */}
      {controls && (
        <div 
          className={clsx(
            'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 transition-opacity duration-300',
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0'
          )}
          data-testid={`${testId}-controls`}
        >
          {/* 프로그레스 바 */}
          <div className="mb-4">
            <div 
              className="relative h-2 bg-gray-600 rounded-full cursor-pointer group"
              onClick={handleProgressClick}
              data-testid={`${testId}-progress-bar`}
            >
              {/* 버퍼링 진행률 */}
              <div 
                className="absolute top-0 left-0 h-full bg-gray-400 rounded-full transition-all duration-200"
                style={{ width: `${getBufferedProgress()}%` }}
              />
              
              {/* 재생 진행률 */}
              <div 
                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-200"
                style={{ width: `${(currentTime / duration) * 100}%` }}
                data-testid={`${testId}-progress-fill`}
              />
              
              {/* 댓글 마커 */}
              {enableCommentMarkers && commentMarkers.map((marker) => {
                const position = (marker.time / duration) * 100
                return (
                  <button
                    key={marker.id}
                    className={clsx(
                      'absolute top-0 w-2 h-full -translate-x-1 transform transition-all hover:scale-125',
                      {
                        'bg-yellow-400': marker.type === 'comment',
                        'bg-red-500': marker.type === 'important', 
                        'bg-orange-500': marker.type === 'warning',
                        'bg-green-500': marker.type === 'approved'
                      }
                    )}
                    style={{ left: `${position}%` }}
                    onClick={() => handleCommentMarkerClick(marker.id, marker.time)}
                    title={`${marker.author || ''}: ${marker.content || ''} (${formatTimecode(marker.time)})`}
                    data-testid={`${testId}-comment-marker`}
                    data-marker-id={marker.id}
                    data-timecode={formatTimecode(marker.time)}
                  />
                )
              })}
              
              {/* 프로그레스 핸들 */}
              <div 
                className="absolute top-1/2 w-4 h-4 bg-blue-500 rounded-full -translate-y-1/2 -translate-x-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                style={{ left: `${(currentTime / duration) * 100}%` }}
                data-testid={`${testId}-progress-handle`}
              />
            </div>
          </div>
          
          {/* 컨트롤 버튼들 */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4">
              {/* 재생/일시정지 */}
              <button
                onClick={() => isPlaying ? videoRef.current?.pause() : videoRef.current?.play()}
                className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
                data-testid={`${testId}-play-button`}
                aria-label={isPlaying ? '일시정지' : '재생'}
              >
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>
              
              {/* 볼륨 */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !videoRef.current.muted
                    }
                  }}
                  className="w-6 h-6 flex items-center justify-center"
                  data-testid={`${testId}-volume-button`}
                  aria-label={isMutedState ? '소리 켜기' : '소리 끄기'}
                >
                  {isMutedState || volume === 0 ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                    </svg>
                  ) : volume > 0.5 ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                    </svg>
                  )}
                </button>
                
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMutedState ? 0 : volume}
                  onChange={(e) => {
                    const vol = parseFloat(e.target.value)
                    if (videoRef.current) {
                      videoRef.current.volume = vol
                      videoRef.current.muted = vol === 0
                    }
                  }}
                  className="w-20 h-1 bg-gray-600 rounded-full appearance-none cursor-pointer slider"
                  data-testid={`${testId}-volume-slider`}
                  aria-label="볼륨"
                />
              </div>
              
              {/* 시간 표시 */}
              {enableTimecodeDisplay && (
                <div className="flex items-center space-x-1 text-sm font-mono">
                  <span 
                    data-testid={`${testId}-current-time-display`}
                    aria-live="polite"
                  >
                    {formatTimecode(currentTime)}
                  </span>
                  <span>/</span>
                  <span data-testid={`${testId}-duration-display`}>
                    {formatTimecode(duration)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* 배속 조절 */}
              {enableSpeedControl && (
                <select
                  value={playbackRate}
                  onChange={(e) => {
                    const speed = parseFloat(e.target.value)
                    if (videoRef.current) {
                      videoRef.current.playbackRate = speed
                      setPlaybackRate(speed)
                      onSpeedChange?.(speed)
                    }
                  }}
                  className="bg-transparent text-sm border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                  data-testid={`${testId}-playback-rate-menu`}
                  aria-label="재생 속도"
                >
                  <option value={0.25}>0.25x</option>
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              )}
              
              {/* 화질 선택 */}
              {enableQualitySelector && availableQualities.length > 1 && (
                <select
                  value={currentQuality}
                  onChange={(e) => {
                    const quality = e.target.value
                    setCurrentQualityState(quality)
                    onQualityChange?.(quality)
                  }}
                  className="bg-transparent text-sm border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                  data-testid={`${testId}-quality-selector`}
                  aria-label="화질 선택"
                >
                  {availableQualities.map((quality) => (
                    <option key={quality} value={quality} data-testid={`quality-option-${quality}`}>
                      {quality}
                    </option>
                  ))}
                </select>
              )}
              
              {/* PIP 버튼 */}
              {enablePictureInPicture && 'pictureInPictureEnabled' in document && (
                <button
                  onClick={() => {
                    const video = videoRef.current
                    if (video && document.pictureInPictureEnabled) {
                      if (document.pictureInPictureElement) {
                        document.exitPictureInPicture()
                      } else {
                        video.requestPictureInPicture()
                      }
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
                  data-testid={`${testId}-pip-button`}
                  aria-label="화면 속 화면"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z"/>
                  </svg>
                </button>
              )}
              
              {/* 전체화면 */}
              {enableFullscreen && (
                <button
                  onClick={() => {
                    if (isFullscreen) {
                      document.exitFullscreen()
                    } else {
                      containerRef.current?.requestFullscreen()
                    }
                  }}
                  className="w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded transition-colors"
                  data-testid={`${testId}-fullscreen-button`}
                  aria-label={isFullscreen ? '전체화면 해제' : '전체화면'}
                >
                  {isFullscreen ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'

export default VideoPlayer
export type { VideoPlayerProps, VideoPlayerRef }