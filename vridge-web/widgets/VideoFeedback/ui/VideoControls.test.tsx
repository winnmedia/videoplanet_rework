/**
 * VideoControls 컴포넌트 단위 테스트
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VideoControls } from './VideoControls'
import type { VideoPlaybackState } from '../model/types'

describe('VideoControls - 기본 동작 테스트', () => {
  const mockPlaybackState: VideoPlaybackState = {
    currentTime: 30,
    duration: 180,
    isPlaying: false,
    isPaused: true,
    isMuted: false,
    volume: 1,
    playbackRate: 1,
    isFullscreen: false,
    quality: 'auto'
  }

  const mockControlEvents = {
    onPlay: vi.fn(),
    onPause: vi.fn(),
    onSeek: vi.fn(),
    onVolumeChange: vi.fn(),
    onPlaybackRateChange: vi.fn(),
    onFullscreenToggle: vi.fn(),
    onQualityChange: vi.fn()
  }

  it('재생/일시정지 버튼이 렌더링되어야 함', () => {
    render(
      <VideoControls
        playbackState={mockPlaybackState}
        onControlEvent={mockControlEvents}
      />
    )

    const playButton = screen.getByLabelText('재생')
    expect(playButton).toBeInTheDocument()
  })

  it('재생 버튼 클릭이 동작해야 함', () => {
    render(
      <VideoControls
        playbackState={mockPlaybackState}
        onControlEvent={mockControlEvents}
      />
    )

    const playButton = screen.getByLabelText('재생')
    fireEvent.click(playButton)
    
    expect(mockControlEvents.onPlay).toHaveBeenCalled()
  })

  it('현재 시간이 표시되어야 함', () => {
    render(
      <VideoControls
        playbackState={mockPlaybackState}
        onControlEvent={mockControlEvents}
      />
    )

    // 30초 = 0분 30초
    expect(screen.getByText(/0:30/)).toBeInTheDocument()
  })

  it('테스트 환경에서 속도 조절 옵션이 표시되어야 함', () => {
    render(
      <VideoControls
        playbackState={mockPlaybackState}
        onControlEvent={mockControlEvents}
      />
    )

    expect(screen.getByRole('option', { name: '0.5x' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '2x' })).toBeInTheDocument()
  })
})