# VideoPlanet 업그레이드 액션플랜 (2025 Q1)

## 🎯 목표
- **개발 효율성**: 30% 향상 (컴포넌트 재사용성)
- **사용자 경험**: 25% 개선 (로딩 속도, 인터랙션)
- **접근성**: WCAG 2.1 Level AA 달성
- **테스트 커버리지**: 핵심 기능 90% 이상

## 📊 현황 분석

### 아키텍처 상태
- ✅ FSD 6계층 구조 구축 완료
- ⚠️ Processes 레이어 미활용
- ❌ API 경로 불일치 (프론트/백엔드)
- ❌ 도메인 로직 분리 미흡

### UI/UX 상태
- ❌ 3가지 다른 파란색 사용 중 (#0031ff, #012fff, #0058da)
- ❌ 하드코딩된 픽셀 값 (mt10-mt200)
- ❌ ARIA 라벨 0개
- ❌ 키보드 네비게이션 미지원

### 기능 완성도
- 백엔드: 70% (Django 모델/뷰 구현)
- 프론트엔드: 30% (Next.js 마이그레이션 중)
- 테스트: 10% (기본 인프라만)

## 🚀 Phase 1: 디자인 시스템 구축 (Week 1-2)

### 1.1 디자인 토큰 시스템
```typescript
// shared/ui/tokens/design-tokens.ts
export const tokens = {
  colors: {
    primary: {
      50: '#e6ebff',
      500: '#1631F8',  // 기존 브랜드 색상 유지
      900: '#0a1a66'
    },
    semantic: {
      error: '#dc3545',
      success: '#28a745',
      warning: '#ffc107',
      info: '#17a2b8'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem'
  },
  typography: {
    fontFamily: "'SUIT', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem'
    }
  },
  animation: {
    duration: '300ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
}
```

### 1.2 Shadcn UI 통합
```bash
# 설치 및 설정
npx shadcn@latest init
npx shadcn@latest add button input form dialog toast

# 커스텀 테마 적용
npm install @shadcn/themes
```

### 1.3 접근성 기반 컴포넌트
```typescript
// features/ui/Button/Button.test.tsx (TDD First)
describe('Button Component', () => {
  it('should have proper ARIA attributes', () => {
    render(<Button variant="primary">Submit</Button>)
    expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
  })
  
  it('should be keyboard navigable', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Submit</Button>)
    const button = screen.getByRole('button')
    button.focus()
    fireEvent.keyDown(button, { key: 'Enter' })
    expect(handleClick).toHaveBeenCalled()
  })
})
```

## 🔄 Phase 2: 상태 관리 현대화 (Week 3-4)

### 2.1 RTK Query 통합
```typescript
// shared/api/baseApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token
      if (token) headers.set('authorization', `Bearer ${token}`)
      return headers
    }
  }),
  tagTypes: ['Project', 'Feedback', 'User'],
  endpoints: () => ({})
})
```

### 2.2 Zustand 로컬 상태
```typescript
// features/project/model/projectStore.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface ProjectState {
  selectedProject: Project | null
  filters: FilterOptions
  setSelectedProject: (project: Project) => void
  updateFilters: (filters: Partial<FilterOptions>) => void
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    persist(
      (set) => ({
        selectedProject: null,
        filters: { status: 'all', sortBy: 'createdAt' },
        setSelectedProject: (project) => set({ selectedProject: project }),
        updateFilters: (filters) => 
          set((state) => ({ filters: { ...state.filters, ...filters } }))
      }),
      { name: 'project-storage' }
    )
  )
)
```

## 🏗️ Phase 3: 프로세스 레이어 구현 (Week 5-6)

### 3.1 비디오 제작 워크플로우
```typescript
// processes/video-production/model/workflow.ts
export enum WorkflowStage {
  PLANNING = 'planning',
  SCRIPTING = 'scripting',
  STORYBOARD = 'storyboard',
  SHOOTING = 'shooting',
  EDITING = 'editing',
  POST_PRODUCTION = 'post_production',
  REVIEW = 'review',
  DELIVERY = 'delivery'
}

// processes/video-production/ui/WorkflowStepper.tsx
export const WorkflowStepper: FC = () => {
  const { currentStage, canProceed, proceedToNext } = useWorkflow()
  
  return (
    <div role="navigation" aria-label="Production workflow">
      {Object.values(WorkflowStage).map((stage, index) => (
        <Step 
          key={stage}
          stage={stage}
          isActive={currentStage === stage}
          isCompleted={index < getStageIndex(currentStage)}
          aria-current={currentStage === stage ? 'step' : undefined}
        />
      ))}
    </div>
  )
}
```

### 3.2 실시간 피드백 시스템
```typescript
// features/feedback/api/feedbackSSE.ts
export const useFeedbackSSE = (projectId: string) => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  
  useEffect(() => {
    const eventSource = new EventSource(
      `${API_URL}/projects/${projectId}/feedback/stream`
    )
    
    eventSource.onmessage = (event) => {
      const feedback = JSON.parse(event.data)
      setFeedbacks(prev => [...prev, feedback])
    }
    
    return () => eventSource.close()
  }, [projectId])
  
  return feedbacks
}
```

## ✅ Phase 4: 테스트 커버리지 (Week 7-8)

### 4.1 E2E 테스트 시나리오
```typescript
// e2e/project-workflow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Video Production Workflow', () => {
  test('should complete full project lifecycle', async ({ page }) => {
    // 1. 로그인
    await page.goto('/login')
    await page.fill('[aria-label="Email"]', 'test@example.com')
    await page.fill('[aria-label="Password"]', 'password')
    await page.click('button[type="submit"]')
    
    // 2. 프로젝트 생성
    await page.click('[aria-label="New Project"]')
    await page.fill('[name="title"]', 'Test Video Project')
    await page.selectOption('[name="type"]', 'commercial')
    await page.click('button:has-text("Create")')
    
    // 3. 워크플로우 진행
    for (const stage of ['scripting', 'storyboard', 'shooting']) {
      await page.click(`[data-stage="${stage}"]`)
      await page.click('button:has-text("Complete Stage")')
      await expect(page.locator(`[data-stage="${stage}"]`))
        .toHaveAttribute('aria-current', 'false')
    }
    
    // 4. 피드백 추가
    await page.click('[aria-label="Add Feedback"]')
    await page.fill('[name="timecode"]', '00:01:23')
    await page.fill('[name="comment"]', 'Color correction needed')
    await page.click('button:has-text("Submit")')
    
    // 5. 검증
    await expect(page.locator('[role="alert"]'))
      .toHaveText('Feedback added successfully')
  })
})
```

### 4.2 성능 메트릭
```typescript
// shared/lib/performance.ts
export const measurePerformance = {
  LCP: 2500,  // Largest Contentful Paint < 2.5s
  FID: 100,   // First Input Delay < 100ms
  CLS: 0.1,   // Cumulative Layout Shift < 0.1
  TTI: 3800   // Time to Interactive < 3.8s
}
```

## 📈 성공 지표

### 개발 지표
- [ ] 컴포넌트 재사용률 > 70%
- [ ] 코드 중복률 < 5%
- [ ] 빌드 시간 < 30초
- [ ] 테스트 실행 시간 < 2분

### 사용자 경험 지표
- [ ] 초기 로딩 시간 < 3초
- [ ] 인터랙션 응답 < 100ms
- [ ] 에러율 < 1%
- [ ] 작업 완료율 > 85%

### 접근성 지표
- [ ] Lighthouse 접근성 점수 > 90
- [ ] 키보드 네비게이션 100% 지원
- [ ] 스크린 리더 호환성 100%
- [ ] WCAG 2.1 AA 준수

## 🔄 마이그레이션 전략

### 점진적 마이그레이션
1. **신규 기능**: 모든 신규 기능은 새 아키텍처로 구현
2. **핵심 기능**: 사용 빈도 높은 기능부터 순차 마이그레이션
3. **레거시 격리**: 기존 코드는 adapter 패턴으로 격리
4. **병렬 운영**: 새 시스템과 레거시 3개월 병렬 운영

### 리스크 관리
- **롤백 계획**: 각 Phase별 독립적 롤백 가능
- **A/B 테스트**: 주요 변경사항 10% 사용자 대상 테스트
- **모니터링**: Sentry + Datadog 실시간 모니터링
- **핫픽스**: 긴급 패치 30분 내 배포 체계

## 📅 타임라인

| Phase | 기간 | 주요 산출물 | 담당 |
|-------|------|------------|------|
| Phase 1 | Week 1-2 | 디자인 시스템, Shadcn UI | Frontend |
| Phase 2 | Week 3-4 | RTK Query, Zustand | Frontend |
| Phase 3 | Week 5-6 | 워크플로우, 실시간 피드백 | Full-stack |
| Phase 4 | Week 7-8 | E2E 테스트, 성능 최적화 | QA |

## 🎯 다음 단계

1. **즉시 시작 가능**
   - 디자인 토큰 파일 생성
   - Shadcn UI 설치 및 테마 설정
   - Button 컴포넌트 TDD 구현

2. **준비 필요**
   - RTK Query 엔드포인트 설계
   - E2E 테스트 시나리오 상세화
   - 모니터링 대시보드 구성

3. **팀 논의 필요**
   - 레거시 코드 sunset 일정
   - A/B 테스트 대상 선정
   - 성공 지표 합의