/**
 * Base HTML Email Template for VideoPlaNet
 * 반응형 이메일 디자인, 접근성, 이메일 클라이언트 호환성 우선
 * @layer shared/lib
 */

export interface BaseTemplateData {
  title: string
  previewText: string
  content: string
  logoUrl?: string
  baseUrl?: string
}

/**
 * VideoPlaNet 브랜드 색상 (이메일 호환성을 위해 헥스 코드 사용)
 */
const BRAND_COLORS = {
  primary: '#4F46E5', // indigo-600
  secondary: '#7C3AED', // violet-600
  accent: '#06B6D4', // cyan-500
  success: '#10B981', // emerald-500
  warning: '#F59E0B', // amber-500
  danger: '#EF4444', // red-500
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827'
  },
  text: {
    primary: '#1F2937',
    secondary: '#4B5563',
    muted: '#6B7280'
  }
} as const

/**
 * 기본 이메일 클라이언트 호환 스타일
 */
const BASE_STYLES = `
  /* 전역 스타일 재설정 - 이메일 클라이언트 호환성 */
  body, table, td, p, div, span {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif !important;
    -webkit-text-size-adjust: 100%;
    -ms-text-size-adjust: 100%;
  }
  
  /* 기본 스타일 */
  body {
    margin: 0 !important;
    padding: 0 !important;
    background-color: ${BRAND_COLORS.gray[50]} !important;
    font-size: 16px;
    line-height: 1.6;
    color: ${BRAND_COLORS.text.primary};
  }
  
  table {
    border-collapse: collapse !important;
    border-spacing: 0 !important;
  }
  
  img {
    border: 0;
    outline: none;
    text-decoration: none;
    display: block;
    max-width: 100%;
    height: auto;
  }
  
  /* 링크 스타일 */
  a {
    color: ${BRAND_COLORS.primary};
    text-decoration: none;
  }
  
  a:hover {
    text-decoration: underline;
  }
  
  /* 버튼 스타일 */
  .btn-primary {
    background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%);
    color: #ffffff !important;
    text-decoration: none !important;
    padding: 16px 32px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 16px;
    display: inline-block;
    text-align: center;
    border: none;
    box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.3);
    transition: all 0.2s ease;
  }
  
  .btn-primary:hover {
    box-shadow: 0 6px 20px 0 rgba(79, 70, 229, 0.4);
    transform: translateY(-1px);
    text-decoration: none !important;
  }
  
  .btn-secondary {
    background-color: ${BRAND_COLORS.gray[100]};
    color: ${BRAND_COLORS.text.primary} !important;
    text-decoration: none !important;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
    display: inline-block;
    text-align: center;
    border: 1px solid ${BRAND_COLORS.gray[200]};
  }
  
  /* 반응형 스타일 */
  @media only screen and (max-width: 600px) {
    .container {
      width: 100% !important;
      padding: 0 16px !important;
    }
    
    .content-wrapper {
      padding: 20px !important;
    }
    
    .btn-primary, .btn-secondary {
      width: 100% !important;
      padding: 16px !important;
      font-size: 16px !important;
    }
    
    .logo {
      width: 150px !important;
      height: auto !important;
    }
    
    h1 {
      font-size: 28px !important;
      line-height: 1.3 !important;
    }
    
    h2 {
      font-size: 24px !important;
      line-height: 1.3 !important;
    }
    
    .verification-code {
      font-size: 32px !important;
      padding: 20px !important;
    }
  }
  
  /* 다크 모드 지원 */
  @media (prefers-color-scheme: dark) {
    .dark-mode-bg {
      background-color: ${BRAND_COLORS.gray[800]} !important;
    }
    
    .dark-mode-text {
      color: ${BRAND_COLORS.gray[100]} !important;
    }
  }
`

/**
 * 기본 HTML 이메일 템플릿 생성 함수
 */
export function generateBaseTemplate(data: BaseTemplateData): string {
  const {
    title,
    previewText,
    content,
    logoUrl = '',
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
  } = data

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no">
  <meta name="format-detection" content="date=no">
  <meta name="format-detection" content="address=no">
  <meta name="format-detection" content="email=no">
  <title>${title}</title>
  
  <!-- 이메일 미리보기 텍스트 -->
  <div style="display: none; max-height: 0; overflow: hidden; font-size: 1px; line-height: 1px; color: transparent;">
    ${previewText}
  </div>
  
  <style>
    ${BASE_STYLES}
  </style>
</head>
<body>
  <!-- 메인 컨테이너 -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: ${BRAND_COLORS.gray[50]};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- 이메일 콘텐츠 래퍼 -->
        <table role="presentation" class="container" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); overflow: hidden;">
          
          <!-- 헤더 -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%); padding: 40px 40px 30px 40px; text-align: center;">
              <!-- 로고 -->
              ${logoUrl ? `
                <img src="${logoUrl}" alt="VideoPlaNet" class="logo" style="width: 200px; height: auto; margin-bottom: 20px;" />
              ` : `
                <div style="color: #ffffff; font-size: 32px; font-weight: 700; margin-bottom: 20px; letter-spacing: -0.5px;">
                  🎬 VideoPlaNet
                </div>
              `}
              
              <!-- 제목 -->
              <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0; line-height: 1.2;">
                ${title}
              </h1>
            </td>
          </tr>
          
          <!-- 메인 콘텐츠 -->
          <tr>
            <td class="content-wrapper" style="padding: 40px;">
              ${content}
            </td>
          </tr>
          
          <!-- 푸터 -->
          <tr>
            <td style="background-color: ${BRAND_COLORS.gray[800]}; padding: 30px 40px; text-align: center;">
              
              <!-- 푸터 링크 -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center; padding-bottom: 20px;">
                    <a href="${baseUrl}" style="color: ${BRAND_COLORS.accent}; font-size: 14px; margin: 0 15px;">홈페이지</a>
                    <span style="color: ${BRAND_COLORS.gray[600]}; font-size: 14px;">|</span>
                    <a href="mailto:support@videoplanet.kr" style="color: ${BRAND_COLORS.accent}; font-size: 14px; margin: 0 15px;">고객지원</a>
                    <span style="color: ${BRAND_COLORS.gray[600]}; font-size: 14px;">|</span>
                    <a href="${baseUrl}/privacy" style="color: ${BRAND_COLORS.accent}; font-size: 14px; margin: 0 15px;">개인정보처리방침</a>
                  </td>
                </tr>
              </table>
              
              <!-- 구분선 -->
              <div style="height: 1px; background-color: ${BRAND_COLORS.gray[600]}; margin: 20px 0;"></div>
              
              <!-- 저작권 정보 -->
              <p style="color: ${BRAND_COLORS.gray[300]}; font-size: 12px; margin: 0; line-height: 1.5;">
                © 2025 VideoPlaNet. 모든 권리 보유.<br>
                이 이메일은 자동으로 발송되었습니다. 회신하지 마세요.
              </p>
              
              <!-- 수신거부 링크 -->
              <p style="color: ${BRAND_COLORS.gray[300]}; font-size: 11px; margin: 10px 0 0 0;">
                <a href="${baseUrl}/unsubscribe" style="color: ${BRAND_COLORS.gray[300]}; text-decoration: underline;">
                  이메일 수신거부
                </a>
              </p>
              
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * 접근성을 고려한 정보 박스 컴포넌트
 */
export function createInfoBox(title: string, content: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info'): string {
  const colors = {
    info: { bg: BRAND_COLORS.gray[50], border: BRAND_COLORS.primary, text: BRAND_COLORS.text.primary },
    success: { bg: '#F0FDF4', border: BRAND_COLORS.success, text: '#065F46' },
    warning: { bg: '#FFFBEB', border: BRAND_COLORS.warning, text: '#92400E' },
    danger: { bg: '#FEF2F2', border: BRAND_COLORS.danger, text: '#991B1B' }
  }
  
  const color = colors[type]
  
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
      <tr>
        <td style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; border-radius: 8px; padding: 20px;">
          <h3 style="color: ${color.text}; font-size: 16px; font-weight: 600; margin: 0 0 10px 0; line-height: 1.4;">
            ${title}
          </h3>
          <p style="color: ${color.text}; font-size: 14px; margin: 0; line-height: 1.5;">
            ${content}
          </p>
        </td>
      </tr>
    </table>
  `
}

/**
 * 인증 코드 표시 컴포넌트
 */
export function createVerificationCode(code: string, expiryMinutes: number = 10): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
      <tr>
        <td style="text-align: center;">
          <div style="background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%); color: #ffffff; font-size: 36px; font-weight: 700; padding: 30px 20px; border-radius: 12px; letter-spacing: 8px; text-align: center; box-shadow: 0 8px 25px -5px rgba(79, 70, 229, 0.4); font-family: 'Courier New', monospace;">
            ${code}
          </div>
          <p style="color: ${BRAND_COLORS.danger}; font-size: 14px; font-weight: 500; margin: 15px 0 0 0;">
            ⏰ ${expiryMinutes}분 후 만료
          </p>
        </td>
      </tr>
    </table>
  `
}

/**
 * 보안 안내 컴포넌트
 */
export function createSecurityNotice(): string {
  return createInfoBox(
    '🔒 보안 안내',
    '본인이 요청하지 않은 경우, 이 이메일을 무시하시고 <a href="mailto:security@videoplanet.kr" style="color: #DC2626; font-weight: 600;">security@videoplanet.kr</a>로 신고해 주세요.',
    'danger'
  )
}