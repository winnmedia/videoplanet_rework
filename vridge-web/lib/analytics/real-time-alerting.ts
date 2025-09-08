// @ts-nocheck
/**
 * 실시간 UX/성능 알림 시스템
 * 데이터 기반 임계값 모니터링 및 즉시 알림
 */

import { behaviorTracker } from './behavior-tracker';

import { alertManager } from '@/lib/api/monitoring';


// 알림 규칙 타입 정의
export interface AlertRule {
  id: string;
  name: string;
  category: 'performance' | 'usability' | 'error' | 'business';
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'rate_of_change';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  recipients: string[];
  slackWebhook?: string;
  emailTemplate?: string;
}

export interface AlertEvent {
  ruleId: string;
  ruleName: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
  context: Record<string, unknown>;
  affectedUsers?: number;
  businessImpact?: string;
}

export class RealTimeAlertSystem {
  private rules: Map<string, AlertRule> = new Map();
  private alertHistory: Map<string, number> = new Map(); // 쿨다운 추적
  private metricBuffer: Map<string, Array<{ value: number; timestamp: number }>> = new Map();
  private isRunning = false;

  constructor() {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  // 기본 알림 규칙 초기화
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      // 성능 관련 알림
      {
        id: 'high_lcp',
        name: 'LCP 성능 저하',
        category: 'performance',
        metric: 'lcp_p95',
        condition: 'greater_than',
        threshold: 3000, // 3초
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 15,
        recipients: ['dev-team@vridge.com'],
        slackWebhook: process.env.SLACK_PERFORMANCE_WEBHOOK
      },
      {
        id: 'critical_lcp',
        name: 'LCP 심각한 성능 저하',
        category: 'performance',
        metric: 'lcp_p95',
        condition: 'greater_than',
        threshold: 5000, // 5초
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
        recipients: ['dev-team@vridge.com', 'product@vridge.com'],
        slackWebhook: process.env.SLACK_CRITICAL_WEBHOOK
      },
      
      // 사용성 관련 알림
      {
        id: 'low_completion_rate',
        name: '여정 완료율 급감',
        category: 'usability',
        metric: 'journey_completion_rate',
        condition: 'less_than',
        threshold: 0.7, // 70%
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 30,
        recipients: ['ux-team@vridge.com', 'product@vridge.com']
      },
      {
        id: 'high_frustration_events',
        name: '사용자 좌절 이벤트 급증',
        category: 'usability',
        metric: 'frustration_events_per_hour',
        condition: 'greater_than',
        threshold: 50,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 20,
        recipients: ['ux-team@vridge.com']
      },
      
      // 에러 관련 알림
      {
        id: 'high_error_rate',
        name: 'API 에러율 급증',
        category: 'error',
        metric: 'api_error_rate',
        condition: 'greater_than',
        threshold: 0.05, // 5%
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 10,
        recipients: ['dev-team@vridge.com', 'ops@vridge.com'],
        slackWebhook: process.env.SLACK_ERROR_WEBHOOK
      },
      
      // 비즈니스 영향 알림
      {
        id: 'project_creation_drop',
        name: '프로젝트 생성률 급감',
        category: 'business',
        metric: 'project_creation_rate_hourly',
        condition: 'rate_of_change',
        threshold: -0.3, // 30% 감소
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 60,
        recipients: ['product@vridge.com', 'business@vridge.com']
      },
      
      // 서브메뉴 관련 알림
      {
        id: 'submenu_abandonment',
        name: '서브메뉴 이탈률 증가',
        category: 'usability',
        metric: 'submenu_abandonment_rate',
        condition: 'greater_than',
        threshold: 0.6, // 60%
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 45,
        recipients: ['ux-team@vridge.com']
      }
    ];

    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
    });
  }

  // 모니터링 시작
  private startMonitoring(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1분마다 메트릭 수집 및 평가
    setInterval(() => {
      this.collectAndEvaluateMetrics();
    }, 60000);

    // 실시간 이벤트 리스너 등록
    this.setupRealTimeListeners();
  }

  // 실시간 이벤트 리스너 설정
  private setupRealTimeListeners(): void {
    // 성능 이벤트 리스너
    alertManager.subscribe('performance_degradation', (event) => {
      this.evaluateMetric('lcp_p95', event.lcp, {
        page: event.page,
        userAgent: event.userAgent,
        timestamp: Date.now()
      });
    });

    // 사용자 행동 이벤트 리스너
    alertManager.subscribe('user_frustration', (event) => {
      this.evaluateMetric('frustration_events_per_hour', event.count, {
        type: event.type,
        page: event.page,
        timestamp: Date.now()
      });
    });

    // API 에러 이벤트 리스너
    alertManager.subscribe('api_error', (event) => {
      this.evaluateMetric('api_error_rate', event.errorRate, {
        endpoint: event.endpoint,
        statusCode: event.statusCode,
        timestamp: Date.now()
      });
    });
  }

  // 메트릭 수집 및 평가
  private async collectAndEvaluateMetrics(): Promise<void> {
    try {
      // 각종 메트릭 수집
      const metrics = await this.collectCurrentMetrics();
      
      // 각 룰에 대해 평가
      for (const [ruleId, rule] of this.rules.entries()) {
        if (!rule.enabled) continue;
        
        const metricValue = metrics[rule.metric];
        if (metricValue !== undefined) {
          await this.evaluateRule(rule, metricValue, { source: 'periodic_check' });
        }
      }
    } catch (error) {
      console.error('메트릭 수집 중 에러:', error);
    }
  }

  // 현재 메트릭 수집
  private async collectCurrentMetrics(): Promise<Record<string, number>> {
    // 실제 환경에서는 다양한 소스에서 메트릭을 수집
    // 여기서는 시뮬레이션 데이터 반환
    
    const metrics: Record<string, number> = {};
    
    try {
      // 성능 메트릭 (모니터링 API에서 수집)
      const performanceResponse = await fetch('/api/monitoring');
      const performanceData = await performanceResponse.json();
      
      if (performanceData.success) {
        // LCP P95 계산
        const recentMetrics = performanceData.data.recentMetrics.slice(-100);
        if (recentMetrics.length > 0) {
          const lcpValues = recentMetrics.map((m: any) => m.lcp).filter(Boolean).sort((a: number, b: number) => a - b);
          if (lcpValues.length > 0) {
            metrics.lcp_p95 = lcpValues[Math.floor(lcpValues.length * 0.95)];
          }
        }
        
        // API 에러율
        const errorStats = performanceData.data.errorStats;
        const totalRequests = Object.values(performanceData.data.performanceSummary)
          .reduce((sum: number, stat: any) => sum + stat.totalRequests, 0);
        const totalErrors = Object.values(errorStats).reduce((sum: number, count: any) => sum + count, 0);
        metrics.api_error_rate = totalRequests > 0 ? totalErrors / totalRequests : 0;
      }
      
      // 사용자 여정 메트릭 (여정 API에서 수집)
      const journeyResponse = await fetch('/api/analytics/user-journey');
      const journeyData = await journeyResponse.json();
      
      if (journeyData.success) {
        metrics.journey_completion_rate = journeyData.data.summary.avgCompletionRate;
        
        // 비즈니스 메트릭
        const projectJourney = journeyData.data.journeyTypes['project_creation_journey'];
        if (projectJourney) {
          metrics.project_creation_rate_hourly = projectJourney.count / 24; // 일일 평균을 시간당으로 변환
        }
      }
      
      // 서브메뉴 관련 메트릭 (시뮬레이션)
      metrics.submenu_abandonment_rate = Math.random() * 0.4 + 0.3; // 30-70%
      metrics.frustration_events_per_hour = Math.random() * 30 + 10; // 10-40개
      
    } catch (error) {
      console.warn('일부 메트릭 수집 실패:', error);
    }
    
    return metrics;
  }

  // 개별 메트릭 평가 (실시간 호출용)
  public async evaluateMetric(metricName: string, value: number, context: Record<string, unknown>): Promise<void> {
    // 메트릭 버퍼에 추가
    if (!this.metricBuffer.has(metricName)) {
      this.metricBuffer.set(metricName, []);
    }
    
    const buffer = this.metricBuffer.get(metricName)!;
    buffer.push({ value, timestamp: Date.now() });
    
    // 5분 이상 된 데이터는 제거
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.metricBuffer.set(metricName, buffer.filter(item => item.timestamp > fiveMinutesAgo));
    
    // 해당 메트릭과 관련된 룰들 평가
    for (const [ruleId, rule] of this.rules.entries()) {
      if (rule.metric === metricName && rule.enabled) {
        await this.evaluateRule(rule, value, context);
      }
    }
  }

  // 룰 평가
  private async evaluateRule(rule: AlertRule, currentValue: number, context: Record<string, unknown>): Promise<void> {
    // 쿨다운 체크
    const lastAlert = this.alertHistory.get(rule.id);
    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    
    if (lastAlert && Date.now() - lastAlert < cooldownMs) {
      return; // 쿨다운 중
    }

    let shouldAlert = false;

    // 조건 평가
    switch (rule.condition) {
      case 'greater_than':
        shouldAlert = currentValue > rule.threshold;
        break;
      case 'less_than':
        shouldAlert = currentValue < rule.threshold;
        break;
      case 'equals':
        shouldAlert = currentValue === rule.threshold;
        break;
      case 'not_equals':
        shouldAlert = currentValue !== rule.threshold;
        break;
      case 'rate_of_change':
        shouldAlert = await this.evaluateRateOfChange(rule.metric, rule.threshold);
        break;
    }

    if (shouldAlert) {
      await this.triggerAlert({
        ruleId: rule.id,
        ruleName: rule.name,
        metric: rule.metric,
        currentValue,
        threshold: rule.threshold,
        severity: rule.severity,
        timestamp: Date.now(),
        context,
        affectedUsers: await this.estimateAffectedUsers(rule.metric, currentValue),
        businessImpact: this.assessBusinessImpact(rule.category, rule.metric, currentValue)
      }, rule);

      // 쿨다운 시작
      this.alertHistory.set(rule.id, Date.now());
    }
  }

  // 변화율 평가
  private async evaluateRateOfChange(metricName: string, threshold: number): Promise<boolean> {
    const buffer = this.metricBuffer.get(metricName);
    if (!buffer || buffer.length < 2) return false;

    // 최근 5분간의 평균과 그 이전 5분간의 평균 비교
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const tenMinutesAgo = now - 10 * 60 * 1000;

    const recent = buffer.filter(item => item.timestamp > fiveMinutesAgo);
    const previous = buffer.filter(item => item.timestamp > tenMinutesAgo && item.timestamp <= fiveMinutesAgo);

    if (recent.length === 0 || previous.length === 0) return false;

    const recentAvg = recent.reduce((sum, item) => sum + item.value, 0) / recent.length;
    const previousAvg = previous.reduce((sum, item) => sum + item.value, 0) / previous.length;

    if (previousAvg === 0) return false;

    const changeRate = (recentAvg - previousAvg) / previousAvg;
    return changeRate <= threshold; // threshold가 음수면 감소 감지
  }

  // 영향받는 사용자 수 추정
  private async estimateAffectedUsers(metric: string, value: number): Promise<number> {
    // 실제 환경에서는 세션 데이터 기반으로 계산
    const activeUsers = 1000; // 현재 활성 사용자 수 (예시)
    
    switch (metric) {
      case 'lcp_p95':
        return Math.round(activeUsers * 0.8); // 성능 저하는 대부분 사용자에게 영향
      case 'api_error_rate':
        return Math.round(activeUsers * value); // 에러율만큼 영향
      case 'journey_completion_rate':
        return Math.round(activeUsers * (1 - value)); // 미완료율만큼 영향
      default:
        return Math.round(activeUsers * 0.5);
    }
  }

  // 비즈니스 영향 평가
  private assessBusinessImpact(category: string, metric: string, value: number): string {
    switch (category) {
      case 'performance':
        if (metric.includes('lcp') && value > 4000) {
          return '페이지 이탈률 25% 증가 예상, 컨버전 15% 감소 가능';
        }
        return '사용자 경험 저하로 인한 이탈 가능성';
        
      case 'usability':
        if (metric.includes('completion') && value < 0.6) {
          return '주요 기능 사용률 급감, 매출에 직접적 영향 가능';
        }
        return '사용자 만족도 저하 및 재방문율 감소';
        
      case 'error':
        return '서비스 신뢰도 저하, 고객 지원 문의 증가 예상';
        
      case 'business':
        return '핵심 지표 악화, 즉시 대응 필요';
        
      default:
        return '서비스 품질에 부정적 영향';
    }
  }

  // 알림 발송
  private async triggerAlert(alert: AlertEvent, rule: AlertRule): Promise<void> {
    try {
      // 콘솔 로그 (개발 환경)
      const severityEmoji = { info: '📘', warning: '⚠️', critical: '🚨' };
      console.warn(`${severityEmoji[alert.severity]} ${alert.ruleName}`);
      console.warn(`메트릭: ${alert.metric} = ${alert.currentValue} (임계값: ${alert.threshold})`);
      console.warn(`영향받는 사용자: ~${alert.affectedUsers}명`);
      console.warn(`비즈니스 영향: ${alert.businessImpact}`);

      // Slack 알림
      if (rule.slackWebhook) {
        await this.sendSlackAlert(alert, rule);
      }

      // 이메일 알림
      if (rule.recipients.length > 0) {
        await this.sendEmailAlert(alert, rule);
      }

      // 내부 알림 시스템으로 전파
      alertManager.emit('ux_alert_triggered', {
        alert,
        rule,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('알림 발송 실패:', error);
    }
  }

  // Slack 알림 발송
  private async sendSlackAlert(alert: AlertEvent, rule: AlertRule): Promise<void> {
    if (!rule.slackWebhook) return;

    const color = { info: '#36a64f', warning: '#ff9500', critical: '#ff0000' };
    const message = {
      attachments: [{
        color: color[alert.severity],
        title: `🚨 ${alert.ruleName}`,
        fields: [
          {
            title: '메트릭',
            value: `${alert.metric}: ${alert.currentValue}`,
            short: true
          },
          {
            title: '임계값',
            value: alert.threshold.toString(),
            short: true
          },
          {
            title: '영향받는 사용자',
            value: `~${alert.affectedUsers}명`,
            short: true
          },
          {
            title: '심각도',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: '비즈니스 영향',
            value: alert.businessImpact,
            short: false
          }
        ],
        footer: 'VRidge UX 모니터링',
        ts: Math.floor(alert.timestamp / 1000)
      }]
    };

    try {
      await fetch(rule.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error('Slack 알림 발송 실패:', error);
    }
  }

  // 이메일 알림 발송
  private async sendEmailAlert(alert: AlertEvent, rule: AlertRule): Promise<void> {
    // 실제 환경에서는 이메일 서비스(SendGrid, SES 등) 연동
    console.log(`이메일 알림 발송: ${rule.recipients.join(', ')}`);
    console.log(`제목: [${alert.severity.toUpperCase()}] ${alert.ruleName}`);
    console.log(`내용: ${alert.metric} 값이 ${alert.currentValue}로 임계값 ${alert.threshold}를 초과했습니다.`);
  }

  // 알림 룰 관리
  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.alertHistory.delete(ruleId);
  }

  public updateRule(ruleId: string, updates: Partial<AlertRule>): void {
    const existing = this.rules.get(ruleId);
    if (existing) {
      this.rules.set(ruleId, { ...existing, ...updates });
    }
  }

  public getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  // 알림 히스토리 조회
  public getAlertHistory(hours = 24): Array<{ ruleId: string; timestamp: number }> {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return Array.from(this.alertHistory.entries())
      .filter(([_, timestamp]) => timestamp > cutoff)
      .map(([ruleId, timestamp]) => ({ ruleId, timestamp }));
  }

  // 시스템 중지
  public stop(): void {
    this.isRunning = false;
  }
}

export const realTimeAlertSystem = new RealTimeAlertSystem();

// React Hook
export function useRealTimeAlerts() {
  return {
    getRules: realTimeAlertSystem.getRules.bind(realTimeAlertSystem),
    addRule: realTimeAlertSystem.addRule.bind(realTimeAlertSystem),
    updateRule: realTimeAlertSystem.updateRule.bind(realTimeAlertSystem),
    removeRule: realTimeAlertSystem.removeRule.bind(realTimeAlertSystem),
    getHistory: realTimeAlertSystem.getAlertHistory.bind(realTimeAlertSystem),
    evaluateMetric: realTimeAlertSystem.evaluateMetric.bind(realTimeAlertSystem)
  };
}