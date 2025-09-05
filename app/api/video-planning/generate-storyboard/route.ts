/**
 * @fileoverview API Route: 스토리보드 이미지 생성 (Google Imagen API 연동)
 * @description 개별 숏의 스토리보드 이미지를 Google Imagen API로 실제 생성
 */

import { NextRequest, NextResponse } from 'next/server'

import type { GenerateStoryboardRequest, GenerateStoryboardResponse } from '@/features/video-planning-wizard'
import { geminiClient, optimizeImagePrompt } from '@/shared/lib/gemini-client'

export async function POST(request: NextRequest) {
  try {
    const body: GenerateStoryboardRequest = await request.json()
    const { shot } = body

    // 입력 검증
    if (!shot || !shot.id) {
      return NextResponse.json<GenerateStoryboardResponse>({
        success: false,
        storyboardUrl: '',
        error: '유효한 숏 정보가 필요합니다.'
      }, { status: 400 })
    }

    // Google Imagen API를 사용한 실제 이미지 생성
    console.log('Generating storyboard image with Imagen API...', {
      shotId: shot.id,
      shotType: shot.shotType,
      description: shot.description
    })

    // 숏 정보를 바탕으로 이미지 프롬프트 생성
    const imagePrompt = createStoryboardPrompt(shot)
    
    const imagenResponse = await geminiClient.generateImage({
      prompt: imagePrompt,
      aspectRatio: determineBestAspectRatio(shot),
      outputFormat: 'JPEG'
    })

    if (!imagenResponse.success) {
      console.error('Imagen API Error:', imagenResponse.error)
      // 폴백: 기본 이미지 URL 반환
      return NextResponse.json<GenerateStoryboardResponse>({
        success: true,
        storyboardUrl: `/images/storyboards/fallback-${shot.shotType.toLowerCase()}.jpg`
      })
    }

    // 생성된 이미진을 Base64로 반환
    const storyboardUrl = imagenResponse.imageUrl || ''
    
    // 성공 응답
    return NextResponse.json<GenerateStoryboardResponse>({
      success: true,
      storyboardUrl
    })

  } catch (error) {
    console.error('Generate storyboard error:', error)
    
    return NextResponse.json<GenerateStoryboardResponse>({
      success: false,
      storyboardUrl: '',
      error: '스토리보드 생성 중 오류가 발생했습니다.'
    }, { status: 500 })
  }
}

// ===========================
// Helper Functions
// ===========================

/**
 * 숏 정보를 기반으로 Imagen API용 이미지 프롬프트 생성
 */
function createStoryboardPrompt(shot: any): string {
  const basePrompt = `
Storyboard illustration for film production: ${shot.description}

Shot type: ${shot.shotType}
Camera movement: ${shot.cameraMove}
Composition: ${shot.composition}
Scene description: ${shot.description}
  `.trim()

  // 숏 타입별 스타일 맞춤화
  const styleOptions = {
    style: getVisualStyleForShot(shot),
    mood: getMoodFromDescription(shot.description),
    quality: 'photorealistic' as const,
    lighting: getLightingForShot(shot),
    composition: shot.composition
  }

  return optimizeImagePrompt(basePrompt, styleOptions)
}

/**
 * 숏 타입에 따른 최적 화면 비율 결정
 */
function determineBestAspectRatio(shot: any): '1:1' | '9:16' | '16:9' | '4:3' | '3:4' {
  // 숏 타입과 구성에 따른 화면 비율 결정
  if (shot.shotType === '익스트림 롱샷' || shot.shotType === '와이드샷') {
    return '16:9' // 와이드한 장면
  }
  
  if (shot.shotType === '클로즈업' || shot.shotType === '익스트림 클로즈업') {
    return '4:3' // 인물이나 디테일 강조
  }
  
  if (shot.composition === '버드아이뷰' || shot.composition === '웜즈아이뷰') {
    return '1:1' // 특수한 각도
  }
  
  return '16:9' // 기본 영화 비율
}

/**
 * 숏 정보에서 시각적 스타일 추출
 */
function getVisualStyleForShot(shot: any): string {
  const visualStyleMap: Record<string, string> = {
    '익스트림 롱샷': 'cinematic wide landscape',
    '롱샷': 'cinematic establishing shot',
    '미디엄샷': 'cinematic medium shot',
    '클로즈업': 'cinematic close-up portrait',
    '익스트림 클로즈업': 'cinematic extreme close-up detail',
    '와이드샷': 'cinematic wide angle',
    '버드아이뷰': 'aerial drone shot perspective',
    '웜즈아이뷰': 'low angle dramatic perspective'
  }
  
  return visualStyleMap[shot.shotType] || 'cinematic shot'
}

/**
 * 설명에서 분위기 추출
 */
function getMoodFromDescription(description: string): string {
  const moodKeywords = {
    '긴장': 'tense dramatic',
    '로맨틱': 'romantic soft',
    '액션': 'dynamic action',
    '평화': 'peaceful calm',
    '어두운': 'dark moody',
    '밝은': 'bright cheerful',
    '신비': 'mysterious atmospheric'
  }
  
  for (const [keyword, mood] of Object.entries(moodKeywords)) {
    if (description.includes(keyword)) {
      return mood
    }
  }
  
  return 'cinematic dramatic'
}

/**
 * 숏 정보에서 조명 스타일 결정
 */
function getLightingForShot(shot: any): string {
  // 카메라 움직임과 숏 타입에 따른 조명
  if (shot.cameraMove === '크레인샷' || shot.shotType === '버드아이뷰') {
    return 'natural daylight'
  }
  
  if (shot.shotType === '클로즈업' || shot.shotType === '익스트림 클로즈업') {
    return 'soft portrait lighting'
  }
  
  if (shot.cameraMove === '핸드헬드') {
    return 'natural realistic lighting'
  }
  
  return 'cinematic lighting'
}