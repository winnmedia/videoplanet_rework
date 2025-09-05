'use client'

/**
 * 사용자 친화적 에러 복구 워크플로우 UI 컴포넌트
 * WCAG 2.1 AA 준수, 접근성 최적화, 사용자 중심 설계
 * FSD 경계: shared/ui - 재사용 가능한 에러 복구 UI
 */

import React, { useState, useEffect, useRef } from 'react'
import { 
  ErrorRecoveryWorkflow, 
  ErrorRecoveryStep, 
  calculateRecoveryProgress,
  generateAccessibleErrorMessage 
} from '@/shared/lib/error-recovery'

interface ErrorRecoveryWorkflowProps {
  workflow: ErrorRecoveryWorkflow
  onStepComplete?: (stepId: string) => void
  onWorkflowComplete?: () => void
  onDismiss?: () => void
  className?: string
  autoFocus?: boolean
}

export const ErrorRecoveryWorkflowComponent: React.FC<ErrorRecoveryWorkflowProps> = ({
  workflow,
  onStepComplete,
  onWorkflowComplete,
  onDismiss,
  className = '',
  autoFocus = true,
}) => {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set([workflow.steps[0]?.id]))
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [liveRegionMessage, setLiveRegionMessage] = useState('')
  
  const workflowRef = useRef<HTMLDivElement>(null)
  const currentStepRef = useRef<HTMLDivElement>(null)

  // 접근성: 워크플로우 로드 시 포커스 이동
  useEffect(() => {
    if (autoFocus && workflowRef.current) {
      workflowRef.current.focus()
    }
    
    // 스크린 리더에 워크플로우 시작 알림
    setLiveRegionMessage(workflow.announceToScreenReader)
  }, [workflow.announceToScreenReader, autoFocus])

  // 단계 완료 처리
  const handleStepComplete = (stepId: string) => {
    setCompletedSteps(prev => {
      const newCompleted = new Set(prev)
      newCompleted.add(stepId)
      
      // 다음 단계로 자동 이동
      const currentStep = workflow.steps.findIndex(step => step.id === stepId)
      if (currentStep < workflow.steps.length - 1) {
        const nextStepId = workflow.steps[currentStep + 1].id
        setExpandedSteps(prevExpanded => new Set([...prevExpanded, nextStepId]))
        setCurrentStepIndex(currentStep + 1)
        
        // 접근성: 다음 단계 안내
        setLiveRegionMessage(`${workflow.steps[currentStep + 1].title} 단계로 이동했습니다.`)
      } else {
        // 모든 단계 완료
        setLiveRegionMessage('모든 복구 단계가 완료되었습니다.')
        onWorkflowComplete?.()
      }
      
      onStepComplete?.(stepId)
      return newCompleted
    })
  }

  // 단계 확장/축소 토글
  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(stepId)) {
        newExpanded.delete(stepId)
      } else {
        newExpanded.add(stepId)
      }
      return newExpanded
    })
  }

  // 키보드 네비게이션
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        if (currentStepIndex < workflow.steps.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1)
          setLiveRegionMessage(`${workflow.steps[currentStepIndex + 1].title}로 이동`)
        }
        break
      case 'ArrowUp':
        event.preventDefault()
        if (currentStepIndex > 0) {
          setCurrentStepIndex(currentStepIndex - 1)
          setLiveRegionMessage(`${workflow.steps[currentStepIndex - 1].title}로 이동`)
        }
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        const currentStep = workflow.steps[currentStepIndex]
        if (currentStep.action) {
          currentStep.action.onClick()
          handleStepComplete(currentStep.id)
        } else {
          toggleStepExpansion(currentStep.id)
        }
        break
      case 'Escape':
        event.preventDefault()
        onDismiss?.()
        break
    }
  }

  const progress = calculateRecoveryProgress(workflow.steps.map(step => ({
    ...step,
    isCompleted: completedSteps.has(step.id),
  })))

  // 심각도별 색상 스타일링 (WCAG AA 준수)
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-error-500',
          bg: 'bg-error-50 dark:bg-error-950',
          icon: 'text-error-600',
          text: 'text-error-800 dark:text-error-200',
        }
      case 'high':
        return {
          border: 'border-warning-500',
          bg: 'bg-warning-50 dark:bg-warning-950',
          icon: 'text-warning-600',
          text: 'text-warning-800 dark:text-warning-200',
        }
      case 'medium':
        return {
          border: 'border-primary-500',
          bg: 'bg-primary-50 dark:bg-primary-950',
          icon: 'text-primary-600',
          text: 'text-primary-800 dark:text-primary-200',
        }
      default:
        return {
          border: 'border-neutral-300',
          bg: 'bg-neutral-50 dark:bg-neutral-900',
          icon: 'text-neutral-600',
          text: 'text-neutral-800 dark:text-neutral-200',
        }
    }
  }

  const severityStyles = getSeverityStyles(workflow.severity)

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* 스크린 리더용 실시간 알림 */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {liveRegionMessage}
      </div>

      <div
        ref={workflowRef}
        className={`rounded-lg border-2 p-6 ${severityStyles.bg} ${severityStyles.border}`}
        role="region"
        aria-labelledby="error-recovery-title"
        aria-describedby="error-recovery-description"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* 에러 헤더 */}
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 text-2xl ${severityStyles.icon}`} role="img" aria-label={`심각도: ${workflow.severity}`}>
              {workflow.severity === 'critical' ? '🚨' : 
               workflow.severity === 'high' ? '⚠️' : 
               workflow.severity === 'medium' ? 'ℹ️' : '💡'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 
                id="error-recovery-title"
                className={`text-xl font-semibold ${severityStyles.text} mb-2`}
              >
                {workflow.userFriendlyTitle}
              </h1>
              <p 
                id="error-recovery-description"
                className={`text-sm ${severityStyles.text} leading-relaxed`}
              >
                {workflow.contextualMessage}
              </p>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`flex-shrink-0 p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500 ${severityStyles.text}`}
                aria-label="에러 복구 워크플로우 닫기"
              >
                <span className="text-lg">×</span>
              </button>
            )}
          </div>

          {/* 진행률 표시 */}
          {progress > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                <span>복구 진행률</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                <div 
                  className="bg-success-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`복구 진행률 ${progress}%`}
                />
              </div>
            </div>
          )}
        </div>

        {/* 복구 단계 목록 */}
        <div className="space-y-3" role="list" aria-label="복구 단계 목록">
          {workflow.steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id)
            const isExpanded = expandedSteps.has(step.id)
            const isCurrent = index === currentStepIndex

            return (
              <div 
                key={step.id}
                ref={isCurrent ? currentStepRef : undefined}
                className={`
                  rounded-lg border transition-all duration-200
                  ${isCompleted ? 'bg-success-50 border-success-200 dark:bg-success-950 dark:border-success-800' :
                    isCurrent ? 'bg-white border-primary-300 shadow-sm dark:bg-neutral-800 dark:border-primary-600' :
                    'bg-white border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700'}
                `}
                role="listitem"
              >
                <button
                  onClick={() => toggleStepExpansion(step.id)}
                  className={`
                    w-full p-4 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg
                    ${isCurrent ? 'ring-1 ring-primary-300' : ''}
                  `}
                  aria-expanded={isExpanded}
                  aria-controls={`step-content-${step.id}`}
                  aria-describedby={`step-description-${step.id}`}
                >
                  <div className="flex items-center gap-3">
                    {/* 완료 상태 표시 */}
                    <div 
                      className={`
                        flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                        ${isCompleted ? 'bg-success-500 border-success-500 text-white' : 
                          'border-neutral-300 dark:border-neutral-600'}
                      `}
                      role="img"
                      aria-label={isCompleted ? '완료됨' : '미완료'}
                    >
                      {isCompleted ? (
                        <span className="text-sm">✓</span>
                      ) : (
                        <span className="text-sm text-neutral-500">{index + 1}</span>
                      )}
                    </div>

                    {/* 단계 제목 */}
                    <h3 className={`
                      flex-1 font-medium transition-colors
                      ${isCompleted ? 'text-success-700 dark:text-success-300' : 
                        'text-neutral-900 dark:text-neutral-100'}
                    `}>
                      {step.title}
                    </h3>

                    {/* 확장/축소 표시 */}
                    <div 
                      className={`
                        flex-shrink-0 transition-transform duration-200
                        ${isExpanded ? 'rotate-180' : ''}
                      `}
                      aria-hidden="true"
                    >
                      <span className="text-neutral-400">▼</span>
                    </div>
                  </div>
                </button>

                {/* 단계 상세 내용 */}
                {isExpanded && (
                  <div 
                    id={`step-content-${step.id}`}
                    className="px-4 pb-4"
                  >
                    <p 
                      id={`step-description-${step.id}`}
                      className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 ml-9"
                    >
                      {step.description}
                    </p>

                    {/* 액션 버튼 */}
                    {step.action && !isCompleted && (
                      <div className="ml-9">
                        <button
                          onClick={async () => {
                            try {
                              await step.action!.onClick()
                              handleStepComplete(step.id)
                              setLiveRegionMessage(`${step.title} 완료`)
                            } catch (error) {
                              setLiveRegionMessage(`${step.title} 실행 중 오류가 발생했습니다`)
                            }
                          }}
                          className={`
                            px-4 py-2 rounded-md text-sm font-medium transition-colors
                            focus:outline-none focus:ring-2 focus:ring-offset-2
                            ${step.action.isDestructive ?
                              'bg-error-500 text-white hover:bg-error-600 focus:ring-error-500' :
                              'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500'
                            }
                          `}
                          aria-describedby={`step-description-${step.id}`}
                        >
                          {step.action.label}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 예방 팁 */}
        {workflow.preventionTips && workflow.preventionTips.length > 0 && (
          <div className="mt-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
            <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              💡 향후 예방 방법
            </h4>
            <ul className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1">
              {workflow.preventionTips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-neutral-400 mt-0.5">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 키보드 단축키 안내 */}
        {workflow.keyboardShortcuts && workflow.keyboardShortcuts.length > 0 && (
          <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-950 rounded-lg">
            <h4 className="font-medium text-primary-900 dark:text-primary-100 mb-2 text-sm">
              ⌨️ 키보드 단축키
            </h4>
            <div className="flex flex-wrap gap-3 text-xs">
              {workflow.keyboardShortcuts.map((shortcut, index) => (
                <div key={index} className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded text-neutral-800 dark:text-neutral-200">
                    {shortcut.key}
                  </kbd>
                  <span className="text-primary-700 dark:text-primary-300">{shortcut.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 지원팀 연락처 */}
        {workflow.supportContact && (
          <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <span>📞 추가 도움이 필요하시면:</span>
              <a
                href={workflow.supportContact.method === 'email' ? 
                  `mailto:${workflow.supportContact.value}` : 
                  workflow.supportContact.value}
                className="text-primary-600 dark:text-primary-400 hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-1"
                target={workflow.supportContact.method === 'email' ? '_self' : '_blank'}
                rel={workflow.supportContact.method === 'email' ? undefined : 'noopener noreferrer'}
              >
                {workflow.supportContact.label}
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ErrorRecoveryWorkflowComponent