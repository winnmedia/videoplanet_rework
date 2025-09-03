/**
 * LazyLoader Component for performance optimization
 * Prevents unnecessary rendering and improves INP
 */

'use client';

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { clsx } from 'clsx';
import usePerformance from '../../lib/performance/usePerformance';

interface LazyLoaderProps {
  children: ReactNode;
  className?: string;
  
  // Loading behavior
  threshold?: number; // Intersection threshold (0-1)
  rootMargin?: string; // Root margin for intersection observer
  triggerOnce?: boolean; // Only trigger loading once
  
  // Performance tracking
  trackingName?: string; // Name for performance tracking
  
  // Loading states
  placeholder?: ReactNode;
  errorFallback?: ReactNode;
  loadingIndicator?: ReactNode;
  
  // Callbacks
  onIntersect?: () => void;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  
  // Advanced options
  enableSuspense?: boolean;
  preloadDistance?: number; // Distance in pixels to start preloading
  
  // Accessibility
  'aria-label'?: string;
  'data-testid'?: string;
}

const LazyLoader: React.FC<LazyLoaderProps> = ({
  children,
  className,
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  trackingName,
  placeholder,
  errorFallback,
  loadingIndicator,
  onIntersect,
  onLoad,
  onError,
  enableSuspense = false,
  preloadDistance = 200,
  'aria-label': ariaLabel,
  'data-testid': testId,
}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadStartTime = useRef<number>(0);
  
  const { trackCustomMetric } = usePerformance();

  // Intersection Observer setup
  useEffect(() => {
    if (hasLoaded && triggerOnce) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          loadStartTime.current = performance.now();
          
          onIntersect?.();
          
          if (trackingName) {
            trackCustomMetric(`lazy-${trackingName}-intersect`, performance.now());
          }

          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce, hasLoaded, onIntersect, trackingName, trackCustomMetric]);

  // Handle loading process
  useEffect(() => {
    if (!isIntersecting || hasLoaded || hasError) return;

    const startLoading = async () => {
      setIsLoading(true);
      
      try {
        // Simulate loading time for tracking
        await new Promise(resolve => setTimeout(resolve, 0));
        
        setHasLoaded(true);
        setIsLoading(false);
        
        onLoad?.();
        
        // Track loading performance
        if (trackingName && loadStartTime.current > 0) {
          const loadTime = performance.now() - loadStartTime.current;
          trackCustomMetric(`lazy-${trackingName}-load`, loadTime);
        }
        
      } catch (error) {
        const loadError = error instanceof Error ? error : new Error('Loading failed');
        setHasError(true);
        setIsLoading(false);
        onError?.(loadError);
        
        console.error('[LazyLoader] Loading failed:', loadError);
      }
    };

    startLoading();
  }, [isIntersecting, hasLoaded, hasError, onLoad, onError, trackingName, trackCustomMetric]);

  // Loading indicator component
  const LoadingIndicator = () => (
    loadingIndicator || (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm text-gray-600">로딩 중...</div>
        </div>
      </div>
    )
  );

  // Error fallback component
  const ErrorFallback = () => (
    errorFallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-gray-400 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="text-sm text-gray-600">로딩에 실패했습니다</div>
          <button
            onClick={() => {
              setHasError(false);
              setIsIntersecting(true);
            }}
            className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  );

  // Placeholder component
  const Placeholder = () => (
    placeholder || (
      <div className="bg-gray-100 animate-pulse p-8 flex items-center justify-center">
        <div className="text-gray-400">
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      </div>
    )
  );

  return (
    <div
      ref={containerRef}
      className={clsx('relative', className)}
      data-testid={testId}
      aria-label={ariaLabel}
    >
      {hasError ? (
        <ErrorFallback />
      ) : isLoading ? (
        <LoadingIndicator />
      ) : hasLoaded ? (
        children
      ) : (
        <Placeholder />
      )}
    </div>
  );
};

export default LazyLoader;