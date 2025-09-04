'use client'

import { Calendar, Edit3 } from 'lucide-react'
import React, { useState } from 'react'

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
}

/**
 * 자동 일정 프리뷰 카드 컴포넌트
 * DEVPLAN.md 요구사항: "자동 일정 프리뷰 카드: 생성 폼 하단에 바 형태(1주/1일/2주), 수동 전환·날짜 수정 시 즉시 반영"
 */
export function AutoSchedulePreviewCard({ 
  startDate, 
  onScheduleChange,
  className = '' 
}: AutoSchedulePreviewCardProps) {
  const [isManualMode, setIsManualMode] = useState(false)
  const [config, setConfig] = useState<AutoScheduleConfig>(DEFAULT_AUTO_SCHEDULE)
  
  // 시작 날짜를 기준으로 자동 일정 계산
  const startDateObj = new Date(startDate || new Date())
  const schedule = calculateAutoSchedule(startDateObj, config)
  
  // 상위 컴포넌트에 일정 변경 알림
  React.useEffect(() => {
    onScheduleChange?.(schedule)
  }, [schedule, onScheduleChange])
  
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

  return (
    <div 
      className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}
      data-testid="auto-schedule-preview-card"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Calendar className="w-5 h-5 text-primary mr-2" />
          <h3 className="text-lg font-medium text-gray-900">프로젝트 일정</h3>
        </div>
        
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