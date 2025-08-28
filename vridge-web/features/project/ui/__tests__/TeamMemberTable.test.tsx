import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamMemberTable } from '../TeamMemberTable'

const mockInvites = [
  {
    id: '1',
    email: 'pending@example.com',
    role: 'Editor',
    status: 'pending' as const,
    expiryDate: '2024-12-31',
    sentAt: '2024-01-01T00:00:00Z',
    lastSentAt: null
  },
  {
    id: '2', 
    email: 'accepted@example.com',
    role: 'Viewer',
    status: 'accepted' as const,
    expiryDate: '2024-12-31',
    sentAt: '2024-01-01T00:00:00Z',
    lastSentAt: null
  }
]

const mockMembers = [
  {
    id: '1',
    email: 'member@example.com',
    name: '김멤버',
    role: 'Admin',
    joinedAt: '2024-01-01T00:00:00Z',
    avatar: null
  }
]

describe('TeamMemberTable', () => {
  const mockOnResendInvite = jest.fn()
  const mockOnRevokeInvite = jest.fn()
  const mockOnRemoveMember = jest.fn()

  beforeEach(() => {
    mockOnResendInvite.mockClear()
    mockOnRevokeInvite.mockClear()
    mockOnRemoveMember.mockClear()
  })

  it('초대 목록을 렌더링해야 함', () => {
    render(
      <TeamMemberTable
        invites={mockInvites}
        members={mockMembers}
        onResendInvite={mockOnResendInvite}
        onRevokeInvite={mockOnRevokeInvite}
        onRemoveMember={mockOnRemoveMember}
      />
    )

    expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    expect(screen.getByText('accepted@example.com')).toBeInTheDocument()
  })

  it('멤버 목록을 렌더링해야 함', () => {
    render(
      <TeamMemberTable
        invites={mockInvites}
        members={mockMembers}
        onResendInvite={mockOnResendInvite}
        onRevokeInvite={mockOnRevokeInvite}
        onRemoveMember={mockOnRemoveMember}
      />
    )

    expect(screen.getByText('member@example.com')).toBeInTheDocument()
    expect(screen.getByText('김멤버')).toBeInTheDocument()
  })

  it('초대 상태별 배지를 표시해야 함', () => {
    render(
      <TeamMemberTable
        invites={mockInvites}
        members={mockMembers}
        onResendInvite={mockOnResendInvite}
        onRevokeInvite={mockOnRevokeInvite}
        onRemoveMember={mockOnRemoveMember}
      />
    )

    expect(screen.getByText('대기중')).toBeInTheDocument()
    expect(screen.getByText('수락됨')).toBeInTheDocument()
  })

  it('재전송 버튼 클릭 시 onResendInvite가 호출되어야 함', async () => {
    const user = userEvent.setup()
    render(
      <TeamMemberTable
        invites={mockInvites}
        members={mockMembers}
        onResendInvite={mockOnResendInvite}
        onRevokeInvite={mockOnRevokeInvite}
        onRemoveMember={mockOnRemoveMember}
      />
    )

    const resendButton = screen.getByLabelText('pending@example.com 초대 재전송')
    await user.click(resendButton)

    expect(mockOnResendInvite).toHaveBeenCalledWith('1')
  })

  it('철회 버튼 클릭 시 확인 모달 후 onRevokeInvite가 호출되어야 함', async () => {
    const user = userEvent.setup()
    window.confirm = jest.fn().mockReturnValue(true)
    
    render(
      <TeamMemberTable
        invites={mockInvites}
        members={mockMembers}
        onResendInvite={mockOnResendInvite}
        onRevokeInvite={mockOnRevokeInvite}
        onRemoveMember={mockOnRemoveMember}
      />
    )

    const revokeButton = screen.getByLabelText('pending@example.com 초대 철회')
    await user.click(revokeButton)

    expect(window.confirm).toHaveBeenCalledWith('정말 초대를 철회하시겠습니까?')
    expect(mockOnRevokeInvite).toHaveBeenCalledWith('1')
  })

  it('검색 기능이 작동해야 함', async () => {
    const user = userEvent.setup()
    render(
      <TeamMemberTable
        invites={mockInvites}
        members={mockMembers}
        onResendInvite={mockOnResendInvite}
        onRevokeInvite={mockOnRevokeInvite}
        onRemoveMember={mockOnRemoveMember}
      />
    )

    const searchInput = screen.getByPlaceholderText('이름 또는 이메일로 검색')
    await user.type(searchInput, 'pending')

    expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    expect(screen.queryByText('accepted@example.com')).not.toBeInTheDocument()
  })

  it('상태 필터가 작동해야 함', async () => {
    const user = userEvent.setup()
    render(
      <TeamMemberTable
        invites={mockInvites}
        members={mockMembers}
        onResendInvite={mockOnResendInvite}
        onRevokeInvite={mockOnRevokeInvite}
        onRemoveMember={mockOnRemoveMember}
      />
    )

    const statusFilter = screen.getByLabelText('상태 필터')
    await user.selectOptions(statusFilter, 'pending')

    expect(screen.getByText('pending@example.com')).toBeInTheDocument()
    expect(screen.queryByText('accepted@example.com')).not.toBeInTheDocument()
  })
})