// User Domain Entity Types with RBAC Support
export interface User {
  id: string
  email: string
  username: string
  displayName?: string
  avatar?: string
  role: UserRole
  profile: UserProfile
  permissions: SystemPermissions
  securityContext: SecurityContext
  dataOwnership: DataOwnershipInfo
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  lastLoginAt?: Date
  failedLoginAttempts: number
  accountLockedUntil?: Date
}

export interface UserProfile {
  bio?: string
  location?: string
  website?: string
  skills: string[]
  preferences: UserPreferences
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  notifications: NotificationSettings
  videoSettings: VideoSettings
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  feedbackReceived: boolean
  projectUpdates: boolean
  systemMessages: boolean
}

export interface VideoSettings {
  autoplay: boolean
  quality: 'auto' | 'high' | 'medium' | 'low'
  volume: number
  playbackSpeed: number
}

export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',  // 시스템 전체 관리자
  ACCOUNT_MANAGER = 'account_manager',  // 계정 관리자 
  CONTENT_CREATOR = 'content_creator',  // 콘텐츠 제작자
  REVIEWER = 'reviewer',  // 검토자
  VIEWER = 'viewer'  // 조회자
}

// User Actions/Commands
export interface CreateUserCommand {
  email: string
  username: string
  password: string
  displayName?: string
  role?: UserRole
}

export interface UpdateUserCommand {
  id: string
  displayName?: string
  avatar?: string
  profile?: Partial<UserProfile>
}

export interface UpdateUserPreferencesCommand {
  userId: string
  preferences: Partial<UserPreferences>
}

// Domain Events
export interface UserCreatedEvent {
  type: 'USER_CREATED'
  payload: User
  timestamp: Date
}

export interface UserUpdatedEvent {
  type: 'USER_UPDATED'
  payload: { userId: string; changes: Partial<User> }
  timestamp: Date
}

export interface UserDeletedEvent {
  type: 'USER_DELETED'
  payload: { userId: string }
  timestamp: Date
}

// Security Context for Data Isolation
export interface SecurityContext {
  tenantId?: string  // 멀티테넌트 지원
  organizationId?: string
  accessLevel: AccessLevel
  allowedResources: string[]  // 접근 가능한 리소스 ID 목록
  restrictions: SecurityRestrictions
}

export interface SecurityRestrictions {
  ipWhitelist?: string[]
  timeBasedAccess?: TimeBasedAccess
  mfaRequired: boolean
  dataExportAllowed: boolean
}

export interface TimeBasedAccess {
  allowedHours: { start: number; end: number }[]  // 24시간 형식
  timezone: string
  weekdaysOnly: boolean
}

export enum AccessLevel {
  FULL = 'full',           // 모든 데이터 접근
  ORGANIZATION = 'organization',  // 조직 내 데이터만
  PROJECT = 'project',     // 소속 프로젝트만
  PERSONAL = 'personal'    // 개인 데이터만
}

// System-level Permissions
export interface SystemPermissions {
  canCreateProjects: boolean
  canDeleteProjects: boolean
  canManageUsers: boolean
  canAccessAnalytics: boolean
  canExportData: boolean
  canManageSystem: boolean
  maxProjectsCount?: number
  maxStorageQuota?: number  // bytes
}

// Data Ownership Information
export interface DataOwnershipInfo {
  ownedProjects: string[]  // 소유한 프로젝트 ID
  sharedProjects: string[]  // 공유받은 프로젝트 ID
  dataQuota: DataQuota
  gdprConsent: GdprConsent
}

export interface DataQuota {
  used: number  // bytes
  limit: number  // bytes
  lastCalculated: Date
}

export interface GdprConsent {
  dataProcessing: boolean
  marketing: boolean
  analytics: boolean
  consentDate: Date
  withdrawalDate?: Date
}

export type UserDomainEvent = UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent | UserSecurityEvent

// Security Events
export interface UserSecurityEvent {
  type: 'USER_SECURITY_EVENT'
  payload: {
    userId: string
    eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PERMISSION_DENIED' | 'DATA_ACCESS' | 'DATA_EXPORT'
    ip: string
    userAgent: string
    resource?: string
    details?: Record<string, unknown>
  }
  timestamp: Date
}