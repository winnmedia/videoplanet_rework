'use client'

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

/**
 * RTK Query API slice
 * FSD 경계: shared/api - 전역 API 상태 관리
 */
export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
  }),
  tagTypes: ['User', 'Project', 'Video'],
  endpoints: (builder) => ({
    // 기본 엔드포인트는 각 feature에서 확장
  }),
})