/**
 * @fileoverview 메인 영상 기획 위저드 컴포넌트
 * @description 3단계 위저드 통합 컴포넌트 - Redux 연동 및 TDD 구현
 */

'use client'

import React, { useCallback } from 'react'

import { useAppDispatch, useAppSelector } from '@/app/store/store'
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
  generateFourStagesWithAI,
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


export const VideoPlanningWizard = ({
  className,
  onComplete,
  onError
}: VideoPlanningWizardProps = {}) => {
  const dispatch = useAppDispatch()
  const wizardState = useAppSelector(selectWizardState)
  const currentStep = useAppSelector(selectCurrentStep)
  const progressPercentage = useAppSelector(selectProgressPercentage)

  // STEP 1: 기본 정보 제출 핸들러 (일반 생성)
  const handleInputSubmit = useCallback(async (input: PlanningInput) => {
    try {
      const result = await dispatch(generateFourStages(input)).unwrap()
      // 자동으로 STEP 2로 이동 (slice에서 처리됨)
    } catch (error) {
      onError?.(error as string)
    }
  }, [dispatch, onError])

  // STEP 1: AI 기반 제출 핸들러 (신규)
  const handleInputSubmitWithAI = useCallback(async (input: PlanningInput) => {
    try {
      const result = await dispatch(generateFourStagesWithAI(input)).unwrap()
      // 자동으로 STEP 2로 이동 (slice에서 처리됨)
    } catch (error) {
      onError?.(error as string)
    }
  }, [dispatch, onError])

  // 프리셋 선택 핸들러
  const handlePresetSelect = useCallback((preset: PresetConfig) => {
    // 프리셋 선택은 현재 입력 폼에서 직접 처리
    // Redux에 저장하지 않고 컴포넌트에서 바로 적용
  }, [])

  // STEP 2: 4단계 수정 핸들러
  const handleStageUpdate = useCallback((stageId: string, updates: Partial<PlanningStage>) => {
    dispatch(updateStage({ stageId, updates }))
  }, [dispatch])

  // STEP 2: 초기화 핸들러
  const handleStagesReset = useCallback(async () => {
    if (!wizardState.input.title || !wizardState.input.logline) return

    try {
      await dispatch(generateFourStages(wizardState.input as PlanningInput)).unwrap()
    } catch (error) {
      onError?.(error as string)
    }
  }, [dispatch, wizardState.input, onError])

  // STEP 2 → STEP 3: 숏 생성 핸들러
  const handleGenerateShots = useCallback(async () => {
    try {
      await dispatch(generateTwelveShots({
        stages: wizardState.stages,
        originalInput: wizardState.input as PlanningInput
      })).unwrap()
      // 자동으로 STEP 3으로 이동 (slice에서 처리됨)
    } catch (error) {
      onError?.(error as string)
    }
  }, [dispatch, wizardState.stages, wizardState.input, onError])

  // STEP 3: 숏 수정 핸들러
  const handleShotUpdate = useCallback((shotId: string, updates: Partial<VideoShot>) => {
    dispatch(updateShot({ shotId, updates }))
  }, [dispatch])

  // STEP 3: 인서트 수정 핸들러
  const handleInsertUpdate = useCallback((insertId: string, updates: Partial<InsertShot>) => {
    dispatch(updateInsertShot({ insertId, updates }))
  }, [dispatch])

  // STEP 3: 스토리보드 생성 핸들러
  const handleGenerateStoryboard = useCallback(async (shotId: string) => {
    const shot = wizardState.shots.find(s => s.id === shotId)
    if (!shot) return

    try {
      await dispatch(generateStoryboard({ shotId, shot })).unwrap()
    } catch (error) {
      onError?.(error as string)
    }
  }, [dispatch, wizardState.shots, onError])

  // STEP 3: 내보내기 핸들러
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
      const result = await dispatch(exportPlan({
        fourStagesPlan,
        twelveShotsPlan,
        options
      })).unwrap()
      
      // 자동 다운로드 트리거 (실제 구현에서는 브라우저가 처리)
      const link = document.createElement('a')
      link.href = result.downloadUrl
      link.download = `영상기획서-${wizardState.input.title || 'untitled'}.${options.format === 'pdf' ? 'pdf' : 'json'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 완료 콜백 호출
      onComplete?.({
        stages: fourStagesPlan,
        shots: twelveShotsPlan
      })
    } catch (error) {
      onError?.(error as string)
    }
  }, [dispatch, wizardState, onComplete, onError])

  // 이전 단계로 이동
  const handleBackStep = useCallback(() => {
    if (currentStep > 1) {
      dispatch(setStep((currentStep - 1) as (1 | 2 | 3)))
    }
  }, [dispatch, currentStep])

  // 진행률은 selector에서 계산됨

  return (
    <div className={cn('max-w-7xl mx-auto p-6', className)} data-testid="planning-wizard">
      {/* 위저드 헤더 */}
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
            onSubmitWithAI={handleInputSubmitWithAI}
            onPresetSelect={handlePresetSelect}
            isLoading={wizardState.isLoading}
            error={wizardState.error || undefined}
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
            <h4 className="font-semibold text-gray-900 mb-2">📄 다양한 출력</h4>
            <p>JSON 데이터와 Marp PDF로 다양한 용도에 활용 가능</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
