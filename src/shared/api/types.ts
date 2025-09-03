import { z } from 'zod';

// HTTP Status Code 타입 정의
export type HttpStatusCode = 
  | 200 | 201 | 204 // Success
  | 400 | 401 | 403 | 404 | 409 | 422 // Client Error
  | 500 | 502 | 503 | 504; // Server Error

// 성공 응답 스키마
export const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  data: dataSchema,
  status: z.literal(200).or(z.literal(201)).or(z.literal(204)),
  message: z.string().optional(),
  meta: z.object({
    timestamp: z.string(),
    requestId: z.string().optional()
  }).optional()
});

// 에러 응답 스키마
export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  }),
  status: z.union([
    z.literal(400), z.literal(401), z.literal(403), 
    z.literal(404), z.literal(409), z.literal(422),
    z.literal(500), z.literal(502), z.literal(503), z.literal(504)
  ]),
  meta: z.object({
    timestamp: z.string(),
    requestId: z.string().optional(),
    traceId: z.string().optional()
  }).optional()
});

// 타입 추출
export type ApiSuccessResponse<T> = z.infer<RetType<typeof SuccessResponseSchema<z.ZodType<T>>>>;
export type ApiErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Status Code별 구체적인 에러 타입
export interface ValidationError extends ApiErrorResponse {
  status: 422;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: {
      field: string;
      rule: string;
      value?: unknown;
    }[];
  };
}

export interface AuthenticationError extends ApiErrorResponse {
  status: 401;
  error: {
    code: 'AUTHENTICATION_REQUIRED' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID';
    message: string;
  };
}

export interface AuthorizationError extends ApiErrorResponse {
  status: 403;
  error: {
    code: 'INSUFFICIENT_PERMISSIONS' | 'RESOURCE_FORBIDDEN';
    message: string;
    details?: {
      required: string[];
      current: string[];
    };
  };
}

export interface NotFoundError extends ApiErrorResponse {
  status: 404;
  error: {
    code: 'RESOURCE_NOT_FOUND';
    message: string;
    details?: {
      resource: string;
      id?: string;
    };
  };
}

export interface ConflictError extends ApiErrorResponse {
  status: 409;
  error: {
    code: 'RESOURCE_CONFLICT';
    message: string;
    details?: {
      conflictingField: string;
      existingValue: unknown;
    };
  };
}

export interface ServerError extends ApiErrorResponse {
  status: 500 | 502 | 503 | 504;
  error: {
    code: 'INTERNAL_SERVER_ERROR' | 'BAD_GATEWAY' | 'SERVICE_UNAVAILABLE' | 'GATEWAY_TIMEOUT';
    message: string;
  };
}

// HTTP Status Code 검증 함수
export function validateStatusCode(status: number): status is HttpStatusCode {
  const validCodes: HttpStatusCode[] = [
    200, 201, 204,
    400, 401, 403, 404, 409, 422,
    500, 502, 503, 504
  ];
  return validCodes.includes(status as HttpStatusCode);
}

// 에러 타입 가드
export function isValidationError(error: ApiErrorResponse): error is ValidationError {
  return error.status === 422 && error.error.code === 'VALIDATION_ERROR';
}

export function isAuthenticationError(error: ApiErrorResponse): error is AuthenticationError {
  return error.status === 401;
}

export function isAuthorizationError(error: ApiErrorResponse): error is AuthorizationError {
  return error.status === 403;
}

export function isNotFoundError(error: ApiErrorResponse): error is NotFoundError {
  return error.status === 404;
}

export function isConflictError(error: ApiErrorResponse): error is ConflictError {
  return error.status === 409;
}

export function isServerError(error: ApiErrorResponse): error is ServerError {
  return error.status >= 500 && error.status < 600;
}

// Permission API 스키마 추가
export const PermissionApiSchema = {
  // 권한 확인 요청
  checkPermission: z.object({
    userId: z.string().min(1),
    projectId: z.string().min(1),
    permission: z.string().min(1),
    context: z.object({
      ip: z.string().optional(),
      userAgent: z.string().optional(),
      requestId: z.string().optional()
    }).optional()
  }),
  
  // 다중 권한 확인 요청
  checkPermissions: z.object({
    userId: z.string().min(1),
    projectId: z.string().min(1),
    permissions: z.array(z.string().min(1)).min(1),
    requireAll: z.boolean().default(true),
    context: z.object({
      ip: z.string().optional(),
      userAgent: z.string().optional(),
      requestId: z.string().optional()
    }).optional()
  }),
  
  // 사용자 권한 컨텍스트 응답
  userPermissionContext: z.object({
    userId: z.string(),
    projectId: z.string(),
    role: z.enum(['owner', 'admin', 'editor', 'reviewer', 'viewer']),
    permissions: z.array(z.string()),
    restrictions: z.object({
      ipWhitelist: z.array(z.string()).optional(),
      timeRestrictions: z.array(z.object({
        startHour: z.number().min(0).max(23),
        endHour: z.number().min(0).max(23),
        daysOfWeek: z.array(z.number().min(0).max(6)),
        timezone: z.string()
      })).optional(),
      resourceLimits: z.object({
        maxFileSize: z.number().positive().optional(),
        maxUploadPerDay: z.number().positive().optional(),
        allowedFileTypes: z.array(z.string()).optional(),
        maxCommentLength: z.number().positive().optional()
      }),
      requireMfa: z.boolean()
    }),
    metadata: z.object({
      grantedAt: z.string().datetime(),
      grantedBy: z.string(),
      lastUsedAt: z.string().datetime().optional(),
      expiresAt: z.string().datetime().optional(),
      source: z.enum(['role', 'explicit', 'inherited'])
    })
  }),
  
  // 권한 확인 결과 응답
  permissionCheckResult: z.object({
    granted: z.boolean(),
    reason: z.string().optional(),
    requiredRole: z.enum(['owner', 'admin', 'editor', 'reviewer', 'viewer']).optional(),
    restrictions: z.array(z.string()).optional(),
    metadata: z.record(z.unknown()).optional()
  })
}

// 사용자 데이터 격리 API 스키마
export const DataIsolationApiSchema = {
  // 데이터 소유권 확인 요청
  checkDataOwnership: z.object({
    userId: z.string().min(1),
    resourceType: z.enum(['project', 'file', 'comment', 'feedback']),
    resourceId: z.string().min(1),
    action: z.enum(['read', 'write', 'delete', 'share'])
  }),
  
  // 데이터 접근 로그 요청
  dataAccessLog: z.object({
    userId: z.string().min(1),
    resourceType: z.enum(['project', 'file', 'comment', 'feedback']),
    resourceId: z.string().min(1),
    action: z.enum(['accessed', 'created', 'updated', 'deleted', 'shared']),
    timestamp: z.string().datetime(),
    ip: z.string().optional(),
    userAgent: z.string().optional(),
    success: z.boolean(),
    reason: z.string().optional()
  }),
  
  // GDPR 데이터 요청
  gdprDataRequest: z.object({
    userId: z.string().min(1),
    requestType: z.enum(['export', 'delete', 'rectify']),
    dataTypes: z.array(z.enum(['profile', 'projects', 'files', 'comments', 'activity_logs'])),
    reason: z.string().optional(),
    requestedAt: z.string().datetime()
  })
}

// 타입 추출
export type PermissionCheckRequest = z.infer<typeof PermissionApiSchema.checkPermission>
export type PermissionCheckResponse = z.infer<typeof PermissionApiSchema.permissionCheckResult>
export type UserPermissionContext = z.infer<typeof PermissionApiSchema.userPermissionContext>
export type DataOwnershipRequest = z.infer<typeof DataIsolationApiSchema.checkDataOwnership>
export type DataAccessLog = z.infer<typeof DataIsolationApiSchema.dataAccessLog>
export type GdprDataRequest = z.infer<typeof DataIsolationApiSchema.gdprDataRequest>

// 타입 도우미
type RetType<T extends (...args: unknown[]) => unknown> = ReturnType<T>;