/**
 * FSD 준수 API 에러 인터셉터
 * 경계: shared/api - HTTP 통신 관련 공통 로직
 */

import { AxiosError, AxiosResponse, AxiosRequestConfig } from 'axios'
import { 
  BaseError, 
  ErrorTransformer, 
  HttpErrorCode, 
  ApiErrorResponseSchema,
  GlobalErrorHandler,
  RetryHandler
} from '../lib/error-handling'

// API 에러 인터셉터 설정
export interface ErrorInterceptorConfig {
  enableRetry?: boolean
  retryConfig?: {
    maxAttempts: number
    retryableStatusCodes: HttpErrorCode[]
  }
  enableGlobalErrorHandling?: boolean
  customErrorTransformer?: (error: AxiosError) => BaseError
}

export class ApiErrorInterceptor {
  private config: Required<ErrorInterceptorConfig>
  private globalErrorHandler: GlobalErrorHandler

  constructor(config: ErrorInterceptorConfig = {}) {
    this.config = {
      enableRetry: config.enableRetry ?? true,
      retryConfig: {
        maxAttempts: 3,
        retryableStatusCodes: [
          HttpErrorCode.INTERNAL_SERVER_ERROR,
          HttpErrorCode.BAD_GATEWAY,
          HttpErrorCode.SERVICE_UNAVAILABLE
        ],
        ...config.retryConfig
      },
      enableGlobalErrorHandling: config.enableGlobalErrorHandling ?? true,
      customErrorTransformer: config.customErrorTransformer ?? this.defaultErrorTransformer
    }

    this.globalErrorHandler = new GlobalErrorHandler()
    if (this.config.enableGlobalErrorHandling) {
      this.globalErrorHandler.register()
    }
  }

  /**
   * Axios 응답 인터셉터 - 성공 응답 처리
   */
  responseInterceptor = (response: AxiosResponse): AxiosResponse => {
    // API 계약 준수 검증
    this.validateApiContract(response)
    return response
  }

  /**
   * Axios 에러 인터셉터 - 에러 응답 변환 및 처리
   */
  errorInterceptor = async (error: AxiosError): Promise<never> => {
    const transformedError = this.config.customErrorTransformer(error)
    
    // 재시도 가능한 에러인지 확인
    if (this.shouldRetry(error)) {
      return this.handleRetryableError(error)
    }

    // 글로벌 에러 핸들링
    if (this.config.enableGlobalErrorHandling) {
      this.globalErrorHandler.handleError({
        error: transformedError,
        message: transformedError.message,
        filename: 'api-interceptor',
        lineno: 0,
        colno: 0
      } as ErrorEvent)
    }

    throw transformedError
  }

  /**
   * 기본 에러 변환기
   */
  private defaultErrorTransformer = (error: AxiosError): BaseError => {
    // 네트워크 에러 (서버 응답 없음)
    if (!error.response) {
      return ErrorTransformer.fromHttpStatus(
        HttpErrorCode.SERVICE_UNAVAILABLE,
        '서버에 연결할 수 없습니다. 네트워크 연결을 확인해주세요.'
      )
    }

    const { status, data } = error.response

    // API 에러 응답 스키마 검증 시도
    try {
      const parsedError = ApiErrorResponseSchema.parse(data)
      return ErrorTransformer.fromApiResponse(parsedError)
    } catch {
      // 표준 스키마가 아닌 경우 HTTP 상태 코드로 변환
      return ErrorTransformer.fromHttpStatus(status, this.extractErrorMessage(data))
    }
  }

  /**
   * 응답 데이터에서 에러 메시지 추출
   */
  private extractErrorMessage(data: unknown): string | undefined {
    if (typeof data === 'string') return data
    
    if (typeof data === 'object' && data !== null) {
      const errorData = data as Record<string, any>
      
      // 일반적인 에러 메시지 필드들 확인
      const messageFields = ['message', 'error', 'detail', 'error_message']
      
      for (const field of messageFields) {
        if (errorData[field] && typeof errorData[field] === 'string') {
          return errorData[field]
        }
      }

      // Django REST Framework 유효성 검사 에러 형식
      if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
        return errorData.non_field_errors.join(', ')
      }

      // 필드별 유효성 검사 에러 형식
      const fieldErrors = Object.entries(errorData)
        .filter(([key, value]) => Array.isArray(value))
        .map(([key, value]) => `${key}: ${(value as string[]).join(', ')}`)
      
      if (fieldErrors.length > 0) {
        return fieldErrors.join('; ')
      }
    }

    return undefined
  }

  /**
   * API 계약 준수 검증
   */
  private validateApiContract(response: AxiosResponse): void {
    // Content-Type 검증
    const contentType = response.headers['content-type']
    if (contentType && !contentType.includes('application/json')) {
      console.warn('[API_CONTRACT_VIOLATION] Expected JSON response, got:', contentType)
    }

    // 표준 응답 형식 검증 (선택적)
    if (response.data && typeof response.data === 'object') {
      const hasStandardFields = 'success' in response.data || 'data' in response.data
      if (!hasStandardFields) {
        console.warn('[API_CONTRACT_VIOLATION] Response missing standard fields:', response.data)
      }
    }
  }

  /**
   * 재시도 가능 여부 판단
   */
  private shouldRetry(error: AxiosError): boolean {
    if (!this.config.enableRetry) return false
    if (!error.response) return true // 네트워크 에러는 재시도
    
    const { status } = error.response
    return this.config.retryConfig.retryableStatusCodes.includes(status as HttpErrorCode)
  }

  /**
   * 재시도 가능한 에러 처리
   */
  private async handleRetryableError(error: AxiosError): Promise<never> {
    if (!error.config) {
      throw this.config.customErrorTransformer(error)
    }

    try {
      // 재시도 로직 적용
      const result = await RetryHandler.withRetry(
        async () => {
          // Axios 인스턴스를 통한 재요청
          const { method, url, data, params, headers } = error.config!
          const axios = (error as any).config?.__axios || require('axios').default
          
          return await axios({
            method,
            url,
            data,
            params,
            headers,
            ...error.config
          })
        },
        {
          maxAttempts: this.config.retryConfig.maxAttempts,
          baseDelay: 1000,
          maxDelay: 5000,
          backoffMultiplier: 2
        }
      )

      return result
    } catch (retryError) {
      // 재시도 실패 시 원본 에러 변환하여 throw
      throw this.config.customErrorTransformer(error)
    }
  }

  /**
   * 인터셉터 해제
   */
  cleanup(): void {
    if (this.config.enableGlobalErrorHandling) {
      this.globalErrorHandler.unregister()
    }
  }
}

// Axios 인스턴스용 에러 인터셉터 팩토리
export const createErrorInterceptor = (config?: ErrorInterceptorConfig) => {
  return new ApiErrorInterceptor(config)
}

// 특정 도메인용 커스텀 에러 변환기들
export const ProjectApiErrorTransformer = (error: AxiosError): BaseError => {
  if (!error.response) {
    return ErrorTransformer.fromHttpStatus(
      HttpErrorCode.SERVICE_UNAVAILABLE,
      '프로젝트 서버에 연결할 수 없습니다.'
    )
  }

  const { status, data } = error.response

  // 프로젝트 관련 특수 에러 처리
  if (status === HttpErrorCode.FORBIDDEN && data?.error_code === 'INSUFFICIENT_ROLE') {
    return ErrorTransformer.fromHttpStatus(
      HttpErrorCode.FORBIDDEN,
      '프로젝트에 대한 충분한 권한이 없습니다. 관리자에게 문의하세요.'
    )
  }

  // 기본 변환 로직 적용
  return new ApiErrorInterceptor().defaultErrorTransformer(error)
}

export const AuthApiErrorTransformer = (error: AxiosError): BaseError => {
  if (!error.response) {
    return ErrorTransformer.fromHttpStatus(
      HttpErrorCode.SERVICE_UNAVAILABLE,
      '인증 서버에 연결할 수 없습니다.'
    )
  }

  const { status, data } = error.response

  // 인증 관련 특수 에러 처리
  if (status === HttpErrorCode.UNAUTHORIZED) {
    return ErrorTransformer.fromHttpStatus(
      HttpErrorCode.UNAUTHORIZED,
      '세션이 만료되었습니다. 다시 로그인해주세요.'
    )
  }

  if (status === HttpErrorCode.BAD_REQUEST && data?.error_code === 'INVALID_CREDENTIALS') {
    return ErrorTransformer.fromHttpStatus(
      HttpErrorCode.BAD_REQUEST,
      '이메일 또는 비밀번호가 올바르지 않습니다.'
    )
  }

  return new ApiErrorInterceptor().defaultErrorTransformer(error)
}

// 에러 상태 추적을 위한 유틸리티
export interface ErrorState {
  isLoading: boolean
  error: BaseError | null
  lastErrorTime?: number
}

export const createErrorState = (): ErrorState => ({
  isLoading: false,
  error: null
})

export const updateErrorState = (
  state: ErrorState,
  update: Partial<ErrorState>
): ErrorState => ({
  ...state,
  ...update,
  lastErrorTime: update.error ? Date.now() : state.lastErrorTime
})

// 에러 상태 초기화
export const clearError = (state: ErrorState): ErrorState => ({
  ...state,
  error: null,
  lastErrorTime: undefined
})

export const setLoading = (state: ErrorState, isLoading: boolean): ErrorState => ({
  ...state,
  isLoading,
  error: isLoading ? null : state.error // 로딩 시작 시 이전 에러 클리어
})

export const setError = (state: ErrorState, error: BaseError): ErrorState => ({
  ...state,
  isLoading: false,
  error,
  lastErrorTime: Date.now()
})