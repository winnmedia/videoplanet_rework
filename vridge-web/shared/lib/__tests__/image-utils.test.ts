/**
 * @fileoverview Image Utilities Unit Tests
 * @description 이미지 관련 유틸리티 함수들의 TDD 테스트
 * @layer shared/lib
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// 이미지 유틸리티 함수들 (TDD - Red phase에서는 존재하지 않음)
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

describe('Image Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Image Loading Utilities', () => {
    it('should preload critical images', async () => {
      const { preloadImage } = await import('../image-utils')
      
      // Mock Image constructor for test
      global.Image = class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        naturalWidth = 1920
        naturalHeight = 1080
        _src = ''
        
        get src() { return this._src }
        set src(value: string) {
          this._src = value
          setTimeout(() => {
            if (this.onload && value.includes('visual-img.png')) {
              this.onload()
            }
          }, 0)
        }
      } as any
      
      const result = await preloadImage('/images/Home/new/visual-img.png')
      expect(result.success).toBe(true)
      expect(result.width).toBe(1920)
      expect(result.height).toBe(1080)
    })

    it('should validate image dimensions', async () => {
      const { validateImageDimensions } = await import('../image-utils')
      
      // Mock URL methods
      global.URL = {
        createObjectURL: vi.fn().mockReturnValue('blob:test'),
        revokeObjectURL: vi.fn()
      } as any
      
      global.Image = class {
        onload: (() => void) | null = null
        naturalWidth = 800
        naturalHeight = 600
        src = ''
        
        set src(value: string) {
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      } as any
      
      const mockFile = new File(['dummy'], 'test.png', { type: 'image/png' })
      const result = await validateImageDimensions(mockFile, { maxWidth: 1920, maxHeight: 1080 })
      
      expect(result.valid).toBe(true)
      expect(result.dimensions?.width).toBe(800)
      expect(result.dimensions?.height).toBe(600)
    })

    it('should generate responsive image sources', async () => {
      const { generateResponsiveImages } = await import('../image-utils')
      
      const sources = await generateResponsiveImages('/images/sample.png', [480, 768, 1200])
      expect(sources).toHaveLength(3)
      expect(sources).toContain('/images/sample_480w.png')
      expect(sources).toContain('/images/sample_768w.png')
      expect(sources).toContain('/images/sample_1200w.png')
    })

    it('should create lazy image loader with intersection observer', async () => {
      const { createLazyImageLoader } = await import('../image-utils')
      
      // Mock IntersectionObserver
      global.IntersectionObserver = class {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      } as any
      
      const loader = createLazyImageLoader()
      expect(loader).toBeDefined()
      expect(typeof loader.observe).toBe('function')
    })

    it('should handle image loading errors with fallback', async () => {
      const { loadImageWithFallback } = await import('../image-utils')
      
      global.Image = class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        src = ''
        
        set src(value: string) {
          setTimeout(() => {
            if (value.includes('broken.png') && this.onerror) {
              this.onerror()
            } else if (value.includes('placeholder.png') && this.onload) {
              this.onload()
            }
          }, 0)
        }
      } as any
      
      const result = await loadImageWithFallback('/images/broken.png', '/images/placeholder.png')
      expect(result.usedFallback).toBe(true)
      expect(result.finalSrc).toBe('/images/placeholder.png')
    })
  })

  describe('Image Format Detection', () => {
    it('should detect modern image format support in browser environment', async () => {
      const { supportsModernFormats } = await import('../image-utils')
      
      global.Image = class {
        onload: (() => void) | null = null
        onerror: (() => void) | null = null
        height = 2
        src = ''
        
        set src(value: string) {
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      } as any
      
      const supports = await supportsModernFormats()
      expect(supports.webp).toBe(true)
      expect(supports.avif).toBe(true)
    })

    it('should convert image format based on browser support', async () => {
      const { getOptimalImageSrc } = await import('../image-utils')
      
      const optimized = getOptimalImageSrc('/images/sample.jpg')
      expect(optimized).toBe('/images/sample.webp') // WebP로 최적화
    })

    it('should validate file type against allowed formats', async () => {
      const { validateImageType } = await import('../image-utils')
      
      const isValid = validateImageType('image/webp', ['image/jpeg', 'image/png'])
      expect(isValid).toBe(false) // webp는 허용된 형식이 아님
      
      const isValidJpeg = validateImageType('image/jpeg', ['image/jpeg', 'image/png'])
      expect(isValidJpeg).toBe(true)
    })
  })

  describe('Image Optimization', () => {
    it('should compress image file size', async () => {
      const { compressImage } = await import('../image-utils')
      
      // Mock canvas and context
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn()
        }),
        toBlob: vi.fn().mockImplementation((callback, type, quality) => {
          const blob = new Blob(['compressed'], { type: 'image/png' })
          callback(blob)
        })
      }
      
      global.HTMLCanvasElement = vi.fn().mockImplementation(() => mockCanvas)
      document.createElement = vi.fn().mockReturnValue(mockCanvas)
      
      global.URL = {
        createObjectURL: vi.fn().mockReturnValue('blob:test'),
        revokeObjectURL: vi.fn()
      } as any
      
      global.Image = class {
        onload: (() => void) | null = null
        naturalWidth = 2000
        naturalHeight = 1500
        src = ''
        
        set src(value: string) {
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      } as any
      
      const mockFile = new File(['dummy content for large file'], 'large.png', { type: 'image/png' })
      const compressed = await compressImage(mockFile, { quality: 0.8, maxWidth: 1200 })
      
      expect(compressed).toBeInstanceOf(File)
      expect(compressed.name).toBe('large.png')
    })

    it('should resize image to specific dimensions', async () => {
      const { resizeImage } = await import('../image-utils')
      
      const mockCanvas = {
        width: 800,
        height: 600,
        getContext: vi.fn().mockReturnValue({
          drawImage: vi.fn()
        })
      }
      
      document.createElement = vi.fn().mockReturnValue(mockCanvas)
      
      const originalCanvas = document.createElement('canvas')
      const resized = await resizeImage(originalCanvas as HTMLCanvasElement, 800, 600)
      
      expect(resized.width).toBe(800)
      expect(resized.height).toBe(600)
    })

    it('should calculate optimal image dimensions', async () => {
      const { calculateOptimalDimensions } = await import('../image-utils')
      
      const optimal = calculateOptimalDimensions(4000, 3000, 1200, 900)
      expect(optimal.width).toBe(1200) // 비율 유지하면서 최대 너비로 제한
      expect(optimal.height).toBe(900) // 비율에 따라 조정된 높이
    })
  })

  describe('Performance and Caching', () => {
    it('should implement image caching strategy', async () => {
      const { ImageCache } = await import('../image-utils')
      
      const cache = new ImageCache()
      await cache.set('/images/test.png', 'cached-data')
      
      const cached = await cache.get('/images/test.png')
      expect(cached).toBe('cached-data')
    })

    it('should preload images based on priority', async () => {
      const { preloadImagesByPriority } = await import('../image-utils')
      
      global.Image = class {
        onload: (() => void) | null = null
        src = ''
        
        set src(value: string) {
          setTimeout(() => {
            if (this.onload) this.onload()
          }, 0)
        }
      } as any
      
      const images = [
        { src: '/images/hero.png', priority: 'high' as const },
        { src: '/images/content.png', priority: 'low' as const }
      ]
      
      const results = await preloadImagesByPriority(images)
      expect(results.high).toHaveLength(1)
      expect(results.low).toHaveLength(1)
      expect(results.high[0].success).toBe(true)
      expect(results.low[0].success).toBe(true)
    })

    it('should track image loading performance', async () => {
      const { ImagePerformanceTracker } = await import('../image-utils')
      
      // Mock performance.now
      let time = 0
      global.performance = {
        now: vi.fn(() => time)
      } as any
      
      const tracker = new ImagePerformanceTracker()
      tracker.startTracking('/images/test.png')
      
      time = 100 // Simulate 100ms
      tracker.endTracking('/images/test.png', 1024)
      
      const metrics = tracker.getMetrics('/images/test.png')
      expect(metrics).toBeDefined()
      expect(metrics?.loadTime).toBe(100)
      expect(metrics?.size).toBe(1024)
    })
  })

  describe('Accessibility and SEO', () => {
    it('should generate alt text from image context', async () => {
      const { generateAltText } = await import('../image-utils')
      
      const altText = generateAltText('/images/team-photo.png', { context: 'about page', role: 'team showcase' })
      expect(altText).toBe('team showcase image in about page')
      
      const simpleAltText = generateAltText('/images/user_profile.png')
      expect(simpleAltText).toBe('user profile')
    })

    it('should validate image accessibility requirements', async () => {
      const { validateImageAccessibility } = await import('../image-utils')
      
      const mockImg = document.createElement('img')
      mockImg.src = '/images/test.png'
      // alt 속성 누락
      
      const validation = validateImageAccessibility(mockImg as HTMLImageElement)
      expect(validation.isValid).toBe(false) // alt 속성이 없어서 실패
      expect(validation.issues).toContain('Missing alt attribute')
      
      // alt 속성 추가한 경우
      mockImg.alt = 'Test image'
      const validValidation = validateImageAccessibility(mockImg as HTMLImageElement)
      expect(validValidation.isValid).toBe(true)
    })

    it('should create structured data for images', async () => {
      const { createImageStructuredData } = await import('../image-utils')
      
      const structuredData = createImageStructuredData({
        src: '/images/product.png',
        alt: 'Product showcase',
        caption: 'Our latest product'
      })
      
      expect(structuredData['@type']).toBe('ImageObject')
      expect(structuredData.contentUrl).toBe('/images/product.png')
      expect(structuredData.description).toBe('Product showcase')
      expect(structuredData.caption).toBe('Our latest product')
    })
  })
})