# SendGrid 환경 변수 설정 가이드

SendGrid 환경 변수 검증 시스템이 강화되었습니다. 이 가이드는 SendGrid 설정 방법과 환경 변수 검증 시스템을 설명합니다.

## 🎯 개요

- **자동 검증**: 앱 시작 시 SendGrid 환경 변수 자동 검증
- **개발 친화적**: 개발환경에서 상세한 오류 메시지 및 가이드 제공
- **프로덕션 안전**: 프로덕션에서 엄격한 검증 및 폴백 전략
- **FSD 준수**: Feature-Sliced Design 아키텍처 경계 준수

## 📋 필수 환경 변수

### 기본 설정
```env
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=VideoPlanet
VERIFIED_SENDER=noreply@yourdomain.com
```

### 선택적 설정 (템플릿 사용 시)
```env
SENDGRID_TEMPLATE_ID_VERIFICATION=d-xxxxxxxxxxxxxx
SENDGRID_TEMPLATE_ID_PASSWORD_RESET=d-yyyyyyyyyyyyyy
SENDGRID_TEMPLATE_ID_NOTIFICATION=d-zzzzzzzzzzzzzz
```

## 🔧 설정 방법

### 1. SendGrid 계정 설정
1. [SendGrid](https://sendgrid.com) 가입
2. API 키 생성 (Settings > API Keys)
3. 발신자 인증 완료 (Settings > Sender Authentication)

### 2. 환경 변수 설정

#### 로컬 개발환경
`.env.local` 파일에 환경 변수 추가:
```env
SENDGRID_API_KEY=SG.your-actual-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=YourAppName
VERIFIED_SENDER=noreply@yourdomain.com
```

#### Vercel 프로덕션
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables
2. 다음 변수들을 추가:
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM_EMAIL`
   - `SENDGRID_FROM_NAME`
   - `VERIFIED_SENDER`

## ✅ 검증 규칙

### 개발환경 (Development)
- API 키 형식만 검증 (더미 키 허용)
- 이메일 형식 검증
- 상세한 오류 메시지 및 가이드 제공

### 프로덕션환경 (Production)
- **엄격한 API 키 검증**: `SG.`로 시작, 최소 69자
- **실제 도메인 검증**: `example.com`, `test.com`, `localhost` 금지
- **SendGrid 검증된 발신자만 허용**

## 🚨 오류 처리

### 환경 변수 누락 시
개발환경에서는 상세한 오류 페이지가 표시됩니다:
- 누락된 환경 변수 목록
- 구체적인 설정 방법 가이드
- 해결 방법 제안

### 프로덕션에서 오류 시
- 폴백 설정으로 앱 계속 실행
- 콘솔에 경고 메시지 출력
- 이메일 기능 비활성화

## 📂 아키텍처 구조

```
shared/lib/env-validation/
├── index.ts                 # 공개 API
├── sendgrid.ts             # SendGrid 전용 검증
└── ...                     # 다른 서비스 검증 (추후)

shared/ui/EnvValidator/
├── index.ts                # 공개 API
└── EnvValidator.tsx        # 환경 변수 검증 UI

shared/lib/
├── env-validation.ts       # 통합 환경 변수 검증
└── sendgrid-service.ts     # SendGrid 서비스 (업데이트됨)
```

## 🔍 검증 시스템 작동 방식

### 1. 앱 시작 시 자동 검증
- `app/layout.tsx`의 `EnvValidator` 컴포넌트가 검증 수행
- `shared/lib/env-validation.ts`의 `checkEnvHealth()` 함수 호출
- `shared/lib/env-validation/sendgrid.ts`의 `checkSendGridHealth()` 함수 호출

### 2. SendGridService 초기화 시 검증
- 서비스 생성 시 검증된 환경 변수 사용
- 실시간 설정 상태 확인

## 🎨 사용 예시

### 환경 변수 검증
```typescript
import { validateSendGridEnv, checkSendGridHealth } from '@/shared/lib/env-validation/sendgrid'

// 검증된 환경 변수 가져오기
const sendGridEnv = validateSendGridEnv()
console.log(sendGridEnv.SENDGRID_FROM_EMAIL)

// 개발환경에서 상태 확인
checkSendGridHealth()
```

### SendGrid 서비스 사용
```typescript
import { SendGridService } from '@/shared/lib/sendgrid-service'

// 검증된 환경 변수가 자동으로 적용됨
const emailService = new SendGridService()

await emailService.sendTeamInvite({
  recipientEmail: 'user@example.com',
  inviterName: 'Admin',
  projectTitle: 'New Project',
  role: 'editor',
  inviteToken: 'token',
  projectId: 'project-id',
  expiresAt: '2024-12-31'
})
```

## 🐛 문제 해결

### 환경 변수가 인식되지 않을 때
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 개발 서버 재시작 (`pnpm dev`)
3. 환경 변수 이름 오타 확인

### API 키 오류
1. SendGrid API 키가 `SG.`로 시작하는지 확인
2. API 키의 권한 설정 확인 (Mail Send 권한 필요)
3. API 키가 활성화되어 있는지 확인

### 발신자 인증 오류
1. SendGrid에서 발신자 인증 완료했는지 확인
2. `SENDGRID_FROM_EMAIL`과 `VERIFIED_SENDER`가 인증된 이메일인지 확인

## 📚 참고 자료

- [SendGrid API 문서](https://docs.sendgrid.com/)
- [Vercel 환경 변수 가이드](https://vercel.com/docs/concepts/projects/environment-variables)
- [프로젝트 CLAUDE.md](../CLAUDE.md) - Part 4.4.2 보안 및 설정 관리