'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Users, Calendar, ArrowRight } from 'lucide-react'

import { Button } from '@/shared/ui'
import { useAppSelector } from '@/app/store/store'
import { selectCurrentProject } from '@/entities/project'

import { TeamInviteForm } from './TeamInviteForm'

interface ProjectCreationSuccessProps {
  projectId: string
  projectTitle: string
  autoSchedule?: {
    totalDays: number
    planning: { duration: number; unit: string }
    filming: { duration: number; unit: string }
    editing: { duration: number; unit: string }
  }
}

/**
 * 프로젝트 생성 성공 컴포넌트
 * DEVPLAN.md 요구사항: 프로젝트 생성 즉시 팀 초대 가능
 */
export function ProjectCreationSuccess({
  projectId,
  projectTitle,
  autoSchedule
}: ProjectCreationSuccessProps) {
  const router = useRouter()
  const currentProject = useAppSelector(selectCurrentProject)
  const [showInviteForm, setShowInviteForm] = useState(false)

  const handleViewProject = () => {
    router.push(`/projects/${projectId}`)
  }

  const handleGoToProjects = () => {
    router.push('/projects')
  }

  const handleViewCalendar = () => {
    router.push('/calendar')
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* 성공 메시지 */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          프로젝트가 성공적으로 생성되었습니다!
        </h1>
        
        <p className="text-gray-600 mb-6">
          "{projectTitle}" 프로젝트가 준비되었습니다.
        </p>
      </div>

      {/* 자동 스케줄링 요약 */}
      {autoSchedule && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center mb-3">
            <Calendar className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-blue-900">자동 생성된 일정</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {autoSchedule.planning.duration}{autoSchedule.planning.unit === 'weeks' ? '주' : '일'}
              </div>
              <div className="text-sm text-blue-700">기획</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {autoSchedule.filming.duration}일
              </div>
              <div className="text-sm text-green-700">촬영</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {autoSchedule.editing.duration}{autoSchedule.editing.unit === 'weeks' ? '주' : '일'}
              </div>
              <div className="text-sm text-purple-700">편집</div>
            </div>
          </div>
          
          <div className="text-center text-sm text-blue-700">
            총 프로젝트 기간: <strong>{autoSchedule.totalDays}일</strong>
          </div>
        </div>
      )}

      {/* 다음 단계 안내 */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">다음 단계</h3>
        
        <div className="space-y-4">
          {/* 팀 초대 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-gray-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">팀원 초대</h4>
                <p className="text-sm text-gray-600">협업할 팀원들을 프로젝트에 초대하세요</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="min-w-20"
            >
              {showInviteForm ? '숨기기' : '초대하기'}
            </Button>
          </div>

          {/* 캘린더 확인 */}
          {autoSchedule && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">일정 확인</h4>
                  <p className="text-sm text-gray-600">캘린더에서 생성된 일정을 확인하고 조정하세요</p>
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewCalendar}
                className="min-w-20"
              >
                캘린더
              </Button>
            </div>
          )}

          {/* 프로젝트 관리 */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <ArrowRight className="w-5 h-5 text-gray-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">프로젝트 설정</h4>
                <p className="text-sm text-gray-600">프로젝트 상세 정보를 확인하고 설정을 조정하세요</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewProject}
              className="min-w-20"
            >
              설정
            </Button>
          </div>
        </div>
      </div>

      {/* 팀 초대 폼 */}
      {showInviteForm && (
        <div className="mb-6">
          <TeamInviteForm
            projectId={projectId}
            projectTitle={projectTitle}
            currentUserRole="owner"
          />
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          variant="primary"
          onClick={handleViewProject}
          className="min-w-40"
        >
          프로젝트 보기
        </Button>
        
        <Button
          variant="outline"
          onClick={handleGoToProjects}
          className="min-w-40"
        >
          프로젝트 목록
        </Button>
      </div>

      {/* 도움말 */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          프로젝트 관리에 도움이 필요하시나요? 
          <a href="/help" className="text-primary hover:underline ml-1">
            도움말 보기
          </a>
        </p>
      </div>
    </div>
  )
}