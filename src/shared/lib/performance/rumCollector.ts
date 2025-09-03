/**
 * Real User Monitoring (RUM) Data Collector
 * Collects performance metrics from real users
 */

import { z } from 'zod';
import type { WebVitalMetric } from './webVitals';

// RUM Data Schema for validation
const RUMSessionSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  userAgent: z.string(),
  url: z.string().url(),
  referrer: z.string(),
  timestamp: z.number(),
  viewport: z.object({
    width: z.number(),
    height: z.number(),
  }),
  connection: z.object({
    effectiveType: z.string().optional(),
    downlink: z.number().optional(),
    rtt: z.number().optional(),
  }).optional(),
  device: z.object({
    type: z.enum(['mobile', 'tablet', 'desktop']),
    memory: z.number().optional(),
    cores: z.number().optional(),
  }),
});

const RUMMetricSchema = z.object({
  sessionId: z.string(),
  metricName: z.string(),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  timestamp: z.number(),
  url: z.string().url(),
  attribution: z.record(z.any()).optional(),
});

const RUMEventSchema = z.object({
  sessionId: z.string(),
  eventType: z.enum(['page-view', 'interaction', 'error', 'custom']),
  eventName: z.string(),
  timestamp: z.number(),
  data: z.record(z.any()).optional(),
});

export type RUMSession = z.infer<typeof RUMSessionSchema>;
export type RUMMetric = z.infer<typeof RUMMetricSchema>;
export type RUMEvent = z.infer<typeof RUMEventSchema>;

export interface RUMCollectorConfig {
  endpoint: string;
  apiKey?: string;
  sessionDuration: number; // Session timeout in ms
  batchSize: number;
  flushInterval: number;
  enableInDevelopment: boolean;
  samplingRate: number; // 0-1
  enableResourceTiming: boolean;
  enableNavigationTiming: boolean;
  enableUserTiming: boolean;
}

class RUMCollector {
  private config: RUMCollectorConfig;
  private session: RUMSession | null = null;
  private metrics: RUMMetric[] = [];
  private events: RUMEvent[] = [];
  private flushTimer?: NodeJS.Timeout;
  private sessionTimer?: NodeJS.Timeout;
  private isEnabled: boolean = false;

  constructor(config: Partial<RUMCollectorConfig>) {
    this.config = {
      endpoint: '/api/rum',
      sessionDuration: 30 * 60 * 1000, // 30 minutes
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      enableInDevelopment: false,
      samplingRate: 0.1, // 10% sampling in production
      enableResourceTiming: true,
      enableNavigationTiming: true,
      enableUserTiming: true,
      ...config,
    };

    this.isEnabled = this.shouldEnable();
    
    if (this.isEnabled) {
      this.initializeSession();
      this.startCollecting();
    }
  }

  private shouldEnable(): boolean {
    if (typeof window === 'undefined') return false;
    
    if (process.env.NODE_ENV === 'development') {
      return this.config.enableInDevelopment;
    }
    
    return Math.random() < this.config.samplingRate;
  }

  /**
   * Initialize RUM session
   */
  private initializeSession(): void {
    if (typeof window === 'undefined') return;

    try {
      this.session = RUMSessionSchema.parse({
        sessionId: this.generateSessionId(),
        userId: this.getUserId(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
        timestamp: Date.now(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        connection: this.getConnectionInfo(),
        device: this.getDeviceInfo(),
      });

      console.log('[RUM] Session initialized:', this.session.sessionId);
      
      // Set session timeout
      this.sessionTimer = setTimeout(() => {
        this.endSession();
      }, this.config.sessionDuration);

    } catch (error) {
      console.error('[RUM] Failed to initialize session:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Start collecting performance data
   */
  private startCollecting(): void {
    if (!this.isEnabled || !this.session) return;

    // Collect initial page view
    this.recordEvent({
      eventType: 'page-view',
      eventName: 'initial-load',
      data: {
        path: window.location.pathname,
        search: window.location.search,
      },
    });

    // Set up performance observers
    this.setupPerformanceObservers();

    // Set up user interaction tracking
    this.setupUserInteractionTracking();

    // Set up error tracking
    this.setupErrorTracking();

    // Start flush timer
    this.startFlushTimer();

    console.log('[RUM] Data collection started');
  }

  /**
   * Set up performance observers for metrics collection
   */
  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) return;

    // Navigation timing
    if (this.config.enableNavigationTiming) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.collectNavigationTiming(entry as PerformanceNavigationTiming);
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
      } catch (error) {
        console.warn('[RUM] Navigation timing observer failed:', error);
      }
    }

    // Resource timing
    if (this.config.enableResourceTiming) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.collectResourceTiming(entry);
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        console.warn('[RUM] Resource timing observer failed:', error);
      }
    }

    // User timing
    if (this.config.enableUserTiming) {
      try {
        const userObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.collectUserTiming(entry);
          }
        });
        userObserver.observe({ entryTypes: ['measure', 'mark'] });
      } catch (error) {
        console.warn('[RUM] User timing observer failed:', error);
      }
    }
  }

  /**
   * Set up user interaction tracking
   */
  private setupUserInteractionTracking(): void {
    // Track clicks
    document.addEventListener('click', (event) => {
      this.recordEvent({
        eventType: 'interaction',
        eventName: 'click',
        data: {
          target: this.getElementIdentifier(event.target as Element),
          coordinates: { x: event.clientX, y: event.clientY },
        },
      });
    });

    // Track form submissions
    document.addEventListener('submit', (event) => {
      this.recordEvent({
        eventType: 'interaction',
        eventName: 'form-submit',
        data: {
          form: this.getElementIdentifier(event.target as Element),
        },
      });
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.recordEvent({
        eventType: 'interaction',
        eventName: 'visibility-change',
        data: {
          hidden: document.hidden,
        },
      });
    });
  }

  /**
   * Set up error tracking
   */
  private setupErrorTracking(): void {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordEvent({
        eventType: 'error',
        eventName: 'javascript-error',
        data: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordEvent({
        eventType: 'error',
        eventName: 'unhandled-rejection',
        data: {
          reason: event.reason?.toString(),
          stack: event.reason?.stack,
        },
      });
    });
  }

  /**
   * Record Web Vital metric
   */
  public recordWebVital(metric: WebVitalMetric): void {
    if (!this.isEnabled || !this.session) return;

    try {
      const rumMetric = RUMMetricSchema.parse({
        sessionId: this.session.sessionId,
        metricName: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: metric.timestamp,
        url: metric.url,
        attribution: this.extractAttribution(metric),
      });

      this.metrics.push(rumMetric);
      this.checkFlush();
    } catch (error) {
      console.error('[RUM] Failed to record web vital:', error);
    }
  }

  /**
   * Record custom event
   */
  public recordEvent(event: Omit<RUMEvent, 'sessionId' | 'timestamp'>): void {
    if (!this.isEnabled || !this.session) return;

    try {
      const rumEvent = RUMEventSchema.parse({
        ...event,
        sessionId: this.session.sessionId,
        timestamp: Date.now(),
      });

      this.events.push(rumEvent);
      this.checkFlush();
    } catch (error) {
      console.error('[RUM] Failed to record event:', error);
    }
  }

  /**
   * Collect navigation timing data
   */
  private collectNavigationTiming(entry: PerformanceNavigationTiming): void {
    const timing = {
      ttfb: entry.responseStart - entry.requestStart,
      domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      loadComplete: entry.loadEventEnd - entry.loadEventStart,
      domInteractive: entry.domInteractive - entry.fetchStart,
      redirectTime: entry.redirectEnd - entry.redirectStart,
      dnsTime: entry.domainLookupEnd - entry.domainLookupStart,
      connectTime: entry.connectEnd - entry.connectStart,
      requestTime: entry.responseEnd - entry.requestStart,
    };

    this.recordEvent({
      eventType: 'custom',
      eventName: 'navigation-timing',
      data: timing,
    });
  }

  /**
   * Collect resource timing data
   */
  private collectResourceTiming(entry: PerformanceEntry): void {
    const resourceEntry = entry as PerformanceResourceTiming;
    
    // Only collect data for significant resources
    if (resourceEntry.transferSize < 1000) return; // Skip small resources

    const resourceData = {
      name: resourceEntry.name,
      type: this.getResourceType(resourceEntry.name),
      duration: resourceEntry.duration,
      transferSize: resourceEntry.transferSize,
      encodedBodySize: resourceEntry.encodedBodySize,
      decodedBodySize: resourceEntry.decodedBodySize,
      redirectTime: resourceEntry.redirectEnd - resourceEntry.redirectStart,
      dnsTime: resourceEntry.domainLookupEnd - resourceEntry.domainLookupStart,
      connectTime: resourceEntry.connectEnd - resourceEntry.connectStart,
      requestTime: resourceEntry.responseEnd - resourceEntry.requestStart,
    };

    this.recordEvent({
      eventType: 'custom',
      eventName: 'resource-timing',
      data: resourceData,
    });
  }

  /**
   * Collect user timing data
   */
  private collectUserTiming(entry: PerformanceEntry): void {
    this.recordEvent({
      eventType: 'custom',
      eventName: 'user-timing',
      data: {
        name: entry.name,
        entryType: entry.entryType,
        startTime: entry.startTime,
        duration: entry.duration,
      },
    });
  }

  /**
   * Helper methods
   */
  private generateSessionId(): string {
    return `rum_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private getUserId(): string | undefined {
    // Try to get user ID from various sources
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('userId') || 
             localStorage.getItem('userId') || 
             undefined;
    }
    return undefined;
  }

  private getConnectionInfo() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      };
    }
    return undefined;
  }

  private getDeviceInfo() {
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    
    return {
      type: this.getDeviceType(),
      memory,
      cores,
    };
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getElementIdentifier(element: Element): string {
    if (!element) return 'unknown';
    
    const id = element.id;
    const className = element.className;
    const tagName = element.tagName.toLowerCase();
    
    if (id) return `#${id}`;
    if (className) return `.${className.split(' ')[0]}`;
    return tagName;
  }

  private getResourceType(url: string): string {
    const pathname = new URL(url).pathname.toLowerCase();
    
    if (/\.(js|jsx|ts|tsx)$/i.test(pathname)) return 'script';
    if (/\.(css|scss|sass)$/i.test(pathname)) return 'stylesheet';
    if (/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i.test(pathname)) return 'image';
    if (/\.(mp4|webm|ogg|mp3|wav)$/i.test(pathname)) return 'media';
    if (/\.(woff|woff2|ttf|otf)$/i.test(pathname)) return 'font';
    if (pathname.includes('/api/')) return 'api';
    
    return 'other';
  }

  private extractAttribution(metric: WebVitalMetric): Record<string, any> {
    // Extract attribution data for debugging
    const attribution: Record<string, any> = {
      id: metric.id,
      deviceType: metric.deviceType,
      connectionType: metric.connectionType,
    };

    // Add metric-specific attribution
    if (metric.name === 'LCP') {
      // LCP element information would be added here
      attribution.lcpElementType = 'image'; // This would be detected
    }

    return attribution;
  }

  /**
   * Check if should flush data
   */
  private checkFlush(): void {
    if (this.metrics.length + this.events.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Flush collected data to server
   */
  public async flush(): Promise<void> {
    if (!this.isEnabled || !this.session || 
        (this.metrics.length === 0 && this.events.length === 0)) {
      return;
    }

    const payload = {
      session: this.session,
      metrics: [...this.metrics],
      events: [...this.events],
      timestamp: Date.now(),
    };

    // Clear local data
    this.metrics = [];
    this.events = [];

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`RUM upload failed: ${response.status}`);
      }

      console.log('[RUM] Data flushed successfully');
    } catch (error) {
      console.error('[RUM] Failed to flush data:', error);
      
      // Re-add data to queue for retry
      this.metrics.unshift(...payload.metrics);
      this.events.unshift(...payload.events);
    }
  }

  /**
   * End current session
   */
  private endSession(): void {
    if (!this.session) return;

    console.log('[RUM] Session ended:', this.session.sessionId);
    
    // Final flush
    this.flush();
    
    // Clear session
    this.session = null;
    
    // Clear timers
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = undefined;
    }
  }

  /**
   * Public methods
   */
  
  public recordCustomMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor'): void {
    if (!this.isEnabled || !this.session) return;

    this.recordEvent({
      eventType: 'custom',
      eventName: 'custom-metric',
      data: { name, value, rating },
    });
  }

  public recordUserInteraction(interactionType: string, target: string, duration?: number): void {
    if (!this.isEnabled) return;

    this.recordEvent({
      eventType: 'interaction',
      eventName: interactionType,
      data: { target, duration },
    });
  }

  public recordPerformanceIssue(issue: { type: string; message: string; data: any }): void {
    if (!this.isEnabled) return;

    this.recordEvent({
      eventType: 'error',
      eventName: 'performance-issue',
      data: issue,
    });
  }

  public getSessionInfo(): RUMSession | null {
    return this.session;
  }

  public isCollecting(): boolean {
    return this.isEnabled && !!this.session;
  }

  public destroy(): void {
    // End session and cleanup
    this.endSession();
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    
    this.isEnabled = false;
    console.log('[RUM] Collector destroyed');
  }
}

// Singleton instance
let rumCollector: RUMCollector | null = null;

export function initRUMCollector(config: Partial<RUMCollectorConfig> = {}): RUMCollector {
  if (!rumCollector) {
    rumCollector = new RUMCollector(config);
  }
  return rumCollector;
}

export function getRUMCollector(): RUMCollector | null {
  return rumCollector;
}

export { RUMCollector };