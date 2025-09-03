// 통합 데이터 관리 시스템 테스트 스위트 - 시스템 전체 검증
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import {
  IntegratedDataManagementSystem,
  SystemHealthMonitor,
  CrossSystemValidator,
  DataFlowOrchestrator
} from './data-system-integration'

describe('IntegratedDataManagementSystem', () => {
  let dataSystem: IntegratedDataManagementSystem
  let mockServices: any

  beforeEach(() => {
    // Mock all services
    mockServices = {
      qualityEngine: {
        assessQuality: jest.fn().mockResolvedValue({
          overallScore: 0.92,
          violations: [],
          recommendations: []
        })
      },
      pipelineEngine: {
        execute: jest.fn().mockResolvedValue({
          success: true,
          executionReport: { overallStatus: 'completed' }
        })
      },
      backupSystem: {
        performFullBackup: jest.fn().mockResolvedValue({
          success: true,
          backupId: 'backup_test_001'
        })
      },
      analyticsCollector: {
        collectEvents: jest.fn().mockResolvedValue({
          success: true,
          eventsProcessed: 100
        })
      }
    }

    dataSystem = new IntegratedDataManagementSystem({
      services: mockServices,
      config: {
        gdprCompliant: true,
        realTimeProcessing: true,
        autoBackup: true,
        qualityThreshold: 0.9
      }
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should orchestrate complete data processing workflow', async () => {
    const inputData = {
      users: [
        { id: 'usr_001', email: 'user1@test.com', createdAt: '2025-01-10T00:00:00Z' },
        { id: 'usr_002', email: 'user2@test.com', createdAt: '2025-01-10T01:00:00Z' }
      ],
      projects: [
        { id: 'prj_001', name: 'Test Project', ownerId: 'usr_001' }
      ]
    }

    const workflowResult = await dataSystem.processDataWorkflow(inputData, {
      validateQuality: true,
      processAnalytics: true,
      performBackup: true,
      generateReports: true
    })

    expect(workflowResult.success).toBe(true)
    expect(workflowResult.stagesCompleted).toBe(4)
    expect(workflowResult.qualityScore).toBeGreaterThan(0.9)
    expect(workflowResult.backupCreated).toBeTruthy()
    
    // 각 서비스가 올바른 순서로 호출되었는지 확인
    expect(mockServices.qualityEngine.assessQuality).toHaveBeenCalledBefore(mockServices.pipelineEngine.execute)
    expect(mockServices.analyticsCollector.collectEvents).toHaveBeenCalledAfter(mockServices.qualityEngine.assessQuality)
    expect(mockServices.backupSystem.performFullBackup).toHaveBeenCalledLast()
  })

  it('should handle partial system failures gracefully', async () => {
    // 백업 시스템 실패 시뮬레이션
    mockServices.backupSystem.performFullBackup.mockRejectedValue(new Error('Backup storage unavailable'))
    
    const inputData = {
      users: [{ id: 'usr_001', email: 'user1@test.com' }]
    }

    const workflowResult = await dataSystem.processDataWorkflow(inputData, {
      validateQuality: true,
      processAnalytics: true,
      performBackup: true,
      failureStrategy: 'continue_on_failure'
    })

    expect(workflowResult.success).toBe(true) // 전체 워크플로우는 성공
    expect(workflowResult.partialFailures).toHaveLength(1)
    expect(workflowResult.partialFailures[0].stage).toBe('backup')
    expect(workflowResult.partialFailures[0].error).toContain('Backup storage unavailable')
    expect(workflowResult.backupCreated).toBeFalsy()
    
    // 다른 단계는 성공적으로 완료
    expect(workflowResult.qualityScore).toBeGreaterThan(0.9)
    expect(workflowResult.analyticsProcessed).toBeTruthy()
  })

  it('should maintain data consistency across all components', async () => {
    const userData = {
      users: [
        { id: 'usr_001', email: 'user1@test.com', version: 1 },
        { id: 'usr_002', email: 'user2@test.com', version: 1 }
      ],
      projects: [
        { id: 'prj_001', name: 'Project 1', ownerId: 'usr_001', version: 1 }
      ]
    }

    // 데이터 일관성 검증 활성화
    const consistencyResult = await dataSystem.validateDataConsistency(userData, {
      checkReferentialIntegrity: true,
      validateVersions: true,
      crossValidateChecksums: true
    })

    expect(consistencyResult.overallConsistency).toBeGreaterThan(0.95)
    expect(consistencyResult.referentialIntegrityScore).toBe(1.0)
    expect(consistencyResult.versionConsistency).toBe(true)
    expect(consistencyResult.inconsistencies).toHaveLength(0)
    
    // 모든 컴포넌트 간 데이터 해시 일치 확인
    expect(consistencyResult.componentHashes.qualityEngine).toBeDefined()
    expect(consistencyResult.componentHashes.analyticsCollector).toBeDefined()
    expect(consistencyResult.componentHashes.backupSystem).toBeDefined()
    expect(consistencyResult.hashesMatch).toBe(true)
  })

  it('should support real-time data processing with event streaming', async () => {
    const eventStream = [
      {
        eventId: 'evt_001',
        type: 'user_created',
        timestamp: '2025-01-10T10:00:00Z',
        data: { id: 'usr_003', email: 'user3@test.com' }
      },
      {
        eventId: 'evt_002',
        type: 'project_updated',
        timestamp: '2025-01-10T10:01:00Z',
        data: { id: 'prj_001', name: 'Updated Project' }
      },
      {
        eventId: 'evt_003',
        type: 'video_uploaded',
        timestamp: '2025-01-10T10:02:00Z',
        data: { id: 'vid_001', projectId: 'prj_001', size: 104857600 }
      }
    ]

    const streamProcessor = await dataSystem.createEventStreamProcessor({
      batchSize: 2,
      processingInterval: 1000, // 1초
      enableRealTimeAnalytics: true,
      qualityCheckFrequency: 'every_batch'
    })

    const processingResults = []
    
    // 이벤트 스트림 처리
    for (let i = 0; i < eventStream.length; i += 2) {
      const batch = eventStream.slice(i, i + 2)
      const result = await streamProcessor.processBatch(batch)
      processingResults.push(result)
    }

    expect(processingResults).toHaveLength(2) // 3개 이벤트 → 2개 배치
    expect(processingResults[0].eventsProcessed).toBe(2)
    expect(processingResults[1].eventsProcessed).toBe(1)
    
    // 실시간 품질 메트릭 확인
    expect(processingResults[0].qualityMetrics.processingLatency).toBeLessThan(100) // 100ms 이내
    expect(processingResults[0].qualityMetrics.dataValidationScore).toBeGreaterThan(0.95)
    
    // 분석 데이터가 실시간으로 수집되었는지 확인
    expect(mockServices.analyticsCollector.collectEvents).toHaveBeenCalledTimes(2)
  })

  it('should provide comprehensive system monitoring and alerting', async () => {
    const monitoringConfig = {
      healthCheckInterval: 30, // 30초
      alertThresholds: {
        qualityScore: 0.8,
        processingLatency: 5000, // 5초
        errorRate: 0.05, // 5%
        systemLoad: 0.8 // 80%
      }
    }

    const systemMonitor = await dataSystem.createSystemMonitor(monitoringConfig)
    
    // 시스템 상태 시뮬레이션
    const systemStatus = {
      services: {
        qualityEngine: { status: 'healthy', responseTime: 120, errorRate: 0.01 },
        pipelineEngine: { status: 'healthy', responseTime: 450, errorRate: 0.02 },
        backupSystem: { status: 'degraded', responseTime: 8000, errorRate: 0.08 }, // 임계치 초과
        analyticsCollector: { status: 'healthy', responseTime: 80, errorRate: 0.001 }
      },
      resources: {
        cpu: 0.65,
        memory: 0.75,
        storage: 0.85, // 임계치 초과
        network: 0.4
      },
      dataQuality: {
        overallScore: 0.88,
        recentErrors: 12,
        processingLatency: 3200
      }
    }

    const monitoringResult = await systemMonitor.assessSystemHealth(systemStatus)

    expect(monitoringResult.overallHealth).toBe('degraded')
    expect(monitoringResult.criticalAlerts).toHaveLength(2) // backup system, storage
    expect(monitoringResult.warningAlerts).toHaveLength(1) // quality score
    
    expect(monitoringResult.criticalAlerts).toContainEqual({
      component: 'backupSystem',
      metric: 'responseTime',
      current: 8000,
      threshold: 5000,
      severity: 'critical',
      action: 'immediate_attention_required'
    })
    
    expect(monitoringResult.recommendations).toContain('백업 시스템 성능 점검 필요')
    expect(monitoringResult.recommendations).toContain('스토리지 용량 증설 검토')
  })
})

describe('CrossSystemValidator', () => {
  let validator: CrossSystemValidator

  beforeEach(() => {
    validator = new CrossSystemValidator()
  })

  it('should validate data contracts across all system components', async () => {
    const systemData = {
      qualityEngine: {
        users: [
          { id: 'usr_001', email: 'user1@test.com', quality_score: 0.95 }
        ]
      },
      analyticsCollector: {
        events: [
          {
            userId: 'usr_001',
            type: 'user_login',
            timestamp: '2025-01-10T10:00:00Z',
            anonymized: false
          }
        ]
      },
      backupSystem: {
        backups: [
          {
            backupId: 'backup_001',
            entities: ['users'],
            createdAt: '2025-01-10T09:00:00Z',
            verified: true
          }
        ]
      }
    }

    const contractValidation = await validator.validateCrossSystemContracts(systemData)

    expect(contractValidation.overallValid).toBe(true)
    expect(contractValidation.componentResults).toHaveProperty('qualityEngine')
    expect(contractValidation.componentResults).toHaveProperty('analyticsCollector')
    expect(contractValidation.componentResults).toHaveProperty('backupSystem')
    
    expect(contractValidation.componentResults.qualityEngine.schemaCompliant).toBe(true)
    expect(contractValidation.componentResults.analyticsCollector.privacyCompliant).toBe(true)
    expect(contractValidation.componentResults.backupSystem.integrityVerified).toBe(true)
    
    expect(contractValidation.crossReferenceValidation.brokenReferences).toHaveLength(0)
    expect(contractValidation.crossReferenceValidation.dataConsistencyScore).toBeGreaterThan(0.95)
  })

  it('should detect and report data inconsistencies between systems', async () => {
    const inconsistentData = {
      qualityEngine: {
        users: [
          { id: 'usr_001', email: 'user1@test.com', lastModified: '2025-01-10T10:00:00Z' }
        ]
      },
      analyticsCollector: {
        events: [
          {
            userId: 'usr_002', // 존재하지 않는 사용자 참조
            type: 'user_action',
            timestamp: '2025-01-10T10:00:00Z'
          }
        ]
      },
      backupSystem: {
        backups: [
          {
            backupId: 'backup_001',
            dataChecksum: 'checksum_old', // 현재 데이터와 일치하지 않음
            lastVerified: '2025-01-09T00:00:00Z'
          }
        ]
      }
    }

    const inconsistencyReport = await validator.detectInconsistencies(inconsistentData)

    expect(inconsistencyReport.inconsistenciesFound).toBe(2)
    expect(inconsistencyReport.issues).toContainEqual({
      type: 'missing_reference',
      description: '분석 이벤트가 존재하지 않는 사용자(usr_002) 참조',
      severity: 'high',
      affectedSystems: ['analyticsCollector', 'qualityEngine']
    })
    
    expect(inconsistencyReport.issues).toContainEqual({
      type: 'stale_backup',
      description: '백업 체크섬이 현재 데이터와 일치하지 않음',
      severity: 'medium',
      affectedSystems: ['backupSystem', 'qualityEngine']
    })
    
    expect(inconsistencyReport.resolutionSuggestions).toContain('분석 이벤트 정리 또는 누락된 사용자 데이터 복구')
    expect(inconsistencyReport.resolutionSuggestions).toContain('백업 무결성 재검증 필요')
  })

  it('should verify GDPR compliance across all components', async () => {
    const gdprTestData = {
      users: [
        {
          id: 'usr_001',
          email: 'user1@example.com', // PII
          gdprConsent: {
            consentGiven: true,
            consentDate: '2025-01-01T00:00:00Z',
            dataProcessingPurposes: ['service_provision', 'analytics']
          }
        }
      ],
      analytics: [
        {
          userId: 'usr_001', // 개인식별정보 포함
          sessionData: {
            ipAddress: '192.168.1.100', // PII - 제거되어야 함
            userAgent: 'Mozilla/5.0...' // PII - 제거되어야 함
          },
          anonymized: false // 익명화되지 않음
        }
      ],
      backups: [
        {
          backupId: 'backup_001',
          containsPII: true,
          encrypted: true, // 암호화됨 - 양호
          gdprCompliant: true
        }
      ]
    }

    const gdprCompliance = await validator.validateGDPRCompliance(gdprTestData)

    expect(gdprCompliance.overallCompliant).toBe(false) // 분석 데이터에 PII 존재
    expect(gdprCompliance.violations).toContainEqual({
      component: 'analytics',
      violation: 'pii_in_analytics',
      description: '개인식별정보가 분석 데이터에 포함됨',
      fields: ['ipAddress', 'userAgent']
    })
    
    expect(gdprCompliance.compliantComponents).toContain('backups') // 백업은 준수
    expect(gdprCompliance.remediationActions).toContain('분석 데이터 익명화 처리')
    expect(gdprCompliance.dataSubjectRights.deletionSupported).toBe(true)
    expect(gdprCompliance.dataSubjectRights.portabilitySupported).toBe(true)
  })
})

describe('DataFlowOrchestrator', () => {
  let orchestrator: DataFlowOrchestrator

  beforeEach(() => {
    orchestrator = new DataFlowOrchestrator({
      maxConcurrentFlows: 5,
      errorHandlingStrategy: 'retry_with_backoff',
      monitoringEnabled: true
    })
  })

  it('should orchestrate complex data flows with dependencies', async () => {
    const dataFlowDefinition = {
      flowId: 'user_onboarding_flow',
      steps: [
        {
          stepId: 'validate_user_data',
          service: 'qualityEngine',
          operation: 'validateUserData',
          dependencies: [],
          timeout: 30000
        },
        {
          stepId: 'create_user_profile',
          service: 'userService',
          operation: 'createProfile',
          dependencies: ['validate_user_data'],
          timeout: 15000
        },
        {
          stepId: 'setup_analytics_tracking',
          service: 'analyticsCollector',
          operation: 'initializeTracking',
          dependencies: ['create_user_profile'],
          timeout: 10000
        },
        {
          stepId: 'backup_user_data',
          service: 'backupSystem',
          operation: 'backupUserData',
          dependencies: ['create_user_profile'],
          timeout: 60000
        }
      ],
      inputData: {
        userId: 'usr_new_001',
        email: 'newuser@example.com',
        profile: { name: 'New User' }
      }
    }

    const executionResult = await orchestrator.executeDataFlow(dataFlowDefinition)

    expect(executionResult.success).toBe(true)
    expect(executionResult.completedSteps).toBe(4)
    expect(executionResult.failedSteps).toBe(0)
    
    // 의존성 순서 확인
    const executionOrder = executionResult.stepResults.map(r => r.stepId)
    expect(executionOrder.indexOf('validate_user_data')).toBeLessThan(executionOrder.indexOf('create_user_profile'))
    expect(executionOrder.indexOf('create_user_profile')).toBeLessThan(executionOrder.indexOf('setup_analytics_tracking'))
    expect(executionOrder.indexOf('create_user_profile')).toBeLessThan(executionOrder.indexOf('backup_user_data'))
    
    // 병렬 실행 확인 (analytics와 backup은 동시 실행 가능)
    const analyticsStep = executionResult.stepResults.find(r => r.stepId === 'setup_analytics_tracking')!
    const backupStep = executionResult.stepResults.find(r => r.stepId === 'backup_user_data')!
    const timeDifference = Math.abs(new Date(analyticsStep.completedAt).getTime() - new Date(backupStep.completedAt).getTime())
    expect(timeDifference).toBeLessThan(5000) // 5초 이내 차이 (병렬 실행)
  })

  it('should handle data flow failures with retry and compensation', async () => {
    const unstableFlowDefinition = {
      flowId: 'unstable_flow',
      steps: [
        {
          stepId: 'stable_step',
          service: 'qualityEngine',
          operation: 'validateData',
          dependencies: [],
          retryConfig: { maxRetries: 0 }
        },
        {
          stepId: 'failing_step',
          service: 'unreliableService',
          operation: 'processData',
          dependencies: ['stable_step'],
          retryConfig: { maxRetries: 3, backoffMultiplier: 2 }
        },
        {
          stepId: 'compensation_step',
          service: 'cleanupService',
          operation: 'cleanup',
          dependencies: ['failing_step'],
          isCompensation: true
        }
      ],
      compensationStrategy: 'rollback_on_failure'
    }

    // 실패하는 서비스 시뮬레이션
    const mockFailingService = {
      processData: jest.fn()
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockResolvedValueOnce({ success: true, data: 'processed' })
    }

    orchestrator.registerService('unreliableService', mockFailingService)

    const executionResult = await orchestrator.executeDataFlow(unstableFlowDefinition)

    expect(executionResult.success).toBe(true) // 최종적으로 성공
    expect(executionResult.retriesPerformed).toBe(2) // 2번 재시도 후 성공
    expect(executionResult.stepResults.find(r => r.stepId === 'failing_step')?.attempts).toBe(3)
    expect(mockFailingService.processData).toHaveBeenCalledTimes(3)
    
    // 보상 트랜잭션은 실행되지 않아야 함 (최종 성공)
    expect(executionResult.stepResults.find(r => r.stepId === 'compensation_step')).toBeUndefined()
  })

  it('should provide real-time monitoring and metrics for data flows', async () => {
    const monitoredFlow = {
      flowId: 'monitored_flow',
      steps: [
        { stepId: 'step_1', service: 'service_a', operation: 'process', timeout: 5000 },
        { stepId: 'step_2', service: 'service_b', operation: 'transform', timeout: 3000 },
        { stepId: 'step_3', service: 'service_c', operation: 'store', timeout: 10000 }
      ]
    }

    // 모니터링 시작
    const monitor = orchestrator.createFlowMonitor(monitoredFlow.flowId)
    const metricsCollected: any[] = []
    
    monitor.onMetric((metric) => {
      metricsCollected.push(metric)
    })

    await orchestrator.executeDataFlow(monitoredFlow)

    // 메트릭 수집 확인
    expect(metricsCollected.length).toBeGreaterThan(0)
    
    const executionMetrics = metricsCollected.filter(m => m.type === 'execution_time')
    const throughputMetrics = metricsCollected.filter(m => m.type === 'throughput')
    
    expect(executionMetrics).toHaveLength(3) // 각 단계별
    expect(throughputMetrics).toHaveLength(1) // 전체 플로우
    
    // 성능 메트릭 검증
    expect(executionMetrics[0].duration).toBeLessThan(5000) // step_1 timeout 이내
    expect(executionMetrics[1].duration).toBeLessThan(3000) // step_2 timeout 이내
    expect(executionMetrics[2].duration).toBeLessThan(10000) // step_3 timeout 이내
    
    expect(throughputMetrics[0].recordsPerSecond).toBeGreaterThan(0)
  })

  it('should support data flow versioning and rollback capabilities', async () => {
    // 버전 1의 플로우
    const flowV1 = {
      flowId: 'versioned_flow',
      version: '1.0.0',
      steps: [
        { stepId: 'process_v1', service: 'processor', operation: 'processV1' }
      ]
    }

    // 버전 2의 플로우 (새로운 단계 추가)
    const flowV2 = {
      flowId: 'versioned_flow',
      version: '2.0.0',
      steps: [
        { stepId: 'process_v2', service: 'processor', operation: 'processV2' },
        { stepId: 'validate_v2', service: 'validator', operation: 'validateV2' }
      ]
    }

    // 두 버전 모두 등록
    await orchestrator.registerFlowVersion(flowV1)
    await orchestrator.registerFlowVersion(flowV2)

    // v2로 실행
    const v2Result = await orchestrator.executeDataFlow({
      ...flowV2,
      inputData: { test: 'data' }
    })

    expect(v2Result.success).toBe(true)
    expect(v2Result.flowVersion).toBe('2.0.0')
    expect(v2Result.completedSteps).toBe(2)

    // v1으로 롤백
    const rollbackResult = await orchestrator.rollbackToVersion('versioned_flow', '1.0.0')
    
    expect(rollbackResult.success).toBe(true)
    expect(rollbackResult.rolledBackFrom).toBe('2.0.0')
    expect(rollbackResult.rolledBackTo).toBe('1.0.0')
    
    // 롤백 후 다시 실행하면 v1 로직 사용
    const rollbackExecutionResult = await orchestrator.executeDataFlow({
      flowId: 'versioned_flow',
      inputData: { test: 'data' }
    })
    
    expect(rollbackExecutionResult.flowVersion).toBe('1.0.0')
    expect(rollbackExecutionResult.completedSteps).toBe(1)
  })
})