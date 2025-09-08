# FSD 기반 API 설계 및 경계 준수 가이드라인

## 개요

본 문서는 Feature-Sliced Design(FSD) 아키텍처를 준수하는 API 엔드포인트 설계 및 구현을 위한 강제적 가이드라인입니다.

## API 계층 구조 정의

### 1. App Layer - Next.js API Routes (`/app/api/`)

**역할**: HTTP 엔드포인트 구현 및 요청/응답 처리
**위치**: `/app/api/**/*.ts`

```typescript
// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
```

**규칙**:

- HTTP 메서드별 함수 구현 (GET, POST, PUT, DELETE)
- 비즈니스 로직 직접 구현 금지 → Features Layer 의존
- 인증/인가는 middleware에서 처리
- 응답 형식은 `ApiResponse<T>` 타입 준수

### 2. Shared Layer - 공통 API 유틸리티 (`/shared/api/`)

**역할**: 계층간 공유하는 API 클라이언트 및 타입 정의
**위치**: `/shared/api/`

```typescript
// shared/api/client.ts
export class ApiClient {
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    // 공통 HTTP 클라이언트 로직
  }
}

// shared/types/api.ts
export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  status: number
}
```

**규칙**:

- 모든 계층에서 사용 가능한 공통 유틸리티만 배치
- HTTP 클라이언트, 타입 정의, 에러 핸들러
- 특정 도메인 로직 포함 금지

### 3. Features Layer - 도메인별 클라이언트 API (`/features/*/api/`)

**역할**: 도메인별 서버 API 호출 로직
**위치**: `/features/[domain]/api/`

```typescript
// features/auth/api/authApi.ts
import { apiClient } from '@/shared/api'

export const authApi = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
    return response.data!
  },
}
```

**규칙**:

- 도메인별 API 호출 로직만 포함
- 반드시 `shared/api` 클라이언트 사용
- Public API (`index.ts`)를 통해서만 외부 노출

## FSD 경계 준수 규칙

### A. Import 규칙 (절대 준수)

**✅ 올바른 Import**:

```typescript
// Public API 를 통한 Import
import { authApi } from '@/features/auth/api'
import { apiClient } from '@/shared/api'
```

**❌ 금지된 Import**:

```typescript
// 직접 내부 파일 Import 금지
import { authApi } from '@/features/auth/api/authApi' // 금지!
import { ApiClient } from '@/shared/api/client' // 금지!
```

### B. 계층별 의존성 규칙

```
app → processes → pages → widgets → features → entities → shared
```

**각 계층별 Import 제한**:

- **App Layer**: 모든 하위 계층 Import 가능
- **Features Layer**: entities, shared만 Import 가능
- **Shared Layer**: 외부 라이브러리만 Import 가능

### C. Public API 강제 규칙

모든 Feature/Entity/Widget은 반드시 `index.ts`를 통해 Public API 정의:

```typescript
// features/auth/api/index.ts
export { authApi } from './authApi'
export type { LoginRequest, LoginResponse } from './authApi'
```

## DTO-ViewModel 변환 계층

### 1. DTO (Data Transfer Object) - 서버 응답

```typescript
// shared/types/dto.ts
export interface UserDTO {
  id: string
  email: string
  created_at: string // 서버 형식
  is_active: boolean
}
```

### 2. ViewModel - 클라이언트 표시용

```typescript
// features/auth/model/types.ts
export interface UserViewModel {
  id: string
  email: string
  createdAt: Date // 클라이언트 형식
  isActive: boolean
}
```

### 3. 변환 함수

```typescript
// features/auth/model/mappers.ts
export const userMapper = {
  dtoToViewModel(dto: UserDTO): UserViewModel {
    return {
      id: dto.id,
      email: dto.email,
      createdAt: new Date(dto.created_at),
      isActive: dto.is_active,
    }
  },
}
```

## ESLint 경계 강제 규칙

### 1. 핵심 강제 규칙

```javascript
// eslint.config.mjs
{
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        // 내부 파일 직접 Import 금지
        {
          group: ["@features/*/api/*", "@features/*/model/*"],
          message: "Direct internal imports forbidden. Use public API only."
        },
        // 레거시 lib/api Import 금지
        {
          group: ["@/lib/api/*"],
          message: "Legacy lib/api imports forbidden. Use @shared/api/*"
        }
      ]
    }
  ]
}
```

### 2. 순환 의존성 방지

```javascript
{
  "import/no-cycle": ["error", { maxDepth: 3 }]
}
```

## API 엔드포인트 추가 체크리스트

### Phase 1: 설계

- [ ] FSD 계층 적절성 확인 (App/Features/Shared)
- [ ] API 스펙 정의 (Request/Response DTO)
- [ ] 의존성 방향 검증 (하위→상위 금지)

### Phase 2: 구현

- [ ] Public API (`index.ts`) 생성
- [ ] DTO-ViewModel 변환 함수 구현
- [ ] ESLint 검증 통과
- [ ] 순환 의존성 체크 (`madge --circular`)

### Phase 3: 검증

- [ ] TDD 테스트 커버리지 70% 이상
- [ ] MSW 모킹 시스템 연동
- [ ] API 계약 테스트 (Contract Testing)
- [ ] 성능 예산 기준 준수

## 순환 의존성 해결 방안

### 1. 현재 발견된 순환 의존성

```
lib/api/client.ts → lib/api/cache.ts
lib/api/client.ts → lib/api/monitoring.ts
lib/api/client.ts → lib/api/retry-handler.ts
```

### 2. 해결 전략

**A. 의존성 역전 (Dependency Inversion)**

```typescript
// Before: 순환 의존성
import { cache } from './cache'

// After: 인터페이스 의존
import type { CacheProvider } from '@/shared/types'
```

**B. 공통 유틸리티 추출**

```typescript
// shared/lib/http/index.ts
export { HttpClient } from './client'
export { CacheManager } from './cache'
export { RetryHandler } from './retry'
```

## 마이그레이션 가이드

### Legacy `/lib/api/` → `/shared/api/` 전환

1. **단계별 마이그레이션**:

   ```bash
   # 1. shared/api 구조 생성
   mkdir -p shared/api

   # 2. 기존 파일 이동
   mv lib/api/client.ts shared/api/

   # 3. Import 경로 업데이트
   # @/lib/api/client → @/shared/api/client
   ```

2. **ESLint 규칙으로 강제**:
   - Legacy 경로 Import 시 즉시 CI 실패
   - 자동화된 경로 변환 스크립트 제공

## 핵심 엄수 사항

1. **FSD 경계 위반 = 즉시 CI 실패**
2. **Public API 우회 Import = 코드 리뷰 거부**
3. **순환 의존성 발견 = 배포 차단**
4. **DTO 직접 사용 = 아키텍처 위반**

이 가이드라인을 벗어나는 모든 코드는 자동으로 거부되며, 예외 사항은 아키텍처 팀의 명시적 승인이 필요합니다.
