/**
 * 이미지 최적화 유틸리티
 * WebP 버전이 있는 경우 자동으로 매핑하여 성능 최적화
 * LCP 목표: 20s → 2.5s
 */

// WebP 버전이 존재하는 이미지들 (스크립트로 생성한 파일들)
const WEBP_AVAILABLE_IMAGES = new Set([
  '/images/Home/gif.webp',
  '/images/Home/bg05.webp',
  '/images/Home/bg06.webp',
  '/images/Home/new/visual-bg.webp',
  '/images/Home/bg01.webp',
  '/images/Home/w_bg02.webp',
  '/images/Home/bg03.webp',
  '/images/Home/bg04.webp',
  '/images/Home/new/end-bg.webp',
  '/images/Home/n_bg.webp',
  '/images/Home/bg08.webp',
  '/images/Home/w_bg.webp',
  '/images/Home/bg02.webp',
  '/images/Cms/video_sample.webp'
]);

/**
 * 이미지 경로를 최적화된 WebP 버전으로 변환
 * @param originalPath - 원본 이미지 경로
 * @returns 최적화된 이미지 경로 (WebP 또는 원본)
 */
export function getOptimizedImageSrc(originalPath: string): string {
  // WebP 버전이 있는지 확인
  if (WEBP_AVAILABLE_IMAGES.has(originalPath)) {
    return originalPath; // 이미 WebP 경로
  }
  
  // WebP 버전으로 변환 시도
  const webpPath = originalPath.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp');
  if (WEBP_AVAILABLE_IMAGES.has(webpPath)) {
    return webpPath;
  }
  
  // WebP 버전이 없으면 원본 반환
  return originalPath;
}

/**
 * Next.js Image 컴포넌트용 최적화된 props 생성
 * @param src - 이미지 소스 경로
 * @param alt - 대체 텍스트
 * @param options - 추가 옵션들
 */
export interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  className?: string;
  style?: React.CSSProperties;
  sizes?: string;
}

export function getOptimizedImageProps(
  originalSrc: string,
  alt: string,
  dimensions: { width: number; height: number },
  options: Partial<OptimizedImageProps> = {}
): OptimizedImageProps {
  const optimizedSrc = getOptimizedImageSrc(originalSrc);
  
  return {
    src: optimizedSrc,
    alt,
    width: dimensions.width,
    height: dimensions.height,
    loading: options.priority ? 'eager' : 'lazy',
    sizes: options.sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    ...options,
  };
}

/**
 * 이미지 타입별 최적화 설정
 */
export const IMAGE_OPTIMIZATION_CONFIGS = {
  hero: {
    sizes: '100vw',
    priority: true,
    quality: 85
  },
  background: {
    sizes: '100vw',
    priority: false,
    quality: 80
  },
  content: {
    sizes: '(max-width: 768px) 100vw, 50vw',
    priority: false,
    quality: 85
  },
  thumbnail: {
    sizes: '(max-width: 768px) 50vw, 25vw',
    priority: false,
    quality: 80
  },
  icon: {
    sizes: '64px',
    priority: false,
    quality: 90
  }
} as const;

/**
 * 성능 모니터링을 위한 이미지 로드 추적
 * @param imageSrc - 이미지 소스
 * @param loadTime - 로드 시간 (ms)
 */
export function trackImagePerformance(imageSrc: string, loadTime: number): void {
  if (typeof window !== 'undefined' && window.performance) {
    // 성능 데이터 수집 (실제 구현에서는 analytics로 전송)
    console.log(`Image loaded: ${imageSrc} in ${loadTime}ms`);
    
    // Core Web Vitals 개선을 위한 LCP 추적
    if (loadTime > 2500) {
      console.warn(`Slow image load detected: ${imageSrc} (${loadTime}ms) - Consider further optimization`);
    }
  }
}

/**
 * 브라우저 WebP 지원 감지
 * @returns WebP 지원 여부
 */
export function supportsWebP(): Promise<boolean> {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
}