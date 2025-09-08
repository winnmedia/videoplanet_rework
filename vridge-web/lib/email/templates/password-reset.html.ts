/**
 * 비밀번호 재설정 이메일 HTML 템플릿
 * VideoPlaNet 브랜딩, 보안 중심 디자인, 접근성 고려
 * @layer shared/lib
 */

import { 
  generateBaseTemplate, 
  createVerificationCode, 
  createInfoBox, 
  createSecurityNotice,
  type BaseTemplateData 
} from './base-template.html'

export interface PasswordResetData {
  userEmail: string
  resetCode: string
  userName?: string
  expiryMinutes?: number
  baseUrl?: string
}

/**
 * 비밀번호 재설정 이메일 HTML 생성
 */
export function generatePasswordResetTemplate(data: PasswordResetData): string {
  const {
    userEmail,
    resetCode,
    userName = userEmail,
    expiryMinutes = 10,
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
  } = data

  // 메인 콘텐츠 구성
  const content = `
    <!-- 보안 알림 아이콘 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="text-align: center; margin-bottom: 30px;">
      <tr>
        <td>
          <div style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: #ffffff; font-size: 48px; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 8px 25px -5px rgba(239, 68, 68, 0.4);">
            🔐
          </div>
          
          <h2 style="color: #1F2937; font-size: 28px; font-weight: 700; margin: 0 0 15px 0; line-height: 1.3;">
            비밀번호 재설정 요청
          </h2>
          
          <p style="color: #4B5563; font-size: 18px; margin: 0 0 10px 0; line-height: 1.6;">
            <strong style="color: #EF4444;">${userName}</strong>님
          </p>
          
          <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.6;">
            계정의 비밀번호 재설정을 요청하셨습니다
          </p>
        </td>
      </tr>
    </table>

    <!-- 중요 보안 경고 -->
    ${createInfoBox(
      '⚠️ 중요한 보안 안내',
      '<strong style="color: #DC2626;">본인이 요청하지 않았다면</strong> 즉시 다음 조치를 취해주세요:<br>1. 이 이메일을 무시하세요<br>2. <a href="mailto:security@videoplanet.kr" style="color: #DC2626; font-weight: 600;">security@videoplanet.kr</a>으로 신고하세요<br>3. 계정 보안을 위해 비밀번호를 변경하세요',
      'danger'
    )}

    <!-- 인증 코드 섹션 -->
    <div style="text-align: center; margin: 40px 0;">
      <h3 style="color: #1F2937; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">
        보안 인증번호
      </h3>
      
      <p style="color: #6B7280; font-size: 16px; margin: 0 0 20px 0; line-height: 1.6;">
        아래 인증번호를 사용하여 새로운 비밀번호를 설정하세요
      </p>
      
      ${createVerificationCode(resetCode, expiryMinutes)}
    </div>

    <!-- 재설정 절차 안내 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); border: 2px solid #FECACA; border-radius: 12px; padding: 30px; margin: 30px 0;">
      <tr>
        <td>
          <h3 style="color: #991B1B; font-size: 18px; font-weight: 600; margin: 0 0 20px 0; text-align: center;">
            🔒 비밀번호 재설정 절차
          </h3>
          
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding: 10px 0; vertical-align: top;">
                <div style="display: flex; align-items: flex-start; text-align: left;">
                  <div style="background-color: #EF4444; color: #ffffff; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; margin-right: 15px; flex-shrink: 0;">
                    1
                  </div>
                  <div>
                    <h4 style="color: #991B1B; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">인증번호 복사</h4>
                    <p style="color: #7F1D1D; font-size: 14px; margin: 0; line-height: 1.5;">위의 6자리 인증번호를 정확히 복사하세요</p>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top;">
                <div style="display: flex; align-items: flex-start; text-align: left;">
                  <div style="background-color: #EF4444; color: #ffffff; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; margin-right: 15px; flex-shrink: 0;">
                    2
                  </div>
                  <div>
                    <h4 style="color: #991B1B; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">재설정 페이지 이동</h4>
                    <p style="color: #7F1D1D; font-size: 14px; margin: 0; line-height: 1.5;">아래 버튼을 클릭하여 비밀번호 재설정 페이지로 이동하세요</p>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top;">
                <div style="display: flex; align-items: flex-start; text-align: left;">
                  <div style="background-color: #EF4444; color: #ffffff; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; margin-right: 15px; flex-shrink: 0;">
                    3
                  </div>
                  <div>
                    <h4 style="color: #991B1B; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">새 비밀번호 설정</h4>
                    <p style="color: #7F1D1D; font-size: 14px; margin: 0; line-height: 1.5;">인증번호 입력 후 안전한 새 비밀번호를 설정하세요 (8자 이상 권장)</p>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- 재설정 버튼 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="text-align: center; margin: 40px 0;">
      <tr>
        <td>
          <a href="${baseUrl}/auth/reset-password?email=${encodeURIComponent(userEmail)}" style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); color: #ffffff !important; text-decoration: none !important; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; display: inline-block; text-align: center; border: none; box-shadow: 0 4px 14px 0 rgba(239, 68, 68, 0.3);">
            🔐 지금 비밀번호 재설정하기
          </a>
          
          <p style="color: #6B7280; font-size: 14px; margin: 20px 0 0 0; line-height: 1.5;">
            버튼이 작동하지 않나요? 
            <a href="${baseUrl}/auth/reset-password?email=${encodeURIComponent(userEmail)}" style="color: #EF4444; text-decoration: underline;">
              여기를 클릭하세요
            </a>
          </p>
        </td>
      </tr>
    </table>

    <!-- 비밀번호 보안 가이드 -->
    ${createInfoBox(
      '💡 안전한 비밀번호 가이드',
      '• 8자 이상 사용하세요<br>• 대소문자, 숫자, 특수문자를 조합하세요<br>• 개인정보(이름, 생년월일 등)는 피하세요<br>• 다른 사이트와 다른 비밀번호를 사용하세요<br>• 정기적으로 변경하세요',
      'info'
    )}

    <!-- 계정 보호 팁 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border-left: 4px solid #F59E0B; border-radius: 8px; padding: 25px; margin: 30px 0;">
      <tr>
        <td>
          <h4 style="color: #92400E; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
            🛡️ 계정 보안 강화 팁
          </h4>
          <ul style="color: #78350F; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.6;">
            <li>2단계 인증(2FA)을 활성화하세요</li>
            <li>공용 컴퓨터에서는 로그인을 피하세요</li>
            <li>정기적으로 로그인 활동을 확인하세요</li>
            <li>의심스러운 활동 발견 시 즉시 신고하세요</li>
          </ul>
        </td>
      </tr>
    </table>

    <!-- 추가 보안 안내 -->
    ${createSecurityNotice()}

    <!-- 고객 지원 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
      <tr>
        <td>
          <h4 style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">
            🆘 긴급 지원이 필요하신가요?
          </h4>
          <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
            계정 보안 문제나 의심스러운 활동이 있으시면<br>
            <a href="mailto:security@videoplanet.kr" style="color: #EF4444; font-weight: 600;">security@videoplanet.kr</a>로 즉시 연락하세요.
          </p>
        </td>
      </tr>
    </table>

    <!-- 요청하지 않은 경우 안내 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); border: 2px solid #F87171; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
      <tr>
        <td>
          <div style="color: #EF4444; font-size: 32px; margin-bottom: 15px;">🚨</div>
          <h4 style="color: #991B1B; font-size: 16px; font-weight: 700; margin: 0 0 10px 0;">
            이 요청을 하지 않으셨나요?
          </h4>
          <p style="color: #7F1D1D; font-size: 14px; margin: 0; line-height: 1.5;">
            <strong>누군가 당신의 계정에 무단 접근을 시도할 수 있습니다.</strong><br>
            즉시 <a href="mailto:security@videoplanet.kr" style="color: #991B1B; font-weight: 600; text-decoration: underline;">security@videoplanet.kr</a>로 신고하시고<br>
            로그인하여 비밀번호를 변경해 주세요.
          </p>
        </td>
      </tr>
    </table>
  `

  // 베이스 템플릿 데이터 구성
  const templateData: BaseTemplateData = {
    title: '비밀번호 재설정',
    previewText: `VideoPlaNet 비밀번호 재설정 인증번호: ${resetCode}`,
    content,
    baseUrl
  }

  return generateBaseTemplate(templateData)
}

/**
 * 텍스트 버전 생성 (fallback용)
 */
export function generatePasswordResetTextTemplate(data: PasswordResetData): string {
  const {
    userEmail,
    resetCode,
    userName = userEmail,
    expiryMinutes = 10,
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
  } = data

  return `
VideoPlaNet 비밀번호 재설정

안녕하세요 ${userName}님,

계정의 비밀번호 재설정을 요청하셨습니다.

⚠️ 중요한 보안 안내
본인이 요청하지 않았다면 즉시 다음 조치를 취해주세요:
1. 이 이메일을 무시하세요
2. security@videoplanet.kr로 신고하세요
3. 계정 보안을 위해 비밀번호를 변경하세요

보안 인증번호: ${resetCode}
만료시간: ${expiryMinutes}분

비밀번호 재설정: ${baseUrl}/auth/reset-password?email=${encodeURIComponent(userEmail)}

재설정 절차:
1. 위의 6자리 인증번호를 복사하세요
2. 재설정 페이지에서 인증번호를 입력하세요
3. 새로운 비밀번호를 설정하세요 (8자 이상 권장)

안전한 비밀번호 가이드:
• 8자 이상 사용하세요
• 대소문자, 숫자, 특수문자를 조합하세요
• 개인정보(이름, 생년월일 등)는 피하세요
• 다른 사이트와 다른 비밀번호를 사용하세요

계정 보안 문제가 있으시면 security@videoplanet.kr로 연락하세요.

© 2025 VideoPlaNet. 모든 권리 보유.
  `.trim()
}