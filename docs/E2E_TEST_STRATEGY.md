# VideoPlanet E2E 테스트 전략 및 실행 가이드

**QA Lead Grace** | **배포 환경 전용 E2E 테스트 전략**  
**버전**: 1.0 | **작성일**: 2025-08-27 | **목적**: 배포된 시스템의 실제 사용자 경험 검증

---

## I. 테스트 전략 개요

### 배포 환경 정보
- **프론트엔드**: https://vridge-xyc331ybx-vlanets-projects.vercel.app (401 인증 보호)
- **백엔드**: https://api.vlanet.net (완전 작동, API 테스트 100% 통과)
- **테스트 철학**: TDD Red-Green-Refactor 사이클 적용

### 품질 게이트 기준
| 테스트 레벨 | 커버리지 목표 | 실패 허용률 | 실행 주기 |
|------------|--------------|------------|----------|
| **Smoke Tests** | 100% | 0% | 배포 후 즉시 |
| **Critical Path** | 100% | 0% | 매일 |
| **User Journey** | 85% | < 5% | 주 2회 |
| **API Integration** | 100% | 0% | 매일 |

---

## II. 테스트 아키텍처

### Test Pyramid 구현

```
             🔺 E2E Tests (10%)
            Critical Path Tests
           User Journey Tests
          /                    \
         /    Integration (20%)   \
        /      API Tests          \
       /                          \
      /        Unit (70%)          \
     /      Component Tests        \
    /________________________\
```

### 테스트 분류 및 파일 구조

```
tests/e2e/
├── critical-path.spec.ts           # 핵심 비즈니스 플로우 (0% 실패 허용)
├── smoke-test-production.spec.ts   # 배포 후 즉시 실행 (< 2분)
├── user-journey-production.spec.ts # 실제 사용자 시나리오 (85% 성공률)
├── api-only.spec.ts               # API 백엔드 검증 (100% 성공)
├── user-journey.spec.ts           # 기존 테스트 (호환성)
└── helpers/
    ├── production-test-utils.ts    # 배포 환경 전용 유틸리티
    ├── global-setup.ts            # 테스트 환경 사전 점검
    └── global-teardown.ts         # 결과 분석 및 정리
```

---

## III. 실행 계획

### Phase 1: RED (현재 상태 검증) ✅

**목적**: 배포된 시스템의 현재 상태를 있는 그대로 검증

**실행 명령**:
```bash
# 1. 배포 환경 접근성 확인
npx playwright test --project=production-smoke-tests

# 2. 핵심 경로 현재 상태 검증  
npx playwright test --project=critical-path

# 3. API 백엔드 상태 확인
npx playwright test --project=api-tests
```

**예상 결과**: 
- 인증 보호로 인한 일부 테스트 실패 (예상됨)
- API 백엔드는 100% 통과 (MEMORY.md 기록 기준)
- 프론트엔드 기본 접근성은 확보됨

### Phase 2: GREEN (점진적 기능 구현)

**목적**: 실패하는 테스트를 하나씩 통과시키며 기능 완성도 확인

**실행 전략**:
1. **인증 시스템 우선** - 로그인/회원가입 구현 완료 시
2. **대시보드 접근** - 인증 후 대시보드 렌더링 확인
3. **네비게이션** - 메인 기능 간 이동 가능성 확인
4. **핵심 기능** - 프로젝트 관리, 캘린더, 피드백 시스템

```bash
# 단계별 테스트 실행
npx playwright test --project=critical-path --grep "인증"
npx playwright test --project=user-journey --grep "대시보드" 
npx playwright test --project=user-journey --grep "네비게이션"
```

### Phase 3: REFACTOR (최적화 및 안정화)

**목적**: 테스트 안정성 확보 및 성능 최적화

**개선 영역**:
- 플래키 테스트 제거
- 실행 시간 단축
- 에러 복구 로직 강화
- CI/CD 파이프라인 통합

---

## IV. 실행 명령어 가이드

### 기본 실행 명령어

```bash
# 전체 E2E 테스트 실행 (순차적)
npm run test:e2e:all

# 빠른 검증 (Smoke Tests만)
npm run test:e2e:smoke

# 핵심 경로만 집중 테스트
npm run test:e2e:critical

# API 테스트만 실행
npm run test:e2e:api

# 사용자 여정 테스트
npm run test:e2e:journey

# 모바일 버전 테스트
npm run test:e2e:mobile
```

### package.json 스크립트 추가

```json
{
  "scripts": {
    "test:e2e:all": "playwright test",
    "test:e2e:smoke": "playwright test --project=production-smoke-tests",
    "test:e2e:critical": "playwright test --project=critical-path", 
    "test:e2e:api": "playwright test --project=api-tests",
    "test:e2e:journey": "playwright test --project=user-journey",
    "test:e2e:mobile": "playwright test --project=mobile-critical",
    "test:e2e:report": "playwright show-report",
    "test:e2e:debug": "playwright test --debug --project=critical-path"
  }
}
```

### 고급 실행 옵션

```bash
# 특정 테스트만 실행
npx playwright test --grep "로그인"

# 실패한 테스트만 재실행  
npx playwright test --last-failed

# 브라우저 UI로 테스트 관찰
npx playwright test --ui

# 디버그 모드로 단계별 실행
npx playwright test --debug --project=critical-path

# 헤드리스 해제 (브라우저 창 표시)
npx playwright test --headed

# 특정 파일만 실행
npx playwright test critical-path.spec.ts
```

---

## V. CI/CD 파이프라인 통합

### GitHub Actions 워크플로우

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 9 * * *' # 매일 오전 9시

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-suite: 
          - production-smoke-tests
          - api-tests  
          - critical-path
          - user-journey

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install Playwright browsers
      run: npx playwright install --with-deps
      
    - name: Run E2E tests
      run: npx playwright test --project=${{ matrix.test-suite }}
      
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: e2e-results-${{ matrix.test-suite }}
        path: |
          playwright-report/
          test-results/
          
    - name: Notify Slack on failure
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        text: E2E 테스트 실패: ${{ matrix.test-suite }}
```

### 품질 게이트 설정

```yaml
  quality-gate:
    needs: e2e-tests
    runs-on: ubuntu-latest
    if: always()
    
    steps:
    - name: Check E2E test results
      run: |
        # Smoke Tests는 100% 성공해야 함
        if [[ "${{ needs.e2e-tests.outputs.smoke-success-rate }}" != "100" ]]; then
          echo "❌ Smoke Tests 실패 - 배포 중단"
          exit 1
        fi
        
        # Critical Path는 100% 성공해야 함  
        if [[ "${{ needs.e2e-tests.outputs.critical-success-rate }}" != "100" ]]; then
          echo "❌ Critical Path 실패 - 배포 중단" 
          exit 1
        fi
        
        # User Journey는 85% 이상 성공해야 함
        if (( $(echo "${{ needs.e2e-tests.outputs.journey-success-rate }} < 85" | bc -l) )); then
          echo "❌ User Journey 성공률 85% 미만 - 경고"
          # 경고는 하지만 배포는 계속
        fi
        
        echo "✅ 모든 품질 게이트 통과"
```

---

## VI. 트러블슈팅 가이드

### 일반적인 문제 및 해결책

**1. 네트워크 타임아웃**
```bash
# 타임아웃 증가하여 재실행
npx playwright test --timeout=120000
```

**2. 인증 관련 실패**
```bash
# 인증 단계별 디버그
npx playwright test --grep "인증" --debug
```

**3. 요소를 찾을 수 없음**
```bash
# 요소 선택자 디버그 모드
npx playwright test --debug --pause-on-failure
```

**4. CI에서만 실패하는 경우**
```bash  
# 로컬에서 CI 환경 시뮬레이션
CI=true npx playwright test --project=critical-path
```

### 로그 및 디버깅

**상세 로그 활성화**:
```bash
DEBUG=pw:api npx playwright test
```

**실행 추적 생성**:
```bash
npx playwright test --trace=on
```

**비디오 녹화 활성화**:
```bash
npx playwright test --video=on
```

---

## VII. 성공 지표 및 KPI

### 테스트 성공률 목표
- **Smoke Tests**: 100% (배포 차단 기준)
- **Critical Path**: 100% (배포 차단 기준) 
- **User Journey**: 85% (경고 기준)
- **API Tests**: 100% (이미 달성)

### 성능 지표
- **평균 실행 시간**: < 10분 (전체 E2E 스위트)
- **Smoke Test 실행 시간**: < 2분
- **플래키 테스트 비율**: < 1%
- **평균 페이지 로딩 시간**: < 3초

### 품질 지표
- **코드 커버리지**: 85% (E2E로 커버되는 영역)
- **사용자 여정 완료율**: 90% (핵심 플로우)
- **에러 복구 성공률**: 95%
- **모바일 호환성**: 100% (핵심 기능)

---

## VIII. 향후 계획

### 단기 목표 (1-2주)
1. ✅ **RED Phase 완료** - 현재 상태 검증
2. 🔄 **GREEN Phase 진행** - 핵심 기능 구현 검증 
3. ⏳ **CI/CD 파이프라인 통합**

### 중기 목표 (1개월)
1. **REFACTOR Phase** - 테스트 안정화 및 최적화
2. **성능 테스트 추가** - 로딩 시간, 응답성 검증
3. **접근성 테스트 강화** - WCAG 2.1 AA 준수 검증

### 장기 목표 (3개월)  
1. **Visual Regression Testing** - UI 일관성 자동 검증
2. **Load Testing 통합** - 사용자 부하 상황 시뮬레이션
3. **Cross-browser Testing** - Firefox, Safari 지원 검증

---

**마지막 업데이트**: 2025-08-27  
**담당자**: Grace (QA Lead)  
**검토자**: 개발팀 전체