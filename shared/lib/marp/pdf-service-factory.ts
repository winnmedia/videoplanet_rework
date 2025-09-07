/**
 * PDF 서비스 팩토리
 * @description 환경별 PDF 생성기 인스턴스 생성
 * @layer shared/lib/marp
 */

import { MockPdfAdapter } from './adapters/mock-pdf-adapter'
import type { IPdfGenerator, PdfServiceOptions } from './types'

export class PdfServiceFactory {
  private static instance: IPdfGenerator | null = null

  /**
   * PDF 서비스 인스턴스 생성
   */
  static create(options: PdfServiceOptions = {}): IPdfGenerator {
    const env = process.env.NODE_ENV
    const isTest = env === 'test'
    const useMock = process.env.USE_MOCK_PDF === 'true'
    const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME

    // 테스트 환경이거나 명시적으로 Mock 사용 설정된 경우
    if (isTest || useMock) {
      console.log('🧪 Using Mock PDF Adapter for testing')
      return new MockPdfAdapter({
        delay: isTest ? 100 : 1000, // 테스트에서는 빠르게
        simulateError: false,
        memoryUsage: 30 * 1024 * 1024 // 30MB
      })
    }

    // 서버리스 환경에서는 경량화된 Mock 사용 (실제로는 경량화된 실제 구현)
    if (isServerless) {
      console.warn('⚠️ Serverless environment detected, using Mock PDF Adapter')
      return new MockPdfAdapter({
        delay: 2000, // 실제 서비스와 유사한 지연
        simulateError: false,
        memoryUsage: 100 * 1024 * 1024 // 100MB
      })
    }

    // 프로덕션 환경 - 실제 구현 (현재는 Mock으로 대체)
    console.log('🏭 Using Production PDF Adapter (currently Mock)')
    return new MockPdfAdapter({
      delay: 3000, // 실제 PDF 생성 시간 시뮬레이션
      simulateError: false,
      memoryUsage: 200 * 1024 * 1024 // 200MB
    })

    // TODO: 실제 구현 시 아래와 같이 사용
    // const baseAdapter = new MarpPdfAdapter({
    //   maxMemory: options?.maxMemory || 512 * 1024 * 1024,
    //   timeout: options?.timeout || 30000,
    //   browserPoolSize: options?.browserPoolSize || 2
    // })
    
    // if (options?.enableCache) {
    //   return new CachedPdfAdapter(baseAdapter, {
    //     maxSize: options.cacheMaxSize || 100,
    //     ttl: options.cacheTTL || 3600000
    //   })
    // }
    
    // return baseAdapter
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(options?: PdfServiceOptions): IPdfGenerator {
    if (!this.instance) {
      this.instance = this.create(options)
    }
    return this.instance
  }

  /**
   * 인스턴스 재설정
   */
  static reset(): void {
    if (this.instance) {
      if (this.instance.cleanup) {
        this.instance.cleanup().catch(console.error)
      }
      this.instance = null
    }
  }

  /**
   * 환경별 권장 설정 반환
   */
  static getRecommendedOptions(): PdfServiceOptions {
    const env = process.env.NODE_ENV
    const isProduction = env === 'production'
    const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME

    if (isServerless) {
      // 서버리스 환경: 메모리 제한적, 짧은 타임아웃
      return {
        maxMemory: 256 * 1024 * 1024, // 256MB
        timeout: 20000, // 20초
        enableCache: false, // 서버리스에서는 메모리 캐시 비추천
        browserPoolSize: 1
      }
    }

    if (isProduction) {
      // 프로덕션 환경: 안정성 우선
      return {
        maxMemory: 1024 * 1024 * 1024, // 1GB
        timeout: 60000, // 60초
        enableCache: true,
        cacheMaxSize: 200,
        cacheTTL: 3600000, // 1시간
        browserPoolSize: 3
      }
    }

    // 개발 환경: 빠른 피드백
    return {
      maxMemory: 512 * 1024 * 1024, // 512MB
      timeout: 30000, // 30초
      enableCache: true,
      cacheMaxSize: 50,
      cacheTTL: 1800000, // 30분
      browserPoolSize: 2
    }
  }

  /**
   * 환경 정보 반환
   */
  static getEnvironmentInfo() {
    return {
      nodeEnv: process.env.NODE_ENV,
      isTest: process.env.NODE_ENV === 'test',
      isServerless: process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME,
      useMock: process.env.USE_MOCK_PDF === 'true',
      platform: process.platform,
      nodeVersion: process.version
    }
  }
}

// 편의 함수들
export const createPdfService = (options?: PdfServiceOptions): IPdfGenerator => 
  PdfServiceFactory.create(options)

export const getPdfServiceInstance = (options?: PdfServiceOptions): IPdfGenerator => 
  PdfServiceFactory.getInstance(options)

export const resetPdfService = (): void => 
  PdfServiceFactory.reset()

// 서비스 정리를 위한 프로세스 종료 핸들러
if (typeof process !== 'undefined') {
  const cleanup = () => {
    console.log('🧹 Cleaning up PDF service...')
    PdfServiceFactory.reset()
  }

  process.on('SIGTERM', cleanup)
  process.on('SIGINT', cleanup)
  process.on('beforeExit', cleanup)
}