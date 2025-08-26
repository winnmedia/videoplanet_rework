/**
 * LoadingSpinner Component Tests (TDD Red Phase)
 * 공통 로딩 스피너 컴포넌트의 모든 기능을 검증하는 테스트
 */

import { render, screen } from '@testing-library/react'

import { LoadingSpinner } from './LoadingSpinner'

// matchMedia 모킹
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

describe('LoadingSpinner', () => {
  beforeEach(() => {
    // 기본적으로 reduced-motion이 false인 상태로 설정
    mockMatchMedia(false)
  })

  describe('기본 렌더링', () => {
    it('스피너가 올바른 ARIA 레이블과 함께 렌더링되어야 함', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveAttribute('aria-label', '로딩 중')
      expect(spinner).toHaveAttribute('aria-live', 'polite')
    })

    it('기본 중간 크기로 렌더링되어야 함', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/spinner/)
      expect(spinner.className).toMatch(/md/)
    })
  })

  describe('크기 변형', () => {
    it('작은 크기(sm) 스피너가 렌더링되어야 함', () => {
      render(<LoadingSpinner size="sm" />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/sm/)
    })

    it('큰 크기(lg) 스피너가 렌더링되어야 함', () => {
      render(<LoadingSpinner size="lg" />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/lg/)
    })

    it('초대형 크기(xl) 스피너가 렌더링되어야 함', () => {
      render(<LoadingSpinner size="xl" />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/xl/)
    })
  })

  describe('색상 변형', () => {
    it('기본 primary 색상으로 렌더링되어야 함', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/primary/)
    })

    it('흰색(white) 변형으로 렌더링되어야 함', () => {
      render(<LoadingSpinner variant="white" />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/white/)
    })

    it('회색(gray) 변형으로 렌더링되어야 함', () => {
      render(<LoadingSpinner variant="gray" />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/gray/)
    })
  })

  describe('센터링 옵션', () => {
    it('centered prop이 true일 때 중앙 정렬 클래스가 적용되어야 함', () => {
      render(<LoadingSpinner centered />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/centered/)
    })

    it('fullscreen prop이 true일 때 전체 화면 중앙 정렬 클래스가 적용되어야 함', () => {
      render(<LoadingSpinner fullscreen />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/fullscreen/)
    })
  })

  describe('텍스트 레이블', () => {
    it('기본 "로딩 중" 텍스트가 표시되어야 함', () => {
      render(<LoadingSpinner showText />)
      
      expect(screen.getByText('로딩 중')).toBeInTheDocument()
    })

    it('사용자 지정 텍스트가 표시되어야 함', () => {
      render(<LoadingSpinner showText text="데이터를 불러오는 중..." />)
      
      expect(screen.getByText('데이터를 불러오는 중...')).toBeInTheDocument()
    })

    it('텍스트가 스크린 리더에 적절히 노출되어야 함', () => {
      render(<LoadingSpinner showText text="업로드 중" />)
      
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveAttribute('aria-label', '업로드 중')
      expect(screen.getByText('업로드 중')).toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('키보드 포커스를 받지 않아야 함', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByRole('status')
      expect(spinner).not.toHaveAttribute('tabindex')
    })

    it('적절한 ARIA 속성들이 설정되어야 함', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveAttribute('aria-live', 'polite')
      expect(spinner).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('스타일링', () => {
    it('커스텀 클래스명이 적용되어야 함', () => {
      render(<LoadingSpinner className="custom-spinner" />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/custom-spinner/)
    })

    it('인라인 스타일이 적용되어야 함', () => {
      render(<LoadingSpinner style={{ margin: '20px' }} />)
      
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveStyle('margin: 20px')
    })
  })

  describe('애니메이션', () => {
    it('스피너에 회전 애니메이션 클래스가 적용되어야 함', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByRole('status')
      const spinnerElement = spinner.querySelector('[class*="spinnerCircle"]')
      expect(spinnerElement).toBeInTheDocument()
    })

    it('prefers-reduced-motion 설정 시 애니메이션이 비활성화되어야 함', () => {
      // reduced-motion이 true인 상태로 설정
      mockMatchMedia(true)

      render(<LoadingSpinner />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/reducedMotion/)
    })
  })

  describe('에러 처리', () => {
    it('잘못된 size prop에 대해 기본값을 사용해야 함', () => {
      // @ts-expect-error - 의도적으로 잘못된 props 테스트
      render(<LoadingSpinner size="invalid" />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/md/) // 기본값으로 fallback
    })

    it('잘못된 variant prop에 대해 기본값을 사용해야 함', () => {
      // @ts-expect-error - 의도적으로 잘못된 props 테스트
      render(<LoadingSpinner variant="invalid" />)
      
      const spinner = screen.getByRole('status')
      expect(spinner.className).toMatch(/primary/) // 기본값으로 fallback
    })
  })

  describe('성능', () => {
    it('불필요한 리렌더링을 방지해야 함', () => {
      const { rerender } = render(<LoadingSpinner />)
      
      const firstRender = screen.getByRole('status')
      
      rerender(<LoadingSpinner />)
      
      const secondRender = screen.getByRole('status')
      expect(firstRender).toBe(secondRender) // 동일한 DOM 노드
    })
  })
})