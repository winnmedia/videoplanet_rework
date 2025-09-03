import { z } from 'zod'

/**
 * 데이터 격리 및 소유권 관리 Domain Entity
 * GDPR 준수 및 멀티테넌트 데이터 격리 지원
 */

// 리소스 타입 정의
export enum ResourceType {
  PROJECT = 'project',
  FILE = 'file',
  COMMENT = 'comment',
  FEEDBACK = 'feedback',
  USER_PROFILE = 'user_profile',
  ACTIVITY_LOG = 'activity_log',
  ANALYTICS_DATA = 'analytics_data'
}

// 데이터 액세스 액션 타입
export enum DataAction {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  SHARE = 'share',
  EXPORT = 'export',
  ARCHIVE = 'archive'
}

// 데이터 분류 레벨
export enum DataClassification {
  PUBLIC = 'public',           // 공개 데이터
  INTERNAL = 'internal',       // 조직 내부 데이터
  CONFIDENTIAL = 'confidential', // 기밀 데이터
  RESTRICTED = 'restricted'    // 제한된 데이터 (PII 포함)
}

// 데이터 소유권 정보
export interface DataOwnership {
  resourceId: string
  resourceType: ResourceType
  ownerId: string                    // 소유자 ID
  organizationId?: string           // 조직 ID (멀티테넌트)
  classification: DataClassification
  createdAt: Date
  updatedAt: Date
  
  // 공유 설정
  sharedWith: DataShare[]
  isPublic: boolean
  allowGuestAccess: boolean
  
  // GDPR 관련
  gdprConsent: GdprConsentStatus
  retentionPeriod?: number          // 보존 기간 (일 단위)
  anonymizationDate?: Date          // 익명화 예정일
  
  // 메타데이터
  metadata: OwnershipMetadata
}

// 데이터 공유 정보
export interface DataShare {
  sharedWithUserId: string
  sharedByUserId: string
  permissions: DataAction[]
  sharedAt: Date
  expiresAt?: Date
  restrictions: ShareRestrictions
}

export interface ShareRestrictions {
  ipWhitelist?: string[]
  allowDownload: boolean
  allowReshare: boolean
  watermarkRequired: boolean
  auditTrail: boolean
}

// GDPR 동의 상태
export interface GdprConsentStatus {
  dataProcessing: boolean
  dataSharing: boolean
  marketing: boolean
  analytics: boolean
  consentDate: Date
  withdrawalDate?: Date
  consentVersion: string
}

// 소유권 메타데이터
export interface OwnershipMetadata {
  source: 'user_created' | 'system_generated' | 'imported' | 'shared'
  tags: string[]
  customAttributes: Record<string, unknown>
  encryptionStatus: EncryptionInfo
  backupStatus: BackupInfo
}

export interface EncryptionInfo {
  encrypted: boolean
  algorithm?: string
  keyId?: string
  encryptedAt?: Date
}

export interface BackupInfo {
  backed_up: boolean
  lastBackupAt?: Date
  backupLocation?: string
  backupFrequency?: 'daily' | 'weekly' | 'monthly'
}

// 데이터 접근 로그
export interface DataAccessLog {
  id: string
  resourceId: string
  resourceType: ResourceType
  userId: string
  action: DataAction
  
  // 접근 컨텍스트
  accessContext: AccessContext
  
  // 결과
  success: boolean
  reason?: string
  duration?: number                 // 액세스 지속 시간 (ms)
  
  // 감사 정보
  timestamp: Date
  ip: string
  userAgent: string
  location?: GeoLocation
  
  // 데이터 변경 추적
  dataChanges?: DataChange[]
  
  metadata: AccessLogMetadata
}

export interface AccessContext {
  sessionId: string
  requestId: string
  authMethod: 'password' | 'oauth' | 'sso' | 'api_key'
  mfaVerified: boolean
  riskScore: number                 // 0-100, 높을수록 위험
  deviceInfo: DeviceInfo
}

export interface GeoLocation {
  country: string
  region: string
  city: string
  latitude?: number
  longitude?: number
}

export interface DeviceInfo {
  deviceType: 'desktop' | 'mobile' | 'tablet'
  os: string
  browser: string
  isKnownDevice: boolean
  deviceFingerprint: string
}

export interface DataChange {
  field: string
  oldValue?: unknown
  newValue?: unknown
  changeType: 'created' | 'updated' | 'deleted'
}

export interface AccessLogMetadata {
  severity: 'low' | 'medium' | 'high' | 'critical'
  flags: string[]                   // 예: ['suspicious_location', 'bulk_download']
  complianceChecks: ComplianceCheck[]
}

export interface ComplianceCheck {
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'SOX'
  status: 'compliant' | 'violation' | 'warning'
  details?: string
}

// 데이터 격리 정책
export interface DataIsolationPolicy {
  organizationId: string
  policyName: string
  version: string
  
  // 격리 규칙
  isolationRules: IsolationRule[]
  
  // 접근 제어
  accessRules: AccessRule[]
  
  // 데이터 보존
  retentionRules: RetentionRule[]
  
  // 활성화 정보
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string
}

export interface IsolationRule {
  resourceType: ResourceType
  classification: DataClassification
  isolationLevel: 'strict' | 'moderate' | 'basic'
  
  // 격리 설정
  crossTenantAccess: boolean
  guestAccess: boolean
  publicAccess: boolean
  
  // 암호화 요구사항
  encryptionRequired: boolean
  encryptionInTransit: boolean
  encryptionAtRest: boolean
}

export interface AccessRule {
  resourceType: ResourceType
  requiredRole: string[]
  requiredPermissions: string[]
  
  // 시간 기반 제약
  timeRestrictions?: TimeWindow[]
  
  // 지역 기반 제약
  geoRestrictions?: GeoRestriction[]
  
  // MFA 요구사항
  mfaRequired: boolean
  mfaGracePeriod?: number           // 초 단위
}

export interface TimeWindow {
  startHour: number                 // 0-23
  endHour: number                   // 0-23
  daysOfWeek: number[]              // 0=일요일
  timezone: string
}

export interface GeoRestriction {
  allowedCountries?: string[]
  blockedCountries?: string[]
  allowedRegions?: string[]
  blockedRegions?: string[]
}

export interface RetentionRule {
  resourceType: ResourceType
  retentionPeriod: number           // 일 단위
  archiveAfter: number              // 일 단위
  anonymizeAfter?: number           // 일 단위
  deleteAfter: number               // 일 단위
  
  // 예외 처리
  legalHoldExempt: boolean
  gdprSubjectExempt: boolean
}

// GDPR 데이터 요청
export interface GdprDataRequest {
  id: string
  userId: string
  requestType: GdprRequestType
  status: GdprRequestStatus
  
  // 요청 세부사항
  dataTypes: DataType[]
  reason?: string
  
  // 처리 정보
  requestedAt: Date
  processedAt?: Date
  completedAt?: Date
  processedBy?: string
  
  // 결과
  exportUrl?: string
  deletionReport?: DeletionReport
  
  metadata: GdprRequestMetadata
}

export enum GdprRequestType {
  DATA_EXPORT = 'data_export',      // 데이터 내보내기
  DATA_DELETION = 'data_deletion',  // 삭제 요청
  DATA_RECTIFICATION = 'data_rectification', // 정정 요청
  DATA_PORTABILITY = 'data_portability', // 이전 요청
  CONSENT_WITHDRAWAL = 'consent_withdrawal' // 동의 철회
}

export enum GdprRequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum DataType {
  PROFILE = 'profile',
  PROJECTS = 'projects',
  FILES = 'files',
  COMMENTS = 'comments',
  ACTIVITY_LOGS = 'activity_logs',
  ANALYTICS = 'analytics'
}

export interface DeletionReport {
  totalRecords: number
  deletedRecords: number
  anonymizedRecords: number
  failedDeletions: FailedDeletion[]
  completionPercentage: number
}

export interface FailedDeletion {
  resourceId: string
  resourceType: ResourceType
  reason: string
  canRetry: boolean
}

export interface GdprRequestMetadata {
  ipAddress: string
  userAgent: string
  verificationMethod: string
  legalBasis?: string
  notes?: string
}

// Zod 스키마 정의
export const DataOwnershipSchema = z.object({
  resourceId: z.string().min(1),
  resourceType: z.nativeEnum(ResourceType),
  ownerId: z.string().min(1),
  organizationId: z.string().optional(),
  classification: z.nativeEnum(DataClassification),
  createdAt: z.date(),
  updatedAt: z.date(),
  
  sharedWith: z.array(z.object({
    sharedWithUserId: z.string(),
    sharedByUserId: z.string(),
    permissions: z.array(z.nativeEnum(DataAction)),
    sharedAt: z.date(),
    expiresAt: z.date().optional(),
    restrictions: z.object({
      ipWhitelist: z.array(z.string().ip()).optional(),
      allowDownload: z.boolean(),
      allowReshare: z.boolean(),
      watermarkRequired: z.boolean(),
      auditTrail: z.boolean()
    })
  })),
  
  isPublic: z.boolean(),
  allowGuestAccess: z.boolean(),
  
  gdprConsent: z.object({
    dataProcessing: z.boolean(),
    dataSharing: z.boolean(),
    marketing: z.boolean(),
    analytics: z.boolean(),
    consentDate: z.date(),
    withdrawalDate: z.date().optional(),
    consentVersion: z.string()
  }),
  
  retentionPeriod: z.number().positive().optional(),
  anonymizationDate: z.date().optional(),
  
  metadata: z.object({
    source: z.enum(['user_created', 'system_generated', 'imported', 'shared']),
    tags: z.array(z.string()),
    customAttributes: z.record(z.unknown()),
    encryptionStatus: z.object({
      encrypted: z.boolean(),
      algorithm: z.string().optional(),
      keyId: z.string().optional(),
      encryptedAt: z.date().optional()
    }),
    backupStatus: z.object({
      backed_up: z.boolean(),
      lastBackupAt: z.date().optional(),
      backupLocation: z.string().optional(),
      backupFrequency: z.enum(['daily', 'weekly', 'monthly']).optional()
    })
  })
})

export const DataAccessLogSchema = z.object({
  id: z.string().min(1),
  resourceId: z.string().min(1),
  resourceType: z.nativeEnum(ResourceType),
  userId: z.string().min(1),
  action: z.nativeEnum(DataAction),
  
  accessContext: z.object({
    sessionId: z.string(),
    requestId: z.string(),
    authMethod: z.enum(['password', 'oauth', 'sso', 'api_key']),
    mfaVerified: z.boolean(),
    riskScore: z.number().min(0).max(100),
    deviceInfo: z.object({
      deviceType: z.enum(['desktop', 'mobile', 'tablet']),
      os: z.string(),
      browser: z.string(),
      isKnownDevice: z.boolean(),
      deviceFingerprint: z.string()
    })
  }),
  
  success: z.boolean(),
  reason: z.string().optional(),
  duration: z.number().optional(),
  
  timestamp: z.date(),
  ip: z.string().ip(),
  userAgent: z.string(),
  location: z.object({
    country: z.string(),
    region: z.string(),
    city: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }).optional(),
  
  dataChanges: z.array(z.object({
    field: z.string(),
    oldValue: z.unknown().optional(),
    newValue: z.unknown().optional(),
    changeType: z.enum(['created', 'updated', 'deleted'])
  })).optional(),
  
  metadata: z.object({
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    flags: z.array(z.string()),
    complianceChecks: z.array(z.object({
      regulation: z.enum(['GDPR', 'CCPA', 'HIPAA', 'SOX']),
      status: z.enum(['compliant', 'violation', 'warning']),
      details: z.string().optional()
    }))
  })
})

export const GdprDataRequestSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  requestType: z.nativeEnum(GdprRequestType),
  status: z.nativeEnum(GdprRequestStatus),
  
  dataTypes: z.array(z.nativeEnum(DataType)),
  reason: z.string().optional(),
  
  requestedAt: z.date(),
  processedAt: z.date().optional(),
  completedAt: z.date().optional(),
  processedBy: z.string().optional(),
  
  exportUrl: z.string().url().optional(),
  deletionReport: z.object({
    totalRecords: z.number(),
    deletedRecords: z.number(),
    anonymizedRecords: z.number(),
    failedDeletions: z.array(z.object({
      resourceId: z.string(),
      resourceType: z.nativeEnum(ResourceType),
      reason: z.string(),
      canRetry: z.boolean()
    })),
    completionPercentage: z.number().min(0).max(100)
  }).optional(),
  
  metadata: z.object({
    ipAddress: z.string().ip(),
    userAgent: z.string(),
    verificationMethod: z.string(),
    legalBasis: z.string().optional(),
    notes: z.string().optional()
  })
})

// 검증 함수
export const validateDataOwnership = (ownership: unknown): DataOwnership => {
  return DataOwnershipSchema.parse(ownership)
}

export const validateDataAccessLog = (log: unknown): DataAccessLog => {
  return DataAccessLogSchema.parse(log)
}

export const validateGdprDataRequest = (request: unknown): GdprDataRequest => {
  return GdprDataRequestSchema.parse(request)
}