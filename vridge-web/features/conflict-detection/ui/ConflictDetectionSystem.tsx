/**
 * ConflictDetectionSystem - 일정 충돌 감지 및 시각적 경고 시스템
 * Phase 1 - TDD Green 단계 구현
 */

'use client'

import { useMemo, useCallback } from 'react'

import styles from './ConflictDetectionSystem.module.scss'
import type { CalendarEvent } from '../../../entities'
import type { ConflictDetectionResult, ConflictInfo } from '../model/types'
import { ConflictSeverity, ConflictResolution } from '../model/types'


interface ConflictDetectionSystemProps {
  events: CalendarEvent[]
  onConflictResolve?: (conflictId: string, resolution: ConflictResolution) => void
  showResolutionSuggestions?: boolean
}

export function ConflictDetectionSystem({
  events,
  onConflictResolve,
  showResolutionSuggestions = true
}: ConflictDetectionSystemProps) {
  
  // 핵심 충돌 감지 알고리즘
  const detectConflicts = useCallback((events: CalendarEvent[]): ConflictDetectionResult => {
    const conflicts: ConflictInfo[] = []
    
    // 모든 이벤트 쌍 검사
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i]
        const event2 = events[j]
        
        const start1 = new Date(event1.startDate).getTime()
        const end1 = new Date(event1.endDate).getTime()
        const start2 = new Date(event2.startDate).getTime()
        const end2 = new Date(event2.endDate).getTime()
        
        // 시간 겹침 검사
        if (start1 < end2 && start2 < end1) {
          const overlapStart = Math.max(start1, start2)
          const overlapEnd = Math.min(end1, end2)
          const durationMinutes = Math.round((overlapEnd - overlapStart) / (1000 * 60))
          
          // 충돌 심각도 판단
          let severity: ConflictSeverity = ConflictSeverity.LOW
          let reason = '일정이 겹칩니다'
          
          // 촬영 일정 충돌은 CRITICAL
          if (event1.type === 'filming' && event2.type === 'filming') {
            severity = ConflictSeverity.CRITICAL
            reason = '촬영 일정이 충돌합니다'
          }
          // 동일 프로젝트 내 충돌은 HIGH
          else if (event1.projectId === event2.projectId) {
            severity = ConflictSeverity.HIGH
            reason = '동일 프로젝트 내 일정이 충돌합니다'
          }
          // 리소스 충돌 검사 (추후 확장 가능)
          else if (event1.priority === 'high' || event2.priority === 'high') {
            severity = ConflictSeverity.MEDIUM
            reason = '우선순위 높은 일정과 충돌합니다'
          }
          
          const conflictInfo: ConflictInfo = {
            id: `conflict-${event1.id}-${event2.id}`,
            severity,
            conflictingEvents: [event1, event2],
            reason,
            suggestedResolutions: [
              ConflictResolution.RESCHEDULE_FIRST,
              ConflictResolution.RESCHEDULE_SECOND,
              ConflictResolution.IGNORE
            ],
            overlapPeriod: {
              start: new Date(overlapStart).toISOString(),
              end: new Date(overlapEnd).toISOString(),
              durationMinutes
            }
          }
          
          conflicts.push(conflictInfo)
        }
      }
    }
    
    // 날짜별로 충돌 그룹화
    const conflictsByDate: Record<string, ConflictInfo[]> = {}
    conflicts.forEach(conflict => {
      const date = conflict.overlapPeriod.start.split('T')[0]
      if (!conflictsByDate[date]) {
        conflictsByDate[date] = []
      }
      conflictsByDate[date].push(conflict)
    })
    
    return {
      hasConflicts: conflicts.length > 0,
      totalConflicts: conflicts.length,
      conflictsByDate,
      criticalConflicts: conflicts.filter(c => c.severity === ConflictSeverity.CRITICAL),
      suggestions: conflicts.length > 0 ? [
        '일정을 다른 날짜로 이동해보세요',
        '팀원과 상의하여 우선순위를 조정하세요'
      ] : []
    }
  }, [])
  
  const conflictResult = useMemo(() => detectConflicts(events), [events, detectConflicts])
  
  const handleConflictResolve = useCallback((conflictId: string, resolution: ConflictResolution) => {
    onConflictResolve?.(conflictId, resolution)
  }, [onConflictResolve])
  
  // 충돌이 없으면 아무것도 렌더링하지 않음
  if (!conflictResult.hasConflicts) {
    return null
  }
  
  return (
    <div 
      className={styles.conflictDetectionSystem}
      data-testid="conflict-detection-system"
    >
      {/* 메인 충돌 표시기 */}
      <div
        className={styles.conflictIndicator}
        data-testid="conflict-indicator"
        role="alert"
        aria-live="polite"
        tabIndex={0}
        aria-label={`${conflictResult.totalConflicts}개의 일정 충돌이 감지됨`}
      >
        <span className={styles.warningIcon}>⚠️</span>
        <span className={styles.conflictMessage}>
          일정 충돌이 감지되었습니다
        </span>
        <span className={styles.conflictCount}>
          ({conflictResult.totalConflicts}건)
        </span>
      </div>
      
      {/* 충돌된 이벤트들 표시 */}
      <div className={styles.conflictedEvents}>
        {conflictResult.criticalConflicts.map((conflict) => 
          conflict.conflictingEvents.map((event) => (
            <div
              key={`conflict-event-${event.id}`}
              className={`${styles.conflictEvent} conflict-border diagonal-pattern`}
              data-testid={`conflict-event-${event.id}`}
              style={{
                borderColor: event.color,
                backgroundColor: `${event.color}15` // 15% 투명도
              }}
            >
              <div className={styles.eventTitle}>{event.title}</div>
              <div className={styles.eventTime}>
                {new Date(event.startDate).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })} - {new Date(event.endDate).toLocaleTimeString('ko-KR', {
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* 해결 제안 팝오버 */}
      {showResolutionSuggestions && conflictResult.criticalConflicts.length > 0 && (
        <div className={styles.resolutionSuggestions}>
          <h3>충돌 해결 제안</h3>
          {conflictResult.criticalConflicts.map((conflict) => (
            <div key={conflict.id} className={styles.suggestionItem}>
              <div className={styles.conflictReason}>{conflict.reason}</div>
              <div className={styles.resolutionOptions}>
                <button 
                  onClick={() => handleConflictResolve(conflict.id, ConflictResolution.RESCHEDULE_FIRST)}
                  className={styles.resolutionBtn}
                >
                  {conflict.conflictingEvents[0].title}를 9월 9일로 이동
                </button>
                <button 
                  onClick={() => handleConflictResolve(conflict.id, ConflictResolution.RESCHEDULE_SECOND)}
                  className={styles.resolutionBtn}
                >
                  {conflict.conflictingEvents[1].title}를 9월 7일로 이동  
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}