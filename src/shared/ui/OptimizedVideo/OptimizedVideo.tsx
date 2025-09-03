/**
 * Optimized Video Component for video streaming performance
 * Prevents layout shifts and optimizes video loading
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';
import usePerformance from '../../lib/performance/usePerformance';

// Component variants
const optimizedVideoVariants = cva(
  'relative overflow-hidden transition-opacity duration-300',
  {
    variants: {
      aspectRatio: {
        '16:9': 'aspect-video',
        '4:3': 'aspect-[4/3]',
        '1:1': 'aspect-square',
        '9:16': 'aspect-[9/16]',
      },
      radius: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
      },
      objectFit: {
        contain: 'object-contain',
        cover: 'object-cover',
        fill: 'object-fill',
      },
    },
    defaultVariants: {
      aspectRatio: '16:9',
      radius: 'md',
      objectFit: 'cover',
    },
  }
);

interface OptimizedVideoProps extends VariantProps<typeof optimizedVideoVariants> {
  src: string | string[]; // Single source or array of sources
  poster?: string;
  title: string;
  className?: string;
  
  // Performance optimizations
  preload?: 'none' | 'metadata' | 'auto';
  lazy?: boolean;
  priority?: 'high' | 'normal' | 'low';
  
  // Video behavior
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  playsInline?: boolean;
  
  // Progressive loading
  enableAdaptiveStreaming?: boolean;
  enableQualitySelector?: boolean;
  qualities?: Array<{ label: string; src: string; bandwidth?: number }>;
  
  // Event handlers
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onError?: (error: Error) => void;
  onLoadStart?: () => void;
  onLoadedData?: () => void;
  onProgress?: (progress: { loaded: number; total: number; buffered: TimeRanges }) => void;
  
  // Accessibility
  'aria-label'?: string;
  'data-testid'?: string;
}

const OptimizedVideo: React.FC<OptimizedVideoProps> = ({
  src,
  poster,
  title,
  className,
  preload = 'metadata',
  lazy = true,
  priority = 'normal',
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  playsInline = true,
  enableAdaptiveStreaming = true,
  enableQualitySelector = false,
  qualities,
  onPlay,
  onPause,
  onEnded,
  onError,
  onLoadStart,
  onLoadedData,
  onProgress,
  aspectRatio,
  radius,
  objectFit,
  'aria-label': ariaLabel,
  'data-testid': testId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIntersecting, setIsIntersecting] = useState(priority === 'high');
  const [videoError, setVideoError] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [currentQuality, setCurrentQuality] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const { trackCustomMetric } = usePerformance();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority !== 'low' || isIntersecting) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isIntersecting]);

  // Video event handlers
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setVideoError(false);
    onLoadStart?.();
    
    // Track video load start
    trackCustomMetric('video-load-start', performance.now());
  }, [onLoadStart, trackCustomMetric]);

  const handleLoadedData = useCallback(() => {
    setIsLoading(false);
    onLoadedData?.();
    
    // Track video load complete
    trackCustomMetric('video-load-complete', performance.now());
  }, [onLoadedData, trackCustomMetric]);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const error = new Error(`Video load failed: ${video.error?.message || 'Unknown error'}`);
    
    setVideoError(true);
    setIsLoading(false);
    onError?.(error);
    
    console.error('[OptimizedVideo] Load error:', error);
  }, [onError]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
    
    // Track video play start
    trackCustomMetric('video-play-start', performance.now());
  }, [onPlay, trackCustomMetric]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
    
    // Track video completion
    trackCustomMetric('video-completion', performance.now());
  }, [onEnded, trackCustomMetric]);

  const handleProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const buffered = video.buffered;
    const loaded = buffered.length > 0 ? buffered.end(buffered.length - 1) : 0;
    const total = video.duration || 0;
    
    if (total > 0) {
      const progress = (loaded / total) * 100;
      setLoadProgress(progress);
      
      onProgress?.({
        loaded,
        total,
        buffered: video.buffered,
      });
    }
  }, [onProgress]);

  // Quality selection handler
  const handleQualityChange = useCallback((qualityIndex: number) => {
    const video = videoRef.current;
    if (!video || !qualities) return;

    const currentTime = video.currentTime;
    const wasPlaying = !video.paused;
    
    setCurrentQuality(qualityIndex);
    
    // Track quality change
    trackCustomMetric('video-quality-change', performance.now());
    
    // Update video source
    video.src = qualities[qualityIndex].src;
    video.currentTime = currentTime;
    
    if (wasPlaying) {
      video.play().catch(console.error);
    }
  }, [qualities, trackCustomMetric]);

  // Determine if video should be rendered
  const shouldRenderVideo = priority !== 'low' || isIntersecting;

  // Get video sources
  const getVideoSources = () => {
    if (Array.isArray(src)) {
      return src;
    }
    
    if (qualities && qualities.length > 0) {
      return [qualities[currentQuality].src];
    }
    
    return [src];
  };

  const videoClasses = clsx(
    optimizedVideoVariants({ aspectRatio, radius, objectFit }),
    'w-full h-full',
    isLoading && 'opacity-50',
    className
  );

  // Loading placeholder
  if (!shouldRenderVideo) {
    return (
      <div
        ref={containerRef}
        className={clsx(
          optimizedVideoVariants({ aspectRatio, radius }),
          'bg-gray-100 animate-pulse flex items-center justify-center',
          className
        )}
        data-testid={testId}
        role="img"
        aria-label={`Loading ${title}`}
      >
        <div className="text-gray-400">
          <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    );
  }

  // Error fallback
  if (videoError) {
    return (
      <div
        ref={containerRef}
        className={clsx(
          optimizedVideoVariants({ aspectRatio, radius }),
          'bg-gray-100 flex items-center justify-center flex-col gap-2',
          className
        )}
        data-testid={testId}
        role="img"
        aria-label={`Error loading ${title}`}
      >
        <div className="text-gray-400">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div className="text-sm text-gray-600">비디오를 로드할 수 없습니다</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={clsx(
        optimizedVideoVariants({ aspectRatio, radius }),
        'group relative',
        className
      )}
      data-testid={testId}
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-gray-600">로딩 중... {Math.round(loadProgress)}%</div>
          </div>
        </div>
      )}

      {/* Quality selector */}
      {enableQualitySelector && qualities && qualities.length > 1 && (
        <div className="absolute top-2 right-2 z-20">
          <select
            value={currentQuality}
            onChange={(e) => handleQualityChange(Number(e.target.value))}
            className="bg-black bg-opacity-50 text-white text-sm rounded px-2 py-1 border-none"
          >
            {qualities.map((quality, index) => (
              <option key={index} value={index}>
                {quality.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        className={videoClasses}
        poster={poster}
        preload={lazy ? 'none' : preload}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        controls={controls}
        playsInline={playsInline}
        onLoadStart={handleLoadStart}
        onLoadedData={handleLoadedData}
        onError={handleError}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onProgress={handleProgress}
        aria-label={ariaLabel || title}
      >
        {/* Multiple source support */}
        {getVideoSources().map((source, index) => (
          <source
            key={index}
            src={source}
            type={getVideoMimeType(source)}
          />
        ))}
        
        {/* Fallback for unsupported browsers */}
        <p className="p-4 text-center text-gray-600">
          브라우저가 비디오를 지원하지 않습니다.
          <a href={Array.isArray(src) ? src[0] : src} className="text-blue-600 underline ml-1">
            비디오 다운로드
          </a>
        </p>
      </video>

      {/* Play overlay for better UX */}
      {!isPlaying && !autoPlay && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-colors">
          <button
            onClick={() => videoRef.current?.play()}
            className="w-16 h-16 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-lg hover:bg-opacity-100 transition-all transform hover:scale-105"
            aria-label={`재생: ${title}`}
          >
            <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Get MIME type for video source
 */
function getVideoMimeType(src: string): string {
  const extension = src.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'mp4':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'ogg':
      return 'video/ogg';
    case 'mov':
      return 'video/quicktime';
    case 'avi':
      return 'video/x-msvideo';
    default:
      return 'video/mp4'; // Default fallback
  }
}

export default OptimizedVideo;