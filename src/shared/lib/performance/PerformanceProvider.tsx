/**
 * Performance Provider Component
 * Provides performance monitoring context to the application
 */

'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { initWebVitals, WebVitalsMonitor, type PerformanceConfig } from './webVitals';
import { initPerformanceOptimizer, PerformanceOptimizer, ResourceOptimizer, type PerformanceObserverConfig } from './performanceOptimizer';

interface PerformanceContextValue {
  webVitalsMonitor: WebVitalsMonitor | null;
  performanceOptimizer: PerformanceOptimizer | null;
  resourceOptimizer: typeof ResourceOptimizer;
  isMonitoring: boolean;
}

const PerformanceContext = createContext<PerformanceContextValue | undefined>(undefined);

interface PerformanceProviderProps {
  children: React.ReactNode;
  webVitalsConfig?: Partial<PerformanceConfig>;
  optimizerConfig?: Partial<PerformanceObserverConfig>;
  enableInDevelopment?: boolean;
  enableResourceOptimization?: boolean;
  onPerformanceIssue?: (issue: { type: string; message: string; data: any }) => void;
}

const PerformanceProvider: React.FC<PerformanceProviderProps> = ({
  children,
  webVitalsConfig,
  optimizerConfig,
  enableInDevelopment = true,
  enableResourceOptimization = true,
  onPerformanceIssue,
}) => {
  const webVitalsMonitorRef = useRef<WebVitalsMonitor | null>(null);
  const performanceOptimizerRef = useRef<PerformanceOptimizer | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Skip initialization if already done or if disabled in development
    if (isInitializedRef.current) return;
    if (process.env.NODE_ENV === 'development' && !enableInDevelopment) return;

    const initializePerformanceMonitoring = async () => {
      try {
        // Initialize Web Vitals monitoring
        const webVitalsMonitor = initWebVitals({
          ...webVitalsConfig,
          reporting: {
            ...webVitalsConfig?.reporting,
            // Custom endpoint can be configured here
            endpoint: process.env.NODE_ENV === 'production' 
              ? process.env.NEXT_PUBLIC_PERFORMANCE_API_URL 
              : undefined,
          },
        });

        await webVitalsMonitor.initializeMonitoring();
        webVitalsMonitorRef.current = webVitalsMonitor;

        // Initialize Performance Optimizer
        const performanceOptimizer = initPerformanceOptimizer(optimizerConfig);
        performanceOptimizer.initialize();
        performanceOptimizerRef.current = performanceOptimizer;

        // Initialize Resource Optimizer
        if (enableResourceOptimization) {
          // Optimize critical resources immediately
          ResourceOptimizer.preloadCriticalResources([
            // Add your critical resources here
            // { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2', crossorigin: true },
          ]);

          // Optimize images for LCP
          setTimeout(() => {
            ResourceOptimizer.optimizeImageLoading();
            ResourceOptimizer.preventLayoutShifts();
            ResourceOptimizer.optimizeFontLoading();
          }, 100);
        }

        isInitializedRef.current = true;
        console.log('[PerformanceProvider] Performance monitoring initialized');

        // Handle performance issues if callback is provided
        if (onPerformanceIssue) {
          // Monitor for critical issues
          const checkPerformanceIssues = () => {
            const metrics = webVitalsMonitor.getMetrics();
            const poorMetrics = metrics.filter(metric => metric.rating === 'poor');
            
            poorMetrics.forEach(metric => {
              onPerformanceIssue({
                type: 'poor_performance',
                message: `Poor ${metric.name} performance: ${metric.value}ms`,
                data: metric,
              });
            });
          };

          // Check every 30 seconds
          const intervalId = setInterval(checkPerformanceIssues, 30000);
          
          return () => clearInterval(intervalId);
        }
      } catch (error) {
        console.error('[PerformanceProvider] Failed to initialize performance monitoring:', error);
        
        if (onPerformanceIssue) {
          onPerformanceIssue({
            type: 'initialization_error',
            message: 'Failed to initialize performance monitoring',
            data: error,
          });
        }
      }
    };

    initializePerformanceMonitoring();

    // Cleanup on unmount
    return () => {
      if (webVitalsMonitorRef.current) {
        webVitalsMonitorRef.current.destroy();
        webVitalsMonitorRef.current = null;
      }
      
      if (performanceOptimizerRef.current) {
        performanceOptimizerRef.current.destroy();
        performanceOptimizerRef.current = null;
      }

      isInitializedRef.current = false;
    };
  }, [webVitalsConfig, optimizerConfig, enableInDevelopment, enableResourceOptimization, onPerformanceIssue]);

  // Handle page visibility changes to pause/resume monitoring
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden' && webVitalsMonitorRef.current) {
        // Flush metrics before page becomes hidden
        await webVitalsMonitorRef.current.flushNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleVisibilityChange);
    };
  }, []);

  const contextValue: PerformanceContextValue = {
    webVitalsMonitor: webVitalsMonitorRef.current,
    performanceOptimizer: performanceOptimizerRef.current,
    resourceOptimizer: ResourceOptimizer,
    isMonitoring: isInitializedRef.current,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformanceContext = (): PerformanceContextValue => {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error('usePerformanceContext must be used within a PerformanceProvider');
  }
  return context;
};

export default PerformanceProvider;