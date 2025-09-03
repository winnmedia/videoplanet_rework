import React, { useState } from 'react'
import { Button, Typography, Input } from '@/shared/ui'
import { createProject } from '@/shared/api'

// 프로젝트 생성 폼 타입 정의
interface ProjectFormData {
  name: string
  description: string
  category: string
  budget: number
  deadline: string
}

interface ProjectCreateFormProps {
  onSuccess?: (project: any) => void
  onCancel?: () => void
}


export const ProjectCreateForm: React.FC<ProjectCreateFormProps> = ({
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    category: '',
    budget: 0,
    deadline: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string>('')

  // 폼 검증 함수
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '프로젝트 이름을 입력해주세요'
    }
    if (!formData.description.trim()) {
      newErrors.description = '프로젝트 설명을 입력해주세요'
    }
    if (!formData.category) {
      newErrors.category = '카테고리를 선택해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    setApiError('')

    try {
      const projectData = {
        ...formData,
        autoSchedule: {
          planningDays: 7,
          shootingDays: 1,
          editingDays: 14
        }
      }

      const result = await createProject(projectData)
      onSuccess?.(result)
    } catch (error) {
      setApiError('프로젝트 생성에 실패했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  // 입력 필드 변경 핸들러
  const handleChange = (field: keyof ProjectFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // 에러 초기화
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-background rounded-lg">
      {/* 폼 제목 */}
      <Typography variant="h3" className="mb-6">
        새 프로젝트 생성
      </Typography>

      {/* API 에러 표시 */}
      {apiError && (
        <div className="mb-4 p-3 bg-danger-light text-danger-dark rounded-md">
          {apiError}
        </div>
      )}

      {/* 프로젝트 이름 필드 */}
      <div className="mb-4">
        <Input
          label="프로젝트 이름"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
          error={errors.name}
          helperText="프로젝트를 식별할 수 있는 이름을 입력하세요"
        />
      </div>

      {/* 프로젝트 설명 필드 */}
      <div className="mb-4">
        <Input
          label="프로젝트 설명"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          required
          multiline
          rows={4}
          error={errors.description}
        />
      </div>

      {/* 카테고리 선택 필드 */}
      <div className="mb-4">
        <label htmlFor="project-category" className="block text-sm font-medium text-foreground mb-2">
          카테고리 *
        </label>
        <select
          id="project-category"
          value={formData.category}
          onChange={(e) => handleChange('category', e.target.value)}
          aria-required="true"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">카테고리를 선택하세요</option>
          <option value="commercial">상업 영상</option>
          <option value="documentary">다큐멘터리</option>
          <option value="music-video">뮤직비디오</option>
          <option value="corporate">기업 홍보</option>
        </select>
        {errors.category && (
          <div className="text-danger text-sm mt-1">{errors.category}</div>
        )}
      </div>

      {/* 예산 필드 */}
      <div className="mb-4">
        <Input
          label="예산 (원)"
          type="number"
          value={formData.budget || ''}
          onChange={(e) => handleChange('budget', parseInt(e.target.value) || 0)}
          placeholder="0"
          helperText="프로젝트 예산을 입력하세요 (선택사항)"
        />
      </div>

      {/* 마감일 필드 */}
      <div className="mb-6">
        <Input
          label="마감일"
          type="date"
          value={formData.deadline}
          onChange={(e) => handleChange('deadline', e.target.value)}
          helperText="프로젝트 완료 예정일을 선택하세요 (선택사항)"
        />
      </div>

      {/* 자동 스케줄 섹션 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <Typography variant="h4" className="mb-3">
          자동 스케줄 생성
        </Typography>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-primary-light rounded-md">
            <div className="font-semibold">1주 기획</div>
            <div className="text-gray-600">스토리보드, 촬영 계획</div>
          </div>
          <div className="text-center p-3 bg-secondary-light rounded-md">
            <div className="font-semibold">1일 촬영</div>
            <div className="text-gray-600">메인 촬영 진행</div>
          </div>
          <div className="text-center p-3 bg-accent-light rounded-md">
            <div className="font-semibold">2주 편집</div>
            <div className="text-gray-600">편집, 후반 작업</div>
          </div>
        </div>
      </div>

      {/* 버튼 그룹 */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          취소
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? '생성 중...' : '프로젝트 생성'}
        </Button>
      </div>
    </form>
  )
}