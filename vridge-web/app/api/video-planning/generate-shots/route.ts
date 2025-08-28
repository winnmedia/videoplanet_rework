/**
 * @fileoverview API Route: 12개 숏 생성
 * @description 4단계 기획을 바탕으로 12개 상세 숏으로 분해
 */

import { NextRequest, NextResponse } from 'next/server'
import type { GenerateShotsRequest, GenerateShotsResponse, VideoShot, InsertShot } from '@/features/video-planning-wizard'

export async function POST(request: NextRequest) {
  try {
    const body: GenerateShotsRequest = await request.json()
    const { stages, input } = body

    // 입력 검증
    if (!stages || stages.length === 0) {
      return NextResponse.json<GenerateShotsResponse>({
        success: false,
        shots: [],
        insertShots: [],
        totalDuration: 0,
        error: '4단계 기획 데이터가 필요합니다.'
      }, { status: 400 })
    }

    // 12개 숏 생성 (각 단계별로 3개씩 배분)
    const shots: VideoShot[] = []
    let shotCounter = 1

    stages.forEach((stage, stageIndex) => {
      const shotsPerStage = 3
      const baseDuration = Math.floor((parseInt(stage.duration.match(/\d+/)?.[0] || '10') / shotsPerStage))
      
      for (let i = 0; i < shotsPerStage; i++) {
        const shotId = `shot-${shotCounter}`
        
        // 샷 타입을 단계별로 다양화
        const shotTypes = [
          ['와이드샷', '미디엄샷', '클로즈업'],
          ['미디엄샷', '클로즈업', '익스트림 클로즈업'],
          ['클로즈업', '와이드샷', '미디엄샷'],
          ['미디엄샷', '롱샷', '클로즈업']
        ]
        
        const cameraMovements = [
          ['고정', '팬', '틸트'],
          ['팬', '줌인', '트래킹'],
          ['줌인', '줌아웃', '크레인샷'],
          ['고정', '팬', '페이드아웃']
        ]

        const shot: VideoShot = {
          id: shotId,
          order: shotCounter,
          title: `${stage.title}단계 - 샷 ${i + 1}`,
          description: `${stage.content.substring(0, 50)}...에 해당하는 ${i === 0 ? '도입' : i === 1 ? '전개' : '마무리'} 샷`,
          shotType: shotTypes[stageIndex][i] as any,
          cameraMove: cameraMovements[stageIndex][i] as any,
          composition: i === 1 ? '3분의 1 법칙' : '정면',
          duration: baseDuration + (i === 1 ? 1 : 0), // 중간 샷을 약간 길게
          dialogue: i === 1 ? `${stage.goal}에 관련된 핵심 메시지` : '',
          subtitle: '',
          audio: i === 0 && stageIndex === 0 ? '배경음악 페이드인' : 
                 i === 2 && stageIndex === 3 ? '배경음악 페이드아웃' : '배경음악 지속',
          transition: i === 2 ? '디졸브' : '컷',
          notes: `${stage.title}단계의 ${stage.goal} 달성을 위한 샷`
        }
        
        shots.push(shot)
        shotCounter++
      }
    })

    // 인서트 3컷 추천 생성
    const insertShots: InsertShot[] = [
      {
        id: 'insert-1',
        purpose: '상황 설명 보강',
        description: `${input.format}의 특성을 살린 상세 설명 컷`,
        framing: '미디엄샷에서 클로즈업으로 점진적 접근',
        notes: '메인 스토리를 보완하는 세부 정보 제공'
      },
      {
        id: 'insert-2', 
        purpose: '감정 전달 강화',
        description: `${input.toneManner} 톤을 극대화하는 감정 표현 컷`,
        framing: '익스트림 클로즈업으로 미세한 표정 변화 포착',
        notes: '시청자의 감정 몰입도를 높이는 핵심 컷'
      },
      {
        id: 'insert-3',
        purpose: '브랜딩 및 마무리',
        description: `${input.target} 타겟에게 어필하는 마무리 브랜딩 컷`,
        framing: '와이드샷으로 전체적인 맥락과 브랜드 메시지 통합',
        notes: '기억에 남는 마무리와 행동 유도를 위한 컷'
      }
    ]

    const totalDuration = shots.reduce((total, shot) => total + shot.duration, 0)

    return NextResponse.json<GenerateShotsResponse>({
      success: true,
      shots,
      insertShots,
      totalDuration
    })

  } catch (error) {
    console.error('Generate shots error:', error)
    
    return NextResponse.json<GenerateShotsResponse>({
      success: false,
      shots: [],
      insertShots: [],
      totalDuration: 0,
      error: '서버 오류가 발생했습니다.'
    }, { status: 500 })
  }
}