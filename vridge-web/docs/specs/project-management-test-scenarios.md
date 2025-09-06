# 프로젝트 관리 테스트 시나리오 및 Acceptance Criteria

## 1. 테스트 전략 Overview

### 테스트 피라미드
```
         E2E Tests (10%)
        /          \
    Integration (30%)
    /              \
Unit Tests (60%)
```

### 테스트 환경 설정
- **Runner:** Jest + React Testing Library
- **Mocking:** MSW (Mock Service Worker)
- **E2E:** Cypress
- **A11y:** jest-axe, cypress-axe
- **Performance:** Web Vitals API

## 2. Deterministic Test Fixtures (MSW)

### 2.1 프로젝트 목록 Mock Data
```typescript
// mocks/projects.fixtures.ts
export const mockProjects = [
  {
    id: 'proj-001',
    title: '2025 브랜드 홍보 영상',
    description: '회사 소개 및 제품 홍보를 위한 3분 영상',
    status: 'active',
    progress: 65,
    thumbnail: '/mock/thumb-001.jpg',
    teamCount: 5,
    lastUpdated: '2025-09-05T10:30:00Z',
    tags: ['마케팅', '영상', 'Q3'],
    owner: {
      id: 'user-001',
      name: '김프로',
      email: 'kim@example.com'
    }
  },
  {
    id: 'proj-002',
    title: '모바일 앱 튜토리얼',
    description: '신규 앱 기능 설명 튜토리얼 시리즈',
    status: 'active',
    progress: 30,
    thumbnail: '/mock/thumb-002.jpg',
    teamCount: 3,
    lastUpdated: '2025-09-05T08:15:00Z',
    tags: ['교육', '모바일', 'Q3']
  },
  // ... 더 많은 고정된 테스트 데이터
]

// MSW Handler
export const projectListHandler = rest.get('/api/projects', (req, res, ctx) => {
  const page = Number(req.url.searchParams.get('page')) || 1
  const limit = Number(req.url.searchParams.get('limit')) || 10
  const status = req.url.searchParams.get('status')
  const search = req.url.searchParams.get('search')
  
  let filtered = mockProjects
  
  if (status) {
    filtered = filtered.filter(p => p.status === status)
  }
  
  if (search) {
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    )
  }
  
  const start = (page - 1) * limit
  const end = start + limit
  
  return res(
    ctx.delay(100), // 일관된 지연 시간
    ctx.status(200),
    ctx.json({
      data: filtered.slice(start, end),
      total: filtered.length,
      page,
      pageSize: limit,
      hasMore: end < filtered.length
    })
  )
})
```

### 2.2 프로젝트 생성 Mock
```typescript
export const createProjectHandler = rest.post('/api/projects', async (req, res, ctx) => {
  const body = await req.json()
  
  // Validation
  if (!body.title || body.title.length < 3) {
    return res(
      ctx.status(400),
      ctx.json({
        error: 'INVALID_TITLE',
        message: '제목은 3자 이상이어야 합니다'
      })
    )
  }
  
  // Success response
  return res(
    ctx.delay(200),
    ctx.status(201),
    ctx.json({
      id: 'proj-new-001',
      ...body,
      status: 'active',
      progress: 0,
      createdAt: '2025-09-05T12:00:00Z',
      owner: {
        id: 'user-current',
        name: '현재 사용자',
        email: 'current@example.com'
      }
    })
  )
})
```

### 2.3 팀 초대 Mock
```typescript
export const inviteHandlers = [
  rest.post('/api/projects/:id/invite', async (req, res, ctx) => {
    const { id } = req.params
    const { email, role } = await req.json()
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'INVALID_EMAIL' })
      )
    }
    
    // Duplicate check
    if (email === 'existing@example.com') {
      return res(
        ctx.status(409),
        ctx.json({ error: 'ALREADY_MEMBER' })
      )
    }
    
    return res(
      ctx.delay(150),
      ctx.status(201),
      ctx.json({
        invitationId: 'inv-001',
        projectId: id,
        email,
        role,
        status: 'pending',
        expiresAt: '2025-09-12T12:00:00Z',
        invitedBy: 'user-current'
      })
    )
  })
]
```

## 3. Component Test Scenarios

### 3.1 프로젝트 카드 컴포넌트
```typescript
// features/project/ui/__tests__/ProjectCard.test.tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectCard } from '../ProjectCard'
import { mockProjects } from '@/mocks/projects.fixtures'

describe('ProjectCard', () => {
  const mockProject = mockProjects[0]
  
  it('프로젝트 정보가 올바르게 표시되어야 함', () => {
    render(<ProjectCard project={mockProject} />)
    
    expect(screen.getByText(mockProject.title)).toBeInTheDocument()
    expect(screen.getByText(mockProject.description)).toBeInTheDocument()
    expect(screen.getByText(`${mockProject.teamCount}명`)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: mockProject.title })).toHaveAttribute('src', mockProject.thumbnail)
  })
  
  it('진행률이 올바르게 표시되어야 함', () => {
    render(<ProjectCard project={mockProject} />)
    
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', String(mockProject.progress))
    expect(progressBar).toHaveAttribute('aria-label', `진행률 ${mockProject.progress}%`)
  })
  
  it('카드 클릭 시 상세 페이지로 이동해야 함', async () => {
    const user = userEvent.setup()
    const onClickMock = jest.fn()
    
    render(<ProjectCard project={mockProject} onClick={onClickMock} />)
    
    await user.click(screen.getByRole('article'))
    expect(onClickMock).toHaveBeenCalledWith(mockProject.id)
  })
  
  it('키보드 네비게이션이 가능해야 함', async () => {
    const user = userEvent.setup()
    const onClickMock = jest.fn()
    
    render(<ProjectCard project={mockProject} onClick={onClickMock} />)
    
    const card = screen.getByRole('article')
    await user.tab()
    expect(card).toHaveFocus()
    
    await user.keyboard('{Enter}')
    expect(onClickMock).toHaveBeenCalledWith(mockProject.id)
  })
})
```

### 3.2 필터 컴포넌트
```typescript
// features/project/ui/__tests__/ProjectFilter.test.tsx
describe('ProjectFilter', () => {
  it('필터 옵션이 올바르게 표시되어야 함', () => {
    render(<ProjectFilter />)
    
    expect(screen.getByRole('button', { name: '상태' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '날짜' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '태그' })).toBeInTheDocument()
  })
  
  it('상태 필터 선택 시 URL이 업데이트되어야 함', async () => {
    const user = userEvent.setup()
    const router = useRouter()
    
    render(<ProjectFilter />)
    
    await user.click(screen.getByRole('button', { name: '상태' }))
    await user.click(screen.getByRole('option', { name: '진행중' }))
    
    expect(router.push).toHaveBeenCalledWith({
      query: { status: 'active' }
    })
  })
  
  it('여러 필터 조합이 가능해야 함', async () => {
    const user = userEvent.setup()
    
    render(<ProjectFilter />)
    
    // 상태 필터
    await user.click(screen.getByRole('button', { name: '상태' }))
    await user.click(screen.getByRole('option', { name: '진행중' }))
    
    // 태그 필터
    await user.click(screen.getByRole('button', { name: '태그' }))
    await user.click(screen.getByRole('checkbox', { name: '마케팅' }))
    
    expect(screen.getByTestId('active-filters')).toHaveTextContent('2개 필터 적용중')
  })
})
```

## 4. Integration Test Scenarios

### 4.1 프로젝트 생성 플로우
```typescript
// app/projects/create/__tests__/create.integration.test.tsx
import { renderWithProviders } from '@/test-utils'
import { server } from '@/mocks/server'
import CreateProjectPage from '../page'

describe('프로젝트 생성 통합 테스트', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
  
  it('전체 프로젝트 생성 플로우가 작동해야 함', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateProjectPage />)
    
    // Step 1: 기본 정보
    await user.type(screen.getByLabelText('프로젝트 제목'), '새 프로젝트')
    await user.type(screen.getByLabelText('설명'), '프로젝트 설명입니다')
    await user.selectOptions(screen.getByLabelText('카테고리'), '마케팅')
    
    await user.click(screen.getByRole('button', { name: '다음' }))
    
    // Step 2: 팀 구성
    await waitFor(() => {
      expect(screen.getByText('팀 구성')).toBeInTheDocument()
    })
    
    await user.type(screen.getByLabelText('이메일 주소'), 'member@example.com')
    await user.click(screen.getByRole('button', { name: '초대' }))
    
    expect(await screen.findByText('member@example.com')).toBeInTheDocument()
    
    await user.click(screen.getByRole('button', { name: '다음' }))
    
    // Step 3: 프로젝트 설정
    await waitFor(() => {
      expect(screen.getByText('프로젝트 설정')).toBeInTheDocument()
    })
    
    await user.click(screen.getByLabelText('자동 일정'))
    
    // 프로젝트 생성
    await user.click(screen.getByRole('button', { name: '프로젝트 생성' }))
    
    // 성공 메시지 확인
    expect(await screen.findByText('프로젝트가 생성되었습니다')).toBeInTheDocument()
    
    // 리다이렉트 확인
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/projects/proj-new-001')
    }, { timeout: 4000 })
  })
  
  it('유효성 검사 오류가 올바르게 표시되어야 함', async () => {
    const user = userEvent.setup()
    renderWithProviders(<CreateProjectPage />)
    
    // 빈 폼 제출 시도
    await user.click(screen.getByRole('button', { name: '다음' }))
    
    expect(await screen.findByText('제목을 입력해 주세요')).toBeInTheDocument()
    expect(screen.getByText('설명을 입력해 주세요')).toBeInTheDocument()
  })
})
```

### 4.2 실시간 협업 테스트
```typescript
// features/project/__tests__/realtime.integration.test.tsx
import { renderWithProviders } from '@/test-utils'
import { setupWebSocketMock } from '@/mocks/websocket'

describe('실시간 협업 기능', () => {
  let wsMock: ReturnType<typeof setupWebSocketMock>
  
  beforeEach(() => {
    wsMock = setupWebSocketMock()
  })
  
  afterEach(() => {
    wsMock.cleanup()
  })
  
  it('온라인 멤버 상태가 실시간으로 업데이트되어야 함', async () => {
    renderWithProviders(<ProjectDetailPage id="proj-001" />)
    
    // WebSocket 연결 확인
    await waitFor(() => {
      expect(wsMock.isConnected()).toBe(true)
    })
    
    // 멤버 온라인 이벤트 발송
    wsMock.send({
      type: 'member_online',
      data: {
        userId: 'user-002',
        name: '김개발',
        status: 'online'
      }
    })
    
    // UI 업데이트 확인
    expect(await screen.findByText('김개발')).toBeInTheDocument()
    expect(screen.getByTestId('online-indicator-user-002')).toHaveClass('bg-green-500')
  })
  
  it('활동 타임라인이 실시간으로 추가되어야 함', async () => {
    renderWithProviders(<ProjectDetailPage id="proj-001" />)
    
    await waitFor(() => {
      expect(wsMock.isConnected()).toBe(true)
    })
    
    // 새 활동 이벤트
    wsMock.send({
      type: 'activity',
      data: {
        id: 'act-001',
        user: '박디자인',
        action: '파일을 업로드했습니다',
        timestamp: '2025-09-05T14:30:00Z'
      }
    })
    
    expect(await screen.findByText('박디자인')).toBeInTheDocument()
    expect(screen.getByText('파일을 업로드했습니다')).toBeInTheDocument()
  })
})
```

## 5. E2E Test Scenarios (Cypress)

### 5.1 Critical User Journey
```typescript
// cypress/e2e/project-management.cy.ts
describe('프로젝트 관리 E2E', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password')
    cy.visit('/projects')
  })
  
  it('프로젝트 생성 → 팀 초대 → 작업 시작 플로우', () => {
    // 프로젝트 생성
    cy.findByRole('button', { name: '새 프로젝트' }).click()
    
    // Step 1
    cy.findByLabelText('프로젝트 제목').type('E2E 테스트 프로젝트')
    cy.findByLabelText('설명').type('Cypress E2E 테스트를 위한 프로젝트')
    cy.findByLabelText('카테고리').select('개발')
    cy.findByRole('button', { name: '다음' }).click()
    
    // Step 2
    cy.findByLabelText('이메일 주소').type('teammate@example.com')
    cy.findByRole('button', { name: '초대' }).click()
    cy.findByText('teammate@example.com').should('exist')
    cy.findByRole('button', { name: '다음' }).click()
    
    // Step 3
    cy.findByLabelText('공개 범위').select('팀')
    cy.findByRole('button', { name: '프로젝트 생성' }).click()
    
    // 성공 확인
    cy.findByText('프로젝트가 생성되었습니다', { timeout: 5000 }).should('exist')
    cy.url().should('match', /\/projects\/[a-z0-9-]+$/)
    
    // 상세 페이지 확인
    cy.findByRole('heading', { name: 'E2E 테스트 프로젝트' }).should('exist')
    cy.findByText('teammate@example.com (초대 대기중)').should('exist')
  })
  
  it('필터링 및 검색 기능', () => {
    // 검색
    cy.findByRole('searchbox').type('비디오')
    cy.wait(500) // 디바운스 대기
    
    cy.findAllByTestId('project-card').should('have.length.lessThan', 10)
    cy.findAllByText(/비디오/i).should('exist')
    
    // 상태 필터
    cy.findByRole('button', { name: '상태' }).click()
    cy.findByRole('option', { name: '진행중' }).click()
    
    cy.url().should('include', 'status=active')
    cy.findAllByTestId('status-badge').each($el => {
      cy.wrap($el).should('contain', '진행중')
    })
    
    // 필터 초기화
    cy.findByRole('button', { name: '필터 초기화' }).click()
    cy.url().should('not.include', 'status')
  })
})
```

### 5.2 Performance Test
```typescript
// cypress/e2e/performance.cy.ts
describe('성능 테스트', () => {
  it('INP가 200ms 이내여야 함', () => {
    cy.visit('/projects')
    cy.vitals({
      onReport: (metrics) => {
        expect(metrics.INP).to.be.lessThan(200)
      }
    })
    
    // 상호작용 테스트
    cy.findByRole('button', { name: '그리드 뷰' }).click()
    cy.findByRole('button', { name: '리스트 뷰' }).click()
    
    cy.vitals({
      onReport: (metrics) => {
        expect(metrics.INP).to.be.lessThan(200)
      }
    })
  })
  
  it('리스트 스크롤 성능', () => {
    cy.visit('/projects')
    cy.wait('@getProjects')
    
    // 스크롤 성능 측정
    cy.window().then(win => {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          expect(entry.duration).to.be.lessThan(16) // 60fps
        })
      })
      observer.observe({ entryTypes: ['measure'] })
    })
    
    // 빠른 스크롤
    cy.scrollTo('bottom', { duration: 1000 })
    cy.scrollTo('top', { duration: 1000 })
  })
})
```

## 6. Accessibility Test Scenarios

### 6.1 자동화된 접근성 테스트
```typescript
// __tests__/a11y/project-management.a11y.test.tsx
import { axe } from 'jest-axe'
import { render } from '@testing-library/react'

describe('접근성 테스트', () => {
  it('프로젝트 목록 페이지', async () => {
    const { container } = render(<ProjectsPage />)
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
        'label': { enabled: true },
        'aria-roles': { enabled: true }
      }
    })
    
    expect(results).toHaveNoViolations()
  })
  
  it('프로젝트 생성 폼', async () => {
    const { container } = render(<CreateProjectForm />)
    const results = await axe(container)
    
    expect(results).toHaveNoViolations()
  })
  
  it('포커스 관리', async () => {
    const user = userEvent.setup()
    render(<ProjectsPage />)
    
    // Tab 키 네비게이션
    await user.tab()
    expect(screen.getByRole('link', { name: '홈' })).toHaveFocus()
    
    await user.tab()
    expect(screen.getByRole('searchbox')).toHaveFocus()
    
    await user.tab()
    expect(screen.getByRole('button', { name: '필터' })).toHaveFocus()
  })
})
```

### 6.2 스크린 리더 테스트
```typescript
describe('스크린 리더 지원', () => {
  it('상태 변경이 announce되어야 함', async () => {
    render(<ProjectFilter />)
    
    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    
    // 필터 적용
    await userEvent.click(screen.getByRole('button', { name: '상태' }))
    await userEvent.click(screen.getByRole('option', { name: '진행중' }))
    
    expect(liveRegion).toHaveTextContent('진행중 프로젝트 5개를 표시하고 있습니다')
  })
  
  it('에러 메시지가 올바르게 연결되어야 함', async () => {
    render(<CreateProjectForm />)
    
    const titleInput = screen.getByLabelText('프로젝트 제목')
    await userEvent.click(screen.getByRole('button', { name: '다음' }))
    
    const errorId = titleInput.getAttribute('aria-describedby')
    const errorMessage = document.getElementById(errorId!)
    
    expect(errorMessage).toHaveTextContent('제목을 입력해 주세요')
    expect(titleInput).toHaveAttribute('aria-invalid', 'true')
  })
})
```

## 7. Performance Monitoring Implementation

### 7.1 Web Vitals 측정
```typescript
// utils/performance-monitor.ts
import { onINP, onLCP, onCLS } from 'web-vitals'

export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map()
  
  init() {
    // INP 측정
    onINP(metric => {
      this.metrics.set('INP', metric.value)
      if (metric.value > 200) {
        console.warn('INP exceeded target:', {
          value: metric.value,
          target: 200,
          entries: metric.entries
        })
        this.reportToAnalytics('inp_exceeded', metric)
      }
    })
    
    // LCP 측정
    onLCP(metric => {
      this.metrics.set('LCP', metric.value)
      if (metric.value > 2500) {
        this.reportToAnalytics('lcp_exceeded', metric)
      }
    })
    
    // CLS 측정
    onCLS(metric => {
      this.metrics.set('CLS', metric.value)
      if (metric.value > 0.1) {
        this.reportToAnalytics('cls_exceeded', metric)
      }
    })
  }
  
  measureInteraction(name: string, fn: () => void) {
    const start = performance.now()
    fn()
    const duration = performance.now() - start
    
    if (duration > 200) {
      console.warn(`Interaction "${name}" exceeded INP target:`, duration)
    }
    
    return duration
  }
  
  private reportToAnalytics(event: string, data: any) {
    // Analytics reporting
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', event, data)
    }
  }
}
```

### 7.2 컴포넌트 레벨 성능 측정
```typescript
// hooks/usePerformanceTracking.ts
export function usePerformanceTracking(componentName: string) {
  useEffect(() => {
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.name.includes(componentName)) {
          console.log(`${componentName} render time:`, entry.duration)
        }
      })
    })
    
    observer.observe({ entryTypes: ['measure'] })
    
    return () => observer.disconnect()
  }, [componentName])
  
  const trackInteraction = useCallback((interactionName: string, callback: () => void) => {
    performance.mark(`${componentName}-${interactionName}-start`)
    callback()
    performance.mark(`${componentName}-${interactionName}-end`)
    performance.measure(
      `${componentName}-${interactionName}`,
      `${componentName}-${interactionName}-start`,
      `${componentName}-${interactionName}-end`
    )
  }, [componentName])
  
  return { trackInteraction }
}
```

## 8. Test Data Management

### 8.1 테스트 데이터 팩토리
```typescript
// test-utils/factories.ts
import { Factory } from 'fishery'

export const projectFactory = Factory.define<Project>(({ sequence }) => ({
  id: `proj-${sequence}`,
  title: `테스트 프로젝트 ${sequence}`,
  description: '테스트 설명',
  status: 'active',
  progress: Math.floor(Math.random() * 100),
  thumbnail: `/mock/thumb-${sequence}.jpg`,
  teamCount: Math.floor(Math.random() * 10) + 1,
  lastUpdated: new Date().toISOString(),
  tags: ['테스트'],
  owner: userFactory.build()
}))

export const userFactory = Factory.define<User>(({ sequence }) => ({
  id: `user-${sequence}`,
  name: `사용자${sequence}`,
  email: `user${sequence}@example.com`,
  avatar: `/mock/avatar-${sequence}.jpg`,
  role: 'member'
}))

// 사용 예시
const projects = projectFactory.buildList(10)
const projectWithSpecificStatus = projectFactory.build({ status: 'completed' })
```

### 8.2 시나리오 기반 데이터 세트
```typescript
// test-utils/scenarios.ts
export const testScenarios = {
  emptyState: {
    projects: [],
    invitations: []
  },
  
  happyPath: {
    projects: projectFactory.buildList(5, { status: 'active' }),
    invitations: invitationFactory.buildList(2, { status: 'pending' })
  },
  
  edgeCases: {
    longTitle: projectFactory.build({
      title: 'a'.repeat(100)
    }),
    manyTags: projectFactory.build({
      tags: Array.from({ length: 20 }, (_, i) => `태그${i}`)
    }),
    largeTeam: projectFactory.build({
      teamCount: 100
    })
  },
  
  errorStates: {
    networkError: new Error('Network request failed'),
    unauthorized: { status: 401, message: 'Unauthorized' },
    serverError: { status: 500, message: 'Internal server error' }
  }
}
```

## 9. Test Coverage Report

### 필수 커버리지 목표
| Component/Feature | Unit | Integration | E2E | Total Target |
|------------------|------|-------------|-----|--------------|
| Project List | 85% | 75% | 100% | 85% |
| Project Creation | 90% | 80% | 100% | 90% |
| Team Management | 85% | 75% | 90% | 85% |
| Filters/Search | 80% | 70% | 100% | 80% |
| Real-time Updates | 70% | 80% | 80% | 75% |

### 커버리지 실행 명령어
```bash
# Unit tests with coverage
pnpm test:unit --coverage

# Integration tests
pnpm test:integration --coverage

# E2E tests
pnpm cypress:run --record

# A11y tests
pnpm test:a11y

# Combined report
pnpm test:coverage:report
```

---

**문서 버전:** 1.0.0
**작성자:** Eleanor (Frontend UX Lead)
**최종 수정:** 2025-09-05
**검증 상태:** Ready for Implementation