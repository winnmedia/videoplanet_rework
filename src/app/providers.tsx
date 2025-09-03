'use client'

import { ReactNode, useEffect } from 'react'
import { Provider } from 'react-redux'
import { store } from './store'
import PerformanceProvider from '../shared/lib/performance/PerformanceProvider'
import { 
  initRUMCollector, 
  initPerformanceAlerts, 
  registerServiceWorker 
} from '../shared/lib/performance'

export interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    // Initialize performance monitoring systems
    const initializePerformanceSystems = async () => {
      try {
        // Initialize RUM collector
        const rumCollector = initRUMCollector({
          endpoint: '/api/performance/rum',
          enableInDevelopment: process.env.NODE_ENV === 'development',
          samplingRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        });

        // Initialize performance alerts
        const alertSystem = initPerformanceAlerts({
          enabled: true,
          channels: {
            console: true,
            browser: process.env.NODE_ENV === 'production',
            webhook: !!process.env.NEXT_PUBLIC_PERFORMANCE_WEBHOOK_URL,
            email: false,
          },
        });

        // Request notification permission for alerts
        if (process.env.NODE_ENV === 'production') {
          await alertSystem.requestNotificationPermission();
        }

        // Register service worker for caching
        await registerServiceWorker({
          enableInDevelopment: false,
          updateCheckInterval: 60000, // Check for updates every minute
          onUpdate: (registration) => {
            console.log('[App] Service Worker update available');
            // Could show update notification to user
          },
          onSuccess: (registration) => {
            console.log('[App] Service Worker ready for offline use');
          },
          onError: (error) => {
            console.error('[App] Service Worker registration failed:', error);
          },
        });

        console.log('[App] Performance systems initialized');
      } catch (error) {
        console.error('[App] Failed to initialize performance systems:', error);
      }
    };

    initializePerformanceSystems();
  }, []);

  return (
    <Provider store={store}>
      <PerformanceProvider
        enableInDevelopment={true}
        enableResourceOptimization={true}
        onPerformanceIssue={(issue) => {
          console.warn('[App] Performance issue detected:', issue);
          
          // Send to RUM collector
          const rumCollector = require('../shared/lib/performance').getRUMCollector();
          if (rumCollector) {
            rumCollector.recordPerformanceIssue(issue);
          }

          // Send to alert system
          const alertSystem = require('../shared/lib/performance').getPerformanceAlerts();
          if (alertSystem && 'webVitalMetric' in issue.data) {
            alertSystem.processMetric(issue.data);
          }
        }}
      >
        {children}
      </PerformanceProvider>
    </Provider>
  )
}