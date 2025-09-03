// 데이터 품질 관리 시스템 테스트 - TDD Red Phase
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  DataQualityEngine,
  DataNormalizationService,
  DuplicateDetectionService,
  DataIntegrityChecker,
  QualityReportGenerator
} from './data-quality'

describe('DataQualityEngine', () => {
  let engine: DataQualityEngine

  beforeEach(() => {
    engine = new DataQualityEngine()
  })

  it('should assess data quality across all dimensions', async () => {
    const testDataset = {
      users: [
        {
          id: 'usr_001',
          email: 'user1@example.com',
          username: 'user1',
          createdAt: '2025-01-01T00:00:00Z',
          profile: {
            bio: 'Valid user profile',
            skills: ['video editing']
          }
        },
        {
          id: 'usr_002',
          email: 'invalid-email', // 유효성 오류
          username: '', // 완전성 오류
          createdAt: '2025-01-02T00:00:00Z',
          profile: null // 완전성 오류
        },
        {
          id: 'usr_003',
          email: 'user3@example.com',
          username: 'user3',
          createdAt: '2024-12-31T23:59:59Z', // 시간 순서 일관성 문제
          profile: {
            bio: 'Another valid profile',
            skills: []
          }
        }
      ],
      projects: [
        {
          id: 'prj_001',
          name: 'Project One',
          ownerId: 'usr_001',
          status: 'active'
        },
        {
          id: 'prj_002',
          name: 'Project Two',
          ownerId: 'usr_999', // 참조 무결성 오류
          status: 'completed'
        }
      ]
    }

    const qualityReport = await engine.assessQuality(testDataset)

    expect(qualityReport.overallScore).toBeLessThan(1.0) // 오류가 있으므로 완벽하지 않음
    expect(qualityReport.dimensions.completeness).toBeGreaterThan(0.5)
    expect(qualityReport.dimensions.accuracy).toBeGreaterThan(0.5)
    expect(qualityReport.dimensions.consistency).toBeGreaterThan(0.5)
    expect(qualityReport.dimensions.validity).toBeGreaterThan(0.5)

    // 구체적인 위반 사항 확인
    expect(qualityReport.violations).toContainEqual({
      dimension: 'validity',
      entity: 'users',
      entityId: 'usr_002',
      field: 'email',
      rule: 'email_format',
      severity: 'error',
      description: '잘못된 이메일 형식'
    })

    expect(qualityReport.violations).toContainEqual({
      dimension: 'completeness',
      entity: 'users',
      entityId: 'usr_002',
      field: 'username',
      rule: 'required_field',
      severity: 'error',
      description: '필수 필드 누락'
    })

    expect(qualityReport.recommendations).toContain('이메일 주소 형식 검증 강화')
  })

  it('should track quality metrics over time', async () => {
    const historicalMetrics = [
      {
        timestamp: '2025-01-01T00:00:00Z',
        overallScore: 0.85,
        recordCount: 100
      },
      {
        timestamp: '2025-01-02T00:00:00Z',
        overallScore: 0.88,
        recordCount: 120
      },
      {
        timestamp: '2025-01-03T00:00:00Z',
        overallScore: 0.82, // 품질 저하
        recordCount: 150
      }
    ]

    const trend = await engine.analyzeTrend(historicalMetrics)

    expect(trend.direction).toBe('mixed') // 상승 후 하락
    expect(trend.volatility).toBeGreaterThan(0.05) // 변동성 있음
    expect(trend.prediction.next7Days).toBeGreaterThan(0.8)
    expect(trend.alerts).toContainEqual({
      type: 'quality_degradation',
      severity: 'warning',
      message: '최근 품질 점수 하락 감지'
    })
  })

  it('should generate actionable quality improvement recommendations', async () => {
    const qualityIssues = [
      {
        dimension: 'completeness',
        affectedRecords: 25,
        severity: 'high',
        pattern: 'missing_profile_data'
      },
      {
        dimension: 'accuracy',
        affectedRecords: 8,
        severity: 'medium',
        pattern: 'invalid_email_domains'
      }
    ]

    const recommendations = await engine.generateRecommendations(qualityIssues)

    expect(recommendations).toHaveLength(2)
    expect(recommendations[0].priority).toBe('high')
    expect(recommendations[0].action).toContain('프로필 데이터 입력 필수화')
    expect(recommendations[0].estimatedImpact.qualityImprovement).toBeGreaterThan(0.1)
    expect(recommendations[0].estimatedImpact.implementationEffort).toBe('medium')
  })
})

describe('DataNormalizationService', () => {
  let service: DataNormalizationService

  beforeEach(() => {
    service = new DataNormalizationService()
  })

  it('should normalize user input data consistently', async () => {
    const rawUserData = [
      {
        email: '  USER1@EXAMPLE.COM  ', // 공백, 대소문자
        username: 'User_Name_1',
        phone: '+82-10-1234-5678',
        location: 'seoul, south korea'
      },
      {
        email: 'User2@Example.Com',
        username: 'user.name.2',
        phone: '010-9876-5432', // 다른 형식
        location: 'BUSAN, South Korea'
      }
    ]

    const normalized = await service.normalizeUserData(rawUserData)

    // 이메일 정규화 (소문자, 공백 제거)
    expect(normalized[0].email).toBe('user1@example.com')
    expect(normalized[1].email).toBe('user2@example.com')

    // 사용자명 정규화 (소문자, 구분자 통일)
    expect(normalized[0].username).toBe('user_name_1')
    expect(normalized[1].username).toBe('user_name_2')

    // 전화번호 정규화 (국제 형식)
    expect(normalized[0].phone).toBe('+82-10-1234-5678')
    expect(normalized[1].phone).toBe('+82-10-9876-5432')

    // 위치 정규화 (표준 형식)
    expect(normalized[0].location).toBe('Seoul, South Korea')
    expect(normalized[1].location).toBe('Busan, South Korea')
  })

  it('should handle malformed data gracefully', async () => {
    const malformedData = [
      {
        email: null, // null 값
        username: 123, // 잘못된 타입
        phone: 'invalid-phone-format'
      },
      {
        email: 'valid@example.com',
        username: 'valid_user',
        phone: '+82-10-1111-2222'
      }
    ]

    const result = await service.normalizeUserData(malformedData)

    expect(result).toHaveLength(1) // 유효한 레코드만 반환
    expect(result[0].email).toBe('valid@example.com')
    expect(result[0].username).toBe('valid_user')
  })

  it('should apply domain-specific normalization rules', async () => {
    const projectData = [
      {
        name: '  My Awesome Project!!!  ',
        tags: ['Marketing', 'VIDEO', 'corporate', 'URGENT!!!'],
        budget: '$10,000 USD'
      }
    ]

    const normalized = await service.normalizeProjectData(projectData)

    // 프로젝트명 정규화 (공백, 특수문자 정리)
    expect(normalized[0].name).toBe('My Awesome Project')
    
    // 태그 정규화 (소문자, 중복 제거, 유효하지 않은 태그 필터링)
    expect(normalized[0].tags).toEqual(['marketing', 'video', 'corporate'])
    
    // 예산 정규화 (숫자와 통화 분리)
    expect(normalized[0].budget).toEqual({
      amount: 10000,
      currency: 'USD'
    })
  })
})

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService

  beforeEach(() => {
    service = new DuplicateDetectionService()
  })

  it('should detect exact duplicates', async () => {
    const dataset = [
      { id: 'usr_001', email: 'user@example.com', username: 'user1' },
      { id: 'usr_002', email: 'user2@example.com', username: 'user2' },
      { id: 'usr_003', email: 'user@example.com', username: 'user1' }, // 정확한 중복
      { id: 'usr_004', email: 'user3@example.com', username: 'user3' }
    ]

    const duplicates = await service.detectExactDuplicates(dataset, ['email', 'username'])

    expect(duplicates).toHaveLength(1)
    expect(duplicates[0].duplicateGroup).toContain('usr_001')
    expect(duplicates[0].duplicateGroup).toContain('usr_003')
    expect(duplicates[0].confidence).toBe(1.0) // 정확한 중복
    expect(duplicates[0].matchedFields).toEqual(['email', 'username'])
  })

  it('should detect fuzzy duplicates with similarity threshold', async () => {
    const dataset = [
      { id: 'prj_001', name: 'My Awesome Project' },
      { id: 'prj_002', name: 'My Awsome Project' }, // 오타 유사
      { id: 'prj_003', name: 'Awesome Project' }, // 부분 유사
      { id: 'prj_004', name: 'Completely Different Project' }
    ]

    const fuzzyDuplicates = await service.detectFuzzyDuplicates(
      dataset,
      ['name'],
      { threshold: 0.8, algorithm: 'levenshtein' }
    )

    expect(fuzzyDuplicates).toHaveLength(1)
    expect(fuzzyDuplicates[0].duplicateGroup).toContain('prj_001')
    expect(fuzzyDuplicates[0].duplicateGroup).toContain('prj_002')
    expect(fuzzyDuplicates[0].confidence).toBeGreaterThan(0.8)
    expect(fuzzyDuplicates[0].similarityScore).toBeGreaterThan(0.85)
  })

  it('should provide merge suggestions for detected duplicates', async () => {
    const duplicateGroup = [
      {
        id: 'usr_001',
        email: 'user@example.com',
        username: 'user1',
        profile: { bio: 'First bio', skills: ['editing'] },
        createdAt: '2025-01-01T00:00:00Z',
        lastLoginAt: '2025-01-08T00:00:00Z'
      },
      {
        id: 'usr_003',
        email: 'user@example.com',
        username: 'user1',
        profile: { bio: 'Updated bio', skills: ['editing', 'animation'] },
        createdAt: '2025-01-01T00:00:00Z',
        lastLoginAt: '2025-01-10T00:00:00Z'
      }
    ]

    const mergeSuggestion = await service.suggestMerge(duplicateGroup)

    expect(mergeSuggestion.primaryRecord).toBe('usr_001') // 먼저 생성된 것
    expect(mergeSuggestion.mergeStrategy).toBeDefined()
    expect(mergeSuggestion.fieldResolutions.profile.bio).toBe('Updated bio') // 더 최신 정보
    expect(mergeSuggestion.fieldResolutions.profile.skills).toEqual(['editing', 'animation']) // 병합
    expect(mergeSuggestion.fieldResolutions.lastLoginAt).toBe('2025-01-10T00:00:00Z') // 최신 값
    expect(mergeSuggestion.confidence).toBeGreaterThan(0.8)
  })

  it('should handle complex duplicate scenarios', async () => {
    const complexDataset = [
      { id: 'prj_001', name: 'Project Alpha', ownerId: 'usr_001' },
      { id: 'prj_002', name: 'Project Alpha', ownerId: 'usr_002' }, // 같은 이름, 다른 소유자
      { id: 'prj_003', name: 'Project Beta', ownerId: 'usr_001' },
      { id: 'prj_004', name: 'project alpha', ownerId: 'usr_001' } // 대소문자 차이
    ]

    const analysis = await service.analyzeComplexDuplicates(complexDataset)

    expect(analysis.duplicateGroups).toHaveLength(2) // 2개 중복 그룹
    expect(analysis.ambiguousCases).toHaveLength(1) // 애매한 케이스 (같은 이름, 다른 소유자)
    expect(analysis.resolutionStrategies).toContainEqual({
      groupId: expect.any(String),
      strategy: 'manual_review',
      reason: '소유자가 다른 동일 프로젝트명'
    })
  })
})

describe('DataNormalizationService', () => {
  let service: DataNormalizationService

  beforeEach(() => {
    service = new DataNormalizationService()
  })

  it('should normalize email addresses according to RFC standards', async () => {
    const emails = [
      '  USER@EXAMPLE.COM  ',
      'User.Name+tag@Gmail.Com',
      'user@example.com',
      'invalid.email@' // 유효하지 않은 이메일
    ]

    const normalized = await service.normalizeEmails(emails)

    expect(normalized).toEqual([
      'user@example.com',
      'user.name+tag@gmail.com',
      'user@example.com'
      // 유효하지 않은 이메일은 제외됨
    ])
  })

  it('should normalize project names with consistent formatting', async () => {
    const projectNames = [
      '  My Project!!!  ',
      'another-project_name',
      'ProjectWithMixedCase',
      'Project   With    Multiple   Spaces',
      '프로젝트 한글 이름', // 유니코드 처리
      '' // 빈 문자열
    ]

    const normalized = await service.normalizeProjectNames(projectNames)

    expect(normalized).toEqual([
      'My Project',
      'Another Project Name',
      'Project With Mixed Case',
      'Project With Multiple Spaces',
      '프로젝트 한글 이름'
      // 빈 문자열은 제외됨
    ])
  })

  it('should apply consistent date formatting', async () => {
    const dates = [
      '2025-01-01',
      '01/01/2025',
      '2025-1-1 00:00:00',
      'January 1, 2025',
      '1641024000000', // Unix timestamp (milliseconds)
      'invalid-date'
    ]

    const normalized = await service.normalizeDates(dates)

    // 모든 유효한 날짜는 ISO 8601 형식으로 정규화
    expect(normalized).toEqual([
      '2025-01-01T00:00:00.000Z',
      '2025-01-01T00:00:00.000Z',
      '2025-01-01T00:00:00.000Z',
      '2025-01-01T00:00:00.000Z',
      '2022-01-01T06:00:00.000Z' // Unix timestamp 변환
      // 유효하지 않은 날짜는 제외됨
    ])
  })

  it('should normalize geographic data to standard formats', async () => {
    const locations = [
      'seoul, korea',
      'Seoul, South Korea',
      'BUSAN, KR',
      'New York, NY, USA',
      'invalid location data'
    ]

    const normalized = await service.normalizeLocations(locations)

    expect(normalized).toContain('Seoul, South Korea')
    expect(normalized).toContain('Busan, South Korea')
    expect(normalized).toContain('New York, United States')
    expect(normalized).not.toContain('invalid location data')
  })
})

describe('DuplicateDetectionService', () => {
  let service: DuplicateDetectionService

  beforeEach(() => {
    service = new DuplicateDetectionService()
  })

  it('should detect semantic duplicates in video content', async () => {
    const videos = [
      {
        id: 'vid_001',
        title: 'Introduction to React',
        description: 'Learn React basics',
        tags: ['react', 'tutorial', 'javascript'],
        duration: 1800000 // 30분
      },
      {
        id: 'vid_002',
        title: 'React Basics Tutorial',
        description: 'Basic concepts of React',
        tags: ['react', 'beginner', 'js'],
        duration: 1680000 // 28분
      },
      {
        id: 'vid_003',
        title: 'Advanced Python Programming',
        description: 'Deep dive into Python',
        tags: ['python', 'advanced'],
        duration: 3600000 // 60분
      }
    ]

    const semanticDuplicates = await service.detectSemanticDuplicates(videos, {
      titleSimilarityThreshold: 0.7,
      contentSimilarityThreshold: 0.6,
      tagOverlapThreshold: 0.5
    })

    expect(semanticDuplicates).toHaveLength(1)
    expect(semanticDuplicates[0].duplicateGroup).toContain('vid_001')
    expect(semanticDuplicates[0].duplicateGroup).toContain('vid_002')
    expect(semanticDuplicates[0].similarity.title).toBeGreaterThan(0.7)
    expect(semanticDuplicates[0].similarity.tags).toBeGreaterThan(0.5)
  })

  it('should calculate duplicate resolution impact', async () => {
    const duplicateGroups = [
      {
        groupId: 'dup_group_001',
        entities: ['usr_001', 'usr_002'],
        type: 'user_accounts'
      },
      {
        groupId: 'dup_group_002',
        entities: ['prj_001', 'prj_002', 'prj_003'],
        type: 'projects'
      }
    ]

    const impact = await service.calculateResolutionImpact(duplicateGroups)

    expect(impact.storageReclaimed).toBeGreaterThan(0)
    expect(impact.dataConsistencyImprovement).toBeGreaterThan(0)
    expect(impact.affectedUsers).toBeGreaterThan(0)
    expect(impact.estimatedCleanupTime).toBeGreaterThan(0)
    expect(impact.riskAssessment.dataLoss).toBe('low') // 안전한 병합
  })
})

describe('DataIntegrityChecker', () => {
  let checker: DataIntegrityChecker

  beforeEach(() => {
    checker = new DataIntegrityChecker()
  })

  it('should verify referential integrity across entities', async () => {
    const dataset = {
      users: [
        { id: 'usr_001', username: 'user1' },
        { id: 'usr_002', username: 'user2' }
      ],
      projects: [
        { id: 'prj_001', name: 'Project 1', ownerId: 'usr_001' }, // 유효한 참조
        { id: 'prj_002', name: 'Project 2', ownerId: 'usr_999' }  // 잘못된 참조
      ],
      videos: [
        { id: 'vid_001', title: 'Video 1', projectId: 'prj_001', uploadedBy: 'usr_001' },
        { id: 'vid_002', title: 'Video 2', projectId: 'prj_999', uploadedBy: 'usr_001' } // 잘못된 프로젝트 참조
      ]
    }

    const integrityReport = await checker.checkReferentialIntegrity(dataset)

    expect(integrityReport.violations).toHaveLength(2)
    expect(integrityReport.violations[0]).toEqual({
      entityType: 'projects',
      entityId: 'prj_002',
      referencedEntity: 'users',
      referencedId: 'usr_999',
      field: 'ownerId',
      violationType: 'missing_reference'
    })
    expect(integrityReport.violations[1]).toEqual({
      entityType: 'videos',
      entityId: 'vid_002',
      referencedEntity: 'projects',
      referencedId: 'prj_999',
      field: 'projectId',
      violationType: 'missing_reference'
    })
  })

  it('should verify business rule constraints', async () => {
    const projects = [
      {
        id: 'prj_001',
        status: 'completed',
        completedAt: null // 비즈니스 규칙 위반: 완료 상태인데 완료 날짜 없음
      },
      {
        id: 'prj_002',
        status: 'in_progress',
        budget: { allocated: 5000, spent: 6000 } // 예산 초과
      }
    ]

    const businessRuleViolations = await checker.checkBusinessRules(projects)

    expect(businessRuleViolations).toHaveLength(2)
    expect(businessRuleViolations[0].rule).toBe('completed_projects_must_have_completion_date')
    expect(businessRuleViolations[1].rule).toBe('budget_spent_cannot_exceed_allocated')
  })

  it('should validate data consistency across time', async () => {
    const timeSeriesData = [
      {
        entityId: 'usr_001',
        timestamp: '2025-01-01T00:00:00Z',
        status: 'active',
        projectCount: 5
      },
      {
        entityId: 'usr_001',
        timestamp: '2025-01-02T00:00:00Z',
        status: 'active',
        projectCount: 3 // 프로젝트 수 감소 (일관성 문제)
      },
      {
        entityId: 'usr_001',
        timestamp: '2025-01-03T00:00:00Z',
        status: 'inactive',
        projectCount: 3
      }
    ]

    const consistencyReport = await checker.checkTemporalConsistency(timeSeriesData)

    expect(consistencyReport.anomalies).toHaveLength(1)
    expect(consistencyReport.anomalies[0]).toEqual({
      entityId: 'usr_001',
      field: 'projectCount',
      anomalyType: 'unexpected_decrease',
      expectedRange: { min: 5, max: 10 },
      actualValue: 3,
      timestamp: '2025-01-02T00:00:00Z'
    })
  })
})

describe('QualityReportGenerator', () => {
  let generator: QualityReportGenerator

  beforeEach(() => {
    generator = new QualityReportGenerator()
  })

  it('should generate comprehensive quality dashboard report', async () => {
    const qualityMetrics = {
      overall: 0.87,
      dimensions: {
        completeness: 0.92,
        accuracy: 0.85,
        consistency: 0.88,
        timeliness: 0.84,
        validity: 0.90
      },
      entityMetrics: {
        users: { score: 0.91, recordCount: 1500 },
        projects: { score: 0.85, recordCount: 300 },
        videos: { score: 0.88, recordCount: 750 }
      }
    }

    const dashboard = await generator.generateDashboardReport(qualityMetrics)

    expect(dashboard.summary.overallGrade).toBe('B+') // 0.87 점수
    expect(dashboard.summary.status).toBe('good')
    expect(dashboard.trends.length).toBe(5) // 5개 차원
    expect(dashboard.priorityActions).toHaveLength(2) // 상위 2개 액션
    expect(dashboard.entityBreakdown.users.healthStatus).toBe('excellent')
    expect(dashboard.entityBreakdown.projects.healthStatus).toBe('good')
  })

  it('should generate automated quality alerts', async () => {
    const degradedMetrics = {
      overall: 0.65, // 품질 저하
      dimensions: {
        completeness: 0.45, // 임계 수준 이하
        accuracy: 0.70,
        consistency: 0.80,
        timeliness: 0.30, // 임계 수준 이하
        validity: 0.85
      }
    }

    const alerts = await generator.generateAlerts(degradedMetrics, {
      criticalThreshold: 0.7,
      warningThreshold: 0.8
    })

    expect(alerts.critical).toHaveLength(2) // completeness, timeliness
    expect(alerts.warnings).toHaveLength(1) // overall score
    expect(alerts.critical[0]).toEqual({
      dimension: 'completeness',
      score: 0.45,
      threshold: 0.7,
      severity: 'critical',
      message: 'Completeness score below critical threshold',
      suggestedActions: [
        'Review data collection processes',
        'Implement mandatory field validation',
        'Audit incomplete records'
      ]
    })
  })

  it('should generate executive summary for stakeholders', async () => {
    const comprehensiveMetrics = {
      timeRange: { from: '2025-01-01', to: '2025-01-10' },
      overall: 0.88,
      recordsProcessed: 10000,
      issuesResolved: 245,
      costImpact: {
        dataStorageOptimization: 15000, // USD
        duplicateCleanupSavings: 3000,
        qualityIncidentPrevention: 12000
      }
    }

    const executiveSummary = await generator.generateExecutiveSummary(comprehensiveMetrics)

    expect(executiveSummary.headline).toContain('88%') // 품질 점수
    expect(executiveSummary.businessImpact.totalSavings).toBe(30000)
    expect(executiveSummary.keyAchievements).toContain('245개 데이터 품질 이슈 해결')
    expect(executiveSummary.recommendations.immediate).toHaveLength(3)
    expect(executiveSummary.recommendations.strategic).toHaveLength(2)
    expect(executiveSummary.nextReviewDate).toBeDefined()
  })
})