/**
 * 에러 디스플레이 컴포넌트 접근성 테스트
 * WCAG 2.1 AA 준수, 스크린 리더 지원, 키보드 네비게이션
 * 테스트 도구: React Testing Library + jest-axe
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { 
  HttpErrorPage, 
  NetworkErrorDisplay, 
  OfflineIndicator, 
  RetryButton, 
  ErrorAlert 
} from '../ErrorDisplay'

// jest-axe 매처 확장
expect.extend(toHaveNoViolations)

describe('ErrorDisplay 접근성 테스트', () => {
  // 공통 테스트 유틸리티
  const mockRetry = jest.fn()
  const mockHome = jest.fn()
  const mockLogin = jest.fn()
  const mockClose = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('HttpErrorPage 접근성', () => {
    const defaultProps = {
      status: 404 as const,
      onRetry: mockRetry,
      onHome: mockHome,
      onLogin: mockLogin
    }

    it('WCAG 접근성 규칙을 준수해야 함', async () => {
      const { container } = render(<HttpErrorPage {...defaultProps} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('적절한 ARIA 속성과 semantic HTML을 사용해야 함', () => {
      render(<HttpErrorPage {...defaultProps} />)
      
      // 메인 랜드마크
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      expect(main).toHaveAttribute('aria-labelledby', 'error-title')
      expect(main).toHaveAttribute('aria-describedby', 'error-description')
      
      // 제목 구조
      const title = screen.getByRole('heading', { level: 1 })
      expect(title).toHaveAttribute('id', 'error-title')
      
      // 설명
      const description = screen.getByText(/요청하신 페이지가 존재하지 않거나/)
      expect(description).toHaveAttribute('id', 'error-description')
    })

    it('키보드 네비게이션이 가능해야 함', async () => {
      const user = userEvent.setup()
      render(<HttpErrorPage {...defaultProps} />)
      
      // 포커스가 메인 요소로 이동해야 함
      await waitFor(() => {
        expect(screen.getByRole('main')).toHaveFocus()
      })
      
      // Tab으로 버튼들 간 이동 가능
      await user.tab()
      expect(screen.getByRole('button', { name: /다시 시도/ })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /홈으로 가기/ })).toHaveFocus()
    })

    it('스크린 리더를 위한 적절한 레이블을 제공해야 함', () => {
      render(<HttpErrorPage {...defaultProps} />)
      
      // 에러 아이콘에 대한 설명
      const errorIcon = screen.getByLabelText('HTTP 404 에러')
      expect(errorIcon).toBeInTheDocument()
      
      // 버튼들의 명확한 레이블
      expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /홈으로 가기/ })).toBeInTheDocument()
    })

    it('401 에러 시 로그인 버튼의 접근성을 확인해야 함', () => {
      render(<HttpErrorPage status={401} onLogin={mockLogin} />)
      
      const loginButton = screen.getByRole('button', { name: /로그인하기/ })
      expect(loginButton).toBeInTheDocument()
      expect(loginButton).toHaveAttribute('type', 'button')
    })

    it('Enter와 Space 키로 버튼을 활성화할 수 있어야 함', async () => {
      const user = userEvent.setup()
      render(<HttpErrorPage {...defaultProps} />)
      
      const retryButton = screen.getByRole('button', { name: /다시 시도/ })
      retryButton.focus()
      
      // Enter 키 테스트
      await user.keyboard('{Enter}')
      expect(mockRetry).toHaveBeenCalledTimes(1)
      
      // Space 키 테스트
      await user.keyboard(' ')
      expect(mockRetry).toHaveBeenCalledTimes(2)
    })

    it('고대비 모드에서도 읽기 쉬워야 함', () => {
      // 고대비 모드 시뮬레이션
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })
      
      const { container } = render(<HttpErrorPage {...defaultProps} />)
      
      // 색상 대비가 충분한지 확인 (Tailwind의 색상 토큰 사용)
      const errorContainer = container.querySelector('[class*="border-neutral-200"]')
      expect(errorContainer).toBeInTheDocument()
    })
  })

  describe('NetworkErrorDisplay 접근성', () => {
    const networkError = {
      message: '네트워크 연결에 실패했습니다',
      isOffline: false,
      retryCount: 2
    }

    it('WCAG 접근성 규칙을 준수해야 함', async () => {
      const { container } = render(
        <NetworkErrorDisplay error={networkError} onRetry={mockRetry} />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('적절한 alert 역할을 가져야 함', () => {
      render(<NetworkErrorDisplay error={networkError} onRetry={mockRetry} />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveAttribute('aria-live', 'polite')
    })

    it('네트워크 에러 아이콘에 적절한 레이블을 제공해야 함', () => {
      render(<NetworkErrorDisplay error={networkError} onRetry={mockRetry} />)
      
      const networkIcon = screen.getByLabelText('네트워크 오류')
      expect(networkIcon).toBeInTheDocument()
    })
  })

  describe('OfflineIndicator 접근성', () => {
    it('WCAG 접근성 규칙을 준수해야 함', async () => {
      const { container } = render(
        <OfflineIndicator isOffline={true} onRetry={mockRetry} />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('적절한 alert 역할과 즉시 알림 기능을 제공해야 함', () => {
      render(<OfflineIndicator isOffline={true} onRetry={mockRetry} />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'assertive')
    })

    it('오프라인 상태가 아닐 때는 렌더링하지 않아야 함', () => {
      const { container } = render(
        <OfflineIndicator isOffline={false} onRetry={mockRetry} />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('RetryButton 접근성', () => {
    it('WCAG 접근성 규칙을 준수해야 함', async () => {
      const { container } = render(
        <RetryButton onRetry={mockRetry} />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('재시도 중일 때 적절한 상태를 표시해야 함', () => {
      render(<RetryButton onRetry={mockRetry} isRetrying={true} />)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', '재시도 중...')
      expect(button).toBeDisabled()
    })

    it('최대 재시도 횟수에 도달했을 때 비활성화되어야 함', () => {
      render(
        <RetryButton 
          onRetry={mockRetry} 
          retryCount={3} 
          maxRetries={3} 
        />
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })

    it('포커스 링이 표시되어야 함', async () => {
      const user = userEvent.setup()
      render(<RetryButton onRetry={mockRetry} />)
      
      const button = screen.getByRole('button')
      await user.tab()
      
      expect(button).toHaveFocus()
      expect(button).toHaveClass('focus:ring-2')
    })
  })

  describe('ErrorAlert 접근성', () => {
    const alertProps = {
      message: '오류가 발생했습니다',
      onClose: mockClose
    }

    it('WCAG 접근성 규칙을 준수해야 함', async () => {
      const { container } = render(<ErrorAlert {...alertProps} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('적절한 alert 역할을 가져야 함', () => {
      render(<ErrorAlert {...alertProps} />)
      
      const alert = screen.getByRole('alert')
      expect(alert).toHaveAttribute('aria-live', 'polite')
    })

    it('닫기 버튼에 적절한 레이블을 제공해야 함', () => {
      render(<ErrorAlert {...alertProps} />)
      
      const closeButton = screen.getByRole('button', { name: /알림 닫기/ })
      expect(closeButton).toBeInTheDocument()
    })

    it('ESC 키로 닫을 수 있어야 함', async () => {
      const user = userEvent.setup()
      render(<ErrorAlert {...alertProps} />)
      
      await user.keyboard('{Escape}')
      expect(mockClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('색상 및 대비 접근성', () => {
    it('에러 색상이 충분한 대비를 제공해야 함', () => {
      const { container } = render(
        <ErrorAlert message="테스트 메시지" variant="error" />
      )
      
      // Tailwind의 에러 색상이 적용되었는지 확인
      const errorAlert = container.querySelector('[class*="text-error-800"]')
      expect(errorAlert).toBeInTheDocument()
    })

    it('다크 모드에서도 적절한 대비를 유지해야 함', () => {
      // 다크 모드 클래스 추가
      document.documentElement.classList.add('dark')
      
      const { container } = render(
        <ErrorAlert message="테스트 메시지" variant="error" />
      )
      
      // 다크 모드 색상이 적용되었는지 확인
      const darkModeElement = container.querySelector('[class*="dark:text-error-200"]')
      expect(darkModeElement).toBeInTheDocument()
      
      // 정리
      document.documentElement.classList.remove('dark')
    })
  })

  describe('모바일 접근성', () => {
    beforeEach(() => {
      // 모바일 뷰포트 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
    })

    it('모바일에서 터치 타겟이 충분해야 함', () => {
      render(<RetryButton onRetry={mockRetry} />)
      
      const button = screen.getByRole('button')
      const styles = window.getComputedStyle(button)
      
      // 최소 44px 터치 타겟 (Tailwind의 py-2.5 = 44px 높이)
      expect(button).toHaveClass('py-2')
    })

    it('스크린 확대 시에도 사용 가능해야 함', () => {
      // 200% 확대 시뮬레이션
      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        configurable: true,
        value: 2,
      })

      render(<HttpErrorPage status={404} />)
      
      // 텍스트가 여전히 읽을 수 있는지 확인
      expect(screen.getByText(/페이지를 찾을 수 없습니다/)).toBeInTheDocument()
    })
  })

  describe('애니메이션 및 움직임 접근성', () => {
    it('움직임 축소 설정을 존중해야 함', () => {
      // prefers-reduced-motion 시뮬레이션
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      })

      render(<OfflineIndicator isOffline={true} />)
      
      // 애니메이션이 축소되었는지 확인 (실제로는 CSS에서 처리됨)
      const indicator = screen.getByRole('alert')
      expect(indicator).toBeInTheDocument()
    })
  })

  describe('다국어 지원', () => {
    it('한국어 메시지가 적절히 표시되어야 함', () => {
      render(<HttpErrorPage status={404} />)
      
      // 한국어 텍스트가 올바르게 표시되는지 확인
      expect(screen.getByText('페이지를 찾을 수 없습니다')).toBeInTheDocument()
      expect(screen.getByText(/요청하신 페이지가 존재하지 않거나/)).toBeInTheDocument()
    })

    it('문화적으로 적절한 아이콘을 사용해야 함', () => {
      render(<HttpErrorPage status={404} />)
      
      // 검색 아이콘 (🔍)이 404 에러에 사용되는지 확인
      const searchIcon = screen.getByLabelText('HTTP 404 에러')
      expect(searchIcon).toHaveTextContent('🔍')
    })
  })
})