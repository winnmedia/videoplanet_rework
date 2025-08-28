'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Card } from '@/shared/ui'

export default function CreateProjectPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    category: 'video'
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.title.trim()) {
      newErrors.title = '프로젝트 제목을 입력해주세요'
    }
    
    if (!formData.description.trim()) {
      newErrors.description = '프로젝트 설명을 입력해주세요'
    }
    
    if (!formData.deadline) {
      newErrors.deadline = '마감일을 선택해주세요'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsLoading(true)
    
    try {
      // API 호출 시뮬레이션 (나중에 실제 API로 교체)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 성공 시 프로젝트 목록으로 이동
      router.push('/projects')
    } catch (error) {
      setErrors({ submit: '프로젝트 생성 중 오류가 발생했습니다' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex-1 ml-0 md:ml-sidebar pt-16 md:pt-0 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              aria-label="이전 페이지로 돌아가기"
              data-testid="back-button"
            >
              ← 돌아가기
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">새 프로젝트 생성</h1>
          <p className="text-gray-600 mt-2">
            새로운 비디오 프로젝트를 시작하세요. 팀원들과 함께 협업하여 완성도 높은 콘텐츠를 만들어보세요.
          </p>
        </div>

        {/* Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} data-testid="create-project-form">
            <div className="space-y-6">
              {/* Project Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  프로젝트 제목 <span className="text-red-500">*</span>
                </label>
                <Input
                  id="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="예: 브랜드 홍보 영상 제작"
                  className={errors.title ? 'border-red-500' : ''}
                  data-testid="project-title-input"
                  aria-describedby={errors.title ? "title-error" : undefined}
                />
                {errors.title && (
                  <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Project Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  프로젝트 설명 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="프로젝트의 목적, 타겟 오디언스, 주요 메시지 등을 간략히 설명해주세요"
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  data-testid="project-description-input"
                  aria-describedby={errors.description ? "description-error" : undefined}
                />
                {errors.description && (
                  <p id="description-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Deadline */}
              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                  마감일 <span className="text-red-500">*</span>
                </label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                  className={errors.deadline ? 'border-red-500' : ''}
                  data-testid="project-deadline-input"
                  aria-describedby={errors.deadline ? "deadline-error" : undefined}
                />
                {errors.deadline && (
                  <p id="deadline-error" className="mt-1 text-sm text-red-600" role="alert">
                    {errors.deadline}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  카테고리
                </label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="project-category-select"
                >
                  <option value="video">비디오 콘텐츠</option>
                  <option value="animation">애니메이션</option>
                  <option value="commercial">광고</option>
                  <option value="documentary">다큐멘터리</option>
                  <option value="education">교육 콘텐츠</option>
                </select>
              </div>

              {/* Submit Error */}
              {errors.submit && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md" role="alert">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isLoading}
                  data-testid="submit-button"
                  className="flex-1"
                >
                  {isLoading ? '생성 중...' : '프로젝트 생성'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  data-testid="cancel-button"
                >
                  취소
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-medium text-blue-900 mb-2">💡 프로젝트 생성 팁</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 명확하고 구체적인 제목을 사용하면 팀원들이 이해하기 쉬워요</li>
            <li>• 프로젝트 설명에는 최종 목표와 타겟 오디언스를 포함해주세요</li>
            <li>• 마감일을 설정하면 프로젝트 진행률을 자동으로 추적할 수 있어요</li>
          </ul>
        </div>
      </div>
    </main>
  )
}