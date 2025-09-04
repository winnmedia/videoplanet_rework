'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { 
  useCreateProjectMutation,
  useInviteTeamMembersMutation,
  useGetProjectTeamQuery,
  useResendInviteMutation,
  useRevokeInviteMutation,
  useRemoveMemberMutation,
  type TeamInviteData
} from '@/entities/project/api/projectApi'
import { ProjectSchedulePreview, TeamInviteForm, TeamMemberTable } from '@/features/project'
import { Button, Card } from '@/shared/ui'
import { SideBar } from '@/widgets'

interface ProjectFormData {
  title: string
  description: string
  type: string
  priority: string
  startDate: string
}

interface ProjectSchedule {
  planning: { duration: number; label: string }
  filming: { duration: number; label: string }
  editing: { duration: number; label: string }
}

/**
 * 프로젝트 관리 페이지 - 프로젝트 생성 & 팀원 초대
 */
export default function ProjectManagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('id') || ''
  
  // API Hooks
  const [createProject] = useCreateProjectMutation()
  const [inviteTeamMembers] = useInviteTeamMembersMutation()
  const [resendInvite] = useResendInviteMutation()
  const [revokeInvite] = useRevokeInviteMutation()
  const [removeMember] = useRemoveMemberMutation()
  const { data: teamData, isLoading: teamLoading } = useGetProjectTeamQuery(projectId, {
    skip: !projectId
  })

  // State
  const [activeTab, setActiveTab] = useState<'create' | 'invite'>('create')
  const [projectFormData, setProjectFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    type: 'video_production',
    priority: 'medium',
    startDate: new Date().toISOString().split('T')[0]
  })
  
  // 기본 자동 일정 설정 (기획 1주, 촬영 1일, 편집 2주)
  const [schedule, setSchedule] = useState<ProjectSchedule>({
    planning: { duration: 7, label: '기획 1주' },
    filming: { duration: 1, label: '촬영 1일' },
    editing: { duration: 14, label: '편집 2주' }
  })
  const [isCustomSchedule, setIsCustomSchedule] = useState(false)
  
  const [errors, setErrors] = useState<Partial<ProjectFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 프로젝트 생성 폼 검증
  const validateProjectForm = (): boolean => {
    const newErrors: Partial<ProjectFormData> = {}

    if (!projectFormData.title.trim()) {
      newErrors.title = '프로젝트 제목을 입력해주세요'
    } else if (projectFormData.title.length > 100) {
      newErrors.title = '프로젝트 제목은 100자 이하로 입력해주세요'
    }

    if (!projectFormData.description.trim()) {
      newErrors.description = '프로젝트 설명을 입력해주세요'
    } else if (projectFormData.description.length > 500) {
      newErrors.description = '프로젝트 설명은 500자 이하로 입력해주세요'
    }

    if (!projectFormData.type) {
      newErrors.type = '프로젝트 유형을 선택해주세요'
    }

    if (!projectFormData.startDate) {
      newErrors.startDate = '시작 날짜를 선택해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 프로젝트 생성 제출
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateProjectForm()) return

    setIsSubmitting(true)

    try {
      const result = await createProject({
        ...projectFormData,
        schedule: isCustomSchedule ? schedule : undefined
      }).unwrap()
      
      // 성공 시 팀원 초대 탭으로 이동하고 URL 업데이트
      setActiveTab('invite')
      router.push(`/projects/manage?id=${result.id}`)
      
      alert('프로젝트가 성공적으로 생성되었습니다!')
    } catch (error) {
      console.error('프로젝트 생성 실패:', error)
      alert('프로젝트 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 팀원 초대
  const handleTeamInvite = async (data: { emails: string[]; role: string; expiryDate: string }) => {
    if (!projectId) {
      alert('먼저 프로젝트를 생성해주세요.')
      return
    }

    try {
      await inviteTeamMembers({
        projectId,
        emails: data.emails,
        role: data.role as any,
        expiryDate: data.expiryDate
      }).unwrap()
      
      alert('초대장이 성공적으로 발송되었습니다!')
    } catch (error) {
      console.error('초대 실패:', error)
      alert('초대 발송에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 초대 재전송
  const handleResendInvite = async (inviteId: string) => {
    try {
      await resendInvite(inviteId).unwrap()
      alert('초대장이 재전송되었습니다.')
    } catch (error) {
      console.error('재전송 실패:', error)
      alert('재전송에 실패했습니다.')
    }
  }

  // 초대 철회
  const handleRevokeInvite = async (inviteId: string) => {
    try {
      await revokeInvite(inviteId).unwrap()
      alert('초대가 철회되었습니다.')
    } catch (error) {
      console.error('철회 실패:', error)
      alert('철회에 실패했습니다.')
    }
  }

  // 멤버 제거
  const handleRemoveMember = async (memberId: string) => {
    if (!projectId) return
    
    try {
      await removeMember({ projectId, memberId }).unwrap()
      alert('멤버가 제거되었습니다.')
    } catch (error) {
      console.error('멤버 제거 실패:', error)
      alert('멤버 제거에 실패했습니다.')
    }
  }

  // 스케줄 변경 핸들러
  const handleScheduleToggle = () => {
    setIsCustomSchedule(!isCustomSchedule)
  }

  const handleScheduleChange = (phase: keyof ProjectSchedule, duration: number) => {
    setSchedule(prev => ({
      ...prev,
      [phase]: {
        duration,
        label: phase === 'planning' ? `기획 ${duration}일` : 
               phase === 'filming' ? `촬영 ${duration}일` : 
               `편집 ${duration}일`
      }
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SideBar />
      
      <main className="ml-[18.75rem] pt-20 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* 페이지 헤더 */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                aria-label="이전 페이지로 돌아가기"
              >
                ← 돌아가기
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">프로젝트 관리</h1>
            <p className="text-gray-600 mt-2">
              새로운 프로젝트를 생성하고 팀원을 초대하여 협업을 시작하세요.
            </p>
          </div>

          {/* 탭 네비게이션 */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('create')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'create'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  프로젝트 생성
                </button>
                <button
                  onClick={() => setActiveTab('invite')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'invite'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  disabled={!projectId}
                >
                  팀원 초대
                  {!projectId && <span className="ml-1 text-xs text-gray-400">(프로젝트 생성 후 이용 가능)</span>}
                </button>
              </nav>
            </div>
          </div>

          {/* 콘텐츠 */}
          {activeTab === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 프로젝트 생성 폼 */}
              <div className="lg:col-span-2">
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">새 프로젝트 생성</h2>
                  
                  <form onSubmit={handleCreateProject} className="space-y-6">
                    {/* 프로젝트 제목 */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                        프로젝트 제목 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="title"
                        type="text"
                        value={projectFormData.title}
                        onChange={(e) => setProjectFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="예: 브랜드 홍보 영상 제작"
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.title ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                        maxLength={100}
                      />
                      {errors.title && (
                        <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                      )}
                    </div>

                    {/* 프로젝트 설명 */}
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        프로젝트 설명 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="description"
                        value={projectFormData.description}
                        onChange={(e) => setProjectFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="프로젝트의 목적, 타겟 오디언스, 주요 메시지 등을 간략히 설명해주세요"
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.description ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                        maxLength={500}
                      />
                      {errors.description && (
                        <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                      )}
                    </div>

                    {/* 프로젝트 유형과 우선순위 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                          프로젝트 유형 <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="type"
                          value={projectFormData.type}
                          onChange={(e) => setProjectFormData(prev => ({ ...prev, type: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="video_production">영상 제작</option>
                          <option value="web_development">웹 개발</option>
                          <option value="mobile_app">모바일 앱</option>
                          <option value="branding">브랜딩</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                          우선순위
                        </label>
                        <select
                          id="priority"
                          value={projectFormData.priority}
                          onChange={(e) => setProjectFormData(prev => ({ ...prev, priority: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="low">낮음</option>
                          <option value="medium">보통</option>
                          <option value="high">높음</option>
                          <option value="urgent">긴급</option>
                        </select>
                      </div>
                    </div>

                    {/* 시작 날짜 */}
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                        시작 날짜 <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="startDate"
                        type="date"
                        value={projectFormData.startDate}
                        onChange={(e) => setProjectFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.startDate ? 'border-red-500' : 'border-gray-300'
                        }`}
                        required
                      />
                      {errors.startDate && (
                        <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                      )}
                    </div>

                    {/* 일정 설정 토글 */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-medium text-gray-700">
                          일정 설정
                        </label>
                        <button
                          type="button"
                          onClick={handleScheduleToggle}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          {isCustomSchedule ? '자동 일정으로 변경' : '수동으로 설정'}
                        </button>
                      </div>

                      {isCustomSchedule && (
                        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                기획 기간 (일)
                              </label>
                              <input
                                type="number"
                                value={schedule.planning.duration}
                                onChange={(e) => handleScheduleChange('planning', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                min="1"
                                max="365"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                촬영 기간 (일)
                              </label>
                              <input
                                type="number"
                                value={schedule.filming.duration}
                                onChange={(e) => handleScheduleChange('filming', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                min="1"
                                max="365"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                편집 기간 (일)
                              </label>
                              <input
                                type="number"
                                value={schedule.editing.duration}
                                onChange={(e) => handleScheduleChange('editing', parseInt(e.target.value) || 0)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                min="1"
                                max="365"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 제출 버튼 */}
                    <div className="flex justify-end pt-6">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isSubmitting}
                        className="min-w-32"
                      >
                        {isSubmitting ? '생성 중...' : '프로젝트 생성'}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>

              {/* 일정 프리뷰 */}
              <div className="lg:col-span-1">
                <ProjectSchedulePreview schedule={schedule} />
              </div>
            </div>
          )}

          {activeTab === 'invite' && (
            <div className="space-y-8">
              {/* 팀원 초대 폼 */}
              <TeamInviteForm onInvite={handleTeamInvite} />

              {/* 팀원/초대 목록 */}
              {projectId && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">팀원 관리</h2>
                  {teamLoading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">로딩 중...</p>
                    </div>
                  ) : (
                    <TeamMemberTable
                      invites={teamData?.invites || []}
                      members={teamData?.members || []}
                      onResendInvite={handleResendInvite}
                      onRevokeInvite={handleRevokeInvite}
                      onRemoveMember={handleRemoveMember}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}