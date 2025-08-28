import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamInviteForm } from '../TeamInviteForm'

describe('TeamInviteForm', () => {
  const mockOnInvite = jest.fn()

  beforeEach(() => {
    mockOnInvite.mockClear()
  })

  it('이메일 입력과 역할 선택이 가능해야 함', async () => {
    const user = userEvent.setup()
    render(<TeamInviteForm onInvite={mockOnInvite} />)
    
    const emailInput = screen.getByLabelText('이메일 주소')
    const roleSelect = screen.getByLabelText('역할')
    
    await user.type(emailInput, 'test@example.com')
    await user.selectOptions(roleSelect, 'Editor')
    
    expect(emailInput).toHaveValue('test@example.com')
    expect(roleSelect).toHaveValue('Editor')
  })

  it('여러 이메일을 칩 형태로 관리할 수 있어야 함', async () => {
    const user = userEvent.setup()
    render(<TeamInviteForm onInvite={mockOnInvite} />)
    
    const emailInput = screen.getByLabelText('이메일 주소')
    
    // 첫 번째 이메일 추가
    await user.type(emailInput, 'test1@example.com')
    await user.keyboard('{Enter}')
    
    expect(screen.getByText('test1@example.com')).toBeInTheDocument()
    
    // 두 번째 이메일 추가
    await user.type(emailInput, 'test2@example.com')
    await user.keyboard('{Enter}')
    
    expect(screen.getByText('test1@example.com')).toBeInTheDocument()
    expect(screen.getByText('test2@example.com')).toBeInTheDocument()
  })

  it('이메일 칩 제거가 가능해야 함', async () => {
    const user = userEvent.setup()
    render(<TeamInviteForm onInvite={mockOnInvite} />)
    
    const emailInput = screen.getByLabelText('이메일 주소')
    
    // 이메일 추가
    await user.type(emailInput, 'test@example.com')
    await user.keyboard('{Enter}')
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
    
    // 칩 제거
    const removeButton = screen.getByLabelText('test@example.com 제거')
    await user.click(removeButton)
    
    expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
  })

  it('만료일 설정이 가능해야 함', async () => {
    const user = userEvent.setup()
    render(<TeamInviteForm onInvite={mockOnInvite} />)
    
    const expiryDateInput = screen.getByLabelText('만료일')
    const futureDate = '2024-12-31'
    
    await user.type(expiryDateInput, futureDate)
    
    expect(expiryDateInput).toHaveValue(futureDate)
  })

  it('폼 제출 시 올바른 데이터로 onInvite가 호출되어야 함', async () => {
    const user = userEvent.setup()
    render(<TeamInviteForm onInvite={mockOnInvite} />)
    
    // 이메일 추가
    const emailInput = screen.getByLabelText('이메일 주소')
    await user.type(emailInput, 'test@example.com')
    await user.keyboard('{Enter}')
    
    // 역할 선택
    const roleSelect = screen.getByLabelText('역할')
    await user.selectOptions(roleSelect, 'Editor')
    
    // 만료일 설정
    const expiryDateInput = screen.getByLabelText('만료일')
    await user.type(expiryDateInput, '2024-12-31')
    
    // 제출
    const submitButton = screen.getByRole('button', { name: '초대 보내기' })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnInvite).toHaveBeenCalledWith({
        emails: ['test@example.com'],
        role: 'Editor',
        expiryDate: '2024-12-31'
      })
    })
  })

  it('유효하지 않은 이메일 형식은 추가되지 않아야 함', async () => {
    const user = userEvent.setup()
    render(<TeamInviteForm onInvite={mockOnInvite} />)
    
    const emailInput = screen.getByLabelText('이메일 주소')
    
    await user.type(emailInput, 'invalid-email')
    await user.keyboard('{Enter}')
    
    expect(screen.queryByText('invalid-email')).not.toBeInTheDocument()
    expect(screen.getByText('유효한 이메일 주소를 입력해주세요')).toBeInTheDocument()
  })
})