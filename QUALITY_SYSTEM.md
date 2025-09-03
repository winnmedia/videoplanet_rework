# VLANET 통합 품질 보증 시스템

본 문서는 VLANET 프로젝트의 완전한 품질 보증 시스템 사용법을 설명합니다.

## 📋 시스템 개요

### 구축된 품질 게이트
- ✅ **E2E 테스트 자동화** (Cypress)
- ✅ **TDD 강제 시스템** (Pre-commit hooks, 커버리지 80% 강제)
- ✅ **Mutation Testing** (Stryker - 테스트 품질 검증)
- ✅ **성능 품질 게이트** (Core Web Vitals, Bundle Size)
- ✅ **API 계약 검증** (MSW + Pact + Zod)
- ✅ **접근성 품질 보증** (WCAG 2.1 AA 준수)
- ✅ **CI/CD 통합** (GitHub Actions)
- ✅ **Flaky Test 제로 정책**
- ✅ **품질 메트릭 대시보드**

## 🚀 빠른 시작

### 1. 개발 환경 설정
```bash
# 의존성 설치
pnpm install

# Git hooks 설정 (자동 실행)
pnpm prepare

# 개발 서버 시작
pnpm dev
```

### 2. 테스트 실행
```bash
# 전체 테스트 (커버리지 포함)
pnpm test:coverage

# 테스트 감시 모드
pnpm test:watch

# Flaky 테스트 감지
pnpm test:flaky
```

### 3. 품질 검사
```bash
# 전체 품질 게이트 실행
pnpm quality:full

# 품질 대시보드 생성
pnpm quality:dashboard
```

## 🧪 테스트 전략

### TDD 워크플로우 (RED → GREEN → REFACTOR)

#### 1단계: RED (실패하는 테스트 작성)
```typescript
// src/features/video-upload/model/videoUpload.test.ts
describe('Video Upload', () => {
  it('should validate video file format', () => {
    const validator = new VideoValidator()
    
    expect(() => validator.validate('invalid.txt')).toThrow('Unsupported format')
  })
})
```

#### 2단계: GREEN (최소 구현)
```typescript
// src/features/video-upload/model/videoValidator.ts
export class VideoValidator {
  validate(filename: string) {
    if (!filename.endsWith('.mp4')) {
      throw new Error('Unsupported format')
    }
  }
}
```

#### 3단계: REFACTOR (리팩토링)
```typescript
export class VideoValidator {
  private readonly allowedFormats = ['mp4', 'avi', 'mov', 'mkv']
  
  validate(filename: string) {
    const extension = filename.split('.').pop()?.toLowerCase()
    
    if (!extension || !this.allowedFormats.includes(extension)) {
      throw new Error(`Unsupported format. Allowed: ${this.allowedFormats.join(', ')}`)
    }
  }
}
```

### 테스트 레벨별 가이드

#### Unit Tests (entities, shared/lib)
```typescript
// jest 환경: node
// 목적: 비즈니스 로직 검증
// 커버리지 목표: 90%

describe('User Entity', () => {
  it('should create user with valid data', () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com'
    }
    
    const user = new User(userData)
    
    expect(user.username).toBe('testuser')
    expect(user.email).toBe('test@example.com')
  })
})
```

#### Component Tests (features, widgets)
```typescript
// jest 환경: jsdom
// 목적: UI 컴포넌트 동작 검증
// 커버리지 목표: 85%

describe('SignupForm', () => {
  it('should display validation error for invalid email', async () => {
    render(<SignupForm />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /signup/i })
    
    await userEvent.type(emailInput, 'invalid-email')
    await userEvent.click(submitButton)
    
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })
})
```

#### E2E Tests (전체 사용자 여정)
```typescript
// cypress
// 목적: 실제 사용자 시나리오 검증
// 범위: 핵심 유저 플로우만

describe('User Journey: Signup to Video Feedback', () => {
  it('complete user workflow', () => {
    cy.visit('/')
    
    // 회원가입
    cy.signup({
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!'
    })
    
    // 비디오 업로드
    cy.uploadVideo('cypress/fixtures/test-video.mp4')
    cy.selectVideoQuality('1080p')
    cy.startVideoProcessing()
    cy.waitForVideoProcessing()
    
    // 피드백 제출
    cy.submitVideoFeedback({
      rating: 4,
      comment: '품질이 좋습니다',
      category: 'quality'
    })
    
    // 접근성 검증
    cy.checkA11yWithReport()
    
    // 성능 측정
    cy.measurePerformance()
  })
})
```

## 🔒 품질 게이트

### Pre-commit 검사 (자동)
```bash
# 다음 항목들이 자동으로 실행됩니다:
# 1. 린트 및 포맷 검사
# 2. TypeScript 타입 검사  
# 3. 테스트 없는 코드 차단
# 4. 관련 테스트 실행
```

### Pre-push 검사 (자동)
```bash
# Push 전 다음 항목들이 실행됩니다:
# 1. 전체 테스트 스위트 실행
# 2. 커버리지 임계값 검증 (80% 이상)
# 3. 프로덕션 빌드 검증
```

### CI/CD 품질 게이트 (GitHub Actions)

#### 필수 통과 조건
- [ ] 린트 및 포맷 검사
- [ ] TypeScript 타입 검사  
- [ ] 단위 테스트 (커버리지 80% 이상)
- [ ] Mutation Testing (변경된 파일만, 75% 이상)
- [ ] 성능 테스트 (Core Web Vitals)
- [ ] 번들 사이즈 검사 (1MB 미만)
- [ ] API 계약 테스트 (Pact)
- [ ] E2E 테스트 (핵심 시나리오)
- [ ] 접근성 테스트 (WCAG 2.1 AA)
- [ ] 보안 스캔 (CodeQL)

## 📊 성능 모니터링

### Core Web Vitals 기준
- **LCP (Largest Contentful Paint)**: < 2.5초
- **INP (Interaction to Next Paint)**: < 200ms  
- **CLS (Cumulative Layout Shift)**: < 0.1

### 번들 사이즈 제한
- 메인 앱 번들: 150KB
- 개별 페이지: 50-120KB
- 전체 번들: 1MB
- 프레임워크 청크: 200KB
- CSS: 20KB

### 실행 방법
```bash
# 성능 모니터링 실행
pnpm perf:monitor

# Lighthouse 감사
pnpm perf:lighthouse

# 번들 분석
pnpm perf:analyze
```

## 🔍 API 계약 검증

### MSW 기반 개발 모킹
```typescript
// 개발 중 자동 활성화
// src/shared/api/mocks/browser.ts에서 관리
```

### Pact 기반 계약 테스트
```bash
# 소비자 계약 테스트 실행
pnpm contract:test

# Pact 계약 발행 (CI용)
pnpm contract:publish
```

### Zod 런타임 검증
```typescript
// API 호출 시 자동 검증
import { safeApiCall } from '@/shared/lib/api-contract'

const result = await safeApiCall('auth', 'signup', requestData, apiFetcher)
// 자동으로 요청/응답 스키마 검증됨
```

## ♿ 접근성 품질 보증

### WCAG 2.1 AA 기준 준수
- 색상 대비 4.5:1 이상
- 키보드 네비게이션 지원
- 스크린 리더 호환성
- Focus 관리

### 자동화된 접근성 테스트
```bash
# Jest 기반 접근성 테스트
pnpm accessibility:test

# Axe 기반 실시간 검사
pnpm accessibility

# Cypress E2E 접근성 검사 (자동 포함)
pnpm e2e
```

### 접근성 유틸리티 사용
```typescript
import { accessibility, announceToScreenReader } from '@/shared/lib/accessibility'

// 색상 대비 검사
const contrast = accessibility.checkContrast('#000000', '#FFFFFF')

// 스크린 리더 알림
announceToScreenReader('폼이 성공적으로 제출되었습니다', 'assertive')
```

## 🧬 Mutation Testing

### 실행 방법
```bash
# 전체 Mutation Testing (시간 소요)
pnpm test:mutation

# 증분 Mutation Testing (변경된 파일만)
pnpm test:mutation:incremental
```

### 목표 점수
- **전체**: 75% 이상
- **핵심 도메인 (entities)**: 80% 이상
- **features**: 75% 이상

## 🚫 Flaky Test 제로 정책

### Flaky Test 감지
```bash
# 전체 테스트에서 flaky 감지
pnpm test:flaky

# 특정 테스트 패턴, 10회 실행
pnpm test:flaky detect "SignupForm" 10

# 수정 제안 받기
pnpm test:flaky repair
```

### 자동 격리 시스템
- Flaky 테스트 감지 시 자동 격리
- CI에서 Flaky 테스트 감지 시 빌드 실패
- 격리된 테스트는 별도 실행 가능

## 📈 품질 메트릭 대시보드

### 대시보드 생성
```bash
# 품질 대시보드 생성
pnpm quality:dashboard
```

### 생성되는 리포트
- `reports/dashboard/quality-dashboard.html` - HTML 대시보드
- `reports/dashboard/quality-metrics.json` - JSON 메트릭
- `reports/performance/` - 성능 리포트
- `reports/mutation/` - Mutation 리포트

### 추적되는 메트릭
- 테스트 커버리지 (라인, 함수, 브랜치)
- Mutation Score (테스트 품질)
- 성능 점수 (Lighthouse)
- Bundle 크기
- 접근성 점수
- Flaky 테스트 수
- 코드 품질 지표

## 🎯 품질 목표 및 KPI

### 테스트 품질
- [ ] 전체 커버리지: 80% 이상
- [ ] entities 커버리지: 90% 이상  
- [ ] Mutation Score: 75% 이상
- [ ] Flaky Test Rate: 1% 미만

### 성능 품질
- [ ] Lighthouse Performance: 90점 이상
- [ ] LCP: 2.5초 이하
- [ ] INP: 200ms 이하
- [ ] CLS: 0.1 이하
- [ ] Bundle Size: 1MB 이하

### 코드 품질
- [ ] TypeScript 엄격 모드 준수
- [ ] ESLint 에러: 0개
- [ ] 순환 의존성: 0개
- [ ] 보안 취약점: 0개 (medium 이상)

### 접근성 품질
- [ ] WCAG 2.1 AA 준수
- [ ] Axe 위반사항: 0개
- [ ] 키보드 네비게이션: 100%
- [ ] 색상 대비: 4.5:1 이상

## 🔧 트러블슈팅

### 일반적인 문제

#### 1. 커버리지 임계값 미달
```bash
# 현재 커버리지 확인
pnpm test:coverage

# 커버리지가 낮은 파일 확인
open coverage/lcov-report/index.html
```

#### 2. Flaky Test 감지
```bash
# Flaky 테스트 분석
pnpm test:flaky

# 격리된 테스트 실행
pnpm test:flaky quarantine
```

#### 3. 성능 기준 미달
```bash
# 성능 상세 분석
pnpm perf:monitor

# 번들 분석
pnpm perf:analyze
```

#### 4. 접근성 위반
```bash
# 상세 접근성 테스트
pnpm accessibility:test

# 개발 서버에서 실시간 검사
pnpm accessibility
```

### 환경별 설정

#### 개발 환경
- MSW 자동 활성화
- 성능 모니터링 비활성화
- Hot reload 지원

#### 테스트 환경  
- MSW 서버 모드
- 모든 외부 의존성 모킹
- 결정론적 실행 보장

#### 프로덕션 환경
- 모든 품질 게이트 활성화
- 성능 모니터링 활성화
- 에러 추적 활성화

## 📚 추가 자료

### 관련 문서
- [CLAUDE.md](./CLAUDE.md) - 프로젝트 전체 가이드라인
- [jest.config.js](./jest.config.js) - 테스트 설정
- [cypress.config.ts](./cypress.config.ts) - E2E 테스트 설정
- [stryker.conf.mjs](./stryker.conf.mjs) - Mutation Testing 설정

### 유용한 명령어
```bash
# 전체 품질 검사 (CI와 동일)
pnpm ci:quality

# 야간 배치용 전체 분석
pnpm quality:full && pnpm quality:dashboard

# 개발자 일일 체크리스트
pnpm test:coverage && pnpm lint && pnpm build
```

---

**🎯 목표: 배포 차단 제로, 프로덕션 버그 제로, 사용자 만족도 최대화**