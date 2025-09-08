/**
 * 통합 API 서비스 - FSD 아키텍처 준수
 * 책임: 백엔드 API 프록시, 스키마 검증, 에러 처리
 * @layer shared/api
 */

import { z } from 'zod'

import { httpClient, API_PROXY_CONFIG } from './http-client'
import {
  ProjectSchema,
  ProjectListResponseSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  FeedbackSchema,
  FeedbackListResponseSchema,
  CreateFeedbackSchema,
  UpdateFeedbackSchema,
  LoginRequestSchema,
  SignupRequestSchema,
  PasswordResetRequestSchema,
  PasswordResetVerifySchema,
  UserSchema,
  ApiErrorSchema,
  validateData,
  safeParseData,
  type ProjectType,
  type ProjectListResponseType,
  type CreateProjectType,
  type UpdateProjectType,
  type FeedbackType,
  type FeedbackListResponseType,
  type CreateFeedbackType,
  type UpdateFeedbackType,
  type LoginRequestType,
  type SignupRequestType,
  type PasswordResetRequestType,
  type PasswordResetVerifyType,
  type UserType,
  type ApiErrorType,
} from './schemas'

// Health Check API 스키마 (Django 응답 형식에 맞게 수정)
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'unhealthy']),
  timestamp: z.union([z.string().datetime(), z.number()]), // Django는 숫자 타임스탬프
  service: z.string().optional(),
  version: z.string().optional(),
  environment: z.string().optional(),
  uptime: z.number().optional(),
  memory: z
    .object({
      rss: z.number(),
      heapTotal: z.number(),
      heapUsed: z.number(),
      external: z.number(),
    })
    .optional(),
  checks: z
    .object({
      database: z
        .object({
          status: z.string(),
          message: z.string(),
        })
        .optional(),
      cache: z
        .object({
          status: z.string(),
          message: z.string(),
        })
        .optional(),
    })
    .optional(),
})

export type HealthResponseType = z.infer<typeof HealthResponseSchema>

// API 서비스 결과 타입
export interface ApiServiceResult<T> {
  success: boolean
  data?: T
  error?: ApiErrorType
  source?: 'primary' | 'fallback' | 'local'
}

/**
 * 통합 API 서비스 클래스
 * - 백엔드와 프론트엔드 API 경로 통합
 * - Zod 스키마 검증
 * - 타입 안전성 보장
 * - 에러 처리 표준화
 */
export class ApiService {
  /**
   * 백엔드 경로로 요청을 프록시하고 결과를 검증
   */
  private async proxyToBackend<T>(
    frontendPath: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    schema: z.ZodSchema<T>,
    body?: unknown
  ): Promise<ApiServiceResult<T>> {
    try {
      // 프론트엔드 경로를 백엔드 경로로 변환
      const backendPath = API_PROXY_CONFIG.normalizeBackendPath(frontendPath)

      let response
      switch (method) {
        case 'GET':
          response = await httpClient.get(backendPath)
          break
        case 'POST':
          response = await httpClient.post(backendPath, body)
          break
        case 'PUT':
          response = await httpClient.put(backendPath, body)
          break
        case 'DELETE':
          response = await httpClient.delete(backendPath)
          break
        case 'PATCH':
          response = await httpClient.patch(backendPath, body)
          break
      }

      // Zod 스키마로 응답 검증
      const validatedData = safeParseData(schema, response.data)
      if (!validatedData) {
        return {
          success: false,
          error: {
            error: 'VALIDATION_ERROR',
            message: '백엔드 응답 형식이 올바르지 않습니다.',
            statusCode: 500,
            timestamp: new Date().toISOString(),
          },
        }
      }

      return {
        success: true,
        data: validatedData,
        source: response.source,
      }
    } catch (error: any) {
      // 에러 검증 및 표준화
      const apiError = safeParseData(ApiErrorSchema, {
        error: error?.status ? `HTTP_${error.status}` : 'NETWORK_ERROR',
        message: error?.message || 'API 요청 중 오류가 발생했습니다.',
        statusCode: error?.status || 500,
        timestamp: new Date().toISOString(),
        details: error?.data,
      })

      return {
        success: false,
        error: apiError || {
          error: 'UNKNOWN_ERROR',
          message: 'Unknown API error occurred',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        },
      }
    }
  }

  // Health Check API
  async getHealthStatus(): Promise<ApiServiceResult<HealthResponseType>> {
    return this.proxyToBackend('/api/health', 'GET', HealthResponseSchema)
  }

  // Projects API
  async getProjects(): Promise<ApiServiceResult<ProjectListResponseType>> {
    return this.proxyToBackend('/api/projects', 'GET', ProjectListResponseSchema)
  }

  async getProject(id: string): Promise<ApiServiceResult<ProjectType>> {
    return this.proxyToBackend(`/api/projects/${id}`, 'GET', ProjectSchema)
  }

  async createProject(data: CreateProjectType): Promise<ApiServiceResult<ProjectType>> {
    const validation = validateData(CreateProjectSchema, data)
    if (!validation.success) {
      return {
        success: false,
        error: {
          error: 'VALIDATION_ERROR',
          message: validation.error,
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      }
    }

    return this.proxyToBackend('/api/projects', 'POST', ProjectSchema, validation.data)
  }

  async updateProject(id: string, data: UpdateProjectType): Promise<ApiServiceResult<ProjectType>> {
    const validation = validateData(UpdateProjectSchema, data)
    if (!validation.success) {
      return {
        success: false,
        error: {
          error: 'VALIDATION_ERROR',
          message: validation.error,
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      }
    }

    return this.proxyToBackend(`/api/projects/${id}`, 'PUT', ProjectSchema, validation.data)
  }

  async deleteProject(id: string): Promise<ApiServiceResult<{ message: string }>> {
    const DeleteResultSchema = z.object({ message: z.string() })
    return this.proxyToBackend(`/api/projects/${id}`, 'DELETE', DeleteResultSchema)
  }

  // Feedback API
  async getFeedbacks(): Promise<ApiServiceResult<FeedbackListResponseType>> {
    return this.proxyToBackend('/api/feedback', 'GET', FeedbackListResponseSchema)
  }

  async getFeedback(id: string): Promise<ApiServiceResult<FeedbackType>> {
    return this.proxyToBackend(`/api/feedback/${id}`, 'GET', FeedbackSchema)
  }

  async createFeedback(data: CreateFeedbackType): Promise<ApiServiceResult<FeedbackType>> {
    const validation = validateData(CreateFeedbackSchema, data)
    if (!validation.success) {
      return {
        success: false,
        error: {
          error: 'VALIDATION_ERROR',
          message: validation.error,
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      }
    }

    return this.proxyToBackend('/api/feedback', 'POST', FeedbackSchema, validation.data)
  }

  async updateFeedback(id: string, data: UpdateFeedbackType): Promise<ApiServiceResult<FeedbackType>> {
    const validation = validateData(UpdateFeedbackSchema, data)
    if (!validation.success) {
      return {
        success: false,
        error: {
          error: 'VALIDATION_ERROR',
          message: validation.error,
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      }
    }

    return this.proxyToBackend(`/api/feedback/${id}`, 'PATCH', FeedbackSchema, validation.data)
  }

  // Authentication API
  async login(credentials: LoginRequestType): Promise<ApiServiceResult<{ user: UserType; token: string }>> {
    const validation = validateData(LoginRequestSchema, credentials)
    if (!validation.success) {
      return {
        success: false,
        error: {
          error: 'VALIDATION_ERROR',
          message: validation.error,
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      }
    }

    const LoginResponseSchema = z.object({
      user: UserSchema,
      token: z.string(),
    })

    return this.proxyToBackend('/api/auth/login', 'POST', LoginResponseSchema, validation.data)
  }

  async signup(userData: SignupRequestType): Promise<ApiServiceResult<{ user: UserType; message: string }>> {
    const validation = validateData(SignupRequestSchema, userData)
    if (!validation.success) {
      return {
        success: false,
        error: {
          error: 'VALIDATION_ERROR',
          message: validation.error,
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      }
    }

    const SignupResponseSchema = z.object({
      user: UserSchema,
      message: z.string(),
    })

    return this.proxyToBackend('/api/auth/signup', 'POST', SignupResponseSchema, validation.data)
  }

  async requestPasswordReset(data: PasswordResetRequestType): Promise<ApiServiceResult<{ message: string }>> {
    const validation = validateData(PasswordResetRequestSchema, data)
    if (!validation.success) {
      return {
        success: false,
        error: {
          error: 'VALIDATION_ERROR',
          message: validation.error,
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      }
    }

    const ResetResponseSchema = z.object({ message: z.string() })
    return this.proxyToBackend('/api/auth/reset-password', 'POST', ResetResponseSchema, validation.data)
  }

  async verifyPasswordReset(data: PasswordResetVerifyType): Promise<ApiServiceResult<{ message: string }>> {
    const validation = validateData(PasswordResetVerifySchema, data)
    if (!validation.success) {
      return {
        success: false,
        error: {
          error: 'VALIDATION_ERROR',
          message: validation.error,
          statusCode: 400,
          timestamp: new Date().toISOString(),
        },
      }
    }

    const VerifyResponseSchema = z.object({ message: z.string() })
    return this.proxyToBackend('/api/auth/reset-password/verify', 'POST', VerifyResponseSchema, validation.data)
  }
}

// 싱글톤 인스턴스 생성
export const apiService = new ApiService()

// 백엔드 상태 모니터링 유틸리티
export const getBackendStatus = () => httpClient.getBackendStatus()
export const forceHealthCheck = () => httpClient.forceHealthCheck()
