import { AdminCard } from 'shared/ui'
import { Member } from '../model/types'
import { getRoleDisplayName, getRoleColorClass } from '../lib/permissions'

export interface MemberCardProps {
  /** 멤버 데이터 */
  member: Member
  
  /** 카드 클릭 이벤트 */
  onEdit?: (member: Member) => void
  
  /** 멤버 삭제 이벤트 */
  onRemove?: (member: Member) => void
  
  /** 추가 CSS 클래스 */
  className?: string
  
  /** 테스트를 위한 ID */
  'data-testid'?: string
}

function MemberStatusBadge({ status }: { status: Member['status'] }) {
  const statusConfig = {
    active: { label: '활성', className: 'bg-admin-success text-white' },
    inactive: { label: '비활성', className: 'bg-neutral-400 text-white' },
    pending: { label: '대기중', className: 'bg-admin-pending text-white' },
    suspended: { label: '정지', className: 'bg-admin-error text-white' },
  }
  
  const config = statusConfig[status]
  
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
      {config.label}
    </span>
  )
}

function MemberRoleBadge({ role }: { role: Member['role'] }) {
  const roleColorClass = getRoleColorClass(role)
  const roleDisplayName = getRoleDisplayName(role)
  
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${roleColorClass}`}>
      {roleDisplayName}
    </span>
  )
}

function MemberActions({ 
  member, 
  onEdit, 
  onRemove 
}: { 
  member: Member
  onEdit?: (member: Member) => void
  onRemove?: (member: Member) => void
}) {
  if (!onEdit && !onRemove) return null
  
  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(member)
          }}
          className="text-xs text-primary-600 hover:text-primary-700 focus-ring px-2 py-1 rounded"
          aria-label={`${member.user.username} 멤버 정보 수정`}
        >
          수정
        </button>
      )}
      
      {onRemove && member.role !== 'owner' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(member)
          }}
          className="text-xs text-admin-error hover:text-red-700 focus-ring px-2 py-1 rounded"
          aria-label={`${member.user.username} 멤버 삭제`}
        >
          삭제
        </button>
      )}
    </div>
  )
}

export function MemberCard({
  member,
  onEdit,
  onRemove,
  className,
  'data-testid': testId,
}: MemberCardProps) {
  const memberName = member.user.firstName && member.user.lastName
    ? `${member.user.lastName}${member.user.firstName}`
    : member.user.username
  
  const joinDate = member.joinedAt 
    ? new Date(member.joinedAt).toLocaleDateString('ko-KR')
    : '참여 대기중'
  
  const actionComponent = (
    <MemberActions
      member={member}
      onEdit={onEdit}
      onRemove={onRemove}
    />
  )
  
  return (
    <AdminCard
      title={memberName}
      action={actionComponent}
      className={className}
      data-testid={testId}
      aria-label={`${memberName} 멤버 정보 카드`}
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MemberRoleBadge role={member.role} />
          <MemberStatusBadge status={member.status} />
        </div>
        
        <div className="text-sm text-neutral-600 space-y-1">
          <div className="flex justify-between">
            <span>이메일:</span>
            <span className="font-medium">{member.user.email}</span>
          </div>
          
          <div className="flex justify-between">
            <span>프로젝트:</span>
            <span className="font-medium truncate max-w-32" title={member.project.name}>
              {member.project.name}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>참여일:</span>
            <span className="font-medium">{joinDate}</span>
          </div>
        </div>
        
        {member.permissions && (
          <div className="pt-2 border-t border-border-light">
            <div className="text-xs text-neutral-500 mb-2">주요 권한</div>
            <div className="flex flex-wrap gap-1">
              {member.permissions.canEditProject && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                  프로젝트 편집
                </span>
              )}
              {member.permissions.canInviteUsers && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                  사용자 초대
                </span>
              )}
              {member.permissions.canManageMembers && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                  멤버 관리
                </span>
              )}
              {member.permissions.canApproveFeedback && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded">
                  피드백 승인
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminCard>
  )
}

export default MemberCard