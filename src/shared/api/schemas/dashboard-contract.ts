/**
 * Dashboard API 계약 검증 및 문서화
 * @author Data Lead Daniel
 * @since 2025-09-03
 * 
 * API 계약 원칙:
 * 1. OpenAPI 3.0 호환 스키마 정의
 * 2. 버전별 하위 호환성 보장
 * 3. 에러 응답 표준화
 * 4. 성능 요구사항 명시
 */

import { z } from 'zod';
import { 
  DashboardDataSchema, 
  DASHBOARD_SCHEMA_VERSION,
  ProjectStatusSchema,
  PrioritySchema,
  ActivityTypeSchema 
} from './dashboard';

// =============================================================================
// API 계약 메타데이터 (API Contract Metadata)
// =============================================================================

export const DASHBOARD_API_CONTRACT = {
  version: '1.0.0',
  title: 'Dashboard API',
  description: 'VideoPlanet Dashboard 데이터 API',
  baseUrl: '/api/dashboard',
  lastUpdated: '2025-09-03',
  maintainer: 'Data Lead Daniel',
  stability: 'stable' as const,
  deprecationDate: null,
  migrationGuide: null
};

// =============================================================================
// 요청/응답 스키마 정의 (Request/Response Schemas)
// =============================================================================

/**
 * GET /api/dashboard/summary 계약
 */
export const DashboardSummaryContract = {
  endpoint: '/api/dashboard/summary',
  method: 'GET',
  description: 'Dashboard 전체 요약 데이터 조회',
  
  // 요청 스키마
  queryParams: z.object({
    refresh: z.boolean().optional().describe('캐시 무시하고 최신 데이터 요청'),
    timezone: z.string().optional().default('Asia/Seoul').describe('사용자 시간대')
  }).describe('Dashboard 요약 요청 쿼리 파라미터'),
  
  headers: z.object({
    'authorization': z.string().optional().describe('Bearer 토큰'),
    'x-schema-version': z.string().default(DASHBOARD_SCHEMA_VERSION).describe('스키마 버전'),
    'accept': z.literal('application/json').default('application/json')
  }).describe('요청 헤더'),
  
  // 응답 스키마
  response: z.object({
    success: z.literal(true),
    data: DashboardDataSchema,
    meta: z.object({
      timestamp: z.string().datetime().describe('응답 생성 시간'),
      version: z.string().describe('API 버전'),
      execution_time_ms: z.number().optional().describe('실행 시간 (밀리초)')
    })
  }).describe('Dashboard 요약 성공 응답'),
  
  // 에러 응답
  errorResponse: z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string().describe('에러 코드'),
      message: z.string().describe('에러 메시지'),
      timestamp: z.string().datetime(),
      trace_id: z.string().optional().describe('추적 ID')
    })
  }).describe('Dashboard 요약 에러 응답'),
  
  // 성능 요구사항
  performance: {
    maxResponseTime: '2s',
    cacheStrategy: 'stale-while-revalidate',
    cacheTTL: '5m',
    rateLimit: '100 requests/min per user'
  },
  
  // HTTP 상태 코드
  statusCodes: {
    200: '성공',
    400: '잘못된 요청',
    401: '인증 필요',
    403: '권한 없음', 
    404: 'API 엔드포인트 없음',
    429: '요청 한도 초과',
    500: '서버 내부 오류',
    502: '백엔드 서비스 오류',
    503: '서비스 이용 불가',
    504: '요청 시간 초과'
  }
};

/**
 * GET /api/dashboard/stats 계약
 */
export const DashboardStatsContract = {
  endpoint: '/api/dashboard/stats',
  method: 'GET',
  description: '통계 데이터만 경량 조회',
  
  queryParams: z.object({
    period: z.enum(['hour', 'day', 'week', 'month']).optional().default('day').describe('집계 기간')
  }).describe('통계 요청 파라미터'),
  
  response: z.object({
    success: z.literal(true),
    data: z.object({
      stats: z.object({
        active_projects: z.number().min(0),
        new_feedback: z.number().min(0),
        today_schedule: z.number().min(0),
        completed_videos: z.number().min(0)
      })
    }),
    meta: z.object({
      timestamp: z.string().datetime(),
      cached: z.boolean().describe('캐시된 데이터 여부')
    })
  }).describe('통계 성공 응답'),
  
  performance: {
    maxResponseTime: '500ms',
    cacheStrategy: 'cache-first',
    cacheTTL: '1m'
  }
};

/**
 * GET /api/dashboard/notifications/summary 계약
 */
export const NotificationsSummaryContract = {
  endpoint: '/api/dashboard/notifications/summary',
  method: 'GET', 
  description: '알림 요약 정보 조회',
  
  response: z.object({
    success: z.literal(true),
    data: z.object({
      notifications: z.object({
        total_count: z.number().min(0),
        unread_count: z.number().min(0),
        feedback_count: z.number().min(0),
        schedule_count: z.number().min(0),
        mention_count: z.number().min(0)
      })
    }),
    meta: z.object({
      timestamp: z.string().datetime()
    })
  }).describe('알림 요약 성공 응답'),
  
  performance: {
    maxResponseTime: '300ms',
    cacheStrategy: 'stale-while-revalidate',
    cacheTTL: '30s'
  }
};

// =============================================================================
// 계약 검증 함수 (Contract Validation Functions)
// =============================================================================

/**
 * Dashboard API 요청 검증
 */
export function validateDashboardSummaryRequest(request: unknown) {
  try {
    const validated = DashboardSummaryContract.queryParams.parse(request);
    return { success: true, data: validated };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: '잘못된 요청 형식입니다',
        details: error
      }
    };
  }
}

/**
 * Dashboard API 응답 검증
 */
export function validateDashboardSummaryResponse(response: unknown) {
  try {
    const validated = DashboardSummaryContract.response.parse(response);
    return { success: true, data: validated };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'INVALID_RESPONSE',
        message: 'API 응답 형식이 올바르지 않습니다',
        details: error
      }
    };
  }
}

// =============================================================================
// 호환성 검사 (Compatibility Check)
// =============================================================================

/**
 * API 버전 호환성 검사
 */
export function checkApiCompatibility(
  requestedVersion: string,
  supportedVersions: string[] = ['1.0.0']
): {
  compatible: boolean;
  message: string;
  suggestedVersion?: string;
} {
  if (supportedVersions.includes(requestedVersion)) {
    return {
      compatible: true,
      message: `버전 ${requestedVersion}은 지원됩니다`
    };
  }
  
  // 주요 버전 호환성 검사 (예: 1.1.0 요청 시 1.0.0으로 호환)
  const [majorRequested] = requestedVersion.split('.');
  const compatibleVersion = supportedVersions.find(v => 
    v.startsWith(`${majorRequested}.`)
  );
  
  if (compatibleVersion) {
    return {
      compatible: true,
      message: `버전 ${requestedVersion}은 ${compatibleVersion}로 호환됩니다`,
      suggestedVersion: compatibleVersion
    };
  }
  
  return {
    compatible: false,
    message: `지원되지 않는 버전입니다: ${requestedVersion}`,
    suggestedVersion: supportedVersions[supportedVersions.length - 1]
  };
}

// =============================================================================
// OpenAPI 3.0 스키마 생성 (OpenAPI 3.0 Schema Generation)
// =============================================================================

/**
 * Dashboard API OpenAPI 3.0 스키마 생성
 */
export function generateOpenAPISchema() {
  return {
    openapi: '3.0.3',
    info: {
      title: DASHBOARD_API_CONTRACT.title,
      version: DASHBOARD_API_CONTRACT.version,
      description: DASHBOARD_API_CONTRACT.description,
      contact: {
        name: DASHBOARD_API_CONTRACT.maintainer,
        email: 'daniel@videoplanet.com'
      },
      license: {
        name: 'Private',
        url: 'https://videoplanet.com/license'
      }
    },
    servers: [
      {
        url: 'https://api.videoplanet.com',
        description: 'Production server'
      },
      {
        url: 'https://api-staging.videoplanet.com',
        description: 'Staging server'
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    paths: {
      '/api/dashboard/summary': {
        get: {
          summary: 'Dashboard 요약 데이터 조회',
          description: DashboardSummaryContract.description,
          operationId: 'getDashboardSummary',
          tags: ['Dashboard'],
          parameters: [
            {
              name: 'refresh',
              in: 'query',
              description: '캐시 무시하고 최신 데이터 요청',
              required: false,
              schema: { type: 'boolean' }
            },
            {
              name: 'timezone',
              in: 'query',
              description: '사용자 시간대',
              required: false,
              schema: { type: 'string', default: 'Asia/Seoul' }
            }
          ],
          responses: {
            '200': {
              description: '성공',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { $ref: '#/components/schemas/DashboardData' },
                      meta: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          version: { type: 'string' },
                          execution_time_ms: { type: 'number' }
                        }
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: '잘못된 요청',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' }
                }
              }
            },
            '401': { description: '인증 필요' },
            '500': { description: '서버 내부 오류' }
          },
          security: [
            { BearerAuth: [] }
          ]
        }
      }
    },
    components: {
      schemas: {
        DashboardData: {
          type: 'object',
          description: 'Dashboard 메인 데이터 구조',
          required: ['stats', 'notifications', 'recent_projects', 'recent_activities', 'quick_actions', 'meta'],
          properties: {
            stats: {
              type: 'object',
              properties: {
                active_projects: { type: 'integer', minimum: 0 },
                new_feedback: { type: 'integer', minimum: 0 },
                today_schedule: { type: 'integer', minimum: 0 },
                completed_videos: { type: 'integer', minimum: 0 }
              }
            },
            notifications: {
              type: 'object',
              properties: {
                total_count: { type: 'integer', minimum: 0 },
                unread_count: { type: 'integer', minimum: 0 },
                feedback_count: { type: 'integer', minimum: 0 },
                schedule_count: { type: 'integer', minimum: 0 },
                mention_count: { type: 'integer', minimum: 0 }
              }
            }
            // ... 추가 스키마 정의
          }
        },
        Error: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
                trace_id: { type: 'string' }
              }
            }
          }
        }
      },
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  };
}

// =============================================================================
// 테스트 데이터 생성 (Test Data Generation)
// =============================================================================

/**
 * 계약 테스트를 위한 샘플 데이터 생성
 */
export function generateSampleDashboardResponse() {
  const now = new Date();
  
  return {
    success: true,
    data: {
      stats: {
        active_projects: 12,
        new_feedback: 24,
        today_schedule: 5,
        completed_videos: 48
      },
      notifications: {
        total_count: 45,
        unread_count: 12,
        feedback_count: 8,
        schedule_count: 3,
        mention_count: 1
      },
      recent_projects: [],
      recent_activities: [],
      quick_actions: [],
      meta: {
        last_updated: now.toISOString(),
        cache_expires_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
        user_timezone: 'Asia/Seoul'
      }
    },
    meta: {
      timestamp: now.toISOString(),
      version: '1.0.0',
      execution_time_ms: 120
    }
  };
}

// =============================================================================
// 계약 위반 검출기 (Contract Violation Detector)
// =============================================================================

/**
 * 런타임 계약 위반 검출 및 보고
 */
export class DashboardContractViolationDetector {
  private violations: Array<{
    timestamp: string;
    endpoint: string;
    violationType: 'request' | 'response';
    details: string;
  }> = [];
  
  detectRequestViolation(endpoint: string, request: unknown): boolean {
    let hasViolation = false;
    
    if (endpoint === '/api/dashboard/summary') {
      const result = validateDashboardSummaryRequest(request);
      if (!result.success) {
        hasViolation = true;
        this.violations.push({
          timestamp: new Date().toISOString(),
          endpoint,
          violationType: 'request',
          details: `요청 스키마 위반: ${result.error?.message}`
        });
      }
    }
    
    return hasViolation;
  }
  
  detectResponseViolation(endpoint: string, response: unknown): boolean {
    let hasViolation = false;
    
    if (endpoint === '/api/dashboard/summary') {
      const result = validateDashboardSummaryResponse(response);
      if (!result.success) {
        hasViolation = true;
        this.violations.push({
          timestamp: new Date().toISOString(),
          endpoint,
          violationType: 'response',
          details: `응답 스키마 위반: ${result.error?.message}`
        });
      }
    }
    
    return hasViolation;
  }
  
  getViolations() {
    return [...this.violations];
  }
  
  clearViolations() {
    this.violations = [];
  }
  
  generateReport() {
    return {
      totalViolations: this.violations.length,
      violationsByType: {
        request: this.violations.filter(v => v.violationType === 'request').length,
        response: this.violations.filter(v => v.violationType === 'response').length
      },
      violationsByEndpoint: this.violations.reduce((acc, violation) => {
        acc[violation.endpoint] = (acc[violation.endpoint] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recentViolations: this.violations.slice(-10)
    };
  }
}

// 전역 위반 검출기 인스턴스
export const contractViolationDetector = new DashboardContractViolationDetector();