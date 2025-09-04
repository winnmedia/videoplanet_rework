/**
 * @file Modal.modern.test.tsx
 * @description 모던 Modal 컴포넌트 TDD 테스트
 * - 레거시 디자인 100% 시각적 충실성 검증
 * - WCAG 2.1 AA 접근성 완전 준수
 * - React 19 + Tailwind CSS 활용
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'

import { Modal, type ModalProps } from './Modal.modern'

expect.extend(toHaveNoViolations)

describe('Modal.modern', () => {
  const defaultProps: ModalProps = {
    isOpen: true,
    title: '테스트 모달',
    onClose: jest.fn(),
    children: <div>테스트 내용</div>
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Portal 컨테이너 생성
    if (!document.getElementById('modal-root')) {
      const modalRoot = document.createElement('div')
      modalRoot.id = 'modal-root'
      document.body.appendChild(modalRoot)
    }
  })

  afterEach(() => {
    // Portal 컨테이너 정리
    const modalRoot = document.getElementById('modal-root')
    if (modalRoot) {
      document.body.removeChild(modalRoot)
    }
  })

  describe('렌더링 및 기본 기능', () => {
    test('모달이 열려있을 때 제목과 내용이 표시된다', () => {
      render(<Modal {...defaultProps} />)
      
      expect(screen.getByText('테스트 모달')).toBeInTheDocument()
      expect(screen.getByText('테스트 내용')).toBeInTheDocument()
    })

    test('모달이 닫혀있을 때 렌더링되지 않는다', () => {
      render(<Modal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByText('테스트 모달')).not.toBeInTheDocument()
    })

    test('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
      const user = userEvent.setup()
      render(<Modal {...defaultProps} />)
      
      const closeButton = screen.getByRole('button', { name: /닫기|close/i })
      await user.click(closeButton)
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    test('Escape 키 입력 시 모달이 닫힌다', async () => {
      render(<Modal {...defaultProps} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    test('backdrop 클릭 시 모달이 닫힌다', async () => {
      const user = userEvent.setup()
      render(<Modal {...defaultProps} />)
      
      const backdrop = screen.getByTestId('modal-backdrop')
      await user.click(backdrop)
      
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('크기 변형 (레거시 디자인 충실성)', () => {
    test('sm 크기: 320px 너비 적용', () => {
      render(<Modal {...defaultProps} size="sm" />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('max-w-sm') // 320px equivalent
    })

    test('md 크기: 480px 너비 적용 (기본값)', () => {
      render(<Modal {...defaultProps} size="md" />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('max-w-md') // 480px equivalent
    })

    test('lg 크기: 640px 너비 적용', () => {
      render(<Modal {...defaultProps} size="lg" />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('max-w-lg') // 640px equivalent
    })
  })

  describe('변형 스타일 (레거시 컬러 시스템)', () => {
    test('default 변형: 기본 primary 색상 적용', () => {
      render(<Modal {...defaultProps} variant="default" />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('border-vridge-500')
    })

    test('danger 변형: 에러 색상 적용', () => {
      render(<Modal {...defaultProps} variant="danger" />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('border-error-500')
    })

    test('warning 변형: 경고 색상 적용', () => {
      render(<Modal {...defaultProps} variant="warning" />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('border-warning-500')
    })
  })

  describe('레거시 애니메이션 (픽셀 단위 정확성)', () => {
    test('모달 진입 애니메이션: scale(0.95) → scale(1)', async () => {
      render(<Modal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('animate-scale-in')
    })

    test('reduced-motion 설정 시 애니메이션 비활성화', () => {
      // prefers-reduced-motion 모의 설정
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      render(<Modal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('motion-reduce:animate-none')
    })
  })

  describe('포커스 트랩 (접근성)', () => {
    test('모달 열릴 때 첫 번째 포커스 가능한 요소로 포커스 이동', async () => {
      render(
        <Modal {...defaultProps}>
          <button>첫 번째 버튼</button>
          <button>두 번째 버튼</button>
        </Modal>
      )
      
      await waitFor(() => {
        expect(screen.getByText('첫 번째 버튼')).toHaveFocus()
      })
    })

    test('Tab 키 순환: 마지막 요소에서 첫 번째 요소로', async () => {
      const user = userEvent.setup()
      render(
        <Modal {...defaultProps}>
          <button>첫 번째</button>
          <button>두 번째</button>
        </Modal>
      )
      
      const closeButton = screen.getByRole('button', { name: /닫기/i })
      const firstButton = screen.getByText('첫 번째')
      const secondButton = screen.getByText('두 번째')
      
      // 마지막 요소에서 Tab 시 첫 번째로 순환
      secondButton.focus()
      await user.tab()
      expect(closeButton).toHaveFocus()
      await user.tab()
      expect(firstButton).toHaveFocus()
    })

    test('Shift+Tab 키 역순환', async () => {
      const user = userEvent.setup()
      render(
        <Modal {...defaultProps}>
          <button>테스트 버튼</button>
        </Modal>
      )
      
      const closeButton = screen.getByRole('button', { name: /닫기/i })
      const testButton = screen.getByText('테스트 버튼')
      
      // 첫 번째 요소에서 Shift+Tab 시 마지막으로 순환
      testButton.focus()
      await user.tab({ shift: true })
      expect(closeButton).toHaveFocus()
    })
  })

  describe('WCAG 2.1 AA 접근성 검증', () => {
    test('접근성 위반 사항이 없어야 함', async () => {
      const { container } = render(<Modal {...defaultProps} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('dialog role과 aria-modal 속성 적용', () => {
      render(<Modal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
    })

    test('제목 연결: aria-labelledby 속성', () => {
      render(<Modal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      const title = screen.getByText('테스트 모달')
      
      expect(modal).toHaveAttribute('aria-labelledby')
      expect(title).toHaveAttribute('id', modal.getAttribute('aria-labelledby'))
    })

    test('설명 연결: aria-describedby 속성', () => {
      const message = '상세한 설명입니다.'
      render(<Modal {...defaultProps} message={message} />)
      
      const modal = screen.getByRole('dialog')
      const description = screen.getByText(message)
      
      expect(modal).toHaveAttribute('aria-describedby')
      expect(description).toHaveAttribute('id', modal.getAttribute('aria-describedby'))
    })

    test('스크린 리더 공지: 모달 사용법 안내', () => {
      render(<Modal {...defaultProps} />)
      
      // 스크린 리더 전용 텍스트 존재 확인
      expect(document.querySelector('.sr-only')).toHaveTextContent(
        /Escape.*닫기.*Enter.*확인/i
      )
    })
  })

  describe('레거시 디자인 시각적 회귀 방지', () => {
    test('모달 그림자: 레거시 blue 그림자 효과 적용', () => {
      render(<Modal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      // 레거시: box-shadow: 0 10px 40px rgba(0, 49, 255, 0.15)
      expect(modal).toHaveClass('shadow-2xl', 'drop-shadow-glow')
    })

    test('모달 border-radius: 20px 정확히 적용', () => {
      render(<Modal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('rounded-2xl') // 20px
    })

    test('backdrop 블러: 4px 블러 효과', () => {
      render(<Modal {...defaultProps} />)
      
      const backdrop = screen.getByTestId('modal-backdrop')
      expect(backdrop).toHaveClass('backdrop-blur-sm') // 4px equivalent
    })

    test('레거시 폰트 패밀리 적용', () => {
      render(<Modal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('font-sans') // Inter, -apple-system 등
    })
  })

  describe('다크 모드 및 고대비 모드', () => {
    test('다크 모드: 배경색 및 텍스트 색상 변경', () => {
      // 다크 모드 시뮬레이션
      document.documentElement.classList.add('dark')
      
      render(<Modal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('dark:bg-neutral-900', 'dark:text-white')
      
      document.documentElement.classList.remove('dark')
    })

    test('고대비 모드: 강화된 border와 outline', () => {
      // CSS로 처리되지만 클래스 존재 확인
      render(<Modal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('contrast-more:border-2')
    })
  })

  describe('모바일 반응형', () => {
    test('모바일에서 전체 너비 적용', () => {
      render(<Modal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('w-full', 'sm:max-w-md')
    })

    test('모바일에서 padding 조정', () => {
      render(<Modal {...defaultProps} />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('p-4', 'sm:p-6')
    })
  })

  describe('성능 최적화', () => {
    test('Portal 렌더링으로 DOM 격리', () => {
      render(<Modal {...defaultProps} />)
      
      // Portal이 body 하위에 렌더링되는지 확인
      expect(document.body.querySelector('[role="dialog"]')).toBeInTheDocument()
    })

    test('closeOnBackdrop=false 시 backdrop 클릭 무시', async () => {
      const user = userEvent.setup()
      render(<Modal {...defaultProps} closeOnBackdrop={false} />)
      
      const backdrop = screen.getByTestId('modal-backdrop')
      await user.click(backdrop)
      
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })

    test('closeOnEscape=false 시 ESC 키 무시', () => {
      render(<Modal {...defaultProps} closeOnEscape={false} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })
  })

  describe('확장성 및 컴포지션', () => {
    test('커스텀 className 병합', () => {
      render(<Modal {...defaultProps} className="custom-modal" />)
      
      const modal = screen.getByRole('dialog')
      expect(modal).toHaveClass('custom-modal')
    })

    test('아이콘 prop 렌더링', () => {
      const icon = <svg data-testid="modal-icon">icon</svg>
      render(<Modal {...defaultProps} icon={icon} />)
      
      expect(screen.getByTestId('modal-icon')).toBeInTheDocument()
    })

    test('children vs message prop 우선순위', () => {
      render(
        <Modal {...defaultProps} message="메시지 텍스트">
          <div>자식 요소</div>
        </Modal>
      )
      
      // children이 우선, message는 무시됨
      expect(screen.getByText('자식 요소')).toBeInTheDocument()
      expect(screen.queryByText('메시지 텍스트')).not.toBeInTheDocument()
    })
  })

  describe('에러 처리 및 경계 사례', () => {
    test('onClose가 Promise를 반환할 때 처리', async () => {
      const asyncOnClose = jest.fn().mockResolvedValue(undefined)
      render(<Modal {...defaultProps} onClose={asyncOnClose} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      await waitFor(() => {
        expect(asyncOnClose).toHaveBeenCalled()
      })
    })

    test('onClose 실행 중 에러 발생 시 처리', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      const errorOnClose = jest.fn().mockRejectedValue(new Error('Close error'))
      
      render(<Modal {...defaultProps} onClose={errorOnClose} />)
      
      fireEvent.keyDown(document, { key: 'Escape' })
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining('Error closing modal'),
          expect.any(Error)
        )
      })
      
      consoleError.mockRestore()
    })
  })
})