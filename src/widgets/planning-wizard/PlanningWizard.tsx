'use client'

import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store'
import {
  initializePlanning,
  setCurrentStep,
  updateFormField,
  clearError,
  selectPlanningState,
  selectCurrentStep,
  selectFormData,
  selectValidationErrors,
  selectStoryData,
  selectActData,
  selectShotData,
  selectIsLoading,
  selectError,
  selectExportSuccess,
  selectCanGoToActs,
  selectCanGoToShots,
  selectCanExport,
  selectProgress,
  selectIsFormValid,
  PLANNING_STEPS
} from '@/features/video-planning/model/planningSlice'
import {
  useGenerateStoryMutation,
  useGenerate4ActMutation,
  useGenerate12ShotMutation,
  useExportToPDFMutation
} from '@/features/video-planning/api/planningApi'

interface PlanningWizardProps {
  projectId: string
  onCancel?: () => void
}

// Redux 상태에서 step 값을 문자열로 매핑
const stepToString = (step: number): 'story' | 'acts' | 'shots' => {
  switch (step) {
    case PLANNING_STEPS.ACTS:
      return 'acts'
    case PLANNING_STEPS.SHOTS:
      return 'shots'
    default:
      return 'story'
  }
}

export const PlanningWizard: React.FC<PlanningWizardProps> = ({ 
  projectId, 
  onCancel 
}) => {
  // Redux hooks
  const dispatch = useAppDispatch()
  const currentStep = useAppSelector(selectCurrentStep)
  const formData = useAppSelector(selectFormData)
  const validationErrors = useAppSelector(selectValidationErrors)
  const storyData = useAppSelector(selectStoryData)
  const actData = useAppSelector(selectActData)
  const shotData = useAppSelector(selectShotData)
  const isLoading = useAppSelector(selectIsLoading)
  const error = useAppSelector(selectError)
  const exportSuccess = useAppSelector(selectExportSuccess)
  const canGoToActs = useAppSelector(selectCanGoToActs)
  const canGoToShots = useAppSelector(selectCanGoToShots)
  const canExport = useAppSelector(selectCanExport)
  const progress = useAppSelector(selectProgress)
  const isFormValid = useAppSelector(selectIsFormValid)
  
  // RTK Query mutations
  const [generateStory, { isLoading: isGeneratingStory }] = useGenerateStoryMutation()
  const [generate4Act, { isLoading: isGenerating4Act }] = useGenerate4ActMutation()
  const [generate12Shot, { isLoading: isGenerating12Shot }] = useGenerate12ShotMutation()
  const [exportToPDF, { isLoading: isExportingPDF }] = useExportToPDFMutation()
  
  // 전체 로딩 상태 (Redux 상태 + mutations)
  const allLoading = isLoading || isGeneratingStory || isGenerating4Act || isGenerating12Shot || isExportingPDF

  // 컴포넌트 초기화
  useEffect(() => {
    dispatch(initializePlanning({ projectId }))
  }, [dispatch, projectId])

  // 현재 스텝을 문자열로 변환
  const currentStepString = stepToString(currentStep)

  // 1단계: 스토리 생성
  const handleStoryGeneration = useCallback(async () => {
    if (!isFormValid) {
      return
    }

    try {
      const result = await generateStory({
        projectId,
        outline: formData.outline,
        genre: formData.genre as any,
        targetLength: formData.targetLength as any
      }).unwrap()
      
      // Redux slice가 자동으로 상태 업데이트와 단계 전환을 처리
    } catch (err: any) {
      console.error('Story generation failed:', err)
      // RTK Query 에러는 이미 전역 상태에 반영됨
    }
  }, [generateStory, projectId, formData, isFormValid])

  // 2단계: 4막 구조 생성
  const handleActGeneration = useCallback(async () => {
    if (!storyData) return

    try {
      await generate4Act({
        projectId,
        story: storyData.story,
        themes: storyData.themes,
        characters: storyData.characters
      }).unwrap()
      
      // Redux slice가 자동으로 상태 업데이트와 단계 전환을 처리
    } catch (err: any) {
      console.error('4-Act generation failed:', err)
      // RTK Query 에러는 이미 전역 상태에 반영됨
    }
  }, [generate4Act, projectId, storyData])

  // 3단계: 12샷 리스트 생성
  const handleShotGeneration = useCallback(async () => {
    if (!storyData || !actData) return

    try {
      await generate12Shot({
        projectId,
        story: storyData.story,
        acts: actData
      }).unwrap()
      
      // Redux slice가 자동으로 상태 업데이트를 처리
    } catch (err: any) {
      console.error('12-Shot generation failed:', err)
      // RTK Query 에러는 이미 전역 상태에 반영됨
    }
  }, [generate12Shot, projectId, storyData, actData])

  // PDF 내보내기
  const handlePDFExport = useCallback(async () => {
    if (!storyData || !actData || !shotData) return

    try {
      await exportToPDF({
        projectId,
        story: storyData.story,
        acts: actData,
        shots: shotData
      }).unwrap()
      
      // RTK Query onQueryStarted에서 자동 다운로드 처리
      // 성공 상태는 Redux slice에서 관리
    } catch (err: any) {
      console.error('PDF export failed:', err)
      // RTK Query 에러는 이미 전역 상태에 반영됨
    }
  }, [exportToPDF, projectId, storyData, actData, shotData])

  // 단계 이동
  const goToStep = useCallback((step: 'story' | 'acts' | 'shots') => {
    let planningStep
    switch (step) {
      case 'acts':
        planningStep = PLANNING_STEPS.ACTS
        break
      case 'shots':
        planningStep = PLANNING_STEPS.SHOTS
        break
      default:
        planningStep = PLANNING_STEPS.STORY
    }
    dispatch(setCurrentStep(planningStep))
  }, [dispatch])

  // Form field 업데이트 함수들
  const handleFormFieldUpdate = useCallback((field: 'outline' | 'genre' | 'targetLength', value: string) => {
    dispatch(updateFormField({ field, value }))
  }, [dispatch])
  
  // 에러 지우기
  const handleClearError = useCallback(() => {
    dispatch(clearError())
  }, [dispatch])

  // 단계별 렌더링
  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium leading-relaxed">스토리 개요를 입력하세요</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="story-outline" className="block text-sm font-medium text-neutral-700 mb-2">
            스토리 개요
          </label>
          <textarea
            id="story-outline"
            aria-label="스토리 개요"
            value={formData.outline}
            onChange={(e) => handleFormFieldUpdate('outline', e.target.value)}
            className="w-full px-3 py-2 border border-border-light rounded-admin focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            rows={4}
            placeholder="어떤 이야기를 만들고 싶으신가요?"
          />
          {validationErrors.outline && (
            <p className="mt-1 text-sm text-admin-error" role="alert">
              {validationErrors.outline}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="genre" className="block text-sm font-medium text-neutral-700 mb-2">
            장르
          </label>
          <select
            id="genre"
            aria-label="장르"
            value={formData.genre}
            onChange={(e) => handleFormFieldUpdate('genre', e.target.value)}
            className="w-full px-3 py-2 border border-border-light rounded-admin focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">장르를 선택하세요</option>
            <option value="adventure">모험</option>
            <option value="drama">드라마</option>
            <option value="comedy">코미디</option>
            <option value="thriller">스릴러</option>
            <option value="romance">로맨스</option>
            <option value="documentary">다큐멘터리</option>
          </select>
          {validationErrors.genre && (
            <p className="mt-1 text-sm text-admin-error" role="alert">
              {validationErrors.genre}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="target-length" className="block text-sm font-medium text-neutral-700 mb-2">
            타겟 길이
          </label>
          <select
            id="target-length"
            aria-label="타겟 길이"
            value={formData.targetLength}
            onChange={(e) => handleFormFieldUpdate('targetLength', e.target.value)}
            className="w-full px-3 py-2 border border-border-light rounded-admin focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">길이를 선택하세요</option>
            <option value="1-3분">1-3분</option>
            <option value="3-5분">3-5분</option>
            <option value="5-10분">5-10분</option>
            <option value="10-15분">10-15분</option>
            <option value="15분 이상">15분 이상</option>
          </select>
          {validationErrors.targetLength && (
            <p className="mt-1 text-sm text-admin-error" role="alert">
              {validationErrors.targetLength}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium leading-relaxed">2단계: 4막 구조</h3>
      
      {storyData && (
        <div className="bg-background-secondary p-4 rounded-admin-lg">
          <h4 className="font-medium mb-2">생성된 스토리</h4>
          <p className="text-neutral-600">{storyData.story}</p>
        </div>
      )}

      {actData && (
        <div className="space-y-4">
          {Object.entries(actData).map(([key, act]) => (
            <div key={key} className="bg-background-card p-4 rounded-admin border border-border-light">
              <h4 className="font-medium text-primary-600">{act.title}</h4>
              <p className="text-neutral-600 mt-1">{act.description}</p>
              <p className="text-sm text-neutral-500 mt-2">길이: {act.duration}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium leading-relaxed">3단계: 12샷 리스트</h3>
      
      {actData && !shotData && (
        <div className="space-y-4">
          {Object.entries(actData).map(([key, act]) => (
            <div key={key} className="bg-background-secondary p-3 rounded-admin">
              <h5 className="font-medium text-sm">{act.title}</h5>
            </div>
          ))}
        </div>
      )}

      {shotData && (
        <div className="space-y-3">
          {shotData.shots.map((shot) => (
            <div key={shot.shotNumber} className="bg-background-card p-4 rounded-admin border border-border-light">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">샷 {shot.shotNumber}</h4>
                <span className="text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded">
                  {shot.type}
                </span>
              </div>
              <p className="text-neutral-600 mb-2">{shot.description}</p>
              <div className="text-sm text-neutral-500 space-y-1">
                <p>길이: {shot.duration}</p>
                <p>장소: {shot.location}</p>
                {shot.notes && <p>노트: {shot.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {!shotData && (
        <button
          onClick={handleShotGeneration}
          disabled={allLoading}
          className="w-full bg-primary-500 text-white py-2 px-4 rounded-admin hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {allLoading ? '생성 중...' : '12샷 리스트 생성'}
        </button>
      )}
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'story':
        return renderStep1()
      case 'acts':
        return renderStep2()
      case 'shots':
        return renderStep3()
      default:
        return null
    }
  }

  return (
    <div className="max-w-form mx-auto bg-background-card rounded-admin-xl shadow-admin-card p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold leading-tight text-neutral-800">
          AI 기획 마법사
        </h1>
        <p className="text-neutral-600 mt-1">AI가 도와주는 체계적인 비디오 기획</p>
      </div>

      {/* 진행률 바 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm font-medium text-neutral-600 mb-2">
          <span>진행률</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-neutral-200 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`진행률 ${progress}%`}
          />
        </div>
      </div>

      {/* 단계 네비게이션 */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => goToStep('story')}
          className={`flex-1 py-2 px-3 rounded-admin text-sm font-medium transition-colors ${
            currentStepString === 'story'
              ? 'bg-primary-500 text-white'
              : storyData
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
          }`}
          disabled={false}
        >
          1단계: 스토리 생성
        </button>
        <button
          onClick={() => goToStep('acts')}
          className={`flex-1 py-2 px-3 rounded-admin text-sm font-medium transition-colors ${
            currentStepString === 'acts'
              ? 'bg-primary-500 text-white'
              : actData
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              : canGoToActs
              ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
          }`}
          disabled={!canGoToActs}
        >
          2단계: 4막 구조
        </button>
        <button
          onClick={() => goToStep('shots')}
          className={`flex-1 py-2 px-3 rounded-admin text-sm font-medium transition-colors ${
            currentStepString === 'shots'
              ? 'bg-primary-500 text-white'
              : shotData
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              : canGoToShots
              ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
          }`}
          disabled={!canGoToShots}
        >
          3단계: 12샷 리스트
        </button>
      </div>

      {/* 로딩 상태 표시 */}
      {allLoading && (
        <div className="mb-6 bg-primary-50 border border-primary-200 rounded-admin p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-500 border-t-transparent mr-3" />
            <span className="text-primary-700">
              {currentStepString === 'story' && 'AI가 스토리를 생성 중입니다...'}
              {currentStepString === 'acts' && 'AI가 4막 구조를 생성 중입니다...'}
              {currentStepString === 'shots' && 'AI가 12샷 리스트를 생성 중입니다...'}
              {isExportingPDF && 'PDF를 생성 중입니다...'}
            </span>
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="mb-6 bg-admin-error bg-opacity-10 border border-admin-error rounded-admin p-4">
          <div className="flex items-center justify-between">
            <p className="text-admin-error" role="alert">{error}</p>
            <button
              onClick={handleClearError}
              className="text-admin-error hover:text-opacity-80 text-sm underline"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 성공 메시지 */}
      {exportSuccess && (
        <div className="mb-6 bg-admin-success bg-opacity-10 border border-admin-success rounded-admin p-4">
          <p className="text-admin-success">PDF가 성공적으로 생성되었습니다</p>
        </div>
      )}

      {/* 단계별 콘텐츠 */}
      <div className="mb-6">
        {renderCurrentStep()}
      </div>

      {/* 하단 버튼들 */}
      <div className="flex justify-between">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-neutral-600 hover:text-neutral-800 transition-colors"
        >
          취소
        </button>

        <div className="flex space-x-3">
          {/* PDF 내보내기 버튼 (모든 단계 완료 시) */}
          {shotData && (
            <button
              onClick={handlePDFExport}
              disabled={allLoading}
              className="bg-admin-success text-white px-4 py-2 rounded-admin hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-admin-success focus:ring-offset-2"
            >
              {isExportingPDF ? 'PDF 생성 중...' : 'PDF 내보내기'}
            </button>
          )}

          {/* 다음 단계 버튼 */}
          {currentStepString === 'story' && (
            <button
              onClick={handleStoryGeneration}
              disabled={allLoading || !isFormValid}
              className="bg-primary-500 text-white px-6 py-2 rounded-admin hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {isGeneratingStory ? '생성 중...' : '다음 단계'}
            </button>
          )}

          {currentStepString === 'acts' && (
            <button
              onClick={handleActGeneration}
              disabled={allLoading}
              className="bg-primary-500 text-white px-6 py-2 rounded-admin hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {isGenerating4Act ? '생성 중...' : '다음 단계'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}