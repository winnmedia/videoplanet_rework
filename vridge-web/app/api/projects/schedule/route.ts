/**
 * @fileoverview Auto Schedule Calculation API Route
 * @description 프로젝트 자동 일정 계산을 위한 API 엔드포인트
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// 일정 계산 요청 스키마
const ScheduleCalculationSchema = z.object({
  projectId: z.string().min(1, '프로젝트 ID는 필수입니다'),
  projectType: z.enum(['corporate', 'marketing', 'education', 'entertainment']),
  complexity: z.enum(['simple', 'medium', 'complex']).default('medium'),
  teamSize: z.number().min(1).max(50).default(3),
  budget: z.number().optional(),
  targetDuration: z.number().optional(), // 목표 영상 길이 (분)
  startDate: z.string().optional(),
  constraints: z
    .object({
      maxPlanningDays: z.number().optional(),
      maxShootingDays: z.number().optional(),
      maxEditingDays: z.number().optional(),
      availableDays: z.array(z.number().min(0).max(6)).optional(), // 0=일요일, 6=토요일
    })
    .optional(),
})

// 프로젝트 유형별 기본 일정 설정
const BASE_SCHEDULES = {
  corporate: {
    planning: { min: 3, max: 7, default: 5 },
    shooting: { min: 1, max: 3, default: 2 },
    editing: { min: 3, max: 10, default: 7 },
  },
  marketing: {
    planning: { min: 2, max: 5, default: 3 },
    shooting: { min: 1, max: 2, default: 1 },
    editing: { min: 2, max: 7, default: 5 },
  },
  education: {
    planning: { min: 5, max: 10, default: 7 },
    shooting: { min: 2, max: 5, default: 3 },
    editing: { min: 5, max: 15, default: 10 },
  },
  entertainment: {
    planning: { min: 7, max: 21, default: 14 },
    shooting: { min: 3, max: 14, default: 7 },
    editing: { min: 10, max: 30, default: 21 },
  },
}

// 복잡도 계수
const COMPLEXITY_MULTIPLIER = {
  simple: 0.7,
  medium: 1.0,
  complex: 1.5,
}

// 팀 크기 효율 계수
const TEAM_SIZE_EFFICIENCY = {
  1: 1.0,
  2: 0.8,
  3: 0.7,
  4: 0.6,
  5: 0.55,
}

function calculateBusinessDays(startDate: Date, days: number, availableDays?: number[]): Date {
  const result = new Date(startDate)
  let addedDays = 0

  // 기본적으로 평일만 (월-금: 1-5)
  const workingDays = availableDays || [1, 2, 3, 4, 5]

  while (addedDays < days) {
    result.setDate(result.getDate() + 1)
    if (workingDays.includes(result.getDay())) {
      addedDays++
    }
  }

  return result
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zod 검증
    const validatedData = ScheduleCalculationSchema.parse(body)

    const { projectType, complexity, teamSize, constraints, startDate } = validatedData

    // 기본 일정 가져오기
    const baseSchedule = BASE_SCHEDULES[projectType]

    // 복잡도 및 팀 크기 적용
    const complexityMultiplier = COMPLEXITY_MULTIPLIER[complexity]
    const teamEfficiency = TEAM_SIZE_EFFICIENCY[Math.min(teamSize, 5) as keyof typeof TEAM_SIZE_EFFICIENCY] || 0.5

    // 각 단계별 일수 계산
    const planningDays = Math.ceil(
      Math.min(
        baseSchedule.planning.default * complexityMultiplier * teamEfficiency,
        constraints?.maxPlanningDays || baseSchedule.planning.max
      )
    )

    const shootingDays = Math.ceil(
      Math.min(
        baseSchedule.shooting.default * complexityMultiplier,
        constraints?.maxShootingDays || baseSchedule.shooting.max
      )
    )

    const editingDays = Math.ceil(
      Math.min(
        baseSchedule.editing.default * complexityMultiplier * teamEfficiency,
        constraints?.maxEditingDays || baseSchedule.editing.max
      )
    )

    // 시작일 설정 (제공되지 않으면 내일부터)
    const projectStartDate = startDate ? new Date(startDate) : new Date(Date.now() + 24 * 60 * 60 * 1000)

    // 각 단계 날짜 계산
    const planningStartDate = new Date(projectStartDate)
    const planningEndDate = calculateBusinessDays(planningStartDate, planningDays, constraints?.availableDays)

    const shootingStartDate = new Date(planningEndDate)
    shootingStartDate.setDate(shootingStartDate.getDate() + 1)
    const shootingEndDate = calculateBusinessDays(shootingStartDate, shootingDays, constraints?.availableDays)

    const editingStartDate = new Date(shootingEndDate)
    editingStartDate.setDate(editingStartDate.getDate() + 1)
    const editingEndDate = calculateBusinessDays(editingStartDate, editingDays, constraints?.availableDays)

    const schedule = {
      projectId: validatedData.projectId,
      totalDays: planningDays + shootingDays + editingDays,
      phases: {
        planning: {
          phase: 'planning',
          duration: planningDays,
          startDate: planningStartDate.toISOString(),
          endDate: planningEndDate.toISOString(),
          description: '기획 및 사전 제작',
          tasks: ['컨셉 확정', '스크립트 작성', '스토리보드 제작', '촬영 계획 수립'],
        },
        shooting: {
          phase: 'shooting',
          duration: shootingDays,
          startDate: shootingStartDate.toISOString(),
          endDate: shootingEndDate.toISOString(),
          description: '촬영 및 소재 수집',
          tasks: ['장비 준비', '촬영 진행', '소재 정리', '품질 검수'],
        },
        editing: {
          phase: 'editing',
          duration: editingDays,
          startDate: editingStartDate.toISOString(),
          endDate: editingEndDate.toISOString(),
          description: '편집 및 후반 작업',
          tasks: ['러프 컷 편집', '파인 컷 편집', '사운드 믹싱', '최종 렌더링'],
        },
      },
      calculationFactors: {
        projectType,
        complexity,
        teamSize,
        complexityMultiplier,
        teamEfficiency,
        constraints,
      },
      calculatedAt: new Date().toISOString(),
    }

    console.log('Schedule calculated:', {
      projectId: validatedData.projectId,
      totalDays: schedule.totalDays,
      phases: Object.keys(schedule.phases).map(phase => ({
        phase,
        duration: schedule.phases[phase as keyof typeof schedule.phases].duration,
      })),
    })

    return NextResponse.json(
      {
        success: true,
        schedule,
        message: '프로젝트 일정이 성공적으로 계산되었습니다.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Schedule calculation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
          message: '입력 데이터가 올바르지 않습니다.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to calculate schedule',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
