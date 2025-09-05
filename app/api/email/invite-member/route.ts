import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { emailQueue } from '@/lib/email/queue'
import { sendGridService, generateInviteToken } from '@/lib/email/sendgrid'
import { InviteMemberTemplate } from '@/lib/email/templates/InviteMemberTemplate'

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
    const data = requestSchema.parse(body)

    // 초대 토큰 생성
    const token = generateInviteToken()
    const expires = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7일 후 만료

    // 초대 정보 저장
    const inviteData: InviteData = {
      token,
      projectId: data.projectId,
      projectName: data.projectName,
      inviterEmail: data.inviterEmail,
      recipientEmail: data.recipientEmail,
      role: data.role,
      expires,
    }
    
    globalThis.inviteStore.set(token, inviteData)

    console.log('📨 Created project invite:', { 
      recipientEmail: data.recipientEmail,
      projectName: data.projectName,
      token,
    })

    // 초대 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet-vlanets-projects.vercel.app'
    const inviteLink = `${baseUrl}/invite/accept?token=${token}`

    // React Email 템플릿 렌더링
    const emailHtml = await sendGridService.renderTemplate(
      InviteMemberTemplate({
        projectName: data.projectName,
        inviterName: data.inviterName,
        inviterEmail: data.inviterEmail,
        inviteLink: inviteLink,
        role: roleDisplayNames[data.role],
      })
    )

    // 이메일을 큐에 추가
    const emailId = await emailQueue.add(
      {
        to: data.recipientEmail,
        subject: `${data.inviterName}님이 VLANET 프로젝트에 초대했습니다`,
        html: emailHtml,
      },
      {
        priority: 'normal',
      }
    )

    return NextResponse.json({
      success: true,
      message: '초대 이메일이 발송되었습니다.',
      emailId,
      inviteLink: process.env.NODE_ENV !== 'production' ? inviteLink : undefined,
    })
  } catch (error) {
    console.error('Invite member email error:', error)
    
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
        error: '초대 이메일 발송에 실패했습니다. 다시 시도해주세요.' 
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
    token: token.substring(0, 8) + '...', // 토큰 일부만 표시
    ...data,
    expiresIn: Math.max(0, data.expires - Date.now()),
  }))

  return NextResponse.json({
    success: true,
    invites,
    total: invites.length,
  })
}