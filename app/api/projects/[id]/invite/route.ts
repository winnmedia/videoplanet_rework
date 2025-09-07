/**
 * @fileoverview Team Member Invitation API Route
 * @description 팀원 초대 이메일 발송을 위한 API 엔드포인트 (SendGrid 통합)
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { simpleSendGrid } from '../../../../../lib/email/simple-sendgrid'
import { emailCooldown } from '../../../../../lib/email/cooldown'

// 팀 초대 스키마
const TeamInviteSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  role: z.enum(['owner', 'admin', 'editor', 'reviewer', 'viewer']),
  inviterName: z.string().min(1, '초대자 이름이 필요합니다'),
  projectName: z.string().min(1, '프로젝트 이름이 필요합니다'),
  message: z.string().optional(),
  expiresInDays: z.number().min(1).max(30).default(7)
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const body = await request.json()
    
    // Zod 검증
    const validatedData = TeamInviteSchema.parse(body)
    
    // 쿨다운 체크 (60초)
    if (!emailCooldown.check(validatedData.email)) {
      const remaining = emailCooldown.getRemainingSeconds(validatedData.email)
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `같은 이메일 주소로 너무 자주 초대를 보내고 있습니다. ${remaining}초 후에 다시 시도해주세요.`,
          retryAfter: remaining
        },
        { status: 429 }
      )
    }
    
    // 초대 토큰 생성
    const inviteToken = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiryDate = new Date(Date.now() + validatedData.expiresInDays * 24 * 60 * 60 * 1000)
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet-vlanets-projects.vercel.app'}/invite/${inviteToken}`
    
    // 단순 텍스트 이메일 내용 생성
    const emailText = `
안녕하세요!

${validatedData.inviterName}님이 회원님을 VLANET 프로젝트에 초대했습니다.

프로젝트 정보:
- 프로젝트명: ${validatedData.projectName}
- 역할: ${validatedData.role}
- 초대자: ${validatedData.inviterName}

${validatedData.message ? `메시지: ${validatedData.message}\n` : ''}
아래 링크를 클릭하여 초대를 수락해주세요:
${inviteLink}

이 초대는 ${validatedData.expiresInDays}일 후 만료됩니다.

감사합니다.
VLANET 팀
    `.trim()
    
    // SendGrid로 이메일 발송
    const emailResult = await simpleSendGrid.send({
      to: validatedData.email,
      subject: `[VLANET] ${validatedData.projectName} 프로젝트 초대`,
      text: emailText
    })
    
    if (!emailResult.success) {
      // 실패 시 쿨다운 해제 (재시도 허용)
      emailCooldown.check(`reset_${validatedData.email}`)
      return NextResponse.json(
        { 
          error: 'Email sending failed',
          message: `이메일 발송에 실패했습니다: ${emailResult.error}`,
          details: emailResult.error
        },
        { status: 500 }
      )
    }
    
    // 초대 정보 (실제로는 데이터베이스에 저장)
    const invitation = {
      id: inviteToken,
      projectId,
      email: validatedData.email,
      role: validatedData.role,
      status: 'sent',
      token: inviteToken,
      expiryDate: expiryDate.toISOString(),
      sentAt: new Date().toISOString(),
      inviterName: validatedData.inviterName
    }
    
    return NextResponse.json(
      { 
        success: true,
        message: '초대 이메일이 성공적으로 발송되었습니다.',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiryDate: invitation.expiryDate,
          sentAt: invitation.sentAt
        },
        inviteLink
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Team invitation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: error.errors,
          message: '입력 데이터가 올바르지 않습니다.'
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to send invitation',
        message: error instanceof Error ? error.message : '초대 처리 중 오류가 발생했습니다.'
      },
      { status: 500 }
    )
  }
}