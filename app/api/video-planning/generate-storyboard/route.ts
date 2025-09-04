/**
 * @fileoverview API Route: 스토리보드 이미지 생성
 * @description 개별 숏의 스토리보드 이미지 생성
 */

import { NextRequest, NextResponse } from 'next/server'

import type { GenerateStoryboardRequest, GenerateStoryboardResponse } from '@/features/video-planning-wizard'

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

    // 실제 구현에서는 여기서 이미지 생성 AI API를 호출
    // 예: DALL-E, Midjourney, Stable Diffusion 등
    // 현재는 목업 URL 반환
    
    // 스토리보드 생성 로직 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 2000)) // 2초 지연으로 생성 시뮬레이션
    
    const storyboardUrl = `/images/storyboards/mock-storyboard-${shot.id}-${Date.now()}.jpg`
    
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