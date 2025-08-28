/**
 * 핵심 KPI 관리 시스템
 * VRidge 비즈니스 목표와 연결된 데이터 기반 성과 지표 관리
 */

import { z } from 'zod';
import { behaviorTracker } from './behavior-tracker';

// KPI 정의 스키마
export const KPIDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(['business', 'product', 'technical', 'user_experience']),
  
  // 측정 방식
  calculation: z.object({
    formula: z.string(), // 예: "conversions / visits * 100"
    aggregation: z.enum(['sum', 'average', 'count', 'ratio', 'percentile']),
    timeWindow: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
    dataSource: z.array(z.string()) // 데이터 소스들
  }),
  
  // 목표 설정
  targets: z.object({
    current: z.number(),
    target: z.number(),
    threshold: z.object({
      excellent: z.number(),
      good: z.number(),
      warning: z.number(),
      critical: z.number()
    })
  }),
  
  // 비즈니스 연결
  businessImpact: z.object({
    priority: z.enum(['high', 'medium', 'low']),
    stakeholders: z.array(z.string()),
    revenueImpact: z.enum(['direct', 'indirect', 'none']),
    userImpact: z.enum(['high', 'medium', 'low'])
  }),
  
  // 모니터링 설정
  monitoring: z.object({
    alerting: z.boolean(),
    dashboard: z.boolean(),
    reportFrequency: z.enum(['real-time', 'daily', 'weekly']),
    automatedInsights: z.boolean()
  })
});

export type KPIDefinition = z.infer<typeof KPIDefinitionSchema>;

// KPI 측정값 타입
export interface KPIMetric {
  kpiId: string;
  timestamp: number;
  value: number;
  trend: number; // percentage change
  status: 'excellent' | 'good' | 'warning' | 'critical';
  breakdown?: Record<string, number>; // 세그먼트별 분해
  context?: Record<string, unknown>;
}

// 대시보드 KPI 그룹
export interface KPIDashboard {
  id: string;
  name: string;
  description: string;
  kpis: KPIMetric[];
  summary: {
    overallHealth: 'excellent' | 'good' | 'warning' | 'critical';
    trendsUp: number;
    trendsDown: number;
    actionRequired: number;
  };
  insights: Array<{
    type: 'achievement' | 'concern' | 'opportunity';
    title: string;
    description: string;
    affectedKPIs: string[];
    recommendedActions: string[];
  }>;
}

export class KPIManager {
  private definitions: Map<string, KPIDefinition> = new Map();
  private metrics: Map<string, KPIMetric[]> = new Map(); // kpiId -> historical metrics
  private calculationCache: Map<string, { value: number; timestamp: number }> = new Map();
  
  // VRidge 핵심 KPI 정의
  private readonly VRIDGE_CORE_KPIS: Record<string, Partial<KPIDefinition>> = {
    // 비즈니스 KPI
    'monthly_active_projects': {
      name: '월간 활성 프로젝트 수',
      description: '매월 활발히 사용되는 프로젝트의 수',
      category: 'business',
      calculation: {
        formula: 'count(distinct projects where last_activity > 30_days_ago)',
        aggregation: 'count',
        timeWindow: 'monthly',
        dataSource: ['project_activity', 'user_sessions']
      },
      targets: {
        current: 0,
        target: 500,
        threshold: { excellent: 600, good: 500, warning: 400, critical: 300 }
      },
      businessImpact: {
        priority: 'high',
        stakeholders: ['product', 'business', 'engineering'],
        revenueImpact: 'direct',
        userImpact: 'high'
      }
    },
    
    'project_creation_rate': {
      name: '프로젝트 생성 완료율',
      description: '프로젝트 생성을 시작한 사용자 중 성공적으로 완료한 비율',
      category: 'product',
      calculation: {
        formula: 'project_creations_completed / project_creation_attempts * 100',
        aggregation: 'ratio',
        timeWindow: 'daily',
        dataSource: ['user_journey_events', 'project_creation_flows']
      },
      targets: {
        current: 0,
        target: 85,
        threshold: { excellent: 90, good: 85, warning: 75, critical: 65 }
      },
      businessImpact: {
        priority: 'high',
        stakeholders: ['product', 'ux'],
        revenueImpact: 'direct',
        userImpact: 'high'
      }
    },
    
    'video_feedback_engagement': {
      name: '비디오 피드백 참여율',
      description: '피드백 요청을 받은 사용자 중 실제로 피드백을 제공한 비율',
      category: 'product',
      calculation: {
        formula: 'feedback_submissions / feedback_requests * 100',
        aggregation: 'ratio',
        timeWindow: 'weekly',
        dataSource: ['feedback_events', 'user_notifications']
      },
      targets: {
        current: 0,
        target: 70,
        threshold: { excellent: 80, good: 70, warning: 60, critical: 50 }
      },
      businessImpact: {
        priority: 'high',
        stakeholders: ['product', 'customer_success'],
        revenueImpact: 'indirect',
        userImpact: 'high'
      }
    },
    
    'submenu_effectiveness': {
      name: '서브메뉴 효과성 지수',
      description: '서브메뉴를 통한 사용자의 목표 달성 효율성',
      category: 'user_experience',
      calculation: {
        formula: 'submenu_successful_navigations / total_submenu_interactions * 100',
        aggregation: 'ratio',
        timeWindow: 'daily',
        dataSource: ['submenu_analytics', 'navigation_events']
      },
      targets: {
        current: 0,
        target: 75,
        threshold: { excellent: 85, good: 75, warning: 65, critical: 55 }
      },
      businessImpact: {
        priority: 'medium',
        stakeholders: ['ux', 'product'],
        revenueImpact: 'indirect',
        userImpact: 'medium'
      }
    },
    
    // 기술적 KPI
    'system_performance_score': {
      name: '시스템 성능 점수',
      description: 'Core Web Vitals 기반 전체 시스템 성능 점수',
      category: 'technical',
      calculation: {
        formula: 'weighted_average(lcp_score * 0.4 + fid_score * 0.3 + cls_score * 0.3)',
        aggregation: 'average',
        timeWindow: 'hourly',
        dataSource: ['performance_metrics', 'user_sessions']
      },
      targets: {
        current: 0,
        target: 85,
        threshold: { excellent: 90, good: 85, warning: 75, critical: 60 }
      },
      businessImpact: {
        priority: 'high',
        stakeholders: ['engineering', 'devops'],
        revenueImpact: 'indirect',
        userImpact: 'high'
      }
    },
    
    'api_reliability_rate': {
      name: 'API 신뢰성 지수',
      description: 'API 응답 성공률 및 응답 시간 기반 신뢰성 점수',
      category: 'technical',
      calculation: {
        formula: '(success_rate * 0.7 + response_time_score * 0.3) * 100',
        aggregation: 'average',
        timeWindow: 'hourly',
        dataSource: ['api_monitoring', 'error_logs']
      },
      targets: {
        current: 0,
        target: 95,
        threshold: { excellent: 98, good: 95, warning: 90, critical: 85 }
      },
      businessImpact: {
        priority: 'high',
        stakeholders: ['engineering', 'devops', 'product'],
        revenueImpact: 'indirect',
        userImpact: 'high'
      }
    },
    
    // 사용자 경험 KPI
    'user_satisfaction_score': {
      name: '사용자 만족도 점수',
      description: '사용자 행동 및 피드백 기반 종합 만족도 점수',
      category: 'user_experience',
      calculation: {
        formula: 'weighted_score(completion_rates, session_duration, bounce_rate, explicit_feedback)',
        aggregation: 'average',
        timeWindow: 'weekly',
        dataSource: ['user_behavior', 'feedback_surveys', 'session_data']
      },
      targets: {
        current: 0,
        target: 80,
        threshold: { excellent: 85, good: 80, warning: 70, critical: 60 }
      },
      businessImpact: {
        priority: 'high',
        stakeholders: ['product', 'ux', 'customer_success'],
        revenueImpact: 'indirect',
        userImpact: 'high'
      }
    },
    
    'feature_adoption_velocity': {
      name: '기능 도입 속도',
      description: '새로운 기능이 출시 후 목표 사용률에 도달하는 속도',
      category: 'product',
      calculation: {
        formula: 'days_to_reach_target_adoption_rate',
        aggregation: 'average',
        timeWindow: 'monthly',
        dataSource: ['feature_usage', 'user_cohorts']
      },
      targets: {
        current: 0,
        target: 14, // 2주 내 목표 달성
        threshold: { excellent: 7, good: 14, warning: 21, critical: 30 }
      },
      businessImpact: {
        priority: 'medium',
        stakeholders: ['product', 'engineering'],
        revenueImpact: 'indirect',
        userImpact: 'medium'
      }
    }
  };

  constructor() {
    this.initializeCoreKPIs();
  }

  // 핵심 KPI 초기화
  private initializeCoreKPIs(): void {
    Object.entries(this.VRIDGE_CORE_KPIS).forEach(([id, partialDefinition]) => {
      const fullDefinition: KPIDefinition = {
        id,
        monitoring: {
          alerting: true,
          dashboard: true,
          reportFrequency: 'daily',
          automatedInsights: true
        },
        ...partialDefinition
      } as KPIDefinition;
      
      this.definitions.set(id, fullDefinition);
    });
  }

  // KPI 값 계산 및 업데이트
  async calculateKPIs(timeWindow?: string): Promise<Map<string, KPIMetric>> {
    const results = new Map<string, KPIMetric>();
    const timestamp = Date.now();
    
    for (const [kpiId, definition] of this.definitions) {
      try {
        const value = await this.calculateKPIValue(kpiId, definition);
        const trend = await this.calculateTrend(kpiId, value);
        const status = this.determineStatus(value, definition.targets.threshold);
        const breakdown = await this.calculateBreakdown(kpiId, definition);
        
        const metric: KPIMetric = {
          kpiId,
          timestamp,
          value,
          trend,
          status,
          breakdown,
          context: {
            calculationTime: timestamp,
            dataFreshness: await this.getDataFreshness(definition.calculation.dataSource)
          }
        };
        
        // 히스토리에 추가
        if (!this.metrics.has(kpiId)) {
          this.metrics.set(kpiId, []);
        }
        this.metrics.get(kpiId)!.push(metric);
        
        // 최근 100개만 유지
        const history = this.metrics.get(kpiId)!;
        if (history.length > 100) {
          this.metrics.set(kpiId, history.slice(-100));
        }
        
        results.set(kpiId, metric);
        
        // 캐시 업데이트
        this.calculationCache.set(kpiId, { value, timestamp });
        
        // 알림 체크
        if (definition.monitoring.alerting && (status === 'warning' || status === 'critical')) {
          await this.triggerKPIAlert(kpiId, metric, definition);
        }
        
      } catch (error) {
        console.error(`KPI 계산 실패 (${kpiId}):`, error);
      }
    }
    
    return results;
  }

  // 개별 KPI 값 계산
  private async calculateKPIValue(kpiId: string, definition: KPIDefinition): Promise<number> {
    // 실제 환경에서는 데이터 소스에서 데이터를 가져와서 계산
    // 여기서는 시뮬레이션 로직
    
    switch (kpiId) {
      case 'monthly_active_projects':
        return Math.floor(Math.random() * 200) + 400; // 400-600
        
      case 'project_creation_rate':
        return Math.random() * 20 + 70; // 70-90%
        
      case 'video_feedback_engagement':
        return Math.random() * 30 + 55; // 55-85%
        
      case 'submenu_effectiveness':
        return Math.random() * 25 + 60; // 60-85%
        
      case 'system_performance_score':
        // Core Web Vitals 기반 계산
        const lcp = Math.random() * 1000 + 2000; // 2000-3000ms
        const fid = Math.random() * 50 + 50; // 50-100ms
        const cls = Math.random() * 0.1 + 0.05; // 0.05-0.15
        
        const lcpScore = Math.max(0, 100 - (lcp - 2500) / 25);
        const fidScore = Math.max(0, 100 - (fid - 100) / 2);
        const clsScore = Math.max(0, 100 - (cls - 0.1) / 0.002);
        
        return lcpScore * 0.4 + fidScore * 0.3 + clsScore * 0.3;
        
      case 'api_reliability_rate':
        const successRate = Math.random() * 0.1 + 0.9; // 90-100%
        const avgResponseTime = Math.random() * 200 + 100; // 100-300ms
        const responseTimeScore = Math.max(0, 100 - (avgResponseTime - 200) / 5);
        
        return (successRate * 100 * 0.7) + (responseTimeScore * 0.3);
        
      case 'user_satisfaction_score':
        // 복합 점수 계산
        const completionRate = Math.random() * 0.3 + 0.6; // 60-90%
        const avgSessionDuration = Math.random() * 300 + 180; // 3-8분
        const bounceRate = Math.random() * 0.4 + 0.2; // 20-60%
        
        return (completionRate * 40) + 
               (Math.min(avgSessionDuration / 300, 1) * 30) + 
               ((1 - bounceRate) * 30);
        
      case 'feature_adoption_velocity':
        return Math.floor(Math.random() * 20) + 5; // 5-25일
        
      default:
        return Math.random() * 100; // 기본값
    }
  }

  // 트렌드 계산
  private async calculateTrend(kpiId: string, currentValue: number): Promise<number> {
    const history = this.metrics.get(kpiId);
    if (!history || history.length < 2) return 0;
    
    const previousValue = history[history.length - 1].value;
    return ((currentValue - previousValue) / previousValue) * 100;
  }

  // 상태 판정
  private determineStatus(value: number, thresholds: KPIDefinition['targets']['threshold']): KPIMetric['status'] {
    if (value >= thresholds.excellent) return 'excellent';
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.warning) return 'warning';
    return 'critical';
  }

  // 세그먼트별 분해 계산
  private async calculateBreakdown(kpiId: string, definition: KPIDefinition): Promise<Record<string, number> | undefined> {
    // 실제 환경에서는 세그먼트별 데이터 수집
    const segments = ['desktop', 'mobile', 'tablet'];
    const breakdown: Record<string, number> = {};
    
    segments.forEach(segment => {
      breakdown[segment] = Math.random() * 100;
    });
    
    return breakdown;
  }

  // 데이터 신선도 확인
  private async getDataFreshness(dataSources: string[]): Promise<number> {
    // 실제로는 각 데이터 소스의 마지막 업데이트 시간 확인
    return Date.now() - (Math.random() * 3600000); // 최대 1시간 전
  }

  // KPI 알림 발송
  private async triggerKPIAlert(kpiId: string, metric: KPIMetric, definition: KPIDefinition): Promise<void> {
    const severity = metric.status === 'critical' ? 'high' : 'medium';
    
    behaviorTracker.track({
      category: 'kpi_monitoring',
      action: 'kpi_alert_triggered',
      label: kpiId,
      customProperties: {
        kpiName: definition.name,
        currentValue: metric.value,
        status: metric.status,
        trend: metric.trend,
        severity
      }
    });

    // 실제 알림 발송 (Slack, 이메일 등)
    console.warn(`🚨 KPI Alert: ${definition.name}`);
    console.warn(`현재 값: ${metric.value.toFixed(2)}, 상태: ${metric.status}`);
    console.warn(`트렌드: ${metric.trend.toFixed(1)}%`);
    
    // 이메일이나 Slack으로 stakeholder들에게 알림
    for (const stakeholder of definition.businessImpact.stakeholders) {
      console.log(`알림 발송: ${stakeholder}@vridge.com`);
    }
  }

  // 대시보드 생성
  generateDashboard(dashboardConfig: {
    id: string;
    name: string;
    description: string;
    kpiIds: string[];
  }): KPIDashboard | null {
    const kpis: KPIMetric[] = [];
    let excellentCount = 0;
    let goodCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let trendsUp = 0;
    let trendsDown = 0;

    for (const kpiId of dashboardConfig.kpiIds) {
      const history = this.metrics.get(kpiId);
      if (history && history.length > 0) {
        const latest = history[history.length - 1];
        kpis.push(latest);

        // 상태 집계
        switch (latest.status) {
          case 'excellent': excellentCount++; break;
          case 'good': goodCount++; break;
          case 'warning': warningCount++; break;
          case 'critical': criticalCount++; break;
        }

        // 트렌드 집계
        if (latest.trend > 2) trendsUp++;
        else if (latest.trend < -2) trendsDown++;
      }
    }

    if (kpis.length === 0) return null;

    // 전체 건강도 판정
    const totalKpis = kpis.length;
    const healthScore = (excellentCount * 4 + goodCount * 3 + warningCount * 2 + criticalCount * 1) / (totalKpis * 4);
    
    let overallHealth: KPIDashboard['summary']['overallHealth'];
    if (healthScore >= 0.8) overallHealth = 'excellent';
    else if (healthScore >= 0.6) overallHealth = 'good';
    else if (healthScore >= 0.4) overallHealth = 'warning';
    else overallHealth = 'critical';

    // 인사이트 생성
    const insights = this.generateDashboardInsights(kpis, dashboardConfig.kpiIds);

    return {
      id: dashboardConfig.id,
      name: dashboardConfig.name,
      description: dashboardConfig.description,
      kpis,
      summary: {
        overallHealth,
        trendsUp,
        trendsDown,
        actionRequired: criticalCount + warningCount
      },
      insights
    };
  }

  // 대시보드 인사이트 생성
  private generateDashboardInsights(kpis: KPIMetric[], kpiIds: string[]): KPIDashboard['insights'] {
    const insights: KPIDashboard['insights'] = [];

    // 우수한 성과 식별
    const excellentKpis = kpis.filter(kpi => kpi.status === 'excellent');
    if (excellentKpis.length > 0) {
      insights.push({
        type: 'achievement',
        title: '우수한 성과 달성',
        description: `${excellentKpis.length}개 지표가 목표를 크게 상회하고 있습니다.`,
        affectedKPIs: excellentKpis.map(kpi => kpi.kpiId),
        recommendedActions: ['성공 요인 분석 및 다른 영역에 적용', '목표 상향 조정 검토']
      });
    }

    // 개선이 필요한 영역 식별
    const criticalKpis = kpis.filter(kpi => kpi.status === 'critical');
    if (criticalKpis.length > 0) {
      insights.push({
        type: 'concern',
        title: '즉시 개선 필요',
        description: `${criticalKpis.length}개 지표가 임계 수준에 도달했습니다.`,
        affectedKPIs: criticalKpis.map(kpi => kpi.kpiId),
        recommendedActions: ['원인 분석 및 개선 계획 수립', '리소스 재배치 검토', '긴급 대응팀 구성']
      });
    }

    // 개선 기회 식별
    const improvingKpis = kpis.filter(kpi => kpi.trend > 10);
    if (improvingKpis.length > 0) {
      insights.push({
        type: 'opportunity',
        title: '개선 모멘텀 확보',
        description: `${improvingKpis.length}개 지표가 상승 추세를 보이고 있습니다.`,
        affectedKPIs: improvingKpis.map(kpi => kpi.kpiId),
        recommendedActions: ['성공 요인 강화', '추가 투자 검토', '베스트 프랙티스 문서화']
      });
    }

    return insights;
  }

  // KPI 목표 업데이트
  updateKPITarget(kpiId: string, newTarget: number, reason?: string): boolean {
    const definition = this.definitions.get(kpiId);
    if (!definition) return false;

    const oldTarget = definition.targets.target;
    definition.targets.target = newTarget;

    // 임계값도 비례적으로 조정
    const ratio = newTarget / oldTarget;
    definition.targets.threshold.excellent *= ratio;
    definition.targets.threshold.good *= ratio;
    definition.targets.threshold.warning *= ratio;
    definition.targets.threshold.critical *= ratio;

    behaviorTracker.track({
      category: 'kpi_management',
      action: 'target_updated',
      label: kpiId,
      customProperties: {
        oldTarget,
        newTarget,
        reason: reason || 'Manual update'
      }
    });

    return true;
  }

  // 핵심 대시보드 생성 헬퍼
  createExecutiveDashboard(): KPIDashboard | null {
    return this.generateDashboard({
      id: 'executive_dashboard',
      name: 'VRidge 경영진 대시보드',
      description: '핵심 비즈니스 지표 모니터링',
      kpiIds: [
        'monthly_active_projects',
        'project_creation_rate',
        'video_feedback_engagement',
        'user_satisfaction_score'
      ]
    });
  }

  createTechnicalDashboard(): KPIDashboard | null {
    return this.generateDashboard({
      id: 'technical_dashboard',
      name: '기술 성능 대시보드',
      description: '시스템 안정성 및 성능 모니터링',
      kpiIds: [
        'system_performance_score',
        'api_reliability_rate',
        'submenu_effectiveness'
      ]
    });
  }

  createProductDashboard(): KPIDashboard | null {
    return this.generateDashboard({
      id: 'product_dashboard',
      name: '제품 성과 대시보드',
      description: '제품 사용성 및 기능 효과성 모니터링',
      kpiIds: [
        'project_creation_rate',
        'video_feedback_engagement',
        'submenu_effectiveness',
        'feature_adoption_velocity'
      ]
    });
  }

  // 공개 API
  public getKPIDefinitions(): KPIDefinition[] {
    return Array.from(this.definitions.values());
  }

  public getKPIMetrics(kpiId: string): KPIMetric[] {
    return this.metrics.get(kpiId) || [];
  }

  public getCurrentKPIValue(kpiId: string): KPIMetric | null {
    const history = this.metrics.get(kpiId);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  public addCustomKPI(definition: KPIDefinition): boolean {
    if (this.definitions.has(definition.id)) return false;
    
    const validated = KPIDefinitionSchema.parse(definition);
    this.definitions.set(definition.id, validated);
    return true;
  }
}

export const kpiManager = new KPIManager();

// React Hooks
export function useKPIDashboard(dashboardType: 'executive' | 'technical' | 'product' | 'custom', customKpiIds?: string[]) {
  let dashboard: KPIDashboard | null = null;
  
  switch (dashboardType) {
    case 'executive':
      dashboard = kpiManager.createExecutiveDashboard();
      break;
    case 'technical':
      dashboard = kpiManager.createTechnicalDashboard();
      break;
    case 'product':
      dashboard = kpiManager.createProductDashboard();
      break;
    case 'custom':
      if (customKpiIds) {
        dashboard = kpiManager.generateDashboard({
          id: 'custom_dashboard',
          name: '커스텀 대시보드',
          description: '사용자 정의 KPI 모니터링',
          kpiIds: customKpiIds
        });
      }
      break;
  }
  
  return {
    dashboard,
    refresh: () => kpiManager.calculateKPIs(),
    updateTarget: (kpiId: string, target: number, reason?: string) => 
      kpiManager.updateKPITarget(kpiId, target, reason)
  };
}

export function useKPIMetrics(kpiId: string) {
  const current = kpiManager.getCurrentKPIValue(kpiId);
  const history = kpiManager.getKPIMetrics(kpiId);
  const definition = kpiManager.getKPIDefinitions().find(def => def.id === kpiId);
  
  return {
    current,
    history,
    definition,
    isHealthy: current ? ['excellent', 'good'].includes(current.status) : false,
    needsAttention: current ? ['warning', 'critical'].includes(current.status) : false
  };
}