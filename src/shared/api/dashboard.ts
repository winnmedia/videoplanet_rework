import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { z } from 'zod';
import { 
  DashboardData, 
  DashboardDataSchema, 
  validateDashboardData,
  DASHBOARD_SCHEMA_VERSION 
} from './schemas/dashboard';
import { ApiResponse, SuccessResponseSchema } from './types';

/**
 * Dashboard API - RTK Query 슬라이스
 * @author Data Lead Daniel
 * @since 2025-09-03
 * 
 * 데이터 파이프라인 원칙:
 * 1. 캐싱 전략: stale-while-revalidate (5분)
 * 2. 자동 재시도: 네트워크 오류 시 3회
 * 3. 런타임 스키마 검증 필수
 * 4. 에러 처리 및 로깅 통합
 */

// =============================================================================
// Base Query 설정 (Base Query Configuration)
// =============================================================================

const dashboardBaseQuery = fetchBaseQuery({
  baseUrl: '/api/dashboard',
  prepareHeaders: (headers, { getState }) => {
    // 인증 토큰 추가 (필요시)
    // const token = selectAuthToken(getState() as RootState);
    // if (token) {
    //   headers.set('authorization', `Bearer ${token}`);
    // }
    
    headers.set('accept', 'application/json');
    headers.set('x-schema-version', DASHBOARD_SCHEMA_VERSION);
    return headers;
  },
});

// =============================================================================
// 타입 안전한 Response 변환 (Type-safe Response Transform)
// =============================================================================

/**
 * Dashboard API 응답 변환 함수
 * 런타임 스키마 검증 및 에러 처리 포함
 */
function transformDashboardResponse(response: unknown): DashboardData {
  try {
    // 1. API 응답 구조 검증
    const apiResponseSchema = SuccessResponseSchema(DashboardDataSchema);
    const validatedResponse = apiResponseSchema.parse(response);
    
    // 2. Dashboard 데이터 추가 검증
    const dashboardData = validateDashboardData(validatedResponse.data);
    
    // 3. 데이터 무결성 검사
    validateDataIntegrity(dashboardData);
    
    return dashboardData;
  } catch (error) {
    console.error('[Dashboard API] 스키마 검증 실패:', error);
    throw new Error(`Dashboard 데이터 변환 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 데이터 무결성 검사 함수
 * 비즈니스 로직 수준의 데이터 검증
 */
function validateDataIntegrity(data: DashboardData): void {
  // 1. 진행률 검증 (0-100% 범위)
  data.recent_projects.forEach(project => {
    if (project.progress < 0 || project.progress > 100) {
      throw new Error(`유효하지 않은 프로젝트 진행률: ${project.progress}%`);
    }
  });
  
  // 2. 날짜 무결성 검증
  const now = new Date();
  const lastUpdated = new Date(data.meta.last_updated);
  
  if (lastUpdated > now) {
    throw new Error('마지막 업데이트 시간이 현재 시간보다 미래입니다');
  }
  
  // 3. 카운트 일관성 검증
  if (data.notifications.unread_count > data.notifications.total_count) {
    throw new Error('읽지 않은 알림 수가 전체 알림 수보다 큽니다');
  }
}

// =============================================================================
// Dashboard API 정의 (Dashboard API Definition)
// =============================================================================

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: dashboardBaseQuery,
  
  // 태그 기반 캐시 무효화
  tagTypes: ['Dashboard', 'ProjectStats', 'Notifications'],
  
  endpoints: (builder) => ({
    /**
     * Dashboard 요약 데이터 조회
     * 캐싱 전략: 5분 stale-while-revalidate
     */
    getDashboardSummary: builder.query<DashboardData, void>({
      query: () => '/summary',
      
      // 응답 변환 및 검증
      transformResponse: transformDashboardResponse,
      
      // 캐시 태그 설정
      providesTags: ['Dashboard', 'ProjectStats', 'Notifications'],
      
      // 캐싱 설정
      keepUnusedDataFor: 300, // 5분
      
      // 자동 재요청 설정 (폴링)
      // 실시간성이 중요한 경우 활성화
      // pollingInterval: 300000, // 5분마다 폴링
    }),

    /**
     * Dashboard 통계만 조회 (경량 요청)
     * 더 자주 업데이트가 필요한 통계 데이터용
     */
    getDashboardStats: builder.query<DashboardData['stats'], void>({
      query: () => '/stats',
      
      transformResponse: (response: unknown) => {
        const apiResponseSchema = SuccessResponseSchema(z.object({
          stats: z.object({
            active_projects: z.number().min(0),
            new_feedback: z.number().min(0),
            today_schedule: z.number().min(0),
            completed_videos: z.number().min(0)
          })
        }));
        
        const validatedResponse = apiResponseSchema.parse(response);
        return validatedResponse.data.stats;
      },
      
      providesTags: ['ProjectStats'],
      keepUnusedDataFor: 60, // 1분 (더 짧은 캐시)
    }),

    /**
     * 알림 요약 조회
     */
    getNotificationSummary: builder.query<DashboardData['notifications'], void>({
      query: () => '/notifications/summary',
      
      transformResponse: (response: unknown) => {
        const apiResponseSchema = SuccessResponseSchema(z.object({
          notifications: z.object({
            total_count: z.number().min(0),
            unread_count: z.number().min(0),
            feedback_count: z.number().min(0),
            schedule_count: z.number().min(0),
            mention_count: z.number().min(0)
          })
        }));
        
        const validatedResponse = apiResponseSchema.parse(response);
        return validatedResponse.data.notifications;
      },
      
      providesTags: ['Notifications'],
      keepUnusedDataFor: 60, // 1분
    }),
  }),
});

// =============================================================================
// 훅 및 유틸리티 Export (Hooks & Utilities Export)
// =============================================================================

// RTK Query 자동 생성 훅들
export const {
  useGetDashboardSummaryQuery,
  useGetDashboardStatsQuery, 
  useGetNotificationSummaryQuery,
  useLazyGetDashboardSummaryQuery,
  usePrefetch
} = dashboardApi;

// 캐시 관리 유틸리티
export const dashboardCacheUtils = {
  /**
   * Dashboard 캐시 무효화
   */
  invalidateAll: (dispatch: any) => {
    dispatch(dashboardApi.util.invalidateTags(['Dashboard']));
  },
  
  /**
   * 특정 태그 캐시 무효화
   */
  invalidateByTag: (dispatch: any, tag: 'Dashboard' | 'ProjectStats' | 'Notifications') => {
    dispatch(dashboardApi.util.invalidateTags([tag]));
  },
  
  /**
   * Dashboard 데이터 프리페치
   */
  prefetchDashboard: (dispatch: any) => {
    dispatch(dashboardApi.util.prefetch('getDashboardSummary', undefined));
  }
};

// =============================================================================
// 타입 Export (Type Exports)
// =============================================================================

export type { DashboardData } from './schemas/dashboard';

// API 슬라이스 자체 Export
export { dashboardApi as default };