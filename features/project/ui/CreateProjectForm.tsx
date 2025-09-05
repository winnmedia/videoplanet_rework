'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import { useAppDispatch, useAppSelector } from '@/app/store/store'
import { 
  createProject,
  selectIsCreating,
  selectCreateError,
  selectAutoSchedulePreview,
  setAutoSchedulePreview,
  clearCreateError
} from '@/entities/project'
import { AutoScheduleResult } from '@/shared/lib/project-scheduler'
import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui/Input/Input.modern'
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner/LoadingSpinner.modern'
import { Select } from '@/shared/ui/Select/Select.modern'

import { AutoSchedulePreviewCard } from './AutoSchedulePreviewCard'
import { ProjectCreationSuccess } from './ProjectCreationSuccess'

interface CreateProjectFormData {
  title: string
  description: string
  type: string
  priority: string
  startDate: string
  autoSchedule?: AutoScheduleResult
}

const PROJECT_TYPES = [
  { value: 'video_production', label: '영상 제작' },
  { value: 'web_development', label: '웹 개발' },
  { value: 'mobile_app', label: '모바일 앱' },
  { value: 'branding', label: '브랜딩' }
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: '낮음' },
  { value: 'medium', label: '보통' },
  { value: 'high', label: '높음' },
  { value: 'urgent', label: '긴급' }
]

/**
 * 프로젝트 생성 폼 컴포넌트 (Redux 통합)
 * DEVPLAN.md 요구사항: 자동 스케줄링, 팀 초대, RBAC 권한 시스템 통합
 */
export function CreateProjectForm() {
  const router = useRouter()
  const dispatch = useAppDispatch()
  
  // Redux state
  const isSubmitting = useAppSelector(selectIsCreating)
  const createError = useAppSelector(selectCreateError)
  const autoSchedulePreview = useAppSelector(selectAutoSchedulePreview)
  
  // Local state
  const [formData, setFormData] = useState<CreateProjectFormData>({
    title: '',
    description: '',
    type: '',
    priority: 'medium',
    startDate: new Date().toISOString().split('T')[0] // 오늘 날짜
  })
  const [errors, setErrors] = useState<Partial<CreateProjectFormData>>({})
  const [createdProject, setCreatedProject] = useState<{
    id: string
    title: string
    autoSchedule?: AutoScheduleResult
  } | null>(null)

  // 컴포넌트 언마운트 시 에러 클리어
  useEffect(() => {
    return () => {
      dispatch(clearCreateError())
    }
  }, [dispatch])

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateProjectFormData> = {}

    if (!formData.title.trim()) {
      newErrors.title = '프로젝트 제목을 입력해주세요'
    } else if (formData.title.length > 100) {
      newErrors.title = '프로젝트 제목은 100자 이하로 입력해주세요'
    }

    if (!formData.description.trim()) {
      newErrors.description = '프로젝트 설명을 입력해주세요'
    } else if (formData.description.length > 500) {
      newErrors.description = '프로젝트 설명은 500자 이하로 입력해주세요'
    }

    if (!formData.type) {
      newErrors.type = '프로젝트 유형을 선택해주세요'
    }

    if (!formData.startDate) {
      newErrors.startDate = '시작 날짜를 선택해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      // 첫 번째 에러 필드로 포커스 이동
      const firstErrorField = Object.keys(errors)[0]
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement
      errorElement?.focus()
      return
    }

    try {
      // DEVPLAN.md 요구사항: 자동 일정이 API 요청에 포함되어야 함
      const projectData = {
        title: formData.title,
        description: formData.description,
        tags: [formData.type], // 프로젝트 유형을 태그로 저장
        settings: {
          isPublic: false,
          allowComments: true,
          allowDownload: false,
          requireApproval: true,
          watermarkEnabled: true
        },
        // 자동 스케줄링 데이터 포함
        autoSchedule: autoSchedulePreview ? {
          planning: { duration: autoSchedulePreview.planning.duration },
          shooting: { duration: autoSchedulePreview.filming.duration },
          editing: { duration: autoSchedulePreview.editing.duration }
        } : undefined
      }
      
      console.log('Creating project with auto schedule:', projectData)
      
      // Redux async thunk 호출
      const result = await dispatch(createProject(projectData))
      
      if (createProject.fulfilled.match(result)) {
        // 프로젝트 생성 성공 시 성공 페이지 표시
        setCreatedProject({
          id: result.payload.project.id,
          title: result.payload.project.title,
          autoSchedule: autoSchedulePreview || undefined
        })
      } else if (createProject.rejected.match(result)) {
        // 에러는 Redux state에서 관리
        console.error('프로젝트 생성 실패:', result.payload)
      }
      
    } catch (error) {
      console.error('프로젝트 생성 중 예외 발생:', error)
    }
  }

  const handleInputChange = (name: keyof CreateProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // 에러 상태 초기화
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleScheduleChange = (schedule: AutoScheduleResult) => {
    dispatch(setAutoSchedulePreview(schedule))
  }

  const handleCancel = () => {
    router.push('/projects')
  }

  // 성공 페이지 렌더링
  if (createdProject) {
    return (
      <ProjectCreationSuccess
        projectId={createdProject.id}
        projectTitle={createdProject.title}
        autoSchedule={createdProject.autoSchedule ? {
          totalDays: createdProject.autoSchedule.totalDays,
          planning: { 
            duration: createdProject.autoSchedule.planning.duration, 
            unit: createdProject.autoSchedule.planning.unit 
          },
          filming: { 
            duration: createdProject.autoSchedule.filming.duration, 
            unit: createdProject.autoSchedule.filming.unit 
          },
          editing: { 
            duration: createdProject.autoSchedule.editing.duration, 
            unit: createdProject.autoSchedule.editing.unit 
          }
        } : undefined}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="create-project-form">
      {/* 프로젝트 제목 */}
      <div>
        <label htmlFor="project-title" className="block text-sm font-medium text-gray-700 mb-2">
          프로젝트 제목 *
        </label>
        <Input
          id="project-title"
          name="title"
          type="text"
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="예: 회사 홍보 영상 제작"
          error={errors.title}
          required
          maxLength={100}
          data-testid="project-title-input"
        />
      </div>

      {/* 프로젝트 설명 */}
      <div>
        <label htmlFor="project-description" className="block text-sm font-medium text-gray-700 mb-2">
          프로젝트 설명 *
        </label>
        <textarea
          id="project-description"
          name="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="프로젝트에 대한 상세 설명을 입력해주세요"
          className={`
            w-full px-3 py-2 border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
            disabled:bg-gray-50 disabled:text-gray-500
            ${errors.description ? 'border-red-500' : ''}
          `}
          rows={4}
          maxLength={500}
          required
          data-testid="project-description-input"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.description}
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          {formData.description.length}/500자
        </p>
      </div>

      {/* 프로젝트 유형 */}
      <div>
        <label htmlFor="project-type" className="block text-sm font-medium text-gray-700 mb-2">
          프로젝트 유형 *
        </label>
        <Select
          id="project-type"
          name="type"
          value={formData.type}
          onChange={(value) => handleInputChange('type', value as string)}
          options={PROJECT_TYPES}
          placeholder="프로젝트 유형을 선택하세요"
          error={errors.type ? true : false}
          required
          data-testid="project-type-select"
        />
      </div>

      {/* 우선순위와 시작 날짜 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 우선순위 */}
        <div>
          <label htmlFor="project-priority" className="block text-sm font-medium text-gray-700 mb-2">
            우선순위
          </label>
          <Select
            id="project-priority"
            name="priority"
            value={formData.priority}
            onChange={(value) => handleInputChange('priority', value as string)}
            options={PRIORITY_OPTIONS}
            data-testid="project-priority-select"
          />
        </div>

        {/* 시작 날짜 */}
        <div>
          <label htmlFor="project-start-date" className="block text-sm font-medium text-gray-700 mb-2">
            시작 날짜 *
          </label>
          <Input
            id="project-start-date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            error={errors.startDate}
            required
            data-testid="project-start-date-input"
          />
        </div>
      </div>

      {/* Redux 에러 표시 */}
      {createError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800" role="alert">
            {createError}
          </p>
        </div>
      )}

      {/* 자동 일정 프리뷰 카드 - DEVPLAN.md 요구사항 */}
      <AutoSchedulePreviewCard
        startDate={formData.startDate}
        onScheduleChange={handleScheduleChange}
        projectTitle={formData.title || '새 프로젝트'}
        className="bg-gray-50"
      />

      {/* 액션 버튼 */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
          data-testid="cancel-button"
        >
          취소
        </Button>
        
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="min-w-32"
          data-testid="submit-button"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              생성 중...
            </>
          ) : (
            '프로젝트 생성'
          )}
        </Button>
      </div>
    </form>
  )
}