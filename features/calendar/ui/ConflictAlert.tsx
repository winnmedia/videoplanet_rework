'use client'

import { useState } from 'react'

// import { ExclamationTriangleIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import type { CalendarEvent, ConflictDetail } from '@/entities/project/model/calendar-types'

interface ConflictAlertProps {
  conflictingEvents: CalendarEvent[]
  onResolve?: (eventId: string, resolution: 'reschedule' | 'ignore') => void
  onDismiss?: () => void
}

export function ConflictAlert({ conflictingEvents, onResolve, onDismiss }: ConflictAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null)

  if (conflictingEvents.length === 0) {
    return null
  }

  const criticalConflicts = conflictingEvents.filter(event => 
    event.phase.conflictDetails?.some(detail => detail.severity === 'high')
  )

  const warningConflicts = conflictingEvents.filter(event => 
    event.phase.conflictDetails?.some(detail => detail.severity === 'medium')
  )

  const getConflictIcon = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return '🚨'
      case 'medium':
        return '⚠️'
      default:
        return '⚡'
    }
  }

  const getConflictColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      default:
        return 'text-blue-600'
    }
  }

  const getConflictBgColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200'
      case 'medium':
        return 'bg-yellow-50 border-yellow-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className="space-y-4">
      {/* 전체 충돌 요약 알림 */}
      <div className={`
        rounded-lg border-2 p-4 transition-all duration-200
        ${criticalConflicts.length > 0 
          ? 'bg-red-50 border-red-200' 
          : warningConflicts.length > 0 
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-blue-50 border-blue-200'
        }
      `}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <svg className={`
              w-6 h-6 flex-shrink-0 mt-0.5
              ${criticalConflicts.length > 0 
                ? 'text-red-500' 
                : warningConflicts.length > 0 
                ? 'text-yellow-500'
                : 'text-blue-500'
              }
            `} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.692-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className={`
                text-sm font-semibold
                ${criticalConflicts.length > 0 
                  ? 'text-red-800' 
                  : warningConflicts.length > 0 
                  ? 'text-yellow-800'
                  : 'text-blue-800'
                }
              `}>
                일정 충돌 감지
              </h3>
              <p className={`
                text-sm mt-1
                ${criticalConflicts.length > 0 
                  ? 'text-red-700' 
                  : warningConflicts.length > 0 
                  ? 'text-yellow-700'
                  : 'text-blue-700'
                }
              `}>
                {criticalConflicts.length > 0 && (
                  <>긴급: {criticalConflicts.length}개의 중요한 충돌이 발생했습니다. </>
                )}
                {warningConflicts.length > 0 && (
                  <>주의: {warningConflicts.length}개의 일정 충돌이 있습니다. </>
                )}
                총 {conflictingEvents.length}개의 일정에서 충돌이 감지되었습니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`
                p-1 rounded transition-colors duration-200
                ${criticalConflicts.length > 0 
                  ? 'hover:bg-red-100 text-red-600' 
                  : warningConflicts.length > 0 
                  ? 'hover:bg-yellow-100 text-yellow-600'
                  : 'hover:bg-blue-100 text-blue-600'
                }
              `}
              aria-label={isExpanded ? '충돌 상세 접기' : '충돌 상세 보기'}
            >
              {isExpanded ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`
                  p-1 rounded transition-colors duration-200
                  ${criticalConflicts.length > 0 
                    ? 'hover:bg-red-100 text-red-400' 
                    : warningConflicts.length > 0 
                    ? 'hover:bg-yellow-100 text-yellow-400'
                    : 'hover:bg-blue-100 text-blue-400'
                  }
                `}
                aria-label="알림 닫기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 상세 충돌 목록 */}
      {isExpanded && (
        <div className="space-y-3">
          {conflictingEvents.map((event) => (
            <div key={event.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* 이벤트 헤더 */}
              <div 
                className={`
                  p-3 cursor-pointer transition-colors duration-200
                  ${selectedConflict === event.id ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'}
                `}
                onClick={() => setSelectedConflict(
                  selectedConflict === event.id ? null : event.id
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-sm border-2 border-dashed"
                      style={{ 
                        backgroundColor: `${event.project.color}20`,
                        borderColor: event.project.color 
                      }}
                    />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {event.project.name} - {event.phase.name}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {new Date(event.startDate).toLocaleDateString('ko-KR')} ~ 
                        {new Date(event.endDate).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {event.phase.conflictDetails?.map((conflict, index) => (
                      <span 
                        key={index}
                        className={`text-lg ${getConflictColor(conflict.severity)}`}
                        title={`${conflict.type} 충돌 (${conflict.severity})`}
                      >
                        {getConflictIcon(conflict.severity)}
                      </span>
                    ))}
                    <svg className={`
                      w-4 h-4 text-gray-400 transition-transform duration-200
                      ${selectedConflict === event.id ? 'rotate-180' : ''}
                    `} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* 충돌 상세 정보 */}
              {selectedConflict === event.id && (
                <div className="border-t border-gray-200 bg-white p-4">
                  <div className="space-y-4">
                    {event.phase.conflictDetails?.map((conflict, conflictIndex) => (
                      <div 
                        key={conflictIndex}
                        className={`
                          rounded-lg border p-3
                          ${getConflictBgColor(conflict.severity)}
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">
                                {getConflictIcon(conflict.severity)}
                              </span>
                              <span className={`
                                text-sm font-medium
                                ${getConflictColor(conflict.severity)}
                              `}>
                                {conflict.type === 'schedule' && '일정 충돌'}
                                {conflict.type === 'resource' && '리소스 충돌'}
                                {conflict.type === 'location' && '장소 충돌'}
                                ({conflict.severity === 'high' ? '긴급' : conflict.severity === 'medium' ? '주의' : '경미'})
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mb-3">
                              {conflict.description}
                            </p>
                            
                            {conflict.conflictingPhaseIds.length > 0 && (
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">충돌 대상:</span>
                                <div className="mt-1 space-y-1">
                                  {conflict.conflictingPhaseIds.map(phaseId => {
                                    const conflictingEvent = conflictingEvents.find(e => e.phase.id === phaseId)
                                    return conflictingEvent ? (
                                      <div key={phaseId} className="flex items-center gap-2">
                                        <div 
                                          className="w-3 h-3 rounded-sm"
                                          style={{ backgroundColor: conflictingEvent.project.color }}
                                        />
                                        <span>
                                          {conflictingEvent.project.name} - {conflictingEvent.phase.name}
                                        </span>
                                      </div>
                                    ) : null
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* 해결 액션 */}
                          {onResolve && event.isDraggable && (
                            <div className="flex items-center gap-2 ml-4">
                              <button
                                onClick={() => onResolve(event.id, 'reschedule')}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200"
                              >
                                일정 조정
                              </button>
                              <button
                                onClick={() => onResolve(event.id, 'ignore')}
                                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors duration-200"
                              >
                                무시
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}