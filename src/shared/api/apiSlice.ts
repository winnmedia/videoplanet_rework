/**
 * @file RTK Query API Slice
 * @description 통합 API 상태 관리를 위한 RTK Query 기본 슬라이스
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/shared/types/store'

// ============================================================================
// Base Query 설정
// ============================================================================

/**
 * 인증 토큰을 포함한 베이스 쿼리
 */
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const state = getState() as RootState
    const token = state.auth.token

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    headers.set('Content-Type', 'application/json')
    return headers
  }
})

/**
 * 토큰 갱신 및 재시도 로직을 포함한 베이스 쿼리
 */
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions)

  // 401 에러 시 토큰 갱신 시도
  if (result.error && result.error.status === 401) {
    const state = api.getState() as RootState
    const refreshToken = state.auth.refreshToken

    if (refreshToken) {
      // 토큰 갱신 요청
      const refreshResult = await baseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken }
        },
        api,
        extraOptions
      )

      if (refreshResult.data) {
        // 토큰 갱신 성공 시 상태 업데이트
        api.dispatch({
          type: 'auth/refreshTokenSuccess',
          payload: refreshResult.data
        })

        // 원래 요청 재시도
        result = await baseQuery(args, api, extraOptions)
      } else {
        // 토큰 갱신 실패 시 로그아웃
        api.dispatch({ type: 'auth/logout' })
      }
    }
  }

  return result
}

// ============================================================================
// API Slice 정의
// ============================================================================

/**
 * 통합 API 슬라이스
 * - 모든 API 엔드포인트의 기본 설정
 * - 공통 태그 및 캐싱 전략
 * - 에러 처리 및 로딩 상태 관리
 */
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  
  // 캐시 태그 정의 - 데이터 무효화 및 리페치 관리
  tagTypes: [
    'User',
    'Project', 
    'VideoFeedback',
    'CalendarEvent',
    'Pipeline',
    'Auth'
  ],

  // 기본 엔드포인트들
  endpoints: (builder) => ({
    // 헬스 체크
    healthCheck: builder.query<{ status: string; timestamp: string }, void>({
      query: () => '/health'
    })
  })
})

// ============================================================================
// 기본 훅 내보내기
// ============================================================================

export const {
  useHealthCheckQuery
} = apiSlice

// ============================================================================
// API 슬라이스 확장을 위한 유틸리티
// ============================================================================

/**
 * API 슬라이스 확장을 위한 헬퍼 함수
 * 각 도메인별 API 슬라이스에서 사용
 */
export const enhanceApiSlice = apiSlice.enhanceEndpoints({
  addTagTypes: [] // 추가 태그 타입들은 각 도메인에서 정의
})

/**
 * 낙관적 업데이트를 위한 유틸리티
 */
export const createOptimisticUpdate = <T>(
  tagType: string,
  updateFn: (draft: T, newData: Partial<T>) => void
) => {
  return {
    async onQueryStarted(newData: Partial<T>, { dispatch, queryFulfilled }) {
      // 낙관적 업데이트 적용
      const patchResult = dispatch(
        apiSlice.util.updateQueryData(tagType as any, undefined, (draft: T) => {
          updateFn(draft, newData)
        })
      )

      try {
        await queryFulfilled
      } catch {
        // 실패 시 롤백
        patchResult.undo()
      }
    }
  }
}

/**
 * 페이지네이션을 위한 유틸리티
 */
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * 무한 스크롤을 위한 쿼리 키 생성
 */
export const createInfiniteQueryKey = (
  endpoint: string,
  params: PaginationParams = {}
) => {
  return `${endpoint}-${JSON.stringify(params)}`
}

// ============================================================================
// 캐시 관리 유틸리티
// ============================================================================

/**
 * 특정 태그의 모든 캐시 무효화
 */
export const invalidateTag = (tagType: string) => {
  return apiSlice.util.invalidateTags([tagType as any])
}

/**
 * 특정 쿼리의 캐시 프리페치
 */
export const prefetchQuery = (endpoint: string, params?: any) => {
  return apiSlice.util.prefetch(endpoint, params)
}

/**
 * 캐시 수동 업데이트
 */
export const updateQueryCache = <T>(
  endpoint: string,
  params: any,
  updateFn: (draft: T) => void
) => {
  return apiSlice.util.updateQueryData(endpoint as any, params, updateFn)
}

// ============================================================================
// 개발 도구
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  // API 슬라이스 디버깅 도구
  ;(window as any).__RTK_QUERY_API__ = apiSlice
  
  // 캐시 상태 조회 도구
  ;(window as any).__RTK_QUERY_CACHE__ = () => {
    console.log('Current API Cache State:', apiSlice.getSelectors())
  }
}