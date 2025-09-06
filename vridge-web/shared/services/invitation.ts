/**
 * 초대 서비스 (Invitation Service)
 * @description 팀원 초대 로직 통합 서비스
 * @layer shared/services
 * 
 * 기능:
 * - 이메일 초대 발송
 * - 60초 쿨다운 관리
 * - 권한 검증
 * - 초대 토큰 관리
 */

import { z } from 'zod'

// Zod 스키마 정의
export const InviteRequestSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  role: z.enum(['admin', 'manager', 'editor', 'viewer'], {
    required_error: '역할을 선택해주세요'
  }),
  projectId: z.string().min(1, '프로젝트 ID는 필수입니다'),
  inviterName: z.string().min(1, '초대자 이름은 필수입니다'),
  projectName: z.string().min(1, '프로젝트 이름은 필수입니다'),
  message: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(30).default(7)
})

export const AcceptInviteSchema = z.object({
  token: z.string().min(1, '초대 토큰이 필요합니다'),
  userInfo: z.object({
    name: z.string().min(1, '이름은 필수입니다'),
    password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다')
  })
})

// 타입 정의
export type InviteRequest = z.infer<typeof InviteRequestSchema>
export type AcceptInviteRequest = z.infer<typeof AcceptInviteSchema>

export interface InviteResponse {
  success: boolean
  inviteId?: string
  message: string
  canRetryAt?: Date
}

export interface InviteCooldownInfo {
  isActive: boolean
  remainingSeconds: number
  canRetryAt: Date
}

export interface InviteTokenInfo {
  token: string
  email: string
  role: string
  projectId: string
  projectName: string
  inviterName: string
  expiresAt: Date
  isValid: boolean
}

// 쿨다운 관리용 메모리 저장소 (프로덕션에서는 Redis 사용)
const cooldownStore = new Map<string, Date>()

/**
 * 초대 서비스 클래스
 */
export class InvitationService {
  private readonly COOLDOWN_SECONDS = 60
  private readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

  /**
   * 팀원 초대 이메일 발송
   */
  async sendInvitation(data: InviteRequest): Promise<InviteResponse> {
    try {
      // 1. 입력 검증
      const validatedData = InviteRequestSchema.parse(data)
      
      // 2. 쿨다운 검사
      const cooldownKey = `${validatedData.projectId}:${validatedData.email}`
      const cooldownInfo = this.getCooldownInfo(cooldownKey)
      
      if (cooldownInfo.isActive) {
        return {
          success: false,
          message: `이메일 재전송은 ${cooldownInfo.remainingSeconds}초 후에 가능합니다.`,
          canRetryAt: cooldownInfo.canRetryAt
        }
      }

      // 3. API 호출
      const response = await fetch(`${this.API_BASE_URL}/api/email/invite-member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '서버 오류가 발생했습니다' }))
        return {
          success: false,
          message: errorData.message || '초대 발송에 실패했습니다'
        }
      }

      const result = await response.json()
      
      // 4. 성공 시 쿨다운 설정
      this.setCooldown(cooldownKey)

      return {
        success: true,
        inviteId: result.inviteId,
        message: '초대 이메일이 성공적으로 발송되었습니다.',
        canRetryAt: new Date(Date.now() + this.COOLDOWN_SECONDS * 1000)
      }

    } catch (error) {
      console.error('Invitation send error:', error)
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          message: error.errors[0].message
        }
      }

      return {
        success: false,
        message: '초대 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      }
    }
  }

  /**
   * 초대 수락 처리
   */
  async acceptInvitation(data: AcceptInviteRequest): Promise<InviteResponse> {
    try {
      // 1. 입력 검증
      const validatedData = AcceptInviteSchema.parse(data)
      
      // 2. 토큰 유효성 검사
      const tokenInfo = await this.validateInviteToken(validatedData.token)
      if (!tokenInfo.isValid) {
        return {
          success: false,
          message: '유효하지 않거나 만료된 초대 링크입니다.'
        }
      }

      // 3. API 호출
      const response = await fetch(`${this.API_BASE_URL}/api/email/accept-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: validatedData.token,
          ...validatedData.userInfo
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: '서버 오류가 발생했습니다' }))
        return {
          success: false,
          message: errorData.message || '초대 수락에 실패했습니다'
        }
      }

      return {
        success: true,
        message: `${tokenInfo.projectName} 프로젝트에 성공적으로 참여했습니다.`
      }

    } catch (error) {
      console.error('Invitation accept error:', error)
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          message: error.errors[0].message
        }
      }

      return {
        success: false,
        message: '초대 수락 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
      }
    }
  }

  /**
   * 초대 취소
   */
  async revokeInvitation(inviteId: string): Promise<InviteResponse> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/email/revoke-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteId })
      })

      if (!response.ok) {
        return {
          success: false,
          message: '초대 취소에 실패했습니다'
        }
      }

      return {
        success: true,
        message: '초대가 성공적으로 취소되었습니다.'
      }

    } catch (error) {
      console.error('Invitation revoke error:', error)
      return {
        success: false,
        message: '초대 취소 중 오류가 발생했습니다.'
      }
    }
  }

  /**
   * 초대 토큰 유효성 검사
   */
  async validateInviteToken(token: string): Promise<InviteTokenInfo> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/email/validate-invite?token=${encodeURIComponent(token)}`)
      
      if (!response.ok) {
        return {
          token,
          email: '',
          role: '',
          projectId: '',
          projectName: '',
          inviterName: '',
          expiresAt: new Date(),
          isValid: false
        }
      }

      const data = await response.json()
      return {
        token,
        email: data.email,
        role: data.role,
        projectId: data.projectId,
        projectName: data.projectName,
        inviterName: data.inviterName,
        expiresAt: new Date(data.expiresAt),
        isValid: true
      }

    } catch (error) {
      console.error('Token validation error:', error)
      return {
        token,
        email: '',
        role: '',
        projectId: '',
        projectName: '',
        inviterName: '',
        expiresAt: new Date(),
        isValid: false
      }
    }
  }

  /**
   * 쿨다운 정보 조회
   */
  getCooldownInfo(key: string): InviteCooldownInfo {
    const cooldownUntil = cooldownStore.get(key)
    
    if (!cooldownUntil) {
      return {
        isActive: false,
        remainingSeconds: 0,
        canRetryAt: new Date()
      }
    }

    const now = Date.now()
    const remainingMs = cooldownUntil.getTime() - now

    if (remainingMs <= 0) {
      cooldownStore.delete(key)
      return {
        isActive: false,
        remainingSeconds: 0,
        canRetryAt: new Date()
      }
    }

    return {
      isActive: true,
      remainingSeconds: Math.ceil(remainingMs / 1000),
      canRetryAt: cooldownUntil
    }
  }

  /**
   * 쿨다운 설정
   */
  private setCooldown(key: string): void {
    const cooldownUntil = new Date(Date.now() + this.COOLDOWN_SECONDS * 1000)
    cooldownStore.set(key, cooldownUntil)
  }

  /**
   * 권한 검증
   */
  validatePermission(userRole: string, targetRole: string): boolean {
    const roleHierarchy = {
      'admin': 4,
      'manager': 3,
      'editor': 2,
      'viewer': 1
    }

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
    const targetLevel = roleHierarchy[targetRole as keyof typeof roleHierarchy] || 0

    // 자신과 같거나 낮은 등급만 초대 가능
    return userLevel >= targetLevel
  }

  /**
   * 초대 가능한 역할 목록 조회
   */
  getAvailableRoles(userRole: string): Array<{value: string, label: string, description: string}> {
    const allRoles = [
      { value: 'admin', label: '관리자', description: '모든 권한을 가진 관리자' },
      { value: 'manager', label: '매니저', description: '프로젝트 관리 및 팀원 관리' },
      { value: 'editor', label: '에디터', description: '콘텐츠 편집 및 수정 권한' },
      { value: 'viewer', label: '뷰어', description: '읽기 전용 권한' }
    ]

    return allRoles.filter(role => this.validatePermission(userRole, role.value))
  }

  /**
   * 쿨다운 스토어 정리 (메모리 누수 방지)
   */
  clearExpiredCooldowns(): void {
    const now = Date.now()
    for (const [key, expiredAt] of cooldownStore.entries()) {
      if (expiredAt.getTime() <= now) {
        cooldownStore.delete(key)
      }
    }
  }
}

// 싱글톤 인스턴스 생성
export const invitationService = new InvitationService()

// 주기적으로 만료된 쿨다운 정리 (10분마다)
if (typeof window !== 'undefined') {
  setInterval(() => {
    invitationService.clearExpiredCooldowns()
  }, 10 * 60 * 1000)
}