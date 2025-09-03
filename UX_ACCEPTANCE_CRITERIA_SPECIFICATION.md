# UX 수용 기준 명세서 (UX Acceptance Criteria Specification)
## 신규 구현 컴포넌트 품질 검증 기준

**문서 버전**: 1.0.0  
**작성일**: 2025-09-03  
**검증 대상**: Global Submenu, Notification Center, Planning Wizard  
**성능 예산 기준**: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1

---

## 🎯 개요 (Overview)

본 문서는 WCAG 2.1 AA 준수, Nielsen 사용성 히유리스틱, 성능 예산을 기반으로 한 **테스트 가능한 UX 수용 기준**을 정의합니다. 모든 기준은 자동화된 테스트 또는 구조화된 수동 검증으로 측정 가능합니다.

### 완료 조건 (Definition of Done)
- ✅ WCAG 2.1 AA 준수 100%
- ✅ 사용성 히유리스틱 위반 0건  
- ✅ INP 200ms 예산 준수
- ✅ 테스트 가능한 UX 명세서 완성

---

## 📋 1. Global Submenu UX 수용 기준

### 1.1 WCAG 2.1 AA 접근성 기준

#### ✅ 자동화된 접근성 테스트 시나리오
```gherkin
Feature: Global Submenu 접근성 검증

Scenario: 키보드 전용 네비게이션
  Given 사용자가 키보드만 사용한다
  When Global Submenu가 열린 상태일 때
  Then Tab 키로 모든 메뉴 항목 순환 가능해야 함
  And Arrow Up/Down 키로 메뉴 항목 간 이동 가능해야 함
  And Escape 키로 메뉴 닫기 및 트리거로 포커스 복원 가능해야 함
  And Home/End 키로 첫/마지막 항목 이동 가능해야 함

Scenario: 스크린 리더 지원
  Given 스크린 리더가 활성화된 상태
  When Global Submenu를 조작할 때  
  Then role="menu"와 role="menuitem"이 올바르게 읽혀야 함
  And aria-orientation="vertical"이 인식되어야 함
  And 각 메뉴 항목의 레이블이 명확히 읽혀야 함

Scenario: 포커스 표시 검증
  Given 키보드 네비게이션을 사용할 때
  Then 현재 포커스된 요소에 2px 이상의 포커스 링이 표시되어야 함
  And 포커스 링의 색상 대비비가 3:1 이상이어야 함
```

#### ⚠️ 수동 검증 필요 항목
- **색상 대비비 측정**: `text-gray-700` vs 흰 배경 = 4.5:1 이상 확인
- **투명도 영향**: `opacity-90` 적용 시에도 최소 대비비 유지 확인
- **포커스 표시 개선**: 현재 `focus:ring-0` 제거 필요

### 1.2 사용성 히유리스틱 평가

#### Nielsen 10가지 원칙 검증 체크리스트
- [ ] **1. 시스템 상태 가시성**: 메뉴 열림/닫힘 상태 명확히 표시
- [ ] **2. 실제 세계와의 일치**: 메뉴 항목 순서가 논리적이고 직관적  
- [ ] **3. 사용자 제어와 자유**: Escape 키로 언제든 메뉴 닫기 가능
- [ ] **4. 일관성과 표준**: 다른 드롭다운 메뉴와 동일한 키보드 패턴
- [ ] **5. 에러 방지**: 잘못된 키 입력 시에도 안전하게 처리
- [ ] **6. 인식보다 기억**: 시각적 단서로 메뉴 구조 인식 가능
- [ ] **7. 사용 유연성과 효율성**: 마우스/키보드 모두 지원
- [ ] **8. 미학적 최소주의**: 90% 투명도로 배경 방해 최소화
- [ ] **9. 에러 인식과 복구**: (해당 없음 - 메뉴 UI)
- [ ] **10. 도움말과 문서**: aria-label을 통한 문맥 제공

### 1.3 성능 및 인터랙션 품질

#### INP (Interaction to Next Paint) 검증
```javascript
// 성능 측정 테스트 시나리오
describe('Global Submenu INP Performance', () => {
  it('메뉴 열기 인터랙션이 200ms 이하여야 함', async () => {
    const { user } = renderWithPerformance(<GlobalSubmenu />)
    
    const startTime = performance.now()
    await user.click(screen.getByRole('button', { name: /메뉴 열기/ }))
    const endTime = performance.now()
    
    expect(endTime - startTime).toBeLessThan(200)
    expect(screen.getByRole('menu')).toBeVisible()
  })

  it('키보드 네비게이션 응답성이 100ms 이하여야 함', async () => {
    // Arrow key 응답 시간 측정
    const response = await measureINP(() => {
      fireEvent.keyDown(menuItem, { key: 'ArrowDown' })
    })
    expect(response.inp).toBeLessThan(100)
  })
})
```

---

## 📋 2. Notification Center UX 수용 기준

### 2.1 알림 압도감(Notification Overwhelm) 방지 UX

#### ✅ 자동화된 테스트 시나리오
```gherkin
Feature: Notification Center 압도감 방지

Scenario: 알림 개수 제한 검증
  Given 사용자에게 15개의 알림이 있을 때
  When Notification Drawer를 열면
  Then 최대 10개의 알림만 표시되어야 함
  And "+5 more notifications" 인디케이터가 표시되어야 함

Scenario: 시각적 우선순위 구분
  Given 읽지 않은 알림과 읽은 알림이 혼재할 때
  When Notification Drawer를 확인하면
  Then 읽지 않은 알림이 blue-50 배경으로 구분되어야 함
  And 왼쪽 파란색 보더(border-l-4)가 표시되어야 함
  And 읽지 않은 개수가 bell 아이콘에 badge로 표시되어야 함

Scenario: 실시간 업데이트 성능 영향 최소화
  Given 알림이 실시간으로 업데이트될 때
  When 30초 이내에 새 알림 5개가 도착하면
  Then API 호출이 최대 2회를 초과하지 않아야 함
  And 기존 알림 목록의 스크롤 위치가 유지되어야 함
```

### 2.2 접근성 특화 기준

#### Alt+N 키보드 단축키 검증
```javascript
describe('Notification Center Accessibility', () => {
  it('Alt+N 단축키로 알림 센터 토글', async () => {
    const { user } = render(<NotificationCenter userId="test" />)
    
    // Alt+N 키 조합
    await user.keyboard('{Alt>}n{/Alt}')
    
    expect(screen.getByRole('dialog', { name: /notifications/i })).toBeVisible()
    
    // 다시 Alt+N으로 닫기
    await user.keyboard('{Alt>}n{/Alt}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('포커스 트랩이 올바르게 작동', async () => {
    const { user } = render(<NotificationCenter userId="test" />)
    await user.keyboard('{Alt>}n{/Alt}')
    
    const dialog = screen.getByRole('dialog')
    const focusableElements = within(dialog).getAllByRole('button')
    
    // Tab 키로 순환
    await user.tab()
    expect(focusableElements[0]).toHaveFocus()
    
    // 마지막 요소에서 Tab 시 첫 번째로 돌아가기
    focusableElements[focusableElements.length - 1].focus()
    await user.tab()
    expect(focusableElements[0]).toHaveFocus()
  })
})
```

### 2.3 알림 UX 품질 지표

#### 측정 가능한 UX KPI
- **알림 압도감 지수**: 동시 표시 알림 ≤ 10개
- **인지 부하 감소**: 읽지 않은 알림 우선 표시율 100%
- **접근성 완료율**: Alt+N 단축키 성공률 ≥ 95%
- **INP 성능**: 알림 클릭 응답 시간 ≤ 150ms

---

## 📋 3. Planning Wizard UX 수용 기준

### 3.1 다단계 플로우 UX 안전성

#### ✅ 자동화된 테스트 시나리오
```gherkin
Feature: Planning Wizard 플로우 안전성

Scenario: 데이터 손실 방지
  Given 사용자가 1단계에서 스토리 개요를 입력했을 때
  When 브라우저를 새로고침하거나 다른 페이지로 이동하면
  Then "저장되지 않은 변경사항이 있습니다" 경고가 표시되어야 함
  And 사용자 확인 후에만 페이지 이동이 허용되어야 함

Scenario: 단계별 진행률 정확성
  Given Planning Wizard가 로드되었을 때
  Then 진행률이 0%부터 시작해야 함
  When 1단계 완료 후
  Then 진행률이 33%로 표시되어야 함
  When 2단계 완료 후
  Then 진행률이 67%로 표시되어야 함
  When 3단계 완료 후
  Then 진행률이 100%로 표시되어야 함

Scenario: 되돌아가기 UX 안전성
  Given 사용자가 3단계에 있을 때
  When 1단계 버튼을 클릭하면
  Then 기존 데이터 유지 확인 다이얼로그가 표시되어야 함
  And 사용자 확인 후에만 1단계로 이동해야 함
  And 기존에 생성된 데이터가 보존되어야 함
```

### 3.2 인지 부하 최소화

#### 정보 아키텍처 검증 체크리스트
- [ ] **현재 위치 명확성**: 활성 단계가 시각적으로 구분됨 (blue-500 배경)
- [ ] **진행 방향 예측성**: "다음 단계" 버튼 레이블이 명확함
- [ ] **전체 맥락 제공**: 3단계 전체 플로우가 상단에 표시됨
- [ ] **작업 완료 기준**: 각 단계별 완료 조건이 명시됨

#### 폼 검증 UX 품질
```javascript
describe('Planning Wizard Form Validation UX', () => {
  it('실시간 검증 피드백이 적절히 제공됨', async () => {
    const { user } = render(<PlanningWizard projectId="test" />)
    
    const outlineField = screen.getByLabelText(/스토리 개요/)
    
    // 필수 필드 비워두고 다음 단계 시도
    await user.click(screen.getByRole('button', { name: /다음 단계/ }))
    
    // 에러 메시지가 role="alert"로 표시되어야 함
    expect(screen.getByRole('alert')).toHaveTextContent(/스토리 개요를 입력해주세요/)
    
    // 올바른 값 입력 시 에러 제거
    await user.type(outlineField, '흥미진진한 모험 이야기')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('AI 생성 중 사용자 피드백이 적절함', async () => {
    const { user } = render(<PlanningWizard projectId="test" />)
    
    // 폼 작성 후 AI 생성 시작
    await fillValidForm()
    await user.click(screen.getByRole('button', { name: /다음 단계/ }))
    
    // 로딩 상태 표시 확인
    expect(screen.getByText(/AI가 스토리를 생성 중입니다/)).toBeVisible()
    expect(screen.getByRole('button', { name: /생성 중/ })).toBeDisabled()
    
    // 스피너 애니메이션 확인
    expect(screen.getByTestId('loading-spinner')).toHaveClass('animate-spin')
  })
})
```

### 3.3 Planning Wizard 성능 예산

#### AI 응답 대기 시간 UX
- **1단계 (스토리 생성)**: 최대 15초, 5초 후 진행상황 표시
- **2단계 (4막 구조)**: 최대 20초, 타임아웃 시 재시도 옵션
- **3단계 (12샷 리스트)**: 최대 25초, 부분 결과 표시 지원
- **PDF 내보내기**: 최대 10초, 다운로드 진행률 표시

---

## 🔍 4. 성능 예산 UX 영향 평가

### 4.1 Core Web Vitals 영향 분석

#### LCP (Largest Contentful Paint) 사용자 첫 인상
```javascript
describe('Component LCP Impact', () => {
  it('Global Submenu 로딩이 LCP에 영향주지 않음', async () => {
    const metrics = await measureLCP(() => {
      render(<GlobalSubmenu isOpen={true} items={mockItems} />)
    })
    
    // LCP에 기여하는 요소가 아니어야 함 (overlay component)
    expect(metrics.lcp.element).not.toMatch(/submenu/)
  })

  it('Planning Wizard 초기 로딩이 2.5초 이하', async () => {
    const startTime = performance.now()
    render(<PlanningWizard projectId="test" />)
    
    await waitFor(() => {
      expect(screen.getByText(/AI 기획 마법사/)).toBeVisible()
    })
    
    const loadTime = performance.now() - startTime
    expect(loadTime).toBeLessThan(2500)
  })
})
```

#### INP (Interaction to Next Paint) 응답성
```javascript
describe('INP Performance Budget Compliance', () => {
  it('Notification Bell 클릭 응답이 200ms 이하', async () => {
    const inp = await measureINP(async () => {
      const { user } = render(<NotificationBell unreadCount={5} />)
      await user.click(screen.getByRole('button'))
    })
    
    expect(inp).toBeLessThan(200)
  })

  it('Planning Wizard 단계 이동이 150ms 이하', async () => {
    const inp = await measureINP(async () => {
      const { user } = render(<PlanningWizard projectId="test" />)
      await user.click(screen.getByRole('button', { name: /2단계/ }))
    })
    
    expect(inp).toBeLessThan(150)
  })
})
```

### 4.2 번들 크기 영향 평가

#### 컴포넌트별 번들 영향
- **Global Submenu**: 추가 4KB (clsx, 키보드 핸들링)
- **Notification Center**: 추가 12KB (Redux 상태 관리, API 호출)
- **Planning Wizard**: 추가 18KB (복잡한 폼 검증, AI 통신)

#### 지연 로딩 전략 검증
```javascript
describe('Code Splitting and Lazy Loading', () => {
  it('Planning Wizard가 필요할 때만 로드됨', async () => {
    const bundleSize = await getBundleSize()
    
    // 초기 번들에 Planning Wizard 코드가 포함되지 않아야 함
    expect(bundleSize.chunks).not.toContain('planning-wizard')
    
    // 동적 import로 로드 확인
    const PlanningWizard = await import('@/widgets/planning-wizard')
    expect(PlanningWizard).toBeDefined()
  })
})
```

---

## 📊 5. 테스트 실행 및 검증 가이드

### 5.1 자동화된 테스트 실행

#### 접근성 테스트 실행
```bash
# A11y 자동 테스트
pnpm test src/**/*.a11y.test.tsx

# 접근성 CI 검증
pnpm run test:a11y -- --coverage
```

#### 성능 테스트 실행
```bash
# 성능 예산 검증
pnpm run test:performance

# Lighthouse CI 실행
pnpm run lighthouse:ci

# INP 측정
pnpm run test:inp -- --component=GlobalSubmenu,NotificationCenter,PlanningWizard
```

### 5.2 수동 검증 체크리스트

#### 스크린 리더 테스트 (NVDA/JAWS/VoiceOver)
- [ ] Global Submenu의 모든 항목이 올바르게 읽힘
- [ ] Notification 개수가 정확히 아나운스됨  
- [ ] Planning Wizard 단계 진행률이 읽힘
- [ ] 에러 메시지가 즉시 읽힘

#### 키보드 전용 네비게이션
- [ ] Tab 키만으로 모든 기능 접근 가능
- [ ] Focus trap이 올바르게 작동
- [ ] 단축키 (Alt+N) 가 정상 작동
- [ ] Escape 키로 모든 오버레이 닫기 가능

#### 색상 대비 검증 도구 사용
```bash
# Pa11y 색상 대비 검사
npx pa11y http://localhost:3000 --runner axe --standard WCAG2AA

# WebAIM 색상 대비 분석기
# https://webaim.org/resources/contrastchecker/
```

---

## 📈 6. UX KPI 및 성공 지표

### 6.1 정량적 지표

| 컴포넌트 | 지표 | 목표값 | 측정방법 |
|----------|------|--------|----------|
| Global Submenu | INP | ≤ 200ms | 자동화 테스트 |
| | 접근성 스코어 | ≥ 95점 | Lighthouse |
| | 키보드 네비게이션 완료율 | 100% | E2E 테스트 |
| Notification Center | 알림 압도감 지수 | ≤ 10개 표시 | 단위 테스트 |
| | Alt+N 성공률 | ≥ 95% | 사용자 테스트 |
| | API 호출 최적화 | ≤ 2회/30초 | 네트워크 모니터링 |
| Planning Wizard | 단계 완료율 | ≥ 85% | 사용자 분석 |
| | 데이터 손실률 | 0% | 에러 트래킹 |
| | AI 응답 만족도 | ≥ 4.0/5.0 | 사용자 피드백 |

### 6.2 정성적 지표

#### 사용성 히유리스틱 평가 결과
- **일관성 점수**: Nielsen 4번 원칙 (일관성과 표준) 완료율
- **에러 복구 능력**: Nielsen 9번 원칙 (에러 인식과 복구) 완료율
- **사용자 제어감**: Nielsen 3번 원칙 (사용자 제어와 자유) 완료율

### 6.3 회귀 방지 임계값

#### 성능 회귀 감지
- **LCP 회귀**: 기준 대비 +10% 초과 시 CI 실패
- **INP 회귀**: 기준 대비 +20ms 초과 시 경고
- **번들 크기**: 기준 대비 +50KB 초과 시 검토 요청

#### 접근성 회귀 방지
- **axe-core 위반**: 신규 위반 사항 1건도 허용 안함
- **키보드 네비게이션**: 기존 동작 중단 시 CI 실패
- **스크린 리더**: 기존 레이블 변경 시 검토 필요

---

## ✅ 7. 완료 검증 및 승인 기준

### 7.1 최종 완료 조건 (Definition of Done)

#### 필수 통과 항목
- [ ] 모든 자동화된 테스트 통과 (단위 + 통합 + E2E)
- [ ] WCAG 2.1 AA 접근성 검증 100% 통과
- [ ] 성능 예산 (INP 200ms, LCP 2.5s) 준수
- [ ] 사용성 히유리스틱 위반 0건
- [ ] 스크린 리더 호환성 수동 검증 완료
- [ ] 키보드 전용 네비게이션 수동 검증 완료

#### 품질 게이트 통과
- [ ] Lighthouse CI 성능 점수 ≥ 90점
- [ ] 접근성 자동 검사 점수 ≥ 95점
- [ ] Bundle Analyzer 경고 0건
- [ ] ESLint UX 규칙 위반 0건

### 7.2 승인 프로세스

#### 검토자별 책임
- **UX Lead**: 사용성 히유리스틱 및 정보 아키텍처 검토
- **Accessibility Specialist**: WCAG 2.1 AA 준수성 최종 검증  
- **Performance Engineer**: 성능 예산 및 최적화 검토
- **QA Engineer**: E2E 테스트 시나리오 실행 및 검증

#### 최종 승인 기준
모든 검토자의 승인 + CI/CD 파이프라인 통과 + 품질 게이트 통과

---

## 📚 8. 참고 자료 및 도구

### 8.1 접근성 검증 도구
- **axe-core**: 자동화된 접근성 테스트
- **WAVE**: 웹 접근성 검사 도구  
- **Pa11y**: CLI 기반 접근성 테스트
- **Lighthouse**: 종합적인 웹 품질 분석

### 8.2 성능 측정 도구
- **WebPageTest**: 실제 네트워크 환경 성능 테스트
- **Lighthouse CI**: 지속적 성능 모니터링
- **Bundle Analyzer**: 번들 크기 분석
- **Performance Observer API**: 런타임 성능 측정

### 8.3 사용성 테스트 가이드
- **Nielsen Norman Group Heuristics**: 10가지 사용성 원칙
- **WCAG 2.1 Guidelines**: 접근성 표준 가이드라인
- **Material Design Accessibility**: Google 접근성 베스트 프랙티스
- **React Testing Library**: 사용자 중심 테스트 방법론

---

**문서 마지막 업데이트**: 2025-09-03  
**다음 검토 예정일**: 2025-10-03  
**담당자**: Eleanor (Frontend UX Lead)