import { NextRequest, NextResponse } from 'next/server'

import { generateAutoSchedule, calculateTotalDuration } from '../../../../../shared/lib/date-utils'

interface AutoScheduleRequest {
  startDate: string
}

interface AutoScheduleResponse {
  success: boolean
  schedule?: {
    planning: {
      name: string
      startDate: string
      endDate: string
      duration: number
    }
    shooting: {
      name: string
      startDate: string
      endDate: string
      duration: number
    }
    editing: {
      name: string
      startDate: string
      endDate: string
      duration: number
    }
  }
  totalDuration?: number
  projectId?: string
  error?: string
}

interface AutoScheduleConfigResponse {
  success: boolean
  config: {
    phases: Array<{
      name: string
      duration: number
    }>
    totalDuration: number
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<AutoScheduleResponse>> {
  try {
    const body: AutoScheduleRequest = await request.json()

    // 입력 검증
    if (!body.startDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'startDate is required',
        },
        { status: 400 }
      )
    }

    // 날짜 형식 검증 및 일정 생성
    let schedule
    try {
      schedule = generateAutoSchedule(body.startDate)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid date format. Please provide date in YYYY-MM-DD format.',
        },
        { status: 400 }
      )
    }

    // 성공 응답
    return NextResponse.json(
      {
        success: true,
        schedule,
        totalDuration: calculateTotalDuration(),
        projectId: params.id,
      },
      { status: 200 }
    )
  } catch {
    // 내부 서버 오류
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse<AutoScheduleConfigResponse>> {
  try {
    // 자동 일정 생성 설정 정보 반환
    return NextResponse.json(
      {
        success: true,
        config: {
          phases: [
            { name: '기획', duration: 7 },
            { name: '촬영', duration: 1 },
            { name: '편집', duration: 14 },
          ],
          totalDuration: calculateTotalDuration(),
        },
      },
      { status: 200 }
    )
  } catch {
    return NextResponse.json(
      {
        success: false,
        config: {
          phases: [],
          totalDuration: 0,
        },
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
