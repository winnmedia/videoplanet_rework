# API 엔드포인트 구현을 위한 TDD 전략 가이드

## 📋 개요

이 문서는 VideoPlanet 프로젝트에서 Next.js 15.5 App Router API Routes를 TDD 방식으로 구현하기 위한 종합적인 전략과 가이드라인을 제공합니다.

**핵심 원칙**: Red → Green → Refactor 사이클을 엄격히 준수하며, MSW와 Railway 백엔드의 일관성을 보장합니다.

## 🎯 목표

- **품질 보장**: 모든 API 엔드포인트에 대한 결정론적 테스트 구축
- **안정성 확보**: Railway 백엔드 연동 시 예상치 못한 오류 방지
- **개발 속도**: 체계적인 TDD 패턴으로 개발 생산성 향상
- **유지보수성**: 명확한 테스트 경계와 책임 분리

## 🏗️ 테스트 아키텍처

### 테스트 피라미드 구조

```
           E2E Tests (5%)
         사용자 시나리오 검증

      Integration Tests (25%)
    컴포넌트 간 상호작용 검증

       Unit Tests (70%)
    순수 함수 및 로직 검증
```

### 레이어별 테스트 전략

| 테스트 유형     | 환경          | 의존성 처리        | 실행 시간 | 주요 검증 대상                    |
| --------------- | ------------- | ------------------ | --------- | --------------------------------- |
| **Unit**        | Node.js       | 모든 의존성 모킹   | < 50ms    | 입력 검증, 데이터 변환, 에러 처리 |
| **Integration** | Node.js + MSW | 외부 서비스만 모킹 | 100-500ms | API 전체 플로우, 미들웨어 연동    |
| **E2E**         | 실제 환경     | 실제 서비스        | 1-10초    | 전체 사용자 시나리오              |

## 🔄 TDD 개발 사이클

### Phase 1: RED - 실패하는 테스트 작성

```typescript
// ❌ 실패하는 테스트부터 시작
describe('[RED] API Handler 미구현', () => {
  it('POST /api/projects - 404 에러 반환 (핸들러 없음)', async () => {
    try {
      const { POST } = await import('../../../app/api/projects/route')
      // 이 라인에 도달하면 테스트 실패
      expect(true).toBe(false)
    } catch (error) {
      // 모듈을 찾을 수 없음 = RED 성공
      expect(error.code).toContain('MODULE_NOT_FOUND')
    }
  })
})
```

### Phase 2: GREEN - 최소 구현으로 테스트 통과

```typescript
// ✅ 최소 구현으로 테스트 통과
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 기본 검증
    if (!body.title) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: '제목이 필요합니다' },
        },
        { status: 400 }
      )
    }

    // 최소 Railway API 호출
    const response = await fetch('https://api.vlanet.net/projects/', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (!response.ok) throw new Error('Backend failed')

    const data = await response.json()

    return NextResponse.json(
      {
        success: true,
        data: { id: data.id, title: data.title },
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '서버 오류' },
      },
      { status: 500 }
    )
  }
}
```

### Phase 3: REFACTOR - 코드 개선 및 최적화

```typescript
// 🔧 개선된 구현
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zod를 사용한 강력한 검증
    const validation = CreateProjectSchema.safeParse(body)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error)
    }

    // 재시도 로직이 포함된 Railway API 호출
    const backendData = await callBackendWithRetry('/projects/', {
      method: 'POST',
      body: validation.data,
      maxRetries: 3,
    })

    // 타입 안전한 응답 변환
    const transformedData = transformBackendResponse(backendData)

    return NextResponse.json(
      {
        success: true,
        message: '프로젝트가 생성되었습니다',
        data: transformedData,
      },
      {
        status: 201,
        headers: { 'Cache-Control': 'no-cache' },
      }
    )
  } catch (error) {
    return handleApiError(error, 'PROJECT_CREATION_FAILED')
  }
}
```

## 📝 테스트 템플릿 및 패턴

### 1. 기본 테스트 구조

```typescript
describe('API Route Handler - Projects', () => {
  const server = setupServer()

  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterAll(() => server.close())
  afterEach(() => server.resetHandlers())

  describe('[RED] 실패 시나리오', () => {
    // 실패하는 테스트들
  })

  describe('[GREEN] 최소 구현', () => {
    // 기본 기능 테스트들
  })

  describe('[REFACTOR] 최적화', () => {
    // 개선된 기능 테스트들
  })
})
```

### 2. MSW 핸들러 패턴

```typescript
// 성공 시나리오
server.use(
  http.post('https://api.vlanet.net/projects/', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      {
        id: crypto.randomUUID(),
        title: body.title,
        status: 'draft',
        created_at: new Date().toISOString(),
      },
      { status: 201 }
    )
  })
)

// 실패 시나리오
server.use(
  http.post('https://api.vlanet.net/projects/', () => {
    return HttpResponse.json(
      {
        error: 'Database connection failed',
      },
      { status: 500 }
    )
  })
)
```

### 3. 스키마 기반 검증

```typescript
const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    })
    .optional(),
})

// 테스트에서 스키마 검증
const responseData = await response.json()
expect(() => ApiResponseSchema.parse(responseData)).not.toThrow()
```

## 🚨 실패 시나리오 테스트

### 네트워크 및 연결 실패

```typescript
describe('네트워크 실패 시나리오', () => {
  it('Railway 백엔드 완전 다운 - 503 Service Unavailable', async () => {
    server.use(http.all('https://api.vlanet.net/*', () => HttpResponse.error()))

    const response = await callAPI()

    expect(response.status).toBe(503)
    expect(response.data.error.code).toBe('BACKEND_UNAVAILABLE')
    expect(response.data.error.retryAfter).toBeDefined()
  })

  it('요청 타임아웃 - 408 Request Timeout', async () => {
    server.use(
      http.post('https://api.vlanet.net/projects/', async () => {
        await new Promise(resolve => setTimeout(resolve, 35000))
        return HttpResponse.json({ success: true })
      })
    )

    // 타임아웃 로직 테스트
  })
})
```

### 인증 및 권한 실패

```typescript
describe('인증 실패 시나리오', () => {
  it('만료된 JWT 토큰 - 401 Unauthorized', async () => {
    server.use(
      http.post('https://api.vlanet.net/projects/', ({ request }) => {
        const authHeader = request.headers.get('Authorization')

        if (authHeader?.includes('expired_token')) {
          return HttpResponse.json(
            {
              error: 'Token has expired',
              code: 'TOKEN_EXPIRED',
            },
            { status: 401 }
          )
        }
      })
    )

    const response = await callAPIWithToken('expired_token')

    expect(response.status).toBe(401)
    expect(response.data.error.code).toBe('AUTHENTICATION_EXPIRED')
  })
})
```

### 데이터 검증 실패

```typescript
describe('데이터 검증 실패 시나리오', () => {
  it('백엔드 데이터 검증 실패 - 422 Unprocessable Entity', async () => {
    server.use(
      http.post('https://api.vlanet.net/projects/', async ({ request }) => {
        const body = await request.json()

        const validationErrors = []
        if (!body.title) {
          validationErrors.push({
            field: 'title',
            code: 'required',
            message: 'Title is required',
          })
        }

        if (validationErrors.length > 0) {
          return HttpResponse.json(
            {
              error: 'Validation failed',
              details: validationErrors,
            },
            { status: 422 }
          )
        }
      })
    )

    const response = await callAPIWithInvalidData()

    expect(response.status).toBe(422)
    expect(response.data.error.code).toBe('VALIDATION_FAILED')
  })
})
```

## 🔄 MSW와 실제 API 동기화 전략

### 1. 스키마 일관성 보장

```typescript
// 공통 스키마 정의
const ProjectBackendSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['draft', 'active', 'completed']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  owner_id: z.string().uuid(),
})

// MSW 핸들러에서 스키마 검증
server.use(
  http.post('https://api.vlanet.net/projects/', async ({ request }) => {
    const body = await request.json()

    // 응답 데이터가 스키마를 준수하는지 확인
    const responseData = {
      id: crypto.randomUUID(),
      title: body.title,
      // ... 기타 필드들
    }

    ProjectBackendSchema.parse(responseData) // 스키마 검증

    return HttpResponse.json(responseData, { status: 201 })
  })
)
```

### 2. 계약 테스트 (Contract Testing)

```typescript
describe('MSW-API 계약 일관성', () => {
  it('MSW 응답이 실제 API 스키마와 일치', () => {
    const mockResponse = generateMockProjectResponse()

    // 백엔드 스키마 검증
    expect(() => ProjectBackendSchema.parse(mockResponse)).not.toThrow()

    // 프론트엔드 변환 후 스키마 검증
    const transformed = transformBackendResponse(mockResponse)
    expect(() => ProjectFrontendSchema.parse(transformed)).not.toThrow()
  })

  it('에러 응답 형식 일관성', () => {
    const errorFormats = [
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input' } },
      { success: false, error: { code: 'RESOURCE_NOT_FOUND', message: 'Not found' } },
    ]

    errorFormats.forEach(format => {
      expect(() => ApiResponseSchema.parse(format)).not.toThrow()
    })
  })
})
```

### 3. 환경별 설정

```typescript
// Jest 설정 (jest.config.js)
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/?(*.)+(spec|test).ts'],
}

// 테스트 환경 설정 (tests/setup.ts)
import { server } from '../shared/api/__tests__/setup/msw-setup'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## 📊 품질 메트릭 및 목표

### 커버리지 목표

- **전체 프로젝트**: 85% 이상
- **API Route Handlers**: 90% 이상
- **핵심 비즈니스 로직**: 95% 이상

### 성능 목표

- **단위 테스트**: < 50ms per test
- **통합 테스트**: < 500ms per test
- **전체 테스트 실행**: < 5분

### 안정성 목표

- **플래키 테스트 비율**: < 1%
- **결정론적 실행**: 100%
- **재현 가능한 실패**: 100%

## 🛠️ 개발 워크플로우

### 1. 새로운 API 엔드포인트 개발

```bash
# 1. 실패 테스트 작성 (RED)
npm test -- --testNamePattern="RED.*POST /api/projects"

# 2. 최소 구현 (GREEN)
npm test -- --testNamePattern="GREEN.*POST /api/projects"

# 3. 리팩토링 (REFACTOR)
npm test -- --testNamePattern="REFACTOR.*POST /api/projects"

# 4. 전체 테스트 실행
npm test

# 5. 타입 검사
npm run type-check

# 6. 린트 검사
npm run lint
```

### 2. CI/CD 파이프라인 통합

```yaml
# .github/workflows/api-tests.yml
name: API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test:api --coverage
      - run: pnpm test:integration

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

### 3. 품질 게이트

```typescript
// Jest 설정에서 커버리지 임계값 설정
module.exports = {
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85,
    },
    './app/api/**/*.ts': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90,
    },
  },
}
```

## 📚 참고 자료 및 도구

### 핵심 라이브러리

- **테스트 러너**: Jest 29+
- **모킹**: MSW 2.0+
- **스키마 검증**: Zod 3.0+
- **HTTP 클라이언트**: fetch API (Node.js 18+)
- **타입 검증**: TypeScript 5.0+

### 유용한 헬퍼 유틸리티

```typescript
// lib/api/__tests__/test-utils.ts
export const TestUtils = {
  // 표준 요청 생성
  createRequest: (options: RequestOptions) => new NextRequest(options.url, options),

  // 에러 응답 검증
  expectErrorResponse: (response: any, code: string) => {
    expect(response.success).toBe(false)
    expect(response.error.code).toBe(code)
  },

  // UUID 검증
  expectValidUUID: (uuid: string) =>
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),

  // 성능 측정
  measureResponseTime: async (handler: () => Promise<any>) => {
    const start = Date.now()
    const result = await handler()
    const duration = Date.now() - start
    return { result, duration }
  },
}
```

### 파일 구조

```
lib/api/
├── __tests__/
│   ├── api-route-handler-tdd-template.test.ts      # 기본 템플릿
│   ├── api-route-implementation-guide.test.ts     # 구현 가이드
│   ├── api-failure-scenarios.test.ts              # 실패 시나리오
│   ├── integration-vs-unit-test-boundaries.test.ts # 테스트 경계
│   └── test-utils.ts                               # 공통 유틸리티
├── client.ts                                       # API 클라이언트
├── msw-handlers.ts                                # MSW 핸들러
└── schemas.ts                                     # Zod 스키마
```

## 🎉 결론

이 TDD 전략을 통해 다음과 같은 이점을 얻을 수 있습니다:

1. **예측 가능한 API**: 모든 엣지 케이스가 테스트로 문서화됨
2. **안정적인 배포**: Railway 백엔드와의 연동 오류를 사전 방지
3. **빠른 개발**: 체계적인 패턴으로 개발 속도 향상
4. **쉬운 유지보수**: 명확한 테스트로 변경 사항의 영향 범위 파악

**핵심 기억사항**:

- 항상 RED → GREEN → REFACTOR 순서를 지킵니다
- MSW와 실제 API의 일관성을 정기적으로 검증합니다
- 실패 시나리오를 적극적으로 테스트합니다
- 단위/통합/E2E 테스트의 경계를 명확히 합니다

---

_이 문서는 VideoPlanet 프로젝트의 API 개발 품질을 보장하기 위한 살아있는 가이드입니다. 프로젝트의 진화와 함께 지속적으로 업데이트됩니다._
