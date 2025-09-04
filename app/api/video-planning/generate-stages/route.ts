/**
 * @fileoverview API Route: 4단계 기획 생성
 * @description 사용자 입력을 바탕으로 AI가 4단계 영상 기획을 생성
 */

import { NextRequest, NextResponse } from 'next/server'

import type { GenerateStagesRequest, GenerateStagesResponse, PlanningStage } from '@/features/video-planning-wizard'

export async function POST(request: NextRequest) {
  try {
    const body: GenerateStagesRequest = await request.json()
    const { input } = body

    // 입력 검증
    if (!input.title || !input.logline) {
      return NextResponse.json<GenerateStagesResponse>({
        success: false,
        stages: [],
        totalDuration: '0초',
        error: '제목과 한 줄 스토리는 필수입니다.'
      }, { status: 400 })
    }

    // Google Gemini API 호출 대신 목업 데이터 반환
    // 실제 구현에서는 여기서 Google Gemini API를 호출합니다.
    const stages: PlanningStage[] = [
      {
        id: '1',
        title: '기',
        content: `${input.toneManner} 톤으로 ${input.target}을 대상으로 한 훅을 제시합니다. "${input.logline}"의 핵심을 강조하여 시청자의 관심을 즉각적으로 끌어야 합니다.`,
        goal: '관심 유발 및 몰입 유도',
        duration: '5-8초',
        order: 1
      },
      {
        id: '2', 
        title: '승',
        content: `${input.storyStructure} 방식에 따라 상황을 구체적으로 전개합니다. ${input.format} 형식으로 문제 상황이나 배경을 명확하게 제시하여 시청자가 상황을 이해할 수 있도록 합니다.`,
        goal: '상황 설명 및 문제 제기',
        duration: '15-20초',
        order: 2
      },
      {
        id: '3',
        title: '전',
        content: `${input.tempo} 템포로 해결책이나 클라이맥스를 제시합니다. ${input.storyIntensity} 강도로 전개하여 시청자의 감정을 최고조로 끌어올립니다. 핵심 메시지를 명확하게 전달합니다.`,
        goal: '해결책 제시 및 감정 절정',
        duration: '20-25초',
        order: 3
      },
      {
        id: '4',
        title: '결',
        content: `${input.genre}의 특성에 맞게 마무리합니다. 행동 유도(CTA)와 함께 시청자가 다음에 해야 할 일을 명확하게 제시하고, 브랜드나 메시지를 각인시킵니다.`,
        goal: '행동 유도 및 마무리',
        duration: '8-12초',
        order: 4
      }
    ]

    const totalDurationSeconds = stages.reduce((total, stage) => {
      const duration = stage.duration.match(/\d+/)?.[0] || '0'
      return total + parseInt(duration)
    }, 0)

    // 응답 반환
    return NextResponse.json<GenerateStagesResponse>({
      success: true,
      stages,
      totalDuration: `${totalDurationSeconds}초`,
    })

  } catch (error) {
    console.error('Generate stages error:', error)
    
    return NextResponse.json<GenerateStagesResponse>({
      success: false,
      stages: [],
      totalDuration: '0초',
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}