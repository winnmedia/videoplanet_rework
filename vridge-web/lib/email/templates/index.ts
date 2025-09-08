/**
 * HTML 이메일 템플릿 통합 유틸리티
 * VideoPlaNet 브랜드 통합, 이메일 클라이언트 호환성 보장
 * @layer shared/lib
 */

// 템플릿 생성 함수들 import
import {
  generateSignupVerificationTemplate,
  generateSignupVerificationTextTemplate,
  type SignupVerificationData
} from './signup-verification.html'

import {
  generatePasswordResetTemplate,
  generatePasswordResetTextTemplate,
  type PasswordResetData
} from './password-reset.html'

import {
  generateTeamInviteTemplate,
  generateTeamInviteTextTemplate,
  type TeamInviteData
} from './team-invite.html'

// 공통 타입 정의
export interface EmailTemplateResult {
  subject: string
  htmlContent: string
  plainTextContent: string
}

/**
 * 회원가입 인증 이메일 템플릿 생성
 */
export function createSignupVerificationEmail(data: SignupVerificationData): EmailTemplateResult {
  const subject = `[VideoPlaNet] 이메일 인증 - 회원가입을 완료해 주세요`
  
  return {
    subject,
    htmlContent: generateSignupVerificationTemplate(data),
    plainTextContent: generateSignupVerificationTextTemplate(data)
  }
}

/**
 * 비밀번호 재설정 이메일 템플릿 생성
 */
export function createPasswordResetEmail(data: PasswordResetData): EmailTemplateResult {
  const subject = `[VideoPlaNet] 비밀번호 재설정 - 보안 인증번호`
  
  return {
    subject,
    htmlContent: generatePasswordResetTemplate(data),
    plainTextContent: generatePasswordResetTextTemplate(data)
  }
}

/**
 * 팀 초대 이메일 템플릿 생성
 */
export function createTeamInviteEmail(data: TeamInviteData): EmailTemplateResult {
  const roleNames: Record<string, string> = {
    admin: '관리자',
    editor: '편집자',
    reviewer: '리뷰어',
    viewer: '뷰어'
  }
  
  const roleDisplayName = roleNames[data.role] || data.role
  const subject = `[VideoPlaNet] ${data.inviterName}님이 "${data.projectTitle}" 프로젝트에 ${roleDisplayName}로 초대했습니다`
  
  return {
    subject,
    htmlContent: generateTeamInviteTemplate(data),
    plainTextContent: generateTeamInviteTextTemplate(data)
  }
}

/**
 * 이메일 템플릿 유형별 생성 함수
 */
export const EmailTemplates = {
  signupVerification: createSignupVerificationEmail,
  passwordReset: createPasswordResetEmail,
  teamInvite: createTeamInviteEmail
} as const

/**
 * 이메일 미리보기 생성 (개발/테스트용)
 */
export function generateEmailPreview(
  type: keyof typeof EmailTemplates,
  data: any
): string {
  const template = EmailTemplates[type](data)
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>이메일 미리보기: ${template.subject}</title>
  <style>
    body { margin: 0; padding: 20px; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
    .preview-header { background: #1f2937; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .preview-content { background: white; border-radius: 0 0 8px 8px; }
    .preview-info { padding: 20px; border-bottom: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
    .preview-text { padding: 20px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <div style="max-width: 800px; margin: 0 auto;">
    <div class="preview-header">
      <h1 style="margin: 0; font-size: 18px;">📧 이메일 미리보기</h1>
    </div>
    <div class="preview-content">
      <div class="preview-info">
        <strong>제목:</strong> ${template.subject}<br>
        <strong>템플릿:</strong> ${type}<br>
        <strong>생성일:</strong> ${new Date().toLocaleString('ko-KR')}
      </div>
      ${template.htmlContent}
      <div class="preview-text">
        <strong>텍스트 버전:</strong><br><br>${template.plainTextContent}
      </div>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * 이메일 유효성 검사 (개발용)
 */
export function validateEmailTemplate(template: EmailTemplateResult): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  // 제목 검사
  if (!template.subject || template.subject.trim().length === 0) {
    errors.push('이메일 제목이 비어있습니다')
  } else if (template.subject.length > 78) {
    warnings.push('이메일 제목이 너무 깁니다 (78자 초과)')
  }

  // HTML 콘텐츠 검사
  if (!template.htmlContent || template.htmlContent.trim().length === 0) {
    errors.push('HTML 콘텐츠가 비어있습니다')
  } else {
    // DOCTYPE 검사
    if (!template.htmlContent.includes('<!DOCTYPE html>')) {
      warnings.push('DOCTYPE이 누락되었습니다')
    }
    
    // lang 속성 검사
    if (!template.htmlContent.includes('lang="ko"')) {
      warnings.push('HTML lang 속성이 누락되었습니다')
    }
    
    // 반응형 meta 태그 검사
    if (!template.htmlContent.includes('viewport')) {
      warnings.push('반응형 viewport meta 태그가 누락되었습니다')
    }
    
    // alt 속성이 없는 이미지 검사
    const imgTags = template.htmlContent.match(/<img[^>]*>/g) || []
    imgTags.forEach((img, index) => {
      if (!img.includes('alt=')) {
        warnings.push(`이미지 태그 ${index + 1}에 alt 속성이 누락되었습니다`)
      }
    })
  }

  // 텍스트 콘텐츠 검사
  if (!template.plainTextContent || template.plainTextContent.trim().length === 0) {
    errors.push('텍스트 콘텐츠가 비어있습니다')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// 타입 재export
export type {
  SignupVerificationData,
  PasswordResetData,
  TeamInviteData
}