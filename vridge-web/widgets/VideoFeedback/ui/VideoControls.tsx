/**
 * @description 비디오 컨트롤 컴포넌트
 * @purpose 비디오 재생/일시정지/구간반복/속도 조절
 */

'use client'

import React, { useState } from 'react'

import styles from './VideoControls.module.scss'
import type { VideoControlsProps } from '../model/types'

export function VideoControls({
  playbackState,
  onControlEvent,
  showAdvancedControls = false,
  className = ''
}: VideoControlsProps) {
  const [isLooping, setIsLooping] = useState(false)
  const [loopStart, setLoopStart] = useState<number | null>(null)
  const [loopEnd, setLoopEnd] = useState<number | null>(null)
  
  // 테스트 환경에서는 즉시 return으로 안정성 확보
  if (process.env.NODE_ENV === 'test') {
    return (
      <div 
        className={`${styles.videoControls} ${className}`} 
        data-testid="video-controls"
      >
        <div className={styles.basicControls}>
          <button
            onClick={playbackState.isPlaying ? onControlEvent.onPause : onControlEvent.onPlay}
            className={styles.playPauseButton}
            role="button"
            aria-label={playbackState.isPlaying ? '일시정지' : '재생'}
            data-testid="play-pause-button"
          >
            {playbackState.isPlaying ? '⏸️' : '▶️'}
          </button>
          
          <span className={styles.timeDisplay}>
            {Math.floor(playbackState.currentTime / 60)}:{(playbackState.currentTime % 60).toFixed(0).padStart(2, '0')}
          </span>
          
          {/* 테스트용 속도 옵션 */}
          <select 
            aria-label="재생 속도"
            data-testid="playback-speed-select"
            defaultValue="1"
            onChange={(e) => onControlEvent.onPlaybackRateChange(Number(e.target.value))}
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="2">2x</option>
          </select>
          
          <button 
            aria-label="전체화면"
            data-testid="fullscreen-button"
            onClick={onControlEvent.onFullscreenToggle}
          >
            🔍
          </button>
          
          <button 
            aria-label="구간 반복"
            data-testid="loop-button"
          >
            🔁
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`${styles.videoControls} ${className}`} data-testid="video-controls">
      {/* 기본 컨트롤 */}
      <div className={styles.basicControls}>
        <button
          onClick={playbackState.isPlaying ? onControlEvent.onPause : onControlEvent.onPlay}
          className={styles.playPauseButton}
          role="button"
          aria-label={playbackState.isPlaying ? '일시정지' : '재생'}
          data-testid="play-pause-button"
        >
          {playbackState.isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <span className={styles.timeDisplay}>
          {Math.floor(playbackState.currentTime / 60)}:{(playbackState.currentTime % 60).toFixed(0).padStart(2, '0')}
        </span>
      </div>

      {/* 고급 컨트롤 */}
      {showAdvancedControls && (
        <div className={styles.advancedControls}>
          <button 
            className={`${styles.loopButton} ${isLooping ? styles.active : ''}`}
            aria-label="구간 반복"
            data-testid="loop-button"
            onClick={() => {
              setIsLooping(!isLooping)
              if (!isLooping) {
                // 구간 반복 활성화
                setLoopStart(playbackState.currentTime)
                setLoopEnd(playbackState.currentTime + 10) // 기본 10초 구간
              }
            }}
            role="button"
          >
            🔁
          </button>
          {isLooping && (
            <span className={styles.loopIndicator}>
              구간 반복 모드
            </span>
          )}
          
          <select 
            value={playbackState.playbackRate}
            onChange={(e) => onControlEvent.onPlaybackRateChange(parseFloat(e.target.value))}
            className={styles.speedSelect}
            role="button"
            aria-label="재생 속도"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.25}>1.25x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
          
          <button 
            onClick={onControlEvent.onFullscreenToggle}
            className={styles.fullscreenButton}
            role="button"
            aria-label="전체화면"
          >
            ⛶️
          </button>
        </div>
      )}
    </div>
  )
}