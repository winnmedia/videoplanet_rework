/**
 * EmptyState Modern Component Test Suite - Tailwind CSS Migration
 * TDD: 404 에러 및 다양한 빈 상태 지원 테스트
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from './EmptyState'

import { vi } from 'vitest'

describe('EmptyState Modern - Enhanced Error State Support', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Empty State', () => {
    test('should render basic empty state with title', () => {
      render(<EmptyState title="데이터가 없습니다" />)
      
      expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument()
    })

    test('should render with description when provided', () => {
      render(
        <EmptyState 
          title="검색 결과가 없습니다"
          description="다른 키워드로 검색해보세요"
        />
      )
      
      expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument()
      expect(screen.getByText('다른 키워드로 검색해보세요')).toBeInTheDocument()
    })

    test('should render with action button when provided', () => {
      render(
        <EmptyState 
          title="프로젝트가 없습니다"
          action={{
            label: '새 프로젝트 생성',
            onClick: mockOnClick
          }}
        />
      )
      
      const button = screen.getByRole('button', { name: '새 프로젝트 생성' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-label', '새 프로젝트 생성')
    })

    test('should call action onClick when button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <EmptyState 
          title="비어있음"
          action={{
            label: '액션',
            onClick: mockOnClick
          }}
        />
      )
      
      await user.click(screen.getByRole('button'))
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error State Variants', () => {
    test('should render 404 error state with appropriate styling', () => {
      render(
        <EmptyState 
          title="페이지를 찾을 수 없습니다"
          description="요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다"
          variant="error"
          action={{
            label: '홈으로 돌아가기',
            onClick: mockOnClick
          }}
        />
      )
      
      const container = screen.getByTestId('empty-state')
      expect(container).toHaveClass('text-center')
      expect(screen.getByText('페이지를 찾을 수 없습니다')).toHaveClass('text-red-600')
    })

    test('should render network error state', () => {
      render(
        <EmptyState 
          title="네트워크 오류"
          description="서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요"
          variant="error"
          icon={
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          }
          action={{
            label: '다시 시도',
            onClick: mockOnClick
          }}
        />
      )
      
      expect(screen.getByText('네트워크 오류')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    })

    test('should render success state with different styling', () => {
      render(
        <EmptyState 
          title="작업이 완료되었습니다"
          description="모든 항목이 성공적으로 처리되었습니다"
          variant="success"
        />
      )
      
      expect(screen.getByText('작업이 완료되었습니다')).toHaveClass('text-success-600')
    })
  })

  describe('Icon Support', () => {
    test('should render custom icon when provided', () => {
      render(
        <EmptyState 
          title="커스텀 아이콘"
          icon={<div data-testid="custom-icon">📁</div>}
        />
      )
      
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })

    test('should render default icon based on variant', () => {
      render(
        <EmptyState 
          title="기본 아이콘"
          variant="error"
        />
      )
      
      const container = screen.getByTestId('empty-state')
      expect(container.querySelector('svg')).toBeInTheDocument()
    })

    test('should not render icon when showIcon is false', () => {
      render(
        <EmptyState 
          title="아이콘 없음"
          showIcon={false}
        />
      )
      
      const container = screen.getByTestId('empty-state')
      expect(container.querySelector('svg')).not.toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    test('should have mobile-friendly spacing and text sizes', () => {
      render(<EmptyState title="모바일 테스트" />)
      
      const container = screen.getByTestId('empty-state')
      expect(container).toHaveClass('py-12', 'px-6')
      
      const title = screen.getByText('모바일 테스트')
      expect(title).toHaveClass('text-lg', 'md:text-xl')
    })

    test('should stack elements vertically on mobile', () => {
      render(
        <EmptyState 
          title="수직 스택"
          description="모바일에서 세로로 정렬"
          action={{
            label: '액션',
            onClick: mockOnClick
          }}
        />
      )
      
      const container = screen.getByTestId('empty-state')
      expect(container).toHaveClass('flex', 'flex-col', 'items-center')
    })
  })

  describe('Accessibility', () => {
    test('should have proper semantic structure', () => {
      render(
        <EmptyState 
          title="접근성 테스트"
          description="스크린 리더 지원"
        />
      )
      
      const container = screen.getByTestId('empty-state')
      expect(container).toHaveAttribute('role', 'status')
      expect(container).toHaveAttribute('aria-live', 'polite')
    })

    test('should support keyboard navigation for action button', async () => {
      const user = userEvent.setup()
      render(
        <EmptyState 
          title="키보드 테스트"
          action={{
            label: '키보드 액션',
            onClick: mockOnClick
          }}
        />
      )
      
      const button = screen.getByRole('button')
      button.focus()
      expect(button).toHaveFocus()
      
      await user.keyboard('{Enter}')
      expect(mockOnClick).toHaveBeenCalled()
    })

    test('should have proper color contrast for text', () => {
      render(
        <EmptyState 
          title="대비 테스트"
          description="충분한 색상 대비"
          variant="default"
        />
      )
      
      const title = screen.getByText('대비 테스트')
      const description = screen.getByText('충분한 색상 대비')
      
      expect(title).toHaveClass('text-gray-900')
      expect(description).toHaveClass('text-gray-600')
    })
  })

  describe('Loading and Animation States', () => {
    test('should support loading state in action button', () => {
      render(
        <EmptyState 
          title="로딩 테스트"
          action={{
            label: '로딩 중...',
            onClick: mockOnClick,
            loading: true
          }}
        />
      )
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('opacity-75', 'cursor-not-allowed')
    })

    test('should have smooth fade-in animation', () => {
      render(<EmptyState title="애니메이션 테스트" />)
      
      const container = screen.getByTestId('empty-state')
      expect(container).toHaveClass('animate-fade-in')
    })

    test('should support reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
      
      render(<EmptyState title="모션 감소 테스트" />)
      
      const container = screen.getByTestId('empty-state')
      expect(container).toHaveClass('motion-reduce:animate-none')
    })
  })

  describe('Custom Styling', () => {
    test('should accept custom className', () => {
      render(
        <EmptyState 
          title="커스텀 스타일"
          className="custom-empty-state"
        />
      )
      
      const container = screen.getByTestId('empty-state')
      expect(container).toHaveClass('custom-empty-state')
    })

    test('should support different sizes', () => {
      render(
        <EmptyState 
          title="작은 크기"
          size="sm"
        />
      )
      
      const container = screen.getByTestId('empty-state')
      expect(container).toHaveClass('py-8')
      
      const title = screen.getByText('작은 크기')
      expect(title).toHaveClass('text-base')
    })
  })

  describe('Error Boundary Integration', () => {
    test('should render error fallback state', () => {
      render(
        <EmptyState 
          title="오류가 발생했습니다"
          description="예상치 못한 오류가 발생했습니다. 페이지를 새로고침하거나 잠시 후 다시 시도해주세요"
          variant="error"
          action={{
            label: '새로고침',
            onClick: () => window.location.reload()
          }}
        />
      )
      
      expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument()
    })
  })
})