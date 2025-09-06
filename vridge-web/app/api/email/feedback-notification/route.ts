import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { emailQueue } from '@/lib/email/queue'
import { sendGridService } from '@/lib/email/sendgrid'
import { FeedbackNotificationTemplate } from '@/lib/email/templates/FeedbackNotificationTemplate'

// 요청 스키마
const requestSchema = z.object({
  recipientEmail: z.string().email(),
  projectId: z.string(),
  projectName: z.string().min(1),
  feedbackAuthor: z.string().min(1),
  feedbackContent: z.string().min(1),
  videoId: z.string(),
  videoTitle: z.string().min(1),
  timestamp: z.string().optional(),
  feedbackType: z.enum(['comment', 'approval', 'revision']),
})

// 알림 설정 저장소 (실제 운영에서는 데이터베이스 사용)
interface NotificationPreferences {
  email: string
  enabled: boolean
  types: string[]
  frequency: 'immediate' | 'daily' | 'weekly'
}

declare global {
  var notificationPreferences: Map<string, NotificationPreferences>
}

if (!globalThis.notificationPreferences) {
  globalThis.notificationPreferences = new Map()
}

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱 및 검증
    const body = await request.json()
    const data = requestSchema.parse(body)

    // 사용자 알림 설정 확인
    const preferences = globalThis.notificationPreferences.get(data.recipientEmail)
    
    if (preferences && !preferences.enabled) {
      return NextResponse.json({
        success: true,
        message: '사용자가 알림을 비활성화했습니다.',
        skipped: true,
      })
    }

    if (preferences && !preferences.types.includes(data.feedbackType)) {
      return NextResponse.json({
        success: true,
        message: `사용자가 ${data.feedbackType} 알림을 비활성화했습니다.`,
        skipped: true,
      })
    }

    // 피드백 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet-vlanets-projects.vercel.app'
    const feedbackLink = `${baseUrl}/projects/${data.projectId}/feedback/${data.videoId}`

    // React Email 템플릿 렌더링
    const templateElement = FeedbackNotificationTemplate({
      projectName: data.projectName,
      feedbackAuthor: data.feedbackAuthor,
      feedbackContent: data.feedbackContent,
      videoTitle: data.videoTitle,
      timestamp: data.timestamp,
      feedbackLink: feedbackLink,
      feedbackType: data.feedbackType,
    })
    
    const emailHtml = await sendGridService.renderTemplate(templateElement as any)

    // 이메일 우선순위 결정
    const priority = data.feedbackType === 'revision' ? 'high' : 'normal'

    // 이메일을 큐에 추가
    const emailId = await emailQueue.add(
      {
        to: data.recipientEmail,
        subject: getEmailSubject(data.feedbackAuthor, data.projectName, data.feedbackType),
        html: emailHtml,
      },
      {
        priority,
        // 빈도 설정에 따른 스케줄링
        ...(preferences?.frequency === 'daily' && {
          scheduledFor: getNextDailyTime(),
        }),
        ...(preferences?.frequency === 'weekly' && {
          scheduledFor: getNextWeeklyTime(),
        }),
      }
    )

    console.log('💬 Feedback notification sent:', {
      recipientEmail: data.recipientEmail,
      projectName: data.projectName,
      feedbackType: data.feedbackType,
      emailId,
    })

    return NextResponse.json({
      success: true,
      message: '피드백 알림이 발송되었습니다.',
      emailId,
    })
  } catch (error) {
    console.error('Feedback notification error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: '입력 데이터가 올바르지 않습니다.',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: '피드백 알림 발송에 실패했습니다.' 
      },
      { status: 500 }
    )
  }
}

// 알림 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const preferences = z.object({
      email: z.string().email(),
      enabled: z.boolean(),
      types: z.array(z.enum(['comment', 'approval', 'revision'])),
      frequency: z.enum(['immediate', 'daily', 'weekly']),
    }).parse(body)

    globalThis.notificationPreferences.set(preferences.email, preferences)

    return NextResponse.json({
      success: true,
      message: '알림 설정이 업데이트되었습니다.',
      preferences,
    })
  } catch (error) {
    console.error('Update notification preferences error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: '입력 데이터가 올바르지 않습니다.',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: '알림 설정 업데이트에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 알림 설정 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json(
      { success: false, error: '이메일 주소가 필요합니다.' },
      { status: 400 }
    )
  }

  const preferences = globalThis.notificationPreferences.get(email)

  if (!preferences) {
    // 기본 설정 반환
    return NextResponse.json({
      success: true,
      preferences: {
        email,
        enabled: true,
        types: ['comment', 'approval', 'revision'],
        frequency: 'immediate',
      },
      isDefault: true,
    })
  }

  return NextResponse.json({
    success: true,
    preferences,
    isDefault: false,
  })
}

// 헬퍼 함수들
function getEmailSubject(
  author: string, 
  projectName: string, 
  type: 'comment' | 'approval' | 'revision'
): string {
  switch (type) {
    case 'approval':
      return `✅ ${author}님이 ${projectName} 프로젝트를 승인했습니다`
    case 'revision':
      return `🔄 ${author}님이 ${projectName} 프로젝트에 수정을 요청했습니다`
    default:
      return `💬 ${author}님이 ${projectName} 프로젝트에 피드백을 남겼습니다`
  }
}

function getNextDailyTime(): Date {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(9, 0, 0, 0) // 다음날 오전 9시
  return tomorrow
}

function getNextWeeklyTime(): Date {
  const nextWeek = new Date()
  const dayOfWeek = nextWeek.getDay()
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  nextWeek.setDate(nextWeek.getDate() + daysUntilMonday)
  nextWeek.setHours(9, 0, 0, 0) // 다음 월요일 오전 9시
  return nextWeek
}