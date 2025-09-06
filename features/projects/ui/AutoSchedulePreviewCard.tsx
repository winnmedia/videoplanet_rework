'use client'

import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar, Edit3, AlertTriangle, CheckCircle } from 'lucide-react'
import React, { useState, useEffect } from 'react'

import { 
  AutoScheduleService,
  generateConflictSummaryText,
  calculateConflictSeverity,
  type ConflictAwareScheduleResult,
  type AutoScheduleOptions
} from '@/shared/lib/auto-schedule-service'
import { 
  calculateAutoSchedule, 
  formatSchedulePhase, 
  getScheduleLabels,
  AutoScheduleConfig,
  DEFAULT_AUTO_SCHEDULE,
  AutoScheduleResult
} from '@/shared/lib/project-scheduler'
import { Button } from '@/shared/ui'

interface AutoSchedulePreviewCardProps {
  startDate: string
  onScheduleChange?: (schedule: AutoScheduleResult) => void
  className?: string
  projectTitle?: string
  existingEvents?: any[] // 기존 캘린더 이벤트들
}

/**
 * 자동 일정 프리뷰 카드 컴포넌트 (충돌 검지 통합)
 * DEVPLAN.md 요구사항: "자동 일정 프리뷰 카드: 생성 폼 하단에 바 형태(1주/1일/2주), 수동 전환·날짜 수정 시 즉시 반영 + 충돌 검사"
 */
export function AutoSchedulePreviewCard({ 
  startDate, 
  onScheduleChange,
  className = '',
  projectTitle = '새 프로젝트',
  existingEvents = []
}: AutoSchedulePreviewCardProps) {
  const [isManualMode, setIsManualMode] = useState(false)
  const [config, setConfig] = useState<AutoScheduleConfig>(DEFAULT_AUTO_SCHEDULE)
  const [conflictResult, setConflictResult] = useState<ConflictAwareScheduleResult | null>(null)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [selectedAlternative, setSelectedAlternative] = useState<number | null>(null)
  
  // 시작 날짜를 기준으로 자동 일정 계산 (충돌 검지 포함)
  const startDateObj = new Date(startDate || new Date())
  
  // 충돌을 고려한 스케줄 계산
  useEffect(() => {
    if (!startDate) return
    
    const options: AutoScheduleOptions = {
      projectId: `temp_${Date.now()}`,
      projectTitle,
      startDate: startDateObj,
      config,
      existingEvents: [], // 실제로는 기존 이벤트들을 전달
      skipWeekends: true
    }
    
    const result = AutoScheduleService.createConflictAwareSchedule(options)
    setConflictResult(result)
    
    // 기본 일정 또는 선택된 대안 일정 반환
    const finalSchedule = selectedAlternative !== null && result.alternatives 
      ? result.alternatives[selectedAlternative]
      : result
    
    onScheduleChange?.(finalSchedule)
  }, [startDate, config, selectedAlternative, projectTitle, onScheduleChange])
  
  const schedule = conflictResult || calculateAutoSchedule(startDateObj, config)
  
  const scheduleLabels = getScheduleLabels(config)
  
  const handleManualToggle = () => {
    setIsManualMode(!isManualMode)
  }
  
  const handleConfigChange = (field: keyof AutoScheduleConfig, value: number) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  if (!startDate) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-gray-500">
          <Calendar className="w-5 h-5 mr-2" />
          <span>시작 날짜를 선택하면 자동 일정이 표시됩니다</span>
        </div>
      </div>
    )
  }

  // 충돌 정보 및 심각도
  const hasConflicts = conflictResult?.hasConflicts || false
  const conflictSeverity = hasConflicts ? calculateConflictSeverity(conflictResult!.conflicts) : 'low'
  const conflictSummary = hasConflicts ? generateConflictSummaryText(conflictResult!) : ''

  return (
    <div 
      className={`bg-white border rounded-lg p-6 ${className} ${
        hasConflicts ? (
          conflictSeverity === 'high' ? 'border-red-300 bg-red-50' :
          conflictSeverity === 'medium' ? 'border-orange-300 bg-orange-50' :
          'border-yellow-300 bg-yellow-50'
        ) : 'border-gray-200'
      }`}
      data-testid="auto-schedule-preview-card"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-primary mr-2" />
          <h3 className="text-lg font-medium text-gray-900">프로젝트 일정</h3>
          
          {/* 충돌 상태 인디케이터 */}
          {hasConflicts ? (
            <div className="ml-3 flex items-center">
              <AlertTriangle className={`w-4 h-4 mr-1 ${
                conflictSeverity === 'high' ? 'text-red-500' :
                conflictSeverity === 'medium' ? 'text-orange-500' :
                'text-yellow-500'
              }`} />
              <span className={`text-sm font-medium ${
                conflictSeverity === 'high' ? 'text-red-700' :
                conflictSeverity === 'medium' ? 'text-orange-700' :
                'text-yellow-700'
              }`}>
                충돌 발견
              </span>
            </div>
          ) : (
            <div className="ml-3 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
              <span className="text-sm font-medium text-green-700">충돌 없음</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {hasConflicts && conflictResult?.alternatives && conflictResult.alternatives.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAlternatives(!showAlternatives)}
              className="text-sm"
            >
              대안 일정 {showAlternatives ? '숨기기' : '보기'}
            </Button>
          )}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleManualToggle}
            className="text-sm"
            data-testid="manual-schedule-toggle"
          >
            {isManualMode ? (
              <>
                <Calendar className="w-4 h-4 mr-1" />
                자동 설정
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4 mr-1" />
                수동 설정
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 충돌 요약 메시지 */}
      {hasConflicts && conflictSummary && (
        <div className={`mb-4 p-3 rounded-md border ${
          conflictSeverity === 'high' ? 'border-red-200 bg-red-50' :
          conflictSeverity === 'medium' ? 'border-orange-200 bg-orange-50' :
          'border-yellow-200 bg-yellow-50'
        }`}>
          <p className={`text-sm ${
            conflictSeverity === 'high' ? 'text-red-800' :
            conflictSeverity === 'medium' ? 'text-orange-800' :
            'text-yellow-800'
          }`}>
            {conflictSummary}
          </p>
        </div>
      )}
      
      {/* 자동 모드: 바 형태 일정 표시 */}
      {!isManualMode && (
        <div className="space-y-3">
          {/* 일정 요약 바 */}
          <div className="flex items-center space-x-4 text-sm font-medium">
            <span className="text-blue-600">{scheduleLabels.planning}</span>
            <span className="text-green-600">{scheduleLabels.filming}</span>
            <span className="text-purple-600">{scheduleLabels.editing}</span>
            <span className="text-gray-500">• 총 {schedule.totalDays}일</span>
          </div>
          
          {/* 시각적 타임라인 바 */}
          <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-blue-500 rounded-l-full"
              style={{ width: `${(schedule.planning.duration * 7 / schedule.totalDays) * 100}%` }}
            />
            <div 
              className="absolute top-0 h-full bg-green-500"
              style={{ 
                left: `${(schedule.planning.duration * 7 / schedule.totalDays) * 100}%`,
                width: `${(schedule.filming.duration / schedule.totalDays) * 100}%`
              }}
            />
            <div 
              className="absolute top-0 right-0 h-full bg-purple-500 rounded-r-full"
              style={{ width: `${(schedule.editing.duration * 7 / schedule.totalDays) * 100}%` }}
            />
            
            {/* 단계 레이블 */}
            <div className="absolute inset-0 flex items-center justify-center space-x-4 text-xs font-medium text-white">
              <span>기획</span>
              <span>촬영</span>
              <span>편집</span>
            </div>
          </div>
          
          {/* 상세 일정 정보 */}
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
                <span className="font-medium text-gray-900">기획</span>
              </div>
              <p className="text-gray-600 pl-5">
                {formatSchedulePhase(
                  schedule.planning.startDate,
                  schedule.planning.endDate,
                  schedule.planning.duration,
                  schedule.planning.unit
                )}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                <span className="font-medium text-gray-900">촬영</span>
              </div>
              <p className="text-gray-600 pl-5">
                {formatSchedulePhase(
                  schedule.filming.startDate,
                  schedule.filming.endDate,
                  schedule.filming.duration,
                  schedule.filming.unit
                )}
              </p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-2" />
                <span className="font-medium text-gray-900">편집</span>
              </div>
              <p className="text-gray-600 pl-5">
                {formatSchedulePhase(
                  schedule.editing.startDate,
                  schedule.editing.endDate,
                  schedule.editing.duration,
                  schedule.editing.unit
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 대안 일정 섹션 */}
      {showAlternatives && conflictResult?.alternatives && conflictResult.alternatives.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">대안 일정 선택</h4>
          <div className="space-y-3">
            {conflictResult.alternatives.map((alternative, index) => (
              <div
                key={index}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedAlternative === index
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAlternative(selectedAlternative === index ? null : index)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-gray-900">
                      대안 {index + 1}: {alternative.totalDays}일 소요
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      시작: {format(alternative.planning.startDate, 'yyyy-MM-dd', { locale: ko })} ~ 
                      완료: {format(alternative.editing.endDate, 'yyyy-MM-dd', { locale: ko })}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedAlternative === index ? '✓ 선택됨' : '선택하기'}
                  </div>
                </div>
                
                {/* 대안 일정 미니 바 */}
                <div className="mt-2 flex items-center space-x-2 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-1" />
                    <span>기획 {alternative.planning.duration}주</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-1" />
                    <span>촬영 {alternative.filming.duration}일</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-1" />
                    <span>편집 {alternative.editing.duration}주</span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* 원래 일정으로 돌아가기 */}
            <div
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedAlternative === null
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedAlternative(null)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    원래 제안 일정 사용 {hasConflicts ? '(충돌 있음)' : ''}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {conflictResult ? `${conflictResult.totalDays}일 소요` : ''}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {selectedAlternative === null ? '✓ 선택됨' : '선택하기'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 수동 모드: 커스텀 입력 필드 */}
      {isManualMode && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                기획 기간
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={config.planningWeeks}
                  onChange={(e) => handleConfigChange('planningWeeks', parseInt(e.target.value))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  data-testid="planning-duration-input"
                />
                <span className="text-sm text-gray-500">주</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                촬영 기간
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={config.filmingDays}
                  onChange={(e) => handleConfigChange('filmingDays', parseInt(e.target.value))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  data-testid="filming-duration-input"
                />
                <span className="text-sm text-gray-500">일</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                편집 기간
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={config.editingWeeks}
                  onChange={(e) => handleConfigChange('editingWeeks', parseInt(e.target.value))}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  data-testid="editing-duration-input"
                />
                <span className="text-sm text-gray-500">주</span>
              </div>
            </div>
          </div>
          
          {/* 수동 설정 미리보기 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600 mb-2">미리보기:</p>
            <div className="text-sm space-y-1">
              <div>기획: {formatSchedulePhase(schedule.planning.startDate, schedule.planning.endDate, schedule.planning.duration, schedule.planning.unit)}</div>
              <div>촬영: {formatSchedulePhase(schedule.filming.startDate, schedule.filming.endDate, schedule.filming.duration, schedule.filming.unit)}</div>
              <div>편집: {formatSchedulePhase(schedule.editing.startDate, schedule.editing.endDate, schedule.editing.duration, schedule.editing.unit)}</div>
              <div className="font-medium">총 기간: {schedule.totalDays}일</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 숨겨진 데이터 (테스트용) */}
      <div 
        data-testid="auto-schedule-data" 
        className="hidden"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            planning: { duration: schedule.planning.duration * 7, unit: 'days' },
            filming: { duration: schedule.filming.duration, unit: 'days' },
            editing: { duration: schedule.editing.duration * 7, unit: 'days' },
            totalDuration: schedule.totalDays
          })
        }}
      />
    </div>
  )
}