/**
 * Progressive Image Loading 컴포넌트
 * Lazy loading + 블러 효과 + 인터섹션 옵저버 기반 로딩
 * Core Web Vitals 최적화를 위한 점진적 향상 전략
 */

'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

import { getOptimizedImageSrc } from './image-optimization';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoadComplete?: () => void;
}

/**
 * 간단한 블러 데이터 URL 생성
 * @param width - 이미지 너비
 * @param height - 이미지 높이
 * @returns 블러 플레이스홀더 데이터 URL
 */
function generateBlurDataURL(width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = 8; // 작은 크기로 블러 효과
  canvas.height = 8;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // 그라데이션으로 블러 효과 시뮬레이션
  const gradient = ctx.createLinearGradient(0, 0, 8, 8);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 8, 8);
  
  return canvas.toDataURL();
}

/**
 * Progressive Image 컴포넌트
 */
export function ProgressiveImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  style = {},
  sizes = '100vw',
  quality = 85,
  placeholder = 'blur',
  blurDataURL,
  onLoadComplete
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority 이미지는 즉시 로드
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // 인터섹션 옵저버로 지연 로딩 구현
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px' // 50px 전에 미리 로드
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  // 로드 완료 핸들러
  const handleLoadComplete = () => {
    setIsLoaded(true);
    onLoadComplete?.();
  };

  // 에러 핸들러
  const handleError = () => {
    setError(true);
    console.warn(`Failed to load image: ${src}`);
  };

  // 최적화된 이미지 소스
  const optimizedSrc = getOptimizedImageSrc(src);
  
  // 블러 데이터 URL 생성 (클라이언트 사이드에서만)
  const placeholderDataURL = blurDataURL || 
    (typeof window !== 'undefined' ? generateBlurDataURL(width, height) : '');

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: style.width || 'auto',
        height: style.height || 'auto',
        ...style
      }}
    >
      {/* 로딩 상태 표시 */}
      {!isLoaded && !error && isInView && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 실제 이미지 */}
      {isInView && !error && (
        <Image
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          quality={quality}
          priority={priority}
          loading={priority ? 'eager' : 'lazy'}
          sizes={sizes}
          placeholder={placeholder === 'blur' && placeholderDataURL ? 'blur' : 'empty'}
          blurDataURL={placeholderDataURL}
          onLoad={handleLoadComplete}
          onError={handleError}
          style={{
            objectFit: 'cover',
            transition: 'opacity 0.3s ease-in-out',
            opacity: isLoaded ? 1 : 0
          }}
        />
      )}

      {/* 에러 상태 */}
      {error && (
        <div 
          className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400"
          style={{
            width: '100%',
            height: '100%'
          }}
        >
          <div className="text-center">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-sm">이미지를 불러올 수 없습니다</div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 이미지 사전 로드 훅
 * Critical 이미지들을 백그라운드에서 미리 로드
 */
export function useImagePreload(imageSources: string[]) {
  useEffect(() => {
    const preloadImages = imageSources.map(src => {
      const optimizedSrc = getOptimizedImageSrc(src);
      const img = new window.Image();
      img.src = optimizedSrc;
      return img;
    });

    // 메모리 정리
    return () => {
      preloadImages.forEach(img => {
        img.src = '';
      });
    };
  }, [imageSources]);
}

/**
 * 중요 이미지들 사전 로드 컴포넌트
 */
export function ImagePreloader() {
  const criticalImages = [
    '/images/Home/new/visual-bg.webp',
    '/images/Home/bg05.webp',
    '/images/Home/new/visual-img.png'
  ];

  useImagePreload(criticalImages);

  return null; // 렌더링하지 않음
}

export default ProgressiveImage;