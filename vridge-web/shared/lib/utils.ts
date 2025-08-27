/**
 * Shared Utility Functions
 * 4개 모듈에서 공통으로 사용하는 유틸리티 함수들
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// =================== CSS 클래스 관련 ===================

/**
 * CSS 클래스 이름을 조건부로 병합
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// =================== 날짜 및 시간 관련 ===================

/**
 * 날짜를 한국어 형식으로 포맷
 * @param date - 날짜 (Date 객체, ISO 문자열, 밀리초)
 * @param options - 포맷 옵션
 * @returns 포맷된 날짜 문자열
 * 
 * @example
 * formatDate(new Date()) // '2025년 8월 26일'
 * formatDate('2025-08-26', { includeWeekday: true }) // '2025년 8월 26일 (월)'
 * formatDate(Date.now(), { format: 'short' }) // '8/26'
 */
export function formatDate(
  date: Date | string | number,
  options: {
    format?: 'full' | 'short' | 'medium' | 'iso'
    includeWeekday?: boolean
    includeTime?: boolean
  } = {}
): string {
  const {
    format = 'full',
    includeWeekday = false,
    includeTime = false
  } = options

  const dateObj = new Date(date)

  if (isNaN(dateObj.getTime())) {
    return '잘못된 날짜'
  }

  const year = dateObj.getFullYear()
  const month = dateObj.getMonth() + 1
  const day = dateObj.getDate()
  const weekdays = ['일', '월', '화', '수', '목', '금', '토']
  const weekday = weekdays[dateObj.getDay()]

  let result = ''

  switch (format) {
    case 'full':
      result = `${year}년 ${month}월 ${day}일`
      break
    case 'medium':
      result = `${month}월 ${day}일`
      break
    case 'short':
      result = `${month}/${day}`
      break
    case 'iso':
      result = dateObj.toISOString().split('T')[0]
      break
    default:
      result = `${year}년 ${month}월 ${day}일`
  }

  if (includeWeekday) {
    result += ` (${weekday})`
  }

  if (includeTime) {
    const hours = String(dateObj.getHours()).padStart(2, '0')
    const minutes = String(dateObj.getMinutes()).padStart(2, '0')
    result += ` ${hours}:${minutes}`
  }

  return result
}

/**
 * 상대 시간을 한국어로 표시
 * @param date - 기준 날짜
 * @param now - 현재 시간 (기본: new Date())
 * @returns 상대 시간 문자열
 * 
 * @example
 * formatRelativeTime(new Date(Date.now() - 60000)) // '1분 전'
 * formatRelativeTime(new Date(Date.now() - 3600000)) // '1시간 전'
 * formatRelativeTime(new Date(Date.now() + 86400000)) // '1일 후'
 */
export function formatRelativeTime(date: Date | string | number, now = new Date()): string {
  const dateObj = new Date(date)
  const nowObj = new Date(now)
  
  if (isNaN(dateObj.getTime()) || isNaN(nowObj.getTime())) {
    return '알 수 없음'
  }

  const diffMs = nowObj.getTime() - dateObj.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (Math.abs(diffMinutes) < 1) {
    return '방금'
  } else if (Math.abs(diffMinutes) < 60) {
    return diffMinutes > 0 ? `${diffMinutes}분 전` : `${Math.abs(diffMinutes)}분 후`
  } else if (Math.abs(diffHours) < 24) {
    return diffHours > 0 ? `${diffHours}시간 전` : `${Math.abs(diffHours)}시간 후`
  } else if (Math.abs(diffDays) < 7) {
    return diffDays > 0 ? `${diffDays}일 전` : `${Math.abs(diffDays)}일 후`
  } else {
    return formatDate(dateObj, { format: 'medium' })
  }
}

/**
 * 타임스탬프를 영상 시간 형식으로 변환
 * @param seconds - 초 단위 시간
 * @returns MM:SS 또는 HH:MM:SS 형식
 * 
 * @example
 * formatVideoTime(90) // '01:30'
 * formatVideoTime(3661) // '01:01:01'
 */
export function formatVideoTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// =================== 숫자 및 통화 관련 ===================

/**
 * 한국 원화 형식으로 포맷
 * @param amount - 금액
 * @param options - 포맷 옵션
 * @returns 포맷된 통화 문자열
 * 
 * @example
 * formatCurrency(1000000) // '₩1,000,000'
 * formatCurrency(1500000, { unit: 'man' }) // '150만원'
 */
export function formatCurrency(
  amount: number,
  options: {
    unit?: 'won' | 'man' | 'eok'
    showSymbol?: boolean
  } = {}
): string {
  const { unit = 'won', showSymbol = true } = options

  if (isNaN(amount)) {
    return '₩0'
  }

  switch (unit) {
    case 'man':
      const manAmount = Math.floor(amount / 10000)
      return `${manAmount.toLocaleString('ko-KR')}만원`
    
    case 'eok':
      const eokAmount = Math.floor(amount / 100000000)
      return `${eokAmount.toLocaleString('ko-KR')}억원`
    
    default:
      const symbol = showSymbol ? '₩' : ''
      return `${symbol}${amount.toLocaleString('ko-KR')}`
  }
}

/**
 * 파일 크기를 읽기 좋은 형식으로 변환
 * @param bytes - 바이트 크기
 * @returns 포맷된 크기 문자열
 * 
 * @example
 * formatFileSize(1024) // '1 KB'
 * formatFileSize(1048576) // '1 MB'
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  
  if (bytes === 0) return '0 B'
  
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = bytes / Math.pow(1024, i)
  
  return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`
}

/**
 * 백분율 형식으로 변환
 * @param value - 0-1 사이의 값 또는 절대값
 * @param total - 전체값 (절대값인 경우)
 * @returns 백분율 문자열
 * 
 * @example
 * formatPercentage(0.75) // '75%'
 * formatPercentage(30, 100) // '30%'
 */
export function formatPercentage(value: number, total?: number): string {
  if (total !== undefined && total > 0) {
    return `${Math.round((value / total) * 100)}%`
  }
  
  return `${Math.round(value * 100)}%`
}

// =================== 문자열 관련 ===================

/**
 * 문자열을 지정된 길이로 자르고 말줄임 추가
 * @param str - 자를 문자열
 * @param length - 최대 길이
 * @param suffix - 말줄임 표시 (기본: '...')
 * @returns 잘린 문자열
 * 
 * @example
 * truncateText('긴 텍스트입니다', 5) // '긴 텍스...'
 */
export function truncateText(str: string, length: number, suffix = '...'): string {
  if (!str || str.length <= length) {
    return str || ''
  }
  
  return str.slice(0, length) + suffix
}

/**
 * 문자열에서 HTML 태그 제거
 * @param html - HTML 문자열
 * @returns 태그가 제거된 문자열
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/**
 * 캐멀케이스를 케밥케이스로 변환
 * @param str - 캐멀케이스 문자열
 * @returns 케밥케이스 문자열
 * 
 * @example
 * camelToKebab('backgroundColor') // 'background-color'
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * 케밥케이스를 캐멀케이스로 변환
 * @param str - 케밥케이스 문자열
 * @returns 캐멀케이스 문자열
 * 
 * @example
 * kebabToCamel('background-color') // 'backgroundColor'
 */
export function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

// =================== 폼 유효성 검사 ===================

/**
 * 이메일 유효성 검사
 * @param email - 검사할 이메일
 * @returns 유효성 여부
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 한국 전화번호 유효성 검사
 * @param phone - 검사할 전화번호
 * @returns 유효성 여부
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^01[016789]-?\d{3,4}-?\d{4}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

/**
 * 비밀번호 강도 검사
 * @param password - 검사할 비밀번호
 * @returns 강도 및 메시지
 */
export function validatePassword(password: string): {
  strength: 'weak' | 'medium' | 'strong'
  message: string
  isValid: boolean
} {
  if (password.length < 6) {
    return {
      strength: 'weak',
      message: '6자 이상 입력해주세요',
      isValid: false
    }
  }

  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

  const score = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length

  if (score < 2) {
    return {
      strength: 'weak',
      message: '영문자와 숫자를 포함해주세요',
      isValid: false
    }
  } else if (score < 3) {
    return {
      strength: 'medium',
      message: '안전한 비밀번호입니다',
      isValid: true
    }
  } else {
    return {
      strength: 'strong',
      message: '매우 안전한 비밀번호입니다',
      isValid: true
    }
  }
}

/**
 * 폼 데이터 유효성 검사
 * @param data - 검사할 데이터
 * @param rules - 유효성 규칙
 * @returns 에러 객체
 */
export function validateForm<T extends Record<string, any>>(
  data: T,
  rules: Record<keyof T, {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: any) => string | null
  }>
): Record<keyof T, string> {
  const errors = {} as Record<keyof T, string>

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field]

    if (rule.required && (!value || value === '')) {
      errors[field as keyof T] = '필수 항목입니다'
      continue
    }

    if (value && rule.minLength && value.length < rule.minLength) {
      errors[field as keyof T] = `${rule.minLength}자 이상 입력해주세요`
      continue
    }

    if (value && rule.maxLength && value.length > rule.maxLength) {
      errors[field as keyof T] = `${rule.maxLength}자 이하로 입력해주세요`
      continue
    }

    if (value && rule.pattern && !rule.pattern.test(value)) {
      errors[field as keyof T] = '올바른 형식이 아닙니다'
      continue
    }

    if (value && rule.custom) {
      const customError = rule.custom(value)
      if (customError) {
        errors[field as keyof T] = customError
        continue
      }
    }
  }

  return errors
}

// =================== 배열 및 객체 관련 ===================

/**
 * 깊은 복사
 * @param obj - 복사할 객체
 * @returns 복사된 객체
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T
  }

  if (typeof obj === 'object') {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }

  return obj
}

/**
 * 깊은 비교
 * @param obj1 - 첫 번째 객체
 * @param obj2 - 두 번째 객체
 * @returns 같으면 true
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true
  }

  if (obj1 === null || obj2 === null) {
    return false
  }

  if (typeof obj1 !== typeof obj2) {
    return false
  }

  if (typeof obj1 !== 'object') {
    return false
  }

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false
    }

    if (!deepEqual(obj1[key], obj2[key])) {
      return false
    }
  }

  return true
}

/**
 * 객체에서 특정 키들만 선택
 * @param obj - 원본 객체
 * @param keys - 선택할 키들
 * @returns 선택된 키들로 구성된 새 객체
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

/**
 * 객체에서 특정 키들 제외
 * @param obj - 원본 객체
 * @param keys - 제외할 키들
 * @returns 제외된 키들을 빼고 구성된 새 객체
 */
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

// =================== 기타 유틸리티 ===================

/**
 * 고유 ID 생성
 * @param prefix - 접두사 (선택사항)
 * @returns 고유 ID 문자열
 * 
 * @example
 * generateId() // 'abc123def456'
 * generateId('user') // 'user_abc123def456'
 */
export function generateId(prefix?: string): string {
  const id = Math.random().toString(36).substr(2, 9)
  return prefix ? `${prefix}_${id}` : id
}

/**
 * 지연 실행
 * @param ms - 지연 시간 (밀리초)
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 범위 내 랜덤 숫자 생성
 * @param min - 최소값
 * @param max - 최대값
 * @returns 랜덤 숫자
 */
export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 배열 섞기 (Fisher-Yates 알고리즘)
 * @param array - 섞을 배열
 * @returns 섞인 새 배열
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * URL에서 쿼리 파라미터 파싱
 * @param url - 파싱할 URL
 * @returns 파라미터 객체
 */
export function parseQueryParams(url: string): Record<string, string> {
  const params: Record<string, string> = {}
  const urlObj = new URL(url, 'http://localhost') // 상대 URL 처리를 위한 base
  
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value
  })
  
  return params
}

/**
 * 객체를 쿼리 문자열로 변환
 * @param params - 파라미터 객체
 * @returns 쿼리 문자열
 */
export function stringifyQueryParams(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value))
    }
  }
  
  return searchParams.toString()
}