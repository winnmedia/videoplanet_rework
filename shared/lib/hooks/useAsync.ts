/**
 * useAsync Hook
 * 비동기 작업을 위한 상태 관리 훅
 * 로딩, 에러, 데이터 상태를 자동으로 관리
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export interface AsyncOptions {
  /** 컴포넌트 언마운트 시 진행 중인 요청 무시 */
  ignoreOnUnmount?: boolean
  /** 초기 로딩 상태 */
  initialLoading?: boolean
  /** 자동 실행 여부 */
  immediate?: boolean
  /** 의존성 배열 */
  deps?: React.DependencyList
}

/**
 * 비동기 함수의 상태를 관리하는 훅
 * 
 * @param asyncFunction - 실행할 비동기 함수
 * @param options - 옵션
 * @returns { data, loading, error, execute, reset }
 * 
 * @example
 * const { data, loading, error, execute } = useAsync(fetchUserData)
 * 
 * useEffect(() => {
 *   execute(userId)
 * }, [userId])
 */
export function useAsync<T, P extends unknown[] = []>(
  asyncFunction: (...args: P) => Promise<T>,
  options: AsyncOptions = {}
) {
  const {
    ignoreOnUnmount = true,
    initialLoading = false,
    immediate = false,
    deps = []
  } = options

  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: initialLoading,
    error: null
  })

  const mountedRef = useRef(true)
  const lastCallIdRef = useRef(0)

  // 컴포넌트 언마운트 감지
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // 비동기 함수 실행
  const execute = useCallback(async (...args: P) => {
    const callId = ++lastCallIdRef.current

    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }))

    try {
      const result = await asyncFunction(...args)
      
      // 컴포넌트가 언마운트되었거나 더 최근 호출이 있는 경우 무시
      if (ignoreOnUnmount && !mountedRef.current) return
      if (callId !== lastCallIdRef.current) return

      setState({
        data: result,
        loading: false,
        error: null
      })

      return result
    } catch (error) {
      // 컴포넌트가 언마운트되었거나 더 최근 호출이 있는 경우 무시
      if (ignoreOnUnmount && !mountedRef.current) return
      if (callId !== lastCallIdRef.current) return

      const errorObject = error instanceof Error ? error : new Error(String(error))

      setState({
        data: null,
        loading: false,
        error: errorObject
      })

      throw errorObject
    }
  }, [asyncFunction, ignoreOnUnmount, ...deps])

  // 상태 초기화
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null
    })
  }, [])

  // 즉시 실행 옵션
  useEffect(() => {
    if (immediate) {
      // @ts-ignore - immediate 옵션은 매개변수가 필요하지 않은 함수에서만 사용됨
      execute()
    }
  }, [immediate, execute])

  return {
    ...state,
    execute,
    reset
  }
}

/**
 * 여러 비동기 작업을 병렬로 실행하는 훅
 * 
 * @param asyncFunctions - 실행할 비동기 함수들의 배열
 * @param options - 옵션
 * @returns { data, loading, error, execute, reset }
 */
export function useAsyncAll<T extends readonly unknown[]>(
  asyncFunctions: readonly [...{ [K in keyof T]: () => Promise<T[K]> }],
  options: AsyncOptions = {}
) {
  const { execute: executeAsync, ...state } = useAsync(
    async () => {
      return Promise.all(asyncFunctions.map(fn => fn()))
    },
    options
  )

  const execute = useCallback(() => {
    return executeAsync()
  }, [executeAsync])

  return {
    ...state,
    execute,
    reset: state.reset
  }
}

/**
 * 페이지네이션이 있는 비동기 데이터 훅
 * 
 * @param fetchFunction - 데이터를 가져오는 함수
 * @param options - 옵션
 * @returns 페이지네이션 관련 상태와 함수들
 */
export function usePaginatedAsync<T>(
  fetchFunction: (page: number, limit: number) => Promise<{
    items: T[]
    total: number
    hasNext: boolean
  }>,
  options: { limit?: number } = {}
) {
  const { limit = 10 } = options
  const [page, setPage] = useState(1)
  const [allItems, setAllItems] = useState<T[]>([])
  const [hasNext, setHasNext] = useState(false)

  const { data, loading, error, execute } = useAsync(
    async (pageNum: number) => {
      const result = await fetchFunction(pageNum, limit)
      return result
    }
  )

  // 첫 페이지 로드
  const loadFirst = useCallback(async () => {
    try {
      setPage(1)
      setAllItems([])
      const result = await execute(1)
      if (result) {
        setAllItems(result.items)
        setHasNext(result.hasNext)
      }
    } catch (error) {
      // 에러는 useAsync에서 처리됨
    }
  }, [execute])

  // 다음 페이지 로드
  const loadMore = useCallback(async () => {
    if (!hasNext || loading) return

    try {
      const nextPage = page + 1
      const result = await execute(nextPage)
      if (result) {
        setAllItems(prev => [...prev, ...result.items])
        setHasNext(result.hasNext)
        setPage(nextPage)
      }
    } catch (error) {
      // 에러는 useAsync에서 처리됨
    }
  }, [execute, hasNext, loading, page])

  return {
    items: allItems,
    loading,
    error,
    hasNext,
    page,
    loadFirst,
    loadMore,
    reset: () => {
      setPage(1)
      setAllItems([])
      setHasNext(false)
    }
  }
}

/**
 * 캐시 기능이 있는 비동기 훅
 * 
 * @param asyncFunction - 비동기 함수
 * @param cacheKey - 캐시 키
 * @param ttl - 캐시 유효 시간 (밀리초)
 * @returns useAsync 결과 + 캐시 관련 함수들
 */
export function useCachedAsync<T, P extends any[] = []>(
  asyncFunction: (...args: P) => Promise<T>,
  cacheKey: string,
  ttl: number = 300000 // 5분
) {
  const cache = useRef<Map<string, { data: T; timestamp: number }>>(new Map())

  const cachedAsyncFunction = useCallback(async (...args: P): Promise<T> => {
    const key = `${cacheKey}_${JSON.stringify(args)}`
    const cached = cache.current.get(key)
    
    // 캐시가 있고 유효한 경우
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data
    }

    // 캐시가 없거나 만료된 경우 새로 요청
    const result = await asyncFunction(...args)
    cache.current.set(key, {
      data: result,
      timestamp: Date.now()
    })

    return result
  }, [asyncFunction, cacheKey, ttl])

  const asyncResult = useAsync(cachedAsyncFunction)

  const clearCache = useCallback(() => {
    cache.current.clear()
  }, [])

  const invalidateCache = useCallback((specificKey?: string) => {
    if (specificKey) {
      cache.current.delete(`${cacheKey}_${specificKey}`)
    } else {
      // cacheKey로 시작하는 모든 캐시 제거
      for (const key of cache.current.keys()) {
        if (key.startsWith(`${cacheKey}_`)) {
          cache.current.delete(key)
        }
      }
    }
  }, [cacheKey])

  return {
    ...asyncResult,
    clearCache,
    invalidateCache
  }
}

/**
 * 재시도 기능이 있는 비동기 훅
 * 
 * @param asyncFunction - 비동기 함수
 * @param options - 재시도 옵션
 * @returns useAsync 결과 + 재시도 관련 함수들
 */
export function useAsyncWithRetry<T, P extends any[] = []>(
  asyncFunction: (...args: P) => Promise<T>,
  options: AsyncOptions & {
    maxRetries?: number
    retryDelay?: number
    shouldRetry?: (error: Error) => boolean
  } = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    shouldRetry = () => true,
    ...asyncOptions
  } = options

  const [retryCount, setRetryCount] = useState(0)

  const retryAsyncFunction = useCallback(async (...args: P): Promise<T> => {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await asyncFunction(...args)
        setRetryCount(0) // 성공 시 재시도 카운트 초기화
        return result
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // 마지막 시도이거나 재시도하지 말아야 할 에러인 경우
        if (attempt === maxRetries || !shouldRetry(lastError)) {
          break
        }

        // 재시도 전 대기
        if (retryDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
        
        setRetryCount(attempt + 1)
      }
    }

    throw lastError!
  }, [asyncFunction, maxRetries, retryDelay, shouldRetry])

  const asyncResult = useAsync(retryAsyncFunction, asyncOptions)

  return {
    ...asyncResult,
    retryCount
  }
}

export default useAsync