import { describe, it, expect, beforeEach } from '@jest/globals'
import { generateStoryboardImages, regenerateShot, getImageGenerationStatus } from './image-generation'
import { ImageGenerationRequest, StoryboardGrid } from './types'

// MSW 모킹
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeEach(() => {
  server.resetHandlers()
})

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Image Generation API', () => {
  // RED: 12샷 스토리보드 이미지 생성 테스트
  it('should generate 12-shot storyboard images successfully', async () => {
    const mockShotData = Array.from({ length: 12 }, (_, i) => ({
      shotNumber: i + 1,
      description: `샷 ${i + 1} 설명 - 주인공이 모험을 시작합니다`,
      type: i % 2 === 0 ? 'Wide Shot' : 'Close Up',
      duration: '5초',
      location: i < 3 ? '실외' : '실내',
      notes: `연출 노트 ${i + 1}`
    }))

    const request: ImageGenerationRequest = {
      projectId: 'test_project_001',
      shots: mockShotData,
      styleSettings: {
        artStyle: 'cinematic',
        colorPalette: 'warm',
        aspectRatio: '16:9',
        quality: 'high'
      },
      generationSettings: {
        model: 'imagen-4.0-fast-generate-preview-06-06',
        provider: 'google',
        batchSize: 4,
        maxRetries: 3
      }
    }

    // Google Imagen API 응답 모킹
    server.use(
      rest.post('https://googleapis.com/v1/imagen/generate', (req, res, ctx) => {
        return res(ctx.json({
          generatedImages: mockShotData.map((shot, index) => ({
            shotNumber: shot.shotNumber,
            imageUrl: `https://storage.googleapis.com/test-bucket/shot-${index + 1}.webp`,
            thumbnailUrl: `https://storage.googleapis.com/test-bucket/thumb-${index + 1}.webp`,
            prompt: `${shot.description}, ${request.styleSettings.artStyle} style`,
            generationTime: 2500 + Math.random() * 1000,
            status: 'completed'
          }))
        }))
      })
    )

    const result = await generateStoryboardImages(request)

    expect(result).toBeDefined()
    expect(result.projectId).toBe('test_project_001')
    expect(result.images).toHaveLength(12)
    expect(result.gridLayout).toBe('3x4')
    expect(result.totalGenerationTime).toBeLessThan(30000) // 30초 이내
    
    // 각 이미지의 구조 검증
    result.images.forEach((image, index) => {
      expect(image.shotNumber).toBe(index + 1)
      expect(image.imageUrl).toMatch(/\.webp$/)
      expect(image.status).toBe('completed')
      expect(image.generationTime).toBeGreaterThan(0)
    })
  })

  // RED: 개별 샷 재생성 테스트
  it('should regenerate individual shot successfully', async () => {
    const regenerationRequest = {
      projectId: 'test_project_001',
      shotNumber: 5,
      newPrompt: '수정된 프롬프트 - 주인공이 놀라는 표정',
      styleSettings: {
        artStyle: 'cinematic',
        colorPalette: 'cool',
        aspectRatio: '16:9',
        quality: 'ultra'
      }
    }

    server.use(
      rest.post('https://googleapis.com/v1/imagen/regenerate', (req, res, ctx) => {
        return res(ctx.json({
          shotNumber: 5,
          imageUrl: 'https://storage.googleapis.com/test-bucket/shot-5-v2.webp',
          thumbnailUrl: 'https://storage.googleapis.com/test-bucket/thumb-5-v2.webp',
          prompt: regenerationRequest.newPrompt,
          generationTime: 3200,
          status: 'completed',
          version: 2
        }))
      })
    )

    const result = await regenerateShot(regenerationRequest)

    expect(result.shotNumber).toBe(5)
    expect(result.imageUrl).toContain('shot-5-v2')
    expect(result.version).toBe(2)
    expect(result.status).toBe('completed')
  })

  // RED: 배치 처리 및 진행률 추적 테스트
  it('should handle batch processing with progress tracking', async () => {
    const progressCallback = jest.fn()
    const batchRequest: ImageGenerationRequest = {
      projectId: 'test_project_002',
      shots: Array.from({ length: 12 }, (_, i) => ({
        shotNumber: i + 1,
        description: `배치 처리 샷 ${i + 1}`,
        type: 'Medium Shot',
        duration: '4초'
      })),
      styleSettings: {
        artStyle: 'animated',
        colorPalette: 'vibrant',
        aspectRatio: '16:9'
      },
      generationSettings: {
        batchSize: 3, // 3개씩 배치 처리
        onProgress: progressCallback
      }
    }

    // 배치별 응답 모킹
    let batchCount = 0
    server.use(
      rest.post('https://googleapis.com/v1/imagen/batch-generate', (req, res, ctx) => {
        batchCount++
        const batchImages = Array.from({ length: 3 }, (_, i) => ({
          shotNumber: (batchCount - 1) * 3 + i + 1,
          imageUrl: `https://storage.googleapis.com/test-bucket/batch-${batchCount}-shot-${i + 1}.webp`,
          status: 'completed'
        }))
        
        return res(ctx.json({ images: batchImages }))
      })
    )

    const result = await generateStoryboardImages(batchRequest)

    // 진행률 콜백이 호출되었는지 확인
    expect(progressCallback).toHaveBeenCalledTimes(4) // 배치 4번 (12/3)
    expect(progressCallback).toHaveBeenLastCalledWith({
      completed: 12,
      total: 12,
      percentage: 100,
      currentBatch: 4
    })

    expect(result.images).toHaveLength(12)
  })

  // RED: 에러 처리 및 재시도 테스트
  it('should handle API errors and retry failed generations', async () => {
    let attemptCount = 0
    
    server.use(
      rest.post('https://googleapis.com/v1/imagen/generate', (req, res, ctx) => {
        attemptCount++
        if (attemptCount < 3) {
          return res(ctx.status(503), ctx.json({ error: 'Service temporarily unavailable' }))
        }
        return res(ctx.json({
          generatedImages: [{
            shotNumber: 1,
            imageUrl: 'https://storage.googleapis.com/test-bucket/retry-success.webp',
            status: 'completed'
          }]
        }))
      })
    )

    const request: ImageGenerationRequest = {
      projectId: 'test_project_003',
      shots: [{
        shotNumber: 1,
        description: '재시도 테스트 샷',
        type: 'Close Up'
      }],
      generationSettings: {
        maxRetries: 3
      }
    }

    const result = await generateStoryboardImages(request)

    expect(attemptCount).toBe(3) // 2번 실패 후 3번째 성공
    expect(result.images[0].status).toBe('completed')
    expect(result.failedShots).toHaveLength(0)
  })

  // RED: HuggingFace API 폴백 테스트
  it('should fallback to HuggingFace when Google API fails', async () => {
    // Google API 실패 응답
    server.use(
      rest.post('https://googleapis.com/v1/imagen/generate', (req, res, ctx) => {
        return res(ctx.status(429), ctx.json({ error: 'Rate limit exceeded' }))
      }),
      // HuggingFace API 성공 응답
      rest.post('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', (req, res, ctx) => {
        return res(ctx.json({
          images: [{
            shotNumber: 1,
            imageUrl: 'https://huggingface.co/generated/fallback-image.webp',
            status: 'completed',
            provider: 'huggingface'
          }]
        }))
      })
    )

    const request: ImageGenerationRequest = {
      projectId: 'test_project_004',
      shots: [{
        shotNumber: 1,
        description: '폴백 테스트 샷',
        type: 'Wide Shot'
      }],
      generationSettings: {
        fallbackProvider: 'huggingface'
      }
    }

    const result = await generateStoryboardImages(request)

    expect(result.images[0].provider).toBe('huggingface')
    expect(result.images[0].status).toBe('completed')
    expect(result.metadata.fallbackUsed).toBe(true)
  })

  // RED: 스타일 일관성 검증 테스트
  it('should maintain style consistency across all shots', async () => {
    const consistentStyleRequest: ImageGenerationRequest = {
      projectId: 'test_project_005',
      shots: Array.from({ length: 6 }, (_, i) => ({
        shotNumber: i + 1,
        description: `일관성 테스트 샷 ${i + 1}`,
        type: 'Medium Shot'
      })),
      styleSettings: {
        artStyle: 'anime',
        colorPalette: 'pastel',
        aspectRatio: '16:9',
        characterConsistency: {
          enabled: true,
          referenceImages: ['character-ref-1.jpg', 'character-ref-2.jpg'],
          consistencyStrength: 0.8
        }
      }
    }

    server.use(
      rest.post('https://googleapis.com/v1/imagen/generate', (req, res, ctx) => {
        return res(ctx.json({
          generatedImages: consistentStyleRequest.shots.map(shot => ({
            shotNumber: shot.shotNumber,
            imageUrl: `https://storage.googleapis.com/test-bucket/consistent-shot-${shot.shotNumber}.webp`,
            status: 'completed',
            styleMetrics: {
              consistency: 0.85,
              colorHarmony: 0.92,
              characterSimilarity: 0.78
            }
          }))
        }))
      })
    )

    const result = await generateStoryboardImages(consistentStyleRequest)

    // 스타일 일관성 메트릭 검증
    result.images.forEach(image => {
      expect(image.styleMetrics.consistency).toBeGreaterThan(0.7)
      expect(image.styleMetrics.colorHarmony).toBeGreaterThan(0.8)
    })

    expect(result.overallConsistency).toBeGreaterThan(0.75)
  })

  // RED: 성능 예산 테스트
  it('should meet performance budget requirements', async () => {
    const startTime = Date.now()
    
    server.use(
      rest.post('https://googleapis.com/v1/imagen/generate', (req, res, ctx) => {
        // 현실적인 지연 시뮬레이션 (2-3초)
        return res(ctx.delay(2500), ctx.json({
          generatedImages: Array.from({ length: 4 }, (_, i) => ({
            shotNumber: i + 1,
            imageUrl: `https://storage.googleapis.com/test-bucket/perf-shot-${i + 1}.webp`,
            status: 'completed'
          }))
        }))
      })
    )

    const request: ImageGenerationRequest = {
      projectId: 'test_perf_001',
      shots: Array.from({ length: 4 }, (_, i) => ({
        shotNumber: i + 1,
        description: `성능 테스트 샷 ${i + 1}`,
        type: 'Wide Shot'
      }))
    }

    const result = await generateStoryboardImages(request)
    const totalTime = Date.now() - startTime

    // 성능 예산: 배치당 3초 이내
    expect(totalTime).toBeLessThan(4000)
    expect(result.images).toHaveLength(4)
    expect(result.totalGenerationTime).toBeLessThan(15000)
  })
})