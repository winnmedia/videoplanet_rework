/**
 * Web Vitals Monitoring for Core Web Vitals Optimization
 * LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1
 */

import type { 
  CLSMetric, 
  FCPMetric, 
  FIDMetric, 
  INPMetric, 
  LCPMetric, 
  TTFBMetric 
} from 'web-vitals';

export interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
}

export interface PerformanceConfig {
  // Core Web Vitals thresholds
  thresholds: {
    lcp: { good: number; poor: number };
    inp: { good: number; poor: number };
    cls: { good: number; poor: number };
    fcp: { good: number; poor: number };
    fid: { good: number; poor: number };
    ttfb: { good: number; poor: number };
  };
  // Reporting configuration
  reporting: {
    endpoint?: string;
    batchSize: number;
    flushInterval: number;
    enableConsoleLog: boolean;
    enableBeacon: boolean;
  };
  // Sampling configuration
  sampling: {
    rate: number; // 0-1, percentage of sessions to monitor
    enableForDevelopment: boolean;
  };
}

const DEFAULT_CONFIG: PerformanceConfig = {
  thresholds: {
    lcp: { good: 2500, poor: 4000 },
    inp: { good: 200, poor: 500 },
    cls: { good: 0.1, poor: 0.25 },
    fcp: { good: 1800, poor: 3000 },
    fid: { good: 100, poor: 300 },
    ttfb: { good: 800, poor: 1800 },
  },
  reporting: {
    batchSize: 10,
    flushInterval: 30000, // 30 seconds
    enableConsoleLog: process.env.NODE_ENV === 'development',
    enableBeacon: true,
  },
  sampling: {
    rate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev
    enableForDevelopment: true,
  },
};

class WebVitalsMonitor {
  private config: PerformanceConfig;
  private metrics: WebVitalMetric[] = [];
  private flushTimer?: NodeJS.Timeout;
  private isEnabled: boolean = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.isEnabled = this.shouldEnable();
    
    if (this.isEnabled) {
      this.startFlushTimer();
    }
  }

  private shouldEnable(): boolean {
    if (typeof window === 'undefined') return false;
    
    const { sampling } = this.config;
    
    if (process.env.NODE_ENV === 'development') {
      return sampling.enableForDevelopment;
    }
    
    return Math.random() < sampling.rate;
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = this.config.thresholds[name as keyof typeof this.config.thresholds];
    if (!thresholds) return 'good';
    
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  }

  private getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getConnectionType(): string | undefined {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as Navigator & { connection?: { effectiveType?: string; type?: string } }).connection;
      return connection?.effectiveType || connection?.type;
    }
    return undefined;
  }

  private processMetric(metric: CLSMetric | FCPMetric | FIDMetric | INPMetric | LCPMetric | TTFBMetric): void {
    if (!this.isEnabled) return;

    const webVitalMetric: WebVitalMetric = {
      name: metric.name,
      value: metric.value,
      rating: this.getRating(metric.name, metric.value),
      delta: metric.delta,
      id: metric.id,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: this.getConnectionType(),
      deviceType: this.getDeviceType(),
    };

    this.metrics.push(webVitalMetric);

    if (this.config.reporting.enableConsoleLog) {
      console.log(`[WebVitals] ${metric.name}:`, webVitalMetric);
    }

    // Alert for poor performance
    if (webVitalMetric.rating === 'poor') {
      this.handlePoorPerformance(webVitalMetric);
    }

    // Flush immediately if batch size is reached
    if (this.metrics.length >= this.config.reporting.batchSize) {
      this.flush();
    }
  }

  private handlePoorPerformance(metric: WebVitalMetric): void {
    console.warn(`[WebVitals] Poor performance detected for ${metric.name}: ${metric.value}ms`);
    
    // Send immediate alert for critical performance issues
    if (metric.name === 'LCP' && metric.value > 4000) {
      this.sendAlert('Critical LCP performance issue', metric);
    } else if (metric.name === 'INP' && metric.value > 500) {
      this.sendAlert('Critical INP performance issue', metric);
    } else if (metric.name === 'CLS' && metric.value > 0.25) {
      this.sendAlert('Critical CLS performance issue', metric);
    }
  }

  private sendAlert(message: string, metric: WebVitalMetric): void {
    // In production, this could send to error tracking service
    if (process.env.NODE_ENV === 'development') {
      console.error(`[WebVitals Alert] ${message}`, metric);
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.reporting.flushInterval);
  }

  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private async flush(): Promise<void> {
    if (this.metrics.length === 0) return;

    const metricsToSend = [...this.metrics];
    this.metrics = [];

    try {
      await this.sendMetrics(metricsToSend);
    } catch (error) {
      console.error('[WebVitals] Failed to send metrics:', error);
      // Re-add metrics to queue for retry
      this.metrics.unshift(...metricsToSend);
    }
  }

  private async sendMetrics(metrics: WebVitalMetric[]): Promise<void> {
    const { endpoint, enableBeacon } = this.config.reporting;
    
    if (!endpoint) {
      // Log to console if no endpoint is configured
      if (this.config.reporting.enableConsoleLog) {
        console.log('[WebVitals] Metrics batch:', metrics);
      }
      return;
    }

    const payload = {
      metrics,
      timestamp: Date.now(),
      sessionId: this.getSessionId(),
      url: window.location.href,
    };

    try {
      if (enableBeacon && 'sendBeacon' in navigator) {
        // Use sendBeacon for reliability
        const success = navigator.sendBeacon(
          endpoint,
          JSON.stringify(payload)
        );
        if (!success) {
          throw new Error('sendBeacon failed');
        }
      } else {
        // Fallback to fetch
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }
    } catch (error) {
      throw new Error(`Failed to send metrics: ${error}`);
    }
  }

  private getSessionId(): string {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      let sessionId = sessionStorage.getItem('webvitals-session-id');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem('webvitals-session-id', sessionId);
      }
      return sessionId;
    }
    return 'unknown';
  }

  public async initializeMonitoring(): Promise<void> {
    if (!this.isEnabled || typeof window === 'undefined') return;

    try {
      // Dynamic imports to reduce bundle size
      const { onCLS, onFCP, onFID, onINP, onLCP, onTTFB } = await import('web-vitals');

      // Monitor Core Web Vitals
      onCLS((metric) => this.processMetric(metric));
      onFCP((metric) => this.processMetric(metric));
      onFID((metric) => this.processMetric(metric));
      onINP((metric) => this.processMetric(metric));
      onLCP((metric) => this.processMetric(metric));
      onTTFB((metric) => this.processMetric(metric));

      console.log('[WebVitals] Monitoring initialized');
    } catch (error) {
      console.error('[WebVitals] Failed to initialize monitoring:', error);
    }
  }

  public getMetrics(): WebVitalMetric[] {
    return [...this.metrics];
  }

  public clearMetrics(): void {
    this.metrics = [];
  }

  public async flushNow(): Promise<void> {
    await this.flush();
  }

  public destroy(): void {
    this.stopFlushTimer();
    this.flush(); // Final flush
  }
}

// Singleton instance
let webVitalsMonitor: WebVitalsMonitor | null = null;

export function initWebVitals(config?: Partial<PerformanceConfig>): WebVitalsMonitor {
  if (!webVitalsMonitor) {
    webVitalsMonitor = new WebVitalsMonitor(config);
  }
  return webVitalsMonitor;
}

export function getWebVitalsMonitor(): WebVitalsMonitor | null {
  return webVitalsMonitor;
}

export { WebVitalsMonitor };