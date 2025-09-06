'use client'

import { clsx } from 'clsx'
import { useState } from 'react'

import type { 
  CalendarFilterOptions, 
  Project, 
  ProjectPhaseType 
} from '@/entities/calendar'
import { ColorAssignmentService } from '@/entities/calendar'

interface EnhancedCalendarFiltersProps {
  filters: CalendarFilterOptions
  projects: Project[]
  conflictCount?: number
  onFiltersChange: (filters: CalendarFilterOptions) => void
  onReset: () => void
  className?: string
}

const phaseTypeLabels: Record<ProjectPhaseType, string> = {
  'planning': '기획',
  'filming': '촬영', 
  'editing': '편집'
}

export function EnhancedCalendarFilters({
  filters,
  projects,
  conflictCount = 0,
  onFiltersChange,
  onReset,
  className
}: EnhancedCalendarFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleProjectChange = (projectId: string, checked: boolean) => {
    const newProjects = checked 
      ? [...filters.selectedProjects, projectId]
      : filters.selectedProjects.filter(id => id !== projectId)
    
    onFiltersChange({
      ...filters,
      selectedProjects: newProjects
    })
  }

  const handlePhaseTypeChange = (phaseType: ProjectPhaseType, checked: boolean) => {
    const newPhaseTypes = checked
      ? [...filters.selectedPhaseTypes, phaseType]
      : filters.selectedPhaseTypes.filter(t => t !== phaseType)
    
    onFiltersChange({
      ...filters,
      selectedPhaseTypes: newPhaseTypes
    })
  }

  const handleConflictOnlyToggle = (checked: boolean) => {
    onFiltersChange({
      ...filters,
      showConflictsOnly: checked
    })
  }

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value || new Date().toISOString().split('T')[0]
      }
    })
  }

  // Calculate active filter count
  const activeFilterCount = [
    filters.selectedProjects.length,
    filters.selectedPhaseTypes.length,
    filters.showConflictsOnly ? 1 : 0,
    filters.dateRange.start !== new Date().toISOString().split('T')[0] ? 1 : 0,
    filters.dateRange.end !== new Date().toISOString().split('T')[0] ? 1 : 0
  ].reduce((sum, count) => sum + count, 0)

  return (
    <div className={clsx('bg-white rounded-lg shadow-sm border border-gray-200', className)}>
      {/* Filter Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">필터 및 보기 옵션</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFilterCount}개 적용
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Conflict Only Quick Toggle */}
          <button
            onClick={() => handleConflictOnlyToggle(!filters.showConflictsOnly)}
            className={clsx(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200',
              filters.showConflictsOnly 
                ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title={`충돌하는 일정만 표시${conflictCount > 0 ? ` (${conflictCount}개)` : ''}`}
            aria-pressed={filters.showConflictsOnly}
            data-testid="filter-conflicts-only-quick"
          >
            <span className={clsx('w-2 h-2 rounded-full', filters.showConflictsOnly ? 'bg-red-500' : 'bg-gray-400')} />
            충돌만 보기
            {conflictCount > 0 && (
              <span className={clsx(
                'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold',
                filters.showConflictsOnly ? 'bg-red-600 text-white' : 'bg-gray-500 text-white'
              )}>
                {conflictCount}
              </span>
            )}
          </button>
          
          <button
            onClick={onReset}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={activeFilterCount === 0}
            title="모든 필터 초기화"
          >
            초기화
          </button>
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? '필터 접기' : '필터 펼치기'}
          >
            <svg 
              className={clsx('w-4 h-4 text-gray-500 transform transition-transform duration-200', isExpanded && 'rotate-180')}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Advanced Filter Options */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Quick Actions */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-700">빠른 설정</h3>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showConflictsOnly}
                  onChange={(e) => handleConflictOnlyToggle(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  data-testid="filter-conflicts-only"
                />
                <span className={clsx('transition-colors', filters.showConflictsOnly ? 'text-red-700 font-medium' : 'text-gray-700')}>
                  충돌하는 일정만 표시
                </span>
                {conflictCount > 0 && (
                  <span className="text-xs text-red-600">({conflictCount}개 감지)</span>
                )}
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                프로젝트 선택
                <span className="text-xs text-gray-500 ml-1">
                  ({filters.selectedProjects.length}/{projects.length})
                </span>
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                {projects.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 text-center">
                    표시할 프로젝트가 없습니다
                  </div>
                ) : (
                  projects.map((project) => {
                    const palette = ColorAssignmentService.generateProjectPalette(project.id)
                    const isSelected = filters.selectedProjects.includes(project.id)
                    
                    return (
                      <label
                        key={project.id}
                        className={clsx(
                          'flex items-center gap-3 p-3 hover:bg-gray-50 text-sm cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors',
                          isSelected && 'bg-blue-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleProjectChange(project.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        
                        {/* Project Color Swatch */}
                        <div 
                          className="w-4 h-4 rounded border shadow-sm flex-shrink-0"
                          style={{
                            backgroundColor: palette.primary,
                            borderColor: palette.accent
                          }}
                          title={`프로젝트 색상: ${palette.primary}`}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {project.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {project.status} • {project.phases.length}개 페이즈
                          </div>
                        </div>
                      </label>
                    )
                  })
                )}
              </div>
            </div>

            {/* Phase Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                페이즈 유형
                <span className="text-xs text-gray-500 ml-1">
                  ({filters.selectedPhaseTypes.length}/3)
                </span>
              </label>
              <div className="space-y-2">
                {(Object.keys(phaseTypeLabels) as ProjectPhaseType[]).map((phaseType) => {
                  const isSelected = filters.selectedPhaseTypes.includes(phaseType)
                  const phaseColor = phaseType === 'planning' ? 'text-blue-600' : 
                                   phaseType === 'filming' ? 'text-green-600' : 'text-purple-600'
                  
                  return (
                    <label
                      key={phaseType}
                      className={clsx(
                        'flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 text-sm cursor-pointer transition-colors',
                        isSelected && 'bg-gray-50'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handlePhaseTypeChange(phaseType, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      
                      <div className={clsx('w-2 h-2 rounded-full', 
                        phaseType === 'planning' ? 'bg-blue-500' :
                        phaseType === 'filming' ? 'bg-green-500' : 'bg-purple-500'
                      )} />
                      
                      <span className={clsx('font-medium', phaseColor)}>
                        {phaseTypeLabels[phaseType]}
                      </span>
                      
                      {phaseType === 'filming' && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">
                          충돌 검사 대상
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                기간 설정
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">시작일</label>
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => handleDateRangeChange('start', e.target.value)}
                    className="block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">종료일</label>
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => handleDateRangeChange('end', e.target.value)}
                    className="block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filter Summary */}
          {activeFilterCount > 0 && (
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{activeFilterCount}개</span>의 필터가 적용됨
                </div>
                <button
                  onClick={onReset}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  모든 필터 제거
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
