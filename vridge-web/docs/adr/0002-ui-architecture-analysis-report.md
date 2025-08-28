# ADR-002: UI 아키텍처 분석 보고서 및 개선 방안

**상태**: 승인됨  
**날짜**: 2025-08-28  
**결정자**: Arthur (Chief Architect)  
**태그**: UI, Architecture, FSD, TDD, Analysis

## 상황 (Context)

VideoPlanet 프로젝트에서 서브메뉴가 전면적으로 깨져있고, 각 페이지에서 사용자가 활용할 수 있는 기능 요소가 전혀 없는 심각한 UX/UI 문제가 발견되었습니다. MCP Playwright를 활용한 아키텍처 분석을 통해 근본적인 구조적 문제점들을 진단하고 개선 방안을 제시합니다.

## 문제점 분석 (Problem Analysis)

### 1. FSD 아키텍처 관점에서의 문제점

#### 1.1 레이어 의존성 규칙 위반
```typescript
// ❌ 현재 잘못된 구조
// widgets/SideBar/ui/SideBar.tsx
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation' // shared 레이어 내부 모듈 직접 접근

// shared/ui/SubMenu/SubMenu.tsx  
import type { SubMenuItem } from '@/entities/menu/model/types' // shared가 entities 의존
```

**문제**: 
- `widgets` 레이어가 `shared` 레이어의 내부 모듈을 직접 import
- `shared` 레이어가 상위 레이어인 `entities`를 역참조
- Public API (index.ts) 우회한 깊은 경로 import

#### 1.2 컴포넌트 경계 혼재
```typescript
// ❌ SideBar (widgets)가 SubMenu (shared) 내부 로직 직접 조작
const handleMenuClick = (item: MenuItem) => {
  loadSubMenuItems(item.id) // 데이터 로딩 로직이 widgets에 혼재
}
```

### 2. 서브메뉴 상태 관리 문제

#### 2.1 API 실패 처리 부재
```typescript
// entities/menu/api/menuApi.ts - Line 28-35
catch (error) {
  console.error('Failed to fetch submenu items:', error)
  // ❌ 사용자에게 에러 상태 전달 안됨
  const mockData = await this.getMockSubMenuItems(menuType)
  return mockData.items // 사일런트 폴백, 사용자 모름
}
```

#### 2.2 로딩 상태 부재
```typescript
// widgets/SideBar/ui/SideBar.tsx
const [loading, setLoading] = useState(false) // ❌ 사용되지 않음
// UI에서 로딩 상태 표시 없음
```

### 3. 페이지별 기능 요소 부재 분석

#### 3.1 대시보드 페이지 (app/dashboard/page.tsx)
```typescript
// ✓ 구조는 있으나 실제 상호작용 요소 부족
<ProjectStatusCard project={{...}} /> // 정적 데이터만 표시
<RecentActivityFeed activities={[]} />  // 빈 배열 - 실제 데이터 없음
<QuickActions />                        // features 컴포넌트이지만 실제 액션 부재
```

**문제**: 
- DEVPLAN.md의 요구사항 미구현 (새 피드 요약, 초대 관리 요약, 간트 요약)
- 읽지 않음 배지 시스템 없음
- 필터/검색 기능 없음

#### 3.2 프로젝트 페이지 (app/projects/page.tsx)
```typescript
<CreateProjectButton />  // 버튼만 있고 실제 생성 플로우 없음
<ProjectFilter />        // 필터 UI만 있고 필터링 로직 없음  
<ProjectList />          // 빈 리스트만 표시
```

#### 3.3 캘린더 페이지 미구현
- DEVPLAN.md 요구사항: 달력/간트 뷰, 프로젝트 색상 범례, 충돌 경고
- **현실**: 기본 페이지 구조만 존재

#### 3.4 영상 기획 페이지 미구현  
- DEVPLAN.md 요구사항: 3단계 위저드, LLM 통합, 콘티 생성, PDF 내보내기
- **현실**: 빈 페이지

#### 3.5 영상 피드백 페이지 미구현
- DEVPLAN.md 요구사항: 비디오 플레이어, 타임코드 코멘트, 실시간 협업
- **현실**: 기본 레이아웃만

### 4. 접근성 및 키보드 네비게이션 문제

```typescript
// shared/ui/SubMenu/SubMenu.tsx
<nav
  role="menu"           // ❌ 잘못된 role (menu는 menubar용)
  aria-label={title}    // ✓ 올바름
  aria-orientation="vertical" // ✓ 올바름
  // ❌ 누락: aria-expanded, aria-live, aria-busy
>
```

## 해결 방안 (Solution)

### 1. FSD 아키텍처 경계 복원

#### 1.1 Import 규칙 수정
```typescript
// ✅ 올바른 구조
// shared/ui/index.ts - Public API 확장
export { SubMenu } from './SubMenu/SubMenu'
export { useKeyboardNavigation } from './SubMenu/hooks/useKeyboardNavigation'

// widgets/SideBar/ui/SideBar.tsx
import { SubMenu, useKeyboardNavigation } from '@/shared/ui' // Public API 경유
```

#### 1.2 의존성 역전 - SubMenuItem 타입 이동
```typescript
// ✅ shared/model/types.ts로 이동
export interface SubMenuItem {
  id: string
  name: string
  path: string  
  status?: 'active' | 'pending' | 'completed'
  badge?: number
  lastModified?: Date
}

// entities/menu/model/types.ts
import type { SubMenuItem } from '@/shared/model'
```

### 2. 상태 관리 개선

#### 2.1 에러/로딩 상태 통합 관리
```typescript
// features/navigation/model/navigationStore.ts
interface NavigationState {
  // 기존 상태...
  subMenuLoading: boolean
  subMenuError: string | null
  subMenuData: SubMenuItem[]
}

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setSubMenuLoading: (state, action) => {
      state.subMenuLoading = action.payload
    },
    setSubMenuError: (state, action) => {
      state.subMenuError = action.payload  
    },
    setSubMenuData: (state, action) => {
      state.subMenuData = action.payload
      state.subMenuError = null
    }
  }
})
```

#### 2.2 UI 컴포넌트 상태 표시
```typescript
// shared/ui/SubMenu/SubMenu.tsx 개선
{isLoading && (
  <div className="flex items-center justify-center py-8" role="status">
    <LoadingSpinner />
    <span className="sr-only">서브메뉴를 불러오는 중...</span>
  </div>
)}

{error && (
  <div className="text-center py-8" role="alert">
    <p className="text-red-600 mb-4">{error}</p>
    <button onClick={onRetry} className="btn btn-primary">
      다시 시도
    </button>
  </div>
)}
```

### 3. TDD 기반 기능 구현 전략

#### 3.1 Red 단계 - 실패 테스트 작성 (완료)
`/home/winnmedia/VLANET/vridge-web/tests/architecture/sidebar-submenu.test.tsx`

#### 3.2 Green 단계 - 최소 구현
```typescript
// 우선순위 1: 서브메뉴 안정화
// widgets/SideBar/ui/SideBar.tsx
const SideBarInternal = ({ ...props }: SideBarProps) => {
  const { state, dispatch } = useNavigation()
  
  const handleMenuClick = async (item: MenuItem) => {
    if (!item.hasSubMenu) return
    
    try {
      dispatch(setSubMenuLoading(true))
      const items = await menuApi.getSubMenuItems(item.id)
      dispatch(setSubMenuData(items))
    } catch (error) {
      dispatch(setSubMenuError('서브메뉴를 불러올 수 없습니다.'))
    } finally {
      dispatch(setSubMenuLoading(false))
    }
  }
  
  return (
    <aside>
      {/* 기존 사이드바 UI */}
      <SubMenu 
        isLoading={state.subMenuLoading}
        error={state.subMenuError}
        onRetry={() => handleMenuClick(state.activeMenuItem)}
        // ...
      />
    </aside>
  )
}
```

#### 3.3 Refactor 단계 - 성능 최적화
```typescript
// 메모이제이션 적용
const MemoizedSubMenu = React.memo(SubMenu, (prev, next) => {
  return (
    prev.isOpen === next.isOpen &&
    prev.items === next.items &&
    prev.isLoading === next.isLoading
  )
})
```

### 4. MCP Playwright 기반 자동화 테스트 전략

#### 4.1 아키텍처 준수 검증 테스트
```typescript
// tests/e2e/architecture-compliance.spec.ts
test('FSD import boundaries compliance', async () => {
  // 빌드 아티팩트에서 import 관계 분석
  const bundleAnalysis = await analyzeBundleImports()
  
  // widgets -> shared 내부 모듈 직접 import 금지
  expect(bundleAnalysis.violations).toHaveLength(0)
})
```

#### 4.2 UI 상호작용 테스트
```typescript
// tests/e2e/submenu-interaction.spec.ts  
test('submenu handles all interaction states', async ({ page }) => {
  await page.goto('/dashboard')
  
  // 로딩 상태 확인
  await page.click('[data-testid="menu-projects"]')
  await expect(page.locator('[data-testid="submenu-loading"]')).toBeVisible()
  
  // 에러 상태 확인 (네트워크 차단)
  await page.route('/api/menu/submenu*', route => route.abort())
  await page.reload()
  await page.click('[data-testid="menu-projects"]')
  await expect(page.locator('[role="alert"]')).toContainText('서브메뉴를 불러올 수 없습니다')
  
  // 재시도 기능 확인
  await page.unroute('/api/menu/submenu*')
  await page.click('text=다시 시도')
  await expect(page.locator('[data-testid="menu-item-1"]')).toBeVisible()
})
```

#### 4.3 접근성 자동 검증
```typescript
// tests/e2e/accessibility.spec.ts
import { injectAxe, checkA11y } from 'axe-playwright'

test('submenu meets accessibility standards', async ({ page }) => {
  await page.goto('/dashboard')
  await injectAxe(page)
  
  await page.click('[data-testid="menu-projects"]') 
  
  // WCAG 2.1 AA 레벨 검증
  await checkA11y(page, '[data-testid="sidebar-submenu"]', {
    rules: {
      'aria-expanded': { enabled: true },
      'aria-live': { enabled: true },
      'keyboard-navigation': { enabled: true }
    }
  })
})
```

### 5. 페이지별 기능 구현 로드맵

#### Phase 1: 핵심 네비게이션 복구 (1주)
- 서브메뉴 상태 관리 안정화
- FSD 경계 위반 수정
- 기본 접근성 준수

#### Phase 2: 대시보드 기능 구현 (2주) 
- 읽지 않음 배지 시스템
- 프로젝트 상태 카드 상호작용
- 빠른 액션 버튼 연결

#### Phase 3: 프로젝트 관리 완성 (2주)
- 프로젝트 생성/수정 플로우
- 팀원 초대 시스템
- 권한 관리 (RBAC)

#### Phase 4: 고급 기능 구현 (4주)
- 캘린더/간트 뷰
- 영상 기획 위저드
- 영상 피드백 시스템

## 성공 측정 기준 (Success Metrics)

### 아키텍처 품질
- FSD 경계 위반: 0건
- 순환 의존성: 0건  
- TypeScript strict 오류: 0건

### 사용자 경험
- 서브메뉴 로딩 시간: < 300ms
- 에러 복구율: 100% (재시도 버튼)
- 접근성 준수율: WCAG 2.1 AA 100%

### 개발자 경험  
- 테스트 커버리지: > 80%
- 빌드 시간 개선: < 30초
- 핫 리로드 성능: < 1초

## 위험 요소 및 대응 방안

### 위험 1: 기존 코드 대규모 리팩토링
**대응**: Strangler Fig 패턴으로 점진적 마이그레이션

### 위험 2: 팀원 학습 곡선
**대응**: FSD 가이드라인 문서화 및 페어 프로그래밍

### 위험 3: 성능 회귀  
**대응**: 성능 예산 CI 게이트 및 실시간 모니터링

## 결정 (Decision)

1. **즉시 시행**: FSD 경계 위반 수정 및 서브메뉴 안정화
2. **2주 내 완료**: TDD 기반 핵심 기능 구현
3. **지속적 적용**: MCP Playwright 자동화 테스트 확장
4. **아키텍처 거버넌스**: ESLint 규칙 강화 및 CI 게이트 추가

## 근거 (Consequences)

### 긍정적 영향
- 사용자 경험 대폭 개선
- 개발팀 생산성 향상  
- 코드 유지보수성 확보
- 확장 가능한 아키텍처 기반 구축

### 부정적 영향 (일시적)
- 초기 개발 속도 저하
- 팀원 학습 부담
- 리팩토링 중 불안정성

### 장기적 영향
- 기술 부채 해소
- 신기능 개발 속도 가속화
- 품질 자동화 체계 확립

---

**승인자**: Arthur (Chief Architect)  
**검토자**: Backend Lead, Frontend Leads  
**다음 검토**: 2025-09-04 (1주 후)