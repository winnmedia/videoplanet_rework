# 대시보드 접근성 개선 TDD 가이드

## 개요

본 문서는 VRidge 웹 애플리케이션의 대시보드 접근성 개선을 위한 체계적인 TDD (Test-Driven Development) 전략을 제시합니다. 품질 우선 개발을 통해 WCAG 2.1 AA 기준을 만족하는 접근 가능한 대시보드를 구축합니다.

## TDD 사이클: Red → Green → Refactor

### Phase 1: RED (실패하는 테스트 작성)

실패하는 테스트를 먼저 작성하여 구현할 기능의 명세를 정의합니다.

#### 1.1 툴팁 키보드 접근성 테스트

**파일**: `/widgets/Dashboard/ui/StatsTooltip.test.tsx`

```typescript
// RED: 아직 구현되지 않은 StatsTooltip 컴포넌트를 위한 실패 테스트
describe('StatsTooltip - 키보드 접근성 (RED 테스트)', () => {
  it('Tab 키로 툴팁 트리거에 포커스할 수 있어야 함', async () => {
    // 이 테스트는 StatsTooltip 컴포넌트가 존재하지 않아 실패
    const tooltipTrigger = screen.getByRole('button', { name: /도움말/ })
    expect(tooltipTrigger).toHaveFocus()
  })
})
```

**실행 명령**:
```bash
pnpm test widgets/Dashboard/ui/StatsTooltip.test.tsx
```

**예상 결과**: ❌ 실패 (컴포넌트가 존재하지 않음)

#### 1.2 빈 상태 CTA 접근성 테스트

**파일**: `/widgets/Dashboard/ui/EmptyState.modern.test.tsx`

```typescript
// RED: 향상된 접근성을 가진 EmptyState 컴포넌트를 위한 실패 테스트
describe('EmptyState CTA 개선 - 통합 테스트', () => {
  it('CTA 버튼에 포커스 시 시각적 인디케이터가 표시되어야 함', async () => {
    // 이 테스트는 포커스 스타일이 구현되지 않아 실패
    expect(ctaButton).toHaveClass('focus:ring-2')
  })
})
```

**실행 명령**:
```bash
pnpm test widgets/Dashboard/ui/EmptyState.modern.test.tsx
```

**예상 결과**: ❌ 실패 (포커스 스타일 미구현)

### Phase 2: GREEN (최소 구현으로 테스트 통과)

실패하는 테스트를 통과시키는 최소한의 코드를 작성합니다.

#### 2.1 StatsTooltip 컴포넌트 구현

**파일**: `/widgets/Dashboard/ui/StatsTooltip.tsx`

```typescript
// GREEN: 테스트를 통과시키는 최소 구현
'use client'

import React, { useState } from 'react'

interface StatsTooltipProps {
  content: string
  ariaLabel: string
}

export const StatsTooltip: React.FC<StatsTooltipProps> = ({
  content,
  ariaLabel
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsOpen(!isOpen)
          }
          if (e.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        className="focus:outline-none focus:ring-2 focus:ring-blue-600"
      >
        ?
      </button>
      
      {isOpen && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute z-10 bg-black text-white p-2 rounded"
        >
          {content}
        </div>
      )}
    </div>
  )
}
```

**실행 명령**:
```bash
pnpm test widgets/Dashboard/ui/StatsTooltip.test.tsx
```

**예상 결과**: ✅ 통과

#### 2.2 EmptyState 접근성 향상

**파일**: `/widgets/Dashboard/ui/EmptyState.modern.tsx`

```typescript
// GREEN: 접근성이 향상된 EmptyState 구현
'use client'

import React from 'react'

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  illustration = 'no-projects'
}) => {
  return (
    <div role="region" aria-label="빈 상태">
      <div aria-hidden="true">
        📁
      </div>
      
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
        
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="min-h-11 min-w-11 focus:outline-none focus:ring-2 focus:ring-blue-600 focus-visible:ring-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onAction()
              }
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}
```

**실행 명령**:
```bash
pnpm test widgets/Dashboard/ui/EmptyState.modern.test.tsx
```

**예상 결과**: ✅ 통과

### Phase 3: REFACTOR (코드 개선 및 최적화)

테스트가 통과하는 상태에서 코드 품질을 개선합니다.

#### 3.1 StatsTooltip 리팩토링

```typescript
// REFACTOR: 더 나은 구조와 접근성을 가진 구현
'use client'

import React, { useState, useRef, useEffect } from 'react'

interface StatsTooltipProps {
  content: string
  ariaLabel: string
  children?: React.ReactNode
}

export const StatsTooltip: React.FC<StatsTooltipProps> = ({
  content,
  ariaLabel,
  children
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [tooltipId] = useState(() => 
    `tooltip-${Math.random().toString(36).substr(2, 9)}`
  )
  const triggerRef = useRef<HTMLButtonElement>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  // Escape 키 처리
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleToggle = () => {
    setIsOpen(prev => !prev)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggle()
    }
  }

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-describedby={tooltipId}
        aria-expanded={isOpen}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        className="min-w-11 min-h-11 p-2 rounded-full bg-gray-100 hover:bg-gray-200 
                   focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2
                   focus-visible:ring-2 transition-colors duration-200"
      >
        {children || (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      
      {isOpen && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2
                     bg-gray-900 text-white text-sm rounded-lg py-2 px-3 max-w-xs
                     shadow-lg before:content-[''] before:absolute before:top-full 
                     before:left-1/2 before:transform before:-translate-x-1/2
                     before:border-4 before:border-transparent before:border-t-gray-900"
        >
          {content}
        </div>
      )}
    </div>
  )
}
```

**실행 명령**:
```bash
pnpm test widgets/Dashboard/ui/StatsTooltip.test.tsx
```

**예상 결과**: ✅ 모든 테스트 통과 + 향상된 기능

## 실행 가능한 테스트 명세

### 전체 테스트 실행 순서

#### 1. 단위 테스트 실행
```bash
# 툴팁 키보드 접근성 테스트
pnpm test widgets/Dashboard/ui/StatsTooltip.test.tsx

# 빈 상태 CTA 개선 테스트
pnpm test widgets/Dashboard/ui/EmptyState.modern.test.tsx

# 전체 접근성 테스트
pnpm test widgets/Dashboard/ui/DashboardAccessibility.test.tsx

# 성능 테스트
pnpm test widgets/Dashboard/ui/DashboardPerformance.test.tsx
```

#### 2. 통합 테스트 실행
```bash
# MSW 핸들러 테스트
pnpm test lib/api/msw-handlers.ts

# 대시보드 통합 테스트
pnpm test widgets/Dashboard/ui/DashboardWidget.test.tsx
```

#### 3. E2E 테스트 실행
```bash
# 키보드 네비게이션 E2E 테스트
pnpm exec playwright test tests/e2e/dashboard-keyboard-navigation.spec.ts

# 접근성 E2E 테스트
pnpm exec playwright test tests/e2e/dashboard-accessibility.spec.ts
```

#### 4. 접근성 자동화 검증
```bash
# jest-axe를 통한 자동화된 접근성 검사
pnpm test --testNamePattern="접근성"

# axe-core를 통한 전체 페이지 검증
pnpm exec playwright test --grep="axe"
```

### 테스트 커버리지 검증

```bash
# 커버리지 리포트 생성
pnpm test --coverage

# 최소 커버리지 기준 (package.json에서 설정)
# - 전체: 85%
# - 핵심 도메인 (widgets/Dashboard): 90%
# - 접근성 관련 코드: 95%
```

### 성능 예산 검증

```bash
# 번들 크기 분석
pnpm exec webpack-bundle-analyzer

# Core Web Vitals 측정
pnpm exec lighthouse --chrome-flags="--headless" http://localhost:3000/dashboard

# INP 측정 (Jest 환경에서)
pnpm test DashboardPerformance.test.tsx --verbose
```

## 품질 게이트

### CI/CD 파이프라인 통합

```yaml
# .github/workflows/accessibility-quality-gates.yml
name: Accessibility Quality Gates

on: [push, pull_request]

jobs:
  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Run accessibility unit tests
        run: pnpm test --testPathPattern="Accessibility|accessibility" --coverage
      
      - name: Run jest-axe tests
        run: pnpm test --testNamePattern="접근성|axe" --verbose
      
      - name: Run E2E accessibility tests
        run: pnpm exec playwright test --grep="accessibility|keyboard-navigation"
      
      - name: Performance budget check
        run: pnpm test DashboardPerformance.test.tsx
        
      - name: Accessibility audit with axe
        run: pnpm exec axe-cli http://localhost:3000/dashboard --exit
```

### 로컬 개발 환경 검증

```bash
# 개발 시 실시간 접근성 검증 스크립트
#!/bin/bash

echo "🔍 대시보드 접근성 TDD 검증 시작..."

# 1. RED 단계 검증
echo "❌ RED: 실패 테스트 실행 중..."
pnpm test StatsTooltip.test.tsx --passWithNoTests

# 2. GREEN 단계 검증  
echo "✅ GREEN: 최소 구현 테스트 중..."
pnpm test widgets/Dashboard/ui/ --coverage

# 3. REFACTOR 단계 검증
echo "🔄 REFACTOR: 품질 검증 중..."
pnpm exec playwright test dashboard-keyboard-navigation.spec.ts

echo "📊 성능 예산 검증 중..."
pnpm test DashboardPerformance.test.tsx

echo "🎯 접근성 자동화 검증 중..."
pnpm test DashboardAccessibility.test.tsx

echo "✨ TDD 사이클 완료!"
```

## 실패 시나리오 및 디버깅 가이드

### 일반적인 실패 패턴

#### 1. 키보드 네비게이션 실패
```bash
# 디버깅 명령
pnpm test StatsTooltip.test.tsx --verbose --no-cache

# 일반적인 원인:
# - tabindex가 올바르지 않음
# - 포커스 관리 로직 누락
# - 이벤트 핸들러 바인딩 오류
```

#### 2. ARIA 속성 오류
```bash
# 디버깅 명령
pnpm test DashboardAccessibility.test.tsx --testNamePattern="ARIA"

# 일반적인 원인:
# - aria-expanded 상태 관리 오류
# - aria-describedby 연결 누락
# - role 속성 부정확
```

#### 3. 성능 예산 초과
```bash
# 디버깅 명령
pnpm test DashboardPerformance.test.tsx --testNamePattern="INP"

# 일반적인 원인:
# - 무거운 렌더링 로직
# - 메모리 누수
# - 불필요한 리렌더링
```

## 품질 메트릭 목표

### 접근성 메트릭
- **WCAG 2.1 AA 준수율**: 100%
- **키보드 네비게이션 커버리지**: 100%
- **스크린리더 호환성**: NVDA, JAWS, VoiceOver 지원
- **jest-axe 위반사항**: 0개

### 성능 메트릭
- **INP (Interaction to Next Paint)**: < 200ms
- **초기 렌더링 시간**: < 100ms
- **메모리 사용량**: 안정적 (누수 없음)
- **번들 크기 증가**: < 5% (기준선 대비)

### 테스트 커버리지
- **단위 테스트**: 90% 이상
- **통합 테스트**: 80% 이상
- **E2E 테스트**: 핵심 시나리오 100%
- **접근성 테스트**: 95% 이상

이 TDD 가이드를 따라 개발하면 접근성과 성능을 모두 만족하는 고품질 대시보드를 구축할 수 있습니다. 각 단계에서 테스트 실패/성공 여부를 확인하여 품질을 보장하세요.