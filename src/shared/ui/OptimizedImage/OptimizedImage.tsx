/**
 * Optimized Image Component for LCP and CLS optimization
 * Prevents layout shifts and optimizes loading performance
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { cva, type VariantProps } from 'class-variance-authority';

// Component variants for different use cases
const optimizedImageVariants = cva(
  'transition-opacity duration-300', // Base styles
  {
    variants: {
      priority: {
        high: 'opacity-100', // LCP candidate - load immediately
        normal: 'opacity-0', // Lazy load
        low: 'opacity-0',    // Very lazy load
      },
      objectFit: {
        contain: 'object-contain',
        cover: 'object-cover',
        fill: 'object-fill',
        'scale-down': 'object-scale-down',
        none: 'object-none',
      },
      radius: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      priority: 'normal',
      objectFit: 'cover',
      radius: 'none',
    },
  }
);

interface OptimizedImageProps extends VariantProps<typeof optimizedImageVariants> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  
  // Performance optimizations
  priority?: 'high' | 'normal' | 'low';
  lazy?: boolean;
  blur?: boolean;
  placeholder?: 'blur' | 'empty' | string;
  blurDataURL?: string;
  
  // Responsive behavior
  sizes?: string;
  responsive?: boolean;
  aspectRatio?: number; // width/height ratio for consistent layout
  
  // Event handlers
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onLoadingComplete?: () => void;
  
  // Accessibility
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'sync' | 'auto';
  
  // Custom attributes
  'data-testid'?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className,
  priority = 'normal',
  lazy = true,
  blur = true,
  placeholder = 'blur',
  blurDataURL,
  sizes,
  responsive = false,
  aspectRatio,
  onLoad,
  onError,
  onLoadingComplete,
  loading,
  decoding,
  objectFit,
  radius,
  'data-testid': testId,
  ...props
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(priority === 'high');
  const imgRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for very lazy loading
  React.useEffect(() => {
    if (priority !== 'low' || isIntersecting) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.1,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isIntersecting]);

  // Handle image load success
  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image load error
  const handleError = useCallback((error: React.SyntheticEvent<HTMLImageElement>) => {
    setImageError(true);
    const imgElement = error.currentTarget;
    onError?.(new Error(imgElement.error?.message || 'Image failed to load'));
  }, [onError]);

  // Handle loading complete
  const handleLoadingComplete = useCallback(() => {
    onLoadingComplete?.();
  }, [onLoadingComplete]);

  // Calculate aspect ratio dimensions
  const getAspectRatioDimensions = () => {
    if (!aspectRatio) return { width, height };
    
    if (width && !height) {
      return { width, height: Math.round(width / aspectRatio) };
    }
    
    if (height && !width) {
      return { width: Math.round(height * aspectRatio), height };
    }
    
    return { width, height };
  };

  const { width: finalWidth, height: finalHeight } = getAspectRatioDimensions();

  // Generate blur placeholder if needed
  const generateBlurDataURL = useCallback((w: number, h: number) => {
    if (blurDataURL) return blurDataURL;
    
    // Generate simple blur placeholder
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#f3f4f6'; // gray-100
      ctx.fillRect(0, 0, w, h);
    }
    
    return canvas.toDataURL();
  }, [blurDataURL]);

  // Determine loading strategy
  const getLoadingStrategy = () => {
    if (priority === 'high') return 'eager';
    if (loading) return loading;
    if (!lazy) return 'eager';
    return 'lazy';
  };

  // Determine if image should be rendered (for very lazy loading)
  const shouldRenderImage = priority !== 'low' || isIntersecting;

  // Container styles for consistent layout
  const containerStyle: React.CSSProperties = {};
  
  if (aspectRatio && responsive) {
    containerStyle.aspectRatio = aspectRatio.toString();
  } else if (finalWidth && finalHeight) {
    containerStyle.width = finalWidth;
    containerStyle.height = finalHeight;
  }

  const imageClasses = clsx(
    optimizedImageVariants({ priority, objectFit, radius }),
    imageLoaded && 'opacity-100',
    imageError && 'opacity-50',
    className
  );

  // Error fallback component
  if (imageError) {
    return (
      <div
        ref={imgRef}
        className={clsx(
          'flex items-center justify-center bg-gray-100 text-gray-400',
          imageClasses
        )}
        style={containerStyle}
        data-testid={testId}
        role="img"
        aria-label={alt}
      >
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  // Placeholder for very lazy loading
  if (!shouldRenderImage) {
    return (
      <div
        ref={imgRef}
        className={clsx(
          'bg-gray-100 animate-pulse',
          imageClasses
        )}
        style={containerStyle}
        data-testid={testId}
        role="img"
        aria-label={`Loading ${alt}`}
      />
    );
  }

  return (
    <div
      ref={imgRef}
      style={containerStyle}
      className={responsive ? 'relative' : undefined}
      data-testid={testId}
    >
      <Image
        src={src}
        alt={alt}
        width={finalWidth}
        height={finalHeight}
        className={imageClasses}
        priority={priority === 'high'}
        loading={getLoadingStrategy()}
        decoding={decoding || (priority === 'high' ? 'sync' : 'async')}
        placeholder={blur && placeholder === 'blur' ? 'blur' : 'empty'}
        blurDataURL={
          blur && placeholder === 'blur' && finalWidth && finalHeight
            ? generateBlurDataURL(finalWidth, finalHeight)
            : undefined
        }
        sizes={
          sizes ||
          (responsive
            ? '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            : undefined)
        }
        onLoad={handleLoad}
        onError={handleError}
        onLoadingComplete={handleLoadingComplete}
        fill={responsive}
        {...(responsive && { style: { objectFit: objectFit || 'cover' } })}
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;