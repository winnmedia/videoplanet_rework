/**
 * @file Dropdown.modern.test.tsx
 * @description 모던 Dropdown 컴포넌트 TDD 테스트
 * - 레거시 Select 디자인 100% 시각적 충실성 검증
 * - WCAG 2.1 AA 접근성 완전 준수
 * - React 19 + Tailwind CSS 활용
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'

import { Dropdown, type DropdownProps } from './Dropdown.modern'

expect.extend(toHaveNoViolations)

describe('Dropdown.modern', () => {
  const defaultOptions = [
    { value: 'option1', label: '옵션 1' },
    { value: 'option2', label: '옵션 2' },
    { value: 'option3', label: '옵션 3' }
  ]

  const defaultProps: DropdownProps = {
    options: defaultOptions,
    placeholder: '선택하세요',
    onChange: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('렌더링 및 기본 기능', () => {
    test('플레이스홀더가 표시된다', () => {
      render(<Dropdown {...defaultProps} />)
      
      expect(screen.getByText('선택하세요')).toBeInTheDocument()
    })

    test('라벨이 있을 때 표시된다', () => {
      render(<Dropdown {...defaultProps} label="카테고리 선택" />)
      
      expect(screen.getByText('카테고리 선택')).toBeInTheDocument()
    })

    test('트리거 클릭 시 옵션 리스트가 열린다', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      expect(screen.getByText('옵션 1')).toBeInTheDocument()
      expect(screen.getByText('옵션 2')).toBeInTheDocument()
      expect(screen.getByText('옵션 3')).toBeInTheDocument()
    })

    test('옵션 선택 시 onChange가 호출되고 드롭다운이 닫힌다', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      const option2 = screen.getByText('옵션 2')
      await user.click(option2)
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('option2', defaultOptions[1])
      expect(screen.getByText('옵션 2')).toBeInTheDocument()
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    test('외부 클릭 시 드롭다운이 닫힌다', async () => {
      const user = userEvent.setup()
      render(
        <div>
          <Dropdown {...defaultProps} />
          <button>외부 버튼</button>
        </div>
      )
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      
      const outsideButton = screen.getByText('외부 버튼')
      await user.click(outsideButton)
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  describe('키보드 네비게이션 (접근성)', () => {
    test('Escape 키로 드롭다운 닫기', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    test('Space/Enter 키로 드롭다운 열기', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      trigger.focus()
      
      await user.keyboard(' ')
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      
      await user.keyboard('{Escape}')
      
      await user.keyboard('{Enter}')
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    test('ArrowDown 키로 다음 옵션 포커스', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      trigger.focus()
      await user.keyboard(' ')
      
      await user.keyboard('{ArrowDown}')
      
      const firstOption = screen.getByRole('option', { name: '옵션 1' })
      expect(firstOption).toHaveAttribute('aria-selected', 'true')
      
      await user.keyboard('{ArrowDown}')
      
      const secondOption = screen.getByRole('option', { name: '옵션 2' })
      expect(secondOption).toHaveAttribute('aria-selected', 'true')
    })

    test('ArrowUp 키로 이전 옵션 포커스', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      trigger.focus()
      await user.keyboard(' ')
      
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      
      const secondOption = screen.getByRole('option', { name: '옵션 2' })
      expect(secondOption).toHaveAttribute('aria-selected', 'true')
      
      await user.keyboard('{ArrowUp}')
      
      const firstOption = screen.getByRole('option', { name: '옵션 1' })
      expect(firstOption).toHaveAttribute('aria-selected', 'true')
    })

    test('마지막 옵션에서 ArrowDown 시 첫 옵션으로 순환', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      trigger.focus()
      await user.keyboard(' ')
      
      // 마지막 옵션까지 이동
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowDown}')
      
      const lastOption = screen.getByRole('option', { name: '옵션 3' })
      expect(lastOption).toHaveAttribute('aria-selected', 'true')
      
      // 다음으로 이동 시 첫 옵션으로 순환
      await user.keyboard('{ArrowDown}')
      
      const firstOption = screen.getByRole('option', { name: '옵션 1' })
      expect(firstOption).toHaveAttribute('aria-selected', 'true')
    })

    test('Enter 키로 포커스된 옵션 선택', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      trigger.focus()
      await user.keyboard(' ')
      
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Enter}')
      
      expect(defaultProps.onChange).toHaveBeenCalledWith('option1', defaultOptions[0])
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  describe('레거시 디자인 시각적 충실성', () => {
    test('트리거: 레거시 입력 필드 스타일 적용', () => {
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass(
        // 레거시: height: 44px, padding: 8px 16px, border-radius: 12px
        'h-input', 'px-4', 'py-2.5', 'rounded-lg',
        // 레거시: border: 1px solid #e4e4e4
        'border', 'border-neutral-300',
        // 레거시: background: #ffffff
        'bg-white',
        // 레거시: focus ring
        'focus:ring-2', 'focus:ring-vridge-500/20'
      )
    })

    test('드롭다운 리스트: 레거시 카드 스타일 적용', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      const listbox = screen.getByRole('listbox')
      expect(listbox).toHaveClass(
        // 레거시: border-radius: 12px, box-shadow: 0 4px 8px rgba(0,0,0,0.08)
        'rounded-lg', 'shadow-md',
        // 레거시: background: #ffffff, border: 1px solid #e4e4e4
        'bg-white', 'border', 'border-neutral-300',
        // 레거시: z-index: 1000
        'z-dropdown'
      )
    })

    test('옵션 아이템: 레거시 hover 스타일', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      const option1 = screen.getByRole('option', { name: '옵션 1' })
      expect(option1).toHaveClass(
        // 레거시: padding: 12px 16px
        'px-4', 'py-3',
        // 레거시: hover:background: #f8f9ff
        'hover:bg-vridge-50',
        // 레거시: cursor: pointer
        'cursor-pointer'
      )
    })

    test('선택된 옵션: 레거시 활성 스타일', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} value="option2" />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      const selectedOption = screen.getByRole('option', { name: '옵션 2' })
      expect(selectedOption).toHaveClass(
        // 레거시: background: #0031ff, color: #ffffff
        'bg-vridge-500', 'text-white'
      )
    })

    test('에러 상태: 레거시 에러 스타일', () => {
      render(<Dropdown {...defaultProps} error="필수 항목입니다." />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass(
        // 레거시: border-color: #d93a3a, focus:ring: rgba(217,58,58,0.2)
        'border-error-500', 'focus:ring-error-500/20'
      )
      
      const errorMessage = screen.getByText('필수 항목입니다.')
      expect(errorMessage).toHaveClass(
        // 레거시: color: #d93a3a, font-size: 12px
        'text-error-600', 'text-xs'
      )
    })

    test('비활성 상태: 레거시 disabled 스타일', () => {
      render(<Dropdown {...defaultProps} disabled />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass(
        // 레거시: background: #f1f1f1, color: #999999, cursor: not-allowed
        'bg-neutral-100', 'text-neutral-500', 'cursor-not-allowed'
      )
      expect(trigger).toBeDisabled()
    })
  })

  describe('WCAG 2.1 AA 접근성 검증', () => {
    test('접근성 위반 사항이 없어야 함', async () => {
      const { container } = render(<Dropdown {...defaultProps} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('combobox role과 aria-expanded 적용', () => {
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
    })

    test('드롭다운 열릴 때 aria-expanded 업데이트', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      expect(trigger).toHaveAttribute('aria-expanded', 'true')
    })

    test('listbox와 option role 적용', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      expect(screen.getByRole('listbox')).toBeInTheDocument()
      expect(screen.getAllByRole('option')).toHaveLength(3)
    })

    test('라벨 연결: aria-labelledby 또는 aria-label', () => {
      render(<Dropdown {...defaultProps} label="카테고리" id="category-dropdown" />)
      
      const trigger = screen.getByRole('combobox')
      const label = screen.getByText('카테고리')
      
      expect(trigger).toHaveAttribute('aria-labelledby')
      expect(label).toHaveAttribute('id', trigger.getAttribute('aria-labelledby'))
    })

    test('선택된 값: aria-selected 적용', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} value="option1" />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      const selectedOption = screen.getByRole('option', { name: '옵션 1' })
      expect(selectedOption).toHaveAttribute('aria-selected', 'true')
    })

    test('에러 상태: aria-describedby로 에러 메시지 연결', () => {
      const error = '필수 선택 항목입니다.'
      render(<Dropdown {...defaultProps} error={error} />)
      
      const trigger = screen.getByRole('combobox')
      const errorElement = screen.getByText(error)
      
      expect(trigger).toHaveAttribute('aria-describedby')
      expect(errorElement).toHaveAttribute('id', trigger.getAttribute('aria-describedby'))
    })
  })

  describe('다크 모드 및 반응형', () => {
    test('다크 모드: 배경색 및 텍스트 색상 변경', () => {
      document.documentElement.classList.add('dark')
      
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass('dark:bg-neutral-800', 'dark:text-white', 'dark:border-neutral-600')
      
      document.documentElement.classList.remove('dark')
    })

    test('모바일: 터치 친화적 크기', () => {
      render(<Dropdown {...defaultProps} />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass('h-input') // 44px (터치 친화적)
    })
  })

  describe('성능 및 최적화', () => {
    test('많은 옵션에도 가상화 없이 렌더링', async () => {
      const manyOptions = Array.from({ length: 100 }, (_, i) => ({
        value: `option${i}`,
        label: `옵션 ${i + 1}`
      }))
      
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} options={manyOptions} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      expect(screen.getAllByRole('option')).toHaveLength(100)
    })

    test('동적 옵션 변경 시 선택 상태 유지', async () => {
      const { rerender } = render(<Dropdown {...defaultProps} value="option2" />)
      
      expect(screen.getByText('옵션 2')).toBeInTheDocument()
      
      const newOptions = [
        { value: 'option2', label: '옵션 2 (수정됨)' },
        { value: 'option4', label: '옵션 4' }
      ]
      
      rerender(<Dropdown {...defaultProps} options={newOptions} value="option2" />)
      
      expect(screen.getByText('옵션 2 (수정됨)')).toBeInTheDocument()
    })
  })

  describe('커스터마이징 및 확장성', () => {
    test('커스텀 className 병합', () => {
      render(<Dropdown {...defaultProps} className="custom-dropdown" />)
      
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveClass('custom-dropdown')
    })

    test('커스텀 renderOption 함수', async () => {
      const renderOption = (option: { value: string; label: string }) => (
        <div data-testid={`custom-${option.value}`}>
          🎯 {option.label}
        </div>
      )
      
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} renderOption={renderOption} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      expect(screen.getByTestId('custom-option1')).toHaveTextContent('🎯 옵션 1')
    })

    test('검색 필터링 기능', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} searchable />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      const searchInput = screen.getByRole('textbox')
      await user.type(searchInput, '2')
      
      expect(screen.getByText('옵션 2')).toBeInTheDocument()
      expect(screen.queryByText('옵션 1')).not.toBeInTheDocument()
      expect(screen.queryByText('옵션 3')).not.toBeInTheDocument()
    })
  })

  describe('에러 처리 및 경계 사례', () => {
    test('빈 옵션 배열 처리', async () => {
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} options={[]} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      expect(screen.getByText('옵션이 없습니다.')).toBeInTheDocument()
    })

    test('존재하지 않는 value prop 처리', () => {
      render(<Dropdown {...defaultProps} value="nonexistent" />)
      
      // 플레이스홀더가 표시되어야 함
      expect(screen.getByText('선택하세요')).toBeInTheDocument()
    })

    test('onChange 실행 중 에러 발생 시 처리', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      const errorOnChange = jest.fn().mockImplementation(() => {
        throw new Error('Change error')
      })
      
      const user = userEvent.setup()
      render(<Dropdown {...defaultProps} onChange={errorOnChange} />)
      
      const trigger = screen.getByRole('combobox')
      await user.click(trigger)
      
      const option1 = screen.getByText('옵션 1')
      await user.click(option1)
      
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error in dropdown onChange'),
        expect.any(Error)
      )
      
      consoleError.mockRestore()
    })
  })
})