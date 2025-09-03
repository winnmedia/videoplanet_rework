/**
 * Tests for WebVitals monitoring system
 */

import { WebVitalsMonitor, initWebVitals, getWebVitalsMonitor } from './webVitals';

// Mock web-vitals module
jest.mock('web-vitals', () => ({
  onCLS: jest.fn(),
  onFCP: jest.fn(),
  onFID: jest.fn(),
  onINP: jest.fn(),
  onLCP: jest.fn(),
  onTTFB: jest.fn(),
}));

// Mock window and navigator
const mockNavigator = {
  userAgent: 'test-user-agent',
  connection: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
  },
  sendBeacon: jest.fn(() => true),
};

const mockWindow = {
  location: { href: 'http://localhost:3000/test' },
  innerWidth: 1920,
  innerHeight: 1080,
  sessionStorage: {
    getItem: jest.fn(() => 'test-session-id'),
    setItem: jest.fn(),
  },
};

Object.defineProperty(global, 'navigator', { value: mockNavigator, writable: true });
Object.defineProperty(global, 'window', { value: mockWindow, writable: true });

describe('WebVitalsMonitor', () => {
  let monitor: WebVitalsMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = new WebVitalsMonitor();
  });

  afterEach(() => {
    monitor.destroy();
  });

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      expect(monitor).toBeInstanceOf(WebVitalsMonitor);
    });

    it('should accept custom config', () => {
      const customConfig = {
        thresholds: {
          lcp: { good: 2000, poor: 3500 },
          inp: { good: 150, poor: 400 },
          cls: { good: 0.05, poor: 0.2 },
          fcp: { good: 1500, poor: 2500 },
          fid: { good: 80, poor: 250 },
          ttfb: { good: 600, poor: 1500 },
        },
      };

      const customMonitor = new WebVitalsMonitor(customConfig);
      expect(customMonitor).toBeInstanceOf(WebVitalsMonitor);
      customMonitor.destroy();
    });
  });

  describe('Metric Processing', () => {
    it('should process LCP metric correctly', async () => {
      const { onLCP } = require('web-vitals');
      
      await monitor.initializeMonitoring();
      
      // Simulate LCP metric
      const mockLCPMetric = {
        name: 'LCP',
        value: 2000,
        delta: 2000,
        id: 'lcp-1',
        entries: [],
      };

      const lcpCallback = onLCP.mock.calls[0][0];
      lcpCallback(mockLCPMetric);

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('LCP');
      expect(metrics[0].value).toBe(2000);
      expect(metrics[0].rating).toBe('good');
    });

    it('should process INP metric correctly', async () => {
      const { onINP } = require('web-vitals');
      
      await monitor.initializeMonitoring();
      
      // Simulate INP metric
      const mockINPMetric = {
        name: 'INP',
        value: 300,
        delta: 300,
        id: 'inp-1',
        entries: [],
      };

      const inpCallback = onINP.mock.calls[0][0];
      inpCallback(mockINPMetric);

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('INP');
      expect(metrics[0].value).toBe(300);
      expect(metrics[0].rating).toBe('needs-improvement');
    });

    it('should process CLS metric correctly', async () => {
      const { onCLS } = require('web-vitals');
      
      await monitor.initializeMonitoring();
      
      // Simulate CLS metric
      const mockCLSMetric = {
        name: 'CLS',
        value: 0.15,
        delta: 0.15,
        id: 'cls-1',
        entries: [],
      };

      const clsCallback = onCLS.mock.calls[0][0];
      clsCallback(mockCLSMetric);

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('CLS');
      expect(metrics[0].value).toBe(0.15);
      expect(metrics[0].rating).toBe('needs-improvement');
    });
  });

  describe('Rating System', () => {
    it('should rate LCP correctly', async () => {
      const { onLCP } = require('web-vitals');
      await monitor.initializeMonitoring();
      const lcpCallback = onLCP.mock.calls[0][0];

      // Good LCP
      lcpCallback({ name: 'LCP', value: 2000, delta: 2000, id: 'lcp-good', entries: [] });
      expect(monitor.getMetrics()[0].rating).toBe('good');

      // Poor LCP
      lcpCallback({ name: 'LCP', value: 5000, delta: 5000, id: 'lcp-poor', entries: [] });
      expect(monitor.getMetrics()[1].rating).toBe('poor');
    });

    it('should rate INP correctly', async () => {
      const { onINP } = require('web-vitals');
      await monitor.initializeMonitoring();
      const inpCallback = onINP.mock.calls[0][0];

      // Good INP
      inpCallback({ name: 'INP', value: 150, delta: 150, id: 'inp-good', entries: [] });
      expect(monitor.getMetrics()[0].rating).toBe('good');

      // Poor INP
      inpCallback({ name: 'INP', value: 600, delta: 600, id: 'inp-poor', entries: [] });
      expect(monitor.getMetrics()[1].rating).toBe('poor');
    });

    it('should rate CLS correctly', async () => {
      const { onCLS } = require('web-vitals');
      await monitor.initializeMonitoring();
      const clsCallback = onCLS.mock.calls[0][0];

      // Good CLS
      clsCallback({ name: 'CLS', value: 0.05, delta: 0.05, id: 'cls-good', entries: [] });
      expect(monitor.getMetrics()[0].rating).toBe('good');

      // Poor CLS
      clsCallback({ name: 'CLS', value: 0.3, delta: 0.3, id: 'cls-poor', entries: [] });
      expect(monitor.getMetrics()[1].rating).toBe('poor');
    });
  });

  describe('Device Detection', () => {
    it('should detect desktop device', async () => {
      const { onLCP } = require('web-vitals');
      await monitor.initializeMonitoring();
      const lcpCallback = onLCP.mock.calls[0][0];

      lcpCallback({ name: 'LCP', value: 2000, delta: 2000, id: 'lcp-1', entries: [] });
      
      const metrics = monitor.getMetrics();
      expect(metrics[0].deviceType).toBe('desktop');
    });

    it('should detect mobile device', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
      
      const mobileMonitor = new WebVitalsMonitor();
      const { onLCP } = require('web-vitals');
      await mobileMonitor.initializeMonitoring();
      const lcpCallback = onLCP.mock.calls[0][0];

      lcpCallback({ name: 'LCP', value: 2000, delta: 2000, id: 'lcp-mobile', entries: [] });
      
      const metrics = mobileMonitor.getMetrics();
      expect(metrics[0].deviceType).toBe('mobile');
      
      mobileMonitor.destroy();
    });
  });

  describe('Metric Management', () => {
    it('should store and retrieve metrics', async () => {
      const { onLCP } = require('web-vitals');
      await monitor.initializeMonitoring();
      const lcpCallback = onLCP.mock.calls[0][0];

      // Add multiple metrics
      lcpCallback({ name: 'LCP', value: 2000, delta: 2000, id: 'lcp-1', entries: [] });
      lcpCallback({ name: 'LCP', value: 2500, delta: 2500, id: 'lcp-2', entries: [] });

      const metrics = monitor.getMetrics();
      expect(metrics).toHaveLength(2);
      expect(metrics[0].value).toBe(2000);
      expect(metrics[1].value).toBe(2500);
    });

    it('should clear metrics', async () => {
      const { onLCP } = require('web-vitals');
      await monitor.initializeMonitoring();
      const lcpCallback = onLCP.mock.calls[0][0];

      lcpCallback({ name: 'LCP', value: 2000, delta: 2000, id: 'lcp-1', entries: [] });
      expect(monitor.getMetrics()).toHaveLength(1);

      monitor.clearMetrics();
      expect(monitor.getMetrics()).toHaveLength(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const monitor1 = initWebVitals();
      const monitor2 = initWebVitals();
      expect(monitor1).toBe(monitor2);
    });

    it('should get current instance', () => {
      const monitor = initWebVitals();
      const retrieved = getWebVitalsMonitor();
      expect(retrieved).toBe(monitor);
    });
  });

  describe('Error Handling', () => {
    it('should handle web-vitals import failure gracefully', async () => {
      // Mock failed import
      jest.doMock('web-vitals', () => {
        throw new Error('Module not found');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await monitor.initializeMonitoring();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[WebVitals] Failed to initialize monitoring:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Budget Compliance', () => {
    it('should meet Core Web Vitals targets', async () => {
      const { onLCP, onINP, onCLS } = require('web-vitals');
      await monitor.initializeMonitoring();

      // Test metrics that meet our targets
      const lcpCallback = onLCP.mock.calls[0][0];
      const inpCallback = onINP.mock.calls[0][0];
      const clsCallback = onCLS.mock.calls[0][0];

      // All metrics within budget
      lcpCallback({ name: 'LCP', value: 2400, delta: 2400, id: 'lcp-target', entries: [] });
      inpCallback({ name: 'INP', value: 180, delta: 180, id: 'inp-target', entries: [] });
      clsCallback({ name: 'CLS', value: 0.08, delta: 0.08, id: 'cls-target', entries: [] });

      const metrics = monitor.getMetrics();
      expect(metrics.every(m => m.rating === 'good')).toBe(true);
      expect(metrics.find(m => m.name === 'LCP')?.value).toBeLessThanOrEqual(2500);
      expect(metrics.find(m => m.name === 'INP')?.value).toBeLessThanOrEqual(200);
      expect(metrics.find(m => m.name === 'CLS')?.value).toBeLessThanOrEqual(0.1);
    });

    it('should detect budget violations', async () => {
      const { onLCP, onINP, onCLS } = require('web-vitals');
      await monitor.initializeMonitoring();

      const lcpCallback = onLCP.mock.calls[0][0];
      const inpCallback = onINP.mock.calls[0][0];
      const clsCallback = onCLS.mock.calls[0][0];

      // Metrics exceeding budget
      lcpCallback({ name: 'LCP', value: 4500, delta: 4500, id: 'lcp-violation', entries: [] });
      inpCallback({ name: 'INP', value: 350, delta: 350, id: 'inp-violation', entries: [] });
      clsCallback({ name: 'CLS', value: 0.3, delta: 0.3, id: 'cls-violation', entries: [] });

      const metrics = monitor.getMetrics();
      const violations = metrics.filter(m => m.rating === 'poor');
      expect(violations).toHaveLength(3);
    });
  });
});