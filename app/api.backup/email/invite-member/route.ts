import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { emailQueue } from '@/lib/email/queue'
import { sendGridService, generateInviteToken } from '@/lib/email/sendgrid'
import { InviteMemberTemplate } from '@/lib/email/templates/InviteMemberTemplate'
import { invitationService, InviteRequestSchema } from '@/shared/services/invitation'

// 요청 스키마
const requestSchema = z.object({
  recipientEmail: z.string().email(),
  projectId: z.string(),
  projectName: z.string().min(1),
  inviterName: z.string().min(1),
  inviterEmail: z.string().email(),
  role: z.enum(['viewer', 'editor', 'admin']),
})

// 초대 토큰 저장소 (실제 운영에서는 데이터베이스 사용)
interface InviteData {
  token: string
  projectId: string
  projectName: string
  inviterEmail: string
  recipientEmail: string
  role: string
  expires: number
}

declare global {
  var inviteStore: Map<string, InviteData>
}

if (!globalThis.inviteStore) {
  globalThis.inviteStore = new Map()
}

const roleDisplayNames = {
  viewer: '뷰어',
  editor: '편집자',
  admin: '관리자',
}

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱 및 검증
    const body = await request.json()
    
    // 기존 스키마를 InvitationService 스키마에 맞게 변환
    const transformedData = {
      email: body.recipientEmail,
      role: body.role,
      projectId: body.projectId,
      inviterName: body.inviterName,
      projectName: body.projectName,
      message: body.message,
      expiresInDays: 7
    }

    // InvitationService를 통한 초대 처리
    const result = await invitationService.sendInvitation(transformedData)

    if (!result.success) {
      const statusCode = result.message.includes('재전송') ? 429 : 400
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          canRetryAt: result.canRetryAt
        },
        { status: statusCode }
      )
    }

    // 성공 시 기존 로직과 호환되는 응답
    return NextResponse.json({
      success: true,
      message: result.message,
      inviteId: result.inviteId,
      canRetryAt: result.canRetryAt
    })

  } catch (error) {
    console.error('Invite member email error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: '초대 이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.' 
      },
      { status: 500 }
    )
  }
}

// 초대 수락 확인
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = z.object({
      token: z.string().min(1),
    }).parse(body)

    const inviteData = globalThis.inviteStore.get(token)
    
    if (!inviteData) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 초대 링크입니다.' },
        { status: 404 }
      )
    }

    if (inviteData.expires < Date.now()) {
      globalThis.inviteStore.delete(token)
      return NextResponse.json(
        { success: false, error: '초대 링크가 만료되었습니다.' },
        { status: 400 }
      )
    }

    // 초대 수락 처리 (실제로는 데이터베이스에 멤버 추가)
    globalThis.inviteStore.delete(token)

    return NextResponse.json({
      success: true,
      message: '프로젝트에 성공적으로 참여했습니다.',
      projectId: inviteData.projectId,
      projectName: inviteData.projectName,
      role: inviteData.role,
    })
  } catch (error) {
    console.error('Accept invite error:', error)
    
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
      { success: false, error: '초대 수락 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 초대 목록 조회 (관리자용)
export async function GET() {
  const invites = Array.from(globalThis.inviteStore.entries()).map(([token, data]) => ({
    ...data,
    token: token.substring(0, 8) + '...', // 토큰 일부만 표시 (덮어쓰기)
    expiresIn: Math.max(0, data.expires - Date.now()),
  }))

  return NextResponse.json({
    success: true,
    invites,
    total: invites.length,
  })
}