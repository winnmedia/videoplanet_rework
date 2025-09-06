/**
 * @fileoverview Timecode Utility Functions
 * @module features/video-feedback/lib
 * 
 * 타임코드 관련 유틸리티 함수 모음
 * - [mm:ss.mmm] 형식 지원
 * - 비디오 시간과 타임코드 상호 변환
 * - 텍스트 내 타임코드 삽입/추출
 * - 타임코드 클릭 시 비디오 시간 이동
 */

// ============================================================
// Types
// ============================================================

export interface TimecodeInsertResult {
  newText: string;
  newCursorPosition: number;
}

export interface TimecodeMatch {
  text: string;
  timestamp: number;
  startIndex: number;
  endIndex: number;
}

// ============================================================
// Constants
// ============================================================

/** 타임코드 정규식: [mm:ss.mmm] 형식 */
const TIMECODE_REGEX = /\[(\d{2}):([0-5]\d)\.(\d{3})\]/g;

/** 단일 타임코드 매칭 정규식 */
const SINGLE_TIMECODE_REGEX = /^\[(\d{2}):([0-5]\d)\.(\d{3})\]$/;

// ============================================================
// Core Functions
// ============================================================

/**
 * 초 단위 시간을 [mm:ss.mmm] 형식의 타임코드로 변환
 * 
 * @param seconds - 초 단위 시간
 * @returns [mm:ss.mmm] 형식의 타임코드
 */
export function formatTimecode(seconds: number): string {
  // 유효하지 않은 값에 대한 처리
  if (!isFinite(seconds) || seconds < 0) {
    return '[00:00.000]';
  }

  const totalSeconds = Math.floor(seconds);
  const milliseconds = Math.floor((seconds - totalSeconds) * 1000);
  
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `[${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}]`;
}

/**
 * [mm:ss.mmm] 형식의 타임코드를 초 단위로 변환
 * 
 * @param timecode - [mm:ss.mmm] 형식의 타임코드
 * @returns 초 단위 시간, 잘못된 형식이면 null
 */
export function parseTimecode(timecode: string): number | null {
  const match = timecode.match(SINGLE_TIMECODE_REGEX);
  
  if (!match) {
    return null;
  }

  const [, minutesStr, secondsStr, millisecondsStr] = match;
  const minutes = parseInt(minutesStr, 10);
  const seconds = parseInt(secondsStr, 10);
  const milliseconds = parseInt(millisecondsStr, 10);

  // 유효성 검증
  if (seconds >= 60 || milliseconds >= 1000) {
    return null;
  }

  return minutes * 60 + seconds + milliseconds / 1000;
}

/**
 * 텍스트의 지정된 위치에 타임코드를 삽입
 * 
 * @param text - 원본 텍스트
 * @param cursorPosition - 커서 위치 (삽입할 위치)
 * @param currentTime - 현재 비디오 재생 시간 (초)
 * @returns 새로운 텍스트와 커서 위치
 */
export function insertTimecode(
  text: string,
  cursorPosition: number,
  currentTime: number
): TimecodeInsertResult {
  const timecode = formatTimecode(currentTime);
  
  // 커서 위치 보정
  const safeCursorPosition = Math.max(0, Math.min(cursorPosition, text.length));
  
  // 타임코드 삽입
  const before = text.substring(0, safeCursorPosition);
  const after = text.substring(safeCursorPosition);
  
  const newText = before + timecode + after;
  const newCursorPosition = safeCursorPosition + timecode.length;

  return {
    newText,
    newCursorPosition
  };
}

/**
 * 텍스트에서 모든 타임코드를 추출
 * 
 * @param text - 검색할 텍스트
 * @returns 발견된 타임코드들의 정보
 */
export function extractTimecodes(text: string): TimecodeMatch[] {
  const matches: TimecodeMatch[] = [];
  let match: RegExpExecArray | null;

  // 정규식 초기화
  TIMECODE_REGEX.lastIndex = 0;

  while ((match = TIMECODE_REGEX.exec(text)) !== null) {
    const timecodeText = match[0];
    const timestamp = parseTimecode(timecodeText);

    if (timestamp !== null) {
      matches.push({
        text: timecodeText,
        timestamp,
        startIndex: match.index,
        endIndex: match.index + timecodeText.length
      });
    }
  }

  return matches;
}

/**
 * 타임코드 형식이 유효한지 검증
 * 
 * @param timecode - 검증할 타임코드 문자열
 * @returns 유효하면 true, 아니면 false
 */
export function isValidTimecodeFormat(timecode: string): boolean {
  return parseTimecode(timecode) !== null;
}

/**
 * 텍스트 내의 타임코드를 클릭 가능한 요소로 변환하는 헬퍼
 * 
 * @param text - 원본 텍스트
 * @param onTimecodeClick - 타임코드 클릭 핸들러
 * @returns JSX 요소들의 배열
 */
export function renderTextWithClickableTimecodes(
  text: string,
  onTimecodeClick?: (timestamp: number) => void
): Array<{ type: 'text' | 'timecode'; content: string; timestamp?: number; key: string }> {
  const timecodes = extractTimecodes(text);
  
  if (timecodes.length === 0) {
    return [{ type: 'text', content: text, key: 'text-0' }];
  }

  const parts = [];
  let lastIndex = 0;

  timecodes.forEach((timecode, index) => {
    // 타임코드 앞의 텍스트
    if (timecode.startIndex > lastIndex) {
      const textContent = text.substring(lastIndex, timecode.startIndex);
      parts.push({
        type: 'text' as const,
        content: textContent,
        key: `text-${index}`
      });
    }

    // 타임코드
    parts.push({
      type: 'timecode' as const,
      content: timecode.text,
      timestamp: timecode.timestamp,
      key: `timecode-${index}`
    });

    lastIndex = timecode.endIndex;
  });

  // 마지막 타임코드 이후의 텍스트
  if (lastIndex < text.length) {
    parts.push({
      type: 'text' as const,
      content: text.substring(lastIndex),
      key: `text-${timecodes.length}`
    });
  }

  return parts;
}

// ============================================================
// Advanced Features
// ============================================================

/**
 * 타임코드 주변에 공백을 적절히 추가하여 가독성 개선
 * 
 * @param text - 원본 텍스트
 * @returns 공백이 정리된 텍스트
 */
export function normalizeTimecodeSpacing(text: string): string {
  return text.replace(/(\S)\[(\d{2}):([0-5]\d)\.(\d{3})\]/g, '$1 [$2:$3.$4]')
             .replace(/\[(\d{2}):([0-5]\d)\.(\d{3})\](\S)/g, '[$1:$2.$3] $4');
}

/**
 * 텍스트에서 중복된 타임코드 제거
 * 
 * @param text - 원본 텍스트
 * @param tolerance - 중복으로 간주할 시간 차이 (초, 기본값: 1초)
 * @returns 중복이 제거된 텍스트
 */
export function removeDuplicateTimecodes(text: string, tolerance: number = 1): string {
  const timecodes = extractTimecodes(text);
  const duplicateIndices = new Set<number>();

  // 중복 타임코드 찾기
  for (let i = 0; i < timecodes.length; i++) {
    for (let j = i + 1; j < timecodes.length; j++) {
      if (Math.abs(timecodes[i].timestamp - timecodes[j].timestamp) <= tolerance) {
        duplicateIndices.add(j); // 나중에 나타나는 것을 중복으로 간주
      }
    }
  }

  // 뒤에서부터 제거하여 인덱스 변경 방지
  let result = text;
  const toRemove = Array.from(duplicateIndices).sort((a, b) => b - a);
  
  toRemove.forEach(index => {
    const timecode = timecodes[index];
    result = result.substring(0, timecode.startIndex) + 
             result.substring(timecode.endIndex);
  });

  return result;
}

/**
 * 시간 범위에 해당하는 타임코드들을 추출
 * 
 * @param text - 검색할 텍스트
 * @param startTime - 시작 시간 (초)
 * @param endTime - 종료 시간 (초)
 * @returns 범위 내의 타임코드들
 */
export function extractTimecodesInRange(
  text: string,
  startTime: number,
  endTime: number
): TimecodeMatch[] {
  const allTimecodes = extractTimecodes(text);
  return allTimecodes.filter(
    timecode => timecode.timestamp >= startTime && timecode.timestamp <= endTime
  );
}

/**
 * 가장 가까운 타임코드 찾기
 * 
 * @param text - 검색할 텍스트
 * @param targetTime - 기준 시간 (초)
 * @returns 가장 가까운 타임코드, 없으면 null
 */
export function findNearestTimecode(text: string, targetTime: number): TimecodeMatch | null {
  const timecodes = extractTimecodes(text);
  
  if (timecodes.length === 0) {
    return null;
  }

  return timecodes.reduce((nearest, current) => {
    const nearestDiff = Math.abs(nearest.timestamp - targetTime);
    const currentDiff = Math.abs(current.timestamp - targetTime);
    return currentDiff < nearestDiff ? current : nearest;
  });
}