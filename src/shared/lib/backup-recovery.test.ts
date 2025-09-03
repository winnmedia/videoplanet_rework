// 백업 및 복구 시스템 테스트 - TDD Red Phase
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  AutoBackupSystem,
  IncrementalBackupService,
  DisasterRecoveryService,
  BackupIntegrityValidator,
  PointInTimeRecoveryService
} from './backup-recovery'

describe('AutoBackupSystem', () => {
  let backupSystem: AutoBackupSystem

  beforeEach(() => {
    backupSystem = new AutoBackupSystem({
      storage: {
        provider: 'aws_s3',
        bucket: 'vridge-backups',
        region: 'ap-northeast-2',
        encryptionKey: 'test-key'
      },
      schedule: {
        full: 'weekly', // 주간 전체 백업
        incremental: 'daily', // 일일 증분 백업
        retentionPeriod: 30 // 30일 보존
      },
      compression: {
        enabled: true,
        algorithm: 'gzip',
        level: 6
      }
    })
  })

  it('should perform automated full backup with encryption', async () => {
    const backupScope = {
      entities: ['users', 'projects', 'videos', 'comments'],
      dateRange: {
        from: '2025-01-01T00:00:00Z',
        to: '2025-01-10T23:59:59Z'
      },
      includeMetadata: true,
      encryptSensitiveData: true
    }

    const backupResult = await backupSystem.performFullBackup(backupScope)

    expect(backupResult.success).toBe(true)
    expect(backupResult.backupId).toMatch(/^backup_full_\d{8}_[a-z0-9]+$/)
    expect(backupResult.metadata.type).toBe('full')
    expect(backupResult.metadata.encrypted).toBe(true)
    expect(backupResult.metadata.compressed).toBe(true)
    expect(backupResult.metadata.checksums).toBeDefined()
    
    expect(backupResult.statistics.entitiesBackedUp).toBe(4)
    expect(backupResult.statistics.totalRecords).toBeGreaterThan(0)
    expect(backupResult.statistics.originalSize).toBeGreaterThan(0)
    expect(backupResult.statistics.compressedSize).toBeLessThan(backupResult.statistics.originalSize)
    expect(backupResult.statistics.compressionRatio).toBeGreaterThan(0)
    
    expect(backupResult.verification.integrityChecked).toBe(true)
    expect(backupResult.verification.checksumValid).toBe(true)
  })

  it('should schedule and execute incremental backups', async () => {
    // 이전 백업 이후 변경사항만 백업
    const lastBackupTimestamp = '2025-01-09T00:00:00Z'
    const incrementalScope = {
      entities: ['users', 'projects', 'videos'],
      sinceTimestamp: lastBackupTimestamp,
      changeTypes: ['created', 'updated', 'deleted']
    }

    const incrementalResult = await backupSystem.performIncrementalBackup(incrementalScope)

    expect(incrementalResult.success).toBe(true)
    expect(incrementalResult.backupId).toMatch(/^backup_inc_\d{8}_[a-z0-9]+$/)
    expect(incrementalResult.metadata.type).toBe('incremental')
    expect(incrementalResult.metadata.baseBackupId).toBeDefined() // 기준 백업 참조
    
    expect(incrementalResult.changeLog.created).toBeGreaterThanOrEqual(0)
    expect(incrementalResult.changeLog.updated).toBeGreaterThanOrEqual(0)
    expect(incrementalResult.changeLog.deleted).toBeGreaterThanOrEqual(0)
    
    expect(incrementalResult.statistics.totalRecords).toBeLessThan(1000) // 변경분만
  })

  it('should manage backup retention and cleanup', async () => {
    const existingBackups = [
      {
        backupId: 'backup_full_20241201_001',
        createdAt: '2024-12-01T00:00:00Z',
        type: 'full',
        size: 1024 * 1024 * 100, // 100MB
        retentionExpiry: '2024-12-31T00:00:00Z'
      },
      {
        backupId: 'backup_inc_20241210_001',
        createdAt: '2024-12-10T00:00:00Z',
        type: 'incremental',
        size: 1024 * 1024 * 10, // 10MB
        retentionExpiry: '2025-01-09T00:00:00Z' // 아직 유효
      },
      {
        backupId: 'backup_inc_20241205_001',
        createdAt: '2024-12-05T00:00:00Z',
        type: 'incremental',
        size: 1024 * 1024 * 5, // 5MB
        retentionExpiry: '2025-01-04T00:00:00Z' // 만료됨
      }
    ]

    const cleanupResult = await backupSystem.cleanupExpiredBackups(existingBackups)

    expect(cleanupResult.cleanupSummary.deletedBackups).toBe(2) // 만료된 full, incremental
    expect(cleanupResult.cleanupSummary.storageReclaimed).toBe(1024 * 1024 * 105) // 105MB 회수
    expect(cleanupResult.cleanupSummary.retainedBackups).toBe(1)
    
    expect(cleanupResult.retentionPolicy.appliedCorrectly).toBe(true)
    expect(cleanupResult.auditLog).toHaveLength(2) // 삭제된 백업 기록
  })

  it('should validate backup integrity before storage', async () => {
    const backupData = {
      metadata: {
        backupId: 'backup_test_001',
        createdAt: '2025-01-10T00:00:00Z',
        type: 'full',
        entities: ['users', 'projects']
      },
      data: {
        users: [
          { id: 'usr_001', email: 'user1@test.com' },
          { id: 'usr_002', email: 'user2@test.com' }
        ],
        projects: [
          { id: 'prj_001', name: 'Project 1', ownerId: 'usr_001' }
        ]
      }
    }

    const integrityCheck = await backupSystem.validateBackupIntegrity(backupData)

    expect(integrityCheck.isValid).toBe(true)
    expect(integrityCheck.schemaValidation.passed).toBe(true)
    expect(integrityCheck.dataIntegrity.referentialIntegrityScore).toBeGreaterThan(0.9)
    expect(integrityCheck.dataIntegrity.duplicateRecords).toBe(0)
    
    expect(integrityCheck.checksums.users).toBeDefined()
    expect(integrityCheck.checksums.projects).toBeDefined()
    expect(integrityCheck.encryption.encryptedFields).toContain('email') // 민감 정보 암호화
  })
})

describe('IncrementalBackupService', () => {
  let service: IncrementalBackupService

  beforeEach(() => {
    service = new IncrementalBackupService()
  })

  it('should identify and capture incremental changes efficiently', async () => {
    const lastBackupSnapshot = {
      timestamp: '2025-01-09T00:00:00Z',
      entityChecksums: {
        'usr_001': 'checksum_user1_old',
        'usr_002': 'checksum_user2_old',
        'prj_001': 'checksum_project1_old'
      }
    }

    const currentData = {
      users: [
        { id: 'usr_001', email: 'user1@updated.com', updatedAt: '2025-01-10T10:00:00Z' }, // 수정됨
        { id: 'usr_002', email: 'user2@test.com', updatedAt: '2025-01-08T00:00:00Z' }, // 변경 없음
        { id: 'usr_003', email: 'user3@test.com', createdAt: '2025-01-10T12:00:00Z' } // 신규 생성
      ],
      projects: [
        { id: 'prj_001', name: 'Updated Project 1', updatedAt: '2025-01-10T14:00:00Z' }, // 수정됨
        { id: 'prj_002', name: 'New Project 2', createdAt: '2025-01-10T15:00:00Z' } // 신규 생성
      ]
    }

    const incrementalChanges = await service.identifyChanges(lastBackupSnapshot, currentData)

    expect(incrementalChanges.created).toHaveLength(2) // usr_003, prj_002
    expect(incrementalChanges.updated).toHaveLength(2) // usr_001, prj_001
    expect(incrementalChanges.deleted).toHaveLength(0)
    
    expect(incrementalChanges.created).toContainEqual({
      entityType: 'users',
      entityId: 'usr_003',
      changeType: 'created',
      timestamp: '2025-01-10T12:00:00Z',
      data: expect.any(Object)
    })
    
    expect(incrementalChanges.updated).toContainEqual({
      entityType: 'users',
      entityId: 'usr_001',
      changeType: 'updated',
      timestamp: '2025-01-10T10:00:00Z',
      previousChecksum: 'checksum_user1_old',
      currentChecksum: expect.any(String),
      data: expect.any(Object)
    })
  })

  it('should apply incremental changes in correct order for recovery', async () => {
    const incrementalBackups = [
      {
        backupId: 'backup_inc_001',
        timestamp: '2025-01-09T00:00:00Z',
        changes: [
          { entityType: 'users', entityId: 'usr_001', changeType: 'created', data: { id: 'usr_001', name: 'User 1' } }
        ]
      },
      {
        backupId: 'backup_inc_002',
        timestamp: '2025-01-10T00:00:00Z',
        changes: [
          { entityType: 'users', entityId: 'usr_001', changeType: 'updated', data: { id: 'usr_001', name: 'Updated User 1' } },
          { entityType: 'projects', entityId: 'prj_001', changeType: 'created', data: { id: 'prj_001', name: 'Project 1' } }
        ]
      }
    ]

    const recoveryState = await service.applyIncrementalChanges({}, incrementalBackups)

    expect(recoveryState.success).toBe(true)
    expect(recoveryState.appliedChanges).toBe(3) // 총 3개 변경사항 적용
    expect(recoveryState.finalState.users).toHaveLength(1)
    expect(recoveryState.finalState.users[0].name).toBe('Updated User 1') // 최종 업데이트 반영
    expect(recoveryState.finalState.projects).toHaveLength(1)
    
    expect(recoveryState.changeTimeline).toHaveLength(3) // 변경 이력 추적
    expect(recoveryState.conflictResolutions).toHaveLength(0) // 충돌 없음
  })

  it('should handle backup chain validation', async () => {
    const backupChain = [
      { backupId: 'backup_full_001', type: 'full', timestamp: '2025-01-01T00:00:00Z', baseBackupId: null },
      { backupId: 'backup_inc_002', type: 'incremental', timestamp: '2025-01-02T00:00:00Z', baseBackupId: 'backup_full_001' },
      { backupId: 'backup_inc_003', type: 'incremental', timestamp: '2025-01-03T00:00:00Z', baseBackupId: 'backup_inc_002' },
      { backupId: 'backup_inc_004', type: 'incremental', timestamp: '2025-01-04T00:00:00Z', baseBackupId: 'backup_missing_999' } // 깨진 체인
    ]

    const chainValidation = await service.validateBackupChain(backupChain)

    expect(chainValidation.isValid).toBe(false)
    expect(chainValidation.brokenChains).toHaveLength(1)
    expect(chainValidation.brokenChains[0].backupId).toBe('backup_inc_004')
    expect(chainValidation.brokenChains[0].issue).toBe('missing_base_backup')
    
    expect(chainValidation.validChains).toHaveLength(1) // full + 2 incremental
    expect(chainValidation.validChains[0].length).toBe(3)
    expect(chainValidation.recommendations).toContain('백업 체인 복구 또는 새로운 전체 백업 수행')
  })
})

describe('DisasterRecoveryService', () => {
  let service: DisasterRecoveryService

  beforeEach(() => {
    service = new DisasterRecoveryService({
      rto: 240, // 4시간 목표 복구 시간
      rpo: 60, // 1시간 목표 데이터 손실 시간
      replicationSites: ['primary', 'secondary', 'disaster_recovery'],
      automatedFailover: true
    })
  })

  it('should execute complete disaster recovery scenario', async () => {
    const disasterScenario = {
      type: 'primary_site_failure',
      severity: 'critical',
      affectedSystems: ['database', 'file_storage', 'analytics'],
      estimatedDataLoss: 30, // 30분
      detectedAt: '2025-01-10T15:00:00Z'
    }

    const recoveryPlan = await service.createRecoveryPlan(disasterScenario)

    expect(recoveryPlan.recoverySteps).toHaveLength(6)
    expect(recoveryPlan.estimatedRTO).toBeLessThanOrEqual(240) // 4시간 이내
    expect(recoveryPlan.estimatedRPO).toBeLessThanOrEqual(60) // 1시간 이내
    
    expect(recoveryPlan.recoverySteps[0]).toEqual({
      stepId: 'assess_damage',
      description: '시스템 손상 정도 평가',
      estimatedDuration: 15, // minutes
      dependencies: [],
      automated: true
    })
    
    expect(recoveryPlan.recoverySteps).toContainEqual({
      stepId: 'failover_to_secondary',
      description: '보조 사이트로 페일오버 실행',
      estimatedDuration: 30,
      dependencies: ['assess_damage'],
      automated: true
    })

    // 복구 실행
    const recoveryResult = await service.executeRecovery(recoveryPlan)

    expect(recoveryResult.success).toBe(true)
    expect(recoveryResult.actualRTO).toBeLessThanOrEqual(recoveryPlan.estimatedRTO)
    expect(recoveryResult.actualRPO).toBeLessThanOrEqual(recoveryPlan.estimatedRPO)
    expect(recoveryResult.dataIntegrityScore).toBeGreaterThan(0.95)
    expect(recoveryResult.servicesRecovered).toContain('database')
  })

  it('should perform automated failover with health checks', async () => {
    const healthCheckResults = {
      primary: {
        database: { status: 'down', responseTime: null, lastCheck: '2025-01-10T15:00:00Z' },
        application: { status: 'degraded', responseTime: 5000, lastCheck: '2025-01-10T15:00:00Z' },
        storage: { status: 'down', responseTime: null, lastCheck: '2025-01-10T15:00:00Z' }
      },
      secondary: {
        database: { status: 'healthy', responseTime: 120, lastCheck: '2025-01-10T15:00:00Z' },
        application: { status: 'healthy', responseTime: 150, lastCheck: '2025-01-10T15:00:00Z' },
        storage: { status: 'healthy', responseTime: 80, lastCheck: '2025-01-10T15:00:00Z' }
      }
    }

    const failoverDecision = await service.evaluateFailoverNeed(healthCheckResults)

    expect(failoverDecision.shouldFailover).toBe(true)
    expect(failoverDecision.reason).toContain('primary site critical failures')
    expect(failoverDecision.targetSite).toBe('secondary')
    expect(failoverDecision.estimatedDowntime).toBeLessThan(30) // 30분 이내

    // 자동 페일오버 실행
    const failoverResult = await service.executeAutomatedFailover(failoverDecision)

    expect(failoverResult.success).toBe(true)
    expect(failoverResult.newPrimarySite).toBe('secondary')
    expect(failoverResult.actualDowntime).toBeLessThan(failoverDecision.estimatedDowntime)
    expect(failoverResult.dataConsistencyChecks.passed).toBe(true)
  })

  it('should validate recovery completeness and data integrity', async () => {
    const recoveryData = {
      backupId: 'backup_full_20250109_001',
      recoveredEntities: {
        users: [
          { id: 'usr_001', email: 'user1@test.com', checksum: 'abc123' },
          { id: 'usr_002', email: 'user2@test.com', checksum: 'def456' }
        ],
        projects: [
          { id: 'prj_001', name: 'Project 1', ownerId: 'usr_001', checksum: 'ghi789' }
        ]
      },
      expectedChecksums: {
        'usr_001': 'abc123',
        'usr_002': 'def456',
        'prj_001': 'ghi789'
      },
      replicationLag: 45000 // 45초
    }

    const integrityValidation = await service.validateRecoveryIntegrity(recoveryData)

    expect(integrityValidation.overallIntegrity).toBeGreaterThan(0.95)
    expect(integrityValidation.checksumValidation.passed).toBe(true)
    expect(integrityValidation.checksumValidation.mismatches).toBe(0)
    
    expect(integrityValidation.referentialIntegrity.violations).toHaveLength(0)
    expect(integrityValidation.dataCompleteness.missingRecords).toBe(0)
    
    expect(integrityValidation.recommendations).toContain('복구 완료 - 운영 재개 가능')
    expect(integrityValidation.certifiedAt).toBeDefined()
  })
})

describe('BackupIntegrityValidator', () => {
  let validator: BackupIntegrityValidator

  beforeEach(() => {
    validator = new BackupIntegrityValidator()
  })

  it('should validate backup file integrity with checksums', async () => {
    const backupFiles = [
      {
        filename: 'users_20250110.json.gz',
        expectedChecksum: 'sha256:abc123def456...',
        actualChecksum: 'sha256:abc123def456...',
        size: 1024 * 1024, // 1MB
        encrypted: true
      },
      {
        filename: 'projects_20250110.json.gz',
        expectedChecksum: 'sha256:xyz789uvw012...',
        actualChecksum: 'sha256:DIFFERENT_HASH', // 체크섬 불일치
        size: 512 * 1024, // 512KB
        encrypted: true
      }
    ]

    const integrityReport = await validator.validateFiles(backupFiles)

    expect(integrityReport.overallValid).toBe(false) // 하나라도 실패하면 전체 실패
    expect(integrityReport.fileResults).toHaveLength(2)
    
    expect(integrityReport.fileResults[0].valid).toBe(true)
    expect(integrityReport.fileResults[0].issues).toHaveLength(0)
    
    expect(integrityReport.fileResults[1].valid).toBe(false)
    expect(integrityReport.fileResults[1].issues).toContainEqual({
      type: 'checksum_mismatch',
      severity: 'critical',
      description: '백업 파일 체크섬이 일치하지 않음'
    })
    
    expect(integrityReport.recommendations).toContain('체크섬 불일치 파일 재백업 필요')
  })

  it('should perform deep data validation on restored content', async () => {
    const restoredData = {
      users: [
        { id: 'usr_001', email: 'user1@test.com', createdAt: '2025-01-01T00:00:00Z' },
        { id: 'usr_002', email: 'invalid-email', createdAt: '2025-01-02T00:00:00Z' }, // 유효성 오류
        { id: 'usr_003', email: 'user3@test.com', createdAt: '2025-01-01T00:00:00Z' }
      ],
      projects: [
        { id: 'prj_001', name: 'Project 1', ownerId: 'usr_001' }, // 유효한 참조
        { id: 'prj_002', name: 'Project 2', ownerId: 'usr_999' } // 잘못된 참조
      ]
    }

    const deepValidation = await validator.performDeepValidation(restoredData)

    expect(deepValidation.dataQualityScore).toBeLessThan(1.0) // 오류가 있으므로 완벽하지 않음
    expect(deepValidation.validationResults.schemaViolations).toBe(1) // invalid email
    expect(deepValidation.validationResults.referentialIntegrityViolations).toBe(1) // missing user reference
    expect(deepValidation.validationResults.businessRuleViolations).toBe(0)
    
    expect(deepValidation.recommendations).toContain('데이터 정정 필요 - 자동 복구 시도')
    expect(deepValidation.autoFixSuggestions).toContainEqual({
      entity: 'users',
      entityId: 'usr_002',
      issue: 'invalid_email',
      suggestedFix: 'Remove or correct invalid email format'
    })
  })

  it('should verify backup encryption and security', async () => {
    const encryptedBackup = {
      backupId: 'backup_secure_001',
      encryptionMetadata: {
        algorithm: 'AES-256-GCM',
        keyId: 'key_001',
        iv: '1234567890abcdef',
        authTag: 'fedcba0987654321'
      },
      sensitiveFields: ['email', 'phone', 'address'],
      complianceRequirements: ['GDPR', 'SOC2']
    }

    const securityValidation = await validator.validateEncryption(encryptedBackup)

    expect(securityValidation.encryptionValid).toBe(true)
    expect(securityValidation.algorithmStrength).toBe('strong') // AES-256
    expect(securityValidation.sensitiveDataProtected).toBe(true)
    expect(securityValidation.complianceStatus.GDPR).toBe('compliant')
    expect(securityValidation.complianceStatus.SOC2).toBe('compliant')
    
    expect(securityValidation.securityRecommendations).toEqual([
      '암호화 키 정기 교체 스케줄 확인',
      '백업 파일 접근 로그 모니터링'
    ])
  })
})

describe('PointInTimeRecoveryService', () => {
  let service: PointInTimeRecoveryService

  beforeEach(() => {
    service = new PointInTimeRecoveryService()
  })

  it('should recover data to specific point in time accurately', async () => {
    const targetRecoveryTime = '2025-01-10T14:30:00Z'
    
    const availableBackups = [
      {
        backupId: 'backup_full_20250109',
        type: 'full',
        timestamp: '2025-01-09T00:00:00Z',
        coverage: 'complete'
      },
      {
        backupId: 'backup_inc_20250110_06',
        type: 'incremental',
        timestamp: '2025-01-10T06:00:00Z',
        baseBackupId: 'backup_full_20250109'
      },
      {
        backupId: 'backup_inc_20250110_12',
        type: 'incremental',
        timestamp: '2025-01-10T12:00:00Z',
        baseBackupId: 'backup_inc_20250110_06'
      },
      {
        backupId: 'backup_inc_20250110_18',
        type: 'incremental',
        timestamp: '2025-01-10T18:00:00Z', // 타겟 시간 이후
        baseBackupId: 'backup_inc_20250110_12'
      }
    ]

    const recoveryPlan = await service.createPointInTimeRecoveryPlan(targetRecoveryTime, availableBackups)

    expect(recoveryPlan.requiredBackups).toHaveLength(3) // full + 2 incrementals
    expect(recoveryPlan.requiredBackups[0].backupId).toBe('backup_full_20250109')
    expect(recoveryPlan.requiredBackups[1].backupId).toBe('backup_inc_20250110_06')
    expect(recoveryPlan.requiredBackups[2].backupId).toBe('backup_inc_20250110_12')
    
    expect(recoveryPlan.estimatedRecoveryTime).toBeLessThanOrEqual(240) // RTO 준수
    expect(recoveryPlan.dataLossWindow).toBeLessThanOrEqual(60) // RPO 준수
    expect(recoveryPlan.confidence).toBeGreaterThan(0.9)
    
    // 실제 복구 실행
    const recoveryExecution = await service.executePointInTimeRecovery(recoveryPlan)

    expect(recoveryExecution.success).toBe(true)
    expect(recoveryExecution.recoveredToTimestamp).toBe(targetRecoveryTime)
    expect(recoveryExecution.actualDataLoss).toBeLessThanOrEqual(recoveryPlan.dataLossWindow)
    expect(recoveryExecution.verificationResults.integrityScore).toBeGreaterThan(0.95)
  })

  it('should handle partial recovery scenarios', async () => {
    const partialRecoveryRequest = {
      targetTimestamp: '2025-01-10T16:00:00Z',
      scope: {
        entities: ['projects', 'videos'], // 사용자 데이터는 제외
        projectIds: ['prj_001', 'prj_002'], // 특정 프로젝트만
        includeRelatedData: true // 관련 데이터도 포함
      }
    }

    const partialRecovery = await service.executePartialRecovery(partialRecoveryRequest)

    expect(partialRecovery.success).toBe(true)
    expect(partialRecovery.recoveredEntities).toEqual(['projects', 'videos'])
    expect(partialRecovery.scope.projectsRecovered).toBe(2)
    expect(partialRecovery.scope.relatedVideosRecovered).toBeGreaterThanOrEqual(0)
    
    expect(partialRecovery.dataConsistency.crossEntityReferences).toBe('maintained')
    expect(partialRecovery.dataConsistency.orphanedRecords).toBe(0)
    
    expect(partialRecovery.warnings).toContain('부분 복구로 인한 데이터 불완전성 가능')
  })

  it('should provide recovery progress monitoring', async () => {
    const recoverySession = {
      recoveryId: 'recovery_20250110_001',
      startedAt: '2025-01-10T15:00:00Z',
      estimatedDuration: 180, // 3시간
      totalSteps: 8,
      currentStep: 3
    }

    const progressMonitor = service.createProgressMonitor(recoverySession)

    // 진행률 업데이트 시뮬레이션
    await progressMonitor.updateProgress({
      stepCompleted: 'restore_database',
      completionTime: '2025-01-10T15:45:00Z',
      recordsRestored: 5000,
      issues: []
    })

    const progressStatus = await progressMonitor.getStatus()

    expect(progressStatus.overallProgress).toBeCloseTo(37.5) // 3/8 steps completed
    expect(progressStatus.currentStep.name).toBe('restore_database')
    expect(progressStatus.currentStep.status).toBe('completed')
    expect(progressStatus.estimatedTimeRemaining).toBeLessThan(180) // 남은 시간 감소
    
    expect(progressStatus.metrics.recordsRestored).toBe(5000)
    expect(progressStatus.metrics.recordsPerMinute).toBeGreaterThan(0)
    
    expect(progressStatus.healthCheck.memoryUsage).toBeDefined()
    expect(progressStatus.healthCheck.diskSpace).toBeDefined()
  })

  it('should handle recovery conflicts and data inconsistencies', async () => {
    const conflictScenario = {
      recoveryTimestamp: '2025-01-10T14:00:00Z',
      currentSystemState: {
        users: [
          { id: 'usr_001', email: 'user1@current.com', updatedAt: '2025-01-10T15:00:00Z' } // 복구 시점 이후 변경
        ]
      },
      backupData: {
        users: [
          { id: 'usr_001', email: 'user1@backup.com', updatedAt: '2025-01-10T13:00:00Z' } // 복구 시점 이전 상태
        ]
      }
    }

    const conflictResolution = await service.resolveRecoveryConflicts(conflictScenario)

    expect(conflictResolution.conflictsDetected).toBe(1)
    expect(conflictResolution.resolutionStrategy).toBe('preserve_newer_data')
    expect(conflictResolution.resolvedConflicts[0]).toEqual({
      entityType: 'users',
      entityId: 'usr_001',
      conflictField: 'email',
      currentValue: 'user1@current.com',
      backupValue: 'user1@backup.com',
      resolution: 'keep_current',
      reason: '현재 데이터가 복구 시점 이후에 업데이트됨'
    })
    
    expect(conflictResolution.dataLoss.estimatedRecords).toBe(0) // 데이터 보존
    expect(conflictResolution.recommendations).toContain('복구 후 데이터 일관성 검증')
  })
})