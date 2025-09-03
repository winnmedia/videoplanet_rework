import { useState, useMemo } from 'react'
import { AdminCard, AdminTable } from 'shared/ui'
import { MemberCard, FeedbackCard, type Member, type Feedback } from 'entities'
import { SearchBar, FilterPanel, SearchResults } from 'features/admin-search'
import type { Column } from 'shared/ui/AdminTable'

export interface AdminDashboardProps {
  /** 멤버 데이터 */
  members: Member[]
  
  /** 피드백 데이터 */
  feedbacks: Feedback[]
  
  /** 로딩 상태 */
  loading?: boolean
  
  /** 에러 상태 */
  error?: string | null
  
  /** 멤버 관련 이벤트 핸들러 */
  onMemberEdit?: (member: Member) => void
  onMemberRemove?: (member: Member) => void
  
  /** 피드백 관련 이벤트 핸들러 */
  onFeedbackView?: (feedback: Feedback) => void
  onFeedbackEdit?: (feedback: Feedback) => void
  onFeedbackDelete?: (feedback: Feedback) => void
  onFeedbackStatusChange?: (feedback: Feedback, newStatus: Feedback['status']) => void
  
  /** 추가 CSS 클래스 */
  className?: string
  
  /** 테스트를 위한 ID */
  'data-testid'?: string
}

type ViewMode = 'overview' | 'members' | 'feedbacks'

function DashboardStats({ 
  members, 
  feedbacks 
}: { 
  members: Member[]
  feedbacks: Feedback[] 
}) {
  const stats = useMemo(() => {
    const membersByStatus = members.reduce((acc, member) => {
      acc[member.status] = (acc[member.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const feedbacksByStatus = feedbacks.reduce((acc, feedback) => {
      acc[feedback.status] = (acc[feedback.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const urgentFeedbacks = feedbacks.filter(f => f.priority === 'urgent').length
    
    return {
      totalMembers: members.length,
      activeMembers: membersByStatus.active || 0,
      totalFeedbacks: feedbacks.length,
      pendingFeedbacks: feedbacksByStatus.pending || 0,
      urgentFeedbacks,
    }
  }, [members, feedbacks])
  
  const statCards = [
    {
      title: '전체 멤버',
      value: stats.totalMembers,
      subtitle: `활성: ${stats.activeMembers}명`,
      color: 'text-primary-600',
    },
    {
      title: '전체 피드백',
      value: stats.totalFeedbacks,
      subtitle: `대기: ${stats.pendingFeedbacks}개`,
      color: 'text-green-600',
    },
    {
      title: '긴급 피드백',
      value: stats.urgentFeedbacks,
      subtitle: '즉시 처리 필요',
      color: 'text-red-600',
    },
  ]
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {statCards.map((stat, index) => (
        <AdminCard key={index} size="sm">
          <div className="text-center">
            <div className={`text-2xl font-bold ${stat.color} mb-1`}>
              {stat.value.toLocaleString()}
            </div>
            <div className="text-sm font-medium text-neutral-900 mb-1">
              {stat.title}
            </div>
            <div className="text-xs text-neutral-500">
              {stat.subtitle}
            </div>
          </div>
        </AdminCard>
      ))}
    </div>
  )
}

function ViewModeSelector({ 
  currentMode, 
  onModeChange 
}: { 
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void 
}) {
  const modes = [
    { key: 'overview' as const, label: '개요' },
    { key: 'members' as const, label: '멤버 관리' },
    { key: 'feedbacks' as const, label: '피드백 관리' },
  ]
  
  return (
    <div className="flex bg-neutral-100 rounded-admin p-1">
      {modes.map((mode) => (
        <button
          key={mode.key}
          type="button"
          onClick={() => onModeChange(mode.key)}
          className={`
            flex-1 px-4 py-2 text-sm font-medium rounded transition-all duration-200 focus-ring
            ${currentMode === mode.key
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900'
            }
          `}
          aria-pressed={currentMode === mode.key}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}

function MemberManagementView({ 
  members, 
  onEdit, 
  onRemove 
}: {
  members: Member[]
  onEdit?: (member: Member) => void
  onRemove?: (member: Member) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCollapsed, setFilterCollapsed] = useState(false)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  
  // 필터링된 멤버 목록
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      const matchesSearch = !searchQuery || 
        member.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member.user.firstName && member.user.firstName.includes(searchQuery)) ||
        (member.user.lastName && member.user.lastName.includes(searchQuery))
      
      const matchesRole = selectedRoles.length === 0 || selectedRoles.includes(member.role)
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(member.status)
      
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [members, searchQuery, selectedRoles, selectedStatuses])
  
  const filterGroups = [
    {
      key: 'role',
      title: '역할',
      multiple: true,
      selectedValues: selectedRoles,
      onChange: setSelectedRoles,
      options: [
        { value: 'owner', label: '소유자', count: members.filter(m => m.role === 'owner').length },
        { value: 'admin', label: '관리자', count: members.filter(m => m.role === 'admin').length },
        { value: 'editor', label: '편집자', count: members.filter(m => m.role === 'editor').length },
        { value: 'reviewer', label: '검토자', count: members.filter(m => m.role === 'reviewer').length },
        { value: 'viewer', label: '조회자', count: members.filter(m => m.role === 'viewer').length },
      ],
    },
    {
      key: 'status',
      title: '상태',
      multiple: true,
      selectedValues: selectedStatuses,
      onChange: setSelectedStatuses,
      options: [
        { value: 'active', label: '활성', count: members.filter(m => m.status === 'active').length },
        { value: 'inactive', label: '비활성', count: members.filter(m => m.status === 'inactive').length },
        { value: 'pending', label: '대기중', count: members.filter(m => m.status === 'pending').length },
        { value: 'suspended', label: '정지', count: members.filter(m => m.status === 'suspended').length },
      ],
    },
  ]
  
  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedRoles([])
    setSelectedStatuses([])
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="space-y-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="멤버 검색..."
          />
          
          <FilterPanel
            filterGroups={filterGroups}
            collapsed={filterCollapsed}
            onToggleCollapsed={setFilterCollapsed}
            onReset={handleResetFilters}
          />
        </div>
      </div>
      
      <div className="lg:col-span-3">
        <SearchResults
          results={filteredMembers}
          searchQuery={searchQuery}
          totalCount={filteredMembers.length}
          layout="grid"
          renderItem={(member) => (
            <MemberCard
              member={member}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          )}
          emptyMessage="조건에 맞는 멤버가 없습니다"
        />
      </div>
    </div>
  )
}

function FeedbackManagementView({ 
  feedbacks, 
  onView,
  onEdit, 
  onDelete,
  onStatusChange 
}: {
  feedbacks: Feedback[]
  onView?: (feedback: Feedback) => void
  onEdit?: (feedback: Feedback) => void
  onDelete?: (feedback: Feedback) => void
  onStatusChange?: (feedback: Feedback, newStatus: Feedback['status']) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCollapsed, setFilterCollapsed] = useState(false)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  
  // 필터링된 피드백 목록
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter(feedback => {
      const matchesSearch = !searchQuery || 
        feedback.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feedback.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        feedback.author.username.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(feedback.status)
      const matchesPriority = selectedPriorities.length === 0 || selectedPriorities.includes(feedback.priority)
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(feedback.type)
      
      return matchesSearch && matchesStatus && matchesPriority && matchesType
    })
  }, [feedbacks, searchQuery, selectedStatuses, selectedPriorities, selectedTypes])
  
  const filterGroups = [
    {
      key: 'status',
      title: '상태',
      multiple: true,
      selectedValues: selectedStatuses,
      onChange: setSelectedStatuses,
      options: [
        { value: 'pending', label: '대기중', count: feedbacks.filter(f => f.status === 'pending').length },
        { value: 'approved', label: '승인됨', count: feedbacks.filter(f => f.status === 'approved').length },
        { value: 'rejected', label: '거부됨', count: feedbacks.filter(f => f.status === 'rejected').length },
        { value: 'implemented', label: '구현완료', count: feedbacks.filter(f => f.status === 'implemented').length },
      ],
    },
    {
      key: 'priority',
      title: '우선순위',
      multiple: true,
      selectedValues: selectedPriorities,
      onChange: setSelectedPriorities,
      options: [
        { value: 'urgent', label: '긴급', count: feedbacks.filter(f => f.priority === 'urgent').length },
        { value: 'high', label: '높음', count: feedbacks.filter(f => f.priority === 'high').length },
        { value: 'medium', label: '보통', count: feedbacks.filter(f => f.priority === 'medium').length },
        { value: 'low', label: '낮음', count: feedbacks.filter(f => f.priority === 'low').length },
      ],
    },
    {
      key: 'type',
      title: '유형',
      multiple: true,
      selectedValues: selectedTypes,
      onChange: setSelectedTypes,
      options: [
        { value: 'bug', label: '버그', count: feedbacks.filter(f => f.type === 'bug').length },
        { value: 'feature', label: '기능요청', count: feedbacks.filter(f => f.type === 'feature').length },
        { value: 'improvement', label: '개선사항', count: feedbacks.filter(f => f.type === 'improvement').length },
        { value: 'general', label: '일반', count: feedbacks.filter(f => f.type === 'general').length },
        { value: 'question', label: '질문', count: feedbacks.filter(f => f.type === 'question').length },
      ],
    },
  ]
  
  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedStatuses([])
    setSelectedPriorities([])
    setSelectedTypes([])
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1">
        <div className="space-y-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="피드백 검색..."
          />
          
          <FilterPanel
            filterGroups={filterGroups}
            collapsed={filterCollapsed}
            onToggleCollapsed={setFilterCollapsed}
            onReset={handleResetFilters}
          />
        </div>
      </div>
      
      <div className="lg:col-span-3">
        <SearchResults
          results={filteredFeedbacks}
          searchQuery={searchQuery}
          totalCount={filteredFeedbacks.length}
          layout="list"
          renderItem={(feedback) => (
            <FeedbackCard
              feedback={feedback}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          )}
          emptyMessage="조건에 맞는 피드백이 없습니다"
        />
      </div>
    </div>
  )
}

export function AdminDashboard({
  members,
  feedbacks,
  loading = false,
  error = null,
  onMemberEdit,
  onMemberRemove,
  onFeedbackView,
  onFeedbackEdit,
  onFeedbackDelete,
  onFeedbackStatusChange,
  className,
  'data-testid': testId,
}: AdminDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-pulse-slow text-4xl">⏳</div>
        <div className="ml-4 text-neutral-600">데이터 로딩 중...</div>
      </div>
    )
  }
  
  if (error) {
    return (
      <AdminCard variant="danger" className={className}>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-red-600 font-medium mb-2">오류가 발생했습니다</div>
          <div className="text-sm text-neutral-500">{error}</div>
        </div>
      </AdminCard>
    )
  }
  
  return (
    <div className={`space-y-6 ${className}`} data-testid={testId}>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            관리자 대시보드
          </h1>
          <p className="text-sm text-neutral-600">
            멤버 및 피드백 관리 통합 인터페이스
          </p>
        </div>
        
        <ViewModeSelector currentMode={viewMode} onModeChange={setViewMode} />
      </div>
      
      {/* 통계 카드 (개요 모드에서만 표시) */}
      {viewMode === 'overview' && (
        <DashboardStats members={members} feedbacks={feedbacks} />
      )}
      
      {/* 콘텐츠 영역 */}
      <div className="min-h-96">
        {viewMode === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 최근 멤버 */}
            <AdminCard title="최근 멤버" size="sm">
              <div className="space-y-3">
                {members.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center justify-between py-2 border-b border-border-light last:border-b-0">
                    <div>
                      <div className="font-medium text-sm">
                        {member.user.firstName && member.user.lastName
                          ? `${member.user.lastName}${member.user.firstName}`
                          : member.user.username}
                      </div>
                      <div className="text-xs text-neutral-500">{member.user.email}</div>
                    </div>
                    <div className="text-xs text-neutral-400">
                      {member.role}
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
            
            {/* 최근 피드백 */}
            <AdminCard title="최근 피드백" size="sm">
              <div className="space-y-3">
                {feedbacks.slice(0, 5).map((feedback) => (
                  <div key={feedback.id} className="py-2 border-b border-border-light last:border-b-0">
                    <div className="font-medium text-sm mb-1 truncate">
                      {feedback.title}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-neutral-500">
                        {feedback.author.username}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {feedback.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AdminCard>
          </div>
        )}
        
        {viewMode === 'members' && (
          <MemberManagementView
            members={members}
            onEdit={onMemberEdit}
            onRemove={onMemberRemove}
          />
        )}
        
        {viewMode === 'feedbacks' && (
          <FeedbackManagementView
            feedbacks={feedbacks}
            onView={onFeedbackView}
            onEdit={onFeedbackEdit}
            onDelete={onFeedbackDelete}
            onStatusChange={onFeedbackStatusChange}
          />
        )}
      </div>
    </div>
  )
}

export default AdminDashboard