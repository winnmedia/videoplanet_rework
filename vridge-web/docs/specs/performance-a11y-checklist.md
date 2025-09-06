# 프로젝트 관리 시스템 - 성능 최적화 및 접근성 체크리스트

## 1. INP (Interaction to Next Paint) 성능 최적화 가이드

### 1.1 INP 목표 및 측정 기준

#### 성능 목표
| Percentile | Target | Critical | Action Required |
|------------|--------|----------|-----------------|
| p50 | ≤100ms | ≤150ms | Monitor |
| p75 | ≤200ms | ≤300ms | Optimize |
| p95 | ≤300ms | ≤500ms | Urgent Fix |
| p99 | ≤500ms | ≤1000ms | Emergency |

#### 핵심 상호작용별 INP Budget
```typescript
interface INPBudget {
  // 프로젝트 목록 페이지
  projectList: {
    viewToggle: 150,      // 그리드/리스트 전환
    filterApply: 200,     // 필터 적용
    search: 100,          // 검색 입력
    cardHover: 50,        // 카드 호버 효과
    pagination: 200       // 페이지 전환
  }
  
  // 프로젝트 생성 페이지
  projectCreate: {
    stepNavigation: 200,  // 단계 이동
    formValidation: 100,  // 실시간 검증
    fileUpload: 300,      // 파일 업로드
    autoSave: 200,        // 자동 저장
    submission: 500       // 최종 제출
  }
  
  // 프로젝트 상세 페이지
  projectDetail: {
    tabSwitch: 150,       // 탭 전환
    memberInvite: 200,    // 멤버 초대
    quickAction: 100,     // 빠른 액션
    realtimeUpdate: 50    // 실시간 업데이트
  }
}
```

### 1.2 최적화 전략

#### 1.2.1 JavaScript Execution 최적화
```typescript
// ❌ Bad - 동기적 무거운 작업
function handleFilterChange(filters: Filters) {
  const results = projects.filter(p => {
    // 복잡한 필터링 로직
    return applyComplexFilters(p, filters)
  })
  setFilteredProjects(results)
}

// ✅ Good - 비동기 처리 + Web Worker
function handleFilterChange(filters: Filters) {
  // 즉각적인 UI 피드백
  setLoading(true)
  
  // Web Worker로 무거운 작업 위임
  filterWorker.postMessage({ projects, filters })
  
  filterWorker.onmessage = (e) => {
    setFilteredProjects(e.data)
    setLoading(false)
  }
}

// ✅ Better - React 19 startTransition 활용
function handleFilterChange(filters: Filters) {
  // 긴급 업데이트 (UI 피드백)
  setActiveFilters(filters)
  
  // 비긴급 업데이트 (결과 렌더링)
  startTransition(() => {
    const results = applyFilters(projects, filters)
    setFilteredProjects(results)
  })
}
```

#### 1.2.2 렌더링 최적화
```typescript
// Virtual Scrolling for Large Lists
import { FixedSizeList } from 'react-window'

const ProjectList = ({ projects }: { projects: Project[] }) => {
  const Row = memo(({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <ProjectCard project={projects[index]} />
    </div>
  ))
  
  return (
    <FixedSizeList
      height={600}
      itemCount={projects.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}

// Optimistic UI Updates
const useOptimisticUpdate = () => {
  const [optimisticState, setOptimisticState] = useState(null)
  
  const updateOptimistically = async (action: () => Promise<any>) => {
    // 즉시 UI 업데이트
    setOptimisticState(/* predicted state */)
    
    try {
      const result = await action()
      // 성공 시 실제 데이터로 교체
      setOptimisticState(null)
      return result
    } catch (error) {
      // 실패 시 롤백
      setOptimisticState(null)
      throw error
    }
  }
  
  return { optimisticState, updateOptimistically }
}
```

#### 1.2.3 이벤트 핸들러 최적화
```typescript
// Debouncing for Search
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => clearTimeout(handler)
  }, [value, delay])
  
  return debouncedValue
}

// Throttling for Scroll Events
const useThrottle = (callback: Function, delay: number) => {
  const lastRun = useRef(Date.now())
  
  return useCallback((...args: any[]) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args)
      lastRun.current = Date.now()
    }
  }, [callback, delay])
}

// Passive Event Listeners
useEffect(() => {
  const handleScroll = () => {
    // scroll logic
  }
  
  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => window.removeEventListener('scroll', handleScroll)
}, [])
```

### 1.3 성능 모니터링 구현

#### 1.3.1 Custom INP Tracking
```typescript
class INPTracker {
  private interactions: Map<string, number[]> = new Map()
  
  track(interactionName: string, startTime: number) {
    const endTime = performance.now()
    const duration = endTime - startTime
    
    if (!this.interactions.has(interactionName)) {
      this.interactions.set(interactionName, [])
    }
    
    this.interactions.get(interactionName)!.push(duration)
    
    // 임계값 초과 시 경고
    if (duration > 200) {
      console.warn(`INP violation: ${interactionName} took ${duration}ms`)
      this.reportViolation(interactionName, duration)
    }
  }
  
  getP75(interactionName: string): number {
    const durations = this.interactions.get(interactionName) || []
    if (durations.length === 0) return 0
    
    const sorted = [...durations].sort((a, b) => a - b)
    const p75Index = Math.floor(sorted.length * 0.75)
    return sorted[p75Index]
  }
  
  private reportViolation(interaction: string, duration: number) {
    // Analytics에 보고
    if (window.gtag) {
      window.gtag('event', 'inp_violation', {
        interaction,
        duration,
        timestamp: new Date().toISOString()
      })
    }
  }
}

// 사용 예시
const inpTracker = new INPTracker()

const ProjectCard = ({ project }: { project: Project }) => {
  const handleClick = () => {
    const startTime = performance.now()
    
    // 상호작용 처리
    navigateToProject(project.id)
    
    // INP 측정
    inpTracker.track('project_card_click', startTime)
  }
  
  return <div onClick={handleClick}>...</div>
}
```

#### 1.3.2 Performance Observer Setup
```typescript
// hooks/usePerformanceObserver.ts
export function usePerformanceObserver() {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'event') {
          const eventEntry = entry as PerformanceEventTiming
          
          if (eventEntry.duration > 200) {
            console.warn('Slow interaction detected:', {
              type: eventEntry.name,
              duration: eventEntry.duration,
              startTime: eventEntry.startTime,
              processingStart: eventEntry.processingStart,
              processingEnd: eventEntry.processingEnd
            })
          }
        }
      }
    })
    
    observer.observe({ 
      type: 'event', 
      buffered: true,
      durationThreshold: 200 
    })
    
    return () => observer.disconnect()
  }, [])
}
```

## 2. 접근성 (Accessibility) 완전 체크리스트

### 2.1 키보드 네비게이션

#### 2.1.1 Tab Order 명세
```typescript
interface TabOrder {
  projectListPage: [
    'skip-to-main',      // Skip link
    'main-navigation',   // 주 메뉴
    'search-input',      // 검색 필드
    'filter-button',     // 필터 버튼
    'view-toggle',       // 뷰 전환
    'create-button',     // 새 프로젝트
    'project-card-1',    // 첫 번째 카드
    'project-card-2',    // ...
    'pagination'         // 페이지네이션
  ]
  
  projectCreatePage: [
    'back-button',       // 뒤로가기
    'step-indicator',    // 단계 표시
    'form-field-1',      // 폼 필드들
    'form-field-2',
    'previous-button',   // 이전 단계
    'next-button'        // 다음 단계
  ]
}
```

#### 2.1.2 키보드 단축키 구현
```typescript
// hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 입력 필드에서는 단축키 비활성화
      if (e.target instanceof HTMLInputElement || 
          e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // 단축키 매핑
      const shortcuts: Record<string, () => void> = {
        '/': () => document.getElementById('search-input')?.focus(),
        'g': () => setView('grid'),
        'l': () => setView('list'),
        'n': () => router.push('/projects/create'),
        'f': () => openFilterPanel(),
        'Escape': () => closeAllModals()
      }
      
      const action = shortcuts[e.key]
      if (action) {
        e.preventDefault()
        action()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])
}
```

#### 2.1.3 Focus Management
```typescript
// Focus Trap for Modals
const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  
  useEffect(() => {
    if (isOpen) {
      // 현재 포커스 저장
      previousFocus.current = document.activeElement as HTMLElement
      
      // 모달 내 첫 번째 포커스 가능한 요소로 이동
      const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    } else {
      // 이전 포커스로 복원
      previousFocus.current?.focus()
    }
  }, [isOpen])
  
  // Focus trap 구현
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      if (!focusables?.length) return
      
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    
    if (e.key === 'Escape') {
      onClose()
    }
  }
  
  return isOpen ? (
    <div 
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  ) : null
}
```

### 2.2 스크린 리더 지원

#### 2.2.1 ARIA 속성 체크리스트
```typescript
interface AriaChecklist {
  landmarks: {
    main: 'role="main"',
    navigation: 'role="navigation"',
    search: 'role="search"',
    banner: 'role="banner"',
    contentinfo: 'role="contentinfo"'
  }
  
  widgets: {
    progressBar: {
      role: 'progressbar',
      'aria-valuenow': 'current',
      'aria-valuemin': '0',
      'aria-valuemax': '100',
      'aria-label': 'Progress description'
    },
    
    tabs: {
      tablist: 'role="tablist"',
      tab: 'role="tab" aria-selected="true/false"',
      tabpanel: 'role="tabpanel" aria-labelledby="tab-id"'
    },
    
    liveRegion: {
      status: 'role="status" aria-live="polite"',
      alert: 'role="alert" aria-live="assertive"'
    }
  }
  
  states: {
    expanded: 'aria-expanded="true/false"',
    hidden: 'aria-hidden="true/false"',
    disabled: 'aria-disabled="true/false"',
    invalid: 'aria-invalid="true/false"',
    busy: 'aria-busy="true/false"'
  }
}
```

#### 2.2.2 Live Region 구현
```typescript
// components/LiveRegion.tsx
const LiveRegion = ({ message, priority = 'polite' }: {
  message: string
  priority?: 'polite' | 'assertive'
}) => {
  return (
    <div
      role={priority === 'assertive' ? 'alert' : 'status'}
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

// 사용 예시
const FilterResults = ({ count, filters }: FilterResultsProps) => {
  const [announcement, setAnnouncement] = useState('')
  
  useEffect(() => {
    if (filters.length > 0) {
      setAnnouncement(`${count}개의 프로젝트가 필터링되었습니다`)
    }
  }, [count, filters])
  
  return (
    <>
      <LiveRegion message={announcement} />
      <div>검색 결과: {count}개</div>
    </>
  )
}
```

#### 2.2.3 Form 접근성
```typescript
// Accessible Form Field Component
const FormField = ({ 
  id, 
  label, 
  error, 
  required,
  description,
  ...inputProps 
}: FormFieldProps) => {
  const errorId = `${id}-error`
  const descId = `${id}-description`
  
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && <span aria-label="필수 항목">*</span>}
      </label>
      
      {description && (
        <span id={descId} className="field-description">
          {description}
        </span>
      )}
      
      <input
        id={id}
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={[
          description && descId,
          error && errorId
        ].filter(Boolean).join(' ')}
        {...inputProps}
      />
      
      {error && (
        <span 
          id={errorId} 
          role="alert"
          className="error-message"
        >
          {error}
        </span>
      )}
    </div>
  )
}
```

### 2.3 시각적 접근성

#### 2.3.1 색상 대비 요구사항
```scss
// styles/a11y-colors.scss
:root {
  // WCAG AA 기준 충족 (4.5:1 for normal text, 3:1 for large text)
  --color-text-primary: #1a1a1a;      // on white: 18.1:1
  --color-text-secondary: #4a4a4a;    // on white: 9.7:1
  --color-text-disabled: #767676;     // on white: 4.5:1 (minimum)
  
  --color-link: #0066cc;               // on white: 5.1:1
  --color-link-hover: #0052a3;        // on white: 6.8:1
  
  --color-error: #d32f2f;             // on white: 4.6:1
  --color-success: #2e7d32;           // on white: 5.1:1
  --color-warning: #f57c00;           // on white: 3.2:1 (large text only)
  
  // Focus indicators
  --focus-ring: 2px solid #0066cc;
  --focus-ring-offset: 2px;
}

// High contrast mode support
@media (prefers-contrast: high) {
  :root {
    --color-text-primary: #000000;
    --color-text-secondary: #333333;
    --focus-ring: 3px solid #000000;
  }
}
```

#### 2.3.2 Focus Indicators
```scss
// Visible focus styles
.focusable {
  &:focus-visible {
    outline: var(--focus-ring);
    outline-offset: var(--focus-ring-offset);
  }
  
  // Remove default browser outline
  &:focus:not(:focus-visible) {
    outline: none;
  }
}

// Custom focus for different elements
button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}

input:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 0;
  border-color: var(--color-primary);
}

.card:focus-visible {
  box-shadow: 
    0 0 0 2px #fff,
    0 0 0 4px var(--color-primary);
}
```

### 2.4 접근성 테스트

#### 2.4.1 자동화된 테스트
```typescript
// __tests__/a11y/automated.test.tsx
import { axe, toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

describe('자동화된 접근성 테스트', () => {
  it('프로젝트 목록 페이지', async () => {
    const { container } = render(<ProjectListPage />)
    
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
        'duplicate-id': { enabled: true },
        'heading-order': { enabled: true },
        'label': { enabled: true },
        'link-name': { enabled: true },
        'list': { enabled: true },
        'tabindex': { enabled: true }
      }
    })
    
    expect(results).toHaveNoViolations()
  })
  
  it('모달 포커스 트랩', async () => {
    const { getByRole, getByTestId } = render(<InviteModal isOpen />)
    
    const modal = getByRole('dialog')
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    expect(focusableElements.length).toBeGreaterThan(0)
    expect(document.activeElement).toBe(focusableElements[0])
  })
})
```

#### 2.4.2 수동 테스트 체크리스트
```markdown
## 키보드 테스트
- [ ] Tab 키로 모든 interactive 요소 접근 가능
- [ ] Shift+Tab으로 역방향 네비게이션 가능
- [ ] Enter/Space로 버튼 활성화 가능
- [ ] Escape로 모달/드롭다운 닫기 가능
- [ ] 화살표 키로 메뉴/리스트 탐색 가능
- [ ] 포커스 인디케이터 명확히 표시
- [ ] 포커스 순서가 논리적

## 스크린 리더 테스트 (NVDA/JAWS)
- [ ] 페이지 제목이 올바르게 읽힘
- [ ] 헤딩 구조가 논리적 (h1 → h2 → h3)
- [ ] 폼 레이블이 올바르게 연결됨
- [ ] 에러 메시지가 즉시 announce됨
- [ ] 버튼/링크 목적이 명확히 전달됨
- [ ] 이미지 대체 텍스트 제공됨
- [ ] 동적 콘텐츠 변경이 announce됨

## 시각적 테스트
- [ ] 200% 확대 시 수평 스크롤 없음
- [ ] 색상만으로 정보 전달하지 않음
- [ ] 애니메이션 비활성화 옵션 제공
- [ ] 다크모드에서도 충분한 대비
- [ ] 포커스 인디케이터 대비 충분

## 모바일 접근성
- [ ] 터치 타겟 최소 44x44px
- [ ] 스와이프 제스처 대체 방법 제공
- [ ] 화면 회전 시 레이아웃 유지
- [ ] 확대/축소 가능
```

## 3. 성능 & 접근성 모니터링 대시보드

### 3.1 실시간 모니터링 설정
```typescript
// monitoring/dashboard.ts
class PerformanceA11yDashboard {
  private metrics = {
    inp: new Map<string, number[]>(),
    a11yViolations: [],
    userTimings: new Map()
  }
  
  init() {
    this.setupINPMonitoring()
    this.setupA11yMonitoring()
    this.setupUserTimingAPI()
  }
  
  private setupINPMonitoring() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'event' && entry.duration > 0) {
          const key = entry.name
          if (!this.metrics.inp.has(key)) {
            this.metrics.inp.set(key, [])
          }
          this.metrics.inp.get(key)!.push(entry.duration)
          
          // 실시간 대시보드 업데이트
          this.updateDashboard()
        }
      }
    }).observe({ type: 'event', buffered: true })
  }
  
  private setupA11yMonitoring() {
    // Production에서 접근성 이슈 감지
    if (process.env.NODE_ENV === 'production') {
      import('react-axe').then(axe => {
        axe.default(React, ReactDOM, 1000)
      })
    }
  }
  
  getDashboardData() {
    return {
      inp: {
        p50: this.calculatePercentile(50),
        p75: this.calculatePercentile(75),
        p99: this.calculatePercentile(99)
      },
      violations: this.metrics.a11yViolations,
      timings: Object.fromEntries(this.metrics.userTimings)
    }
  }
}
```

### 3.2 성능 예산 자동화
```javascript
// webpack.config.js
module.exports = {
  performance: {
    hints: 'error',
    maxAssetSize: 250000,       // 250KB
    maxEntrypointSize: 500000,  // 500KB
    assetFilter: (assetFilename) => {
      return assetFilename.endsWith('.js') || 
             assetFilename.endsWith('.css')
    }
  }
}
```

### 3.3 CI/CD 통합
```yaml
# .github/workflows/performance-a11y.yml
name: Performance & Accessibility Check

on: [pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000/projects
            http://localhost:3000/projects/create
          uploadArtifacts: true
          temporaryPublicStorage: true
          
      - name: Validate Results
        run: |
          if [ $(jq '.categories.performance.score' .lighthouseci/*.json) -lt 0.9 ]; then
            echo "Performance score below 90"
            exit 1
          fi
          
          if [ $(jq '.categories.accessibility.score' .lighthouseci/*.json) -lt 0.95 ]; then
            echo "Accessibility score below 95"
            exit 1
          fi
```

## 4. Implementation Checklist

### Phase 1: Foundation (Week 1)
- [ ] Setup performance monitoring (Web Vitals)
- [ ] Implement INP tracking
- [ ] Configure axe-core for testing
- [ ] Add keyboard shortcuts
- [ ] Implement focus management

### Phase 2: Optimization (Week 2)
- [ ] Add virtual scrolling
- [ ] Implement code splitting
- [ ] Setup Web Workers for heavy operations
- [ ] Add optimistic UI updates
- [ ] Implement debounce/throttle

### Phase 3: Polish (Week 3)
- [ ] Complete ARIA labeling
- [ ] Add skip links
- [ ] Implement high contrast mode
- [ ] Add animation preferences
- [ ] Complete mobile optimizations

### Phase 4: Testing & Monitoring (Week 4)
- [ ] Run full a11y audit
- [ ] Performance testing under load
- [ ] Setup monitoring dashboard
- [ ] Document keyboard shortcuts
- [ ] User testing with assistive technologies

---

**문서 버전:** 1.0.0
**작성자:** Eleanor (Frontend UX Lead)
**최종 수정:** 2025-09-05
**검증 상태:** Ready for Implementation
**성능 목표:** INP ≤200ms (p75)
**접근성 목표:** WCAG 2.1 AA Compliance