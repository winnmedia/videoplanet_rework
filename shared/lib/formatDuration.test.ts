import { describe, it, expect } from 'vitest'

import { formatDuration } from './formatDuration'

describe('formatDuration', () => {
  describe('일 단위 표시 (7일 미만)', () => {
    it('1일은 일 단위로 표시되어야 함', () => {
      expect(formatDuration(1, '촬영')).toBe('촬영 1일')
    })

    it('6일은 일 단위로 표시되어야 함', () => {
      expect(formatDuration(6, '기획')).toBe('기획 6일')
    })
  })

  describe('주 단위 표시 (7의 배수)', () => {
    it('7일은 1주로 표시되어야 함', () => {
      expect(formatDuration(7, '기획')).toBe('기획 1주')
    })

    it('14일은 2주로 표시되어야 함', () => {
      expect(formatDuration(14, '편집')).toBe('편집 2주')
    })

    it('21일은 3주로 표시되어야 함', () => {
      expect(formatDuration(21, '편집')).toBe('편집 3주')
    })
  })

  describe('일 단위 표시 (7일 이상이지만 7의 배수가 아님)', () => {
    it('8일은 일 단위로 표시되어야 함', () => {
      expect(formatDuration(8, '기획')).toBe('기획 8일')
    })

    it('10일은 일 단위로 표시되어야 함', () => {
      expect(formatDuration(10, '기획')).toBe('기획 10일')
    })

    it('15일은 일 단위로 표시되어야 함', () => {
      expect(formatDuration(15, '편집')).toBe('편집 15일')
    })
  })

  describe('엣지 케이스', () => {
    it('0일도 처리해야 함', () => {
      expect(formatDuration(0, '기획')).toBe('기획 0일')
    })

    it('다양한 단계 이름을 처리해야 함', () => {
      expect(formatDuration(7, '검토')).toBe('검토 1주')
      expect(formatDuration(3, '수정')).toBe('수정 3일')
    })
  })
})