import { 
  ImageGenerationRequest, 
  ShotRegenerationRequest, 
  StoryboardGrid, 
  GeneratedImage, 
  ImageGenerationStatus,
  imageGenerationRequestSchema,
  shotRegenerationRequestSchema,
  storyboardGridSchema
} from './types'
import { DataContractValidator } from '../data-contracts'

// 환경 변수 검증
const requiredEnvVars = {
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
  IMAGEN_PROVIDER: process.env.IMAGEN_PROVIDER || 'google',
  IMAGEN_LLM_MODEL: process.env.IMAGEN_LLM_MODEL || 'imagen-4.0-fast-generate-preview-06-06',
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY
}

if (!requiredEnvVars.GOOGLE_API_KEY && !requiredEnvVars.HUGGINGFACE_API_KEY) {
  throw new Error('이미지 생성을 위해 GOOGLE_API_KEY 또는 HUGGINGFACE_API_KEY가 필요합니다')
}

/**
 * Google Imagen API를 통한 이미지 생성
 */
async function generateWithGoogleImagen(
  prompt: string,
  settings: ImageGenerationRequest['styleSettings']
): Promise<{ imageUrl: string; thumbnailUrl?: string; generationTime: number }> {
  const startTime = Date.now()
  
  const requestBody = {
    instances: [{
      prompt: `${prompt}, ${settings.artStyle} style, ${settings.colorPalette} colors, ${settings.aspectRatio} aspect ratio, ${settings.quality} quality`,
      image: {
        bytesBase64Encoded: ""
      }
    }],
    parameters: {
      sampleCount: 1,
      aspectRatio: settings.aspectRatio,
      negativePrompt: "blurry, low quality, distorted, text, watermark",
      addWatermark: false,
      seed: Math.floor(Math.random() * 1000000),
      guidanceScale: settings.characterConsistency?.enabled ? 
        20 + (settings.characterConsistency.consistencyStrength * 10) : 15
    }
  }

  const response = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${process.env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/${requiredEnvVars.IMAGEN_LLM_MODEL}:predict`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${requiredEnvVars.GOOGLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    }
  )

  if (!response.ok) {
    throw new Error(`Google Imagen API 오류: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const generationTime = Date.now() - startTime

  if (!data.predictions?.[0]?.bytesBase64Encoded) {
    throw new Error('Google Imagen API 응답에서 이미지를 찾을 수 없습니다')
  }

  // Base64 이미지를 WebP로 변환하여 스토리지에 업로드
  const imageUrl = await uploadBase64Image(data.predictions[0].bytesBase64Encoded, 'webp')
  const thumbnailUrl = await generateThumbnail(imageUrl)

  return {
    imageUrl,
    thumbnailUrl,
    generationTime
  }
}

/**
 * HuggingFace API를 통한 이미지 생성 (폴백)
 */
async function generateWithHuggingFace(
  prompt: string,
  settings: ImageGenerationRequest['styleSettings']
): Promise<{ imageUrl: string; thumbnailUrl?: string; generationTime: number }> {
  const startTime = Date.now()
  
  const enhancedPrompt = `${prompt}, ${settings.artStyle} style, ${settings.colorPalette} color palette, high quality, detailed`

  const response = await fetch(
    'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${requiredEnvVars.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: enhancedPrompt,
        parameters: {
          width: settings.aspectRatio === '16:9' ? 1024 : settings.aspectRatio === '1:1' ? 1024 : 768,
          height: settings.aspectRatio === '16:9' ? 576 : settings.aspectRatio === '1:1' ? 1024 : 1024,
          num_inference_steps: settings.quality === 'ultra' ? 50 : settings.quality === 'high' ? 30 : 20,
          guidance_scale: 7.5,
          negative_prompt: "blurry, low quality, distorted, text, watermark, signature"
        }
      })
    }
  )

  if (!response.ok) {
    throw new Error(`HuggingFace API 오류: ${response.status} ${response.statusText}`)
  }

  const imageBlob = await response.blob()
  const generationTime = Date.now() - startTime

  // Blob을 WebP로 변환하여 업로드
  const imageUrl = await uploadBlobImage(imageBlob, 'webp')
  const thumbnailUrl = await generateThumbnail(imageUrl)

  return {
    imageUrl,
    thumbnailUrl,
    generationTime
  }
}

/**
 * Base64 이미지를 스토리지에 업로드
 */
async function uploadBase64Image(base64Data: string, format: string): Promise<string> {
  // 실제 구현에서는 Google Cloud Storage, AWS S3 등에 업로드
  // 현재는 Mock URL 반환
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substr(2, 9)
  return `https://storage.googleapis.com/vridge-storyboard-images/${timestamp}-${randomId}.${format}`
}

/**
 * Blob 이미지를 스토리지에 업로드
 */
async function uploadBlobImage(blob: Blob, format: string): Promise<string> {
  // 실제 구현에서는 클라우드 스토리지에 업로드
  // 현재는 Mock URL 반환
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substr(2, 9)
  return `https://storage.googleapis.com/vridge-storyboard-images/${timestamp}-${randomId}.${format}`
}

/**
 * 이미지 썸네일 생성
 */
async function generateThumbnail(imageUrl: string): Promise<string> {
  // 실제 구현에서는 이미지 리사이징 서비스 사용
  // 현재는 썸네일 Mock URL 반환
  return imageUrl.replace('.webp', '-thumb.webp')
}

/**
 * 배치 처리를 통한 이미지 생성
 */
async function generateImageBatch(
  shots: ImageGenerationRequest['shots'],
  settings: ImageGenerationRequest['styleSettings'],
  generationSettings: ImageGenerationRequest['generationSettings'],
  onProgress?: (progress: { completed: number; total: number; percentage: number; currentBatch?: number }) => void
): Promise<GeneratedImage[]> {
  const batchSize = generationSettings?.batchSize || 4
  const maxRetries = generationSettings?.maxRetries || 3
  const provider = generationSettings?.provider || 'google'
  const fallbackProvider = generationSettings?.fallbackProvider
  
  const results: GeneratedImage[] = []
  const batches = []
  
  // 샷을 배치로 나누기
  for (let i = 0; i < shots.length; i += batchSize) {
    batches.push(shots.slice(i, i + batchSize))
  }

  let completedShots = 0
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    const batchPromises = batch.map(async (shot) => {
      let lastError: Error | null = null
      
      // 재시도 로직
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const startTime = Date.now()
          let result: { imageUrl: string; thumbnailUrl?: string; generationTime: number }
          let usedProvider = provider
          
          try {
            if (provider === 'google') {
              result = await generateWithGoogleImagen(shot.description, settings)
            } else {
              result = await generateWithHuggingFace(shot.description, settings)
            }
          } catch (error) {
            // 폴백 프로바이더 사용
            if (fallbackProvider && attempt === maxRetries - 1) {
              console.warn(`${provider} 실패, ${fallbackProvider}로 폴백 시도:`, error)
              usedProvider = fallbackProvider
              result = await generateWithHuggingFace(shot.description, settings)
            } else {
              throw error
            }
          }

          const generatedImage: GeneratedImage = {
            shotNumber: shot.shotNumber,
            imageUrl: result.imageUrl,
            thumbnailUrl: result.thumbnailUrl,
            prompt: `${shot.description}, ${settings.artStyle} style`,
            generationTime: result.generationTime,
            status: 'completed',
            provider: usedProvider,
            version: 1,
            styleMetrics: {
              consistency: 0.8 + Math.random() * 0.15, // Mock 메트릭
              colorHarmony: 0.85 + Math.random() * 0.1,
              characterSimilarity: settings.characterConsistency?.enabled ? 
                0.75 + Math.random() * 0.2 : undefined
            }
          }

          return generatedImage
        } catch (error) {
          lastError = error as Error
          if (attempt < maxRetries - 1) {
            // 지수 백오프로 재시도 대기
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          }
        }
      }

      // 모든 재시도 실패
      const failedImage: GeneratedImage = {
        shotNumber: shot.shotNumber,
        imageUrl: '',
        prompt: shot.description,
        generationTime: 0,
        status: 'failed',
        errorMessage: lastError?.message || '알 수 없는 오류가 발생했습니다'
      }

      return failedImage
    })

    // 배치 내 모든 이미지 생성 완료 대기
    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    
    completedShots += batch.length
    
    // 진행률 업데이트
    if (onProgress) {
      onProgress({
        completed: completedShots,
        total: shots.length,
        percentage: Math.round((completedShots / shots.length) * 100),
        currentBatch: batchIndex + 1
      })
    }
  }

  return results
}

/**
 * 12샷 스토리보드 이미지 생성
 */
export async function generateStoryboardImages(
  request: ImageGenerationRequest
): Promise<StoryboardGrid> {
  // 요청 데이터 검증
  const validation = DataContractValidator.validateWithReport(
    imageGenerationRequestSchema, 
    request
  )
  
  if (!validation.isValid) {
    throw new Error(`이미지 생성 요청이 유효하지 않습니다: ${validation.errors.map(e => e.message).join(', ')}`)
  }

  const startTime = Date.now()

  try {
    const generatedImages = await generateImageBatch(
      request.shots,
      request.styleSettings,
      request.generationSettings,
      request.generationSettings?.onProgress
    )

    const totalGenerationTime = Date.now() - startTime
    const completedImages = generatedImages.filter(img => img.status === 'completed')
    const failedShots = generatedImages.filter(img => img.status === 'failed').map(img => img.shotNumber)
    
    // 전체 일관성 점수 계산
    const consistencyScores = completedImages
      .map(img => img.styleMetrics?.consistency)
      .filter((score): score is number => score !== undefined)
    
    const overallConsistency = consistencyScores.length > 0 
      ? consistencyScores.reduce((sum, score) => sum + score, 0) / consistencyScores.length
      : undefined

    const result: StoryboardGrid = {
      projectId: request.projectId,
      images: generatedImages,
      gridLayout: request.shots.length <= 6 ? '2x6' : '3x4',
      totalGenerationTime,
      overallConsistency,
      failedShots: failedShots.length > 0 ? failedShots : undefined,
      metadata: {
        createdAt: new Date(),
        styleSettings: request.styleSettings,
        fallbackUsed: generatedImages.some(img => img.provider === 'huggingface' && request.generationSettings?.provider === 'google'),
        totalRetries: 0 // 실제로는 재시도 횟수를 추적해야 함
      }
    }

    // 결과 검증
    const resultValidation = DataContractValidator.validateWithReport(storyboardGridSchema, result)
    if (!resultValidation.isValid) {
      console.error('스토리보드 그리드 결과 검증 실패:', resultValidation.errors)
    }

    return result
  } catch (error) {
    console.error('스토리보드 이미지 생성 실패:', error)
    throw new Error(`스토리보드 이미지 생성에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
  }
}

/**
 * 개별 샷 재생성
 */
export async function regenerateShot(
  request: ShotRegenerationRequest
): Promise<GeneratedImage> {
  // 요청 데이터 검증
  const validation = DataContractValidator.validateWithReport(
    shotRegenerationRequestSchema,
    request
  )

  if (!validation.isValid) {
    throw new Error(`샷 재생성 요청이 유효하지 않습니다: ${validation.errors.map(e => e.message).join(', ')}`)
  }

  try {
    const provider = process.env.IMAGEN_PROVIDER || 'google'
    let result: { imageUrl: string; thumbnailUrl?: string; generationTime: number }

    if (provider === 'google') {
      result = await generateWithGoogleImagen(request.newPrompt, request.styleSettings)
    } else {
      result = await generateWithHuggingFace(request.newPrompt, request.styleSettings)
    }

    const regeneratedImage: GeneratedImage = {
      shotNumber: request.shotNumber,
      imageUrl: result.imageUrl,
      thumbnailUrl: result.thumbnailUrl,
      prompt: request.newPrompt,
      generationTime: result.generationTime,
      status: 'completed',
      provider: provider as 'google' | 'huggingface',
      version: (request.version || 1) + 1,
      styleMetrics: {
        consistency: 0.8 + Math.random() * 0.15,
        colorHarmony: 0.85 + Math.random() * 0.1,
        characterSimilarity: request.styleSettings.characterConsistency?.enabled ? 
          0.75 + Math.random() * 0.2 : undefined
      }
    }

    return regeneratedImage
  } catch (error) {
    console.error('샷 재생성 실패:', error)
    
    const failedImage: GeneratedImage = {
      shotNumber: request.shotNumber,
      imageUrl: '',
      prompt: request.newPrompt,
      generationTime: 0,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : '재생성에 실패했습니다'
    }

    return failedImage
  }
}

/**
 * 이미지 생성 상태 조회
 */
export async function getImageGenerationStatus(projectId: string): Promise<ImageGenerationStatus> {
  // 실제 구현에서는 데이터베이스나 캐시에서 상태 조회
  // 현재는 Mock 상태 반환
  return {
    projectId,
    status: 'completed',
    progress: {
      completed: 12,
      total: 12,
      percentage: 100
    }
  }
}