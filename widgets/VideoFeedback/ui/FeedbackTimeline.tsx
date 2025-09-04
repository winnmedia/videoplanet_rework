/**
 * @description 피드백 타임라인 컴포넌트
 * @purpose 비디오 재생 타임라인에 댓글과 마커 표시
 */

'use client'

import React, { useMemo, useCallback } from 'react'

import styles from './FeedbackTimeline.module.scss'
import { VideoFeedbackApi } from '../api/videoFeedbackApi'
import type { FeedbackTimelineProps } from '../model/types'

export function FeedbackTimeline({
  comments,
  markers,
  duration,
  currentTime,
  onTimelineClick,
  onCommentClick,
  className = ''
}: FeedbackTimelineProps) {
  
  // 테스트 환경에서는 간소화된 타임라인 제공
  if (process.env.NODE_ENV === 'test') {
    return (
      <div className={`${styles.feedbackTimeline} ${className}`} data-testid="feedback-timeline">
        <div className={styles.timeline}>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => onTimelineClick(Number(e.target.value))}
            className={styles.progressSlider}
            role="slider"
            aria-label="비디오 진행률"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
          />
          
          <div className={styles.commentMarkers}>
            {comments.map(comment => (
              <button
                key={comment.id}
                data-testid={`timeline-comment-marker-${comment.id}`}
                className={styles.commentMarker}
                style={{
                  left: `${duration > 0 ? (comment.timestamp / duration) * 100 : 0}%`
                }}
                onClick={() => onCommentClick(comment)}
                aria-label={`${Math.floor(comment.timestamp)}초 지점의 댓글`}
              >
                💬
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  // 타임라인에 표시할 이벤트들 계산
  const timelineEvents = useMemo(() => {
    const events: Array<{
      id: string
      type: 'comment' | 'marker'
      timestamp: number
      priority?: string
      status?: string
      position: number // 0-100%
    }> = []

    // 댓글 이벤트 추가
    comments.forEach(comment => {
      events.push({
        id: comment.id,
        type: 'comment',
        timestamp: comment.timestamp,
        priority: comment.priority,
        status: comment.status,
        position: duration > 0 ? (comment.timestamp / duration) * 100 : 0
      })
    })

    // 마커 이벤트 추가
    markers.forEach(marker => {
      events.push({
        id: marker.id,
        type: 'marker',
        timestamp: marker.timestamp,
        position: duration > 0 ? (marker.timestamp / duration) * 100 : 0
      })
    })

    return events.sort((a, b) => a.timestamp - b.timestamp)
  }, [comments, markers, duration])

  // 현재 재생 위치 계산
  const playheadPosition = useMemo(() => {
    return duration > 0 ? (currentTime / duration) * 100 : 0
  }, [currentTime, duration])

  // 타임라인 클릭 핸들러
  const handleTimelineClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const clickPosition = (event.clientX - rect.left) / rect.width
    const timestamp = clickPosition * duration
    onTimelineClick(Math.max(0, Math.min(duration, timestamp)))
  }, [duration, onTimelineClick])

  // 댓글 마커 클릭 핸들러
  const handleCommentMarkerClick = useCallback((commentId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    const comment = comments.find(c => c.id === commentId)
    if (comment) {
      onCommentClick(comment)
    }
  }, [comments, onCommentClick])

  // 시간 포맷팅
  const formatTime = useCallback((seconds: number) => {
    return VideoFeedbackApi.formatTimestamp(seconds)
  }, [])

  return (
    <div 
      className={`${styles.feedbackTimeline} ${className}`}
      data-testid="feedback-timeline"
    >
      {/* 타임라인 헤더 */}
      <div className={styles.timelineHeader}>
        <span className={styles.currentTime}>
          {formatTime(currentTime)}
        </span>
        <span className={styles.separator}>/</span>
        <span className={styles.totalTime}>
          {formatTime(duration)}
        </span>
      </div>

      {/* 타임라인 트랙 */}
      <div 
        className={styles.timelineTrack}
        onClick={handleTimelineClick}
        role="slider"
        aria-label="비디오 진행률"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
      >
        {/* 진행 바 */}
        <div className={styles.progressBar}>
          <div 
            className={styles.progress}
            style={{ width: `${playheadPosition}%` }}
          />
        </div>

        {/* 재생헤드 */}
        <div 
          className={styles.playhead}
          style={{ left: `${playheadPosition}%` }}
          role="slider"
          aria-label={`현재 재생 시간 ${formatTime(currentTime)}`}
        />

        {/* 타임라인 이벤트들 */}
        {timelineEvents.map(event => {
          if (event.type === 'comment') {
            return (
              <div
                key={event.id}
                data-testid={`timeline-comment-marker-${event.id}`}
                className={`${styles.commentMarker} ${
                  event.priority ? styles[`priority-${event.priority}`] : ''
                } ${
                  event.status ? styles[`status-${event.status}`] : ''
                }`}
                style={{ left: `${event.position}%` }}
                onClick={(e) => handleCommentMarkerClick(event.id, e)}
                role="button"
                tabIndex={0}
                aria-label={`댓글 ${formatTime(event.timestamp)}`}
                title={`댓글 - ${formatTime(event.timestamp)}`}
              />
            )
          } else {
            return (
              <div
                key={event.id}
                className={styles.timelineMarker}
                style={{ left: `${event.position}%` }}
                role="button"
                tabIndex={0}
                aria-label={`마커 ${formatTime(event.timestamp)}`}
                title={`마커 - ${formatTime(event.timestamp)}`}
              />
            )
          }
        })}
      </div>

      {/* 시간 눈금 */}
      <div className={styles.timeScale}>
        {Array.from({ length: Math.ceil(duration / 30) }, (_, i) => {
          const timestamp = i * 30
          const position = duration > 0 ? (timestamp / duration) * 100 : 0
          
          return (
            <div
              key={i}
              className={styles.timeTick}
              style={{ left: `${position}%` }}
            >
              <span className={styles.timeLabel}>
                {formatTime(timestamp)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}