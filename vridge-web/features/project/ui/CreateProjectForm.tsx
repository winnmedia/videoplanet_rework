'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/ui'
import { Input } from '@/shared/ui/Input/Input.modern'
import { Select } from '@/shared/ui/Select/Select.modern'
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner/LoadingSpinner.modern'

interface CreateProjectFormData {
  title: string
  description: string
  type: string
  priority: string
  startDate: string
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
 * 프로젝트 생성 폼 컴포넌트
 * 접근성과 사용성을 고려한 프로젝트 생성 인터페이스
 */
export function CreateProjectForm() {
  const router = useRouter()
  const [formData, setFormData] = useState<CreateProjectFormData>({
    title: '',
    description: '',
    type: '',
    priority: 'medium',
    startDate: new Date().toISOString().split('T')[0] // 오늘 날짜
  })
  const [errors, setErrors] = useState<Partial<CreateProjectFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    setIsSubmitting(true)

    try {
      // TODO: 실제 API 호출 구현
      console.log('Creating project:', formData)
      
      // 임시 성공 응답 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 프로젝트 생성 성공 시 목록 페이지로 이동
      router.push('/projects')
      
    } catch (error) {
      console.error('프로젝트 생성 실패:', error)
      // TODO: 에러 토스트 표시
      alert('프로젝트 생성에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (name: keyof CreateProjectFormData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // 에러 상태 초기화
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }

  const handleCancel = () => {
    router.push('/projects')
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
          onChange={(value) => handleInputChange('type', value)}
          options={PROJECT_TYPES}
          placeholder="프로젝트 유형을 선택하세요"
          error={errors.type}
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
            onChange={(value) => handleInputChange('priority', value)}
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