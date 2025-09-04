/**
 * Shared Hooks - Public API
 * 4개 모듈에서 공통으로 사용하는 훅들
 */

import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'

import type { RootState, AppDispatch } from '@/app/store/store'

// Redux 관련 훅들 (기존)
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// 로컬 스토리지 관련 훅들
export { 
  useLocalStorage, 
  useLocalStorageObject, 
  useLocalStorageArray 
} from './hooks/useLocalStorage'

// 디바운스 관련 훅들
export { 
  useDebounce,
  useDebouncedCallback,
  useAdvancedDebounce,
  useThrottle,
  useDebouncedState,
  useDebouncedInput
} from './hooks/useDebounce'

// 이전 값 추적 훅들
export {
  usePrevious,
  usePreviousWithInitial,
  useValueChange,
  useDeepValueChange,
  useArrayChange,
  useConditionalPrevious,
  useHistory,
  usePropsChange,
  useFunctionChange
} from './hooks/usePrevious'

// 비동기 작업 관리 훅들
export {
  useAsync,
  useAsyncAll,
  usePaginatedAsync,
  useCachedAsync,
  useAsyncWithRetry
} from './hooks/useAsync'

// 타입 내보내기
export type { AsyncState, AsyncOptions } from './hooks/useAsync'