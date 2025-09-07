'use client'

import { clsx } from 'clsx'
import { useState, useCallback, useMemo } from 'react'

import type {
  ProjectCalendarEvent,
  EnhancedCalendarConflict,
  ConflictResolutionOption,
  AutoResolutionResult,
  ConflictResolutionService
} from '@/entities/calendar'
import { ConflictResolutionService as ResolutionService } from '@/entities/calendar'

interface EnhancedConflictAlertProps {
  conflicts: EnhancedCalendarConflict[]
  allEvents: ProjectCalendarEvent[]
  onResolveConflict?: (conflictId: string, resolution: ConflictResolutionOption) => Promise<void>
  onAutoResolve?: (resolutions: AutoResolutionResult[]) => Promise<void>
  onDismiss?: () => void
  className?: string
}

interface ConflictResolutionPanelProps {
  conflict: EnhancedCalendarConflict
  resolutionOptions: ConflictResolutionOption[]
  onSelectResolution: (option: ConflictResolutionOption) => void
  selectedOption: ConflictResolutionOption | null
  isLoading?: boolean
}

function ConflictResolutionPanel({
  conflict,
  resolutionOptions,
  onSelectResolution,
  selectedOption,
  isLoading = false
}: ConflictResolutionPanelProps) {
  const getSeverityColor = (severity: 'warning' | 'error') => {
    return severity === 'error' 
      ? 'text-red-600 bg-red-50 border-red-200' 
      : 'text-amber-600 bg-amber-50 border-amber-200'
  }

  const getImpactIcon = (impact: 'low' | 'medium' | 'high') => {
    switch (impact) {
      case 'low': return '🟢'
      case 'medium': return '🟡'
      case 'high': return '🔴'
      default: return '⚪'
    }
  }

  const getStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case 'postpone': return '일정 연기'
      case 'advance': return '일정 앞당기기' 
      case 'ignore': return '충돌 무시'
      case 'custom': return '수동 조정'
      default: return strategy
    }
  }

  return (
    <div className={clsx(
      'border rounded-lg p-4 space-y-4',
      getSeverityColor(conflict.severity)
    )}>
      {/* Conflict Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-sm">
            {conflict.type === 'filming-overlap' ? '촬영 일정 충돌' : '일정 충돌'}
          </h4>
          <p className="text-sm mt-1 opacity-90">
            {conflict.message}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-white bg-opacity-60">
          {conflict.severity === 'error' ? '긴급' : '경고'}
        </span>
      </div>

      {/* Conflicting Events */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium opacity-75">충돌 일정:</h5>
        <div className="space-y-1">
          {conflict.events.map((event) => (
            <div key={event.id} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-sm border"
                style={{ 
                  backgroundColor: event.project.color,
                  borderColor: event.project.color 
                }}
              />
              <span className="font-medium">{event.project.name}</span>
              <span className="opacity-60">-</span>
              <span>{event.phase.name}</span>
              <span className="opacity-60">
                ({new Date(event.startDate).toLocaleDateString('ko-KR')} ~ 
                {new Date(event.endDate).toLocaleDateString('ko-KR')})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Resolution Options */}
      <div className="space-y-2">
        <h5 className="text-xs font-medium opacity-75">해결 방안:</h5>
        <div className="grid gap-2">
          {resolutionOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => onSelectResolution(option)}
              disabled={isLoading}
              className={clsx(
                'p-3 rounded-lg border text-left transition-all duration-200',
                'hover:shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
                selectedOption === option 
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500 ring-opacity-20' 
                  : 'border-gray-200 bg-white hover:border-gray-300',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
              aria-selected={selectedOption === option}
              role="option"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {getStrategyLabel(option.strategy)}
                </span>
                <div className="flex items-center gap-1">
                  <span title={`영향도: ${option.impact}`}>
                    {getImpactIcon(option.impact)}
                  </span>
                  <span className="text-xs text-gray-500">
                    비용: {option.estimatedCost}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-600 mb-2">
                {option.description}
              </p>

              {option.suggestedDate && (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    새 일정: {new Date(option.suggestedDate).toLocaleDateString('ko-KR')}
                    {option.suggestedEndDate && 
                      ` ~ ${new Date(option.suggestedEndDate).toLocaleDateString('ko-KR')}`
                    }
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function EnhancedConflictAlert({
  conflicts,
  allEvents,
  onResolveConflict,
  onAutoResolve,
  onDismiss,
  className
}: EnhancedConflictAlertProps) {
  const [expandedConflicts, setExpandedConflicts] = useState<Set<string>>(new Set())
  const [selectedResolutions, setSelectedResolutions] = useState<Map<string, ConflictResolutionOption>>(new Map())
  const [isResolving, setIsResolving] = useState<Set<string>>(new Set())
  const [isAutoResolving, setIsAutoResolving] = useState(false)

  // Generate resolution options for each conflict
  const resolutionOptions = useMemo(() => {
    const options = new Map<string, ConflictResolutionOption[]>()
    conflicts.forEach(conflict => {
      options.set(conflict.id, ResolutionService.generateResolutionOptions(conflict, allEvents))
    })
    return options
  }, [conflicts, allEvents])

  const toggleConflictExpansion = useCallback((conflictId: string) => {
    setExpandedConflicts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(conflictId)) {
        newSet.delete(conflictId)
      } else {
        newSet.add(conflictId)
      }
      return newSet
    })
  }, [])

  const selectResolution = useCallback((conflictId: string, option: ConflictResolutionOption) => {
    setSelectedResolutions(prev => {
      const newMap = new Map(prev)
      newMap.set(conflictId, option)
      return newMap
    })
  }, [])

  const handleResolveConflict = useCallback(async (conflictId: string) => {
    const selectedOption = selectedResolutions.get(conflictId)
    if (!selectedOption || !onResolveConflict) return

    setIsResolving(prev => new Set([...prev, conflictId]))

    try {
      await onResolveConflict(conflictId, selectedOption)
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      // Could show error toast here
    } finally {
      setIsResolving(prev => {
        const newSet = new Set(prev)
        newSet.delete(conflictId)
        return newSet
      })
    }
  }, [selectedResolutions, onResolveConflict])

  const handleAutoResolve = useCallback(async () => {
    if (!onAutoResolve || isAutoResolving) return

    setIsAutoResolving(true)

    try {
      const autoResolutions = await ResolutionService.autoResolveConflicts(
        conflicts,
        allEvents,
        { strategy: 'minimize-disruption', respectPriorities: true }
      )

      await onAutoResolve(autoResolutions)
    } catch (error) {
      console.error('Auto-resolution failed:', error)
      // Could show error toast here
    } finally {
      setIsAutoResolving(false)
    }
  }, [conflicts, allEvents, onAutoResolve, isAutoResolving])

  if (conflicts.length === 0) {
    return null
  }

  const criticalConflicts = conflicts.filter(c => c.severity === 'error')
  const warningConflicts = conflicts.filter(c => c.severity === 'warning')
  const hasSelectedResolutions = selectedResolutions.size > 0

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Summary Header */}
      <div className={clsx(
        'rounded-lg border-2 p-4 transition-all duration-200',
        criticalConflicts.length > 0 
          ? 'bg-red-50 border-red-200' 
          : 'bg-amber-50 border-amber-200'
      )}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <svg className={clsx(
              'w-6 h-6 flex-shrink-0 mt-0.5',
              criticalConflicts.length > 0 ? 'text-red-500' : 'text-amber-500'
            )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.692-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className={clsx(
                'text-sm font-semibold',
                criticalConflicts.length > 0 ? 'text-red-800' : 'text-amber-800'
              )}>
                일정 충돌 감지 ({conflicts.length}개)
              </h3>
              <p className={clsx(
                'text-sm mt-1',
                criticalConflicts.length > 0 ? 'text-red-700' : 'text-amber-700'
              )}>
                {criticalConflicts.length > 0 && (
                  <>긴급 해결 필요: {criticalConflicts.length}개 | </>
                )}
                경고: {warningConflicts.length}개
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Auto Resolve Button */}
            {onAutoResolve && (
              <button
                onClick={handleAutoResolve}
                disabled={isAutoResolving}
                className={clsx(
                  'px-3 py-1.5 text-sm rounded-md font-medium transition-all duration-200',
                  'bg-blue-600 text-white hover:bg-blue-700',
                  'focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  isAutoResolving && 'animate-pulse'
                )}
                title="AI 자동 해결 제안"
              >
                {isAutoResolving ? (
                  <>
                    <svg className="w-4 h-4 inline-block mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    자동 해결 중...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    자동 해결
                  </>
                )}
              </button>
            )}

            {/* Dismiss Button */}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors duration-200"
                aria-label="알림 닫기"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Individual Conflicts */}
      <div className="space-y-3">
        {conflicts.map((conflict) => {
          const options = resolutionOptions.get(conflict.id) || []
          const isExpanded = expandedConflicts.has(conflict.id)
          const selectedOption = selectedResolutions.get(conflict.id)
          const isResolvineCurrent = isResolving.has(conflict.id)

          return (
            <div key={conflict.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Conflict Summary */}
              <button
                onClick={() => toggleConflictExpansion(conflict.id)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {conflict.severity === 'error' ? '🚨' : '⚠️'}
                    </span>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {conflict.events.map(e => e.project.name).join(' vs ')}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {conflict.events.length}개 일정 충돌 • {conflict.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedOption && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                        해결책 선택됨
                      </span>
                    )}
                    <svg className={clsx(
                      'w-4 h-4 text-gray-400 transition-transform duration-200',
                      isExpanded && 'rotate-180'
                    )} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </button>

              {/* Expanded Resolution Panel */}
              {isExpanded && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <ConflictResolutionPanel
                    conflict={conflict}
                    resolutionOptions={options}
                    onSelectResolution={(option) => selectResolution(conflict.id, option)}
                    selectedOption={selectedOption || null}
                    isLoading={isResolvineCurrent}
                  />

                  {/* Action Buttons */}
                  {selectedOption && onResolveConflict && (
                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedResolutions(prev => {
                          const newMap = new Map(prev)
                          newMap.delete(conflict.id)
                          return newMap
                        })}
                        className="px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors duration-200"
                        disabled={isResolvineCurrent}
                      >
                        취소
                      </button>
                      <button
                        onClick={() => handleResolveConflict(conflict.id)}
                        disabled={isResolvineCurrent}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isResolvineCurrent ? (
                          <>
                            <svg className="w-3 h-3 inline-block mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            적용 중...
                          </>
                        ) : (
                          '해결책 적용'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Batch Action Summary */}
      {hasSelectedResolutions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <span className="font-medium">{selectedResolutions.size}개</span>의 충돌에 대한 해결책이 선택되었습니다.
            개별 적용하거나 자동 해결을 사용하세요.
          </p>
        </div>
      )}
    </div>
  )
}