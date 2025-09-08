import { parseDate, formatDate, addDays, generateAutoSchedule, calculateTotalDuration } from '../date-utils'

describe('date-utils', () => {
  describe('parseDate', () => {
    it('유효한 날짜 문자열을 Date 객체로 변환해야 함', () => {
      const result = parseDate('2025-01-01')
      expect(result).toBeInstanceOf(Date)
      expect(result.getUTCFullYear()).toBe(2025)
      expect(result.getUTCMonth()).toBe(0) // 0부터 시작
      expect(result.getUTCDate()).toBe(1)
    })

    it('유효하지 않은 날짜 문자열에 대해 오류를 발생시켜야 함', () => {
      expect(() => parseDate('invalid-date')).toThrow('Invalid date format')
      expect(() => parseDate('2025-13-01')).toThrow('Invalid date format')
      expect(() => parseDate('2025-01-32')).toThrow('Invalid date format')
    })
  })

  describe('formatDate', () => {
    it('Date 객체를 YYYY-MM-DD 형식으로 변환해야 함', () => {
      const date = new Date('2025-01-01T00:00:00.000Z')
      expect(formatDate(date)).toBe('2025-01-01')
    })

    it('한 자리 월과 일에 0을 패딩해야 함', () => {
      const date = new Date('2025-03-05T00:00:00.000Z')
      expect(formatDate(date)).toBe('2025-03-05')
    })
  })

  describe('addDays', () => {
    it('주어진 날짜에 일수를 더해야 함', () => {
      const startDate = new Date('2025-01-01T00:00:00.000Z')
      const result = addDays(startDate, 7)

      expect(formatDate(result)).toBe('2025-01-08')
    })

    it('월 경계를 올바르게 처리해야 함', () => {
      const startDate = new Date('2025-01-28T00:00:00.000Z')
      const result = addDays(startDate, 5)

      expect(formatDate(result)).toBe('2025-02-02')
    })

    it('윤년을 올바르게 처리해야 함', () => {
      const startDate = new Date('2024-02-28T00:00:00.000Z') // 2024는 윤년
      const result = addDays(startDate, 2)

      expect(formatDate(result)).toBe('2024-03-01')
    })

    it('원본 Date 객체를 수정하지 않아야 함', () => {
      const original = new Date('2025-01-01T00:00:00.000Z')
      const originalTime = original.getTime()

      addDays(original, 7)

      expect(original.getTime()).toBe(originalTime)
    })
  })

  describe('generateAutoSchedule', () => {
    it('기본 일정을 올바르게 생성해야 함', () => {
      const result = generateAutoSchedule('2025-01-01')

      expect(result).toEqual({
        planning: {
          name: '기획',
          startDate: '2025-01-01',
          endDate: '2025-01-07',
          duration: 7,
        },
        shooting: {
          name: '촬영',
          startDate: '2025-01-08',
          endDate: '2025-01-08',
          duration: 1,
        },
        editing: {
          name: '편집',
          startDate: '2025-01-09',
          endDate: '2025-01-22',
          duration: 14,
        },
      })
    })

    it('월말에서 다음 달로 넘어가는 경우를 올바르게 처리해야 함', () => {
      const result = generateAutoSchedule('2025-01-25')

      expect(result.planning.endDate).toBe('2025-01-31')
      expect(result.shooting.startDate).toBe('2025-02-01')
      expect(result.shooting.endDate).toBe('2025-02-01')
      expect(result.editing.startDate).toBe('2025-02-02')
      expect(result.editing.endDate).toBe('2025-02-15')
    })

    it('12월에서 다음 해로 넘어가는 경우를 올바르게 처리해야 함', () => {
      const result = generateAutoSchedule('2024-12-20')

      expect(result.planning.endDate).toBe('2024-12-26')
      expect(result.shooting.startDate).toBe('2024-12-27')
      expect(result.editing.startDate).toBe('2024-12-28')
      expect(result.editing.endDate).toBe('2025-01-10')
    })
  })

  describe('calculateTotalDuration', () => {
    it('총 소요 기간을 22일로 반환해야 함', () => {
      expect(calculateTotalDuration()).toBe(22)
    })
  })
})
