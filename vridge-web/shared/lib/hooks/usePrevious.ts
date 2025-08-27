/**
 * usePrevious Hook
 * 이전 값을 기억하는 훅
 * 값의 변화를 추적하거나 이전 상태와 비교할 때 사용
 */

import { useRef, useEffect } from 'react'

/**
 * 이전 값을 반환하는 기본 훅
 * 
 * @param value - 추적할 값
 * @returns 이전 값 (첫 번째 렌더에서는 undefined)
 * 
 * @example
 * const [count, setCount] = useState(0)
 * const previousCount = usePrevious(count)
 * 
 * console.log(`Current: ${count}, Previous: ${previousCount}`)
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

/**
 * 초기값을 지정할 수 있는 usePrevious 변형
 * 
 * @param value - 추적할 값
 * @param initialValue - 초기 이전 값
 * @returns 이전 값
 * 
 * @example
 * const previousCount = usePreviousWithInitial(count, 0)
 */
export function usePreviousWithInitial<T>(value: T, initialValue: T): T {
  const ref = useRef<T>(initialValue)

  useEffect(() => {
    ref.current = value
  }, [value])

  return ref.current
}

/**
 * 값의 변화를 감지하는 훅
 * 
 * @param value - 추적할 값
 * @param compareFn - 비교 함수 (선택적)
 * @returns { current, previous, hasChanged }
 * 
 * @example
 * const { current, previous, hasChanged } = useValueChange(user)
 * 
 * if (hasChanged) {
 *   console.log('User changed from', previous, 'to', current)
 * }
 */
export function useValueChange<T>(
  value: T,
  compareFn?: (prev: T, current: T) => boolean
) {
  const previousValue = usePrevious(value)
  
  const hasChanged = previousValue !== undefined && (
    compareFn 
      ? !compareFn(previousValue, value)
      : previousValue !== value
  )

  return {
    current: value,
    previous: previousValue,
    hasChanged
  }
}

/**
 * 깊은 비교를 통한 이전 값 추적
 * 객체나 배열의 깊은 변화를 감지
 * 
 * @param value - 추적할 값
 * @returns { current, previous, hasChanged }
 * 
 * @example
 * const { hasChanged } = useDeepValueChange(complexObject)
 */
export function useDeepValueChange<T>(value: T) {
  const previousValue = usePrevious(value)
  
  const hasChanged = previousValue !== undefined && 
    JSON.stringify(previousValue) !== JSON.stringify(value)

  return {
    current: value,
    previous: previousValue,
    hasChanged
  }
}

/**
 * 배열의 변화를 추적하는 훅
 * 
 * @param array - 추적할 배열
 * @returns { current, previous, hasChanged, added, removed }
 * 
 * @example
 * const { added, removed, hasChanged } = useArrayChange(items)
 */
export function useArrayChange<T>(array: T[]) {
  const previousArray = usePrevious(array) || []
  
  const hasChanged = array.length !== previousArray.length ||
    array.some((item, index) => item !== previousArray[index])

  const added = hasChanged 
    ? array.filter(item => !previousArray.includes(item))
    : []
    
  const removed = hasChanged
    ? previousArray.filter(item => !array.includes(item))
    : []

  return {
    current: array,
    previous: previousArray,
    hasChanged,
    added,
    removed
  }
}

/**
 * 조건부 이전 값 추적
 * 특정 조건이 만족될 때만 이전 값을 저장
 * 
 * @param value - 추적할 값
 * @param condition - 저장 조건
 * @returns 조건이 만족되었을 때의 이전 값
 * 
 * @example
 * const lastValidValue = useConditionalPrevious(inputValue, isValid)
 */
export function useConditionalPrevious<T>(
  value: T,
  condition: boolean
): T | undefined {
  const ref = useRef<T | undefined>(undefined)

  useEffect(() => {
    if (condition) {
      ref.current = value
    }
  }, [value, condition])

  return ref.current
}

/**
 * 스냅샷 히스토리를 관리하는 훅
 * 여러 이전 값들을 배열로 저장
 * 
 * @param value - 추적할 값
 * @param maxHistory - 최대 히스토리 개수 (기본: 5)
 * @returns { current, history, getSnapshot }
 * 
 * @example
 * const { history, getSnapshot } = useHistory(currentState, 10)
 * const twoStepsBack = getSnapshot(2)
 */
export function useHistory<T>(value: T, maxHistory: number = 5) {
  const historyRef = useRef<T[]>([])

  useEffect(() => {
    historyRef.current = [value, ...historyRef.current].slice(0, maxHistory)
  }, [value, maxHistory])

  const getSnapshot = (stepsBack: number): T | undefined => {
    return historyRef.current[stepsBack]
  }

  return {
    current: value,
    history: historyRef.current,
    getSnapshot
  }
}

/**
 * props 변화를 추적하는 디버깅용 훅
 * 개발 환경에서만 동작
 * 
 * @param props - 추적할 props 객체
 * @param name - 컴포넌트 이름 (로깅용)
 * 
 * @example
 * usePropsChange(props, 'MyComponent')
 */
export function usePropsChange<T extends Record<string, any>>(
  props: T,
  name: string = 'Component'
): void {
  const previousProps = usePrevious(props)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && previousProps) {
      const changedProps: Partial<T> = {}
      let hasChanges = false

      for (const key in props) {
        if (props[key] !== previousProps[key]) {
          changedProps[key] = {
            from: previousProps[key],
            to: props[key]
          } as any
          hasChanges = true
        }
      }

      if (hasChanges) {
        console.log(`[${name}] Props changed:`, changedProps)
      }
    }
  })
}

/**
 * 함수 참조의 변화를 추적하는 훅
 * useCallback 최적화 확인용
 * 
 * @param fn - 추적할 함수
 * @param name - 함수 이름 (로깅용)
 * 
 * @example
 * useFunctionChange(handleClick, 'handleClick')
 */
export function useFunctionChange(
  fn: Function,
  name: string = 'Function'
): void {
  const previousFn = usePrevious(fn)

  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && previousFn && fn !== previousFn) {
      console.warn(`[${name}] Function reference changed - consider using useCallback`)
    }
  })
}

export default usePrevious