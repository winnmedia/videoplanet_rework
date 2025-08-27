/**
 * useLocalStorage Hook
 * 로컬 스토리지와 상태를 동기화하는 훅
 * SSR 안전성, 타입 안전성, 에러 처리 포함
 */

import { useState, useEffect, useCallback } from 'react'

type SetValue<T> = T | ((prev: T) => T)

/**
 * localStorage와 동기화되는 상태 관리 훅
 * 
 * @param key - localStorage 키
 * @param initialValue - 초기값
 * @returns [value, setValue, removeValue]
 * 
 * @example
 * const [user, setUser, removeUser] = useLocalStorage('user', null)
 * const [settings, setSettings] = useLocalStorage('settings', { theme: 'light' })
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  // SSR 안전성을 위한 초기 상태
  const [storedValue, setStoredValue] = useState<T>(() => {
    // 서버사이드 렌더링 중에는 초기값 사용
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      const item = window.localStorage.getItem(key)
      
      if (item === null) {
        return initialValue
      }
      
      // JSON 파싱 시도
      return JSON.parse(item)
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  const [isHydrated, setIsHydrated] = useState(false)

  // 클라이언트사이드 하이드레이션 처리
  useEffect(() => {
    setIsHydrated(true)
    
    // 하이드레이션 후 실제 localStorage 값으로 동기화
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key)
        if (item !== null) {
          setStoredValue(JSON.parse(item))
        }
      } catch (error) {
        console.error(`Error reading localStorage key "${key}" during hydration:`, error)
      }
    }
  }, [key])

  // 값 설정 함수
  const setValue = useCallback((value: SetValue<T>) => {
    try {
      // 함수인 경우 현재 값을 기반으로 새 값 계산
      const valueToStore = value instanceof Function ? value(storedValue) : value
      
      setStoredValue(valueToStore)
      
      // localStorage에 저장 (클라이언트사이드에서만)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  // 값 제거 함수
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue)
      
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key)
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error)
    }
  }, [key, initialValue])

  // 다른 탭에서 localStorage 변경 감지
  useEffect(() => {
    if (typeof window === 'undefined' || !isHydrated) return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue))
        } catch (error) {
          console.error(`Error parsing localStorage change for key "${key}":`, error)
        }
      } else if (e.key === key && e.newValue === null) {
        // 다른 탭에서 키가 삭제된 경우
        setStoredValue(initialValue)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [key, initialValue, isHydrated])

  return [storedValue, setValue, removeValue]
}

/**
 * 복잡한 객체나 배열을 위한 useLocalStorage 확장
 * 깊은 비교와 부분 업데이트 지원
 */
export function useLocalStorageObject<T extends Record<string, any>>(
  key: string,
  initialValue: T
): [T, (updates: Partial<T>) => void, (path: string) => void, () => void] {
  const [value, setValue, removeValue] = useLocalStorage(key, initialValue)

  // 객체 부분 업데이트
  const updateValue = useCallback((updates: Partial<T>) => {
    setValue(prev => ({ ...prev, ...updates }))
  }, [setValue])

  // 특정 프로퍼티 삭제
  const removeProperty = useCallback((path: string) => {
    setValue(prev => {
      const newValue = { ...prev }
      delete newValue[path]
      return newValue
    })
  }, [setValue])

  return [value, updateValue, removeProperty, removeValue]
}

/**
 * 배열을 위한 useLocalStorage 확장
 * 배열 조작 메서드들을 포함
 */
export function useLocalStorageArray<T>(
  key: string,
  initialValue: T[] = []
): [
  T[],
  {
    push: (item: T) => void
    remove: (index: number) => void
    removeBy: (predicate: (item: T) => boolean) => void
    clear: () => void
    replace: (items: T[]) => void
  }
] {
  const [array, setArray, removeArray] = useLocalStorage(key, initialValue)

  const operations = {
    // 배열에 아이템 추가
    push: useCallback((item: T) => {
      setArray(prev => [...prev, item])
    }, [setArray]),

    // 인덱스로 아이템 제거
    remove: useCallback((index: number) => {
      setArray(prev => prev.filter((_, i) => i !== index))
    }, [setArray]),

    // 조건에 맞는 아이템 제거
    removeBy: useCallback((predicate: (item: T) => boolean) => {
      setArray(prev => prev.filter(item => !predicate(item)))
    }, [setArray]),

    // 배열 초기화
    clear: useCallback(() => {
      setArray([])
    }, [setArray]),

    // 배열 전체 교체
    replace: useCallback((items: T[]) => {
      setArray(items)
    }, [setArray])
  }

  return [array, operations]
}

export default useLocalStorage