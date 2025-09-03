import { render, screen, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { TeamInvite } from './TeamInvite'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock API 함수
const mockInviteTeamMember = jest.fn()
jest.mock('@/shared/api', () => ({
  inviteTeamMember: () => mockInviteTeamMember(),
}))

describe('TeamInvite Component', () => {
  const defaultProps = {
    projectId: 'test-project-123',
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Basic rendering tests
  it('should render team invite form with all required fields', () => {
    render(<TeamInvite {...defaultProps} />)
    
    expect(screen.getByRole('heading', { name: /팀 멤버 초대/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/이메일 주소/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/역할/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/초대 메시지/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /초대 보내기/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /취소/i })).toBeInTheDocument()
  })

  // Form validation tests
  it('should show validation error when email is empty', async () => {
    render(<TeamInvite {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await userEvent.click(submitButton)
    
    expect(screen.getByText(/이메일 주소를 입력해주세요/i)).toBeInTheDocument()
  })

  it('should show validation error for invalid email format', async () => {
    render(<TeamInvite {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/이메일 주소/i)
    await userEvent.type(emailInput, 'invalid-email')
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await userEvent.click(submitButton)
    
    expect(screen.getByText(/올바른 이메일 형식을 입력해주세요/i)).toBeInTheDocument()
  })

  it('should show validation error when role is not selected', async () => {
    render(<TeamInvite {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/이메일 주소/i)
    await userEvent.type(emailInput, 'test@example.com')
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await userEvent.click(submitButton)
    
    expect(screen.getByText(/역할을 선택해주세요/i)).toBeInTheDocument()
  })

  // Successful form submission test
  it('should submit form with valid data', async () => {
    mockInviteTeamMember.mockResolvedValue({ success: true, id: 'invite-123' })
    
    render(<TeamInvite {...defaultProps} />)
    
    // Fill form with valid data
    const emailInput = screen.getByLabelText(/이메일 주소/i)
    const roleSelect = screen.getByLabelText(/역할/i)
    const messageInput = screen.getByLabelText(/초대 메시지/i)
    
    await userEvent.type(emailInput, 'colleague@example.com')
    await userEvent.selectOptions(roleSelect, 'editor')
    await userEvent.type(messageInput, '프로젝트에 참여해주세요!')
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await userEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockInviteTeamMember).toHaveBeenCalledWith({
        projectId: 'test-project-123',
        email: 'colleague@example.com',
        role: 'editor',
        message: '프로젝트에 참여해주세요!',
      })
    })
    
    expect(defaultProps.onSuccess).toHaveBeenCalled()
  })

  // Loading state test
  it('should show loading state during form submission', async () => {
    let resolvePromise: (value: any) => void
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve
    })
    mockInviteTeamMember.mockReturnValue(pendingPromise)
    
    render(<TeamInvite {...defaultProps} />)
    
    // Fill and submit form
    const emailInput = screen.getByLabelText(/이메일 주소/i)
    const roleSelect = screen.getByLabelText(/역할/i)
    
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.selectOptions(roleSelect, 'viewer')
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await userEvent.click(submitButton)
    
    // Check loading state
    expect(screen.getByRole('button', { name: /초대 중.../i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /초대 중.../i })).toBeDisabled()
    
    // Resolve promise to clean up
    resolvePromise!({ success: true, id: 'test' })
  })

  // Error handling test
  it('should handle API errors', async () => {
    mockInviteTeamMember.mockRejectedValue(new Error('Network error'))
    
    render(<TeamInvite {...defaultProps} />)
    
    // Fill and submit form
    const emailInput = screen.getByLabelText(/이메일 주소/i)
    const roleSelect = screen.getByLabelText(/역할/i)
    
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.selectOptions(roleSelect, 'editor')
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await userEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/초대 전송에 실패했습니다/i)).toBeInTheDocument()
    })
  })

  // Cancel button test
  it('should call onCancel when cancel button is clicked', async () => {
    render(<TeamInvite {...defaultProps} />)
    
    const cancelButton = screen.getByRole('button', { name: /취소/i })
    await userEvent.click(cancelButton)
    
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  // Keyboard navigation tests
  it('should support keyboard navigation through form fields', async () => {
    render(<TeamInvite {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/이메일 주소/i)
    const roleSelect = screen.getByLabelText(/역할/i)
    const messageInput = screen.getByLabelText(/초대 메시지/i)
    
    // Tab through fields
    emailInput.focus()
    expect(emailInput).toHaveFocus()
    
    await userEvent.keyboard('{Tab}')
    expect(roleSelect).toHaveFocus()
    
    await userEvent.keyboard('{Tab}')
    expect(messageInput).toHaveFocus()
  })

  // Accessibility tests
  it('should have no accessibility violations', async () => {
    const { container } = render(<TeamInvite {...defaultProps} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper form labels and ARIA attributes', () => {
    render(<TeamInvite {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/이메일 주소/i)
    const roleSelect = screen.getByLabelText(/역할/i)
    const messageInput = screen.getByLabelText(/초대 메시지/i)
    
    expect(emailInput).toHaveAttribute('aria-required', 'true')
    expect(roleSelect).toHaveAttribute('aria-required', 'true')
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('aria-describedby')
  })

  // Role options test
  it('should display all available role options', () => {
    render(<TeamInvite {...defaultProps} />)
    
    const roleSelect = screen.getByLabelText(/역할/i)
    
    expect(screen.getByRole('option', { name: /역할을 선택하세요/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /관리자/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /편집자/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /뷰어/i })).toBeInTheDocument()
  })

  // Email validation edge cases
  it('should handle multiple email validation scenarios', async () => {
    render(<TeamInvite {...defaultProps} />)
    
    const emailInput = screen.getByLabelText(/이메일 주소/i)
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    
    // Test empty email
    await userEvent.click(submitButton)
    expect(screen.getByText(/이메일 주소를 입력해주세요/i)).toBeInTheDocument()
    
    // Test invalid format
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'invalid')
    await userEvent.click(submitButton)
    expect(screen.getByText(/올바른 이메일 형식을 입력해주세요/i)).toBeInTheDocument()
    
    // Test valid email clears error
    await userEvent.clear(emailInput)
    await userEvent.type(emailInput, 'valid@example.com')
    expect(screen.queryByText(/이메일 형식을 입력해주세요/i)).not.toBeInTheDocument()
  })
})