import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { 
  GenerateStoryRequest,
  Generate4ActRequest, 
  Generate12ShotRequest,
  ExportPlanRequest,
  StoryResponse,
  Act4Response,
  Shot12Response,
  ExportPlanResponse
} from '../model/schemas'
import {
  StoryResponseSchema,
  Act4ResponseSchema,
  Shot12ResponseSchema,
  ExportPlanResponseSchema,
  GenerateStoryRequestSchema,
  Generate4ActRequestSchema,
  Generate12ShotRequestSchema,
  ExportPlanRequestSchema
} from '../model/schemas'

// Base query with error handling
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  prepareHeaders: (headers) => {
    headers.set('Content-Type', 'application/json')
    
    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    
    return headers
  },
  timeout: 60000, // 60 seconds for AI generation
})

// Enhanced query with validation and error handling
const baseQueryWithValidation = async (args: any, api: any, extraOptions: any) => {
  const result = await baseQuery(args, api, extraOptions)
  
  if (result.error) {
    // Transform API errors to user-friendly messages
    const errorData = result.error.data as any
    if (result.error.status === 400) {
      throw new Error(errorData?.message || '잘못된 요청입니다.')
    }
    if (result.error.status === 401) {
      throw new Error('인증이 필요합니다.')
    }
    if (result.error.status === 429) {
      throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.')
    }
    if (result.error.status === 500) {
      throw new Error('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
    throw new Error('알 수 없는 오류가 발생했습니다.')
  }
  
  return result
}

// Planning API slice
export const planningApi = createApi({
  reducerPath: 'planningApi',
  baseQuery: baseQueryWithValidation,
  tagTypes: ['Story', 'Acts', 'Shots', 'Export'],
  endpoints: (builder) => ({
    // Generate story from outline
    generateStory: builder.mutation<StoryResponse, GenerateStoryRequest>({
      query: (request) => {
        // Validate request with Zod
        const validatedRequest = GenerateStoryRequestSchema.parse(request)
        
        return {
          url: `/api/v1/projects/${request.projectId}/planning/generate-story/`,
          method: 'POST',
          body: validatedRequest,
        }
      },
      transformResponse: (response: unknown) => {
        // Validate response with Zod
        return StoryResponseSchema.parse(response)
      },
      invalidatesTags: ['Story'],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled
          // Redux slice의 setStoryData 액션 디스패치
          const { setStoryData } = await import('../model/planningSlice')
          dispatch(setStoryData(data))
        } catch (error) {
          console.error('Story generation failed:', error)
          // 에러는 RTK Query가 자동으로 처리
        }
      }
    }),
    
    // Generate 4-act structure
    generate4Act: builder.mutation<Act4Response, Generate4ActRequest>({
      query: (request) => {
        // Validate request with Zod
        const validatedRequest = Generate4ActRequestSchema.parse(request)
        
        return {
          url: `/api/v1/projects/${request.projectId}/planning/generate-4act/`,
          method: 'POST',
          body: validatedRequest,
        }
      },
      transformResponse: (response: unknown) => {
        // Validate response with Zod
        return Act4ResponseSchema.parse(response)
      },
      invalidatesTags: ['Acts'],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled
          // Redux slice의 setActData 액션 디스패치
          const { setActData } = await import('../model/planningSlice')
          dispatch(setActData(data))
        } catch (error) {
          console.error('4-Act generation failed:', error)
          // 에러는 RTK Query가 자동으로 처리
        }
      }
    }),
    
    // Generate 12-shot list
    generate12Shot: builder.mutation<Shot12Response, Generate12ShotRequest>({
      query: (request) => {
        // Validate request with Zod
        const validatedRequest = Generate12ShotRequestSchema.parse(request)
        
        return {
          url: `/api/v1/projects/${request.projectId}/planning/generate-12shot/`,
          method: 'POST',
          body: validatedRequest,
        }
      },
      transformResponse: (response: unknown) => {
        // Validate response with Zod
        return Shot12ResponseSchema.parse(response)
      },
      invalidatesTags: ['Shots'],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled
          // Redux slice의 setShotData 액션 디스패치
          const { setShotData } = await import('../model/planningSlice')
          dispatch(setShotData(data))
        } catch (error) {
          console.error('12-Shot generation failed:', error)
          // 에러는 RTK Query가 자동으로 처리
        }
      }
    }),
    
    // Export to PDF
    exportToPDF: builder.mutation<ExportPlanResponse, ExportPlanRequest>({
      query: (request) => {
        // Validate request with Zod
        const validatedRequest = ExportPlanRequestSchema.parse(request)
        
        return {
          url: `/api/v1/projects/${request.projectId}/planning/export/`,
          method: 'POST',
          body: { ...validatedRequest, format: 'pdf' },
        }
      },
      transformResponse: (response: unknown) => {
        // Validate response with Zod
        return ExportPlanResponseSchema.parse(response)
      },
      invalidatesTags: ['Export'],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled
          // Redux slice의 setExportSuccess 액션 디스패치
          const { setExportSuccess } = await import('../model/planningSlice')
          dispatch(setExportSuccess(true))
          
          // Trigger download
          if (typeof window !== 'undefined') {
            const link = document.createElement('a')
            link.href = data.url
            link.download = data.fileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
          
          // 3초 후 성공 상태 초기화
          setTimeout(() => {
            dispatch(setExportSuccess(false))
          }, 3000)
        } catch (error) {
          console.error('PDF export failed:', error)
        }
      }
    }),
    
    // Export to JSON
    exportToJSON: builder.mutation<ExportPlanResponse, ExportPlanRequest>({
      query: (request) => {
        // Validate request with Zod
        const validatedRequest = ExportPlanRequestSchema.parse(request)
        
        return {
          url: `/api/v1/projects/${request.projectId}/planning/export/`,
          method: 'POST',
          body: { ...validatedRequest, format: 'json' },
        }
      },
      transformResponse: (response: unknown) => {
        // Validate response with Zod
        return ExportPlanResponseSchema.parse(response)
      },
      invalidatesTags: ['Export'],
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled
          // Redux slice의 setExportSuccess 액션 디스패치
          const { setExportSuccess } = await import('../model/planningSlice')
          dispatch(setExportSuccess(true))
          
          // Trigger download
          if (typeof window !== 'undefined') {
            const link = document.createElement('a')
            link.href = data.url
            link.download = data.fileName
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
          }
          
          // 3초 후 성공 상태 초기화
          setTimeout(() => {
            dispatch(setExportSuccess(false))
          }, 3000)
        } catch (error) {
          console.error('JSON export failed:', error)
        }
      }
    }),
  }),
})

// Export hooks
export const {
  useGenerateStoryMutation,
  useGenerate4ActMutation,
  useGenerate12ShotMutation,
  useExportToPDFMutation,
  useExportToJSONMutation,
} = planningApi

// Export for store configuration
export default planningApi