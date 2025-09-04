# 모듈 간 의존성 테스트 및 Mock 전략

## 모듈 의존성 매트릭스

### 의존성 레벨 정의
```
Level 0: 독립 모듈 (테스트 우선순위: 최고)
Level 1: 1단계 의존성 모듈  
Level 2: 2단계 의존성 모듈
Level 3: 최상위 통합 모듈
```

| 모듈 | 의존성 레벨 | 의존하는 모듈 | Mock 복잡도 |
|------|-------------|---------------|-------------|
| 인증 시스템 | Level 0 | 없음 | 낮음 |
| 프로젝트 관리 | Level 1 | 인증 | 낮음 |
| 대시보드 | Level 2 | 인증, 프로젝트 | 중간 |
| 캘린더 | Level 2 | 인증, 프로젝트 | 중간 |
| 영상 기획 | Level 3 | 인증, 프로젝트, 외부 LLM | 높음 |
| 영상 피드백 | Level 3 | 인증, 프로젝트, 대시보드 | 높음 |

## Contract-First Mock 전략

### 1. API Contract 정의
모든 모듈간 통신은 TypeScript 인터페이스로 사전 정의

```typescript
// contracts/auth.contract.ts
export interface AuthContract {
  getCurrentUser(): Promise<User>
  login(credentials: LoginRequest): Promise<AuthResponse>
  logout(): Promise<void>
  hasPermission(permission: Permission): boolean
}

// contracts/project.contract.ts  
export interface ProjectContract {
  getProjects(): Promise<Project[]>
  createProject(data: CreateProjectRequest): Promise<Project>
  updateProject(id: string, data: UpdateProjectRequest): Promise<Project>
  deleteProject(id: string): Promise<void>
  getProjectMembers(projectId: string): Promise<Member[]>
}

// contracts/dashboard.contract.ts
export interface DashboardContract {
  getFeedSummary(): Promise<FeedSummary>
  getUnreadCount(): Promise<number>
  getProjectStats(): Promise<ProjectStats>
  getRecentActivity(): Promise<Activity[]>
}
```

### 2. Mock Factory 시스템
각 모듈별 전용 Mock Factory 구현

```typescript
// test/mocks/factories/auth.factory.ts
export class AuthMockFactory {
  static createMockUser(overrides?: Partial<User>): User {
    return {
      id: 'mock-user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'Owner',
      permissions: ['READ', 'WRITE', 'DELETE'],
      ...overrides
    }
  }

  static createMockAuthContract(): AuthContract {
    return {
      getCurrentUser: vi.fn().mockResolvedValue(this.createMockUser()),
      login: vi.fn().mockResolvedValue({
        user: this.createMockUser(),
        token: 'mock-token',
        refreshToken: 'mock-refresh-token'
      }),
      logout: vi.fn().mockResolvedValue(undefined),
      hasPermission: vi.fn().mockReturnValue(true)
    }
  }
}

// test/mocks/factories/project.factory.ts
export class ProjectMockFactory {
  static createMockProject(overrides?: Partial<Project>): Project {
    return {
      id: 'mock-project-1',
      name: 'Test Project',
      description: 'Mock project for testing',
      status: 'ACTIVE',
      color: '#0031ff',
      createdAt: '2025-08-26T00:00:00Z',
      updatedAt: '2025-08-26T00:00:00Z',
      ownerId: 'mock-user-1',
      members: [],
      ...overrides
    }
  }

  static createMockProjectContract(): ProjectContract {
    const mockProjects = [
      this.createMockProject({ id: '1', name: 'Project Alpha' }),
      this.createMockProject({ id: '2', name: 'Project Beta' })
    ]

    return {
      getProjects: vi.fn().mockResolvedValue(mockProjects),
      createProject: vi.fn().mockImplementation((data) => 
        Promise.resolve(this.createMockProject({
          id: `mock-${Date.now()}`,
          ...data
        }))
      ),
      updateProject: vi.fn().mockImplementation((id, data) =>
        Promise.resolve(this.createMockProject({ id, ...data }))
      ),
      deleteProject: vi.fn().mockResolvedValue(undefined),
      getProjectMembers: vi.fn().mockResolvedValue([])
    }
  }
}
```

### 3. 외부 API Mock 전략

#### Google Gemini LLM API Mock
```typescript
// test/mocks/external/gemini.mock.ts
export class GeminiMockFactory {
  static createSuccessResponse(prompt: string) {
    const mockResponses = {
      '브랜드 홍보 영상': {
        suggestions: [
          '제품 소개 시퀀스',
          '고객 인터뷰 시퀀스', 
          '브랜드 스토리텔링 시퀀스'
        ],
        structure: {
          intro: '30초 - 브랜드 소개',
          main: '90초 - 핵심 메시지',
          closing: '30초 - 콜투액션'
        }
      }
    }
    
    return mockResponses[prompt] || mockResponses['브랜드 홍보 영상']
  }

  static createErrorResponse(errorType: 'QUOTA_EXCEEDED' | 'API_ERROR' | 'NETWORK_ERROR') {
    const errors = {
      QUOTA_EXCEEDED: { code: 429, message: 'API quota exceeded' },
      API_ERROR: { code: 500, message: 'Internal server error' },
      NETWORK_ERROR: { code: 503, message: 'Service unavailable' }
    }
    
    return errors[errorType]
  }

  static mockGeminiAPI() {
    // Google Gemini API 완전 모킹
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify(this.createSuccessResponse('브랜드 홍보 영상'))
                }]
              }
            }]
          })
        })
      }
      return Promise.reject(new Error('Unknown API'))
    })
  }
}
```

#### SendGrid Email API Mock
```typescript
// test/mocks/external/sendgrid.mock.ts
export class SendGridMockFactory {
  static mockSuccessfulEmail() {
    return {
      messageId: `mock-${Date.now()}`,
      status: 'SENT',
      timestamp: new Date().toISOString()
    }
  }

  static mockRateLimitError() {
    return {
      error: 'Rate limit exceeded',
      code: 429,
      retryAfter: 60 // seconds
    }
  }

  static mockSendGridAPI() {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('api.sendgrid.com')) {
        // 쿨다운 로직 테스트를 위한 조건부 응답
        const shouldFailWithRateLimit = Math.random() < 0.1 // 10% 확률로 실패
        
        if (shouldFailWithRateLimit) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve(this.mockRateLimitError())
          })
        }
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(this.mockSuccessfulEmail())
        })
      }
      return Promise.reject(new Error('Unknown API'))
    })
  }
}
```

### 4. 모듈별 통합 테스트 시나리오

#### 대시보드 ↔ 프로젝트 관리 통합
```typescript
// test/integration/dashboard-project.integration.test.ts
describe('대시보드-프로젝트 관리 통합', () => {
  beforeEach(() => {
    // 프로젝트 관리 모듈 모킹
    const mockProjectContract = ProjectMockFactory.createMockProjectContract()
    vi.mocked(mockProjectContract.getProjects).mockResolvedValue([
      ProjectMockFactory.createMockProject({ 
        id: '1', 
        name: 'Active Project',
        status: 'ACTIVE' 
      })
    ])
  })

  it('대시보드에서 프로젝트 통계 정확 표시', async () => {
    const dashboard = render(<Dashboard />)
    
    await waitFor(() => {
      expect(dashboard.getByText('활성 프로젝트: 1개')).toBeInTheDocument()
    })
  })

  it('프로젝트 생성 시 대시보드 실시간 업데이트', async () => {
    const dashboard = render(<Dashboard />)
    const projectForm = render(<CreateProjectForm />)
    
    // 새 프로젝트 생성
    await userEvent.type(projectForm.getByLabelText('프로젝트명'), 'New Project')
    await userEvent.click(projectForm.getByText('생성'))
    
    // 대시보드 자동 업데이트 확인
    await waitFor(() => {
      expect(dashboard.getByText('활성 프로젝트: 2개')).toBeInTheDocument()
    })
  })
})
```

#### 캘린더 ↔ 프로젝트 관리 통합
```typescript
// test/integration/calendar-project.integration.test.ts
describe('캘린더-프로젝트 관리 통합', () => {
  it('프로젝트별 색상 시스템 일관성 검증', async () => {
    const mockProject = ProjectMockFactory.createMockProject({
      id: '1',
      name: 'Blue Project', 
      color: '#0031ff'
    })
    
    const calendar = render(<Calendar />)
    const projectList = render(<ProjectList />)
    
    // 프로젝트 색상이 캘린더와 프로젝트 목록에서 동일한지 확인
    const calendarEvent = calendar.getByTestId('calendar-event-1')
    const projectItem = projectList.getByTestId('project-item-1')
    
    expect(calendarEvent).toHaveStyle('background-color: #0031ff')
    expect(projectItem).toHaveStyle('border-color: #0031ff')
  })
})
```

## 모듈별 Mock 설정 자동화

### 1. 테스트 환경별 Mock 프리셋
```typescript
// test/presets/module-presets.ts
export class MockPresets {
  // 대시보드 모듈 테스트용 프리셋
  static setupDashboardEnvironment() {
    AuthMockFactory.mockAuthAPI()
    ProjectMockFactory.mockProjectAPI()
    
    // 대시보드 특화 Mock 데이터
    const mockFeedData = {
      unreadCount: 5,
      recentActivities: [
        { id: '1', type: 'PROJECT_CREATED', timestamp: '2025-08-26T10:00:00Z' },
        { id: '2', type: 'COMMENT_ADDED', timestamp: '2025-08-26T09:30:00Z' }
      ]
    }
    
    global.fetchMockResponses = {
      '/api/dashboard/feed': mockFeedData
    }
  }
  
  // 캘린더 모듈 테스트용 프리셋  
  static setupCalendarEnvironment() {
    AuthMockFactory.mockAuthAPI()
    ProjectMockFactory.mockProjectAPI()
    
    // 캘린더 특화 Mock 데이터
    const mockScheduleData = [
      {
        id: '1',
        projectId: '1',
        type: 'SHOOTING',
        startTime: '2025-08-26T09:00:00Z',
        endTime: '2025-08-26T11:00:00Z',
        participants: ['user1', 'user2']
      }
    ]
    
    global.fetchMockResponses = {
      '/api/calendar/schedules': mockScheduleData
    }
  }

  // 영상 기획 모듈 테스트용 프리셋
  static setupVideoPlanningEnvironment() {
    AuthMockFactory.mockAuthAPI() 
    ProjectMockFactory.mockProjectAPI()
    GeminiMockFactory.mockGeminiAPI()
    
    // PDF 생성 서비스 모킹
    global.fetchMockResponses = {
      '/api/pdf/generate': { pdfUrl: 'mock-pdf-url.pdf' }
    }
  }
}
```

### 2. 자동화된 Mock 설정 헬퍼
```typescript
// test/utils/mock-setup.ts
export function setupModuleMocks(modules: string[]) {
  modules.forEach(module => {
    switch(module) {
      case 'dashboard':
        MockPresets.setupDashboardEnvironment()
        break
      case 'calendar': 
        MockPresets.setupCalendarEnvironment()
        break
      case 'video-planning':
        MockPresets.setupVideoPlanningEnvironment()
        break
      case 'video-feedback':
        MockPresets.setupVideoFeedbackEnvironment()
        break
      case 'project-management':
        MockPresets.setupProjectManagementEnvironment()
        break
    }
  })
}

// 사용 예시
describe('Dashboard Module', () => {
  beforeAll(() => {
    setupModuleMocks(['dashboard', 'project-management', 'auth'])
  })
  
  // 테스트 케이스들...
})
```

## Cross-Module 의존성 테스트 매트릭스

| From\To | Auth | Project | Dashboard | Calendar | Planning | Feedback |
|---------|------|---------|-----------|----------|----------|----------|
| Auth | - | ✅ Login | ✅ User Info | ✅ Permissions | ✅ API Keys | ✅ Sessions |
| Project | ❌ | - | ✅ Stats | ✅ Schedules | ✅ Context | ✅ Videos |
| Dashboard | ❌ | ✅ Data | - | ✅ Summary | ✅ Alerts | ✅ Activity |
| Calendar | ❌ | ✅ Events | ❌ | - | ✅ Deadlines | ✅ Reviews |
| Planning | ❌ | ✅ Meta | ❌ | ✅ Schedule | - | ✅ Assets |
| Feedback | ❌ | ✅ Context | ✅ Notify | ❌ | ✅ Source | - |

범례:
- ✅: 직접 의존성 (Mock 필수)
- ❌: 의존성 없음 (Mock 불필요)
- 📊: 데이터 의존성 (선택적 Mock)

## 성공 지표
- **Mock 설정 시간**: 모듈당 < 5분
- **의존성 오류 감소**: 90% 감소
- **Cross-module 테스트 안정성**: 95% 이상
- **Mock 유지보수 시간**: 주당 < 2시간