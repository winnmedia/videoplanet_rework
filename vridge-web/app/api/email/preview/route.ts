/**
 * 이메일 템플릿 미리보기 API 엔드포인트
 * 개발/테스트용 - HTML 이메일 템플릿을 브라우저에서 미리보기
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  generateEmailPreview,
  type SignupVerificationData,
  type PasswordResetData,
  type TeamInviteData
} from '@/lib/email/templates'

export async function GET(request: NextRequest) {
  // 프로덕션에서는 접근 불가
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    if (!type) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html lang="ko">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>이메일 템플릿 미리보기</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; background: #f8f9fa; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
            h1 { color: #1f2937; margin-bottom: 30px; }
            .template-list { display: grid; gap: 20px; }
            .template-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
            .template-item h2 { color: #374151; margin: 0 0 10px 0; }
            .template-item p { color: #6b7280; margin: 0 0 15px 0; }
            .template-item a { background: #4f46e5; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; }
            .template-item a:hover { background: #4338ca; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📧 VideoPlaNet 이메일 템플릿 미리보기</h1>
            
            <div class="template-list">
              <div class="template-item">
                <h2>🎉 회원가입 인증</h2>
                <p>새로운 사용자의 이메일 인증을 위한 템플릿입니다.</p>
                <a href="/api/email/preview?type=signupVerification">미리보기</a>
              </div>
              
              <div class="template-item">
                <h2>🔐 비밀번호 재설정</h2>
                <p>비밀번호 재설정을 위한 보안 인증번호 템플릿입니다.</p>
                <a href="/api/email/preview?type=passwordReset">미리보기</a>
              </div>
              
              <div class="template-item">
                <h2>👥 팀 초대</h2>
                <p>프로젝트 협업을 위한 팀원 초대 템플릿입니다.</p>
                <a href="/api/email/preview?type=teamInvite">미리보기</a>
              </div>
            </div>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              <p><strong>주의:</strong> 이 페이지는 개발 환경에서만 접근 가능합니다.</p>
            </div>
          </div>
        </body>
        </html>
        `,
        { 
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        }
      )
    }

    let previewHtml: string

    switch (type) {
      case 'signupVerification':
        {
          const sampleData: SignupVerificationData = {
            userEmail: 'user@example.com',
            verificationCode: '123456',
            userName: '김개발',
            expiryMinutes: 10,
            baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
          }
          previewHtml = generateEmailPreview('signupVerification', sampleData)
        }
        break

      case 'passwordReset':
        {
          const sampleData: PasswordResetData = {
            userEmail: 'user@example.com',
            resetCode: '987654',
            userName: '김개발',
            expiryMinutes: 10,
            baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
          }
          previewHtml = generateEmailPreview('passwordReset', sampleData)
        }
        break

      case 'teamInvite':
        {
          const sampleData: TeamInviteData = {
            recipientEmail: 'newuser@example.com',
            recipientName: '이협업',
            inviterName: '김매니저',
            projectTitle: '영상 제작 프로젝트 2024',
            role: 'editor',
            message: '함께 멋진 영상을 만들어봐요! 당신의 창의적인 아이디어를 기대하고 있습니다.',
            inviteToken: 'invite_abc123def456',
            projectId: 'proj_789',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
            baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
          }
          previewHtml = generateEmailPreview('teamInvite', sampleData)
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
    }

    return new NextResponse(previewHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })

  } catch (error) {
    console.error('이메일 미리보기 생성 오류:', error)
    return NextResponse.json(
      { error: '이메일 미리보기 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // 프로덕션에서는 접근 불가
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const { type, data } = await request.json()

    if (!type || !data) {
      return NextResponse.json({ error: 'Type and data are required' }, { status: 400 })
    }

    let previewHtml: string

    switch (type) {
      case 'signupVerification':
        previewHtml = generateEmailPreview('signupVerification', data as SignupVerificationData)
        break

      case 'passwordReset':
        previewHtml = generateEmailPreview('passwordReset', data as PasswordResetData)
        break

      case 'teamInvite':
        previewHtml = generateEmailPreview('teamInvite', data as TeamInviteData)
        break

      default:
        return NextResponse.json({ error: 'Invalid template type' }, { status: 400 })
    }

    return new NextResponse(previewHtml, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })

  } catch (error) {
    console.error('이메일 미리보기 생성 오류:', error)
    return NextResponse.json(
      { error: '이메일 미리보기 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}