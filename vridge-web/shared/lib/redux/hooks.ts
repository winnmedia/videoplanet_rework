/**
 * @fileoverview FSD-compliant Redux typed hooks
 * @description Redux Toolkit의 타입 안전성을 보장하는 공용 hooks
 * @author Claude (AI Assistant)
 */

import { useDispatch, useSelector } from 'react-redux'
import type { TypedUseSelectorHook } from 'react-redux'

import type { RootState, AppDispatch } from '@/app/store/store'

/**
 * 타입이 지정된 useDispatch hook
 * @description Redux Toolkit의 타입 안전성을 보장하는 dispatch hook
 */
export const useAppDispatch: () => AppDispatch = useDispatch

/**
 * 타입이 지정된 useSelector hook  
 * @description Redux 상태에 대한 타입 안전한 selector hook
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector