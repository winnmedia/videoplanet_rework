import { render, screen, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { TeamInviteForm } from './TeamInviteForm'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock API calls
const mockSendInvite = jest.fn()
jest.mock('@/shared/api', () => ({
  sendTeamInvite: jest.fn((...args) => mockSendInvite(...args)),
}))

describe('TeamInviteForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock timer 초기화
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  // RED: 기본 렌더링 실패 테스트
  it('should render form with all required fields', () => {
    render(<TeamInviteForm projectId="test-project" />)
    
    // 폼 제목
    expect(screen.getByRole('heading', { name: /팀 초대/i })).toBeInTheDocument()
    
    // 필수 입력 필드들
    expect(screen.getByLabelText(/이메일 주소/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/역할/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/초대 메시지/i)).toBeInTheDocument()
    
    // RBAC 드롭다운 옵션들
    const roleSelect = screen.getByLabelText(/역할/i)
    expect(screen.getByDisplayValue(/역할을 선택하세요/i)).toBeInTheDocument()
    
    // 버튼들
    expect(screen.getByRole('button', { name: /초대 보내기/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /취소/i })).toBeInTheDocument()
  })

  // RED: RBAC 드롭다운 옵션 테스트
  it('should show all RBAC role options', async () => {
    const user = userEvent.setup()
    render(<TeamInviteForm projectId="test-project" />)
    
    const roleSelect = screen.getByLabelText(/역할/i)
    await user.selectOptions(roleSelect, 'owner')
    expect(screen.getByDisplayValue(/Owner/i)).toBeInTheDocument()
    
    await user.selectOptions(roleSelect, 'admin')
    expect(screen.getByDisplayValue(/Admin/i)).toBeInTheDocument()
    
    await user.selectOptions(roleSelect, 'editor')
    expect(screen.getByDisplayValue(/Editor/i)).toBeInTheDocument()
    
    await user.selectOptions(roleSelect, 'reviewer')
    expect(screen.getByDisplayValue(/Reviewer/i)).toBeInTheDocument()
    
    await user.selectOptions(roleSelect, 'viewer')
    expect(screen.getByDisplayValue(/Viewer/i)).toBeInTheDocument()
  })

  // RED: 폼 유효성 검사 실패 테스트
  it('should show validation errors for invalid input', async () => {
    const user = userEvent.setup()
    render(<TeamInviteForm projectId="test-project" />)
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/유효한 이메일 주소를 입력해주세요/i)).toBeInTheDocument()
      expect(screen.getByText(/역할을 선택해주세요/i)).toBeInTheDocument()
    })
  })

  // RED: 이메일 형식 검증 테스트
  it('should validate email format', async () => {
    const user = userEvent.setup()
    render(<TeamInviteForm projectId="test-project" />)
    
    const emailInput = screen.getByLabelText(/이메일 주소/i)
    await user.type(emailInput, 'invalid-email')
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/유효한 이메일 주소를 입력해주세요/i)).toBeInTheDocument()
    })
  })

  // RED: SendGrid 이메일 전송 성공 테스트
  it('should send invite email via SendGrid successfully', async () => {
    const user = userEvent.setup()
    mockSendInvite.mockResolvedValue({ 
      status: 'sent', 
      messageId: 'msg-123',
      recipientEmail: 'user@example.com'
    })

    const onSuccess = jest.fn()
    render(<TeamInviteForm projectId="test-project" onSuccess={onSuccess} />)
    
    // 필수 필드 입력
    await user.type(screen.getByLabelText(/이메일 주소/i), 'user@example.com')
    await user.selectOptions(screen.getByLabelText(/역할/i), 'editor')
    await user.type(screen.getByLabelText(/초대 메시지/i), '프로젝트에 참여해주세요!')
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSendInvite).toHaveBeenCalledWith({
        projectId: 'test-project',
        email: 'user@example.com',
        role: 'editor',
        message: '프로젝트에 참여해주세요!'
      })
      expect(screen.getByText(/초대가 성공적으로 전송되었습니다/i)).toBeInTheDocument()
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  // RED: 60초 쿨다운 UI 처리 테스트
  it('should enforce 60 second cooldown after sending invite', async () => {
    const user = userEvent.setup()
    mockSendInvite.mockResolvedValue({ status: 'sent', messageId: 'msg-123' })

    render(<TeamInviteForm projectId="test-project" />)
    
    // 첫 번째 초대 전송
    await user.type(screen.getByLabelText(/이메일 주소/i), 'user@example.com')
    await user.selectOptions(screen.getByLabelText(/역할/i), 'editor')
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/초대가 성공적으로 전송되었습니다/i)).toBeInTheDocument()
    })
    
    // 쿨다운 상태 확인
    expect(screen.getByRole('button', { name: /60초 후 다시 시도/i })).toBeDisabled()
    
    // 30초 후 체크
    jest.advanceTimersByTime(30000)
    expect(screen.getByRole('button', { name: /30초 후 다시 시도/i })).toBeDisabled()
    
    // 60초 후 체크
    jest.advanceTimersByTime(30000)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /초대 보내기/i })).toBeEnabled()
    })
  })

  // RED: 로딩 상태 테스트
  it('should show loading state during email sending', async () => {
    const user = userEvent.setup()
    mockSendInvite.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ status: 'sent' }), 100)
    ))
    
    render(<TeamInviteForm projectId="test-project" />)
    
    // 필수 필드 입력
    await user.type(screen.getByLabelText(/이메일 주소/i), 'user@example.com')
    await user.selectOptions(screen.getByLabelText(/역할/i), 'editor')
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await user.click(submitButton)
    
    expect(screen.getByRole('button', { name: /전송 중.../i })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  // RED: SendGrid 에러 처리 테스트
  it('should handle SendGrid API errors gracefully', async () => {
    const user = userEvent.setup()
    mockSendInvite.mockRejectedValue(new Error('SendGrid API Error'))
    
    render(<TeamInviteForm projectId="test-project" />)
    
    // 필수 필드 입력
    await user.type(screen.getByLabelText(/이메일 주소/i), 'user@example.com')
    await user.selectOptions(screen.getByLabelText(/역할/i), 'editor')
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/초대 전송에 실패했습니다/i)).toBeInTheDocument()
    })
  })

  // RED: 역할별 권한 설명 표시 테스트
  it('should show role descriptions when role is selected', async () => {
    const user = userEvent.setup()
    render(<TeamInviteForm projectId="test-project" />)
    
    const roleSelect = screen.getByLabelText(/역할/i)
    
    await user.selectOptions(roleSelect, 'owner')
    expect(screen.getByText(/모든 권한을 가지며 프로젝트를 완전히 제어할 수 있습니다/i)).toBeInTheDocument()
    
    await user.selectOptions(roleSelect, 'editor')
    expect(screen.getByText(/비디오 편집 및 업로드 권한을 가집니다/i)).toBeInTheDocument()
    
    await user.selectOptions(roleSelect, 'viewer')
    expect(screen.getByText(/비디오 보기 및 댓글 작성만 가능합니다/i)).toBeInTheDocument()
  })

  // RED: 키보드 네비게이션 테스트
  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<TeamInviteForm projectId="test-project" />)
    
    const emailInput = screen.getByLabelText(/이메일 주소/i)
    const roleSelect = screen.getByLabelText(/역할/i)
    const messageInput = screen.getByLabelText(/초대 메시지/i)
    
    emailInput.focus()
    expect(emailInput).toHaveFocus()
    
    await user.tab()
    expect(roleSelect).toHaveFocus()
    
    await user.tab()
    expect(messageInput).toHaveFocus()
  })

  // RED: ARIA 및 접근성 테스트
  it('should have no accessibility violations', async () => {
    const { container } = render(<TeamInviteForm projectId="test-project" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  // RED: 레거시 UI 스타일 검증 테스트
  it('should use legacy Button and Typography styles', () => {
    render(<TeamInviteForm projectId="test-project" />)
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    const title = screen.getByRole('heading', { name: /팀 초대/i })
    
    // 레거시 Button 스타일 확인
    expect(submitButton).toHaveClass('bg-primary', 'text-white', 'hover:bg-primary-dark')
    
    // 레거시 Typography 스타일 확인
    expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-tight')
  })

  // RED: 취소 버튼 기능 테스트
  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()
    
    render(<TeamInviteForm projectId="test-project" onCancel={onCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: /취소/i })
    await user.click(cancelButton)
    
    expect(onCancel).toHaveBeenCalled()
  })

  // RED: 이메일 중복 초대 방지 테스트
  it('should prevent duplicate invites to same email', async () => {
    const user = userEvent.setup()
    mockSendInvite.mockRejectedValue(new Error('User already invited'))
    
    render(<TeamInviteForm projectId="test-project" />)
    
    await user.type(screen.getByLabelText(/이메일 주소/i), 'existing@example.com')
    await user.selectOptions(screen.getByLabelText(/역할/i), 'editor')
    
    const submitButton = screen.getByRole('button', { name: /초대 보내기/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/이미 초대된 사용자입니다/i)).toBeInTheDocument()
    })
  })
})