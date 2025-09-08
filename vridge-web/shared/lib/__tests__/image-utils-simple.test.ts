/**
 * @fileoverview Simple Image Utilities Unit Tests
 * @description 기본 이미지 유틸리티 함수들의 간단한 TDD 테스트
 * @layer shared/lib
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Image Utilities - Simple Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Image Format Utilities', () => {
    it('should validate image types correctly', async () => {
      const { validateImageType } = await import('../image-utils')
      
      expect(validateImageType('image/jpeg', ['image/jpeg', 'image/png'])).toBe(true)
      expect(validateImageType('image/webp', ['image/jpeg', 'image/png'])).toBe(false)
      expect(validateImageType('image/png', ['image/png'])).toBe(true)
    })

    it('should generate responsive image sources', async () => {
      const { generateResponsiveImages } = await import('../image-utils')
      
      const sources = await generateResponsiveImages('/images/sample.jpg', [480, 768, 1200])
      
      expect(sources).toHaveLength(3)
      expect(sources[0]).toBe('/images/sample_480w.jpg')
      expect(sources[1]).toBe('/images/sample_768w.jpg')
      expect(sources[2]).toBe('/images/sample_1200w.jpg')
    })

    it('should convert image format for optimization', async () => {
      const { getOptimalImageSrc } = await import('../image-utils')
      
      const jpegOptimized = getOptimalImageSrc('/images/photo.jpg')
      expect(jpegOptimized).toBe('/images/photo.webp')
      
      const pngOptimized = getOptimalImageSrc('/images/logo.png')
      expect(pngOptimized).toBe('/images/logo.webp')
      
      const webpUnchanged = getOptimalImageSrc('/images/modern.webp')
      expect(webpUnchanged).toBe('/images/modern.webp')
    })
  })

  describe('Image Dimension Calculations', () => {
    it('should calculate optimal dimensions correctly', async () => {
      const { calculateOptimalDimensions } = await import('../image-utils')
      
      // 큰 이미지를 제한 내로 축소
      const result1 = calculateOptimalDimensions(2000, 1500, 1200, 900)
      expect(result1.width).toBe(1200)
      expect(result1.height).toBe(900)
      
      // 가로가 더 긴 경우
      const result2 = calculateOptimalDimensions(3000, 1000, 1200, 900)
      expect(result2.width).toBe(1200)
      expect(result2.height).toBe(400)
      
      // 세로가 더 긴 경우
      const result3 = calculateOptimalDimensions(800, 2000, 1200, 900)
      expect(result3.width).toBe(360)
      expect(result3.height).toBe(900)
      
      // 제한보다 작은 경우 - 원본 유지
      const result4 = calculateOptimalDimensions(800, 600, 1200, 900)
      expect(result4.width).toBe(800)
      expect(result4.height).toBe(600)
    })
  })

  describe('Image Cache', () => {
    it('should cache and retrieve image data', async () => {
      const { ImageCache } = await import('../image-utils')
      
      const cache = new ImageCache()
      
      // 데이터 저장
      await cache.set('/images/test.jpg', 'cached-image-data', 1024)
      
      // 데이터 검색
      const retrieved = await cache.get('/images/test.jpg')
      expect(retrieved).toBe('cached-image-data')
      
      // 존재하지 않는 키
      const notFound = await cache.get('/images/nonexistent.jpg')
      expect(notFound).toBeNull()
      
      // 캐시 클리어
      cache.clear()
      const afterClear = await cache.get('/images/test.jpg')
      expect(afterClear).toBeNull()
    })
  })

  describe('Image Performance Tracker', () => {
    it('should track loading performance', async () => {
      const { ImagePerformanceTracker } = await import('../image-utils')
      
      // Mock performance.now
      let currentTime = 1000
      global.performance = {
        now: vi.fn(() => currentTime)
      } as any
      
      const tracker = new ImagePerformanceTracker()
      
      // 추적 시작
      tracker.startTracking('/images/test.jpg')
      
      // 시간 경과 시뮬레이션
      currentTime = 1250 // 250ms 후
      tracker.endTracking('/images/test.jpg', 2048, false)
      
      // 메트릭 확인
      const metrics = tracker.getMetrics('/images/test.jpg')
      expect(metrics).toBeDefined()
      expect(metrics?.loadTime).toBe(250)
      expect(metrics?.size).toBe(2048)
      expect(metrics?.cached).toBe(false)
      
      // 모든 메트릭 확인
      const allMetrics = tracker.getAllMetrics()
      expect(allMetrics.size).toBe(1)
      expect(allMetrics.has('/images/test.jpg')).toBe(true)
    })
  })

  describe('Accessibility Helpers', () => {
    it('should generate alt text from image context', async () => {
      const { generateAltText } = await import('../image-utils')
      
      // 컨텍스트와 역할이 있는 경우
      const contextAlt = generateAltText('/images/team-photo.jpg', {
        context: 'about page',
        role: 'team showcase'
      })
      expect(contextAlt).toBe('team showcase image in about page')
      
      // 파일명만 있는 경우
      const fileNameAlt = generateAltText('/images/user_profile_image.jpg')
      expect(fileNameAlt).toBe('user profile image')
      
      // 대시가 있는 파일명
      const dashNameAlt = generateAltText('/images/hero-banner-image.png')
      expect(dashNameAlt).toBe('hero banner image')
    })

    it('should validate image accessibility', async () => {
      const { validateImageAccessibility } = await import('../image-utils')
      
      // Mock DOM element
      const createMockImg = (src?: string, alt?: string) => ({
        src: src || '',
        alt: alt || ''
      }) as HTMLImageElement
      
      // alt 속성이 없는 이미지
      const noAltImg = createMockImg('/images/test.jpg')
      const noAltValidation = validateImageAccessibility(noAltImg)
      expect(noAltValidation.isValid).toBe(false)
      expect(noAltValidation.issues).toContain('Missing alt attribute')
      
      // 적절한 alt 속성이 있는 이미지
      const goodImg = createMockImg('/images/test.jpg', 'Test image')
      const goodValidation = validateImageAccessibility(goodImg)
      expect(goodValidation.isValid).toBe(true)
      expect(goodValidation.issues).toHaveLength(0)
      
      // alt 텍스트가 너무 긴 이미지
      const longAltImg = createMockImg('/images/test.jpg', 'A'.repeat(130))
      const longAltValidation = validateImageAccessibility(longAltImg)
      expect(longAltValidation.isValid).toBe(false)
      expect(longAltValidation.issues).toContain('Alt text too long (should be under 125 characters)')
      
      // src가 없는 이미지
      const noSrcImg = createMockImg('', 'Test image')
      const noSrcValidation = validateImageAccessibility(noSrcImg)
      expect(noSrcValidation.isValid).toBe(false)
      expect(noSrcValidation.issues).toContain('Missing src attribute')
    })
  })

  describe('Structured Data', () => {
    it('should create image structured data', async () => {
      const { createImageStructuredData } = await import('../image-utils')
      
      const imageData = {
        src: '/images/product.jpg',
        alt: 'Product showcase image',
        caption: 'Our latest product in action',
        license: 'CC BY 4.0',
        creator: 'John Doe'
      }
      
      const structuredData = createImageStructuredData(imageData)
      
      expect(structuredData['@type']).toBe('ImageObject')
      expect(structuredData.contentUrl).toBe('/images/product.jpg')
      expect(structuredData.description).toBe('Product showcase image')
      expect(structuredData.caption).toBe('Our latest product in action')
      expect(structuredData.license).toBe('CC BY 4.0')
      expect(structuredData.creator).toEqual({
        '@type': 'Person',
        name: 'John Doe'
      })
      
      // 선택적 필드가 없는 경우
      const minimalData = {
        src: '/images/simple.jpg',
        alt: 'Simple image'
      }
      
      const minimalStructuredData = createImageStructuredData(minimalData)
      expect(minimalStructuredData['@type']).toBe('ImageObject')
      expect(minimalStructuredData.contentUrl).toBe('/images/simple.jpg')
      expect(minimalStructuredData.description).toBe('Simple image')
      expect(minimalStructuredData.creator).toBeUndefined()
    })
  })
})