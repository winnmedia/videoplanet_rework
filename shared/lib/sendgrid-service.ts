/**
 * SendGrid Email Service
 * DEVPLAN.md 요구사항: 팀원 초대 이메일 전송, 60초 쿨다운
 * @layer shared/lib
 */

import { z } from 'zod'
import { sendGridConfig, type SendGridEnv } from './env-validation/sendgrid'

// ===========================
// Environment Validation (Updated)
// ===========================

// 기존 스키마는 호환성을 위해 유지하되, 새로운 검증 시스템을 우선 사용
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

  constructor(config: Partial<SendGridConfig> = {}) {
    // 새로운 검증된 환경 변수 시스템 사용
    const validatedEnv = sendGridConfig

    // 검증된 환경 변수를 기본값으로 사용
    const defaultConfig = {
      apiKey: validatedEnv.SENDGRID_API_KEY,
      fromEmail: validatedEnv.SENDGRID_FROM_EMAIL,
      fromName: validatedEnv.SENDGRID_FROM_NAME,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://vridge-web.vercel.app'
    }

    // 기존 스키마로 최종 검증 (호환성 유지)
    this.config = SendGridConfigSchema.parse({ ...defaultConfig, ...config })

    // 개발환경에서 설정 상태 로깅
    if (process.env.NODE_ENV === 'development') {
      console.log('📧 SendGridService 초기화됨')
      console.log(`  - 발신자: ${this.config.fromName} <${this.config.fromEmail}>`)
      console.log(`  - API 키 설정 상태: ${validatedEnv.isConfigured ? '✅ 설정됨' : '❌ 미설정'}`)
    }
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
   * 새로운 HTML 템플릿 시스템 사용
   */
  private generateTeamInviteTemplate(data: TeamInviteEmailData): EmailTemplate {
    const { 
      recipientEmail,
      recipientName,
      inviterName, 
      projectTitle, 
      role, 
      message, 
      inviteToken, 
      projectId,
      expiresAt 
    } = data

    // 새로운 HTML 템플릿 시스템 사용
    const { createTeamInviteEmail } = require('../../lib/email/templates')
    
    const teamInviteData = {
      recipientEmail,
      recipientName,
      inviterName,
      projectTitle,
      role,
      message,
      inviteToken,
      projectId,
      expiresAt,
      baseUrl: this.config.baseUrl
    }

    const emailTemplate = createTeamInviteEmail(teamInviteData)

    return {
      subject: emailTemplate.subject,
      htmlContent: emailTemplate.htmlContent,
      plainTextContent: emailTemplate.plainTextContent
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

// Export types removed to avoid duplication - types already exported above