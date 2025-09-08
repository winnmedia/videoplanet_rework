/**
 * 회원가입 인증 이메일 HTML 템플릿
 * VideoPlaNet 브랜딩, 반응형 디자인, 접근성 고려
 * @layer shared/lib
 */

import { 
  generateBaseTemplate, 
  createVerificationCode, 
  createInfoBox, 
  createSecurityNotice,
  type BaseTemplateData 
} from './base-template.html'

export interface SignupVerificationData {
  userEmail: string
  verificationCode: string
  userName?: string
  expiryMinutes?: number
  baseUrl?: string
}

/**
 * 회원가입 인증 이메일 HTML 생성
 */
export function generateSignupVerificationTemplate(data: SignupVerificationData): string {
  const {
    userEmail,
    verificationCode,
    userName = userEmail,
    expiryMinutes = 10,
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
  } = data

  // 메인 콘텐츠 구성
  const content = `
    <!-- 환영 메시지 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="text-align: center; margin-bottom: 30px;">
      <tr>
        <td>
          <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #ffffff; font-size: 48px; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 8px 25px -5px rgba(16, 185, 129, 0.4);">
            🎉
          </div>
          
          <h2 style="color: #1F2937; font-size: 28px; font-weight: 700; margin: 0 0 15px 0; line-height: 1.3;">
            환영합니다!
          </h2>
          
          <p style="color: #4B5563; font-size: 18px; margin: 0 0 10px 0; line-height: 1.6;">
            <strong style="color: #4F46E5;">${userName}</strong>님
          </p>
          
          <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.6;">
            VideoPlaNet에서 혁신적인 비디오 협업을 시작하세요
          </p>
        </td>
      </tr>
    </table>

    <!-- 플랫폼 소개 -->
    ${createInfoBox(
      '🎬 VideoPlaNet이란?',
      'AI 기반 비디오 피드백과 실시간 협업을 통해 창작자들이 더 효율적으로 작업할 수 있도록 돕는 혁신적인 플랫폼입니다.',
      'info'
    )}

    <!-- 인증 코드 섹션 -->
    <div style="text-align: center; margin: 40px 0;">
      <h3 style="color: #1F2937; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        아래 인증번호로 회원가입을 완료해 주세요
      </h3>
      
      ${createVerificationCode(verificationCode, expiryMinutes)}
    </div>

    <!-- 주요 기능 소개 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%); border-radius: 12px; padding: 30px; margin: 30px 0;">
      <tr>
        <td>
          <h3 style="color: #1F2937; font-size: 18px; font-weight: 600; margin: 0 0 20px 0; text-align: center;">
            ✨ VideoPlaNet 주요 기능
          </h3>
          
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding: 10px 0; vertical-align: top;" width="50%">
                <div style="padding-right: 15px;">
                  <div style="color: #4F46E5; font-size: 24px; margin-bottom: 8px;">🎯</div>
                  <h4 style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">정확한 피드백</h4>
                  <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">타임코드별 정밀한 의견 공유</p>
                </div>
              </td>
              <td style="padding: 10px 0; vertical-align: top;" width="50%">
                <div style="padding-left: 15px;">
                  <div style="color: #7C3AED; font-size: 24px; margin-bottom: 8px;">🤝</div>
                  <h4 style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">실시간 협업</h4>
                  <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">팀원과 즉시 소통하며 작업</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top;" width="50%">
                <div style="padding-right: 15px;">
                  <div style="color: #06B6D4; font-size: 24px; margin-bottom: 8px;">🤖</div>
                  <h4 style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">AI 분석</h4>
                  <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">스마트한 인사이트 제공</p>
                </div>
              </td>
              <td style="padding: 10px 0; vertical-align: top;" width="50%">
                <div style="padding-left: 15px;">
                  <div style="color: #10B981; font-size: 24px; margin-bottom: 8px;">📊</div>
                  <h4 style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">프로젝트 관리</h4>
                  <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">체계적인 버전 컨트롤</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- 인증 완료 버튼 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="text-align: center; margin: 40px 0;">
      <tr>
        <td>
          <a href="${baseUrl}/auth/verify?email=${encodeURIComponent(userEmail)}" class="btn-primary" style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff !important; text-decoration: none !important; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; text-align: center; border: none; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.3);">
            🚀 지금 인증하고 시작하기
          </a>
          
          <p style="color: #6B7280; font-size: 14px; margin: 20px 0 0 0; line-height: 1.5;">
            버튼이 작동하지 않나요? 
            <a href="${baseUrl}/auth/verify?email=${encodeURIComponent(userEmail)}" style="color: #4F46E5; text-decoration: underline;">
              여기를 클릭하세요
            </a>
          </p>
        </td>
      </tr>
    </table>

    <!-- 인증 절차 안내 -->
    ${createInfoBox(
      '📋 인증 절차',
      '1. 위의 6자리 인증번호를 복사하세요<br>2. "지금 인증하고 시작하기" 버튼을 클릭하세요<br>3. 인증번호를 입력하여 회원가입을 완료하세요',
      'info'
    )}

    <!-- 보안 안내 -->
    ${createSecurityNotice()}

    <!-- 고객 지원 안내 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
      <tr>
        <td>
          <h4 style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">
            💬 도움이 필요하신가요?
          </h4>
          <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
            언제든지 <a href="mailto:support@videoplanet.kr" style="color: #4F46E5; font-weight: 600;">support@videoplanet.kr</a>로 문의해 주세요.<br>
            빠르게 도움을 드리겠습니다!
          </p>
        </td>
      </tr>
    </table>
  `

  // 베이스 템플릿 데이터 구성
  const templateData: BaseTemplateData = {
    title: '이메일 인증',
    previewText: `VideoPlaNet 회원가입을 위한 인증번호: ${verificationCode}`,
    content,
    baseUrl
  }

  return generateBaseTemplate(templateData)
}

/**
 * 텍스트 버전 생성 (fallback용)
 */
export function generateSignupVerificationTextTemplate(data: SignupVerificationData): string {
  const {
    userEmail,
    verificationCode,
    userName = userEmail,
    expiryMinutes = 10,
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
  } = data

  return `
VideoPlaNet 회원가입 인증

안녕하세요 ${userName}님!

VideoPlaNet에 가입해 주셔서 감사합니다.
혁신적인 비디오 협업 플랫폼에서 새로운 창작 경험을 시작하세요.

인증번호: ${verificationCode}
만료시간: ${expiryMinutes}분

인증 완료: ${baseUrl}/auth/verify?email=${encodeURIComponent(userEmail)}

VideoPlaNet 주요 기능:
• 타임코드별 정확한 비디오 피드백
• 실시간 팀 협업
• AI 기반 스마트 분석
• 체계적인 프로젝트 관리

도움이 필요하시면 support@videoplanet.kr로 문의해 주세요.

본인이 요청하지 않은 경우, 이 이메일을 무시하고 security@videoplanet.kr로 신고해 주세요.

© 2025 VideoPlaNet. 모든 권리 보유.
  `.trim()
}