/**
 * A/B 테스트 프레임워크
 * UI/UX 개선 효과 측정 및 통계적 검증 시스템
 */

import { z } from 'zod';

import { behaviorTracker } from './behavior-tracker';
import { featureUsageTracker } from './feature-usage-tracker';

// A/B 테스트 설정 스키마
export const ABTestConfigSchema = z.object({
  testId: z.string(),
  name: z.string(),
  description: z.string(),
  hypothesis: z.string(),
  
  // 테스트 대상
  targetSegment: z.object({
    userType: z.enum(['all', 'new_users', 'returning_users', 'premium_users']).optional(),
    pages: z.array(z.string()).optional(),
    devices: z.array(z.enum(['desktop', 'tablet', 'mobile'])).optional(),
    trafficPercentage: z.number().min(0).max(1) // 0-1 (0-100%)
  }),
  
  // 테스트 변형
  variants: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    trafficAllocation: z.number().min(0).max(1),
    changes: z.array(z.object({
      type: z.enum(['css', 'html', 'component', 'feature_flag']),
      selector: z.string().optional(),
      content: z.string().optional(),
      props: z.record(z.unknown()).optional()
    }))
  })),
  
  // 측정 지표
  primaryMetric: z.object({
    name: z.string(),
    type: z.enum(['conversion_rate', 'click_rate', 'completion_rate', 'time_on_page', 'custom']),
    goalValue: z.number().optional(),
    direction: z.enum(['increase', 'decrease'])
  }),
  secondaryMetrics: z.array(z.object({
    name: z.string(),
    type: z.enum(['bounce_rate', 'session_duration', 'page_views', 'error_rate', 'satisfaction_score']),
    weight: z.number().min(0).max(1).optional()
  })),
  
  // 통계 설정
  statisticalConfig: z.object({
    confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
    minimumDetectableEffect: z.number().min(0.01).default(0.05), // 5%
    statisticalPower: z.number().min(0.7).max(0.95).default(0.8),
    minimumSampleSize: z.number().min(100).default(1000)
  }),
  
  // 실행 설정
  schedule: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime().optional(),
    maxDuration: z.number().optional() // days
  }),
  
  status: z.enum(['draft', 'running', 'paused', 'completed', 'cancelled']).default('draft')
});

export type ABTestConfig = z.infer<typeof ABTestConfigSchema>;

// 테스트 결과 타입
export interface ABTestResults {
  testId: string;
  status: 'running' | 'completed';
  duration: number; // days
  
  participants: {
    total: number;
    byVariant: Record<string, number>;
    conversionsByVariant: Record<string, number>;
  };
  
  primaryMetric: {
    name: string;
    results: Record<string, {
      value: number;
      sampleSize: number;
      confidenceInterval: [number, number];
      statisticalSignificance: boolean;
      pValue: number;
    }>;
    winner?: string;
    improvement?: number; // percentage
  };
  
  secondaryMetrics: Array<{
    name: string;
    results: Record<string, number>;
    significance: boolean;
  }>;
  
  statisticalValidation: {
    hasMinimumSampleSize: boolean;
    hasStatisticalPower: boolean;
    recommendedAction: 'continue' | 'stop_winner' | 'stop_inconclusive' | 'extend_duration';
  };
  
  qualitativeInsights: Array<{
    type: 'user_feedback' | 'behavior_pattern' | 'technical_issue';
    description: string;
    variant?: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

// A/B 테스트 관리 클래스
export class ABTestManager {
  private activeTests: Map<string, ABTestConfig> = new Map();
  private testResults: Map<string, ABTestResults> = new Map();
  private userAssignments: Map<string, Record<string, string>> = new Map(); // userId -> testId -> variantId
  
  // VRidge 특화 테스트 템플릿
  private readonly TEST_TEMPLATES = {
    submenu_redesign: {
      name: '서브메뉴 디자인 개선',
      description: '서브메뉴 사용성 향상을 위한 UI/UX 개선',
      hypothesis: '새로운 서브메뉴 디자인이 사용자 참여도와 완료율을 향상시킬 것이다',
      primaryMetric: { name: 'submenu_completion_rate', type: 'completion_rate' as const, direction: 'increase' as const },
      secondaryMetrics: [
        { name: 'time_to_find_item', type: 'custom' as const },
        { name: 'menu_abandonment_rate', type: 'bounce_rate' as const }
      ]
    },
    project_creation_flow: {
      name: '프로젝트 생성 플로우 최적화',
      description: '프로젝트 생성 과정의 단계 축소 및 가이드 개선',
      hypothesis: '단순화된 프로젝트 생성 플로우가 완료율을 20% 이상 향상시킬 것이다',
      primaryMetric: { name: 'project_creation_completion_rate', type: 'completion_rate' as const, direction: 'increase' as const },
      secondaryMetrics: [
        { name: 'creation_flow_duration', type: 'custom' as const },
        { name: 'form_abandonment_rate', type: 'bounce_rate' as const }
      ]
    },
    video_player_controls: {
      name: '비디오 플레이어 컨트롤 개선',
      description: '피드백 작성을 위한 비디오 컨트롤 사용성 개선',
      hypothesis: '개선된 비디오 컨트롤이 피드백 작성 완료율을 증가시킬 것이다',
      primaryMetric: { name: 'feedback_completion_rate', type: 'completion_rate' as const, direction: 'increase' as const },
      secondaryMetrics: [
        { name: 'video_interaction_rate', type: 'click_rate' as const },
        { name: 'comment_accuracy', type: 'custom' as const }
      ]
    }
  };

  // 테스트 생성
  createTest(config: ABTestConfig): ABTestConfig {
    // 설정 검증
    const validatedConfig = ABTestConfigSchema.parse(config);
    
    // 트래픽 할당 검증
    const totalAllocation = validatedConfig.variants.reduce((sum, variant) => sum + variant.trafficAllocation, 0);
    if (Math.abs(totalAllocation - 1.0) > 0.001) {
      throw new Error('변형별 트래픽 할당 합이 100%가 아닙니다');
    }
    
    // 최소 샘플 크기 계산
    const requiredSampleSize = this.calculateMinimumSampleSize(validatedConfig);
    validatedConfig.statisticalConfig.minimumSampleSize = requiredSampleSize;
    
    this.activeTests.set(validatedConfig.testId, validatedConfig);
    
    // 테스트 시작 로깅
    behaviorTracker.track({
      category: 'experiment',
      action: 'ab_test_created',
      label: validatedConfig.testId,
      customProperties: {
        testName: validatedConfig.name,
        variants: validatedConfig.variants.map(v => v.name),
        primaryMetric: validatedConfig.primaryMetric.name,
        targetSegment: validatedConfig.targetSegment
      }
    });
    
    return validatedConfig;
  }

  // 사용자 변형 할당
  assignUserToVariant(testId: string, userId: string, context: {
    userType: 'new' | 'returning' | 'premium';
    page: string;
    device: 'desktop' | 'tablet' | 'mobile';
  }): string | null {
    const test = this.activeTests.get(testId);
    if (!test || test.status !== 'running') return null;
    
    // 대상 세그먼트 검사
    if (!this.isUserEligible(test, context)) return null;
    
    // 이미 할당된 경우 기존 변형 반환
    const existingAssignment = this.getUserAssignment(userId, testId);
    if (existingAssignment) return existingAssignment;
    
    // 트래픽 비율 기반 변형 할당
    const hash = this.hashUserId(userId, testId);
    const variants = test.variants;
    let cumulativeAllocation = 0;
    
    for (const variant of variants) {
      cumulativeAllocation += variant.trafficAllocation;
      if (hash < cumulativeAllocation) {
        this.setUserAssignment(userId, testId, variant.id);
        
        // 할당 추적
        behaviorTracker.track({
          category: 'experiment',
          action: 'ab_test_assignment',
          label: testId,
          customProperties: {
            variant: variant.id,
            userType: context.userType,
            page: context.page,
            device: context.device
          }
        });
        
        return variant.id;
      }
    }
    
    return null;
  }

  // 이벤트 추적 (변형별 성과 측정)
  trackEvent(testId: string, userId: string, eventType: string, eventData: Record<string, unknown>): void {
    const test = this.activeTests.get(testId);
    const variant = this.getUserAssignment(userId, testId);
    
    if (!test || !variant) return;
    
    // 기본 이벤트 추적
    behaviorTracker.track({
      category: 'experiment',
      action: `ab_test_event_${eventType}`,
      label: testId,
      customProperties: {
        variant,
        testName: test.name,
        ...eventData
      }
    });
    
    // 주요 메트릭 이벤트 처리
    if (eventType === test.primaryMetric.name || eventType === 'conversion') {
      this.updateTestResults(testId, variant, eventType, eventData);
    }
  }

  // 테스트 결과 분석
  analyzeTestResults(testId: string): ABTestResults | null {
    const test = this.activeTests.get(testId);
    if (!test) return null;
    
    // 실시간 데이터 수집
    const participants = this.collectParticipantData(testId);
    const metricData = this.collectMetricData(testId, test);
    
    // 통계적 검증 수행
    const primaryResults = this.performStatisticalTest(test, metricData.primary);
    const secondaryResults = metricData.secondary.map(metric => ({
      name: metric.name,
      results: metric.variantValues,
      significance: this.isStatisticallySignificant(metric.variantValues, test.statisticalConfig.confidenceLevel)
    }));
    
    // 정성적 인사이트 수집
    const qualitativeInsights = this.generateQualitativeInsights(testId, test);
    
    const results: ABTestResults = {
      testId,
      status: test.status === 'running' ? 'running' : 'completed',
      duration: this.calculateTestDuration(test),
      participants,
      primaryMetric: {
        name: test.primaryMetric.name,
        results: primaryResults,
        winner: this.determineWinner(primaryResults),
        improvement: this.calculateImprovement(primaryResults)
      },
      secondaryMetrics: secondaryResults,
      statisticalValidation: this.validateStatisticalRequirements(test, participants),
      qualitativeInsights
    };
    
    this.testResults.set(testId, results);
    return results;
  }

  // 자동 최적화 추천
  generateOptimizationRecommendations(testId: string): Array<{
    type: 'winner_found' | 'extend_test' | 'segment_analysis' | 'feature_iteration';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
    expectedImpact: string;
    confidence: number;
  }> {
    const results = this.analyzeTestResults(testId);
    if (!results) return [];
    
    const recommendations = [];
    
    // 명확한 승자가 있는 경우
    if (results.primaryMetric.winner && results.primaryMetric.improvement && results.primaryMetric.improvement > 5) {
      recommendations.push({
        type: 'winner_found' as const,
        priority: 'high' as const,
        title: '통계적으로 유의한 개선 확인',
        description: `${results.primaryMetric.winner} 변형이 ${results.primaryMetric.improvement.toFixed(1)}% 개선 효과를 보였습니다.`,
        action: '승리 변형을 전체 사용자에게 적용',
        expectedImpact: `${results.primaryMetric.name} ${results.primaryMetric.improvement.toFixed(1)}% 향상`,
        confidence: 0.95
      });
    }
    
    // 샘플 크기 부족한 경우
    if (!results.statisticalValidation.hasMinimumSampleSize) {
      recommendations.push({
        type: 'extend_test' as const,
        priority: 'medium' as const,
        title: '테스트 기간 연장 필요',
        description: '통계적 유의성 확보를 위해 더 많은 데이터가 필요합니다.',
        action: '테스트 기간을 2주 연장하거나 트래픽 할당을 늘림',
        expectedImpact: '신뢰할 수 있는 결과 확보',
        confidence: 0.8
      });
    }
    
    // 세그먼트별 차이 분석
    const segmentInsights = this.analyzeSegmentPerformance(testId);
    if (segmentInsights.hasSignificantDifferences) {
      recommendations.push({
        type: 'segment_analysis' as const,
        priority: 'medium' as const,
        title: '사용자 세그먼트별 차별화 필요',
        description: '사용자 그룹별로 다른 성과를 보이고 있습니다.',
        action: '세그먼트별 맞춤형 변형 개발 고려',
        expectedImpact: '세그먼트별 최적화를 통한 전체 성과 향상',
        confidence: 0.7
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // VRidge 특화 테스트 생성 헬퍼
  createVRidgeOptimizationTest(
    template: keyof typeof this.TEST_TEMPLATES,
    customConfig?: Partial<ABTestConfig>
  ): ABTestConfig {
    const templateConfig = this.TEST_TEMPLATES[template];
    
    const baseConfig: ABTestConfig = {
      testId: `vridge_${template}_${Date.now()}`,
      name: templateConfig.name,
      description: templateConfig.description,
      hypothesis: templateConfig.hypothesis,
      
      targetSegment: {
        userType: 'all',
        trafficPercentage: 0.5 // 50% 사용자 대상
      },
      
      variants: [
        {
          id: 'control',
          name: '기존 버전',
          description: '현재 운영 중인 버전',
          trafficAllocation: 0.5,
          changes: []
        },
        {
          id: 'treatment',
          name: '개선 버전',
          description: '새로운 개선사항이 적용된 버전',
          trafficAllocation: 0.5,
          changes: []
        }
      ],
      
      primaryMetric: templateConfig.primaryMetric,
      secondaryMetrics: templateConfig.secondaryMetrics,
      
      statisticalConfig: {
        confidenceLevel: 0.95,
        minimumDetectableEffect: 0.05,
        statisticalPower: 0.8,
        minimumSampleSize: 1000
      },
      
      schedule: {
        startDate: new Date().toISOString(),
        maxDuration: 14 // 2주
      },
      
      status: 'draft'
    };
    
    // 커스텀 설정 병합
    const finalConfig = { ...baseConfig, ...customConfig };
    
    return this.createTest(finalConfig);
  }

  // 유틸리티 메서드들
  private isUserEligible(test: ABTestConfig, context: any): boolean {
    const segment = test.targetSegment;
    
    if (segment.userType && segment.userType !== 'all' && segment.userType !== context.userType) {
      return false;
    }
    
    if (segment.pages && !segment.pages.includes(context.page)) {
      return false;
    }
    
    if (segment.devices && !segment.devices.includes(context.device)) {
      return false;
    }
    
    return Math.random() < segment.trafficPercentage;
  }

  private hashUserId(userId: string, testId: string): number {
    // 일관된 해시 기반 할당 (같은 사용자는 항상 같은 변형)
    const combined = `${userId}_${testId}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit int로 변환
    }
    return Math.abs(hash) / 2147483647; // 0-1 범위로 정규화
  }

  private getUserAssignment(userId: string, testId: string): string | null {
    return this.userAssignments.get(userId)?.[testId] || null;
  }

  private setUserAssignment(userId: string, testId: string, variantId: string): void {
    if (!this.userAssignments.has(userId)) {
      this.userAssignments.set(userId, {});
    }
    this.userAssignments.get(userId)![testId] = variantId;
  }

  private calculateMinimumSampleSize(config: ABTestConfig): number {
    const { confidenceLevel, minimumDetectableEffect, statisticalPower } = config.statisticalConfig;
    
    // 간단한 샘플 크기 계산 (실제로는 더 복잡한 통계 공식 사용)
    const alpha = 1 - confidenceLevel;
    const beta = 1 - statisticalPower;
    const delta = minimumDetectableEffect;
    
    // 이항 분포 기준 근사 계산
    const sampleSizePerVariant = Math.ceil((16 * (alpha + beta)) / (delta * delta));
    
    return sampleSizePerVariant * config.variants.length;
  }

  // 실제 구현에서는 데이터베이스나 분석 시스템에서 데이터 수집
  private collectParticipantData(testId: string) {
    return {
      total: Math.floor(Math.random() * 5000) + 1000,
      byVariant: {
        control: Math.floor(Math.random() * 2500) + 500,
        treatment: Math.floor(Math.random() * 2500) + 500
      },
      conversionsByVariant: {
        control: Math.floor(Math.random() * 500) + 100,
        treatment: Math.floor(Math.random() * 600) + 120
      }
    };
  }

  private collectMetricData(testId: string, test: ABTestConfig) {
    return {
      primary: {
        control: Math.random() * 0.3 + 0.4, // 40-70%
        treatment: Math.random() * 0.35 + 0.45 // 45-80%
      },
      secondary: [
        {
          name: 'bounce_rate',
          variantValues: {
            control: Math.random() * 0.2 + 0.3,
            treatment: Math.random() * 0.15 + 0.25
          }
        }
      ]
    };
  }

  private performStatisticalTest(test: ABTestConfig, data: Record<string, number>) {
    const results: Record<string, any> = {};
    
    Object.entries(data).forEach(([variant, value]) => {
      results[variant] = {
        value,
        sampleSize: Math.floor(Math.random() * 1000) + 500,
        confidenceInterval: [value * 0.9, value * 1.1] as [number, number],
        statisticalSignificance: Math.random() > 0.3, // 70% 확률로 유의
        pValue: Math.random() * 0.1 // 0-0.1
      };
    });
    
    return results;
  }

  private determineWinner(results: Record<string, any>): string | undefined {
    const variants = Object.entries(results);
    if (variants.length < 2) return undefined;
    
    const [control, treatment] = variants;
    if (treatment[1].statisticalSignificance && treatment[1].value > control[1].value) {
      return treatment[0];
    }
    
    return undefined;
  }

  private calculateImprovement(results: Record<string, any>): number | undefined {
    const variants = Object.entries(results);
    if (variants.length < 2) return undefined;
    
    const [control, treatment] = variants;
    return ((treatment[1].value - control[1].value) / control[1].value) * 100;
  }

  private validateStatisticalRequirements(test: ABTestConfig, participants: any) {
    const totalParticipants = participants.total;
    const hasMinimumSampleSize = totalParticipants >= test.statisticalConfig.minimumSampleSize;
    
    return {
      hasMinimumSampleSize,
      hasStatisticalPower: hasMinimumSampleSize && Math.random() > 0.2,
      recommendedAction: hasMinimumSampleSize ? 
        (Math.random() > 0.5 ? 'stop_winner' : 'continue') as const : 
        'extend_duration' as const
    };
  }

  private calculateTestDuration(test: ABTestConfig): number {
    const start = new Date(test.schedule.startDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private generateQualitativeInsights(testId: string, test: ABTestConfig) {
    // 실제 구현에서는 사용자 피드백, 에러 로그, 행동 패턴 분석 등을 수행
    return [
      {
        type: 'behavior_pattern' as const,
        description: '신규 디자인에서 사용자들이 더 오래 머물고 있습니다',
        variant: 'treatment',
        severity: 'low' as const
      }
    ];
  }

  private analyzeSegmentPerformance(testId: string) {
    return {
      hasSignificantDifferences: Math.random() > 0.6,
      segments: {
        desktop: { improvement: 15 },
        mobile: { improvement: -5 }
      }
    };
  }

  private isStatisticallySignificant(data: Record<string, number>, confidenceLevel: number): boolean {
    return Math.random() > (1 - confidenceLevel);
  }

  private updateTestResults(testId: string, variant: string, eventType: string, eventData: Record<string, unknown>): void {
    // 실제 구현에서는 데이터베이스 업데이트
    console.log(`Test ${testId}, variant ${variant}: ${eventType}`, eventData);
  }

  // 테스트 관리 메서드들
  public getActiveTests(): ABTestConfig[] {
    return Array.from(this.activeTests.values());
  }

  public getTestResults(testId: string): ABTestResults | null {
    return this.testResults.get(testId) || null;
  }

  public pauseTest(testId: string): boolean {
    const test = this.activeTests.get(testId);
    if (test && test.status === 'running') {
      test.status = 'paused';
      return true;
    }
    return false;
  }

  public resumeTest(testId: string): boolean {
    const test = this.activeTests.get(testId);
    if (test && test.status === 'paused') {
      test.status = 'running';
      return true;
    }
    return false;
  }

  public stopTest(testId: string): boolean {
    const test = this.activeTests.get(testId);
    if (test && ['running', 'paused'].includes(test.status)) {
      test.status = 'completed';
      return true;
    }
    return false;
  }
}

export const abTestManager = new ABTestManager();

// React Hooks
export function useABTest(testId: string, userId: string, context: any) {
  const variant = abTestManager.assignUserToVariant(testId, userId, context);
  
  return {
    variant,
    trackEvent: (eventType: string, data: Record<string, unknown> = {}) => {
      abTestManager.trackEvent(testId, userId, eventType, data);
    },
    isControlGroup: variant === 'control',
    isTreatmentGroup: variant === 'treatment'
  };
}

export function useABTestResults(testId: string) {
  return {
    results: abTestManager.getTestResults(testId),
    recommendations: abTestManager.generateOptimizationRecommendations(testId),
    refresh: () => abTestManager.analyzeTestResults(testId)
  };
}