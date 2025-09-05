'use client'

import { useState } from 'react'
import { clsx } from 'clsx'

import type { ProjectLegendItem, Project } from '@/entities/calendar'
import { ColorAssignmentService } from '@/entities/calendar'

interface EnhancedProjectLegendProps {
  projects: Project[]
  visibleProjects: string[]
  conflictingProjects?: string[]
  onProjectToggle: (projectId: string, visible: boolean) => void
  onToggleAll: (visible: boolean) => void
  className?: string
}

function ProjectLegendCard({ 
  project, 
  isVisible, 
  hasConflicts = false,
  onToggle 
}: { 
  project: Project
  isVisible: boolean
  hasConflicts?: boolean
  onToggle: (visible: boolean) => void
}) {
  const palette = ColorAssignmentService.generateProjectPalette(project.id)
  const swatch = ColorAssignmentService.generateColorSwatch(palette)

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 cursor-pointer group',
        'hover:shadow-md hover:border-gray-300',
        isVisible 
          ? 'bg-white border-gray-200 shadow-sm' 
          : 'bg-gray-50 border-gray-200 opacity-60',
        hasConflicts && 'ring-1 ring-red-200 bg-red-50'
      )}
      onClick={() => onToggle(!isVisible)}
      role="button"
      tabIndex={0}
      aria-pressed={isVisible}
      aria-label={`${project.name} ${isVisible ? '숨기기' : '보이기'}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle(!isVisible)
        }
      }}
    >
      {/* Visibility Toggle */}
      <button
        className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors duration-200 group-hover:bg-gray-200"
        onClick={(e) => {
          e.stopPropagation()
          onToggle(!isVisible)
        }}
        aria-label={isVisible ? '프로젝트 숨기기' : '프로젝트 보이기'}
      >
        {isVisible ? (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
          </svg>
        )}
      </button>

      {/* Project Color Swatch */}
      <div className="flex-shrink-0 relative">
        <div 
          className={clsx(
            'rounded-sm border-2 shadow-sm transition-all duration-200',
            hasConflicts && 'animate-pulse border-dashed'
          )}
          style={{ 
            width: swatch.size, 
            height: swatch.size,
            backgroundColor: swatch.background,
            borderColor: hasConflicts ? '#ef4444' : swatch.border
          }}
          title={`${project.name} 프로젝트 색상: ${palette.primary}`}
        />
        
        {/* Conflict Indicator */}
        {hasConflicts && (
          <div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-white text-white flex items-center justify-center text-xs"
            title="충돌 감지됨"
            aria-label="이 프로젝트에서 일정 충돌이 감지되었습니다"
          >
            !
          </div>
        )}
      </div>

      {/* Project Info */}
      <div className="min-w-0 flex-1">
        <div className={clsx(
          'text-sm font-medium truncate transition-colors',
          isVisible ? 'text-gray-900' : 'text-gray-500'
        )}>
          {project.name}
        </div>
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <span>{project.phases.length}개 페이즈</span>
          {hasConflicts && (
            <span className="text-red-600 font-medium">• 충돌 있음</span>
          )}
        </div>
      </div>

      {/* Project Status */}
      <div className="flex-shrink-0">
        <span 
          className={clsx(
            'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium transition-colors',
            project.status === 'active' && 'bg-green-100 text-green-800',
            project.status === 'completed' && 'bg-gray-100 text-gray-800',
            project.status === 'on-hold' && 'bg-yellow-100 text-yellow-800',
            project.status === 'cancelled' && 'bg-red-100 text-red-800'
          )}
        >
          {project.status === 'active' && '진행중'}
          {project.status === 'completed' && '완료'}
          {project.status === 'on-hold' && '대기'}
          {project.status === 'cancelled' && '취소'}
        </span>
      </div>
    </div>
  )
}

export function EnhancedProjectLegend({
  projects,
  visibleProjects,
  conflictingProjects = [],
  onProjectToggle,
  onToggleAll,
  className
}: EnhancedProjectLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const visibleCount = visibleProjects.length
  const totalCount = projects.length
  const conflictCount = conflictingProjects.length

  return (
    <div className={clsx('bg-white rounded-lg shadow-sm border border-gray-200', className)}>
      {/* Legend Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-800">프로젝트 범례</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>
              {visibleCount}/{totalCount}개 표시
            </span>
            {conflictCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full font-medium">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                {conflictCount}개 충돌
              </span>
            )}
          </div>
        </div>
        
        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleAll(true)}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
            disabled={visibleCount === totalCount}
          >
            모두 보기
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => onToggleAll(false)}
            className="text-xs text-gray-600 hover:text-gray-800 transition-colors font-medium"
            disabled={visibleCount === 0}
          >
            모두 숨기기
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 hover:bg-gray-100 rounded transition-colors duration-200 ml-2"
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? '범례 펼치기' : '범례 접기'}
          >
            <svg 
              className={clsx('w-4 h-4 text-gray-500 transform transition-transform duration-200', isCollapsed && 'rotate-180')}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend Content */}
      {!isCollapsed && (
        <div className="p-4">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="w-12 h-12 mx-auto mb-3 opacity-50">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14-7H5m14 14H5" />
                </svg>
              </div>
              <p className="text-sm">프로젝트가 없습니다</p>
              <p className="text-xs text-gray-400 mt-1">새 프로젝트를 생성하여 시작하세요</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {projects.map((project) => {
                const isVisible = visibleProjects.includes(project.id)
                const hasConflicts = conflictingProjects.includes(project.id)
                
                return (
                  <ProjectLegendCard
                    key={project.id}
                    project={project}
                    isVisible={isVisible}
                    hasConflicts={hasConflicts}
                    onToggle={(visible) => onProjectToggle(project.id, visible)}
                  />
                )
              })}
            </div>
          )}

          {/* Legend Footer */}
          {projects.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span>기획</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>촬영</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded" />
                  <span>편집</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-dashed border-red-500 bg-red-100 rounded animate-pulse" />
                  <span className="text-red-600">충돌</span>
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                우측 상단 고정 범례 • 드래그하여 일정 이동
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}