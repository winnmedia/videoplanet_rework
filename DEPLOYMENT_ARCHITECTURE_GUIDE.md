# VideoPlanet 배포 아키텍처 가이드라인

## 개요
Railway 및 Vercel 배포 실패 근본 원인 분석 및 해결 전략 문서

---

## 1. Railway 배포 완전 해결책

### 1.1 문제 진단
- **근본 원인**: Railway의 자동 언어 감지가 Django(vridge_back) 우선 인식
- **4중 방어 실패**: nixpacks.toml, .railwayignore, rootDirectory, 브랜치 격리 모두 무력화

### 1.2 해결책: 3단계 철벽 방어 전략

#### 철벽 방어 1단계: nixpacks.toml 강화
```toml
# /nixpacks.toml
[build]
providers = ["node"]  # 강제 Node.js 감지

[build.ignorePaths]
paths = [
  "vridge_back/**",    # Django 백엔드 차단
  "vridge_front/**",   # 레거시 프론트엔드 차단
  "*.py", "requirements.txt", "pyproject.toml", "manage.py"
]
```

#### 철벽 방어 2단계: .railwayignore 완전 차단
```gitignore
# /.railwayignore
# Django 백엔드 전체 차단
vridge_back/
vridge_front/

# Python 관련 모든 파일 무시
*.py
*.pyc
requirements.txt
pyproject.toml
manage.py

# Railway Django 설정 차단
railway.toml

# 오직 Next.js만 허용
!vridge-web/
!package.json
```

#### 철벽 방어 3단계: package.json 루트 배치
```json
// /package.json - Railway가 Node.js 프로젝트로 인식하도록 강제
{
  "name": "vlanet-monorepo-frontend",
  "description": "Railway 철벽 방어 3단계: 강제 Node.js 감지",
  "scripts": {
    "build": "cd vridge-web && pnpm install --frozen-lockfile && pnpm run build"
  },
  "workspaces": ["vridge-web"]
}
```

### 1.3 Railway 전용 설정 파일
```json
// /railway-frontend.json
{
  "git": {
    "branch": "master",
    "rootDirectory": "vridge-web"
  },
  "build": {
    "builder": "NIXPACKS",
    "watchPaths": ["vridge-web/**"]
  },
  "ignorePaths": [
    "vridge_back/**", "*.py", "requirements.txt", "pyproject.toml"
  ]
}
```

---

## 2. Vercel Next.js 15 완전 호환 해결책

### 2.1 문제 진단
- **근본 원인**: Next.js 15에서 RouteContext의 `params`가 Promise로 변경
- **타입 불일치**: `withErrorHandler`의 제네릭 타입 지원 부족

### 2.2 해결책: Next.js 15 완전 호환 타입 시스템

#### 업데이트된 withErrorHandler 타입
```typescript
// /vridge-web/lib/api/error-handler.ts
type RouteContext<T = Record<string, string>> = {
  params: Promise<T>  // Next.js 15 Promise 지원
}

type NextApiHandler<T = Record<string, string>> = (
  request: NextRequest, 
  context: RouteContext<T>
) => Promise<Response | NextResponse>

export function withErrorHandler<T = Record<string, string>>(
  handler: NextApiHandler<T>
): NextApiHandler<T> {
  return async (request: NextRequest, context: RouteContext<T>) => {
    // 완전 타입 안전 에러 처리
  }
}
```

#### API Route 사용 예시
```typescript
// 완전 타입 안전 사용법
export const GET = withErrorHandler<{ id: string }>(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params  // 타입 안전한 params 접근
  // ...
})
```

---

## 3. 모노레포 아키텍처 개선 가이드라인

### 3.1 현재 구조 문제점
```
VLANET/
├── vridge_back/     # Django - 배포 플랫폼 혼동 유발
├── vridge-web/      # Next.js - 실제 배포 대상
├── vercel.json      # 잘못된 위치 (루트)
└── railway.toml     # Django 설정 (혼동 유발)
```

### 3.2 권장 구조 개선안

#### 옵션 A: 플랫폼별 분리 (권장)
```
VLANET/
├── apps/
│   ├── frontend/    # Next.js (Vercel 전용)
│   └── backend/     # Django (Railway 별도 서비스)
├── packages/        # 공통 라이브러리
├── deployment/
│   ├── vercel/      # Vercel 전용 설정
│   └── railway/     # Railway 전용 설정
└── package.json     # 모노레포 루트
```

#### 옵션 B: 현재 구조 유지 + 강화된 격리
```
VLANET/
├── vridge_back/           # Django (Railway 별도 배포)
├── vridge-web/            # Next.js (Vercel 배포)
├── .railwayignore         # 철벽 방어 2단계
├── package.json           # 철벽 방어 3단계
└── railway-frontend.json  # Railway 전용 설정
```

### 3.3 배포 플랫폼 격리 원칙

#### Railway 전용 환경
- **대상**: 프론트엔드 (vridge-web)만 배포
- **감지 방지**: Python 관련 모든 파일 무시
- **빌드 격리**: workspaces 사용으로 종속성 분리

#### Vercel 전용 환경  
- **대상**: vridge-web 디렉토리만 인식
- **설정 위치**: `/vridge-web/vercel.json` (올바른 위치)
- **브랜치 격리**: Railway 관련 브랜치 배포 비활성화

---

## 4. 배포 성공을 위한 체크리스트

### 4.1 Railway 배포 전 검증
- [ ] 루트에 package.json 존재 (철벽 방어 3단계)
- [ ] .railwayignore에 Django 파일 완전 차단
- [ ] nixpacks.toml에 Node.js providers 강제 설정
- [ ] railway-frontend.json 설정 완료

### 4.2 Vercel 배포 전 검증
- [ ] vridge-web/vercel.json 설정 (루트 아님)
- [ ] Next.js 15 타입 호환성 확인 (withErrorHandler)
- [ ] Railway 관련 브랜치 배포 비활성화
- [ ] API Route 타입 검증 통과

### 4.3 통합 검증 절차
```bash
# Railway 배포 테스트
cd /vridge-web && pnpm install --frozen-lockfile && pnpm run build

# Vercel 타입 검증
cd /vridge-web && pnpm exec tsc --noEmit

# API Route 타입 안전성 확인
# withErrorHandler<{ id: string }> 사용법 검증
```

---

## 5. 향후 배포 실패 방지 전략

### 5.1 모니터링 지점
1. **Railway 자동 감지**: 빌드 로그에서 "Detected Python project" 경고 모니터링
2. **Vercel 타입 오류**: TypeScript 컴파일 단계에서 RouteContext 오류 감지  
3. **설정 파일 추적**: vercel.json, nixpacks.toml 변경사항 자동 검증

### 5.2 자동화 방안
- **Pre-commit Hook**: 배포 설정 파일 검증 자동화
- **CI/CD 파이프라인**: 플랫폼별 빌드 테스트 분리
- **타입 안전성**: API Route 타입 검증 자동화

### 5.3 팀 협업 가이드라인
- **설정 파일 수정 시**: 반드시 두 플랫폼 모두 테스트
- **Python 파일 추가 시**: .railwayignore 업데이트 필수
- **API Route 개발 시**: withErrorHandler 타입 제약 준수

---

## 결론

이번 해결책으로 Railway와 Vercel 배포가 100% 성공할 것으로 예상됩니다:

1. **Railway**: 3단계 철벽 방어로 Django 감지 완전 차단
2. **Vercel**: Next.js 15 완전 호환 타입 시스템 구축  
3. **모노레포**: 플랫폼별 격리를 통한 배포 안정성 확보

배포 실패 시 본 가이드라인의 체크리스트를 참조하여 단계별로 검증하시기 바랍니다.