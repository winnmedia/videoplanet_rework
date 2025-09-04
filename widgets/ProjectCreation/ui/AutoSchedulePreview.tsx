import clsx from 'clsx'
import React from 'react'

import type { SchedulePreview } from '../model/types'

interface AutoSchedulePreviewProps {
  schedule: SchedulePreview
  className?: string
}

export function AutoSchedulePreview({ schedule, className }: AutoSchedulePreviewProps) {
  const formatDuration = (days: number, phase: string) => {
    if (days === 1) return `${phase} ${days}일`
    if (days < 7) return `${phase} ${days}일`
    const weeks = Math.floor(days / 7)
    if (weeks === 1) return `${phase} ${weeks}주`
    return `${phase} ${weeks}주`
  }

  return (
    <div 
      data-testid="auto-schedule-preview"
      aria-live="polite"
      aria-label="자동 생성된 일정 프리뷰"
      className={clsx(
        'legacy-card p-4 space-y-3 bg-white',
        'border border-gray-200 rounded-[20px]',
        'shadow-[0_8px_32px_rgba(0,49,255,0.15)]',
        className
      )}
    >
      <h3 className="text-base font-suit font-semibold text-gray-800 mb-3">
        자동 생성 일정 프리뷰
      </h3>
      
      <div className="flex gap-2">
        <div className="flex-1 p-3 rounded-lg bg-vridge-tint-planning border-l-4 border-vridge-primary">
          <div className="text-sm font-suit text-gray-600">기획</div>
          <div className="text-base font-suit font-semibold text-gray-800">
            {formatDuration(schedule.planning.duration, '기획')}
          </div>
        </div>
        
        <div className="flex-1 p-3 rounded-lg bg-vridge-tint-shooting border-l-4 border-vridge-secondary">
          <div className="text-sm font-suit text-gray-600">촬영</div>
          <div className="text-base font-suit font-semibold text-gray-800">
            {formatDuration(schedule.shooting.duration, '촬영')}
          </div>
        </div>
        
        <div className="flex-1 p-3 rounded-lg bg-vridge-tint-editing border-l-4 border-vridge-accent">
          <div className="text-sm font-suit text-gray-600">편집</div>
          <div className="text-base font-suit font-semibold text-gray-800">
            {formatDuration(schedule.editing.duration, '편집')}
          </div>
        </div>
      </div>
    </div>
  )
}