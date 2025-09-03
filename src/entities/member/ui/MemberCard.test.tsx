import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { MemberCard } from './MemberCard'
import { Member } from '../model/types'
import { getPermissionsByRole } from '../lib/permissions'

expect.extend(toHaveNoViolations)

const mockMember: Member = {
  id: 1,
  user: {
    id: 1,
    username: 'johndoe',
    email: 'john@example.com',
    firstName: '철수',
    lastName: '김',
  },
  project: {
    id: 1,
    name: 'Test Project',
  },
  role: 'admin',
  status: 'active',
  invitedAt: '2024-01-01T00:00:00Z',
  joinedAt: '2024-01-02T00:00:00Z',
  created: '2024-01-01T00:00:00Z',
  updated: '2024-01-02T00:00:00Z',
  permissions: getPermissionsByRole('admin'),
}

describe('MemberCard', () => {
  describe('기본 렌더링', () => {
    it('멤버 정보를 올바르게 렌더링한다', () => {
      render(<MemberCard member={mockMember} />)
      
      expect(screen.getByText('김철수')).toBeInTheDocument()
      expect(screen.getByText('john@example.com')).toBeInTheDocument()
      expect(screen.getByText('Test Project')).toBeInTheDocument()
      expect(screen.getByText('관리자')).toBeInTheDocument()
      expect(screen.getByText('활성')).toBeInTheDocument()
    })

    it('사용자 이름이 없을 때 username을 표시한다', () => {
      const memberWithoutName = {
        ...mockMember,
        user: {
          ...mockMember.user,
          firstName: undefined,
          lastName: undefined,
        },
      }
      
      render(<MemberCard member={memberWithoutName} />)
      
      expect(screen.getByText('johndoe')).toBeInTheDocument()
    })

    it('참여하지 않은 멤버의 경우 "참여 대기중"을 표시한다', () => {
      const pendingMember = {
        ...mockMember,
        joinedAt: undefined,
        status: 'pending' as const,
      }
      
      render(<MemberCard member={pendingMember} />)
      
      expect(screen.getByText('참여 대기중')).toBeInTheDocument()
      expect(screen.getByText('대기중')).toBeInTheDocument()
    })
  })

  describe('역할 및 상태 표시', () => {
    it('역할별 올바른 배지를 표시한다', () => {
      const { rerender } = render(<MemberCard member={mockMember} />)
      
      expect(screen.getByText('관리자')).toBeInTheDocument()
      
      rerender(
        <MemberCard 
          member={{ ...mockMember, role: 'owner' }} 
        />
      )
      
      expect(screen.getByText('소유자')).toBeInTheDocument()
    })

    it('상태별 올바른 배지를 표시한다', () => {
      const { rerender } = render(<MemberCard member={mockMember} />)
      
      expect(screen.getByText('활성')).toBeInTheDocument()
      
      rerender(
        <MemberCard 
          member={{ ...mockMember, status: 'suspended' }} 
        />
      )
      
      expect(screen.getByText('정지')).toBeInTheDocument()
    })
  })

  describe('권한 표시', () => {
    it('멤버의 주요 권한을 표시한다', () => {
      render(<MemberCard member={mockMember} />)
      
      // admin 권한 확인
      expect(screen.getByText('프로젝트 편집')).toBeInTheDocument()
      expect(screen.getByText('사용자 초대')).toBeInTheDocument()
      expect(screen.getByText('멤버 관리')).toBeInTheDocument()
      expect(screen.getByText('피드백 승인')).toBeInTheDocument()
    })

    it('viewer 권한의 경우 권한 표시가 최소화된다', () => {
      const viewerMember = {
        ...mockMember,
        role: 'viewer' as const,
        permissions: getPermissionsByRole('viewer'),
      }
      
      render(<MemberCard member={viewerMember} />)
      
      expect(screen.queryByText('프로젝트 편집')).not.toBeInTheDocument()
      expect(screen.queryByText('사용자 초대')).not.toBeInTheDocument()
      expect(screen.queryByText('멤버 관리')).not.toBeInTheDocument()
    })
  })

  describe('액션 버튼', () => {
    it('수정 버튼이 제공되면 표시한다', () => {
      const mockEdit = jest.fn()
      
      render(
        <MemberCard 
          member={mockMember} 
          onEdit={mockEdit}
        />
      )
      
      const editButton = screen.getByRole('button', { name: /수정/ })
      expect(editButton).toBeInTheDocument()
      
      fireEvent.click(editButton)
      expect(mockEdit).toHaveBeenCalledWith(mockMember)
    })

    it('삭제 버튼이 제공되면 표시한다', () => {
      const mockRemove = jest.fn()
      
      render(
        <MemberCard 
          member={mockMember} 
          onRemove={mockRemove}
        />
      )
      
      const removeButton = screen.getByRole('button', { name: /삭제/ })
      expect(removeButton).toBeInTheDocument()
      
      fireEvent.click(removeButton)
      expect(mockRemove).toHaveBeenCalledWith(mockMember)
    })

    it('소유자의 경우 삭제 버튼을 표시하지 않는다', () => {
      const ownerMember = { ...mockMember, role: 'owner' as const }
      
      render(
        <MemberCard 
          member={ownerMember} 
          onRemove={jest.fn()}
        />
      )
      
      expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument()
    })

    it('액션 콜백이 없으면 액션 버튼을 표시하지 않는다', () => {
      render(<MemberCard member={mockMember} />)
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('이벤트 버블링', () => {
    it('액션 버튼 클릭시 이벤트 버블링을 방지한다', () => {
      const mockEdit = jest.fn()
      const mockCardClick = jest.fn()
      
      render(
        <div onClick={mockCardClick}>
          <MemberCard 
            member={mockMember} 
            onEdit={mockEdit}
          />
        </div>
      )
      
      const editButton = screen.getByRole('button', { name: /수정/ })
      fireEvent.click(editButton)
      
      expect(mockEdit).toHaveBeenCalledWith(mockMember)
      expect(mockCardClick).not.toHaveBeenCalled()
    })
  })

  describe('접근성 테스트', () => {
    it('접근성 규칙을 준수한다', async () => {
      const { container } = render(
        <MemberCard 
          member={mockMember}
          onEdit={jest.fn()}
          onRemove={jest.fn()}
        />
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('적절한 aria-label을 제공한다', () => {
      render(
        <MemberCard 
          member={mockMember}
          onEdit={jest.fn()}
          data-testid="member-card"
        />
      )
      
      const card = screen.getByTestId('member-card')
      expect(card).toHaveAttribute('aria-label', '김철수 멤버 정보 카드')
      
      const editButton = screen.getByRole('button', { name: '김철수 멤버 정보 수정' })
      expect(editButton).toBeInTheDocument()
    })
  })

  describe('데이터 형식화', () => {
    it('참여일을 올바른 형식으로 표시한다', () => {
      render(<MemberCard member={mockMember} />)
      
      // 한국 날짜 형식으로 표시되어야 함
      expect(screen.getByText('2024. 1. 2.')).toBeInTheDocument()
    })

    it('긴 프로젝트 이름을 truncate 처리한다', () => {
      const memberWithLongProject = {
        ...mockMember,
        project: {
          id: 1,
          name: 'Very Long Project Name That Should Be Truncated',
        },
      }
      
      render(<MemberCard member={memberWithLongProject} />)
      
      const projectName = screen.getByTitle('Very Long Project Name That Should Be Truncated')
      expect(projectName).toHaveClass('truncate')
    })
  })

  describe('에러 케이스', () => {
    it('permissions가 없어도 오류없이 렌더링한다', () => {
      const memberWithoutPermissions = {
        ...mockMember,
        permissions: undefined,
      }
      
      render(<MemberCard member={memberWithoutPermissions} />)
      
      expect(screen.getByText('김철수')).toBeInTheDocument()
      expect(screen.queryByText('주요 권한')).not.toBeInTheDocument()
    })

    it('잘못된 날짜 형식이 제공되어도 오류없이 처리한다', () => {
      const memberWithInvalidDate = {
        ...mockMember,
        joinedAt: 'invalid-date',
      }
      
      render(<MemberCard member={memberWithInvalidDate} />)
      
      expect(screen.getByText('김철수')).toBeInTheDocument()
      // 잘못된 날짜는 적절히 처리되어야 함
    })
  })
})