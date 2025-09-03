// 분석 및 메트릭 수집 시스템 테스트 - TDD Red Phase
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  AnalyticsCollector,
  UserBehaviorAnalyzer,
  PipelineMetricsCollector,
  PerformanceMetricsCollector,
  PrivacyCompliantAnalytics,
  MetricsAggregator
} from './analytics-system'

describe('AnalyticsCollector', () => {
  let collector: AnalyticsCollector

  beforeEach(() => {
    collector = new AnalyticsCollector({
      gdprCompliant: true,
      anonymizeAfter: 30, // 30일 후 익명화
      retentionPeriod: 90, // 90일 보존
      batchSize: 100
    })
  })

  it('should collect user events with privacy protection', async () => {
    const userEvents = [
      {
        userId: 'usr_123456789',
        sessionId: 'session_001',
        event: {
          type: 'video_play',
          timestamp: '2025-01-10T10:00:00Z',
          properties: {
            videoId: 'vid_123456789',
            quality: 'high',
            startTime: 0,
            userAgent: 'Mozilla/5.0 (Chrome)'
          }
        }
      },
      {
        userId: 'usr_123456789',
        sessionId: 'session_001',
        event: {
          type: 'video_pause',
          timestamp: '2025-01-10T10:05:30Z',
          properties: {
            videoId: 'vid_123456789',
            pauseTime: 330000, // 5분 30초
            watchDuration: 330000
          }
        }
      },
      {
        userId: 'usr_987654321',
        sessionId: 'session_002',
        event: {
          type: 'comment_posted',
          timestamp: '2025-01-10T10:10:00Z',
          properties: {
            videoId: 'vid_123456789',
            commentId: 'cmt_001',
            characterCount: 120
          }
        }
      }
    ]

    const collectionResult = await collector.collectEvents(userEvents)

    expect(collectionResult.success).toBe(true)
    expect(collectionResult.eventsProcessed).toBe(3)
    expect(collectionResult.anonymizedEvents).toBe(0) // 아직 익명화 시간 전
    expect(collectionResult.privacyViolations).toBe(0)
    
    // PII가 적절히 처리되었는지 확인
    expect(collectionResult.processedEvents[0].event.properties.userAgent).toBeUndefined() // 자동 제거
  })

  it('should automatically anonymize data after retention period', async () => {
    const oldEvents = [
      {
        userId: 'usr_123456789',
        sessionId: 'session_old',
        event: {
          type: 'page_view',
          timestamp: '2024-10-10T00:00:00Z', // 3개월 전 이벤트
          properties: {
            page: '/dashboard',
            referrer: 'https://google.com'
          }
        }
      }
    ]

    // 보존 기간 확인 및 익명화 실행
    const anonymizationResult = await collector.processRetentionPolicy(oldEvents)

    expect(anonymizationResult.anonymizedCount).toBe(1)
    expect(anonymizationResult.deletedCount).toBe(0) // 아직 보존 기간 내
    expect(anonymizationResult.processedEvents[0].userId).toBeNull()
    expect(anonymizationResult.processedEvents[0].sessionId).toMatch(/^session_anonymous_/)
  })

  it('should batch events efficiently for performance', async () => {
    const manyEvents = Array.from({ length: 250 }, (_, i) => ({
      userId: 'usr_123456789',
      sessionId: 'session_batch_test',
      event: {
        type: 'page_view' as const,
        timestamp: new Date(Date.now() + i * 1000).toISOString(),
        properties: { page: `/page-${i}` }
      }
    }))

    const batchResult = await collector.collectEventsBatch(manyEvents)

    expect(batchResult.success).toBe(true)
    expect(batchResult.batchesProcessed).toBe(3) // 250 events / 100 batch size = 3 batches
    expect(batchResult.totalEvents).toBe(250)
    expect(batchResult.processingTime).toBeLessThan(5000) // 5초 이내 처리
  })
})

describe('UserBehaviorAnalyzer', () => {
  let analyzer: UserBehaviorAnalyzer

  beforeEach(() => {
    analyzer = new UserBehaviorAnalyzer()
  })

  it('should analyze user engagement patterns while preserving privacy', async () => {
    const userSessions = [
      {
        userId: 'usr_anonymous_001', // 익명화된 ID
        sessionData: {
          duration: 1800000, // 30분
          pageViews: 15,
          videoWatches: 3,
          interactions: 25,
          timeOfDay: 14, // 오후 2시
          dayOfWeek: 3 // 수요일
        }
      },
      {
        userId: 'usr_anonymous_002',
        sessionData: {
          duration: 3600000, // 60분
          pageViews: 8,
          videoWatches: 5,
          interactions: 18,
          timeOfDay: 20, // 오후 8시
          dayOfWeek: 6 // 토요일
        }
      }
    ]

    const behaviorAnalysis = await analyzer.analyzeEngagementPatterns(userSessions)

    expect(behaviorAnalysis.segments).toBeDefined()
    expect(behaviorAnalysis.segments.high_engagement.userCount).toBe(1) // usr_anonymous_002
    expect(behaviorAnalysis.segments.moderate_engagement.userCount).toBe(1) // usr_anonymous_001
    
    expect(behaviorAnalysis.patterns.peakHours).toContain(20) // 저녁 시간대
    expect(behaviorAnalysis.patterns.mostActiveDay).toBe(6) // 토요일
    
    expect(behaviorAnalysis.insights).toContain('사용자들은 주말 저녁에 가장 활발함')
    expect(behaviorAnalysis.recommendations).toContain('저녁 시간대 콘텐츠 추천 강화')
  })

  it('should identify user journey bottlenecks', async () => {
    const userJourneys = [
      {
        userId: 'usr_anonymous_001',
        steps: [
          { step: 'landing', timestamp: '2025-01-10T10:00:00Z', completed: true },
          { step: 'signup', timestamp: '2025-01-10T10:02:00Z', completed: true },
          { step: 'project_create', timestamp: '2025-01-10T10:15:00Z', completed: false }, // 병목
          { step: 'video_upload', timestamp: null, completed: false }
        ]
      },
      {
        userId: 'usr_anonymous_002',
        steps: [
          { step: 'landing', timestamp: '2025-01-10T11:00:00Z', completed: true },
          { step: 'signup', timestamp: '2025-01-10T11:03:00Z', completed: true },
          { step: 'project_create', timestamp: '2025-01-10T11:25:00Z', completed: false }, // 병목
          { step: 'video_upload', timestamp: null, completed: false }
        ]
      }
    ]

    const bottleneckAnalysis = await analyzer.identifyJourneyBottlenecks(userJourneys)

    expect(bottleneckAnalysis.bottlenecks).toHaveLength(1)
    expect(bottleneckAnalysis.bottlenecks[0].step).toBe('project_create')
    expect(bottleneckAnalysis.bottlenecks[0].dropoffRate).toBe(1.0) // 100% 드롭오프
    expect(bottleneckAnalysis.bottlenecks[0].averageTimeToStep).toBeGreaterThan(10) // 10분 이상 소요
    
    expect(bottleneckAnalysis.recommendations).toContain('프로젝트 생성 UX 개선')
  })

  it('should calculate user lifetime value predictions', async () => {
    const userMetrics = [
      {
        userId: 'usr_anonymous_001',
        metrics: {
          sessionCount: 45,
          totalWatchTime: 14400000, // 4시간
          projectsCreated: 8,
          commentsPosted: 25,
          subscriptionRevenue: 0, // 무료 사용자
          registrationDate: '2024-11-01T00:00:00Z'
        }
      },
      {
        userId: 'usr_anonymous_002',
        metrics: {
          sessionCount: 120,
          totalWatchTime: 43200000, // 12시간
          projectsCreated: 15,
          commentsPosted: 78,
          subscriptionRevenue: 99, // 유료 사용자
          registrationDate: '2024-09-15T00:00:00Z'
        }
      }
    ]

    const ltvAnalysis = await analyzer.calculateLTV(userMetrics)

    expect(ltvAnalysis.segments.high_value.users).toHaveLength(1) // usr_anonymous_002
    expect(ltvAnalysis.segments.high_value.averageLTV).toBeGreaterThan(200)
    
    expect(ltvAnalysis.segments.growing.users).toHaveLength(1) // usr_anonymous_001
    expect(ltvAnalysis.segments.growing.conversionProbability).toBeGreaterThan(0.3)
    
    expect(ltvAnalysis.predictions.revenueGrowth.nextQuarter).toBeGreaterThan(0)
    expect(ltvAnalysis.actionableInsights).toContain('고가치 사용자 리텐션 프로그램 강화')
  })
})

describe('PipelineMetricsCollector', () => {
  let collector: PipelineMetricsCollector

  beforeEach(() => {
    collector = new PipelineMetricsCollector()
  })

  it('should collect comprehensive pipeline performance metrics', async () => {
    const pipelineExecution = {
      pipelineId: 'pip_001',
      stages: [
        {
          stageId: 'extract_data',
          startTime: '2025-01-10T09:00:00Z',
          endTime: '2025-01-10T09:05:00Z',
          recordsProcessed: 1000,
          memoryUsage: 256 * 1024 * 1024, // 256MB
          cpuUsage: 45.5, // 45.5%
          errors: []
        },
        {
          stageId: 'transform_data',
          startTime: '2025-01-10T09:05:00Z',
          endTime: '2025-01-10T09:12:00Z',
          recordsProcessed: 1000,
          memoryUsage: 512 * 1024 * 1024, // 512MB
          cpuUsage: 78.2, // 78.2%
          errors: [
            { type: 'validation_error', count: 5, severity: 'medium' }
          ]
        }
      ]
    }

    const metrics = await collector.collectPipelineMetrics(pipelineExecution)

    expect(metrics.overall.totalExecutionTime).toBe(720000) // 12분
    expect(metrics.overall.recordsPerSecond).toBeCloseTo(2.78) // 1000 records / 360 seconds
    expect(metrics.overall.successRate).toBe(0.995) // (1000 - 5) / 1000
    
    expect(metrics.stages).toHaveLength(2)
    expect(metrics.stages[0].throughput).toBe(3.33) // 1000 records / 300 seconds
    expect(metrics.stages[1].errorRate).toBe(0.005) // 5 errors / 1000 records
    
    expect(metrics.performance.peakMemoryUsage).toBe(512 * 1024 * 1024)
    expect(metrics.performance.averageCpuUsage).toBeCloseTo(61.85) // (45.5 + 78.2) / 2
  })

  it('should detect performance anomalies and bottlenecks', async () => {
    const historicalMetrics = [
      { pipelineId: 'pip_001', executionTime: 300000, recordsProcessed: 1000 }, // 정상
      { pipelineId: 'pip_001', executionTime: 600000, recordsProcessed: 1000 }, // 2배 느림
      { pipelineId: 'pip_001', executionTime: 900000, recordsProcessed: 1000 }, // 3배 느림
    ]

    const anomalyDetection = await collector.detectPerformanceAnomalies(historicalMetrics)

    expect(anomalyDetection.anomalies).toHaveLength(2)
    expect(anomalyDetection.anomalies[0].type).toBe('execution_time_spike')
    expect(anomalyDetection.anomalies[0].severity).toBe('medium')
    expect(anomalyDetection.anomalies[1].type).toBe('execution_time_spike')
    expect(anomalyDetection.anomalies[1].severity).toBe('high')
    
    expect(anomalyDetection.trendAnalysis.degradationTrend).toBe(true)
    expect(anomalyDetection.recommendations).toContain('시스템 리소스 사용량 점검')
  })

  it('should generate SLA compliance reports', async () => {
    const slaDefinition = {
      pipelineId: 'pip_user_analytics',
      requirements: {
        maxExecutionTime: 600000, // 10분
        minSuccessRate: 0.99, // 99%
        maxErrorRate: 0.01, // 1%
        availabilityTarget: 0.999 // 99.9%
      }
    }

    const executionHistory = [
      { executionTime: 480000, successRate: 0.995, errorRate: 0.005, available: true },
      { executionTime: 720000, successRate: 0.988, errorRate: 0.012, available: true }, // SLA 위반
      { executionTime: 540000, successRate: 0.999, errorRate: 0.001, available: true },
      { executionTime: 0, successRate: 0, errorRate: 0, available: false } // 다운타임
    ]

    const slaReport = await collector.generateSLAReport(slaDefinition, executionHistory)

    expect(slaReport.complianceScore).toBeLessThan(1.0) // 위반 사항 있음
    expect(slaReport.violations).toHaveLength(3) // execution_time, success_rate, error_rate 각각 1회씩
    expect(slaReport.violations.some(v => v.metric === 'maxExecutionTime')).toBe(true)
    expect(slaReport.violations.some(v => v.metric === 'minSuccessRate')).toBe(true)
    
    expect(slaReport.recommendations).toContain('파이프라인 최적화 필요')
    expect(slaReport.uptime).toBe(0.75) // 4개 중 3개 성공
  })
})

describe('UserBehaviorAnalyzer', () => {
  let analyzer: UserBehaviorAnalyzer

  beforeEach(() => {
    analyzer = new UserBehaviorAnalyzer()
  })

  it('should analyze user engagement without exposing PII', async () => {
    const anonymizedBehaviorData = [
      {
        userSegment: 'creator',
        sessionData: {
          averageSessionDuration: 2400000, // 40분
          pagesPerSession: 12,
          videoCompletionRate: 0.85,
          featureUsage: {
            'video_upload': 15,
            'comment_system': 8,
            'project_management': 20
          }
        },
        temporalPattern: {
          mostActiveHour: 15, // 오후 3시
          mostActiveDay: 2, // 화요일
          sessionFrequency: 4.2 // 주당 세션 수
        }
      },
      {
        userSegment: 'viewer',
        sessionData: {
          averageSessionDuration: 1200000, // 20분
          pagesPerSession: 6,
          videoCompletionRate: 0.65,
          featureUsage: {
            'video_watch': 25,
            'comment_system': 12,
            'search': 18
          }
        },
        temporalPattern: {
          mostActiveHour: 20, // 오후 8시
          mostActiveDay: 6, // 토요일
          sessionFrequency: 2.8
        }
      }
    ]

    const engagementAnalysis = await analyzer.analyzeEngagement(anonymizedBehaviorData)

    expect(engagementAnalysis.segmentInsights.creator.engagementScore).toBeGreaterThan(0.8)
    expect(engagementAnalysis.segmentInsights.viewer.engagementScore).toBeGreaterThan(0.6)
    
    expect(engagementAnalysis.behaviorPatterns.featurePopularity).toBeDefined()
    expect(engagementAnalysis.behaviorPatterns.timeBasedUsage.peakHours).toContain(15)
    expect(engagementAnalysis.behaviorPatterns.timeBasedUsage.peakHours).toContain(20)
    
    expect(engagementAnalysis.recommendations).toContain('크리에이터 대상 오후 시간대 콘텐츠 프로모션')
  })

  it('should identify churn risk factors', async () => {
    const userCohorts = [
      {
        cohortId: 'cohort_2024_Q4',
        users: [
          {
            userSegment: 'creator',
            lastActivity: '2025-01-08T00:00:00Z', // 2일 전
            activityTrend: 'decreasing',
            engagementScore: 0.3, // 낮은 참여도
            keyMetrics: {
              sessionFrequency: 0.5, // 주당 0.5회 (감소)
              videoUploadFrequency: 0, // 업로드 중단
              projectCompletionRate: 0.4
            }
          },
          {
            userSegment: 'viewer',
            lastActivity: '2025-01-09T00:00:00Z', // 1일 전
            activityTrend: 'stable',
            engagementScore: 0.7,
            keyMetrics: {
              sessionFrequency: 2.1,
              videoWatchTime: 3600000,
              commentActivity: 5
            }
          }
        ]
      }
    ]

    const churnAnalysis = await analyzer.identifyChurnRisk(userCohorts)

    expect(churnAnalysis.riskSegments.high_risk).toHaveLength(1) // creator
    expect(churnAnalysis.riskSegments.low_risk).toHaveLength(1) // viewer
    
    expect(churnAnalysis.riskFactors.primary).toContain('낮은 콘텐츠 생성 활동')
    expect(churnAnalysis.riskFactors.secondary).toContain('프로젝트 완료율 저조')
    
    expect(churnAnalysis.interventionStrategies.immediate).toContain('개인화된 온보딩 지원')
    expect(churnAnalysis.predictiveModel.accuracy).toBeGreaterThan(0.7)
  })

  it('should generate personalized recommendations without user identification', async () => {
    const anonymizedUserProfile = {
      userSegment: 'creator',
      skillLevel: 'intermediate',
      preferences: {
        preferredVideoLength: 'medium', // 10-30분
        favoriteCategories: ['education', 'technology'],
        activeTimeSlots: [14, 15, 16] // 오후 2-4시
      },
      recentActivity: {
        projectTypes: ['tutorial', 'presentation'],
        collaborationFrequency: 'low',
        feedbackEngagement: 'high'
      }
    }

    const recommendations = await analyzer.generatePersonalizedRecommendations(anonymizedUserProfile)

    expect(recommendations.content).toContain('교육용 콘텐츠 템플릿')
    expect(recommendations.features).toContain('고급 편집 도구')
    expect(recommendations.timing.optimal).toContain('오후 2-4시 활동 권장')
    
    expect(recommendations.confidence).toBeGreaterThan(0.6)
    expect(recommendations.privacyCompliant).toBe(true)
  })
})

describe('PerformanceMetricsCollector', () => {
  let collector: PerformanceMetricsCollector

  beforeEach(() => {
    collector = new PerformanceMetricsCollector()
  })

  it('should collect system performance metrics across pipeline stages', async () => {
    const systemMetrics = {
      timestamp: '2025-01-10T15:00:00Z',
      pipelines: [
        {
          pipelineId: 'pip_user_analytics',
          stages: [
            {
              stageId: 'data_extraction',
              metrics: {
                cpuUsage: 65.5,
                memoryUsage: 0.7, // 70%
                diskIO: 125.5, // MB/s
                networkIO: 45.2, // MB/s
                executionTime: 180000, // 3분
                recordsProcessed: 5000
              }
            }
          ]
        }
      ],
      system: {
        totalCpuUsage: 45.3,
        totalMemoryUsage: 0.6,
        diskSpaceUsed: 0.75,
        networkLatency: 25, // ms
        activeConnections: 150
      }
    }

    const performanceReport = await collector.collectMetrics(systemMetrics)

    expect(performanceReport.summary.overallHealth).toBe('good')
    expect(performanceReport.summary.bottlenecks).toHaveLength(1) // 높은 CPU 사용률
    
    expect(performanceReport.pipelineMetrics['pip_user_analytics'].efficiency).toBeGreaterThan(0.8)
    expect(performanceReport.pipelineMetrics['pip_user_analytics'].throughput).toBeCloseTo(27.78) // records/second
    
    expect(performanceReport.systemMetrics.resourceUtilization.cpu).toBe(45.3)
    expect(performanceReport.systemMetrics.capacityAlerts).toContainEqual({
      resource: 'disk',
      usage: 0.75,
      threshold: 0.8,
      severity: 'warning',
      action: 'Monitor disk usage closely'
    })
  })

  it('should predict resource requirements based on usage patterns', async () => {
    const usageHistory = [
      { date: '2025-01-01', recordsProcessed: 10000, peakMemory: 1024, avgCpu: 40 },
      { date: '2025-01-02', recordsProcessed: 12000, peakMemory: 1200, avgCpu: 48 },
      { date: '2025-01-03', recordsProcessed: 15000, peakMemory: 1500, avgCpu: 55 }
    ]

    const forecast = await collector.forecastResourceNeeds(usageHistory, {
      forecastDays: 30,
      growthAssumptions: {
        userGrowth: 0.15, // 15% 월 성장
        dataVolumeGrowth: 0.20 // 20% 월 데이터 증가
      }
    })

    expect(forecast.projectedPeakLoad.recordsProcessed).toBeGreaterThan(15000)
    expect(forecast.resourceRequirements.memory).toBeGreaterThan(1500)
    expect(forecast.resourceRequirements.cpu).toBeGreaterThan(55)
    
    expect(forecast.scalingRecommendations).toContain('메모리 용량 증설 검토')
    expect(forecast.costProjection.monthlyIncrease).toBeGreaterThan(0)
    expect(forecast.confidence).toBeGreaterThan(0.7)
  })

  it('should generate capacity planning recommendations', async () => {
    const currentCapacity = {
      cpu: { cores: 8, utilizationTarget: 0.7 },
      memory: { total: '32GB', utilizationTarget: 0.8 },
      storage: { total: '2TB', utilizationTarget: 0.75 },
      network: { bandwidth: '1Gbps', utilizationTarget: 0.6 }
    }

    const projectedLoad = {
      cpuDemand: 0.85, // 85% 예상 사용률
      memoryDemand: 0.9, // 90% 예상 사용률
      storageDemand: 0.8, // 80% 예상 사용률
      networkDemand: 0.4 // 40% 예상 사용률
    }

    const capacityPlan = await collector.generateCapacityPlan(currentCapacity, projectedLoad)

    expect(capacityPlan.recommendations).toContainEqual({
      resource: 'cpu',
      action: 'upgrade',
      reason: 'Projected usage exceeds target threshold',
      timeline: 'immediate',
      estimatedCost: expect.any(Number)
    })
    
    expect(capacityPlan.recommendations).toContainEqual({
      resource: 'memory',
      action: 'upgrade',
      reason: 'Projected usage exceeds target threshold',
      timeline: 'immediate',
      estimatedCost: expect.any(Number)
    })

    expect(capacityPlan.totalEstimatedCost).toBeGreaterThan(0)
    expect(capacityPlan.implementationPriority).toEqual(['memory', 'cpu', 'storage'])
  })
})

describe('PrivacyCompliantAnalytics', () => {
  let analytics: PrivacyCompliantAnalytics

  beforeEach(() => {
    analytics = new PrivacyCompliantAnalytics({
      anonymizationThreshold: 30, // 30일
      aggregationLevel: 'daily',
      gdprCompliant: true
    })
  })

  it('should ensure all analytics comply with GDPR requirements', async () => {
    const rawAnalyticsData = [
      {
        userId: 'usr_123456789',
        email: 'user@example.com', // PII
        ipAddress: '192.168.1.100', // PII
        events: [
          {
            type: 'video_view',
            timestamp: '2025-01-10T00:00:00Z',
            videoId: 'vid_001',
            watchDuration: 300000
          }
        ]
      }
    ]

    const gdprCompliantData = await analytics.processForGDPRCompliance(rawAnalyticsData)

    expect(gdprCompliantData.processedRecords).toBe(1)
    expect(gdprCompliantData.piiRemoved).toBe(2) // email, ipAddress
    expect(gdprCompliantData.anonymizedRecords).toBe(1)
    
    const processedRecord = gdprCompliantData.data[0]
    expect(processedRecord.userId).toBeNull() // 익명화
    expect(processedRecord.email).toBeUndefined() // PII 제거
    expect(processedRecord.ipAddress).toBeUndefined() // PII 제거
    expect(processedRecord.events[0].videoId).toBe('vid_001') // 비PII 데이터 유지
  })

  it('should aggregate data for privacy-safe reporting', async () => {
    const individualEvents = [
      { userId: 'user1', action: 'video_view', timestamp: '2025-01-10T10:00:00Z', duration: 300 },
      { userId: 'user2', action: 'video_view', timestamp: '2025-01-10T10:05:00Z', duration: 450 },
      { userId: 'user1', action: 'comment_post', timestamp: '2025-01-10T10:10:00Z', length: 120 },
      { userId: 'user3', action: 'video_view', timestamp: '2025-01-10T11:00:00Z', duration: 600 },
    ]

    const aggregatedReport = await analytics.aggregateForPrivacy(individualEvents, {
      aggregationLevel: 'hourly',
      minimumGroupSize: 2, // k-익명성
      suppressionThreshold: 3
    })

    expect(aggregatedReport.timeSlots).toHaveLength(2) // 10시, 11시
    expect(aggregatedReport.timeSlots[0].metrics.totalVideoViews).toBe(2)
    expect(aggregatedReport.timeSlots[0].metrics.averageWatchDuration).toBe(375) // (300+450)/2
    expect(aggregatedReport.timeSlots[0].userCount).toBeGreaterThanOrEqual(2) // k-익명성 보장
    
    // 개인 식별 불가능한 수준의 집계인지 확인
    expect(aggregatedReport.privacyMetrics.kAnonymity).toBeGreaterThanOrEqual(2)
    expect(aggregatedReport.privacyMetrics.lDiversity).toBeGreaterThan(1)
  })

  it('should implement differential privacy for sensitive metrics', async () => {
    const sensitiveMetrics = [
      { metric: 'average_session_duration', value: 1800, sensitivity: 1 },
      { metric: 'unique_users_count', value: 150, sensitivity: 1 },
      { metric: 'conversion_rate', value: 0.15, sensitivity: 0.01 }
    ]

    const privatizedMetrics = await analytics.applyDifferentialPrivacy(sensitiveMetrics, {
      epsilon: 1.0, // 프라이버시 예산
      mechanism: 'laplace'
    })

    expect(privatizedMetrics).toHaveLength(3)
    
    // 노이즈가 추가되었지만 유용한 정보는 보존되어야 함
    expect(privatizedMetrics[0].noisyValue).toBeCloseTo(1800, -2) // ±100 정도 오차
    expect(privatizedMetrics[1].noisyValue).toBeCloseTo(150, -1) // ±10 정도 오차
    expect(privatizedMetrics[2].noisyValue).toBeCloseTo(0.15, 1) // 소수점 첫째 자리까지
    
    // 프라이버시 보장 수준 확인
    expect(privatizedMetrics[0].privacyLevel).toBe('high')
    expect(privatizedMetrics[0].epsilonUsed).toBeLessThanOrEqual(1.0)
  })
})

describe('MetricsAggregator', () => {
  let aggregator: MetricsAggregator

  beforeEach(() => {
    aggregator = new MetricsAggregator()
  })

  it('should aggregate metrics across multiple dimensions', async () => {
    const rawMetrics = [
      {
        timestamp: '2025-01-10T00:00:00Z',
        userId: 'user1',
        projectId: 'prj_001',
        eventType: 'video_upload',
        value: 1
      },
      {
        timestamp: '2025-01-10T01:00:00Z',
        userId: 'user1',
        projectId: 'prj_001',
        eventType: 'video_upload',
        value: 1
      },
      {
        timestamp: '2025-01-10T02:00:00Z',
        userId: 'user2',
        projectId: 'prj_002',
        eventType: 'video_view',
        value: 1
      }
    ]

    const aggregated = await aggregator.aggregateMultiDimensional(rawMetrics, {
      dimensions: ['timestamp', 'eventType', 'projectId'],
      timeGranularity: 'hourly',
      metrics: ['count', 'unique_users', 'unique_projects']
    })

    expect(aggregated.results).toHaveLength(2) // 2개 시간 슬롯에 데이터
    expect(aggregated.results[0].dimensions.eventType).toBe('video_upload')
    expect(aggregated.results[0].metrics.count).toBe(2)
    expect(aggregated.results[0].metrics.unique_users).toBe(1)
    
    expect(aggregated.summary.totalEvents).toBe(3)
    expect(aggregated.summary.uniqueUsers).toBe(2)
    expect(aggregated.summary.uniqueProjects).toBe(2)
  })

  it('should create real-time analytics dashboards', async () => {
    const realTimeData = {
      activeUsers: 45,
      concurrentVideoStreams: 23,
      uploadRate: 12, // uploads per hour
      systemLoad: {
        cpu: 0.65,
        memory: 0.72,
        storage: 0.58
      },
      qualityMetrics: {
        errorRate: 0.002,
        responseTime: 120, // ms
        throughput: 450 // requests/min
      }
    }

    const dashboard = await aggregator.generateRealTimeDashboard(realTimeData)

    expect(dashboard.kpis.activeUsers.current).toBe(45)
    expect(dashboard.kpis.activeUsers.trend).toBeDefined()
    
    expect(dashboard.systemHealth.overall).toBe('good') // 시스템 상태 양호
    expect(dashboard.systemHealth.alerts).toHaveLength(0) // 알림 없음
    
    expect(dashboard.qualityIndicators.errorRate.status).toBe('excellent') // 낮은 오류율
    expect(dashboard.qualityIndicators.responseTime.status).toBe('good')
    
    expect(dashboard.recommendations.immediate).toBeDefined()
    expect(dashboard.lastUpdated).toBeDefined()
  })

  it('should support custom metric definitions and calculations', async () => {
    const customMetricDefinitions = [
      {
        name: 'video_engagement_score',
        formula: '(total_watch_time / total_video_duration) * (comments_count / video_count) * 100',
        dependencies: ['total_watch_time', 'total_video_duration', 'comments_count', 'video_count']
      },
      {
        name: 'project_completion_velocity',
        formula: 'completed_phases / days_since_start',
        dependencies: ['completed_phases', 'days_since_start']
      }
    ]

    const inputData = {
      total_watch_time: 7200000, // 2시간
      total_video_duration: 14400000, // 4시간 (총 비디오 길이)
      comments_count: 15,
      video_count: 8,
      completed_phases: 6,
      days_since_start: 30
    }

    const calculatedMetrics = await aggregator.calculateCustomMetrics(customMetricDefinitions, inputData)

    expect(calculatedMetrics).toHaveLength(2)
    expect(calculatedMetrics[0].name).toBe('video_engagement_score')
    expect(calculatedMetrics[0].value).toBeCloseTo(93.75) // (0.5 * 1.875) * 100
    
    expect(calculatedMetrics[1].name).toBe('project_completion_velocity')
    expect(calculatedMetrics[1].value).toBe(0.2) // 6 phases / 30 days
    
    expect(calculatedMetrics[0].metadata.calculatedAt).toBeDefined()
    expect(calculatedMetrics[1].metadata.dependencies).toEqual(['completed_phases', 'days_since_start'])
  })
})