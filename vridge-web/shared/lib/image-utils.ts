/**
 * @fileoverview Image Utilities
 * @description 이미지 처리, 최적화, 로딩을 위한 유틸리티 함수들
 * @layer shared/lib
 */

interface ImageLoadResult {
  success: boolean
  error?: string
  width?: number
  height?: number
  size?: number
}

interface ImageValidationOptions {
  maxWidth?: number
  maxHeight?: number
  maxSize?: number
  allowedFormats?: string[]
}

interface ModernFormatSupport {
  webp: boolean
  avif: boolean
}

interface ImageCacheData {
  data: string
  timestamp: number
  size?: number
}

interface PriorityImage {
  src: string
  priority: 'high' | 'medium' | 'low'
}

interface ImageMetrics {
  loadTime: number
  size: number
  cached: boolean
}

/**
 * 이미지를 미리 로드합니다
 */
export async function preloadImage(src: string): Promise<ImageLoadResult> {
  return new Promise((resolve) => {
    const img = new Image()
    
    img.onload = () => {
      resolve({
        success: true,
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    
    img.onerror = () => {
      resolve({
        success: false,
        error: `Failed to load image: ${src}`
      })
    }
    
    img.src = src
  })
}

/**
 * 이미지 차원을 검증합니다
 */
export async function validateImageDimensions(
  file: File,
  options: ImageValidationOptions
): Promise<{ valid: boolean; error?: string; dimensions?: { width: number; height: number } }> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      
      const { naturalWidth: width, naturalHeight: height } = img
      const { maxWidth = Infinity, maxHeight = Infinity } = options
      
      if (width > maxWidth || height > maxHeight) {
        resolve({
          valid: false,
          error: `Image dimensions ${width}x${height} exceed limits ${maxWidth}x${maxHeight}`,
          dimensions: { width, height }
        })
        return
      }
      
      resolve({
        valid: true,
        dimensions: { width, height }
      })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({
        valid: false,
        error: 'Failed to load image for validation'
      })
    }
    
    img.src = url
  })
}

/**
 * 반응형 이미지 소스들을 생성합니다
 */
export async function generateResponsiveImages(baseSrc: string, sizes: number[]): Promise<string[]> {
  const sources = sizes.map(size => {
    const extension = baseSrc.split('.').pop()
    const baseName = baseSrc.replace(`.${extension}`, '')
    return `${baseName}_${size}w.${extension}`
  })
  
  return sources
}

/**
 * Lazy 이미지 로더를 생성합니다
 */
export function createLazyImageLoader(): IntersectionObserver {
  if (typeof window === 'undefined') {
    // 서버사이드에서는 빈 객체 반환
    return {} as IntersectionObserver
  }
  
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          const src = img.dataset.src
          
          if (src) {
            img.src = src
            img.classList.remove('lazy')
            observer.unobserve(img)
          }
        }
      })
    },
    {
      rootMargin: '50px'
    }
  )
  
  return observer
}

/**
 * Fallback과 함께 이미지를 로드합니다
 */
export async function loadImageWithFallback(
  src: string,
  fallback: string
): Promise<{ success: boolean; usedFallback: boolean; finalSrc: string }> {
  try {
    const result = await preloadImage(src)
    
    if (result.success) {
      return {
        success: true,
        usedFallback: false,
        finalSrc: src
      }
    }
    
    // 메인 이미지 실패 시 fallback 시도
    const fallbackResult = await preloadImage(fallback)
    
    return {
      success: fallbackResult.success,
      usedFallback: true,
      finalSrc: fallback
    }
  } catch (error) {
    return {
      success: false,
      usedFallback: true,
      finalSrc: fallback
    }
  }
}

/**
 * 모던 이미지 포맷 지원을 검사합니다
 */
export async function supportsModernFormats(): Promise<ModernFormatSupport> {
  if (typeof window === 'undefined') {
    return { webp: false, avif: false }
  }
  
  const checkWebP = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const webP = new Image()
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2)
      }
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
    })
  }
  
  const checkAVIF = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const avif = new Image()
      avif.onload = avif.onerror = () => {
        resolve(avif.height === 2)
      }
      avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A='
    })
  }
  
  const [webp, avif] = await Promise.all([checkWebP(), checkAVIF()])
  
  return { webp, avif }
}

/**
 * 브라우저 지원에 따라 최적화된 이미지 경로를 반환합니다
 */
export function getOptimalImageSrc(originalSrc: string): string {
  // 클라이언트 사이드에서만 동작
  if (typeof window === 'undefined') {
    return originalSrc
  }
  
  // 단순화된 구현 - 실제로는 format support를 체크해야 함
  const extension = originalSrc.split('.').pop()?.toLowerCase()
  
  if (extension && ['jpg', 'jpeg', 'png'].includes(extension)) {
    // WebP 지원 시 WebP로 변경 (실제 구현에서는 동적으로 체크)
    const baseName = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '')
    return `${baseName}.webp`
  }
  
  return originalSrc
}

/**
 * 허용된 이미지 타입인지 검증합니다
 */
export function validateImageType(type: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(type)
}

/**
 * 이미지를 압축합니다
 */
export async function compressImage(
  file: File,
  options: { quality?: number; maxWidth?: number; maxHeight?: number } = {}
): Promise<File> {
  return new Promise((resolve, reject) => {
    const { quality = 0.8, maxWidth = 1200, maxHeight = 1200 } = options
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = img
      
      // 비율 유지하면서 최대 크기 계산
      let newWidth = width
      let newHeight = height
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        newWidth = width * ratio
        newHeight = height * ratio
      }
      
      canvas.width = newWidth
      canvas.height = newHeight
      
      ctx?.drawImage(img, 0, 0, newWidth, newHeight)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        file.type,
        quality
      )
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * 이미지를 리사이즈합니다
 */
export async function resizeImage(canvas: HTMLCanvasElement, width: number, height: number): Promise<HTMLCanvasElement> {
  const resizedCanvas = document.createElement('canvas')
  const ctx = resizedCanvas.getContext('2d')
  
  resizedCanvas.width = width
  resizedCanvas.height = height
  
  if (ctx) {
    ctx.drawImage(canvas, 0, 0, width, height)
  }
  
  return resizedCanvas
}

/**
 * 최적 이미지 차원을 계산합니다
 */
export function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight
  
  let newWidth = originalWidth
  let newHeight = originalHeight
  
  if (originalWidth > maxWidth) {
    newWidth = maxWidth
    newHeight = maxWidth / aspectRatio
  }
  
  if (newHeight > maxHeight) {
    newHeight = maxHeight
    newWidth = maxHeight * aspectRatio
  }
  
  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight)
  }
}

/**
 * 이미지 캐시 클래스
 */
export class ImageCache {
  private cache = new Map<string, ImageCacheData>()
  private maxAge = 5 * 60 * 1000 // 5분
  
  async get(key: string): Promise<string | null> {
    const cached = this.cache.get(key)
    
    if (!cached) {
      return null
    }
    
    if (Date.now() - cached.timestamp > this.maxAge) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }
  
  async set(key: string, data: string, size?: number): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size
    })
  }
  
  clear(): void {
    this.cache.clear()
  }
}

/**
 * 우선순위에 따라 이미지들을 미리 로드합니다
 */
export async function preloadImagesByPriority(
  images: PriorityImage[]
): Promise<{ high: ImageLoadResult[]; medium: ImageLoadResult[]; low: ImageLoadResult[] }> {
  const grouped = images.reduce(
    (acc, img) => {
      acc[img.priority].push(img.src)
      return acc
    },
    { high: [] as string[], medium: [] as string[], low: [] as string[] }
  )
  
  // 우선순위 순서로 순차적으로 로드
  const high = await Promise.all(grouped.high.map(preloadImage))
  const medium = await Promise.all(grouped.medium.map(preloadImage))
  const low = await Promise.all(grouped.low.map(preloadImage))
  
  return { high, medium, low }
}

/**
 * 이미지 로딩 성능을 추적합니다
 */
export class ImagePerformanceTracker {
  private startTimes = new Map<string, number>()
  private metrics = new Map<string, ImageMetrics>()
  
  startTracking(src: string): void {
    this.startTimes.set(src, performance.now())
  }
  
  endTracking(src: string, size?: number, cached = false): void {
    const startTime = this.startTimes.get(src)
    
    if (startTime) {
      const loadTime = performance.now() - startTime
      
      this.metrics.set(src, {
        loadTime,
        size: size || 0,
        cached
      })
      
      this.startTimes.delete(src)
    }
  }
  
  getMetrics(src: string): ImageMetrics | undefined {
    return this.metrics.get(src)
  }
  
  getAllMetrics(): Map<string, ImageMetrics> {
    return new Map(this.metrics)
  }
}

/**
 * 이미지 컨텍스트에서 alt 텍스트를 생성합니다
 */
export function generateAltText(
  src: string,
  context?: { context?: string; role?: string }
): string {
  const filename = src.split('/').pop()?.split('.')[0] || ''
  
  if (context?.role && context?.context) {
    return `${context.role} image in ${context.context}`
  }
  
  // 파일명 기반으로 간단한 alt 텍스트 생성
  return filename.replace(/[-_]/g, ' ')
}

/**
 * 이미지 접근성을 검증합니다
 */
export function validateImageAccessibility(img: HTMLImageElement): { isValid: boolean; issues: string[] } {
  const issues: string[] = []
  
  if (!img.alt) {
    issues.push('Missing alt attribute')
  }
  
  if (img.alt && img.alt.length > 125) {
    issues.push('Alt text too long (should be under 125 characters)')
  }
  
  if (!img.src) {
    issues.push('Missing src attribute')
  }
  
  return {
    isValid: issues.length === 0,
    issues
  }
}

/**
 * 이미지용 구조화된 데이터를 생성합니다
 */
export function createImageStructuredData(image: {
  src: string
  alt: string
  caption?: string
  license?: string
  creator?: string
}): Record<string, any> {
  return {
    '@type': 'ImageObject',
    contentUrl: image.src,
    description: image.alt,
    caption: image.caption,
    license: image.license,
    creator: image.creator ? { '@type': 'Person', name: image.creator } : undefined
  }
}