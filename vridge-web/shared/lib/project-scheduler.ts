import { addDays, addWeeks, format } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 자동 일정 계산을 위한 인터페이스
 */
export interface AutoScheduleConfig {
  planningWeeks: number
  filmingDays: number  
  editingWeeks: number
}

export interface AutoScheduleResult {
  planning: {
    startDate: Date
    endDate: Date
    duration: number
    unit: 'days' | 'weeks'
  }
  filming: {
    startDate: Date
    endDate: Date  
    duration: number
    unit: 'days'
  }
  editing: {
    startDate: Date
    endDate: Date
    duration: number
    unit: 'days' | 'weeks'  
  }
  totalDays: number
}

/**
 * DEVPLAN.md 요구사항에 따른 기본 자동 일정 설정
 * - 기획: 1주 (7일)
 * - 촬영: 1일
 * - 편집: 2주 (14일)
 */
export const DEFAULT_AUTO_SCHEDULE: AutoScheduleConfig = {
  planningWeeks: 1,
  filmingDays: 1, 
  editingWeeks: 2
}

/**
 * 프로젝트 시작일을 기준으로 자동 일정을 계산합니다
 * DEVPLAN.md DoD 요구사항: "자동 일정 디폴트(기획 1주·촬영 1일·편집 2주) 자동 등록"
 */
export function calculateAutoSchedule(
  startDate: Date,
  config: AutoScheduleConfig = DEFAULT_AUTO_SCHEDULE
): AutoScheduleResult {
  const planningStartDate = new Date(startDate)
  
  // 기획 단계: 설정된 주 수만큼 계산
  const planningEndDate = addWeeks(planningStartDate, config.planningWeeks)
  const planningDays = config.planningWeeks * 7
  
  // 촬영 단계: 기획 완료 다음 날부터
  const filmingStartDate = addDays(planningEndDate, 1)
  const filmingEndDate = addDays(filmingStartDate, config.filmingDays - 1)
  
  // 편집 단계: 촬영 완료 다음 날부터
  const editingStartDate = addDays(filmingEndDate, 1)
  const editingEndDate = addWeeks(editingStartDate, config.editingWeeks)
  const editingDays = config.editingWeeks * 7
  
  // 총 프로젝트 기간
  const totalDays = planningDays + config.filmingDays + editingDays
  
  return {
    planning: {
      startDate: planningStartDate,
      endDate: planningEndDate,
      duration: config.planningWeeks,
      unit: 'weeks'
    },
    filming: {
      startDate: filmingStartDate,
      endDate: filmingEndDate,
      duration: config.filmingDays,
      unit: 'days'
    },
    editing: {
      startDate: editingStartDate,
      endDate: editingEndDate,
      duration: config.editingWeeks,
      unit: 'weeks'
    },
    totalDays
  }
}

/**
 * 자동 일정을 사용자 친화적인 문자열로 포맷합니다
 */
export function formatSchedulePhase(
  startDate: Date,
  endDate: Date,
  duration: number,
  unit: 'days' | 'weeks'
): string {
  const formatStr = 'yyyy-MM-dd'
  
  if (unit === 'days' && duration === 1) {
    // 하루짜리 일정 (촬영)
    return format(startDate, formatStr, { locale: ko })
  } else {
    // 여러 날/주짜리 일정 (기획, 편집)
    return `${format(startDate, formatStr, { locale: ko })} ~ ${format(endDate, formatStr, { locale: ko })}`
  }
}

/**
 * 자동 일정을 간단한 레이블로 표시합니다
 * DEVPLAN.md 요구사항: 프리뷰 카드에서 "기획: 1주, 촬영: 1일, 편집: 2주" 형태로 표시
 */
export function getScheduleLabels(config: AutoScheduleConfig = DEFAULT_AUTO_SCHEDULE): {
  planning: string
  filming: string
  editing: string
} {
  return {
    planning: `기획: ${config.planningWeeks}주`,
    filming: `촬영: ${config.filmingDays}일`,
    editing: `편집: ${config.editingWeeks}주`
  }
}

/**
 * 자동 일정 설정이 유효한지 검증합니다
 */
export function validateAutoScheduleConfig(config: AutoScheduleConfig): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (config.planningWeeks <= 0) {
    errors.push('기획 기간은 1주 이상이어야 합니다')
  }
  
  if (config.filmingDays <= 0) {
    errors.push('촬영 기간은 1일 이상이어야 합니다')  
  }
  
  if (config.editingWeeks <= 0) {
    errors.push('편집 기간은 1주 이상이어야 합니다')
  }
  
  // 합리적인 상한 체크
  if (config.planningWeeks > 12) {
    errors.push('기획 기간은 12주를 초과할 수 없습니다')
  }
  
  if (config.filmingDays > 30) {
    errors.push('촬영 기간은 30일을 초과할 수 없습니다')
  }
  
  if (config.editingWeeks > 24) {
    errors.push('편집 기간은 24주를 초과할 수 없습니다')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}