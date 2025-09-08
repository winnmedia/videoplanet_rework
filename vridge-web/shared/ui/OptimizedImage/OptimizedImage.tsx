/**
 * FSD-compliant 최적화된 이미지 컴포넌트
 * WebP 형식 우선 사용, 성능 최적화 적용
 * 
 * @example
 * <OptimizedImage 
 *   src="/images/User/bg" 
 *   alt="User background"
 *   width={1920}
 *   height={1080}
 * />
 */

import Image, { ImageProps } from 'next/image'

export interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string
  alt: string
}

// WebP 최적화된 이미지 경로 매핑
const IMAGE_OPTIMIZATIONS: Record<string, string> = {
  '/images/User/bg': '/images/User/bg.webp',
  '/images/Home/w_bg': '/images/Home/w_bg.webp',
  '/images/Home/new/visual-bg': '/images/Home/new/visual-bg.webp',
  '/images/Home/new/end-bg': '/images/Home/new/end-bg.webp',
}

// Critical 이미지들 (Above-the-fold)
const CRITICAL_IMAGES = new Set([
  '/images/User/bg.webp',
  '/images/Home/new/visual-bg.webp',
])

export function OptimizedImage({ src, alt, ...props }: OptimizedImageProps) {
  // WebP 버전이 있으면 우선 사용
  const optimizedSrc = IMAGE_OPTIMIZATIONS[src] || src
  
  // Critical 이미지인지 확인
  const isCritical = CRITICAL_IMAGES.has(optimizedSrc)
  
  return (
    <Image
      {...props}
      src={optimizedSrc}
      alt={alt}
      priority={isCritical}
      quality={isCritical ? 85 : 75}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  )
}