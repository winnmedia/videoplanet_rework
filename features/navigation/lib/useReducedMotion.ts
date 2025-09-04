'use client'

import { useEffect, useState } from 'react'

/**
 * Reduced Motion Hook - FSD Feature Layer
 * DEVPLAN.md 접근성 요구사항에 따른 reduced-motion 감지
 * - prefers-reduced-motion 미디어 쿼리 감지
 * - 애니메이션 시간 조정
 * - 접근성 친화적 인터랙션 제공
 */
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    // prefers-reduced-motion 미디어 쿼리 생성
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    
    // 초기 값 설정
    setReducedMotion(mediaQuery.matches)

    // 미디어 쿼리 변경 감지
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
    }

    // 이벤트 리스너 등록
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // 구형 브라우저 지원
      mediaQuery.addListener(handleChange)
    }

    // 정리 함수
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        // 구형 브라우저 지원
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  return reducedMotion
}

/**
 * Precision Craft Animation Timing Hook
 * reduced-motion 설정에 따른 최적화된 애니메이션 타이밍 제공
 */
export function usePrecisionTiming() {
  const reducedMotion = useReducedMotion()

  // Precision Craft 타이밍 (Golden Ratio 기반)
  const timings = {
    instant: reducedMotion ? 0 : 100,      // 즉시
    fast: reducedMotion ? 0 : 162,         // 빠름 (Golden ratio)
    base: reducedMotion ? 0 : 262,         // 기본 (Golden ratio)
    slow: reducedMotion ? 0 : 424,         // 느림 (Golden ratio)
    slower: reducedMotion ? 0 : 686        // 매우 느림
  }

  const easings = {
    linear: 'linear',
    easeIn: reducedMotion ? 'linear' : 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: reducedMotion ? 'linear' : 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: reducedMotion ? 'linear' : 'cubic-bezier(0.4, 0, 0.2, 1)'
  }

  // CSS 스타일 객체 생성
  const createTransition = (
    property: string = 'all',
    duration: keyof typeof timings = 'base',
    easing: keyof typeof easings = 'easeOut'
  ) => {
    return {
      transition: `${property} ${timings[duration]}ms ${easings[easing]}`,
      transitionDuration: `${timings[duration]}ms`,
      transitionTimingFunction: easings[easing]
    }
  }

  return {
    reducedMotion,
    timings,
    easings,
    createTransition
  }
}

/**
 * Animation Class Name Hook
 * reduced-motion 상태에 따른 CSS 클래스명 제공
 */
export function useAnimationClassName(baseClassName: string = '') {
  const reducedMotion = useReducedMotion()
  
  const getClassName = (animatedClass: string, staticClass?: string) => {
    if (reducedMotion) {
      return staticClass || baseClassName
    }
    return `${baseClassName} ${animatedClass}`.trim()
  }

  return {
    reducedMotion,
    getClassName,
    // 자주 사용되는 조합들
    withTransition: (className: string) => getClassName(className, baseClassName),
    withoutTransition: baseClassName
  }
}