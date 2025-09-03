/**
 * API 계약 검증 및 타입 안전성 보장
 * Zod를 사용한 런타임 스키마 검증과 MSW 모킹을 통합
 */

import { z } from 'zod'

// 공통 스키마 정의
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  timestamp: z.string().datetime(),
})

export const PaginationSchema = z.object({
  page: z.number().min(1),
  limit: z.number().min(1).max(100),
  total: z.number().min(0),
  totalPages: z.number().min(0),
})

// 사용자 관련 스키마
export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  profile: z.object({
    displayName: z.string().optional(),
    avatar: z.string().url().optional(),
  }).optional(),
})

export const AuthTokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().positive(),
  tokenType: z.literal('Bearer'),
})

export const SignupRequestSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  confirmPassword: z.string().min(8).max(100),
}).refine(data => data.password === data.confirmPassword, {
  message: "비밀번호가 일치하지 않습니다.",
  path: ["confirmPassword"],
})

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// 비디오 관련 스키마
export const VideoMetadataSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  size: z.number().positive(),
  duration: z.number().positive(),
  resolution: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  format: z.enum(['mp4', 'avi', 'mov', 'mkv']),
  quality: z.enum(['720p', '1080p', '4K']),
  uploadedAt: z.string().datetime(),
  status: z.enum(['uploading', 'processing', 'completed', 'failed']),
})

export const VideoUploadRequestSchema = z.object({
  file: z.instanceof(File),
  quality: z.enum(['720p', '1080p', '4K']).default('1080p'),
  metadata: z.object({
    title: z.string().max(200).optional(),
    description: z.string().max(1000).optional(),
    tags: z.array(z.string()).max(10).optional(),
  }).optional(),
})

export const VideoProcessingStatusSchema = z.object({
  videoId: z.string().uuid(),
  status: z.enum(['queued', 'processing', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  estimatedTimeRemaining: z.number().min(0).optional(),
  error: z.string().optional(),
})

// 피드백 관련 스키마
export const FeedbackSchema = z.object({
  id: z.string().uuid(),
  videoId: z.string().uuid(),
  userId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  category: z.enum(['quality', 'processing_time', 'features', 'bugs', 'other']),
  createdAt: z.string().datetime(),
})

export const FeedbackRequestSchema = z.object({
  videoId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  category: z.enum(['quality', 'processing_time', 'features', 'bugs', 'other']),
})

// API 엔드포인트 계약 정의
export const ApiContracts = {
  // 인증 엔드포인트
  auth: {
    signup: {
      method: 'POST' as const,
      path: '/api/auth/signup',
      requestSchema: SignupRequestSchema,
      responseSchema: ApiResponseSchema.extend({
        data: z.object({
          user: UserSchema,
          tokens: AuthTokenSchema,
        }).optional(),
      }),
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      requestSchema: LoginRequestSchema,
      responseSchema: ApiResponseSchema.extend({
        data: z.object({
          user: UserSchema,
          tokens: AuthTokenSchema,
        }).optional(),
      }),
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      requestSchema: z.void(),
      responseSchema: ApiResponseSchema.extend({
        data: UserSchema.optional(),
      }),
    },
  },
  
  // 비디오 엔드포인트
  video: {
    upload: {
      method: 'POST' as const,
      path: '/api/video/upload',
      requestSchema: VideoUploadRequestSchema,
      responseSchema: ApiResponseSchema.extend({
        data: VideoMetadataSchema.optional(),
      }),
    },
    status: {
      method: 'GET' as const,
      path: '/api/video/:id/status',
      requestSchema: z.object({
        id: z.string().uuid(),
      }),
      responseSchema: ApiResponseSchema.extend({
        data: VideoProcessingStatusSchema.optional(),
      }),
    },
    list: {
      method: 'GET' as const,
      path: '/api/video',
      requestSchema: z.object({
        page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).default('1'),
        limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('20'),
      }),
      responseSchema: ApiResponseSchema.extend({
        data: z.object({
          videos: z.array(VideoMetadataSchema),
          pagination: PaginationSchema,
        }).optional(),
      }),
    },
  },
  
  // 피드백 엔드포인트
  feedback: {
    create: {
      method: 'POST' as const,
      path: '/api/feedback',
      requestSchema: FeedbackRequestSchema,
      responseSchema: ApiResponseSchema.extend({
        data: FeedbackSchema.optional(),
      }),
    },
    list: {
      method: 'GET' as const,
      path: '/api/feedback',
      requestSchema: z.object({
        videoId: z.string().uuid().optional(),
        page: z.string().transform(val => parseInt(val)).pipe(z.number().min(1)).default('1'),
        limit: z.string().transform(val => parseInt(val)).pipe(z.number().min(1).max(100)).default('20'),
      }),
      responseSchema: ApiResponseSchema.extend({
        data: z.object({
          feedback: z.array(FeedbackSchema),
          pagination: PaginationSchema,
        }).optional(),
      }),
    },
  },
}

// 타입 추론
export type ApiContracts = typeof ApiContracts
export type User = z.infer<typeof UserSchema>
export type AuthToken = z.infer<typeof AuthTokenSchema>
export type SignupRequest = z.infer<typeof SignupRequestSchema>
export type LoginRequest = z.infer<typeof LoginRequestSchema>
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>
export type VideoUploadRequest = z.infer<typeof VideoUploadRequestSchema>
export type VideoProcessingStatus = z.infer<typeof VideoProcessingStatusSchema>
export type Feedback = z.infer<typeof FeedbackSchema>
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>
export type ApiResponse<T = unknown> = z.infer<typeof ApiResponseSchema> & { data?: T }
export type Pagination = z.infer<typeof PaginationSchema>

// API 클라이언트 계약 검증 함수
export function validateApiContract<T extends keyof ApiContracts>(
  endpoint: T,
  action: keyof ApiContracts[T]
): {
  validateRequest: (data: unknown) => z.infer<ApiContracts[T][typeof action]['requestSchema']>
  validateResponse: (data: unknown) => z.infer<ApiContracts[T][typeof action]['responseSchema']>
  contract: ApiContracts[T][typeof action]
} {
  const contract = ApiContracts[endpoint][action] as any
  
  return {
    validateRequest: (data: unknown) => contract.requestSchema.parse(data),
    validateResponse: (data: unknown) => contract.responseSchema.parse(data),
    contract,
  }
}

// 에러 처리를 위한 유틸리티
export class ApiContractError extends Error {
  constructor(
    public readonly endpoint: string,
    public readonly action: string,
    public readonly validationError: z.ZodError,
    public readonly isRequest: boolean
  ) {
    super(`API contract violation in ${endpoint}.${action} (${isRequest ? 'request' : 'response'}): ${validationError.message}`)
    this.name = 'ApiContractError'
  }
}

// 안전한 API 호출 래퍼
export async function safeApiCall<T extends keyof ApiContracts, A extends keyof ApiContracts[T]>(
  endpoint: T,
  action: A,
  requestData: unknown,
  apiFetcher: (validatedRequest: any, contract: any) => Promise<unknown>
): Promise<z.infer<ApiContracts[T][A]['responseSchema']>> {
  const validator = validateApiContract(endpoint, action)
  
  try {
    // 요청 데이터 검증
    const validatedRequest = validator.validateRequest(requestData)
    
    // API 호출
    const response = await apiFetcher(validatedRequest, validator.contract)
    
    // 응답 데이터 검증
    const validatedResponse = validator.validateResponse(response)
    
    return validatedResponse
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ApiContractError(
        String(endpoint),
        String(action),
        error,
        true // 요청 검증 실패로 가정
      )
    }
    throw error
  }
}