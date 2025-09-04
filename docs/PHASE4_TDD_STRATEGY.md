# Phase 4 TDD 전략 및 E2E 테스트 계획

## 🎯 목표
- **핵심 기능**: 90% 이상 테스트 커버리지
- **전체 프로젝트**: 70% 이상 테스트 커버리지
- **E2E 테스트**: 주요 사용자 여정 100% 커버
- **성능 메트릭**: Core Web Vitals 달성

## 📊 현재 상황 분석

### 완료된 모듈 (Phase 2 성과)
| 모듈 | 테스트 수 | 통과율 | 커버리지 | 상태 |
|------|----------|--------|----------|------|
| **RBAC System** | 29개 | 100% | 100% | ✅ 완료 |
| **LoadingSpinner** | 22개 | 100% | 100% | ✅ 완료 |
| **ConflictDetection** | 5개 | 100% | 100% | ✅ 완료 |
| **VideoPlayer** | - | - | 90% | ✅ 접근성 달성 |

### Phase 4 대상 모듈
| 모듈 | 예상 테스트 | 현재 상태 | 우선순위 | 복잡도 |
|------|-------------|----------|----------|---------|
| **VideoFeedback** | 90개 | TDD Red | 🔥 Critical | High |
| **VideoPlanning** | 85개 | TDD Red | 🔥 Critical | High |
| **Dashboard** | 65개 | TDD Red | ⚠️ High | Medium |
| **Calendar** | 45개 | 부분 완료 | ⚠️ High | Medium |
| **SideBar** | 25개 | 부분 완료 | 📋 Medium | Low |
| **API Layer** | 40개 | 미구현 | 📋 Medium | Medium |

## 🚀 Phase 4 실행 전략

### 1단계: TDD Green 환경 구축 (1-2일)
```bash
# 타임아웃 문제 해결
- act() 래핑 완전 구현
- MSW 핸들러 완전 구현
- 테스트 환경 최적화 (조건부 렌더링)
- Vitest 설정 최적화
```

### 2단계: 핵심 기능 90% 달성 (3-5일)
**우선순위 1: VideoFeedback (90개 → 81개 통과)**
- 비디오 플레이어 핵심 기능 (재생/정지/속도조절)
- 타임스탬프 댓글 시스템
- 피드백 상태 관리
- 접근성 완전 구현

**우선순위 2: VideoPlanning (85개 → 76개 통과)**
- 칸반 보드 드래그앤드롭
- 대본 에디터 자동저장
- 실시간 협업 시스템
- 진행률 추적

**우선순위 3: Dashboard (65개 → 58개 통과)**
- 프로젝트 현황 카드
- 활동 피드 시스템
- 통계 위젯

### 3단계: 전체 70% 달성 (2-3일)
- Calendar 위젯 완성
- SideBar 접근성 강화
- API Layer 통합 테스트
- 공통 컴포넌트 최적화

## 🧪 E2E 테스트 시나리오 설계

### 핵심 사용자 여정 (Critical Path)

#### 1. 영상 피드백 워크플로우
```gherkin
Feature: 영상 피드백 시스템
  Scenario: 영상 검토 및 댓글 작성
    Given 사용자가 영상 피드백 페이지에 접속한다
    When 영상을 재생하고 특정 시점에서 일시정지한다
    And 영상 화면을 클릭하여 댓글을 추가한다
    And 피드백 우선순위를 '긴급'으로 설정한다
    Then 타임라인에 빨간색 마커가 표시된다
    And 댓글이 해당 시간에 정확히 배치된다
    And 스크린 리더가 "15초 지점의 긴급 댓글" 읽는다
```

#### 2. 영상 기획 협업 워크플로우
```gherkin
Feature: 영상 기획 협업 시스템
  Scenario: 기획 카드 드래그앤드롭 이동
    Given 사용자가 영상 기획 보드에 접속한다
    When '컨셉 기획' 단계의 카드를 드래그한다
    And '대본 작성' 단계로 이동한다
    Then 카드가 새 단계에 배치된다
    And 진행률이 자동 업데이트된다
    And 팀원들에게 실시간 알림이 전송된다
```

#### 3. 전체 프로젝트 생성 및 관리
```gherkin
Feature: 프로젝트 생성 및 관리
  Scenario: 신규 프로젝트 생성부터 완료까지
    Given 사용자가 대시보드에 접속한다
    When 새 프로젝트를 생성한다
    And 영상 기획 단계를 설정한다
    And 팀원을 초대하고 권한을 부여한다
    And 기획 → 촬영 → 편집 → 검토 단계를 진행한다
    Then 각 단계별 진행률이 정확히 표시된다
    And 권한에 따른 기능 접근이 제어된다
```

### E2E 테스트 기술 스택

#### Playwright 설정
```typescript
// playwright.config.ts
export default {
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
    { name: 'mobile', use: devices['iPhone 13'] },
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI
  }
}
```

#### 접근성 E2E 테스트
```typescript
// e2e/accessibility.spec.ts
test('영상 피드백 시스템 접근성', async ({ page }) => {
  await page.goto('/video-feedback/1');
  
  // 키보드 네비게이션
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-testid="video-player"]')).toBeFocused();
  
  // 스크린 리더 테스트
  const videoElement = page.locator('video');
  await expect(videoElement).toHaveAttribute('aria-label', '영상 플레이어');
  
  // 색상 대비 검사 (axe-core)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

## 🎯 성능 메트릭 측정 시스템

### Core Web Vitals 달성 목표
```typescript
// performance/web-vitals.spec.ts
const PERFORMANCE_THRESHOLDS = {
  LCP: 2500,  // Largest Contentful Paint
  FID: 100,   // First Input Delay  
  CLS: 0.1,   // Cumulative Layout Shift
  FCP: 1800,  // First Contentful Paint
  TTFB: 600   // Time to First Byte
};
```

### 성능 측정 도구 통합

#### 1. Lighthouse CI
```yaml
# .github/workflows/performance.yml
- name: Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

#### 2. WebPageTest Integration
```javascript
// performance/webpagetest.js
const WebPageTest = require('webpagetest');
const wpt = new WebPageTest('www.webpagetest.org', process.env.WPT_API_KEY);

const testPages = [
  'http://localhost:3000/',
  'http://localhost:3000/dashboard',
  'http://localhost:3000/video-feedback/1',
  'http://localhost:3000/video-planning/1'
];

testPages.forEach(url => {
  wpt.runTest(url, {
    location: 'Seoul:Chrome',
    connectivity: '4G',
    runs: 3,
    video: true
  });
});
```

#### 3. 실시간 성능 모니터링
```typescript
// lib/performance-monitor.ts
export class PerformanceMonitor {
  private observer: PerformanceObserver;
  
  constructor() {
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'navigation') {
          this.reportNavigationTiming(entry);
        }
        if (entry.entryType === 'measure') {
          this.reportCustomMetrics(entry);
        }
      });
    });
    
    this.observer.observe({ 
      entryTypes: ['navigation', 'measure', 'paint'] 
    });
  }
  
  measureVideoLoadTime(videoId: string) {
    performance.mark(`video-start-${videoId}`);
    // 비디오 로딩 완료 시
    performance.mark(`video-end-${videoId}`);
    performance.measure(
      `video-load-${videoId}`,
      `video-start-${videoId}`,
      `video-end-${videoId}`
    );
  }
}
```

## 🔧 CI/CD 품질 게이트 설정

### GitHub Actions 통합
```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates

on: [pull_request]

jobs:
  test-coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests with coverage
        run: npm run test:coverage
      
      - name: Check coverage thresholds
        run: |
          COVERAGE=$(npm run test:coverage:json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 70" | bc -l) )); then
            echo "Coverage $COVERAGE% is below threshold 70%"
            exit 1
          fi
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
  
  performance-budget:
    runs-on: ubuntu-latest
    steps:
      - name: Lighthouse CI
        run: |
          npm run build
          npm run start:ci &
          npx wait-on http://localhost:3000
          npx lhci autorun
  
  accessibility-audit:
    runs-on: ubuntu-latest
    steps:
      - name: Run axe-core tests
        run: npm run test:a11y
      
      - name: Check WCAG compliance
        run: npm run audit:wcag
```

### 테스트 커버리지 임계값
```json
// vitest.config.ts
export default {
  test: {
    coverage: {
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 90,
          statements: 90
        },
        // 핵심 기능 더 높은 기준
        'widgets/VideoFeedback/**': {
          lines: 95,
          functions: 90
        },
        'features/rbac/**': {
          lines: 95,
          functions: 95
        }
      }
    }
  }
}
```

## 📅 Phase 4 실행 타임라인

### Week 1: TDD Green 환경 구축
- **Day 1-2**: VideoFeedback 타임아웃 문제 해결
- **Day 3-4**: VideoPlanning TDD Green 달성
- **Day 5-7**: Dashboard/Calendar 기본 테스트 통과

### Week 2: 핵심 기능 90% 달성
- **Day 8-10**: VideoFeedback 90개 → 81개 통과
- **Day 11-12**: VideoPlanning 85개 → 76개 통과
- **Day 13-14**: Dashboard 65개 → 58개 통과

### Week 3: E2E 테스트 및 성능 최적화
- **Day 15-16**: Playwright E2E 테스트 구현
- **Day 17-18**: 성능 메트릭 측정 시스템 구축
- **Day 19-21**: CI/CD 품질 게이트 통합

## 🎯 성공 기준

### 정량적 목표
- [ ] 핵심 기능 테스트 커버리지 90% 이상
- [ ] 전체 프로젝트 테스트 커버리지 70% 이상  
- [ ] E2E 테스트 주요 시나리오 100% 커버
- [ ] LCP < 2.5초, FID < 100ms, CLS < 0.1
- [ ] WCAG 2.1 AA 준수율 100%

### 정성적 목표
- [ ] TDD Red→Green→Refactor 사이클 완전 구현
- [ ] MSW 기반 API 모킹 시스템 안정화
- [ ] 접근성 우선 설계 문화 정착
- [ ] 성능 budgets 기반 지속적 모니터링
- [ ] 브랜치 보호 규칙 및 품질 게이트 운영

---

**마지막 업데이트**: 2025-08-27  
**담당자**: QA Lead Grace  
**상태**: Phase 4 실행 준비 완료