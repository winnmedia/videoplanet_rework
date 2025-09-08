/**
 * @fileoverview Video Player Timecode Sync Hook
 * @module features/video-feedback/lib
 * 
 * 비디오 플레이어와 피드백 폼 간의 타임코드 동기화 훅
 * - 현재 재생 시점 추적
 * - 타임코드 자동 삽입 지원
 * - 타임코드 클릭 시 비디오 이동
 * - 키보드 단축키 지원
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { formatTimecode, parseTimecode, insertTimecode, extractTimecodes } from './timecodeUtils';
import type { PlayerState } from '../model/feedback.schema';
import { updatePlayerState } from '../model/feedbackSlice';

// ============================================================
// Types
// ============================================================

export interface TimecodeSync {
  /** 현재 재생 시간 (초) */
  currentTime: number;
  
  /** 플레이어 상태 */
  playerState: Partial<PlayerState>;
  
  /** 타임코드 자동 삽입 함수 */
  insertCurrentTimecode: (text: string, cursorPosition: number) => {
    newText: string;
    newCursorPosition: number;
  };
  
  /** 타임코드 클릭 핸들러 */
  seekToTimecode: (timecode: string) => void;
  
  /** 타임코드로 이동 (초 단위) */
  seekToTime: (seconds: number) => void;
  
  /** 현재 시간의 포맷된 타임코드 */
  currentTimecode: string;
  
  /** 키보드 단축키 등록 */
  registerTimecodeShortcut: (callback: () => void) => void;
  
  /** 키보드 단축키 해제 */
  unregisterTimecodeShortcut: () => void;
}

export interface TimecodeOptions {
  /** 타임코드 삽입 시 자동으로 공백 추가 여부 */
  autoAddSpaces?: boolean;
  
  /** 키보드 단축키 사용 여부 */
  enableShortcuts?: boolean;
  
  /** 타임코드 삽입 단축키 (기본: Shift+T) */
  timecodeShortcut?: string;
  
  /** 최소 타임코드 간격 (초, 중복 방지용) */
  minimumInterval?: number;
}

// ============================================================
// Custom Hook
// ============================================================

/**
 * 비디오 플레이어와 타임코드 동기화 훅
 * 
 * @param videoRef - 비디오 엘리먼트 ref
 * @param options - 타임코드 옵션
 * @returns TimecodeSync 객체
 */
export function useTimecodeSync(
  videoRef: React.RefObject<HTMLVideoElement>,
  options: TimecodeOptions = {}
): TimecodeSync {
  const {
    autoAddSpaces = true,
    enableShortcuts = true,
    timecodeShortcut = 'Shift+KeyT',
    minimumInterval = 1
  } = options;

  const dispatch = useDispatch();
  const playerState = useSelector((state: any) => state.videoFeedback.playerState);
  
  const [currentTime, setCurrentTime] = useState(0);
  const shortcutCallbackRef = useRef<(() => void) | null>(null);
  const lastTimecodeTimeRef = useRef(0);

  // ============================================================
  // Player State Sync
  // ============================================================

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);
      
      // Redux 상태 업데이트 (throttle 적용)
      if (Math.abs(time - lastTimecodeTimeRef.current) > 0.5) {
        dispatch(updatePlayerState({ currentTime: time }));
        lastTimecodeTimeRef.current = time;
      }
    };

    const handlePlay = () => {
      dispatch(updatePlayerState({ isPlaying: true }));
    };

    const handlePause = () => {
      dispatch(updatePlayerState({ isPlaying: false }));
    };

    const handleDurationChange = () => {
      dispatch(updatePlayerState({ duration: video.duration }));
    };

    const handleVolumeChange = () => {
      dispatch(updatePlayerState({ 
        volume: video.volume, 
        isMuted: video.muted 
      }));
    };

    const handleRateChange = () => {
      dispatch(updatePlayerState({ 
        playbackSpeed: video.playbackRate.toString() as any
      }));
    };

    // 이벤트 리스너 등록
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('ratechange', handleRateChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('ratechange', handleRateChange);
    };
  }, [dispatch, videoRef]);

  // ============================================================
  // Timecode Functions
  // ============================================================

  const insertCurrentTimecode = useCallback((
    text: string, 
    cursorPosition: number
  ) => {
    return insertTimecode(text, cursorPosition, currentTime);
  }, [currentTime]);

  const seekToTimecode = useCallback((timecode: string) => {
    const seconds = parseTimecode(timecode);
    if (seconds !== null && videoRef.current) {
      videoRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      dispatch(updatePlayerState({ currentTime: seconds }));
    }
  }, [dispatch, videoRef]);

  const seekToTime = useCallback((seconds: number) => {
    if (videoRef.current) {
      const video = videoRef.current;
      const clampedTime = Math.max(0, Math.min(seconds, video.duration || 0));
      video.currentTime = clampedTime;
      setCurrentTime(clampedTime);
      dispatch(updatePlayerState({ currentTime: clampedTime }));
    }
  }, [dispatch, videoRef]);

  const currentTimecode = formatTimecode(currentTime);

  // ============================================================
  // Keyboard Shortcuts
  // ============================================================

  const registerTimecodeShortcut = useCallback((callback: () => void) => {
    shortcutCallbackRef.current = callback;
  }, []);

  const unregisterTimecodeShortcut = useCallback(() => {
    shortcutCallbackRef.current = null;
  }, []);

  useEffect(() => {
    if (!enableShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // 입력 필드에서는 단축키 비활성화
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = event.code;
      const hasShift = event.shiftKey;
      const hasCtrl = event.ctrlKey;
      const hasAlt = event.altKey;

      // 기본 단축키: Shift+T
      if (hasShift && key === 'KeyT' && !hasCtrl && !hasAlt) {
        event.preventDefault();
        if (shortcutCallbackRef.current) {
          shortcutCallbackRef.current();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableShortcuts]);

  // ============================================================
  // Return Hook Interface
  // ============================================================

  return {
    currentTime,
    playerState,
    insertCurrentTimecode,
    seekToTimecode,
    seekToTime,
    currentTimecode,
    registerTimecodeShortcut,
    unregisterTimecodeShortcut
  };
}

// ============================================================
// Helper Hooks
// ============================================================

/**
 * 타임코드 클릭 핸들러 생성 훅
 * 
 * @param seekToTimecode - 타임코드로 이동하는 함수
 * @returns 클릭 핸들러 함수
 */
export function useTimecodeClickHandler(
  seekToTimecode: (timecode: string) => void
) {
  return useCallback((event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const timecode = target.textContent;
    
    if (timecode && timecode.match(/^\[\d{2}:[0-5]\d\.\d{3}\]$/)) {
      event.preventDefault();
      event.stopPropagation();
      seekToTimecode(timecode);
    }
  }, [seekToTimecode]);
}

/**
 * 텍스트 내 타임코드 자동 감지 및 클릭 핸들러 적용 훅
 * 
 * @param text - 검색할 텍스트
 * @param onTimecodeClick - 타임코드 클릭 핸들러
 * @returns 파싱된 텍스트 부분들과 클릭 핸들러
 */
export function useTimecodeRenderer(
  text: string,
  onTimecodeClick?: (timestamp: number) => void
) {
  const parts = extractTimecodes(text);
  
  const handleTimecodeClick = useCallback((timestamp: number) => {
    onTimecodeClick?.(timestamp);
  }, [onTimecodeClick]);

  return {
    timecodes: parts,
    renderTimecodeText: useCallback((
      renderPart: (
        content: string, 
        isTimecode: boolean, 
        timestamp?: number,
        onClick?: () => void
      ) => React.ReactNode
    ) => {
      if (parts.length === 0) {
        return renderPart(text, false);
      }

      const elements = [];
      let lastIndex = 0;

      parts.forEach((timecode, index) => {
        // 타임코드 앞의 텍스트
        if (timecode.startIndex > lastIndex) {
          const textContent = text.substring(lastIndex, timecode.startIndex);
          elements.push(renderPart(textContent, false, undefined, undefined));
        }

        // 타임코드
        elements.push(
          renderPart(
            timecode.text, 
            true, 
            timecode.timestamp,
            () => handleTimecodeClick(timecode.timestamp)
          )
        );

        lastIndex = timecode.endIndex;
      });

      // 마지막 타임코드 이후의 텍스트
      if (lastIndex < text.length) {
        elements.push(renderPart(text.substring(lastIndex), false));
      }

      return elements;
    }, [text, parts, handleTimecodeClick])
  };
}