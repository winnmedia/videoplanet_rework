/**
 * ConflictDetection - 충돌 감지 시스템 타입 정의
 * Phase 1 - 핵심 비즈니스 로직 타입
 */

import type { CalendarEvent } from '../../../widgets/Calendar/model/types'

/**
 * 충돌 심각도 레벨
 */
export enum ConflictSeverity {
  LOW = 'low',           // 기획-편집 간 겹침 (허용 가능)
  MEDIUM = 'medium',     // 동일 팀원의 다중 작업
  HIGH = 'high',         // 촬영 장비 중복 사용
  CRITICAL = 'critical'  // 동일 촬영 공간/시간 중복
}

/**
 * 충돌 해결 방안
 */
export enum ConflictResolution {
  RESCHEDULE_FIRST = 'reschedule_first',   // 첫 번째 이벤트 일정 변경
  RESCHEDULE_SECOND = 'reschedule_second', // 두 번째 이벤트 일정 변경
  MERGE_EVENTS = 'merge_events',           // 이벤트 병합 (가능한 경우)
  SPLIT_RESOURCES = 'split_resources',     // 리소스 분할
  IGNORE = 'ignore'                        // 충돌 무시 (사용자 판단)
}

/**
 * 충돌 정보
 */
export interface ConflictInfo {
  id: string
  severity: ConflictSeverity
  conflictingEvents: [CalendarEvent, CalendarEvent] // 항상 2개 쌍
  reason: string                    // 충돌 원인 설명
  suggestedResolutions: ConflictResolution[]
  overlapPeriod: {
    start: string                   // ISO 날짜 문자열
    end: string
    durationMinutes: number
  }
  resourceConflicts?: string[]      // 충돌하는 리소스 목록 (장비, 인력, 장소)
}

/**
 * 충돌 감지 결과
 */
export interface ConflictDetectionResult {
  hasConflicts: boolean
  totalConflicts: number
  conflictsByDate: Record<string, ConflictInfo[]>
  criticalConflicts: ConflictInfo[]
  suggestions: string[]             // 전체적인 일정 조정 제안
}

/**
 * 충돌 해결 액션
 */
export interface ConflictResolutionAction {
  conflictId: string
  resolution: ConflictResolution
  newSchedule?: {
    eventId: string
    newStartDate: string
    newEndDate: string
  }
  userNote?: string
}

/**
 * 충돌 감지 옵션
 */
export interface ConflictDetectionOptions {
  ignoreLowSeverity?: boolean
  allowSameTeamOverlap?: boolean    // 동일 팀 내 작업 겹침 허용
  strictFilmingSchedule?: boolean   // 촬영 일정 엄격 관리
  resourcePriority?: string[]       // 리소스 우선순위
}
