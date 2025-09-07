/**
 * 순수 날짜 산술 계산 유틸리티
 * 라이브러리 없이 Date 객체만 사용
 * 주말, 휴일 고려 없는 단순 일자 더하기
 */

export interface SchedulePhase {
  name: string
  startDate: string
  endDate: string
  duration: number
}

export interface AutoSchedule {
  planning: SchedulePhase
  shooting: SchedulePhase
  editing: SchedulePhase
}

/**
 * 날짜 문자열을 Date 객체로 변환하고 유효성 검사
 */
export function parseDate(dateString: string): Date {
  const date = new Date(dateString + 'T00:00:00.000Z')

  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format')
  }

  return date
}

/**
 * Date 객체를 YYYY-MM-DD 형식 문자열로 변환
 */
export function formatDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * 주어진 날짜에 일수를 더한 새로운 날짜 반환
 */
export function addDays(date: Date, days: number): Date {
  const newDate = new Date(date)
  newDate.setUTCDate(newDate.getUTCDate() + days)
  return newDate
}

/**
 * 자동 일정 생성
 * 기획: 7일, 촬영: 1일, 편집: 14일
 */
export function generateAutoSchedule(startDateString: string): AutoSchedule {
  const startDate = parseDate(startDateString)

  // 기획 단계: 시작일부터 7일간
  const planningStart = startDate
  const planningEnd = addDays(planningStart, 6) // 시작일 포함 7일

  // 촬영 단계: 기획 끝 다음날부터 1일간
  const shootingStart = addDays(planningEnd, 1)
  const shootingEnd = shootingStart // 1일이므로 시작일과 동일

  // 편집 단계: 촬영 끝 다음날부터 14일간
  const editingStart = addDays(shootingEnd, 1)
  const editingEnd = addDays(editingStart, 13) // 시작일 포함 14일

  return {
    planning: {
      name: '기획',
      startDate: formatDate(planningStart),
      endDate: formatDate(planningEnd),
      duration: 7,
    },
    shooting: {
      name: '촬영',
      startDate: formatDate(shootingStart),
      endDate: formatDate(shootingEnd),
      duration: 1,
    },
    editing: {
      name: '편집',
      startDate: formatDate(editingStart),
      endDate: formatDate(editingEnd),
      duration: 14,
    },
  }
}

/**
 * 일정의 총 소요 기간 계산
 */
export function calculateTotalDuration(): number {
  return 7 + 1 + 14 // 22일
}
