/**
 * ConfirmModal Component Tests (TDD Red Phase)
 * 확인 모달 컴포넌트의 모든 기능을 검증하는 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ConfirmModal } from './ConfirmModal'

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    title: '테스트 제목',
    message: '테스트 메시지',
    onConfirm: jest.fn(),
    onCancel: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('기본 렌더링', () => {
    it('열려있을 때 모달이 렌더링되어야 함', () => {
      render(<ConfirmModal {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('테스트 제목')).toBeInTheDocument()
      expect(screen.getByText('테스트 메시지')).toBeInTheDocument()
    })

    it('닫혀있을 때 모달이 렌더링되지 않아야 함', () => {
      render(<ConfirmModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('기본 버튼들이 렌더링되어야 함', () => {
      render(<ConfirmModal {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument()
    })
  })

  describe('커스텀 프로퍼티', () => {
    it('커스텀 버튼 텍스트가 표시되어야 함', () => {
      render(
        <ConfirmModal 
          {...defaultProps}
          confirmText="삭제"
          cancelText="닫기"
        />
      )
      
      expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument()
    })

    it('위험한 액션에 대해 적절한 스타일이 적용되어야 함', () => {
      render(<ConfirmModal {...defaultProps} variant="danger" />)
      
      const confirmButton = screen.getByRole('button', { name: '확인' })
      expect(confirmButton).toHaveClass('danger')
    })

    it('로딩 상태가 표시되어야 함', () => {
      render(<ConfirmModal {...defaultProps} loading />)
      
      const confirmButton = screen.getByRole('button', { name: '확인' })
      expect(confirmButton).toHaveAttribute('aria-busy', 'true')
      expect(confirmButton).toBeDisabled()
    })

    it('아이콘이 표시되어야 함', () => {
      const customIcon = <div data-testid="custom-icon">⚠️</div>
      
      render(<ConfirmModal {...defaultProps} icon={customIcon} />)
      
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })
  })

  describe('인터랙션', () => {
    it('확인 버튼 클릭 시 onConfirm이 호출되어야 함', async () => {
      const user = userEvent.setup()
      render(<ConfirmModal {...defaultProps} />)
      
      await user.click(screen.getByRole('button', { name: '확인' }))
      
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1)
    })

    it('취소 버튼 클릭 시 onCancel이 호출되어야 함', async () => {
      const user = userEvent.setup()
      render(<ConfirmModal {...defaultProps} />)
      
      await user.click(screen.getByRole('button', { name: '취소' }))
      
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
    })

    it('백드롭 클릭 시 onCancel이 호출되어야 함', async () => {
      const user = userEvent.setup()
      render(<ConfirmModal {...defaultProps} />)
      
      const backdrop = screen.getByRole('dialog').parentElement
      await user.click(backdrop!)
      
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
    })

    it('closeOnBackdrop이 false일 때 백드롭 클릭으로 닫히지 않아야 함', async () => {
      const user = userEvent.setup()
      render(<ConfirmModal {...defaultProps} closeOnBackdrop={false} />)
      
      const backdrop = screen.getByRole('dialog').parentElement
      await user.click(backdrop!)
      
      expect(defaultProps.onCancel).not.toHaveBeenCalled()
    })

    it('ESC 키로 모달이 닫혀야 함', () => {
      render(<ConfirmModal {...defaultProps} />)
      
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1)
    })

    it('closeOnEscape가 false일 때 ESC 키로 닫히지 않아야 함', () => {
      render(<ConfirmModal {...defaultProps} closeOnEscape={false} />)
      
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      
      expect(defaultProps.onCancel).not.toHaveBeenCalled()
    })
  })

  describe('접근성', () => {
    it('적절한 ARIA 속성이 설정되어야 함', () => {
      render(<ConfirmModal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
      expect(modal).toHaveAttribute('aria-labelledby')
      expect(modal).toHaveAttribute('aria-describedby')
    })

    it('제목이 모달의 레이블로 사용되어야 함', () => {
      render(<ConfirmModal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      const titleId = modal.getAttribute('aria-labelledby')
      const title = document.getElementById(titleId!)
      
      expect(title).toHaveTextContent('테스트 제목')
    })

    it('메시지가 모달의 설명으로 사용되어야 함', () => {
      render(<ConfirmModal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      const descriptionId = modal.getAttribute('aria-describedby')
      const description = document.getElementById(descriptionId!)
      
      expect(description).toHaveTextContent('테스트 메시지')
    })

    it('모달이 열릴 때 첫 번째 버튼에 포커스가 되어야 함', async () => {
      render(<ConfirmModal {...defaultProps} />)
      
      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: '취소' })
        expect(cancelButton).toHaveFocus()
      })
    })

    it('포커스 트랩이 작동해야 함', async () => {
      const user = userEvent.setup()
      render(<ConfirmModal {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: '취소' })
      const confirmButton = screen.getByRole('button', { name: '확인' })
      
      // Tab으로 포커스 이동
      await user.tab()
      expect(confirmButton).toHaveFocus()
      
      // 다시 Tab하면 첫 번째 버튼으로 이동
      await user.tab()
      expect(cancelButton).toHaveFocus()
      
      // Shift+Tab으로 역방향 이동
      await user.tab({ shift: true })
      expect(confirmButton).toHaveFocus()
    })
  })

  describe('크기 변형', () => {
    it('작은 크기(sm) 모달이 렌더링되어야 함', () => {
      render(<ConfirmModal {...defaultProps} size="sm" />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('sm')
    })

    it('큰 크기(lg) 모달이 렌더링되어야 함', () => {
      render(<ConfirmModal {...defaultProps} size="lg" />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('lg')
    })
  })

  describe('애니메이션', () => {
    it('모달이 열릴 때 애니메이션 클래스가 적용되어야 함', () => {
      render(<ConfirmModal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('entering')
    })

    it('모달이 닫힐 때 애니메이션 클래스가 적용되어야 함', () => {
      const { rerender } = render(<ConfirmModal {...defaultProps} />)
      
      rerender(<ConfirmModal {...defaultProps} isOpen={false} />)
      
      // 애니메이션 중에도 DOM에 존재해야 함
      expect(screen.queryByRole('dialog')).toBeInTheDocument()
    })

    it('prefers-reduced-motion 설정 시 애니메이션이 비활성화되어야 함', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      })

      render(<ConfirmModal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('reducedMotion')
    })
  })

  describe('커스텀 내용', () => {
    it('커스텀 내용이 렌더링되어야 함', () => {
      render(
        <ConfirmModal {...defaultProps} message="">
          <div data-testid="custom-content">커스텀 내용</div>
        </ConfirmModal>
      )
      
      expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    })

    it('message prop과 children이 모두 있을 때 children이 우선되어야 함', () => {
      render(
        <ConfirmModal {...defaultProps}>
          <div data-testid="custom-content">커스텀 내용</div>
        </ConfirmModal>
      )
      
      expect(screen.getByTestId('custom-content')).toBeInTheDocument()
      expect(screen.queryByText('테스트 메시지')).not.toBeInTheDocument()
    })
  })

  describe('에러 처리', () => {
    it('onConfirm에서 에러 발생 시에도 모달이 정상 작동해야 함', async () => {
      const errorOnConfirm = jest.fn().mockImplementation(() => {
        throw new Error('Test error')
      })
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      
      render(<ConfirmModal {...defaultProps} onConfirm={errorOnConfirm} />)
      
      const confirmButton = screen.getByRole('button', { name: '확인' })
      fireEvent.click(confirmButton)
      
      expect(errorOnConfirm).toHaveBeenCalled()
      expect(consoleError).toHaveBeenCalled()
      
      consoleError.mockRestore()
    })
  })

  describe('성능', () => {
    it('모달이 닫혀있을 때 불필요한 렌더링을 하지 않아야 함', () => {
      const { rerender } = render(<ConfirmModal {...defaultProps} isOpen={false} />)
      
      const initialHTML = document.body.innerHTML
      
      rerender(<ConfirmModal {...defaultProps} isOpen={false} title="다른 제목" />)
      
      expect(document.body.innerHTML).toBe(initialHTML)
    })
  })
})