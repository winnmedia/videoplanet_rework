/**
 * 팀 초대 이메일 HTML 템플릿
 * VideoPlaNet 브랜딩, 협업 중심 디자인, 접근성 고려
 * @layer shared/lib
 */

import { 
  generateBaseTemplate, 
  createInfoBox, 
  createSecurityNotice,
  type BaseTemplateData 
} from './base-template.html'

export interface TeamInviteData {
  recipientEmail: string
  recipientName?: string
  inviterName: string
  projectTitle: string
  role: 'admin' | 'editor' | 'reviewer' | 'viewer'
  message?: string
  inviteToken: string
  projectId: string
  expiresAt: string
  baseUrl?: string
}

/**
 * 역할 이름 한국어 변환
 */
function getRoleDisplayName(role: string): string {
  const roleNames: Record<string, string> = {
    admin: '관리자',
    editor: '편집자',
    reviewer: '리뷰어',
    viewer: '뷰어'
  }
  return roleNames[role] || role
}

/**
 * 역할별 색상 반환
 */
function getRoleColor(role: string): { bg: string; text: string; border: string } {
  const roleColors: Record<string, { bg: string; text: string; border: string }> = {
    admin: { bg: '#FEF2F2', text: '#991B1B', border: '#EF4444' },
    editor: { bg: '#F0F9FF', text: '#1E40AF', border: '#3B82F6' },
    reviewer: { bg: '#F0FDF4', text: '#166534', border: '#10B981' },
    viewer: { bg: '#FFFBEB', text: '#92400E', border: '#F59E0B' }
  }
  return roleColors[role] || roleColors.viewer
}

/**
 * 팀 초대 이메일 HTML 생성
 */
export function generateTeamInviteTemplate(data: TeamInviteData): string {
  const {
    recipientEmail,
    recipientName = recipientEmail,
    inviterName,
    projectTitle,
    role,
    message,
    inviteToken,
    projectId,
    expiresAt,
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
  } = data

  const roleDisplayName = getRoleDisplayName(role)
  const roleColor = getRoleColor(role)
  const inviteUrl = `${baseUrl}/invite/accept?token=${inviteToken}&project=${projectId}`
  const expiresDate = new Date(expiresAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // 메인 콘텐츠 구성
  const content = `
    <!-- 초대 아이콘 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="text-align: center; margin-bottom: 30px;">
      <tr>
        <td>
          <div style="background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%); color: #ffffff; font-size: 48px; width: 80px; height: 80px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 8px 25px -5px rgba(16, 185, 129, 0.4);">
            👥
          </div>
          
          <h2 style="color: #1F2937; font-size: 28px; font-weight: 700; margin: 0 0 15px 0; line-height: 1.3;">
            프로젝트 협업 초대
          </h2>
          
          <p style="color: #4B5563; font-size: 18px; margin: 0 0 10px 0; line-height: 1.6;">
            <strong style="color: #4F46E5;">${inviterName}</strong>님이 회원님을
          </p>
          
          <p style="color: #6B7280; font-size: 16px; margin: 0; line-height: 1.6;">
            VideoPlaNet 프로젝트에 초대했습니다
          </p>
        </td>
      </tr>
    </table>

    <!-- 프로젝트 정보 카드 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%); border-radius: 16px; padding: 30px; margin: 30px 0; box-shadow: 0 4px 14px -2px rgba(79, 70, 229, 0.1);">
      <tr>
        <td>
          <h3 style="color: #1F2937; font-size: 20px; font-weight: 700; margin: 0 0 25px 0; text-align: center; border-bottom: 2px solid #E0F2FE; padding-bottom: 15px;">
            🎬 프로젝트 초대 정보
          </h3>
          
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #E0F2FE;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 30%;">
                      📁 프로젝트
                    </td>
                    <td style="color: #1F2937; font-size: 16px; font-weight: 600;">
                      ${projectTitle}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #E0F2FE;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 30%;">
                      👤 초대한 사람
                    </td>
                    <td style="color: #1F2937; font-size: 16px; font-weight: 600;">
                      ${inviterName}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #E0F2FE;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 30%;">
                      🎭 역할
                    </td>
                    <td>
                      <span style="background-color: ${roleColor.bg}; color: ${roleColor.text}; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; border: 1px solid ${roleColor.border};">
                        ${roleDisplayName}
                      </span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="color: #6B7280; font-size: 14px; font-weight: 500; width: 30%;">
                      ⏰ 만료일
                    </td>
                    <td style="color: #EF4444; font-size: 16px; font-weight: 600;">
                      ${expiresDate}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${message ? `
      <!-- 초대 메시지 -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border-left: 4px solid #F59E0B; border-radius: 8px; padding: 25px; margin: 30px 0;">
        <tr>
          <td>
            <h4 style="color: #92400E; font-size: 16px; font-weight: 600; margin: 0 0 15px 0;">
              💌 초대 메시지
            </h4>
            <p style="color: #78350F; font-size: 15px; margin: 0; line-height: 1.6; font-style: italic;">
              "${message}"
            </p>
          </td>
        </tr>
      </table>
    ` : ''}

    <!-- 프로젝트 기능 소개 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9FAFB; border-radius: 12px; padding: 30px; margin: 30px 0;">
      <tr>
        <td>
          <h3 style="color: #1F2937; font-size: 18px; font-weight: 600; margin: 0 0 20px 0; text-align: center;">
            🚀 이 프로젝트에서 할 수 있는 것들
          </h3>
          
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding: 10px 0; vertical-align: top;" width="50%">
                <div style="padding-right: 15px;">
                  <div style="color: #4F46E5; font-size: 24px; margin-bottom: 8px;">🎯</div>
                  <h4 style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">정확한 피드백</h4>
                  <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">타임스탬프별 정확한 의견 공유</p>
                </div>
              </td>
              <td style="padding: 10px 0; vertical-align: top;" width="50%">
                <div style="padding-left: 15px;">
                  <div style="color: #7C3AED; font-size: 24px; margin-bottom: 8px;">⚡</div>
                  <h4 style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">실시간 협업</h4>
                  <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">팀원들과 효율적인 소통</p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; vertical-align: top;" width="50%">
                <div style="padding-right: 15px;">
                  <div style="color: #06B6D4; font-size: 24px; margin-bottom: 8px;">📊</div>
                  <h4 style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">진행 상황 추적</h4>
                  <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">프로젝트 진행도를 한눈에</p>
                </div>
              </td>
              <td style="padding: 10px 0; vertical-align: top;" width="50%">
                <div style="padding-left: 15px;">
                  <div style="color: #10B981; font-size: 24px; margin-bottom: 8px;">🎨</div>
                  <h4 style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 5px 0;">창작 지원</h4>
                  <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">AI 기반 편집 도구 활용</p>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- 초대 수락 버튼 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="text-align: center; margin: 40px 0;">
      <tr>
        <td>
          <a href="${inviteUrl}" style="background: linear-gradient(135deg, #10B981 0%, #06B6D4 100%); color: #ffffff !important; text-decoration: none !important; padding: 18px 36px; border-radius: 14px; font-weight: 700; font-size: 18px; display: inline-block; text-align: center; border: none; box-shadow: 0 6px 20px -2px rgba(16, 185, 129, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
            ✅ 초대 수락하기
          </a>
          
          <p style="color: #EF4444; font-size: 14px; font-weight: 600; margin: 20px 0 10px 0;">
            ⏰ 이 초대는 ${expiresDate}까지 유효합니다
          </p>
          
          <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
            버튼이 작동하지 않나요? 
            <a href="${inviteUrl}" style="color: #4F46E5; text-decoration: underline;">
              여기를 클릭하세요
            </a>
          </p>
        </td>
      </tr>
    </table>

    <!-- 역할별 권한 안내 -->
    ${createInfoBox(
      `🎭 ${roleDisplayName} 권한 안내`,
      role === 'admin' ? '• 프로젝트 전체 관리<br>• 팀원 초대/제거<br>• 모든 콘텐츠 편집<br>• 설정 변경 권한' :
      role === 'editor' ? '• 콘텐츠 편집 및 업로드<br>• 피드백 작성 및 관리<br>• 팀원과 협업<br>• 진행 상황 업데이트' :
      role === 'reviewer' ? '• 콘텐츠 검토 및 피드백<br>• 승인/거부 결정<br>• 품질 관리<br>• 의견 공유' :
      '• 콘텐츠 열람<br>• 기본 피드백 작성<br>• 프로젝트 진행 상황 확인<br>• 팀 소통 참여',
      'info'
    )}

    <!-- 초대 거부 안내 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%); border-left: 4px solid #F87171; border-radius: 8px; padding: 20px; margin: 30px 0;">
      <tr>
        <td>
          <h4 style="color: #991B1B; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">
            ❌ 초대를 거부하고 싶으신가요?
          </h4>
          <p style="color: #7F1D1D; font-size: 14px; margin: 0; line-height: 1.5;">
            이 초대를 예상하지 못했거나 원하지 않는 경우, 이 이메일을 무시하셔도 됩니다.<br>
            초대를 수락하지 않으면 프로젝트에 추가되지 않으며, 어떠한 권한도 부여되지 않습니다.
          </p>
        </td>
      </tr>
    </table>

    <!-- 보안 안내 -->
    ${createSecurityNotice()}

    <!-- 고객 지원 -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center;">
      <tr>
        <td>
          <h4 style="color: #1F2937; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">
            🤝 함께 만들어가는 VideoPlaNet
          </h4>
          <p style="color: #6B7280; font-size: 14px; margin: 0; line-height: 1.5;">
            궁금한 점이 있으시면 언제든지 <a href="mailto:support@videoplanet.kr" style="color: #4F46E5; font-weight: 600;">support@videoplanet.kr</a>로 연락하세요.<br>
            더 나은 협업 경험을 위해 최선을 다하겠습니다!
          </p>
        </td>
      </tr>
    </table>
  `

  // 베이스 템플릿 데이터 구성
  const templateData: BaseTemplateData = {
    title: '프로젝트 초대',
    previewText: `${inviterName}님이 "${projectTitle}" 프로젝트에 ${roleDisplayName}로 초대했습니다`,
    content,
    baseUrl
  }

  return generateBaseTemplate(templateData)
}

/**
 * 텍스트 버전 생성 (fallback용)
 */
export function generateTeamInviteTextTemplate(data: TeamInviteData): string {
  const {
    recipientName = data.recipientEmail,
    inviterName,
    projectTitle,
    role,
    message,
    inviteToken,
    projectId,
    expiresAt,
    baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
  } = data

  const roleDisplayName = getRoleDisplayName(role)
  const inviteUrl = `${baseUrl}/invite/accept?token=${inviteToken}&project=${projectId}`
  const expiresDate = new Date(expiresAt).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `
VideoPlaNet 프로젝트 초대

안녕하세요 ${recipientName}님!

${inviterName}님이 VideoPlaNet에서 "${projectTitle}" 프로젝트에 당신을 초대했습니다.

초대 정보:
• 프로젝트: ${projectTitle}
• 초대한 사람: ${inviterName}
• 역할: ${roleDisplayName}
• 만료일: ${expiresDate}

${message ? `
초대 메시지:
"${message}"
` : ''}

이 프로젝트에서 할 수 있는 것들:
• 타임스탬프별 정확한 비디오 피드백
• 팀원들과 실시간 협업
• 프로젝트 진행 상황 추적
• AI 기반 창작 도구 활용

초대 수락: ${inviteUrl}

${roleDisplayName} 권한:
${role === 'admin' ? '• 프로젝트 전체 관리\n• 팀원 초대/제거\n• 모든 콘텐츠 편집\n• 설정 변경 권한' :
  role === 'editor' ? '• 콘텐츠 편집 및 업로드\n• 피드백 작성 및 관리\n• 팀원과 협업\n• 진행 상황 업데이트' :
  role === 'reviewer' ? '• 콘텐츠 검토 및 피드백\n• 승인/거부 결정\n• 품질 관리\n• 의견 공유' :
  '• 콘텐츠 열람\n• 기본 피드백 작성\n• 프로젝트 진행 상황 확인\n• 팀 소통 참여'}

이 초대를 예상하지 못했거나 원하지 않는 경우, 이 이메일을 무시하셔도 됩니다.
초대를 수락하지 않으면 프로젝트에 추가되지 않습니다.

본인이 요청하지 않은 경우 security@videoplanet.kr로 신고해 주세요.

도움이 필요하시면 support@videoplanet.kr로 연락하세요.

© 2025 VideoPlaNet. 모든 권리 보유.
  `.trim()
}