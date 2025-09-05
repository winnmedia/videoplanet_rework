/**
 * @fileoverview 협업 기능이 통합된 비디오 기획 위저드 컴포넌트
 * @description 기존 VideoPlanningWizard에 실시간 협업 기능을 추가한 버전
 */

'use client'

import React, { useCallback, useEffect } from 'react'

import { useAppDispatch, useAppSelector } from '@/app/store/store'
import { withVideoPlanningCollaboration } from '@/shared/lib/collaboration/hocs/withCollaboration'
import type { CollaborationInjectedProps } from '@/shared/lib/collaboration/hocs/withCollaboration'
import { cn } from '@/shared/lib/utils'
import { Card } from '@/shared/ui/index.modern'

import { FourStagesReview } from './FourStagesReview'
import { PlanningInputForm } from './PlanningInputForm'
import { TwelveShotsEditor } from './TwelveShotsEditor'
import type {
  VideoPlanningWizardProps,
  PlanningInput,
  PresetConfig,
  PlanningStage,
  VideoShot,
  InsertShot,
  ExportOptions
} from '../model/types'
import {
  generateFourStages,
  generateTwelveShots,
  generateStoryboard,
  exportPlan,
  setStep,
  updateStage,
  updateShot,
  updateInsertShot,
  reset,
  selectWizardState,
  selectCurrentStep,
  selectProgressPercentage,
} from '../model/videoPlanningSlice'

// ===========================
// 협업 인디케이터 컴포넌트
// ===========================

const CollaborationIndicator: React.FC<{
  activeUsers: CollaborationInjectedProps['collaborationState']['activeUsers']
  hasConflicts: boolean
  pendingChangesCount: number
}> = ({ activeUsers, hasConflicts, pendingChangesCount }) => {
  const onlineUsers = activeUsers.filter(user => user.isOnline)
  
  if (onlineUsers.length <= 1) return null
  
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
      {/* 활성 사용자 표시 */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-sm text-blue-800 font-medium">
          {onlineUsers.length}명이 함께 작업 중
        </span>
        <div className="flex -space-x-1 ml-2">
          {onlineUsers.slice(0, 3).map((user) => (
            <div
              key={user.id}
              className="w-6 h-6 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center ring-2 ring-white"
              title={user.name}
            >
              {user.name.charAt(0)}
            </div>
          ))}
          {onlineUsers.length > 3 && (
            <div className="w-6 h-6 bg-gray-400 text-white text-xs rounded-full flex items-center justify-center ring-2 ring-white">
              +{onlineUsers.length - 3}
            </div>
          )}
        </div>
      </div>

      {/* 상태 표시 */}
      <div className="flex items-center gap-2">
        {pendingChangesCount > 0 && (
          <span className="text-xs text-orange-600">
            동기화 대기: {pendingChangesCount}
          </span>
        )}
        {hasConflicts && (
          <span className="text-xs text-red-600 font-medium">
            ⚠️ 충돌 발생
          </span>
        )}
      </div>
    </div>
  )
}

// ===========================
// 메인 컴포넌트
// ===========================

interface VideoPlanningWizardWithCollaborationProps extends VideoPlanningWizardProps, CollaborationInjectedProps {}

const VideoPlanningWizardWithCollaborationBase: React.FC<VideoPlanningWizardWithCollaborationProps> = ({
  className,
  onComplete,
  onError,
  collaborationState,
  collaborationActions,
  onOptimisticUpdate,
  isCollaborating,
  hasConflicts
}) => {
  const dispatch = useAppDispatch()
  const wizardState = useAppSelector(selectWizardState)
  const currentStep = useAppSelector(selectCurrentStep)
  const progressPercentage = useAppSelector(selectProgressPercentage)

  // 대기 중인 변경사항 수 계산
  const pendingChangesCount = Object.keys(collaborationState.pendingChanges || {}).length

  // ===========================
  // 협업 통합 핸들러들
  // ===========================

  // STEP 1: 기본 정보 제출 핸들러 (협업 연동)
  const handleInputSubmit = useCallback(async (input: PlanningInput) => {
    try {
      // 1. 낙관적 업데이트로 즉시 UI 반영
      onOptimisticUpdate({
        changeId: `input-update-${Date.now()}`,
        resourceId: 'wizard-input',
        resourceType: 'video-planning',
        action: 'update',
        data: { input }
      })

      // 2. 실제 Redux 액션 실행
      const result = await dispatch(generateFourStages(input)).unwrap()
      
      // 3. 생성된 단계들도 협업 시스템에 알림
      onOptimisticUpdate({
        changeId: `stages-generated-${Date.now()}`,
        resourceId: 'wizard-stages',
        resourceType: 'video-planning',
        action: 'create',
        data: { stages: result.stages }
      })

      // 자동으로 STEP 2로 이동 (slice에서 처리됨)
    } catch (error) {
      onError?.(error as string)
    }
  }, [dispatch, onError, onOptimisticUpdate])

  // STEP 2: 4단계 수정 핸들러 (협업 연동)
  const handleStageUpdate = useCallback((stageId: string, updates: Partial<PlanningStage>) => {
    // 1. 낙관적 업데이트
    onOptimisticUpdate({
      changeId: `stage-update-${stageId}-${Date.now()}`,
      resourceId: stageId,
      resourceType: 'video-planning',
      action: 'update',
      data: updates
    })

    // 2. Redux 상태 업데이트
    dispatch(updateStage({ stageId, updates }))
  }, [dispatch, onOptimisticUpdate])

  // STEP 2 → STEP 3: 숏 생성 핸들러 (협업 연동)
  const handleGenerateShots = useCallback(async () => {
    try {
      // 1. 낙관적 업데이트
      onOptimisticUpdate({
        changeId: `shots-generation-${Date.now()}`,
        resourceId: 'wizard-shots',
        resourceType: 'video-planning',
        action: 'create',
        data: { status: 'generating' }
      })

      // 2. 실제 생성 실행
      await dispatch(generateTwelveShots({
        stages: wizardState.stages,
        originalInput: wizardState.input as PlanningInput
      })).unwrap()

      // 자동으로 STEP 3으로 이동 (slice에서 처리됨)
    } catch (error) {
      onError?.(error as string)
    }
  }, [dispatch, wizardState.stages, wizardState.input, onError, onOptimisticUpdate])

  // STEP 3: 숏 수정 핸들러 (협업 연동)
  const handleShotUpdate = useCallback((shotId: string, updates: Partial<VideoShot>) => {
    // 1. 낙관적 업데이트
    onOptimisticUpdate({
      changeId: `shot-update-${shotId}-${Date.now()}`,
      resourceId: shotId,
      resourceType: 'video-planning',
      action: 'update',
      data: updates
    })

    // 2. Redux 상태 업데이트
    dispatch(updateShot({ shotId, updates }))
  }, [dispatch, onOptimisticUpdate])

  // STEP 3: 인서트 수정 핸들러 (협업 연동)
  const handleInsertUpdate = useCallback((insertId: string, updates: Partial<InsertShot>) => {
    // 1. 낙관적 업데이트
    onOptimisticUpdate({
      changeId: `insert-update-${insertId}-${Date.now()}`,
      resourceId: insertId,
      resourceType: 'video-planning',
      action: 'update',
      data: updates
    })

    // 2. Redux 상태 업데이트
    dispatch(updateInsertShot({ insertId, updates }))
  }, [dispatch, onOptimisticUpdate])

  // STEP 3: 스토리보드 생성 핸들러 (협업 연동)
  const handleGenerateStoryboard = useCallback(async (shotId: string) => {
    const shot = wizardState.shots.find(s => s.id === shotId)
    if (!shot) return

    try {
      // 1. 낙관적 업데이트
      onOptimisticUpdate({
        changeId: `storyboard-${shotId}-${Date.now()}`,
        resourceId: shotId,
        resourceType: 'video-planning',
        action: 'update',
        data: { storyboardGenerating: true }
      })

      // 2. 실제 생성 실행
      await dispatch(generateStoryboard({ shotId, shot })).unwrap()
    } catch (error) {
      onError?.(error as string)
    }
  }, [dispatch, wizardState.shots, onError, onOptimisticUpdate])

  // 나머지 핸들러들 (기존과 동일)
  const handlePresetSelect = useCallback((preset: PresetConfig) => {
    // 프리셋 선택은 현재 입력 폼에서 직접 처리
  }, [])

  const handleStagesReset = useCallback(async () => {
    if (!wizardState.input.title || !wizardState.input.logline) return

    try {
      await dispatch(generateFourStages(wizardState.input as PlanningInput)).unwrap()
    } catch (error) {
      onError?.(error as string)
    }
  }, [dispatch, wizardState.input, onError])

  const handleExport = useCallback(async (options: ExportOptions) => {
    const fourStagesPlan = {
      id: `plan-${Date.now()}`,
      projectTitle: wizardState.input.title || '제목 없음',
      stages: wizardState.stages,
      totalDuration: `${wizardState.stages.reduce((total, stage) => {
        const duration = stage.duration.match(/\d+/)?.[0] || '0'
        return total + parseInt(duration)
      }, 0)}초`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const twelveShotsPlan = {
      id: `shots-${Date.now()}`,
      projectTitle: wizardState.input.title || '제목 없음',
      shots: wizardState.shots,
      insertShots: wizardState.insertShots,
      totalDuration: wizardState.shots.reduce((total, shot) => total + shot.duration, 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      // 1. 협업 알림
      onOptimisticUpdate({
        changeId: `export-${Date.now()}`,
        resourceId: 'wizard-export',
        resourceType: 'video-planning',
        action: 'create',
        data: { format: options.format, status: 'exporting' }
      })

      // 2. 실제 내보내기 실행
      const result = await dispatch(exportPlan({
        fourStagesPlan,
        twelveShotsPlan,
        options
      })).unwrap()
      
      // 자동 다운로드 트리거
      const link = document.createElement('a')
      link.href = result.downloadUrl
      link.download = `영상기획서-${wizardState.input.title || 'untitled'}.${options.format === 'pdf' ? 'pdf' : 'json'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      onComplete?.({
        stages: fourStagesPlan,
        shots: twelveShotsPlan
      })
    } catch (error) {
      onError?.(error as string)
    }
  }, [dispatch, wizardState, onComplete, onError, onOptimisticUpdate])

  const handleBackStep = useCallback(() => {
    if (currentStep > 1) {
      dispatch(setStep((currentStep - 1) as any))
    }
  }, [dispatch, currentStep])

  // ===========================
  // 협업 상태 모니터링
  // ===========================

  useEffect(() => {
    if (hasConflicts) {
      // 충돌 발생 시 자동으로 충돌 해결 모달 표시
      collaborationActions.showConflicts()
    }
  }, [hasConflicts, collaborationActions])

  return (
    <div className={cn('max-w-7xl mx-auto p-6', className)}>
      {/* 협업 인디케이터 */}
      {isCollaborating && (
        <div className="mb-4">
          <CollaborationIndicator
            activeUsers={collaborationState.activeUsers}
            hasConflicts={hasConflicts}
            pendingChangesCount={pendingChangesCount}
          />
        </div>
      )}

      {/* 기존 위저드 UI와 동일 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              영상 기획 위저드
            </h1>
            <p className="text-gray-600 mt-2">
              한 줄 스토리부터 완성된 기획서까지 자동으로 생성하세요
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              진행률: {currentStep}/3
            </div>
            <div className="w-32 h-2 bg-gray-200 rounded-full mt-1">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
                role="progressbar"
                aria-valuenow={progressPercentage}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center gap-4">
          {([1, 2, 3] as const).map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  currentStep === step
                    ? 'bg-blue-500 text-white'
                    : currentStep > step
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                )}
              >
                {currentStep > step ? '✓' : step}
              </div>
              <div className="ml-3">
                <div className={cn(
                  'text-sm font-medium',
                  currentStep === step ? 'text-blue-500' : 'text-gray-600'
                )}>
                  STEP {step}
                </div>
                <div className="text-xs text-gray-500">
                  {step === 1 && '입력/선택'}
                  {step === 2 && '4단계 검토/수정'}
                  {step === 3 && '12숏 편집·콘티·인서트·내보내기'}
                </div>
              </div>
              {step < 3 && (
                <div className="mx-4 w-8 h-px bg-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 단계별 컨텐츠 */}
      <div className="min-h-[600px]">
        {currentStep === 1 && (
          <PlanningInputForm
            onSubmit={handleInputSubmit}
            onPresetSelect={handlePresetSelect}
            isLoading={wizardState.isLoading}
            error={wizardState.error}
          />
        )}

        {currentStep === 2 && (
          <FourStagesReview
            stages={wizardState.stages}
            onStageUpdate={handleStageUpdate}
            onReset={handleStagesReset}
            onNext={handleGenerateShots}
            onBack={handleBackStep}
            isLoading={wizardState.isLoading}
          />
        )}

        {currentStep === 3 && (
          <TwelveShotsEditor
            shots={wizardState.shots}
            insertShots={wizardState.insertShots}
            onShotUpdate={handleShotUpdate}
            onInsertUpdate={handleInsertUpdate}
            onGenerateStoryboard={handleGenerateStoryboard}
            onExport={handleExport}
            onBack={handleBackStep}
            isLoading={wizardState.isLoading}
          />
        )}
      </div>

      {/* 하단 도움말/정보 */}
      <Card className="mt-12 p-6 bg-gray-50 border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">🤖 AI 지원</h4>
            <p>Google Gemini API를 활용한 전문적인 영상 기획 자동화</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">⚡ 빠른 제작</h4>
            <p>기존 수작업 대비 90% 시간 절약, 일관성 있는 품질 보장</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">👥 실시간 협업</h4>
            <p>팀원들과 실시간으로 함께 기획하고 피드백 교환</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

// HOC 적용하여 협업 기능이 주입된 컴포넌트 생성
export const VideoPlanningWizardWithCollaboration = withVideoPlanningCollaboration(
  VideoPlanningWizardWithCollaborationBase
)