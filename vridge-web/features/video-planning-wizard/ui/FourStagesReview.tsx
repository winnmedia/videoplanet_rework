/**
 * @fileoverview STEP 2: 4단계 검토/수정 컴포넌트
 * @description AI 생성된 4단계 기획을 검토하고 수정할 수 있는 인터페이스
 */

'use client'

import { useState, useCallback } from 'react'
import { Button, Card, Input } from '@/shared/ui/index.modern'
import { cn } from '@/shared/lib/utils'
import type { FourStagesReviewProps, PlanningStage } from '../model/types'

interface EditingState {
  stageId: string | null
  field: keyof PlanningStage | null
  originalValue: string
}

export const FourStagesReview = ({
  stages,
  onStageUpdate,
  onReset,
  onNext,
  onBack,
  isLoading = false
}: FourStagesReviewProps) => {
  const [editingState, setEditingState] = useState<EditingState>({
    stageId: null,
    field: null,
    originalValue: ''
  })
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // 편집 시작
  const startEditing = useCallback((stageId: string, field: keyof PlanningStage, currentValue: string) => {
    setEditingState({
      stageId,
      field,
      originalValue: currentValue
    })
  }, [])

  // 편집 저장
  const saveEdit = useCallback((stageId: string, field: keyof PlanningStage, newValue: string) => {
    onStageUpdate(stageId, { [field]: newValue })
    setEditingState({ stageId: null, field: null, originalValue: '' })
  }, [onStageUpdate])

  // 편집 취소
  const cancelEdit = useCallback(() => {
    setEditingState({ stageId: null, field: null, originalValue: '' })
  }, [])

  // 초기화 확인
  const handleResetConfirm = useCallback(() => {
    onReset()
    setShowResetConfirm(false)
  }, [onReset])

  // 키보드 핸들러
  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
    stageId: string,
    field: keyof PlanningStage
  ) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveEdit(stageId, field, e.currentTarget.value)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }, [saveEdit, cancelEdit])

  // 편집 가능한 필드 렌더링
  const renderEditableField = (
    stage: PlanningStage,
    field: keyof PlanningStage,
    label: string,
    className?: string,
    isTextArea = false
  ) => {
    const isEditing = editingState.stageId === stage.id && editingState.field === field
    const value = stage[field] as string

    if (isEditing) {
      const Component = isTextArea ? 'textarea' : 'input'
      return (
        <div className={cn('space-y-2', className)}>
          <label className="block text-xs font-medium text-gray-600">{label}</label>
          <Component
            autoFocus
            defaultValue={value}
            onKeyDown={(e) => handleKeyDown(e, stage.id, field)}
            className={cn(
              'w-full px-3 py-2 text-sm border border-blue-300 rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-blue-500',
              isTextArea && 'resize-none h-20'
            )}
            placeholder={`${label}을 입력하세요`}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                const input = e.currentTarget.closest('div')?.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement
                if (input) {
                  saveEdit(stage.id, field, input.value)
                }
              }}
            >
              저장
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={cancelEdit}
            >
              취소
            </Button>
          </div>
        </div>
      )
    }

    return (
      <div className={cn('group relative', className)}>
        <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
        <div 
          className={cn(
            'cursor-pointer hover:bg-gray-50 rounded-md p-2 -m-2',
            'transition-colors duration-200',
            isTextArea ? 'min-h-[3rem]' : 'min-h-[2rem]'
          )}
          onClick={() => startEditing(stage.id, field, value)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              startEditing(stage.id, field, value)
            }
          }}
        >
          <div className={cn(
            'text-sm text-gray-900',
            isTextArea ? 'leading-relaxed' : 'truncate'
          )}>
            {value || `${label}을 입력하세요`}
          </div>
          <button
            className={cn(
              'absolute top-1 right-1 opacity-0 group-hover:opacity-100',
              'w-6 h-6 bg-white border border-gray-300 rounded text-xs',
              'hover:bg-gray-50 transition-all duration-200',
              'flex items-center justify-center'
            )}
            onClick={(e) => {
              e.stopPropagation()
              startEditing(stage.id, field, value)
            }}
            aria-label="편집"
          >
            ✎
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          STEP 2: 4단계 검토/수정
        </h2>
        <p className="text-gray-600">
          AI가 생성한 4단계 구성을 검토하고 필요한 부분을 수정하세요
        </p>
      </div>

      {/* 4단계 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stages.map((stage, index) => (
          <Card 
            key={stage.id} 
            className={cn(
              'p-6 space-y-4 border-2',
              'hover:shadow-lg transition-shadow duration-300',
              index === 0 && 'border-red-200 bg-red-50/30',
              index === 1 && 'border-yellow-200 bg-yellow-50/30',
              index === 2 && 'border-blue-200 bg-blue-50/30',
              index === 3 && 'border-green-200 bg-green-50/30'
            )}
          >
            {/* 단계 헤더 */}
            <div className="text-center">
              <div className={cn(
                'inline-flex items-center justify-center w-12 h-12 rounded-full text-xl font-bold mb-2',
                index === 0 && 'bg-red-500 text-white',
                index === 1 && 'bg-yellow-500 text-white',
                index === 2 && 'bg-blue-500 text-white',
                index === 3 && 'bg-green-500 text-white'
              )}>
                {stage.title}
              </div>
              <div className="text-sm text-gray-600">
                {['도입', '전개', '위기', '결말'][index]}
              </div>
            </div>

            {/* 편집 가능한 필드들 */}
            <div className="space-y-4">
              {renderEditableField(stage, 'content', '본문', undefined, true)}
              {renderEditableField(stage, 'goal', '목표')}
              {renderEditableField(stage, 'duration', '길이 힌트')}
            </div>

            {/* 단계별 통계 */}
            <div className="pt-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 space-y-1">
                <div>순서: {stage.order}단계</div>
                <div>예상 길이: {stage.duration}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 전체 요약 정보 */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">전체 구성 요약</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          {stages.map((stage, index) => (
            <div key={stage.id} className="text-center">
              <div className="font-medium text-gray-900">
                {stage.title} ({stage.duration})
              </div>
              <div className="text-gray-600 mt-1">
                {stage.goal}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200 text-center">
          <div className="text-sm text-gray-600">
            총 예상 길이: {stages.reduce((total, stage) => {
              const duration = stage.duration.match(/\d+/)?.[0] || '0'
              return total + parseInt(duration)
            }, 0)}초
          </div>
        </div>
      </Card>

      {/* 액션 버튼들 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
          >
            이전
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowResetConfirm(true)}
            disabled={isLoading}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            초기화
          </Button>
        </div>

        <Button
          onClick={onNext}
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>숏 생성 중...</span>
            </div>
          ) : (
            '숏 생성'
          )}
        </Button>
      </div>

      {/* 도움말 */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="text-sm text-blue-800">
          <div className="font-medium mb-2">편집 팁:</div>
          <ul className="space-y-1 text-blue-700">
            <li>• 각 필드를 클릭하면 직접 수정할 수 있습니다</li>
            <li>• Ctrl+Enter로 빠른 저장, ESC로 취소할 수 있습니다</li>
            <li>• 초기화 버튼으로 AI가 생성한 원본 내용으로 되돌릴 수 있습니다</li>
          </ul>
        </div>
      </Card>

      {/* 초기화 확인 모달 */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              정말로 초기화하시겠습니까?
            </h3>
            <p className="text-gray-600 mb-6">
              모든 수정사항이 사라지고 AI가 생성한 원본 내용으로 돌아갑니다.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(false)}
              >
                취소
              </Button>
              <Button
                onClick={handleResetConfirm}
                className="bg-red-500 hover:bg-red-600"
              >
                확인
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 로딩 메시지 */}
      {isLoading && (
        <div className="text-center text-gray-600">
          <div className="text-sm">12개 숏으로 자동 분해하고 있습니다...</div>
          <div className="text-xs text-gray-500 mt-1">
            각 단계별 최적의 샷 구성을 생성하고 있습니다.
          </div>
        </div>
      )}
    </div>
  )
}