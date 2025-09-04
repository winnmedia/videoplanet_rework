/**
 * 모니터링 시스템 데이터 스키마 정의
 * Zod를 사용한 런타임 스키마 검증 및 타입 안전성 보장
 */

import { z } from 'zod'

// 비즈니스 메트릭 스키마
export const BusinessMetricSchema = z.object({
  metricName: z.string().min(1),
  value: z.number(),
  unit: z.string(),
  timestamp: z.string().datetime(),
  dimensions: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  source: z.string(),
  businessSlice: z.enum(['video_production', 'feedback_collection', 'project_management', 'user_engagement'])
})

// 사용자 여정 추적 스키마
export const UserJourneyEventSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string(),
  eventType: z.enum(['page_view', 'click', 'form_submit', 'api_call', 'error', 'conversion']),
  eventName: z.string(),
  page: z.string(),
  timestamp: z.string().datetime(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])),
  duration: z.number().optional(),
  success: z.boolean(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
  userAgent: z.string().optional(),
  referrer: z.string().optional(),
  deviceType: z.enum(['desktop', 'mobile', 'tablet']).optional()
})

// 핵심 사용자 여정 단계 스키마
export const CriticalUserJourneySchema = z.object({
  journeyId: z.string(),
  journeyType: z.enum(['onboarding', 'project_creation', 'video_upload', 'feedback_submission', 'collaboration']),
  userId: z.string().optional(),
  sessionId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  currentStep: z.string(),
  totalSteps: z.number(),
  completed: z.boolean(),
  abandonedAt: z.string().optional(),
  errorEncountered: z.boolean(),
  conversionValue: z.number().optional(),
  metadata: z.record(z.any()).optional()
})

// API 성능 메트릭 스키마 (기존 확장)
export const ApiPerformanceMetricSchema = z.object({
  endpoint: z.string(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  statusCode: z.number(),
  responseTime: z.number(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
  userId: z.string().optional(),
  success: z.boolean(),
  errorType: z.string().optional(),
  retryAttempts: z.number().optional(),
  cacheHit: z.boolean().optional(),
  dataSize: z.number().optional(),
  businessContext: z.object({
    feature: z.string(),
    businessSlice: z.string(),
    criticalPath: z.boolean()
  }).optional()
})

// 서브메뉴 사용성 메트릭 스키마
export const SubMenuUsabilitySchema = z.object({
  menuId: z.string(),
  menuType: z.string(),
  action: z.enum(['open', 'close', 'navigate', 'keyboard_navigate', 'hover', 'error']),
  userId: z.string().optional(),
  sessionId: z.string(),
  timestamp: z.string().datetime(),
  interactionTime: z.number(), // 밀리초
  keyboardUsed: z.boolean(),
  touchDevice: z.boolean(),
  success: z.boolean(),
  errorDetails: z.string().optional(),
  parentMenu: z.string().optional(),
  targetElement: z.string().optional(),
  viewport: z.object({
    width: z.number(),
    height: z.number()
  }).optional()
})

// Core Web Vitals 스키마
export const WebVitalsSchema = z.object({
  page: z.string(),
  userId: z.string().optional(),
  sessionId: z.string(),
  timestamp: z.string().datetime(),
  metrics: z.object({
    lcp: z.number().optional(), // Largest Contentful Paint
    fid: z.number().optional(), // First Input Delay  
    inp: z.number().optional(), // Interaction to Next Paint (FID 대체)
    cls: z.number().optional(), // Cumulative Layout Shift
    ttfb: z.number().optional(), // Time to First Byte
    fcp: z.number().optional()  // First Contentful Paint
  }),
  deviceInfo: z.object({
    connection: z.string().optional(),
    deviceMemory: z.number().optional(),
    hardwareConcurrency: z.number().optional()
  }).optional(),
  navigationTiming: z.object({
    domContentLoaded: z.number(),
    loadComplete: z.number(),
    firstPaint: z.number().optional()
  }).optional()
})

// 알림 설정 스키마
export const AlertConfigSchema = z.object({
  alertId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metricType: z.enum(['error_rate', 'response_time', 'conversion_rate', 'user_journey_completion', 'api_availability']),
  condition: z.object({
    operator: z.enum(['>', '<', '>=', '<=', '==', '!=']),
    threshold: z.number(),
    timeWindow: z.number(), // 분 단위
    aggregation: z.enum(['avg', 'sum', 'count', 'max', 'min', 'p95', 'p99'])
  }),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  channels: z.array(z.enum(['email', 'slack', 'webhook', 'dashboard'])),
  enabled: z.boolean(),
  businessSlice: z.string().optional(),
  suppressionRules: z.object({
    cooldownMinutes: z.number(),
    maxAlertsPerHour: z.number()
  }).optional()
})

// 데이터 품질 검증 스키마
export const DataQualityMetricSchema = z.object({
  dataSource: z.string(),
  timestamp: z.string().datetime(),
  qualityChecks: z.object({
    completeness: z.number().min(0).max(1), // 0-1 비율
    accuracy: z.number().min(0).max(1),
    consistency: z.number().min(0).max(1),
    timeliness: z.number().min(0).max(1),
    validity: z.number().min(0).max(1)
  }),
  recordCount: z.number(),
  errorCount: z.number(),
  warningCount: z.number(),
  businessImpact: z.enum(['none', 'low', 'medium', 'high', 'critical']),
  slaCompliance: z.boolean(),
  anomaliesDetected: z.array(z.object({
    type: z.string(),
    description: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical'])
  }))
})

// SLO (Service Level Objective) 모니터링 스키마
export const SLOMetricSchema = z.object({
  sloId: z.string(),
  serviceName: z.string(),
  timestamp: z.string().datetime(),
  sliValue: z.number(), // Service Level Indicator 실제 값
  sloTarget: z.number(), // Service Level Objective 목표 값
  timeWindow: z.enum(['1h', '24h', '7d', '30d']),
  businessSlice: z.string(),
  compliance: z.number().min(0).max(1), // 준수율 0-1
  errorBudgetRemaining: z.number().min(0).max(1), // 남은 에러 버짓 0-1
  alertsTriggered: z.boolean(),
  impactedUsers: z.number().optional(),
  metadata: z.record(z.any()).optional()
})

// 집계된 메트릭 스키마 (대시보드용)
export const AggregatedMetricSchema = z.object({
  metricType: z.string(),
  aggregation: z.enum(['avg', 'sum', 'count', 'max', 'min', 'p95', 'p99']),
  timeGranularity: z.enum(['1m', '5m', '15m', '1h', '1d']),
  timestamp: z.string().datetime(),
  value: z.number(),
  previousValue: z.number().optional(),
  changePercent: z.number().optional(),
  dimensions: z.record(z.string()),
  businessSlice: z.string(),
  confidence: z.number().min(0).max(1).optional() // 데이터 신뢰도
})

// 타입 추론
export type BusinessMetric = z.infer<typeof BusinessMetricSchema>
export type UserJourneyEvent = z.infer<typeof UserJourneyEventSchema>
export type CriticalUserJourney = z.infer<typeof CriticalUserJourneySchema>
export type ApiPerformanceMetric = z.infer<typeof ApiPerformanceMetricSchema>
export type SubMenuUsability = z.infer<typeof SubMenuUsabilitySchema>
export type WebVitals = z.infer<typeof WebVitalsSchema>
export type AlertConfig = z.infer<typeof AlertConfigSchema>
export type DataQualityMetric = z.infer<typeof DataQualityMetricSchema>
export type SLOMetric = z.infer<typeof SLOMetricSchema>
export type AggregatedMetric = z.infer<typeof AggregatedMetricSchema>

// 스키마 유효성 검증 헬퍼 함수들
export class MonitoringSchemaValidator {
  static validateBusinessMetric(data: unknown): BusinessMetric {
    return BusinessMetricSchema.parse(data)
  }

  static validateUserJourneyEvent(data: unknown): UserJourneyEvent {
    return UserJourneyEventSchema.parse(data)
  }

  static validateApiPerformanceMetric(data: unknown): ApiPerformanceMetric {
    return ApiPerformanceMetricSchema.parse(data)
  }

  static validateWebVitals(data: unknown): WebVitals {
    return WebVitalsSchema.parse(data)
  }

  static validateAlertConfig(data: unknown): AlertConfig {
    return AlertConfigSchema.parse(data)
  }

  static validateDataQuality(data: unknown): DataQualityMetric {
    return DataQualityMetricSchema.parse(data)
  }

  static validateSLOMetric(data: unknown): SLOMetric {
    return SLOMetricSchema.parse(data)
  }

  // 배치 검증
  static validateBatch<T>(
    data: unknown[],
    schema: z.ZodSchema<T>
  ): { valid: T[]; invalid: { data: unknown; error: z.ZodError }[] } {
    const valid: T[] = []
    const invalid: { data: unknown; error: z.ZodError }[] = []

    data.forEach(item => {
      try {
        valid.push(schema.parse(item))
      } catch (error) {
        if (error instanceof z.ZodError) {
          invalid.push({ data: item, error })
        }
      }
    })

    return { valid, invalid }
  }
}

// 스키마 버전 관리
export const MONITORING_SCHEMA_VERSION = '1.0.0'

// 스키마 마이그레이션 지원
export interface SchemaVersion {
  version: string
  schemas: Record<string, z.ZodSchema>
  migrations?: Record<string, (data: any) => any>
}

export const CURRENT_SCHEMA_VERSION: SchemaVersion = {
  version: MONITORING_SCHEMA_VERSION,
  schemas: {
    BusinessMetric: BusinessMetricSchema,
    UserJourneyEvent: UserJourneyEventSchema,
    CriticalUserJourney: CriticalUserJourneySchema,
    ApiPerformanceMetric: ApiPerformanceMetricSchema,
    SubMenuUsability: SubMenuUsabilitySchema,
    WebVitals: WebVitalsSchema,
    AlertConfig: AlertConfigSchema,
    DataQualityMetric: DataQualityMetricSchema,
    SLOMetric: SLOMetricSchema,
    AggregatedMetric: AggregatedMetricSchema
  }
}