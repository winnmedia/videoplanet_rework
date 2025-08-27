/**
 * useDebounce Hook
 * 값이나 함수의 실행을 지연시키는 디바운스 훅
 * 검색, API 호출 최적화 등에 사용
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * 값을 디바운스하는 훅
 * 
 * @param value - 디바운스할 값
 * @param delay - 지연 시간 (밀리초)
 * @returns 디바운스된 값
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearchTerm = useDebounce(searchTerm, 300)
 * 
 * useEffect(() => {
 *   // API 호출
 *   searchAPI(debouncedSearchTerm)
 * }, [debouncedSearchTerm])
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * 함수 실행을 디바운스하는 훅
 * 
 * @param callback - 디바운스할 함수
 * @param delay - 지연 시간 (밀리초)
 * @param deps - 의존성 배열
 * @returns 디바운스된 함수
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (term: string) => searchAPI(term),
 *   300,
 *   []
 * )
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay, ...deps]
  )

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * 즉시 실행과 디바운스 실행을 모두 지원하는 훅
 * 
 * @param callback - 실행할 함수
 * @param delay - 디바운스 지연 시간
 * @param deps - 의존성 배열
 * @returns { execute: 즉시 실행 함수, debounced: 디바운스 실행 함수, cancel: 취소 함수 }
 * 
 * @example
 * const { execute, debounced, cancel } = useAdvancedDebounce(
 *   (value: string) => console.log(value),
 *   500
 * )
 * 
 * // 즉시 실행
 * execute('immediate')
 * 
 * // 디바운스 실행
 * debounced('debounced')
 * 
 * // 대기 중인 디바운스 취소
 * cancel()
 */
export function useAdvancedDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const execute = useCallback(
    ((...args: Parameters<T>) => {
      cancel()
      return callback(...args)
    }) as T,
    [callback, cancel, ...deps]
  )

  const debounced = useCallback(
    ((...args: Parameters<T>) => {
      cancel()
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay, cancel, ...deps]
  )

  useEffect(() => {
    return cancel
  }, [cancel])

  return { execute, debounced, cancel }
}

/**
 * 연속된 호출을 제한하는 쓰로틀 훅
 * 디바운스와 달리 첫 번째 호출은 즉시 실행되고, 이후 호출들은 제한됨
 * 
 * @param callback - 쓰로틀할 함수
 * @param limit - 제한 시간 (밀리초)
 * @param deps - 의존성 배열
 * @returns 쓰로틀된 함수
 * 
 * @example
 * const throttledScroll = useThrottle(
 *   (event) => handleScroll(event),
 *   100
 * )
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
  deps: React.DependencyList = []
): T {
  const inThrottle = useRef<boolean>(false)

  const throttledCallback = useCallback(
    ((...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args)
        inThrottle.current = true
        setTimeout(() => {
          inThrottle.current = false
        }, limit)
      }
    }) as T,
    [callback, limit, ...deps]
  )

  return throttledCallback
}

/**
 * 상태와 함께 디바운스를 관리하는 훅
 * 로딩 상태, 취소 기능 등을 제공
 * 
 * @param callback - 실행할 함수
 * @param delay - 디바운스 지연 시간
 * @returns { call, cancel, isPending }
 */
export function useDebouncedState<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
) {
  const [isPending, setIsPending] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
      setIsPending(false)
    }
  }, [])

  const call = useCallback(
    ((...args: Parameters<T>) => {
      cancel()
      setIsPending(true)
      
      timeoutRef.current = setTimeout(() => {
        setIsPending(false)
        callback(...args)
      }, delay)
    }) as T,
    [callback, delay, cancel]
  )

  useEffect(() => {
    return cancel
  }, [cancel])

  return { call, cancel, isPending }
}

/**
 * 입력 필드를 위한 특화된 디바운스 훅
 * 
 * @param initialValue - 초기값
 * @param delay - 디바운스 지연 시간
 * @returns [value, debouncedValue, setValue, setImmediateValue]
 * 
 * @example
 * const [searchTerm, debouncedSearchTerm, setSearchTerm] = useDebouncedInput('', 300)
 * 
 * return (
 *   <input 
 *     value={searchTerm}
 *     onChange={(e) => setSearchTerm(e.target.value)}
 *   />
 * )
 */
export function useDebouncedInput(
  initialValue: string = '',
  delay: number = 300
): [string, string, (value: string) => void, (value: string) => void] {
  const [value, setValue] = useState(initialValue)
  const debouncedValue = useDebounce(value, delay)

  const setImmediateValue = useCallback((newValue: string) => {
    setValue(newValue)
  }, [])

  return [value, debouncedValue, setValue, setImmediateValue]
}

export default useDebounce