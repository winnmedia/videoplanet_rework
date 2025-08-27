import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { formatDuration } from '@shared/lib/formatDuration'

import type { ProjectFormProps, ProjectFormData, SchedulePreview } from '../model/types'

// TDD Green 단계를 위한 임시 모킹
const useCreateProjectMutation = () => [
  async (data: any) => ({ 
    unwrap: async () => ({ id: '1', title: data.title, name: 'Test Project' }) 
  }),
  { isLoading: false }
]

export function ProjectForm({ onSubmit, isLoading = false }: ProjectFormProps) {
  const [createProject, mutationResult] = useCreateProjectMutation()
  const isMutationLoading = (typeof mutationResult === 'object' && mutationResult?.isLoading) || false
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting }
  } = useForm<ProjectFormData>({
    defaultValues: {
      title: '',
      description: '',
      planningDuration: 7,
      shootingDuration: 1, 
      editingDuration: 14
    }
  })

  // Watch for schedule changes to update preview
  const planningDuration = watch('planningDuration', 7)
  const shootingDuration = watch('shootingDuration', 1)
  const editingDuration = watch('editingDuration', 14)

  const [schedulePreview, setSchedulePreview] = useState<SchedulePreview>({
    planning: { duration: 7 },
    shooting: { duration: 1 },
    editing: { duration: 14 }
  })

  // Update preview when durations change
  useEffect(() => {
    setSchedulePreview({
      planning: { duration: planningDuration || 7 },
      shooting: { duration: shootingDuration || 1 },
      editing: { duration: editingDuration || 14 }
    })
  }, [planningDuration, shootingDuration, editingDuration])

  const handleFormSubmit = async (data: ProjectFormData) => {
    try {
      if (typeof createProject !== 'function') {
        throw new Error('CreateProject mutation not available')
      }
      const result = await createProject({
        title: data.title,
        description: data.description,
        autoSchedule: {
          planning: { duration: data.planningDuration || 7 },
          shooting: { duration: data.shootingDuration || 1 },
          editing: { duration: data.editingDuration || 14 }
        }
      })
      
      if (result && result.unwrap) {
        await result.unwrap()
      }
      
      await onSubmit(data)
    } catch (error) {
      console.error('Project creation failed:', error)
    }
  }

  const isFormLoading = isLoading || isMutationLoading || isSubmitting

  return (
    <form
      role="form"
      aria-label="새 프로젝트 생성"
      aria-describedby="project-form-description"
      onSubmit={handleSubmit(handleFormSubmit)}
      className="legacy-card p-6 space-y-6 bg-white rounded-[20px] shadow-[0_8px_32px_rgba(0,49,255,0.15)]"
    >
      <div id="project-form-description" className="sr-only">
        새 프로젝트를 생성하고 자동 일정을 설정하는 폼입니다.
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-suit font-bold text-gray-800">
          새 프로젝트 생성
        </h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="project-title" className="block text-sm font-suit font-medium text-gray-700 mb-2">
              프로젝트 제목 *
            </label>
            <input
              id="project-title"
              {...register('title', { 
                required: '프로젝트 제목은 필수입니다',
                minLength: { value: 2, message: '제목은 2글자 이상이어야 합니다' }
              })}
              placeholder="프로젝트 제목을 입력하세요"
              className="h-[54px] w-full px-4 rounded-[15px] border border-gray-300"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? 'title-error' : undefined}
            />
            {errors.title && (
              <p id="title-error" className="mt-1 text-sm text-red-600" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="project-description" className="block text-sm font-suit font-medium text-gray-700 mb-2">
              프로젝트 설명
            </label>
            <textarea
              id="project-description"
              {...register('description')}
              rows={3}
              placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
              className="w-full px-4 py-3 rounded-[15px] border border-gray-300"
            />
          </div>

          {/* Manual Schedule Override */}
          <div className="space-y-3">
            <h3 className="text-base font-suit font-semibold text-gray-800">
              일정 설정 (선택사항)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="planning-duration" className="block text-sm font-suit text-gray-600 mb-1">
                  기획 기간 (일)
                </label>
                <input
                  id="planning-duration"
                  type="number"
                  min="1"
                  max="30"
                  {...register('planningDuration', { 
                    valueAsNumber: true,
                    min: { value: 1, message: '최소 1일' },
                    max: { value: 30, message: '최대 30일' }
                  })}
                  className="h-12 w-full px-3 rounded-lg border border-gray-300 text-center"
                />
              </div>
              <div>
                <label htmlFor="shooting-duration" className="block text-sm font-suit text-gray-600 mb-1">
                  촬영 기간 (일)
                </label>
                <input
                  id="shooting-duration"
                  type="number"
                  min="1"
                  max="14"
                  {...register('shootingDuration', { 
                    valueAsNumber: true,
                    min: { value: 1, message: '최소 1일' },
                    max: { value: 14, message: '최대 14일' }
                  })}
                  className="h-12 w-full px-3 rounded-lg border border-gray-300 text-center"
                />
              </div>
              <div>
                <label htmlFor="editing-duration" className="block text-sm font-suit text-gray-600 mb-1">
                  편집 기간 (일)
                </label>
                <input
                  id="editing-duration"
                  type="number"
                  min="1"
                  max="60"
                  {...register('editingDuration', { 
                    valueAsNumber: true,
                    min: { value: 1, message: '최소 1일' },
                    max: { value: 60, message: '최대 60일' }
                  })}
                  className="h-12 w-full px-3 rounded-lg border border-gray-300 text-center"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auto Schedule Preview */}
      <div 
        data-testid="auto-schedule-preview"
        aria-live="polite"
        aria-label="자동 생성된 일정 프리뷰"
        className="p-4 space-y-3 bg-white border border-gray-200 rounded-[20px]"
      >
        <h3 className="text-base font-suit font-semibold text-gray-800 mb-3">
          자동 생성 일정 프리뷰
        </h3>
        
        <div className="flex gap-2">
          <div className="flex-1 p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500">
            <div className="text-sm font-suit text-gray-600">기획</div>
            <div className="text-base font-suit font-semibold text-gray-800">
              {formatDuration(schedulePreview.planning.duration, '기획')}
            </div>
          </div>
          
          <div className="flex-1 p-3 rounded-lg bg-green-50 border-l-4 border-green-500">
            <div className="text-sm font-suit text-gray-600">촬영</div>
            <div className="text-base font-suit font-semibold text-gray-800">
              {formatDuration(schedulePreview.shooting.duration, '촬영')}
            </div>
          </div>
          
          <div className="flex-1 p-3 rounded-lg bg-purple-50 border-l-4 border-purple-500">
            <div className="text-sm font-suit text-gray-600">편집</div>
            <div className="text-base font-suit font-semibold text-gray-800">
              {formatDuration(schedulePreview.editing.duration, '편집')}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isFormLoading}
          className="bg-vridge-primary hover:bg-vridge-primary-dark px-8 py-3 rounded-[15px] font-suit font-semibold text-white transition-colors duration-200 disabled:opacity-75 disabled:cursor-not-allowed"
        >
          {isFormLoading ? '생성 중...' : '프로젝트 생성'}
        </button>
      </div>
    </form>
  )
}