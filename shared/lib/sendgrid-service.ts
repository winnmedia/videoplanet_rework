/**
 * SendGrid Email Service
 * DEVPLAN.md 요구사항: 팀원 초대 이메일 전송, 60초 쿨다운
 * @layer shared/lib
 */

import { z } from 'zod'

// ===========================
// Environment Validation
// ===========================

const SendGridConfigSchema = z.object({
  apiKey: z.string().min(1, 'SendGrid API 키가 필요합니다'),
  fromEmail: z.string().email('유효한 발신자 이메일이 필요합니다'),
  fromName: z.string().min(1, '발신자 이름이 필요합니다'),
  baseUrl: z.string().url('유효한 웹사이트 URL이 필요합니다').optional()
})

type SendGridConfig = z.infer<typeof SendGridConfigSchema>

// ===========================
// Email Templates
// ===========================

export interface TeamInviteEmailData {
  recipientEmail: string
  recipientName?: string
  inviterName: string
  projectTitle: string
  role: 'admin' | 'editor' | 'reviewer' | 'viewer'
  message?: string
  inviteToken: string
  projectId: string
  expiresAt: string
}

export interface EmailTemplate {
  templateId?: string
  subject: string
  htmlContent: string
  plainTextContent: string
}

// ===========================
// SendGrid Service
// ===========================

export class SendGridService {
  private config: SendGridConfig
  private cooldownMap: Map<string, number> = new Map()
  private readonly COOLDOWN_MS = 60 * 1000 // 60초

  constructor(config: Partial<SendGridConfig>) {
    // 환경 변수에서 기본값 로드
    const defaultConfig = {
      apiKey: process.env.SENDGRID_API_KEY || '',
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@vladnet.kr',
      fromName: process.env.SENDGRID_FROM_NAME || 'VideoPlanet',
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://vridge-web.vercel.app'
    }

    this.config = SendGridConfigSchema.parse({ ...defaultConfig, ...config })
  }

  /**
   * 팀원 초대 이메일 전송
   * DEVPLAN.md DoD: "60초 쿨다운, SendGrid API 사용"
   */
  async sendTeamInvite(data: TeamInviteEmailData): Promise<{
    success: boolean
    messageId?: string
    error?: string
    cooldownRemaining?: number
  }> {
    try {
      // 1. 쿨다운 검사
      const cooldownCheck = this.checkCooldown(data.recipientEmail)
      if (!cooldownCheck.canSend) {
        return {
          success: false,
          error: `이메일 전송은 ${Math.ceil(cooldownCheck.remainingMs / 1000)}초 후에 다시 시도할 수 있습니다`,
          cooldownRemaining: cooldownCheck.remainingMs
        }
      }

      // 2. 이메일 템플릿 생성
      const template = this.generateTeamInviteTemplate(data)

      // 3. SendGrid API 호출
      const response = await this.sendEmail({
        to: {
          email: data.recipientEmail,
          name: data.recipientName || data.recipientEmail
        },
        template
      })

      // 4. 성공 시 쿨다운 설정
      this.setCooldown(data.recipientEmail)

      return {
        success: true,
        messageId: response.messageId
      }

    } catch (error: any) {
      console.error('SendGrid team invite error:', error)
      
      return {
        success: false,
        error: error.message || '이메일 전송에 실패했습니다'
      }
    }
  }

  /**
   * 일반 이메일 전송
   */
  private async sendEmail(params: {
    to: { email: string; name?: string }
    template: EmailTemplate
    attachments?: Array<{
      content: string
      filename: string
      type: string
    }>
  }): Promise<{ messageId: string }> {
    const { to, template, attachments } = params

    // SendGrid API 페이로드 구성
    const payload = {
      personalizations: [
        {
          to: [{ email: to.email, name: to.name }],
          subject: template.subject
        }
      ],
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName
      },
      content: [
        {
          type: 'text/plain',
          value: template.plainTextContent
        },
        {
          type: 'text/html', 
          value: template.htmlContent
        }
      ],
      attachments: attachments || [],
      // 추적 설정
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
        subscription_tracking: { enable: false },
        ganalytics: { enable: false }
      },
      mail_settings: {
        spam_check: { enable: true }
      }
    }

    // 개발 환경에서는 실제 전송하지 않고 시뮬레이션
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      console.log('[SendGrid Simulation] Would send email:', {
        to: to.email,
        subject: template.subject,
        preview: template.htmlContent.substring(0, 200) + '...'
      })
      
      return {
        messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    }

    // 실제 SendGrid API 호출
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`SendGrid API Error (${response.status}): ${error}`)
    }

    // SendGrid는 성공 시 202를 반환하고 X-Message-Id 헤더에 메시지 ID 포함
    const messageId = response.headers.get('X-Message-Id') || `msg_${Date.now()}`
    
    return { messageId }
  }

  /**
   * 팀 초대 이메일 템플릿 생성
   */
  private generateTeamInviteTemplate(data: TeamInviteEmailData): EmailTemplate {
    const { 
      inviterName, 
      projectTitle, 
      role, 
      message, 
      inviteToken, 
      projectId,
      expiresAt 
    } = data

    const roleDisplayName = this.getRoleDisplayName(role)
    const inviteUrl = `${this.config.baseUrl}/invite/accept?token=${inviteToken}&project=${projectId}`
    const expiresDate = new Date(expiresAt).toLocaleDateString('ko-KR')

    const subject = `[VideoPlanet] ${inviterName}님이 "${projectTitle}" 프로젝트에 초대하셨습니다`

    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>프로젝트 초대</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .content { padding: 40px; }
    .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .btn:hover { background: #5a6fd8; }
    .info-box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 20px; margin: 20px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #6c757d; border-top: 1px solid #e9ecef; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎬 VideoPlanet</h1>
      <p>프로젝트 협업 초대</p>
    </div>
    
    <div class="content">
      <h2>안녕하세요!</h2>
      
      <p><strong>${inviterName}</strong>님이 VideoPlanet에서 "<strong>${projectTitle}</strong>" 프로젝트에 당신을 초대했습니다.</p>
      
      <div class="info-box">
        <h3>초대 정보</h3>
        <ul>
          <li><strong>프로젝트:</strong> ${projectTitle}</li>
          <li><strong>역할:</strong> ${roleDisplayName}</li>
          <li><strong>초대한 사람:</strong> ${inviterName}</li>
          <li><strong>만료일:</strong> ${expiresDate}</li>
        </ul>
      </div>
      
      ${message ? `
        <div class="info-box">
          <h4>초대 메시지</h4>
          <p>"${message}"</p>
        </div>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" class="btn">초대 수락하기</a>
      </div>
      
      <p style="font-size: 14px; color: #6c757d;">
        위 버튼이 작동하지 않는다면 아래 링크를 복사하여 브라우저에 붙여넣어 주세요:<br>
        <a href="${inviteUrl}">${inviteUrl}</a>
      </p>
      
      <div class="info-box">
        <h4>🔒 보안 안내</h4>
        <p>이 초대 링크는 <strong>${expiresDate}까지</strong> 유효하며, 한 번만 사용할 수 있습니다.</p>
        <p>만약 이 초대를 요청하지 않으셨다면, 이 이메일을 무시하셔도 됩니다.</p>
      </div>
    </div>
    
    <div class="footer">
      <p>© 2024 VideoPlanet. 모든 권리 보유.</p>
      <p>이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.</p>
    </div>
  </div>
</body>
</html>
    `

    const plainTextContent = `
VideoPlanet 프로젝트 초대

안녕하세요!

${inviterName}님이 "${projectTitle}" 프로젝트에 당신을 ${roleDisplayName} 역할로 초대했습니다.

초대 정보:
- 프로젝트: ${projectTitle}
- 역할: ${roleDisplayName}  
- 초대한 사람: ${inviterName}
- 만료일: ${expiresDate}

${message ? `초대 메시지: "${message}"` : ''}

초대를 수락하려면 아래 링크를 클릭하세요:
${inviteUrl}

이 초대 링크는 ${expiresDate}까지 유효하며, 한 번만 사용할 수 있습니다.

만약 이 초대를 요청하지 않으셨다면, 이 이메일을 무시하셔도 됩니다.

© 2024 VideoPlanet
    `

    return {
      subject,
      htmlContent,
      plainTextContent
    }
  }

  /**
   * 역할 이름 한국어 변환
   */
  private getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      admin: '관리자',
      editor: '편집자', 
      reviewer: '리뷰어',
      viewer: '뷰어'
    }
    return roleNames[role] || role
  }

  /**
   * 쿨다운 검사
   */
  private checkCooldown(email: string): { canSend: boolean; remainingMs: number } {
    const lastSentTime = this.cooldownMap.get(email) || 0
    const now = Date.now()
    const timeSinceLastSent = now - lastSentTime
    
    if (timeSinceLastSent < this.COOLDOWN_MS) {
      return {
        canSend: false,
        remainingMs: this.COOLDOWN_MS - timeSinceLastSent
      }
    }
    
    return {
      canSend: true,
      remainingMs: 0
    }
  }

  /**
   * 쿨다운 설정
   */
  private setCooldown(email: string): void {
    this.cooldownMap.set(email, Date.now())
    
    // 메모리 정리: 쿨다운 시간이 지난 항목들 제거
    setTimeout(() => {
      this.cooldownMap.delete(email)
    }, this.COOLDOWN_MS + 60000) // 여유시간 1분 추가
  }

  /**
   * 초대 토큰 생성
   */
  static generateInviteToken(): string {
    const timestamp = Date.now().toString(36)
    const randomPart = Math.random().toString(36).substring(2, 15)
    return `invite_${timestamp}_${randomPart}`
  }

  /**
   * 서비스 상태 확인
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        return { healthy: true }
      }

      // SendGrid API 상태 확인 (간단한 API 호출)
      const response = await fetch('https://api.sendgrid.com/v3/user/account', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      })

      if (response.ok) {
        return { healthy: true }
      } else {
        return { 
          healthy: false, 
          error: `SendGrid API Error: ${response.status}` 
        }
      }
    } catch (error: any) {
      return { 
        healthy: false, 
        error: error.message 
      }
    }
  }
}

// ===========================
// Default Instance
// ===========================

let defaultSendGridService: SendGridService | null = null

export function getSendGridService(): SendGridService {
  if (!defaultSendGridService) {
    defaultSendGridService = new SendGridService({})
  }
  return defaultSendGridService
}

// ===========================
// Exports
// ===========================

export type {
  TeamInviteEmailData,
  EmailTemplate,
  SendGridConfig
}