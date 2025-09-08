# VideoPlaNet 이메일 템플릿 시스템

반응형 HTML 이메일 템플릿 시스템으로, VideoPlaNet 브랜딩과 접근성을 고려하여 설계되었습니다.

## 🎯 주요 특징

- **반응형 디자인**: 모바일, 태블릿, 데스크톱에서 완벽한 표시
- **이메일 클라이언트 호환성**: Gmail, Outlook, Apple Mail 등 주요 클라이언트 지원
- **접근성**: WCAG 2.1 AA 준수, alt 텍스트, 색상 대비 고려
- **VideoPlaNet 브랜딩**: 일관된 색상, 타이포그래피, 로고 사용
- **순수 HTML/CSS**: 인라인 스타일로 최대 호환성 보장

## 📁 파일 구조

```
lib/email/templates/
├── base-template.html.ts      # 공통 베이스 템플릿
├── signup-verification.html.ts # 회원가입 인증
├── password-reset.html.ts     # 비밀번호 재설정
├── team-invite.html.ts        # 팀 초대
├── index.ts                   # 통합 유틸리티
└── README.md                  # 사용법 안내
```

## 🚀 사용법

### 1. 회원가입 인증 이메일

```typescript
import { createSignupVerificationEmail } from '@/lib/email/templates'

const emailData = {
  userEmail: 'user@example.com',
  verificationCode: '123456',
  userName: '김개발', // 선택사항
  expiryMinutes: 10,  // 선택사항 (기본: 10분)
  baseUrl: 'https://videoplanet.kr' // 선택사항
}

const { subject, htmlContent, plainTextContent } = createSignupVerificationEmail(emailData)
```

### 2. 비밀번호 재설정 이메일

```typescript
import { createPasswordResetEmail } from '@/lib/email/templates'

const emailData = {
  userEmail: 'user@example.com',
  resetCode: '987654',
  userName: '김개발', // 선택사항
  expiryMinutes: 10,  // 선택사항 (기본: 10분)
  baseUrl: 'https://videoplanet.kr' // 선택사항
}

const { subject, htmlContent, plainTextContent } = createPasswordResetEmail(emailData)
```

### 3. 팀 초대 이메일

```typescript
import { createTeamInviteEmail } from '@/lib/email/templates'

const emailData = {
  recipientEmail: 'newuser@example.com',
  recipientName: '이협업', // 선택사항
  inviterName: '김매니저',
  projectTitle: '영상 제작 프로젝트 2024',
  role: 'editor', // admin | editor | reviewer | viewer
  message: '함께 멋진 영상을 만들어봐요!', // 선택사항
  inviteToken: 'invite_abc123def456',
  projectId: 'proj_789',
  expiresAt: new Date().toISOString(),
  baseUrl: 'https://videoplanet.kr' // 선택사항
}

const { subject, htmlContent, plainTextContent } = createTeamInviteEmail(emailData)
```

## 🔧 기존 서비스와의 통합

### SendGrid Service와 통합

```typescript
// shared/lib/sendgrid-service.ts에서 자동으로 사용됨
import { getSendGridService } from '@/shared/lib/sendgrid-service'

const sendgrid = getSendGridService()
await sendgrid.sendTeamInvite({
  recipientEmail: 'user@example.com',
  // ... 기타 데이터
})
```

### Simple SendGrid와 통합

```typescript
// lib/email/simple-sendgrid.ts에서 자동으로 사용됨
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email/simple-sendgrid'

// 회원가입 인증
await sendVerificationEmail('user@example.com', '123456', '김개발')

// 비밀번호 재설정
await sendPasswordResetEmail('user@example.com', '987654', '김개발')
```

## 🎨 브랜드 색상

템플릿에서 사용되는 VideoPlaNet 브랜드 색상:

```typescript
const BRAND_COLORS = {
  primary: '#4F46E5',    // indigo-600
  secondary: '#7C3AED',  // violet-600
  accent: '#06B6D4',     // cyan-500
  success: '#10B981',    // emerald-500
  warning: '#F59E0B',    // amber-500
  danger: '#EF4444',     // red-500
  // ... 기타 색상들
}
```

## 🧪 개발 및 테스트

### 이메일 미리보기 (개발 환경)

브라우저에서 이메일 템플릿을 미리볼 수 있습니다:

```
GET /api/email/preview
GET /api/email/preview?type=signupVerification
GET /api/email/preview?type=passwordReset
GET /api/email/preview?type=teamInvite
```

### 템플릿 검증

```typescript
import { validateEmailTemplate, createSignupVerificationEmail } from '@/lib/email/templates'

const template = createSignupVerificationEmail(data)
const validation = validateEmailTemplate(template)

if (!validation.isValid) {
  console.error('템플릿 오류:', validation.errors)
}

if (validation.warnings.length > 0) {
  console.warn('템플릿 경고:', validation.warnings)
}
```

## 📱 반응형 디자인

템플릿은 다음과 같은 중단점을 사용합니다:

- **데스크톱**: 600px+ (기본)
- **모바일**: 600px 이하

```css
@media only screen and (max-width: 600px) {
  .container { width: 100% !important; }
  .btn-primary { width: 100% !important; }
  /* 기타 모바일 최적화 스타일 */
}
```

## ♿ 접근성 고려사항

- **alt 속성**: 모든 이미지에 적절한 alt 텍스트 제공
- **색상 대비**: WCAG 2.1 AA 기준 준수 (4.5:1 이상)
- **의미론적 HTML**: 헤딩 구조, 테이블 역할 등 올바른 마크업
- **키보드 접근성**: 링크와 버튼에 명확한 포커스 표시

## 🔒 보안

- **XSS 방지**: 모든 사용자 입력은 적절히 이스케이프됨
- **링크 검증**: 모든 링크는 baseUrl 기반으로 생성
- **토큰 보호**: 민감한 토큰은 안전하게 처리

## 🚨 주의사항

1. **프로덕션 환경**: 미리보기 API는 개발 환경에서만 사용 가능
2. **이메일 클라이언트 제한**: 일부 고급 CSS는 지원되지 않을 수 있음
3. **이미지 호스팅**: 로고 등 이미지는 신뢰할 수 있는 CDN에서 호스팅 필요
4. **캐시**: 이메일 클라이언트별로 캐싱 정책이 다를 수 있음

## 📝 라이선스

이 템플릿 시스템은 VideoPlaNet 프로젝트의 일부이며, 프로젝트 라이선스를 따릅니다.