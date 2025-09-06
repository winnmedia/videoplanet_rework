/**
 * @fileoverview Timecode Utilities Test
 * @module features/video-feedback/lib/__tests__
 * 
 * 타임코드 유틸리티 함수들의 단위 테스트
 */

import {
  formatTimecode,
  parseTimecode,
  insertTimecode,
  extractTimecodes,
  isValidTimecodeFormat
} from '../timecodeUtils';

describe('타임코드 유틸리티', () => {
  describe('formatTimecode', () => {
    it('초를 [mm:ss.mmm] 형식으로 변환해야 함', () => {
      expect(formatTimecode(0)).toBe('[00:00.000]');
      expect(formatTimecode(1.5)).toBe('[00:01.500]');
      expect(formatTimecode(65.250)).toBe('[01:05.250]');
      expect(formatTimecode(3661.123)).toBe('[61:01.123]');
    });

    it('소수점 이하 3자리까지 표시해야 함', () => {
      expect(formatTimecode(1.1)).toBe('[00:01.100]');
      expect(formatTimecode(1.12)).toBe('[00:01.120]');
      expect(formatTimecode(1.123456)).toBe('[00:01.123]');
    });

    it('음수나 잘못된 값에 대해 기본값을 반환해야 함', () => {
      expect(formatTimecode(-5)).toBe('[00:00.000]');
      expect(formatTimecode(NaN)).toBe('[00:00.000]');
      expect(formatTimecode(Infinity)).toBe('[00:00.000]');
    });
  });

  describe('parseTimecode', () => {
    it('[mm:ss.mmm] 형식을 초 단위로 변환해야 함', () => {
      expect(parseTimecode('[00:00.000]')).toBe(0);
      expect(parseTimecode('[00:01.500]')).toBe(1.5);
      expect(parseTimecode('[01:05.250]')).toBe(65.25);
      expect(parseTimecode('[61:01.123]')).toBe(3661.123);
    });

    it('잘못된 형식에 대해 null을 반환해야 함', () => {
      expect(parseTimecode('00:01.500')).toBeNull(); // 대괄호 없음
      expect(parseTimecode('[00:61.000]')).toBeNull(); // 잘못된 초
      expect(parseTimecode('[00:00.1000]')).toBeNull(); // 밀리초 4자리
      expect(parseTimecode('[invalid]')).toBeNull();
      expect(parseTimecode('')).toBeNull();
    });
  });

  describe('insertTimecode', () => {
    it('텍스트의 커서 위치에 타임코드를 삽입해야 함', () => {
      const result = insertTimecode('안녕하세요', 5, 65.25);
      expect(result.newText).toBe('안녕하세요[01:05.250]');
      expect(result.newCursorPosition).toBe(16); // '안녕하세요[01:05.250]' 위치
    });

    it('텍스트 중간에 타임코드를 삽입해야 함', () => {
      const result = insertTimecode('안녕하세요 반갑습니다', 6, 1.5);
      expect(result.newText).toBe('안녕하세요 [00:01.500]반갑습니다');
      expect(result.newCursorPosition).toBe(17);
    });

    it('빈 텍스트에 타임코드를 삽입해야 함', () => {
      const result = insertTimecode('', 0, 0);
      expect(result.newText).toBe('[00:00.000]');
      expect(result.newCursorPosition).toBe(11);
    });

    it('잘못된 커서 위치에 대해 텍스트 끝에 삽입해야 함', () => {
      const result = insertTimecode('안녕', 10, 1.5);
      expect(result.newText).toBe('안녕[00:01.500]');
      expect(result.newCursorPosition).toBe(13);
    });

    it('음수 커서 위치에 대해 텍스트 시작에 삽입해야 함', () => {
      const result = insertTimecode('안녕', -1, 1.5);
      expect(result.newText).toBe('[00:01.500]안녕');
      expect(result.newCursorPosition).toBe(11);
    });
  });

  describe('extractTimecodes', () => {
    it('텍스트에서 모든 타임코드를 추출해야 함', () => {
      const text = '첫 번째 장면 [00:15.500]에서 문제가 있고, [02:30.250]에서도 확인이 필요합니다.';
      const timecodes = extractTimecodes(text);
      
      expect(timecodes).toHaveLength(2);
      expect(timecodes[0]).toEqual({
        text: '[00:15.500]',
        timestamp: 15.5,
        startIndex: 8,
        endIndex: 19
      });
      expect(timecodes[1]).toEqual({
        text: '[02:30.250]',
        timestamp: 150.25,
        startIndex: 30,
        endIndex: 41
      });
    });

    it('타임코드가 없는 텍스트에서 빈 배열을 반환해야 함', () => {
      const timecodes = extractTimecodes('타임코드가 없는 텍스트입니다.');
      expect(timecodes).toHaveLength(0);
    });

    it('잘못된 형식의 타임코드는 무시해야 함', () => {
      const text = '정상: [01:30.500] 잘못됨: [00:61.000] 또 정상: [00:05.123]';
      const timecodes = extractTimecodes(text);
      
      expect(timecodes).toHaveLength(2);
      expect(timecodes[0].timestamp).toBe(90.5);
      expect(timecodes[1].timestamp).toBe(5.123);
    });
  });

  describe('isValidTimecodeFormat', () => {
    it('올바른 타임코드 형식을 검증해야 함', () => {
      expect(isValidTimecodeFormat('[00:00.000]')).toBe(true);
      expect(isValidTimecodeFormat('[59:59.999]')).toBe(true);
      expect(isValidTimecodeFormat('[01:30.500]')).toBe(true);
    });

    it('잘못된 타임코드 형식을 거부해야 함', () => {
      expect(isValidTimecodeFormat('00:00.000')).toBe(false); // 대괄호 없음
      expect(isValidTimecodeFormat('[00:60.000]')).toBe(false); // 잘못된 초
      expect(isValidTimecodeFormat('[00:00.1000]')).toBe(false); // 밀리초 4자리
      expect(isValidTimecodeFormat('[000:00.000]')).toBe(false); // 분 3자리
      expect(isValidTimecodeFormat('[00:00.00]')).toBe(false); // 밀리초 2자리
      expect(isValidTimecodeFormat('[invalid]')).toBe(false);
      expect(isValidTimecodeFormat('')).toBe(false);
    });
  });
});