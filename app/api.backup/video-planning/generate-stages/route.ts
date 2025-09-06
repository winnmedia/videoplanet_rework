/**
 * @fileoverview API Route: 4단계 기획 생성 (Google Gemini AI 연동)
 * @description 사용자 입력을 바탕으로 Gemini AI가 6가지 스토리 구조로 4단계 영상 기획을 생성
 */

import { NextRequest, NextResponse } from 'next/server'

import type { GenerateStagesRequest, GenerateStagesResponse, PlanningStage, PlanningInput } from '@/features/video-planning-wizard'
import { geminiClient } from '@/shared/lib/gemini-client'
import { getStoryPrompt, createIndirectStoryPrompt } from '@/shared/lib/story-prompts'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // body가 직접 input 객체인 경우와 GenerateStagesRequest 형태인 경우 모두 처리
    const input: PlanningInput = body.input || body

    // 입력 검증
    if (!input || typeof input !== 'object') {
      return NextResponse.json<GenerateStagesResponse>({
        success: false,
        stages: [],
        totalDuration: '0초',
        error: '유효한 요청 데이터가 필요합니다.'
      }, { status: 400 })
    }

    if (!input.title || !input.logline) {
      return NextResponse.json<GenerateStagesResponse>({
        success: false,
        stages: [],
        totalDuration: '0초',
        error: '제목과 한 줄 스토리는 필수입니다.'
      }, { status: 400 })
    }

    // Google Gemini API를 사용한 실제 스토리 생성
    const storyPrompt = createIndirectStoryPrompt(input, input.keywords)
    
    console.log('Generating stages with Gemini AI...', {
      structure: input.storyStructure,
      genre: input.genre,
      target: input.target
    })

    const geminiResponse = await geminiClient.generateText({
      prompt: storyPrompt,
      maxTokens: 2048,
      temperature: 0.8, // 창의성 증대
      topP: 0.95
    })

    if (!geminiResponse.success) {
      console.error('Gemini API Error:', geminiResponse.error)
      // 폴백: 기본 템플릿 사용
      return getDefaultStages(input)
    }

    // Gemini 응답을 파싱하여 PlanningStage 형태로 변환
    const stages = parseGeminiResponseToStages(geminiResponse.text)
    
    // 파싱 실패 시 폴백
    if (stages.length === 0) {
      console.warn('Failed to parse Gemini response, using fallback')
      return getDefaultStages(input)
    }

    const totalDurationSeconds = calculateTotalDuration(stages)

    // 성공 응답 반환
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

// ===========================
// Helper Functions
// ===========================

/**
 * Gemini 응답을 PlanningStage 배열로 파싱
 */
function parseGeminiResponseToStages(geminiText: string): PlanningStage[] {
  try {
    const stages: PlanningStage[] = []
    
    // 1. 2. 3. 4. 패턴으로 분할
    const sections = geminiText.split(/\d+\.\s*/).filter(section => section.trim())
    
    if (sections.length < 4) {
      console.warn('Gemini response has insufficient sections:', sections.length)
      return []
    }
    
    // 각 섹션을 PlanningStage로 변환
    for (let i = 0; i < Math.min(4, sections.length); i++) {
      const section = sections[i].trim()
      const lines = section.split('\n').filter(line => line.trim())
      
      if (lines.length === 0) continue
      
      // 첫 번째 라인에서 제목과 내용 추출
      const firstLine = lines[0].trim()
      const title = extractStageTitle(firstLine, i + 1)
      const content = extractStageContent(lines)
      const goal = extractStageGoal(lines)
      const duration = extractStageDuration(lines)
      
      stages.push({
        id: (i + 1).toString(),
        title,
        content,
        goal,
        duration,
        order: i + 1
      })
    }
    
    return stages
  } catch (error) {
    console.error('Failed to parse Gemini response:', error)
    return []
  }
}

/**
 * 단계 제목 추출
 */
function extractStageTitle(firstLine: string, order: number): string {
  // 단계명 패턴 매칭 (훅, 몰입, 반전, 떡밥 등)
  const titlePatterns = [
    /^(훅|Hook|훅\s*\([^)]+\))/i,
    /^(몰입|Immersion|몰입\s*\([^)]+\))/i,
    /^(반전|Twist|반전\s*\([^)]+\))/i,
    /^(떡밥|Teaser|떡밥\s*\([^)]+\))/i,
    /^(기|起|도입부|도입)/i,
    /^(승|承|전개부|전개)/i,
    /^(전|轉|절정부|절정|클라이막스)/i,
    /^(결|結|마무리|결말)/i
  ]
  
  for (const pattern of titlePatterns) {
    const match = firstLine.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  // 기본 제목
  const defaultTitles = ['1단계', '2단계', '3단계', '4단계']
  return defaultTitles[order - 1] || `${order}단계`
}

/**
 * 단계 내용 추출
 */
function extractStageContent(lines: string[]): string {
  // 목표, 시간 정보를 제외한 실제 내용만 추출
  const contentLines = lines.filter(line => {
    const lower = line.toLowerCase()
    return !lower.includes('목표:') && 
           !lower.includes('시간:') &&
           !lower.includes('duration:') &&
           !lower.includes('goal:')
  })
  
  return contentLines.join(' ').trim()
}

/**
 * 단계 목표 추출
 */
function extractStageGoal(lines: string[]): string {
  const goalLine = lines.find(line => 
    /목표:|goal:/i.test(line)
  )
  
  if (goalLine) {
    return goalLine.replace(/목표:|goal:/gi, '').trim()
  }
  
  return '단계별 목표'
}

/**
 * 단계 시간 추출
 */
function extractStageDuration(lines: string[]): string {
  const durationLine = lines.find(line => 
    /시간:|duration:|초|분|seconds|minutes/i.test(line)
  )
  
  if (durationLine) {
    const match = durationLine.match(/(\d+[-~]\d+|\d+)\s*(초|분|seconds?|minutes?)/i)
    if (match) {
      return match[0]
    }
  }
  
  return '10-15초'
}

/**
 * 총 소요 시간 계산
 */
function calculateTotalDuration(stages: PlanningStage[]): number {
  return stages.reduce((total, stage) => {
    const numbers = stage.duration.match(/\d+/g)
    if (numbers && numbers.length > 0) {
      // 범위가 있는 경우 평균값 사용
      if (numbers.length === 2) {
        return total + (parseInt(numbers[0]) + parseInt(numbers[1])) / 2
      }
      return total + parseInt(numbers[0])
    }
    return total + 10 // 기본값
  }, 0)
}

/**
 * 기본 폴백 단계 생성
 */
function getDefaultStages(input: PlanningInput): NextResponse<GenerateStagesResponse> {
  const defaultStages: PlanningStage[] = [
    {
      id: '1',
      title: '1단계',
      content: `${input.toneManner} 톤으로 ${input.target}을 대상으로 한 오프닝을 제시합니다. "${input.logline}"의 핵심을 강조하여 시청자의 관심을 즉각적으로 끌어야 합니다.`,
      goal: '관심 유발 및 몰입 유도',
      duration: '5-8초',
      order: 1
    },
    {
      id: '2', 
      title: '2단계',
      content: `${input.storyStructure} 방식에 따라 상황을 구체적으로 전개합니다. ${input.format} 형식으로 문제 상황이나 배경을 명확하게 제시합니다.`,
      goal: '상황 설명 및 문제 제기',
      duration: '15-20초',
      order: 2
    },
    {
      id: '3',
      title: '3단계',
      content: `${input.tempo} 템포로 해결책이나 클라이맥스를 제시합니다. ${input.storyIntensity} 강도로 전개하여 핵심 메시지를 전달합니다.`,
      goal: '해결책 제시 및 감정 절정',
      duration: '20-25초',
      order: 3
    },
    {
      id: '4',
      title: '4단계',
      content: `${input.genre}의 특성에 맞게 마무리합니다. 행동 유도와 함께 브랜드나 메시지를 각인시킵니다.`,
      goal: '행동 유도 및 마무리',
      duration: '8-12초',
      order: 4
    }
  ]

  const totalDuration = calculateTotalDuration(defaultStages)

  return NextResponse.json<GenerateStagesResponse>({
    success: true,
    stages: defaultStages,
    totalDuration: `${totalDuration}초`,
  })
}