# 네비게이션 시스템 실패 시나리오 및 복구 전략

## 개요
네비게이션 시스템에서 발생할 수 있는 모든 실패 시나리오를 분석하고, 각각에 대한 구체적인 테스트 방법과 복구 전략을 제시합니다.

## 실패 시나리오 분류

### 1. 클라이언트 사이드 실패

#### 1.1 JavaScript Runtime 에러
**발생 상황**: 
- 컴포넌트 렌더링 중 예외 발생
- 잘못된 props나 state 접근
- 메모리 부족으로 인한 스크립트 중단

**테스트 방법**:
```typescript
// ErrorBoundary 테스트
test('should catch navigation component errors gracefully', () => {
  const ThrowError = () => {
    throw new Error('Navigation component error')
  }
  
  render(
    <ErrorBoundary>
      <SideBar />
      <ThrowError />
    </ErrorBoundary>
  )
  
  expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  expect(screen.getByText('사이드바')).toBeInTheDocument() // SideBar는 여전히 작동
})
```

**복구 전략**:
- ErrorBoundary로 컴포넌트 격리
- 에러 발생 시 fallback UI 제공
- 사이드바 네비게이션만큼은 항상 유지

#### 1.2 Router 상태 불일치
**발생 상황**:
- URL과 내부 라우터 상태 불일치
- 브라우저 히스토리 조작으로 인한 상태 오류
- 동시성 이슈로 인한 라우팅 충돌

**테스트 방법**:
```typescript
test('should handle router state inconsistency', async () => {
  const { rerender } = render(<SideBar />)
  
  // URL 변경 시뮬레이션
  window.history.pushState({}, '', '/invalid-route')
  
  rerender(<SideBar />)
  
  // 사이드바는 여전히 작동해야 함
  const planningMenu = screen.getByTestId('menu-planning')
  await userEvent.click(planningMenu)
  
  expect(mockRouter.push).toHaveBeenCalledWith('/planning')
})
```

**복구 전략**:
- Router state와 실제 URL 정기적 동기화
- 불일치 감지 시 자동 리다이렉션
- 핵심 네비게이션 경로는 항상 유효성 검증

#### 1.3 메모리 누수
**발생 상황**:
- 이벤트 리스너 정리 누락
- 컴포넌트 언마운트 시 타이머 정리 실패
- 순환 참조로 인한 가비지 컬렉션 실패

**테스트 방법**:
```typescript
test('should cleanup event listeners on unmount', () => {
  const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
  const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
  
  const { unmount } = render(<SideBar />)
  
  const addCalls = addEventListenerSpy.mock.calls.length
  unmount()
  
  expect(removeEventListenerSpy).toHaveBeenCalledTimes(addCalls)
})

test('should not cause memory leaks with repeated navigation', async () => {
  for (let i = 0; i < 100; i++) {
    const { unmount } = render(<SideBar />)
    await userEvent.click(screen.getByTestId('menu-planning'))
    unmount()
  }
  
  // 메모리 사용량 체크 (실제로는 성능 도구 필요)
  expect(global.gc).toBeDefined() // --expose-gc 플래그 필요
  global.gc()
  // 메모리 측정 로직...
})
```

**복구 전략**:
- useEffect cleanup 함수로 리소스 정리
- WeakMap/WeakSet 사용으로 순환 참조 방지
- 정기적 메모리 모니터링 및 알림

### 2. 서버 사이드 실패

#### 2.1 API 엔드포인트 실패
**발생 상황**:
- 서브메뉴 데이터 로딩 실패 (500, 503 에러)
- 네트워크 타임아웃
- 인증 토큰 만료

**테스트 방법**:
```typescript
test('should handle API failures with retry mechanism', async () => {
  // 첫 번째 호출 실패, 두 번째 호출 성공 시뮬레이션
  server.use(
    rest.get('/api/menu/projects', (req, res, ctx) => {
      if (req.url.searchParams.get('retry') !== 'true') {
        return res.networkError('Connection failed')
      }
      return res(ctx.json([{ id: '1', label: 'Project 1' }]))
    })
  )
  
  render(<SideBar />)
  await userEvent.click(screen.getByTestId('menu-projects'))
  
  // 재시도 버튼이 표시되는지 확인
  await waitFor(() => {
    expect(screen.getByText('다시 시도')).toBeInTheDocument()
  })
  
  await userEvent.click(screen.getByText('다시 시도'))
  
  // 성공 후 서브메뉴 표시 확인
  await waitFor(() => {
    expect(screen.getByText('Project 1')).toBeInTheDocument()
  })
})
```

**복구 전략**:
- 지수 백오프를 사용한 자동 재시도
- 로컬 캐시 활용으로 오프라인 대응
- 우아한 성능 저하 (graceful degradation)

#### 2.2 서버 사이드 렌더링 실패
**발생 상황**:
- 동적 라우트에서 데이터 페칭 실패
- 서버 환경에서 클라이언트 전용 API 호출
- Hydration 불일치

**테스트 방법**:
```typescript
test('should handle SSR hydration mismatch', () => {
  // 서버와 클라이언트 렌더링 결과가 다른 상황 시뮬레이션
  const ServerComponent = () => <div>Server rendered</div>
  const ClientComponent = () => <div>Client rendered</div>
  
  const { container } = render(
    <div suppressHydrationWarning>
      {typeof window === 'undefined' ? <ServerComponent /> : <ClientComponent />}
    </div>
  )
  
  // 클라이언트에서 정상 렌더링 확인
  expect(container).toHaveTextContent('Client rendered')
})
```

**복구 전략**:
- 동적 import로 클라이언트 전용 컴포넌트 분리
- suppressHydrationWarning 선택적 사용
- 서버/클라이언트 분기 로직 최소화

### 3. 네트워크 관련 실패

#### 3.1 완전한 네트워크 단절
**발생 상황**:
- 오프라인 상태
- DNS 해결 실패
- 프록시/방화벽 차단

**테스트 방법**:
```typescript
test('should work offline with cached data', async () => {
  // 온라인 상태에서 데이터 로드
  render(<SideBar />)
  await userEvent.click(screen.getByTestId('menu-projects'))
  await waitFor(() => expect(screen.getByText('Project 1')).toBeInTheDocument())
  
  // 오프라인 모드로 전환
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  
  // 페이지 새로고침 시뮬레이션
  const { unmount } = render(<SideBar />)
  unmount()
  
  render(<SideBar />)
  await userEvent.click(screen.getByTestId('menu-projects'))
  
  // 캐시된 데이터로 여전히 작동하는지 확인
  await waitFor(() => {
    expect(screen.getByText('Project 1')).toBeInTheDocument()
  })
})
```

**복구 전략**:
- Service Worker로 오프라인 캐싱
- 네트워크 상태 감지 및 사용자 알림
- 중요 기능은 로컬 저장소 활용

#### 3.2 부분적 네트워크 실패
**발생 상황**:
- 특정 API만 실패 (CDN 문제 등)
- 간헐적 연결 불안정
- 느린 네트워크 환경

**테스트 방법**:
```typescript
test('should handle slow network gracefully', async () => {
  // 느린 응답 시뮬레이션 (3초 지연)
  server.use(
    rest.get('/api/menu/projects', (req, res, ctx) => {
      return res(
        ctx.delay(3000),
        ctx.json([{ id: '1', label: 'Project 1' }])
      )
    })
  )
  
  render(<SideBar />)
  await userEvent.click(screen.getByTestId('menu-projects'))
  
  // 로딩 상태 확인
  expect(screen.getByText('로딩 중...')).toBeInTheDocument()
  
  // 타임아웃 후 에러 상태 확인
  await waitFor(() => {
    expect(screen.getByText('로딩 시간이 길어지고 있습니다')).toBeInTheDocument()
  }, { timeout: 5000 })
})
```

**복구 전략**:
- 프로그레시브 로딩으로 단계적 컨텐츠 표시
- 타임아웃 설정으로 무한 대기 방지
- 사용자에게 네트워크 상태 정보 제공

### 4. 사용자 인터랙션 실패

#### 4.1 접근성 실패
**발생 상황**:
- 키보드 네비게이션 불가
- 스크린 리더 지원 부족
- 색상 대비 부족으로 가독성 저하

**테스트 방법**:
```typescript
test('should support keyboard navigation completely', async () => {
  render(<SideBar />)
  
  // Tab으로 모든 메뉴 항목 접근 가능한지 확인
  const menuItems = screen.getAllByRole('menuitem')
  
  for (const item of menuItems) {
    item.focus()
    expect(document.activeElement).toBe(item)
    
    // Enter로 활성화 가능한지 확인
    await userEvent.keyboard('{Enter}')
    // 네비게이션 동작 확인...
  }
})

test('should meet WCAG color contrast requirements', () => {
  render(<SideBar />)
  
  const menuItems = screen.getAllByRole('menuitem')
  menuItems.forEach(item => {
    const styles = getComputedStyle(item)
    const contrast = calculateColorContrast(styles.color, styles.backgroundColor)
    expect(contrast).toBeGreaterThan(4.5) // WCAG AA 기준
  })
})
```

**복구 전략**:
- 모든 인터랙티브 요소에 적절한 ARIA 속성
- 고대비 모드 지원
- 키보드 네비게이션 완전 지원

#### 4.2 모바일 사용성 실패
**발생 상황**:
- 터치 인터랙션 반응 없음
- 뷰포트 크기 변경 시 레이아웃 깨짐
- 햄버거 메뉴 동작 실패

**테스트 방법**:
```typescript
test('should work properly on mobile devices', async () => {
  // 모바일 뷰포트 시뮬레이션
  Object.defineProperty(window, 'innerWidth', { value: 375 })
  Object.defineProperty(window, 'innerHeight', { value: 667 })
  
  render(<SideBar />)
  
  // 햄버거 메뉴 표시 확인
  const hamburger = screen.getByLabelText('메뉴 토글')
  expect(hamburger).toBeVisible()
  
  // 터치 이벤트 시뮬레이션
  fireEvent.touchStart(hamburger)
  fireEvent.touchEnd(hamburger)
  
  // 메뉴 열림 확인
  await waitFor(() => {
    expect(screen.getByTestId('sidebar')).toHaveClass('mobile-open')
  })
})
```

**복구 전략**:
- 반응형 디자인으로 다양한 기기 대응
- 터치 친화적 버튼 크기 (최소 44px)
- 제스처 기반 네비게이션 지원

### 5. 데이터 무결성 실패

#### 5.1 잘못된 라우트 파라미터
**발생 상황**:
- SQL Injection 시도
- XSS 공격 벡터
- 존재하지 않는 리소스 ID

**테스트 방법**:
```typescript
test('should sanitize and validate route parameters', () => {
  const maliciousInputs = [
    '"><script>alert("xss")</script>',
    "'; DROP TABLE users; --",
    '../../../etc/passwd',
    '%3Cscript%3Ealert(1)%3C/script%3E'
  ]
  
  maliciousInputs.forEach(input => {
    mockUseParams.mockReturnValue({ id: input })
    render(<ProjectDetailPage />)
    
    // XSS가 실행되지 않고 에러 페이지가 표시되는지 확인
    expect(screen.getByText('프로젝트를 찾을 수 없습니다')).toBeInTheDocument()
    expect(document.querySelector('script')).toBeNull()
  })
})
```

**복구 전략**:
- 모든 사용자 입력에 대한 검증 및 sanitization
- 화이트리스트 기반 파라미터 검증
- CSP (Content Security Policy) 헤더 설정

#### 5.2 상태 동기화 실패
**발생 상황**:
- 여러 탭에서 동시 작업으로 인한 상태 충돌
- localStorage와 메모리 상태 불일치
- 실시간 업데이트 누락

**테스트 방법**:
```typescript
test('should handle concurrent state updates', async () => {
  // 두 개의 컴포넌트가 동시에 상태를 변경하는 상황
  render(
    <>
      <SideBar data-testid="sidebar1" />
      <SideBar data-testid="sidebar2" />
    </>
  )
  
  // 동시 클릭 시뮬레이션
  const [menu1, menu2] = screen.getAllByTestId('menu-projects')
  
  await Promise.all([
    userEvent.click(menu1),
    userEvent.click(menu2)
  ])
  
  // 상태 일관성 확인
  const submenus = screen.getAllByTestId('sidebar-submenu')
  expect(submenus).toHaveLength(2)
  
  submenus.forEach(submenu => {
    expect(submenu).toHaveAttribute('aria-expanded', 'true')
  })
})
```

**복구 전략**:
- 옵티미스틱 업데이트로 반응성 향상
- 충돌 감지 및 자동 해결 알고리즘
- 브라우저 간 상태 동기화 (BroadcastChannel API)

## 종합 복구 전략 매트릭스

| 실패 유형 | 감지 방법 | 즉시 대응 | 장기 해결책 | 우선순위 |
|-----------|-----------|-----------|-------------|----------|
| JS Runtime 에러 | ErrorBoundary | Fallback UI | 코드 리뷰 강화 | 높음 |
| API 실패 | HTTP 상태 코드 | 재시도 + 캐시 | API 안정성 개선 | 높음 |
| 네트워크 단절 | navigator.onLine | 오프라인 모드 | PWA 전환 | 중간 |
| 접근성 문제 | 자동 테스트 | 대체 인터랙션 | 디자인 시스템 개선 | 중간 |
| 보안 위협 | 입력 검증 | 요청 차단 | 보안 감사 | 높음 |
| 성능 저하 | 모니터링 도구 | 리소스 제한 | 코드 최적화 | 낮음 |

## 모니터링 및 알림

### 실시간 에러 추적
```typescript
// 에러 리포팅 시스템
const reportError = (error: Error, context: string) => {
  // Sentry, LogRocket 등으로 실시간 에러 추적
  console.error(`[${context}] Navigation Error:`, error)
  
  // 사용자에게는 친화적 메시지 표시
  toast.error('일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.')
}

// 성능 메트릭 추적
const trackNavigation = (from: string, to: string, duration: number) => {
  // 네비게이션 성능 데이터 수집
  analytics.track('navigation', {
    from,
    to, 
    duration,
    timestamp: Date.now()
  })
}
```

### 사용자 피드백 수집
- 에러 발생 시 자동으로 피드백 수집 모달 표시
- 네비게이션 패턴 분석으로 UX 개선점 파악
- A/B 테스트로 복구 전략 효과 측정

## 결론

포괄적인 실패 시나리오 대비를 통해 네비게이션 시스템의 견고성을 확보했습니다. 각 실패 상황에 대한 구체적인 테스트와 복구 전략을 마련함으로써, 사용자에게 일관되고 신뢰할 수 있는 네비게이션 경험을 제공할 수 있습니다.

핵심은 **실패를 예방하는 것보다 실패에 우아하게 대응하는 것**입니다. 사용자가 어떤 상황에서도 시스템을 계속 사용할 수 있도록 하는 것이 최우선 목표입니다.