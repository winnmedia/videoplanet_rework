/**
 * @fileoverview 메인 영상 기획 위저드 컴포넌트
 * @description 3단계 위저드 통합 컴포넌트 - TDD 구현
 */

'use client'

import { useState, useCallback, useReducer } from 'react'

import { cn } from '@/shared/lib/utils'
import { Card } from '@/shared/ui/index.modern'

import { FourStagesReview } from './FourStagesReview'
import { PlanningInputForm } from './PlanningInputForm'
import { TwelveShotsEditor } from './TwelveShotsEditor'
import { VideoPlanningWizardApi } from '../api/videoPlanningApi'
import type {
  VideoPlanningWizardProps,
  WizardState,
  WizardStep,
  PlanningInput,
  PresetConfig,
  PlanningStage,
  VideoShot,
  InsertShot,
  ExportOptions
} from '../model/types'

// 위저드 상태 관리를 위한 리듀서
type WizardAction =
  | { type: 'SET_STEP'; payload: WizardStep }
  | { type: 'SET_INPUT'; payload: Partial<PlanningInput> }
  | { type: 'SET_STAGES'; payload: PlanningStage[] }
  | { type: 'SET_SHOTS'; payload: VideoShot[] }
  | { type: 'SET_INSERT_SHOTS'; payload: InsertShot[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'UPDATE_STAGE'; payload: { stageId: string; updates: Partial<PlanningStage> } }
  | { type: 'UPDATE_SHOT'; payload: { shotId: string; updates: Partial<VideoShot> } }
  | { type: 'UPDATE_INSERT'; payload: { insertId: string; updates: Partial<InsertShot> } }
  | { type: 'RESET' }

const initialState: WizardState = {
  currentStep: 1,
  input: {},
  stages: [],
  shots: [],
  insertShots: [],
  isLoading: false,
  error: null
}

const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload }
    case 'SET_INPUT':
      return { ...state, input: { ...state.input, ...action.payload } }
    case 'SET_STAGES':
      return { ...state, stages: action.payload }
    case 'SET_SHOTS':
      return { ...state, shots: action.payload }
    case 'SET_INSERT_SHOTS':
      return { ...state, insertShots: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload }
    case 'UPDATE_STAGE':
      return {
        ...state,
        stages: state.stages.map(stage =>
          stage.id === action.payload.stageId 
            ? { ...stage, ...action.payload.updates }
            : stage
        )
      }
    case 'UPDATE_SHOT':
      return {
        ...state,
        shots: state.shots.map(shot =>
          shot.id === action.payload.shotId
            ? { ...shot, ...action.payload.updates }
            : shot
        )
      }
    case 'UPDATE_INSERT':
      return {
        ...state,
        insertShots: state.insertShots.map(insert =>
          insert.id === action.payload.insertId
            ? { ...insert, ...action.payload.updates }
            : insert
        )
      }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export const VideoPlanningWizard = ({
  className,
  onComplete,
  onError
}: VideoPlanningWizardProps = {}) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState)

  // STEP 1: 기본 정보 제출 핸들러
  const handleInputSubmit = useCallback(async (input: PlanningInput) => {
    dispatch({ type: 'SET_INPUT', payload: input })
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const stages = await VideoPlanningWizardApi.generateFourStages(input)
      dispatch({ type: 'SET_STAGES', payload: stages })
      dispatch({ type: 'SET_STEP', payload: 2 })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '4단계 기획 생성에 실패했습니다.'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      onError?.(errorMessage)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [onError])

  // 프리셋 선택 핸들러
  const handlePresetSelect = useCallback((preset: PresetConfig) => {
    dispatch({ type: 'SET_INPUT', payload: preset.data })
  }, [])

  // STEP 2: 4단계 수정 핸들러
  const handleStageUpdate = useCallback((stageId: string, updates: Partial<PlanningStage>) => {
    dispatch({ type: 'UPDATE_STAGE', payload: { stageId, updates } })
  }, [])

  // STEP 2: 초기화 핸들러
  const handleStagesReset = useCallback(async () => {
    if (!state.input.title || !state.input.logline) return

    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const stages = await VideoPlanningWizardApi.generateFourStages(state.input as PlanningInput)
      dispatch({ type: 'SET_STAGES', payload: stages })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '4단계 기획 재생성에 실패했습니다.'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      onError?.(errorMessage)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.input, onError])

  // STEP 2 → STEP 3: 숏 생성 핸들러
  const handleGenerateShots = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    dispatch({ type: 'SET_ERROR', payload: null })

    try {
      const { shots, insertShots } = await VideoPlanningWizardApi.generateTwelveShots(
        state.stages,
        state.input as PlanningInput
      )
      dispatch({ type: 'SET_SHOTS', payload: shots })
      dispatch({ type: 'SET_INSERT_SHOTS', payload: insertShots })
      dispatch({ type: 'SET_STEP', payload: 3 })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '12개 숏 생성에 실패했습니다.'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      onError?.(errorMessage)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [state.stages, state.input, onError])

  // STEP 3: 숏 수정 핸들러
  const handleShotUpdate = useCallback((shotId: string, updates: Partial<VideoShot>) => {
    dispatch({ type: 'UPDATE_SHOT', payload: { shotId, updates } })
  }, [])

  // STEP 3: 인서트 수정 핸들러
  const handleInsertUpdate = useCallback((insertId: string, updates: Partial<InsertShot>) => {
    dispatch({ type: 'UPDATE_INSERT', payload: { insertId, updates } })
  }, [])

  // STEP 3: 스토리보드 생성 핸들러
  const handleGenerateStoryboard = useCallback(async (shotId: string) => {
    const shot = state.shots.find(s => s.id === shotId)
    if (!shot) return

    try {
      const storyboardUrl = await VideoPlanningWizardApi.generateStoryboard(shot)
      dispatch({ type: 'UPDATE_SHOT', payload: { 
        shotId, 
        updates: { storyboardUrl } 
      }})
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '스토리보드 생성에 실패했습니다.'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      onError?.(errorMessage)
    }
  }, [state.shots, onError])

  // STEP 3: 내보내기 핸들러
  const handleExport = useCallback(async (options: ExportOptions) => {
    try {
      const fourStagesPlan = {
        id: `plan-${Date.now()}`,
        projectTitle: state.input.title || '제목 없음',
        stages: state.stages,
        totalDuration: `${state.stages.reduce((total, stage) => {
          const duration = stage.duration.match(/\d+/)?.[0] || '0'
          return total + parseInt(duration)
        }, 0)}초`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const twelveShotsPlan = {
        id: `shots-${Date.now()}`,
        projectTitle: state.input.title || '제목 없음',
        shots: state.shots,
        insertShots: state.insertShots,
        totalDuration: state.shots.reduce((total, shot) => total + shot.duration, 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      const downloadUrl = await VideoPlanningWizardApi.exportPlan(
        fourStagesPlan,
        twelveShotsPlan,
        options
      )

      // 자동 다운로드 트리거 (실제 구현에서는 브라우저가 처리)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `영상기획서-${state.input.title || 'untitled'}.${options.format === 'pdf' ? 'pdf' : 'json'}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // 완료 콜백 호출
      onComplete?.({
        stages: fourStagesPlan,
        shots: twelveShotsPlan
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '내보내기에 실패했습니다.'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      onError?.(errorMessage)
    }
  }, [state.input, state.stages, state.shots, state.insertShots, onComplete, onError])

  // 이전 단계로 이동
  const handleBackStep = useCallback(() => {
    if (state.currentStep > 1) {
      dispatch({ type: 'SET_STEP', payload: (state.currentStep - 1) as WizardStep })
    }
  }, [state.currentStep])

  // 진행률 계산
  const progressPercentage = (state.currentStep / 3) * 100

  return (
    <div className={cn('max-w-7xl mx-auto p-6', className)}>
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
              진행률: {state.currentStep}/3
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
                  state.currentStep === step
                    ? 'bg-blue-500 text-white'
                    : state.currentStep > step
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                )}
              >
                {state.currentStep > step ? '✓' : step}
              </div>
              <div className="ml-3">
                <div className={cn(
                  'text-sm font-medium',
                  state.currentStep === step ? 'text-blue-500' : 'text-gray-600'
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
        {state.currentStep === 1 && (
          <PlanningInputForm
            onSubmit={handleInputSubmit}
            onPresetSelect={handlePresetSelect}
            isLoading={state.isLoading}
            error={state.error}
          />
        )}

        {state.currentStep === 2 && (
          <FourStagesReview
            stages={state.stages}
            onStageUpdate={handleStageUpdate}
            onReset={handleStagesReset}
            onNext={handleGenerateShots}
            onBack={handleBackStep}
            isLoading={state.isLoading}
          />
        )}

        {state.currentStep === 3 && (
          <TwelveShotsEditor
            shots={state.shots}
            insertShots={state.insertShots}
            onShotUpdate={handleShotUpdate}
            onInsertUpdate={handleInsertUpdate}
            onGenerateStoryboard={handleGenerateStoryboard}
            onExport={handleExport}
            onBack={handleBackStep}
            isLoading={state.isLoading}
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