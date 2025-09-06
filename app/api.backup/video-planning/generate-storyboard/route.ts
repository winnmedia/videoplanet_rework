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
 * DoD 규격: pencil sketch, rough, monochrome
 */
function createStoryboardPrompt(shot: any): string {
  const basePrompt = `
Storyboard pencil sketch for film production: ${shot.description}

Shot type: ${shot.shotType}
Camera movement: ${shot.cameraMove}
Composition: ${shot.composition}
Scene description: ${shot.description}

Style: pencil sketch, rough drawing, hand-drawn, monochrome, black and white, film storyboard
  `.trim()

  // 스토리보드 전용 스타일 옵션 (DoD 규격 준수)
  const styleOptions = {
    style: 'pencil sketch, rough drawing, monochrome',
    mood: 'storyboard illustration',
    quality: 'sketch' as const,
    lighting: 'simple shading',
    composition: shot.composition,
    negativePrompts: 'no glitch, no text overlay, no photorealistic, no color, no digital art, no photography'
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
 * 숏 정보에서 스토리보드 스타일 추출 (DoD 규격 준수)
 */
function getVisualStyleForShot(shot: any): string {
  const visualStyleMap: Record<string, string> = {
    '익스트림 롱샷': 'wide landscape sketch',
    '롱샷': 'establishing shot sketch',
    '미디엄샷': 'medium shot sketch',
    '클로즈업': 'close-up portrait sketch',
    '익스트림 클로즈업': 'extreme close-up detail sketch',
    '와이드샷': 'wide angle sketch',
    '버드아이뷰': 'aerial perspective sketch',
    '웜즈아이뷰': 'low angle sketch'
  }
  
  return visualStyleMap[shot.shotType] || 'storyboard sketch'
}

/**
 * 설명에서 스토리보드 분위기 추출 (DoD 규격 준수)
 */
function getMoodFromDescription(description: string): string {
  const moodKeywords = {
    '긴장': 'tense sketch',
    '로맨틱': 'soft romantic sketch',
    '액션': 'dynamic action sketch',
    '평화': 'peaceful sketch',
    '어두운': 'dark sketched mood',
    '밝은': 'bright sketched scene',
    '신비': 'mysterious sketch'
  }
  
  for (const [keyword, mood] of Object.entries(moodKeywords)) {
    if (description.includes(keyword)) {
      return mood
    }
  }
  
  return 'storyboard sketch'
}

/**
 * 숏 정보에서 스토리보드 조명/음영 스타일 결정 (DoD 규격 준수)
 */
function getLightingForShot(shot: any): string {
  // 카메라 움직임과 숏 타입에 따른 스케치 음영 처리
  if (shot.cameraMove === '크레인샷' || shot.shotType === '버드아이뷰') {
    return 'simple outdoor shading'
  }
  
  if (shot.shotType === '클로즈업' || shot.shotType === '익스트림 클로즈업') {
    return 'soft pencil shading'
  }
  
  if (shot.cameraMove === '핸드헬드') {
    return 'rough sketch shading'
  }
  
  return 'basic pencil shading'
}