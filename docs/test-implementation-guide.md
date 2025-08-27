# TDD 구현 가이드 - FSD 아키텍처 기반
## vridge 프로젝트 Next.js 전환을 위한 실무 가이드

---

## 🎯 Part 1: FSD 레이어별 테스트 작성 가이드

### 1.1 Shared Layer 테스트
```typescript
// src/shared/lib/validators/__tests__/email.test.ts
import { describe, it, expect } from 'vitest';
import { validateEmail } from '../email';

describe('Shared/Validators/Email', () => {
  describe('validateEmail', () => {
    // Arrange - Act - Assert 패턴
    it('유효한 이메일 형식을 통과시켜야 한다', () => {
      // Arrange
      const validEmails = [
        'user@example.com',
        'test.user+tag@company.co.kr',
        'admin@subdomain.example.org'
      ];
      
      // Act & Assert
      validEmails.forEach(email => {
        expect(validateEmail(email)).toBe(true);
      });
    });
    
    it('유효하지 않은 이메일 형식을 거부해야 한다', () => {
      const invalidEmails = [
        'invalid.email',
        '@example.com',
        'user@',
        'user space@example.com'
      ];
      
      invalidEmails.forEach(email => {
        expect(validateEmail(email)).toBe(false);
      });
    });
    
    it('빈 문자열이나 null을 처리해야 한다', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
      expect(validateEmail(undefined as any)).toBe(false);
    });
  });
});
```

### 1.2 Entities Layer 테스트
```typescript
// src/entities/user/model/__tests__/user.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { User, UserRole } from '../types';
import { createUser, validateUser, sanitizeUser } from '../user';

describe('Entities/User/Model', () => {
  let mockUserData: any;
  
  beforeEach(() => {
    mockUserData = {
      id: '123',
      email: 'test@example.com',
      name: '홍길동',
      role: UserRole.MEMBER,
      createdAt: new Date('2024-01-01')
    };
  });
  
  describe('createUser', () => {
    it('유효한 데이터로 User 객체를 생성해야 한다', () => {
      // Given
      const userData = mockUserData;
      
      // When
      const user = createUser(userData);
      
      // Then
      expect(user).toMatchObject({
        id: '123',
        email: 'test@example.com',
        name: '홍길동',
        role: UserRole.MEMBER
      });
      expect(user.createdAt).toBeInstanceOf(Date);
    });
    
    it('필수 필드가 없으면 에러를 발생시켜야 한다', () => {
      // Given
      const invalidData = { ...mockUserData, email: undefined };
      
      // When & Then
      expect(() => createUser(invalidData)).toThrow('Email is required');
    });
  });
  
  describe('validateUser', () => {
    it('유효한 User 객체를 검증해야 한다', () => {
      const user = createUser(mockUserData);
      expect(validateUser(user)).toBe(true);
    });
    
    it('유효하지 않은 role을 거부해야 한다', () => {
      const invalidUser = { ...mockUserData, role: 'INVALID_ROLE' };
      expect(validateUser(invalidUser)).toBe(false);
    });
  });
});
```

### 1.3 Features Layer 테스트
```typescript
// src/features/auth/model/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { useAuth } from '../useAuth';
import { authApi } from '../../api/authApi';

// MSW 서버 설정
const server = setupServer(
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        user: { id: '1', email: 'test@example.com' },
        token: 'mock-jwt-token'
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Features/Auth/Model', () => {
  describe('useAuth Hook', () => {
    it('로그인 성공 시 사용자 정보를 저장해야 한다', async () => {
      // Given
      const { result } = renderHook(() => useAuth());
      
      // When
      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
      });
      
      // Then
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user?.email).toBe('test@example.com');
        expect(result.current.token).toBe('mock-jwt-token');
      });
    });
    
    it('로그인 실패 시 에러를 반환해야 한다', async () => {
      // Given - 실패 응답 설정
      server.use(
        rest.post('/api/auth/login', (req, res, ctx) => {
          return res(
            ctx.status(401),
            ctx.json({ message: 'Invalid credentials' })
          );
        })
      );
      
      const { result } = renderHook(() => useAuth());
      
      // When & Then
      await act(async () => {
        await expect(
          result.current.login({
            email: 'wrong@example.com',
            password: 'wrongpass'
          })
        ).rejects.toThrow('Invalid credentials');
      });
      
      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});
```

### 1.4 Widgets Layer 테스트
```typescript
// src/widgets/header/__tests__/Header.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { useAuth } from '@/features/auth';

// Mock features
vi.mock('@/features/auth', () => ({
  useAuth: vi.fn()
}));

describe('Widgets/Header', () => {
  it('로그인한 사용자에게 프로필 메뉴를 표시해야 한다', () => {
    // Given
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { name: '홍길동', email: 'test@example.com' }
    });
    
    // When
    render(<Header />);
    
    // Then
    expect(screen.getByText('홍길동')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /profile/i })).toBeInTheDocument();
  });
  
  it('로그아웃 버튼 클릭 시 로그아웃을 실행해야 한다', async () => {
    // Given
    const mockLogout = vi.fn();
    (useAuth as any).mockReturnValue({
      isAuthenticated: true,
      user: { name: '홍길동' },
      logout: mockLogout
    });
    
    const user = userEvent.setup();
    render(<Header />);
    
    // When
    const profileButton = screen.getByRole('button', { name: /profile/i });
    await user.click(profileButton);
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await user.click(logoutButton);
    
    // Then
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
```

### 1.5 Pages Layer 테스트
```typescript
// src/pages/project/__tests__/ProjectListPage.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProjectListPage } from '../ProjectListPage';
import { setupMockServer } from '@/shared/lib/test-utils';

const { server } = setupMockServer();

describe('Pages/ProjectList', () => {
  it('프로젝트 목록을 렌더링해야 한다', async () => {
    // Given - MSW로 API 응답 설정
    server.use(
      rest.get('/api/projects', (req, res, ctx) => {
        return res(
          ctx.json({
            projects: [
              { id: '1', title: '프로젝트 A', status: 'active' },
              { id: '2', title: '프로젝트 B', status: 'completed' }
            ]
          })
        );
      })
    );
    
    // When
    render(<ProjectListPage />);
    
    // Then
    await waitFor(() => {
      expect(screen.getByText('프로젝트 A')).toBeInTheDocument();
      expect(screen.getByText('프로젝트 B')).toBeInTheDocument();
    });
  });
  
  it('에러 발생 시 에러 메시지를 표시해야 한다', async () => {
    // Given
    server.use(
      rest.get('/api/projects', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ message: 'Server Error' })
        );
      })
    );
    
    // When
    render(<ProjectListPage />);
    
    // Then
    await waitFor(() => {
      expect(screen.getByText(/오류가 발생했습니다/)).toBeInTheDocument();
    });
  });
});
```

---

## 🔧 Part 2: 테스트 유틸리티 및 헬퍼

### 2.1 공통 테스트 유틸리티
```typescript
// src/shared/lib/test-utils/render.tsx
import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: any;
  store?: any;
  route?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialState,
    store = configureStore({
      reducer: rootReducer,
      preloadedState: initialState
    }),
    route = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  window.history.pushState({}, 'Test page', route);
  
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>
          {children}
        </MemoryRouter>
      </Provider>
    );
  }
  
  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions })
  };
}
```

### 2.2 MSW 핸들러 팩토리
```typescript
// src/shared/lib/test-utils/mocks/handlers.ts
import { rest } from 'msw';

export const createAuthHandlers = (overrides = {}) => [
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body as any;
    
    if (email === 'test@example.com' && password === 'password123') {
      return res(
        ctx.json({
          user: { id: '1', email, name: 'Test User' },
          token: 'mock-token',
          ...overrides
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ message: 'Invalid credentials' })
    );
  }),
  
  rest.post('/api/auth/logout', (req, res, ctx) => {
    return res(ctx.status(200));
  })
];

export const createProjectHandlers = (projects = []) => [
  rest.get('/api/projects', (req, res, ctx) => {
    return res(ctx.json({ projects }));
  }),
  
  rest.post('/api/projects', (req, res, ctx) => {
    const newProject = req.body;
    return res(
      ctx.status(201),
      ctx.json({ project: { id: 'new-id', ...newProject } })
    );
  })
];
```

### 2.3 테스트 데이터 빌더
```typescript
// src/shared/lib/test-utils/builders/user.builder.ts
export class UserBuilder {
  private user = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'member',
    createdAt: new Date()
  };
  
  withId(id: string) {
    this.user.id = id;
    return this;
  }
  
  withEmail(email: string) {
    this.user.email = email;
    return this;
  }
  
  withName(name: string) {
    this.user.name = name;
    return this;
  }
  
  withRole(role: string) {
    this.user.role = role;
    return this;
  }
  
  asAdmin() {
    this.user.role = 'admin';
    return this;
  }
  
  build() {
    return { ...this.user };
  }
  
  buildMany(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      ...this.user,
      id: `${this.user.id}-${i}`,
      email: `test${i}@example.com`,
      name: `${this.user.name} ${i}`
    }));
  }
}

// 사용 예시
const adminUser = new UserBuilder()
  .withName('관리자')
  .asAdmin()
  .build();
```

---

## 🎯 Part 3: Contract Testing (API 스키마 검증)

### 3.1 API Contract 테스트
```typescript
// src/features/project/api/__tests__/project.contract.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { projectApi } from '../projectApi';

// API 응답 스키마 정의
const ProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  owner: z.object({
    id: z.string(),
    name: z.string()
  }),
  members: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.enum(['owner', 'admin', 'member', 'viewer'])
  }))
});

describe('Project API Contract', () => {
  it('GET /api/projects 응답이 스키마와 일치해야 한다', async () => {
    // When
    const response = await projectApi.getProjects();
    
    // Then
    expect(() => {
      z.array(ProjectSchema).parse(response.projects);
    }).not.toThrow();
  });
  
  it('POST /api/projects 요청/응답이 스키마와 일치해야 한다', async () => {
    // Given
    const newProject = {
      title: '새 프로젝트',
      description: '프로젝트 설명'
    };
    
    // When
    const response = await projectApi.createProject(newProject);
    
    // Then
    expect(() => {
      ProjectSchema.parse(response.project);
    }).not.toThrow();
  });
});
```

---

## 🚀 Part 4: E2E 테스트 전략

### 4.1 Critical User Journey 테스트
```typescript
// e2e/critical-paths/user-onboarding.spec.ts
import { test, expect } from '@playwright/test';
import { createTestUser, deleteTestUser } from '../helpers/user';

test.describe('사용자 온보딩 플로우', () => {
  let testUser: any;
  
  test.afterEach(async () => {
    if (testUser) {
      await deleteTestUser(testUser.email);
    }
  });
  
  test('신규 사용자가 회원가입하고 첫 프로젝트를 생성할 수 있다', async ({ page }) => {
    // 1. 회원가입 페이지 방문
    await page.goto('/signup');
    
    // 2. 회원가입 폼 작성
    await page.fill('[name="email"]', 'newuser@test.com');
    await page.fill('[name="password"]', 'Test123!@#');
    await page.fill('[name="name"]', '테스트 사용자');
    await page.click('button[type="submit"]');
    
    // 3. 이메일 인증 (테스트 환경에서는 자동 인증)
    await expect(page).toHaveURL('/welcome');
    
    // 4. 첫 프로젝트 생성
    await page.click('text=첫 프로젝트 만들기');
    await page.fill('[name="projectTitle"]', '나의 첫 프로젝트');
    await page.fill('[name="projectDescription"]', '프로젝트 설명입니다');
    await page.click('text=프로젝트 생성');
    
    // 5. 프로젝트 대시보드 확인
    await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+/);
    await expect(page.locator('h1')).toContainText('나의 첫 프로젝트');
    
    testUser = { email: 'newuser@test.com' };
  });
});
```

### 4.2 Cross-browser 테스트
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

---

## 📊 Part 5: 테스트 커버리지 및 품질 메트릭

### 5.1 Vitest 설정
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.ts',
        '**/*.d.ts',
        '**/*.stories.tsx',
        '**/index.ts'
      ],
      thresholds: {
        branches: 65,
        functions: 75,
        lines: 70,
        statements: 70
      }
    },
    testMatch: [
      '**/__tests__/**/*.{test,spec}.{js,ts,jsx,tsx}',
      '**/*.{test,spec}.{js,ts,jsx,tsx}'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/app': path.resolve(__dirname, './src/app'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/widgets': path.resolve(__dirname, './src/widgets'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/entities': path.resolve(__dirname, './src/entities'),
      '@/shared': path.resolve(__dirname, './src/shared')
    }
  }
});
```

### 5.2 Mutation Testing 설정
```json
// stryker.conf.json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "reporters": ["html", "clear-text", "progress", "dashboard"],
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.{js,ts,jsx,tsx}",
    "!src/**/*.{test,spec}.{js,ts,jsx,tsx}",
    "!src/test/**/*"
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  },
  "dashboard": {
    "project": "github.com/yourorg/vridge",
    "version": "main"
  }
}
```

---

## 🎓 Part 6: 팀 온보딩 체크리스트

### 6.1 개발자 온보딩 (첫 주)
```markdown
## Day 1: TDD 기초
- [ ] TDD 개념 및 Red-Green-Refactor 사이클 이해
- [ ] 첫 번째 유닛 테스트 작성 (페어 프로그래밍)
- [ ] 테스트 실행 및 커버리지 확인

## Day 2: 테스트 도구
- [ ] Vitest 기본 사용법
- [ ] React Testing Library 패턴
- [ ] MSW를 이용한 API 모킹

## Day 3: FSD 레이어별 테스트
- [ ] Shared 레이어 테스트 작성
- [ ] Entities 레이어 테스트 작성
- [ ] Features 레이어 테스트 작성

## Day 4: 통합 테스트
- [ ] Widget 테스트 작성
- [ ] Page 테스트 작성
- [ ] E2E 테스트 실행

## Day 5: 실전 적용
- [ ] 실제 기능에 TDD 적용
- [ ] PR with 테스트 제출
- [ ] 코드 리뷰 및 피드백
```

### 6.2 테스트 작성 체크리스트
```typescript
interface TestChecklistz {
  before: [
    "요구사항을 명확히 이해했는가?",
    "테스트 시나리오를 도출했는가?",
    "엣지 케이스를 고려했는가?"
  ],
  
  during: [
    "실패하는 테스트를 먼저 작성했는가?",
    "최소한의 코드로 테스트를 통과시켰는가?",
    "리팩토링이 필요한 부분이 있는가?"
  ],
  
  after: [
    "테스트가 의도를 명확히 표현하는가?",
    "테스트가 독립적으로 실행되는가?",
    "커버리지가 충분한가?"
  ]
}
```

---

## 📈 결과 추적 대시보드

### 품질 메트릭 대시보드 구성
```yaml
# .github/workflows/quality-dashboard.yml
name: Quality Metrics Dashboard

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Tests with Coverage
        run: |
          npm test -- --coverage
          
      - name: Run Mutation Testing
        run: |
          npx stryker run
          
      - name: Analyze Code Quality
        run: |
          npx eslint . --format json > eslint-report.json
          
      - name: Upload Metrics
        uses: ./.github/actions/upload-metrics
        with:
          coverage-report: coverage/lcov.info
          mutation-report: reports/mutation/mutation.json
          lint-report: eslint-report.json
          
      - name: Update Dashboard
        run: |
          node scripts/update-dashboard.js
```

---

**작성**: Grace (QA Lead)
**날짜**: 2025-08-25
**버전**: 1.0.0