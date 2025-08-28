/**
 * @fileoverview Select 컴포넌트 테스트 - TDD 방식
 * @description 초미니멀 디자인 시스템의 Select 컴포넌트 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select.modern'

describe('Select 컴포넌트', () => {
  const defaultOptions = [
    { label: '옵션 1', value: 'option1' },
    { label: '옵션 2', value: 'option2' },
    { label: '옵션 3', value: 'option3' }
  ]

  describe('기본 렌더링', () => {
    it('placeholder와 함께 올바르게 렌더링되어야 한다', () => {
      render(
        <Select 
          placeholder="옵션을 선택하세요"
          options={defaultOptions}
          onChange={() => {}}
        />
      )

      expect(screen.getByText('옵션을 선택하세요')).toBeInTheDocument()
    })

    it('올바른 역할과 접근성 속성을 가져야 한다', () => {
      render(
        <Select 
          placeholder="선택"
          options={defaultOptions}
          onChange={() => {}}
          aria-label="옵션 선택"
        />
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('aria-label', '옵션 선택')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    })
  })

  describe('드롭다운 상호작용', () => {
    it('클릭 시 드롭다운이 열려야 한다', async () => {
      render(
        <Select 
          placeholder="선택"
          options={defaultOptions}
          onChange={() => {}}
        />
      )

      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('키보드 Enter/Space 키로 드롭다운이 열려야 한다', async () => {
      const user = userEvent.setup()
      
      render(
        <Select 
          placeholder="선택"
          options={defaultOptions}
          onChange={() => {}}
        />
      )

      const trigger = screen.getByRole('combobox')
      trigger.focus()
      
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
    })

    it('외부 클릭 시 드롭다운이 닫혀야 한다', async () => {
      render(
        <div>
          <Select 
            placeholder="선택"
            options={defaultOptions}
            onChange={() => {}}
          />
          <div data-testid="outside">외부 영역</div>
        </div>
      )

      // 드롭다운 열기
      const trigger = screen.getByRole('combobox')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // 외부 클릭
      fireEvent.click(screen.getByTestId('outside'))

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded', 'false')
      })
    })

    it('Escape 키로 드롭다운이 닫혀야 한다', async () => {
      const user = userEvent.setup()
      
      render(
        <Select 
          placeholder="선택"
          options={defaultOptions}
          onChange={() => {}}
        />
      )

      const trigger = screen.getByRole('combobox')
      
      // 드롭다운 열기
      fireEvent.click(trigger)
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // Escape 키 누르기
      await user.keyboard('{Escape}')

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })
  })

  describe('옵션 선택', () => {
    it('옵션을 클릭하면 onChange가 호출되어야 한다', async () => {
      const onChange = jest.fn()
      
      render(
        <Select 
          placeholder="선택"
          options={defaultOptions}
          onChange={onChange}
        />
      )

      // 드롭다운 열기
      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // 옵션 선택
      fireEvent.click(screen.getByText('옵션 2'))

      expect(onChange).toHaveBeenCalledWith('option2', defaultOptions[1])
    })

    it('선택된 값이 표시되어야 한다', () => {
      render(
        <Select 
          value="option2"
          options={defaultOptions}
          onChange={() => {}}
        />
      )

      expect(screen.getByText('옵션 2')).toBeInTheDocument()
    })

    it('키보드 화살표로 옵션을 탐색할 수 있어야 한다', async () => {
      const user = userEvent.setup()
      
      render(
        <Select 
          placeholder="선택"
          options={defaultOptions}
          onChange={() => {}}
        />
      )

      const trigger = screen.getByRole('combobox')
      trigger.focus()
      
      // 드롭다운 열기
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // 첫 번째 옵션에 포커스
      const firstOption = screen.getByRole('option', { name: '옵션 1' })
      expect(firstOption).toHaveAttribute('aria-selected', 'false')

      // 아래 화살표로 두 번째 옵션으로 이동
      await user.keyboard('{ArrowDown}')
      
      const secondOption = screen.getByRole('option', { name: '옵션 2' })
      expect(document.activeElement).toBe(secondOption)
    })
  })

  describe('다중 선택', () => {
    it('multiple 모드에서 여러 옵션을 선택할 수 있어야 한다', async () => {
      const onChange = jest.fn()
      
      render(
        <Select 
          placeholder="선택"
          options={defaultOptions}
          onChange={onChange}
          multiple={true}
        />
      )

      // 드롭다운 열기
      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // 첫 번째 옵션 선택
      fireEvent.click(screen.getByText('옵션 1'))
      
      expect(onChange).toHaveBeenCalledWith(['option1'], [defaultOptions[0]])

      // 두 번째 옵션 추가 선택
      fireEvent.click(screen.getByText('옵션 2'))
      
      expect(onChange).toHaveBeenCalledWith(
        ['option1', 'option2'], 
        [defaultOptions[0], defaultOptions[1]]
      )
    })

    it('다중 선택된 값들이 태그로 표시되어야 한다', () => {
      render(
        <Select 
          value={['option1', 'option2']}
          options={defaultOptions}
          onChange={() => {}}
          multiple={true}
        />
      )

      expect(screen.getByTestId('selected-tag-option1')).toBeInTheDocument()
      expect(screen.getByTestId('selected-tag-option2')).toBeInTheDocument()
      expect(screen.getByText('옵션 1')).toBeInTheDocument()
      expect(screen.getByText('옵션 2')).toBeInTheDocument()
    })

    it('태그의 X 버튼으로 개별 선택을 해제할 수 있어야 한다', async () => {
      const onChange = jest.fn()
      
      render(
        <Select 
          value={['option1', 'option2']}
          options={defaultOptions}
          onChange={onChange}
          multiple={true}
        />
      )

      const removeButton = screen.getByTestId('remove-tag-option1')
      fireEvent.click(removeButton)

      expect(onChange).toHaveBeenCalledWith(['option2'], [defaultOptions[1]])
    })
  })

  describe('검색 기능', () => {
    it('searchable 모드에서 입력 필드가 표시되어야 한다', () => {
      render(
        <Select 
          placeholder="선택"
          options={defaultOptions}
          onChange={() => {}}
          searchable={true}
        />
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('검색어에 따라 옵션이 필터링되어야 한다', async () => {
      const user = userEvent.setup()
      
      render(
        <Select 
          placeholder="선택"
          options={defaultOptions}
          onChange={() => {}}
          searchable={true}
        />
      )

      const input = screen.getByRole('textbox')
      
      // "옵션 1" 검색
      await user.type(input, '옵션 1')

      // 드롭다운 열기
      fireEvent.click(input)

      await waitFor(() => {
        expect(screen.getByText('옵션 1')).toBeInTheDocument()
        expect(screen.queryByText('옵션 2')).not.toBeInTheDocument()
        expect(screen.queryByText('옵션 3')).not.toBeInTheDocument()
      })
    })
  })

  describe('비활성화 상태', () => {
    it('disabled 상태에서 상호작용이 불가능해야 한다', () => {
      render(
        <Select 
          placeholder="선택"
          options={defaultOptions}
          onChange={() => {}}
          disabled={true}
        />
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-disabled', 'true')
      
      fireEvent.click(trigger)
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('개별 옵션이 disabled 상태일 때 선택할 수 없어야 한다', async () => {
      const disabledOptions = [
        { label: '옵션 1', value: 'option1' },
        { label: '옵션 2', value: 'option2', disabled: true },
        { label: '옵션 3', value: 'option3' }
      ]

      const onChange = jest.fn()
      
      render(
        <Select 
          placeholder="선택"
          options={disabledOptions}
          onChange={onChange}
        />
      )

      // 드롭다운 열기
      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })

      // 비활성화된 옵션 클릭
      const disabledOption = screen.getByText('옵션 2')
      fireEvent.click(disabledOption)

      // onChange가 호출되지 않아야 함
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('에러 상태', () => {
    it('에러 상태일 때 올바른 스타일과 접근성 속성을 가져야 한다', () => {
      render(
        <Select 
          placeholder="선택"
          options={defaultOptions}
          onChange={() => {}}
          error={true}
          errorMessage="필수 항목입니다"
        />
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveAttribute('aria-invalid', 'true')
      expect(trigger).toHaveClass('border-error-500')
      
      expect(screen.getByText('필수 항목입니다')).toBeInTheDocument()
    })
  })

  describe('로딩 상태', () => {
    it('로딩 중일 때 로딩 인디케이터를 표시해야 한다', () => {
      render(
        <Select 
          placeholder="선택"
          options={[]}
          onChange={() => {}}
          loading={true}
        />
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })
  })

  describe('빈 상태', () => {
    it('옵션이 없을 때 빈 상태 메시지를 표시해야 한다', async () => {
      render(
        <Select 
          placeholder="선택"
          options={[]}
          onChange={() => {}}
          emptyMessage="옵션이 없습니다"
        />
      )

      // 드롭다운 열기
      fireEvent.click(screen.getByRole('combobox'))

      await waitFor(() => {
        expect(screen.getByText('옵션이 없습니다')).toBeInTheDocument()
      })
    })
  })
})