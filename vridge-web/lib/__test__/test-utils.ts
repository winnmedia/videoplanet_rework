/**
 * 테스트 유틸리티 
 * 결정론적 테스트를 위한 헬퍼 함수들
 */

/**
 * MockDate - 시간을 고정하여 결정론적 테스트 지원
 */
export class MockDate {
  private originalDateNow: () => number
  private originalDateConstructor: DateConstructor
  private currentTime: number

  constructor(dateString: string) {
    this.originalDateNow = Date.now
    this.originalDateConstructor = globalThis.Date
    this.currentTime = new Date(dateString).getTime()
    this.mockDateNow()
  }

  private mockDateNow(): void {
    const self = this
    
    // Date.now 모킹
    Date.now = () => self.currentTime
    
    // Date 생성자 모킹 (단순화된 접근법)
    const MockedDate = function(this: any, ...args: any[]) {
      if (args.length === 0) {
        return new self.originalDateConstructor(self.currentTime)
      } else {
        return new self.originalDateConstructor(...(args as ConstructorParameters<DateConstructor>))
      }
    } as any

    // 정적 메서드 복사
    MockedDate.now = () => self.currentTime
    MockedDate.UTC = this.originalDateConstructor.UTC
    MockedDate.parse = this.originalDateConstructor.parse
    MockedDate.prototype = this.originalDateConstructor.prototype

    // new 키워드 없이 호출된 경우 처리
    const ProxyDate = new Proxy(MockedDate, {
      construct(target, args) {
        if (args.length === 0) {
          return new self.originalDateConstructor(self.currentTime)
        } else {
          return new self.originalDateConstructor(...(args as ConstructorParameters<DateConstructor>))
        }
      }
    })

    globalThis.Date = ProxyDate as any
  }

  /**
   * 시간을 앞으로 진행
   * @param milliseconds - 진행할 밀리초
   */
  advance(milliseconds: number): void {
    this.currentTime += milliseconds
    Date.now = () => this.currentTime
  }

  /**
   * 특정 시간으로 설정
   * @param timestamp - 설정할 타임스탬프
   */
  setTime(timestamp: number): void {
    this.currentTime = timestamp
    Date.now = () => this.currentTime
  }

  /**
   * 현재 모킹된 시간 반환
   */
  getCurrentTime(): number {
    return this.currentTime
  }

  /**
   * 모킹 해제 및 원래 Date 복원
   */
  restore(): void {
    Date.now = this.originalDateNow
    globalThis.Date = this.originalDateConstructor
  }
}

/**
 * 비동기 함수의 완료를 기다리는 헬퍼
 */
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 무작위 해시 생성 (테스트용)
 */
export const generateTestHash = (seed: string): string => {
  // 간단한 해시 함수 (테스트용)
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 32비트 정수로 변환
  }
  return Math.abs(hash).toString(36)
}

/**
 * 테스트용 이메일 주소를 해시로 변환
 */
export const hashEmail = (email: string): string => {
  return `hash_${generateTestHash(email)}`
}

/**
 * PII 제거 검증 헬퍼
 */
export const hasPII = (obj: any): boolean => {
  const piiFields = ['email', 'name', 'phone', 'address', 'ip']
  
  const checkObject = (item: any): boolean => {
    if (typeof item !== 'object' || item === null) {
      return false
    }
    
    if (Array.isArray(item)) {
      return item.some(checkObject)
    }
    
    for (const key of Object.keys(item)) {
      if (piiFields.some(field => key.toLowerCase().includes(field))) {
        return true
      }
      if (typeof item[key] === 'object' && checkObject(item[key])) {
        return true
      }
    }
    
    return false
  }
  
  return checkObject(obj)
}