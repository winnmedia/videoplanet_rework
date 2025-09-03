import { z } from 'zod';
import { apiConfig } from '@/shared/lib/env-validation'
import { 
  SuccessResponseSchema, 
  ErrorResponseSchema, 
  ApiResponse, 
  ApiErrorResponse,
  HttpStatusCode,
  validateStatusCode,
  isValidationError,
  isAuthenticationError,
  isAuthorizationError,
  isNotFoundError,
  isConflictError,
  isServerError
} from './types';

// API Client 요청 옵션
interface ApiClientOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
}

// API Client 에러 클래스
export class ApiClientError extends Error {
  constructor(
    public status: HttpStatusCode,
    public response: ApiErrorResponse,
    public originalError?: Error
  ) {
    super(`API Error ${status}: ${response.error.message}`);
    this.name = 'ApiClientError';
  }

  // 편의 메서드들
  isValidationError() { return isValidationError(this.response); }
  isAuthenticationError() { return isAuthenticationError(this.response); }
  isAuthorizationError() { return isAuthorizationError(this.response); }
  isNotFoundError() { return isNotFoundError(this.response); }
  isConflictError() { return isConflictError(this.response); }
  isServerError() { return isServerError(this.response); }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  // 타입 안전한 API 요청 메서드
  async request<T>(
    endpoint: string, 
    options: ApiClientOptions,
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (options.body && options.method !== 'GET') {
      config.body = typeof options.body === 'string' 
        ? options.body 
        : JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      return await this.handleResponse<T>(response, responseSchema);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // HTTP 응답 처리 및 상태 코드 검증
  private async handleResponse<T>(
    response: Response, 
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    const status = response.status as HttpStatusCode;
    
    // 지원되지 않는 상태 코드 확인
    if (!validateStatusCode(status)) {
      throw new Error(`Unsupported HTTP status code: ${status}`);
    }

    let responseData: unknown;
    try {
      responseData = await response.json();
    } catch {
      throw new Error('Invalid JSON response from server');
    }

    // 에러 응답 처리
    if (!response.ok) {
      let errorResponse: ApiErrorResponse;
      
      try {
        errorResponse = ErrorResponseSchema.parse(responseData);
      } catch {
        // 표준 에러 응답이 아닌 경우 변환
        errorResponse = {
          error: {
            code: 'UNKNOWN_ERROR',
            message: `HTTP ${status} error`,
            details: responseData
          },
          status,
          meta: {
            timestamp: new Date().toISOString()
          }
        };
      }
      
      throw new ApiClientError(status, errorResponse);
    }

    // 성공 응답 처리
    if (responseSchema) {
      // 스키마가 제공된 경우 검증
      const successSchema = SuccessResponseSchema(responseSchema);
      const validatedResponse = successSchema.parse(responseData);
      return validatedResponse.data;
    } else {
      // 스키마가 없는 경우 기본 성공 응답 검증
      const basicSuccessSchema = SuccessResponseSchema(z.unknown());
      const validatedResponse = basicSuccessSchema.parse(responseData);
      return validatedResponse.data as T;
    }
  }

  // HTTP 메서드별 편의 함수들
  async get<T>(
    endpoint: string, 
    headers?: Record<string, string>,
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    return this.request(endpoint, { method: 'GET', headers }, responseSchema);
  }

  async post<T>(
    endpoint: string, 
    body?: unknown, 
    headers?: Record<string, string>,
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    return this.request(endpoint, { method: 'POST', body, headers }, responseSchema);
  }

  async put<T>(
    endpoint: string, 
    body?: unknown, 
    headers?: Record<string, string>,
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    return this.request(endpoint, { method: 'PUT', body, headers }, responseSchema);
  }

  async patch<T>(
    endpoint: string, 
    body?: unknown, 
    headers?: Record<string, string>,
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    return this.request(endpoint, { method: 'PATCH', body, headers }, responseSchema);
  }

  async delete<T>(
    endpoint: string, 
    options?: { body?: unknown; headers?: Record<string, string> },
    responseSchema?: z.ZodType<T>
  ): Promise<T> {
    return this.request(endpoint, { 
      method: 'DELETE', 
      body: options?.body,
      headers: options?.headers
    }, responseSchema);
  }
}

export const apiClient = new ApiClient(apiConfig.baseURL);
export { ApiClient };