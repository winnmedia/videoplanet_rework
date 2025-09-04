/**
 * @fileoverview STEP 2: 4단계 검토/수정 컴포넌트
 * @description VRidge 레거시 UI 스타일을 보존하면서 간단하고 유지보수하기 쉬운 4단계 기획 검토/수정 인터페이스
 * 
 * 설계 원칙:
 * - 100% VRidge 브랜드 아이덴티티 보존 (#0031ff 프라이머리, 미니멀 디자인)
 * - 8px 그리드 시스템 사용
 * - 간단한 아키텍처로 누구나 쉽게 수정 가능
 * - TODO(human) 섹션으로 핵심 비즈니스 로직은 인간이 담당
 */

'use client'

import { useState, useCallback } from 'react'

import { cn } from '@/shared/lib/utils'
import { Button, Card } from '@/shared/ui/index.modern'

import type { FourStagesReviewProps, PlanningStage } from '../model/types'

// ============================
// 타입 정의 (Simple & Clear)
// ============================
interface EditingState {
  stageId: string | null
  field: keyof PlanningStage | null
  originalValue: string
}

// ============================
// 메인 컴포넌트
// ============================
export const FourStagesReview = ({
  stages,
  onStageUpdate,
  onReset,
  onNext,
  onBack,
  isLoading = false
}: FourStagesReviewProps) => {
  // ============================
  // 상태 관리 (Simple State)
  // ============================
  const [editingState, setEditingState] = useState<EditingState>({
    stageId: null,
    field: null,
    originalValue: ''
  })
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [characterCount, setCharacterCount] = useState<{ [key: string]: number }>({})

  // ============================
  // 편집 핸들러 (Simple Logic)
  // ============================
  const startEditing = useCallback((stageId: string, field: keyof PlanningStage, currentValue: string) => {
    setEditingState({ stageId, field, originalValue: currentValue })
    setCharacterCount({ [`${stageId}-${field}`]: currentValue.length })
  }, [])

  const saveEdit = useCallback((stageId: string, field: keyof PlanningStage, newValue: string) => {
    onStageUpdate(stageId, { [field]: newValue })
    setEditingState({ stageId: null, field: null, originalValue: '' })
    setCharacterCount({})
  }, [onStageUpdate])

  const cancelEdit = useCallback(() => {
    setEditingState({ stageId: null, field: null, originalValue: '' })
    setCharacterCount({})
  }, [])

  // TODO(human): 고급 키보드 단축키 로직 구현
  // - Ctrl+S로 저장
  // - Ctrl+Z로 실행 취소
  // - Tab으로 다음 필드 이동
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>, stageId: string, field: keyof PlanningStage) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      saveEdit(stageId, field, e.currentTarget.value)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
    // TODO(human): 추가 키보드 단축키 구현
  }, [saveEdit, cancelEdit])

  // 실시간 글자 수 업데이트
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>, stageId: string, field: keyof PlanningStage) => {
    const count = e.target.value.length
    setCharacterCount({ [`${stageId}-${field}`]: count })
  }, [])

  // 초기화 확인 핸들러
  const handleResetConfirm = useCallback(() => {
    onReset()
    setShowResetConfirm(false)
  }, [onReset])

  // ============================
  // 편집 가능한 필드 렌더링 (Simple & Maintainable)
  // ============================
  const renderEditableField = (
    stage: PlanningStage,
    field: keyof PlanningStage,
    label: string,
    isTextArea = false
  ) => {
    const isEditing = editingState.stageId === stage.id && editingState.field === field
    const value = stage[field] as string
    const countKey = `${stage.id}-${field}`
    const currentCount = characterCount[countKey] || value.length

    // TODO(human): 글자 수 제한 및 경고 로직 구현
    // - 각 필드별 최적 글자 수 가이드라인 설정
    // - 초과 시 경고 표시
    // - 실시간 가이드 메시지
    const isOverLimit = currentCount > 100 // 임시 제한값

    if (isEditing) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-neutral-600">{label}</label>
            <span className={cn(
              'text-xs',
              isOverLimit ? 'text-error-500' : 'text-neutral-500'
            )}>
              {currentCount}자
              {/* TODO(human): 글자 수 가이드라인 표시 */}
            </span>
          </div>
          {isTextArea ? (
            <textarea
              autoFocus
              defaultValue={value}
              onChange={(e) => handleInputChange(e, stage.id, field)}
              onKeyDown={(e) => handleKeyDown(e, stage.id, field)}
              className={cn(
                'w-full px-3 py-2 text-sm border rounded-lg resize-none h-20',
                'focus:outline-none focus:ring-2 transition-colors',
                'border-neutral-300 focus:border-vridge-500 focus:ring-vridge-500/20'
              )}
              placeholder={`${label}을 입력하세요`}
            />
          ) : (
            <input
              type="text"
              autoFocus
              defaultValue={value}
              onChange={(e) => handleInputChange(e, stage.id, field)}
              onKeyDown={(e) => handleKeyDown(e, stage.id, field)}
              className={cn(
                'w-full px-3 py-2 text-sm border rounded-lg',
                'focus:outline-none focus:ring-2 transition-colors',
                'border-neutral-300 focus:border-vridge-500 focus:ring-vridge-500/20'
              )}
              placeholder={`${label}을 입력하세요`}
            />
          )}
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

    // 읽기 전용 모드 (VRidge 레거시 스타일)
    return (
      <div className="group relative">
        <label className="block text-xs font-medium text-neutral-600 mb-1">{label}</label>
        <div 
          className={cn(
            'cursor-pointer rounded-lg p-2 -m-2 transition-colors duration-200',
            'hover:bg-neutral-100',
            isTextArea ? 'min-h-12' : 'min-h-8'
          )}
          onClick={() => startEditing(stage.id, field, value)}
          role="button"
          tabIndex={0}
          aria-label={`${label} 편집하기`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              startEditing(stage.id, field, value)
            }
          }}
        >
          <div className={cn(
            'text-sm text-neutral-900',
            isTextArea ? 'leading-relaxed' : 'truncate'
          )}>
            {value || (
              <span className="text-neutral-400">{`${label}을 입력하세요`}</span>
            )}
          </div>
          {/* VRidge 스타일 편집 버튼 */}
          <button
            className={cn(
              'absolute top-1 right-1 opacity-0 group-hover:opacity-100',
              'w-6 h-6 bg-white border border-neutral-300 rounded text-xs',
              'hover:bg-neutral-50 transition-all duration-200',
              'flex items-center justify-center shadow-sm'
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
      {/* ============================
          헤더 (VRidge 미니멀 스타일)
          ============================ */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">
          STEP 2: 4단계 검토/수정
        </h2>
        <p className="text-neutral-600">
          AI가 생성한 4단계 구성을 검토하고 필요한 부분을 수정하세요
        </p>
      </div>

      {/* ============================
          4단계 카드 그리드 (레거시 UI 재현)
          ============================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stages.map((stage, index) => {
          // VRidge 레거시 색상 시스템
          const stageColors = [
            { border: 'border-error-200', bg: 'bg-error-50/30', badge: 'bg-error-500' }, // 기 (빨강)
            { border: 'border-warning-200', bg: 'bg-warning-50/30', badge: 'bg-warning-500' }, // 승 (노랑)
            { border: 'border-vridge-200', bg: 'bg-vridge-50/30', badge: 'bg-vridge-500' }, // 전 (파랑)
            { border: 'border-success-200', bg: 'bg-success-50/30', badge: 'bg-success-500' } // 결 (초록)
          ]
          const colors = stageColors[index]

          return (
            <Card 
              key={stage.id} 
              data-testid={`stage-card-${index}`}
              className={cn(
                'p-6 space-y-4 border-2 transition-shadow duration-300',
                'hover:shadow-lg',
                colors.border,
                colors.bg
              )}
            >
              {/* 단계 헤더 (VRidge 브랜드 스타일) */}
              <div className="text-center">
                <div className={cn(
                  'inline-flex items-center justify-center w-12 h-12 rounded-full text-xl font-bold mb-2 text-white',
                  colors.badge
                )}>
                  {stage.title}
                </div>
                <div className="text-sm text-neutral-600">
                  {['도입', '전개', '위기', '결말'][index]}
                </div>
              </div>

              {/* 편집 가능한 필드들 (8px 그리드) */}
              <div className="space-y-4">
                {renderEditableField(stage, 'content', '본문', true)}
                {renderEditableField(stage, 'goal', '목표')}
                {renderEditableField(stage, 'duration', '길이 힌트')}
              </div>

              {/* 단계별 통계 (레거시 스타일) */}
              <div className="pt-4 border-t border-neutral-200">
                <div className="text-xs text-neutral-500 space-y-1">
                  <div>순서: {stage.order}단계</div>
                  <div>예상 길이: {stage.duration}</div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* ============================
          전체 요약 정보
          ============================ */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">전체 구성 요약</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          {stages.map((stage) => (
            <div key={stage.id} className="text-center">
              <div className="font-medium text-neutral-900">
                {stage.title} ({stage.duration})
              </div>
              <div className="text-neutral-600 mt-1">
                {stage.goal}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-200 text-center">
          <div className="text-sm text-neutral-600">
            {/* TODO(human): 더 정확한 시간 계산 로직 구현 */}
            총 예상 길이: {stages.reduce((total, stage) => {
              const duration = stage.duration.match(/\d+/)?.[0] || '0'
              return total + parseInt(duration)
            }, 0)}초
          </div>
        </div>
      </Card>

      {/* ============================
          액션 버튼들 (VRidge 브랜드)
          ============================ */}
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
            className="text-error-600 border-error-300 hover:bg-error-50"
          >
            초기화
          </Button>
        </div>

        <Button
          onClick={onNext}
          disabled={isLoading}
          size="lg"
          aria-busy={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" 
                role="status"
                aria-hidden="true"
              />
              <span>숏 생성 중...</span>
            </div>
          ) : (
            '숏 생성'
          )}
        </Button>
      </div>

      {/* ============================
          도움말 (레거시 스타일)
          ============================ */}
      <Card className="p-4 bg-info-50 border-info-200">
        <div className="text-sm text-info-800">
          <div className="font-medium mb-2">편집 팁:</div>
          <ul className="space-y-1 text-info-700">
            <li>• 각 필드를 클릭하면 직접 수정할 수 있습니다</li>
            <li>• Ctrl+Enter로 빠른 저장, ESC로 취소할 수 있습니다</li>
            <li>• 초기화 버튼으로 AI가 생성한 원본 내용으로 되돌릴 수 있습니다</li>
            {/* TODO(human): 더 많은 도움말 및 가이드 추가 */}
          </ul>
        </div>
      </Card>

      {/* ============================
          초기화 확인 모달 (VRidge 스타일)
          ============================ */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-neutral-900 mb-2">
              정말로 초기화하시겠습니까?
            </h3>
            <p className="text-neutral-600 mb-6">
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
                variant="danger"
                onClick={handleResetConfirm}
              >
                확인
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ============================
          로딩 상태 (미니멀 스타일)
          ============================ */}
      {isLoading && (
        <div className="text-center text-neutral-600">
          <div className="text-sm">12개 숏으로 자동 분해하고 있습니다...</div>
          <div className="text-xs text-neutral-500 mt-1">
            각 단계별 최적의 샷 구성을 생성하고 있습니다.
          </div>
        </div>
      )}
    </div>
  )
}