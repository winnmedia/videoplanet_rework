/**
 * Performance Alert System
 * Monitors performance regressions and sends alerts
 */

import { z } from 'zod';
import type { WebVitalMetric } from './webVitals';
import type { RUMMetric } from './rumCollector';

// Alert configuration schema
const AlertConfigSchema = z.object({
  enabled: z.boolean(),
  thresholds: z.object({
    lcp: z.object({
      warning: z.number(),
      critical: z.number(),
    }),
    inp: z.object({
      warning: z.number(),
      critical: z.number(),
    }),
    cls: z.object({
      warning: z.number(),
      critical: z.number(),
    }),
    fcp: z.object({
      warning: z.number(),
      critical: z.number(),
    }),
  }),
  channels: z.object({
    console: z.boolean(),
    browser: z.boolean(),
    webhook: z.boolean(),
    email: z.boolean(),
  }),
  regressionDetection: z.object({
    enabled: z.boolean(),
    windowSize: z.number(),
    threshold: z.number(),
  }),
  rateLimiting: z.object({
    maxAlertsPerMinute: z.number(),
    cooldownPeriod: z.number(),
  }),
});

export type AlertConfig = z.infer<typeof AlertConfigSchema>;

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'regression';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  url: string;
  deviceType: string;
  userAgent: string;
  suggestions: string[];
}

export interface AlertChannel {
  name: string;
  send: (alert: PerformanceAlert) => Promise<void>;
}

class PerformanceAlertSystem {
  private config: AlertConfig;
  private recentAlerts: Map<string, number> = new Map(); // Alert type -> timestamp
  private metricHistory: Map<string, number[]> = new Map(); // Metric -> values
  private channels: Map<string, AlertChannel> = new Map();

  constructor(config: Partial<AlertConfig>) {
    this.config = AlertConfigSchema.parse({
      enabled: true,
      thresholds: {
        lcp: { warning: 2500, critical: 4000 },
        inp: { warning: 200, critical: 500 },
        cls: { warning: 0.1, critical: 0.25 },
        fcp: { warning: 1800, critical: 3000 },
      },
      channels: {
        console: true,
        browser: true,
        webhook: false,
        email: false,
      },
      regressionDetection: {
        enabled: true,
        windowSize: 10, // Compare last 10 measurements
        threshold: 0.2, // 20% regression threshold
      },
      rateLimiting: {
        maxAlertsPerMinute: 5,
        cooldownPeriod: 60000, // 1 minute
      },
      ...config,
    });

    this.setupDefaultChannels();
  }

  /**
   * Set up default alert channels
   */
  private setupDefaultChannels(): void {
    // Console channel
    if (this.config.channels.console) {
      this.addChannel('console', {
        name: 'Console',
        send: async (alert) => {
          const logLevel = alert.type === 'critical' ? 'error' : 'warn';
          console[logLevel](`[Performance Alert] ${alert.message}`, alert);
        },
      });
    }

    // Browser notification channel
    if (this.config.channels.browser && typeof window !== 'undefined' && 'Notification' in window) {
      this.addChannel('browser', {
        name: 'Browser Notification',
        send: async (alert) => {
          if (Notification.permission === 'granted') {
            new Notification(`VLANET 성능 알림`, {
              body: alert.message,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: `performance-${alert.type}`,
              renotify: true,
            });
          }
        },
      });
    }

    // Webhook channel (for Slack, Discord, etc.)
    if (this.config.channels.webhook) {
      this.addChannel('webhook', {
        name: 'Webhook',
        send: async (alert) => {
          const webhookUrl = process.env.NEXT_PUBLIC_PERFORMANCE_WEBHOOK_URL;
          if (!webhookUrl) return;

          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: `🚨 VLANET 성능 알림: ${alert.message}`,
              attachments: [{
                color: alert.type === 'critical' ? 'danger' : 'warning',
                fields: [
                  { title: 'Metric', value: alert.metric, short: true },
                  { title: 'Value', value: `${alert.value}ms`, short: true },
                  { title: 'Threshold', value: `${alert.threshold}ms`, short: true },
                  { title: 'URL', value: alert.url, short: false },
                ],
              }],
            }),
          });
        },
      });
    }
  }

  /**
   * Add custom alert channel
   */
  public addChannel(name: string, channel: AlertChannel): void {
    this.channels.set(name, channel);
  }

  /**
   * Remove alert channel
   */
  public removeChannel(name: string): void {
    this.channels.delete(name);
  }

  /**
   * Process performance metric and check for alerts
   */
  public async processMetric(metric: WebVitalMetric | RUMMetric): Promise<void> {
    if (!this.config.enabled) return;

    const metricName = metric.name.toLowerCase();
    const value = metric.value;

    // Update metric history for regression detection
    this.updateMetricHistory(metricName, value);

    // Check for threshold violations
    await this.checkThresholdAlerts(metric);

    // Check for performance regressions
    if (this.config.regressionDetection.enabled) {
      await this.checkRegressionAlerts(metric);
    }
  }

  /**
   * Check for threshold-based alerts
   */
  private async checkThresholdAlerts(metric: WebVitalMetric | RUMMetric): Promise<void> {
    const metricName = metric.name.toLowerCase();
    const thresholds = this.config.thresholds[metricName as keyof typeof this.config.thresholds];
    
    if (!thresholds) return;

    let alertType: 'warning' | 'critical' | null = null;
    let threshold: number;

    if (metric.value >= thresholds.critical) {
      alertType = 'critical';
      threshold = thresholds.critical;
    } else if (metric.value >= thresholds.warning) {
      alertType = 'warning';
      threshold = thresholds.warning;
    }

    if (alertType) {
      const alertKey = `${metricName}-${alertType}`;
      
      if (this.shouldSendAlert(alertKey)) {
        const alert = this.createAlert(metric, alertType, threshold);
        await this.sendAlert(alert);
        this.recordAlertSent(alertKey);
      }
    }
  }

  /**
   * Check for performance regressions
   */
  private async checkRegressionAlerts(metric: WebVitalMetric | RUMMetric): Promise<void> {
    const metricName = metric.name.toLowerCase();
    const history = this.metricHistory.get(metricName) || [];
    
    if (history.length < this.config.regressionDetection.windowSize) return;

    // Calculate baseline (average of previous measurements)
    const recentHistory = history.slice(-this.config.regressionDetection.windowSize);
    const baseline = recentHistory.slice(0, -1).reduce((sum, val) => sum + val, 0) / (recentHistory.length - 1);
    const currentValue = metric.value;
    
    // Check for regression
    const regressionRatio = (currentValue - baseline) / baseline;
    
    if (regressionRatio > this.config.regressionDetection.threshold) {
      const alertKey = `${metricName}-regression`;
      
      if (this.shouldSendAlert(alertKey)) {
        const alert = this.createRegressionAlert(metric, baseline, regressionRatio);
        await this.sendAlert(alert);
        this.recordAlertSent(alertKey);
      }
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(
    metric: WebVitalMetric | RUMMetric,
    type: 'warning' | 'critical',
    threshold: number
  ): PerformanceAlert {
    const suggestions = this.getOptimizationSuggestions(metric.name, type);
    
    return {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type,
      metric: metric.name,
      value: metric.value,
      threshold,
      message: `${metric.name} 성능 ${type === 'critical' ? '심각' : '경고'}: ${metric.value}ms (목표: ${threshold}ms)`,
      timestamp: Date.now(),
      url: metric.url,
      deviceType: (metric as WebVitalMetric).deviceType || 'unknown',
      userAgent: (metric as WebVitalMetric).userAgent || 'unknown',
      suggestions,
    };
  }

  /**
   * Create regression alert
   */
  private createRegressionAlert(
    metric: WebVitalMetric | RUMMetric,
    baseline: number,
    regressionRatio: number
  ): PerformanceAlert {
    const suggestions = this.getOptimizationSuggestions(metric.name, 'critical');
    
    return {
      id: `regression-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: 'regression',
      metric: metric.name,
      value: metric.value,
      threshold: baseline,
      message: `${metric.name} 성능 회귀 감지: ${(regressionRatio * 100).toFixed(1)}% 악화 (${metric.value}ms vs 기준 ${baseline.toFixed(0)}ms)`,
      timestamp: Date.now(),
      url: metric.url,
      deviceType: (metric as WebVitalMetric).deviceType || 'unknown',
      userAgent: (metric as WebVitalMetric).userAgent || 'unknown',
      suggestions: [
        ...suggestions,
        '최근 배포된 변경사항 검토',
        '성능 회귀 원인 분석 필요',
      ],
    };
  }

  /**
   * Get optimization suggestions for specific metrics
   */
  private getOptimizationSuggestions(metricName: string, severity: 'warning' | 'critical'): string[] {
    const suggestions: Record<string, string[]> = {
      lcp: [
        '중요 이미지에 preload 적용',
        '이미지 포맷 최적화 (WebP, AVIF)',
        '서버 응답 시간 개선',
        '렌더 블로킹 리소스 제거',
        'CDN 사용으로 지연시간 단축',
      ],
      inp: [
        '긴 JavaScript 작업 분할',
        'React.startTransition 사용',
        'Web Workers로 작업 분리',
        '코드 스플리팅 적용',
        '타사 스크립트 최적화',
      ],
      cls: [
        '이미지/비디오에 width/height 지정',
        'font-display: swap 적용',
        '동적 콘텐츠 공간 예약',
        'transform/opacity 애니메이션 사용',
        '광고 영역 크기 고정',
      ],
      fcp: [
        '중요 CSS 인라인 처리',
        '렌더 블로킹 스크립트 제거',
        '서버 응답 시간 최적화',
        '리소스 힌트 사용 (preconnect, dns-prefetch)',
      ],
      fid: [
        'JavaScript 실행 시간 최적화',
        '메인 스레드 블로킹 작업 제거',
        '코드 스플리팅으로 번들 크기 감소',
        'Service Worker 사전 캐싱',
      ],
    };

    const baseSuggestions = suggestions[metricName.toLowerCase()] || [];
    
    if (severity === 'critical') {
      return [
        '즉시 조치 필요: 사용자 경험에 심각한 영향',
        ...baseSuggestions,
        '성능 팀 에스컬레이션 고려',
      ];
    }

    return baseSuggestions;
  }

  /**
   * Update metric history for regression detection
   */
  private updateMetricHistory(metricName: string, value: number): void {
    const history = this.metricHistory.get(metricName) || [];
    history.push(value);
    
    // Keep only recent values within window size
    if (history.length > this.config.regressionDetection.windowSize * 2) {
      history.splice(0, history.length - this.config.regressionDetection.windowSize);
    }
    
    this.metricHistory.set(metricName, history);
  }

  /**
   * Check if alert should be sent (rate limiting)
   */
  private shouldSendAlert(alertKey: string): boolean {
    const now = Date.now();
    const lastAlertTime = this.recentAlerts.get(alertKey);
    
    if (!lastAlertTime) return true;
    
    return (now - lastAlertTime) > this.config.rateLimiting.cooldownPeriod;
  }

  /**
   * Record that an alert was sent
   */
  private recordAlertSent(alertKey: string): void {
    this.recentAlerts.set(alertKey, Date.now());
    
    // Clean up old entries
    const cutoff = Date.now() - this.config.rateLimiting.cooldownPeriod;
    for (const [key, timestamp] of this.recentAlerts.entries()) {
      if (timestamp < cutoff) {
        this.recentAlerts.delete(key);
      }
    }
  }

  /**
   * Send alert through all configured channels
   */
  private async sendAlert(alert: PerformanceAlert): Promise<void> {
    const promises = Array.from(this.channels.values()).map(async (channel) => {
      try {
        await channel.send(alert);
        console.log(`[PerformanceAlerts] Alert sent via ${channel.name}:`, alert.message);
      } catch (error) {
        console.error(`[PerformanceAlerts] Failed to send alert via ${channel.name}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Request browser notification permission
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('[PerformanceAlerts] Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Test alert system
   */
  public async testAlert(): Promise<void> {
    const testAlert: PerformanceAlert = {
      id: 'test-alert',
      type: 'warning',
      metric: 'LCP',
      value: 3000,
      threshold: 2500,
      message: '테스트 성능 알림: LCP 목표 초과',
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : 'test',
      deviceType: 'desktop',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'test',
      suggestions: ['이는 테스트 알림입니다'],
    };

    await this.sendAlert(testAlert);
  }

  /**
   * Get performance summary for alerts
   */
  public getPerformanceSummary(): {
    metrics: Record<string, { current: number; average: number; trend: 'improving' | 'stable' | 'degrading' }>;
    alertsToday: number;
    criticalIssues: number;
  } {
    const metrics: Record<string, { current: number; average: number; trend: 'improving' | 'stable' | 'degrading' }> = {};
    
    for (const [metricName, history] of this.metricHistory.entries()) {
      if (history.length === 0) continue;
      
      const current = history[history.length - 1];
      const average = history.reduce((sum, val) => sum + val, 0) / history.length;
      
      let trend: 'improving' | 'stable' | 'degrading' = 'stable';
      if (history.length >= 3) {
        const recent = history.slice(-3);
        const older = history.slice(-6, -3);
        
        if (older.length > 0) {
          const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
          const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
          
          const change = (recentAvg - olderAvg) / olderAvg;
          if (change < -0.05) trend = 'improving';
          else if (change > 0.05) trend = 'degrading';
        }
      }
      
      metrics[metricName] = { current, average, trend };
    }

    const today = new Date().toDateString();
    const alertsToday = Array.from(this.recentAlerts.values())
      .filter(timestamp => new Date(timestamp).toDateString() === today)
      .length;

    const criticalIssues = Array.from(this.recentAlerts.keys())
      .filter(key => key.includes('critical'))
      .length;

    return { metrics, alertsToday, criticalIssues };
  }

  /**
   * Configure alert thresholds
   */
  public updateThresholds(newThresholds: Partial<AlertConfig['thresholds']>): void {
    this.config.thresholds = {
      ...this.config.thresholds,
      ...newThresholds,
    };
  }

  /**
   * Enable/disable specific alert channels
   */
  public configureChannels(channels: Partial<AlertConfig['channels']>): void {
    this.config.channels = {
      ...this.config.channels,
      ...channels,
    };
  }

  /**
   * Get recent alerts
   */
  public getRecentAlerts(limit: number = 10): Array<{ key: string; timestamp: number }> {
    return Array.from(this.recentAlerts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([key, timestamp]) => ({ key, timestamp }));
  }

  /**
   * Clear alert history
   */
  public clearAlertHistory(): void {
    this.recentAlerts.clear();
    this.metricHistory.clear();
  }

  /**
   * Destroy alert system
   */
  public destroy(): void {
    this.recentAlerts.clear();
    this.metricHistory.clear();
    this.channels.clear();
  }
}

// Singleton instance
let performanceAlertSystem: PerformanceAlertSystem | null = null;

export function initPerformanceAlerts(config: Partial<AlertConfig> = {}): PerformanceAlertSystem {
  if (!performanceAlertSystem) {
    performanceAlertSystem = new PerformanceAlertSystem(config);
  }
  return performanceAlertSystem;
}

export function getPerformanceAlerts(): PerformanceAlertSystem | null {
  return performanceAlertSystem;
}

export { PerformanceAlertSystem };