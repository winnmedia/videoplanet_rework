/**
 * ScheduleSummaryCard 컴포넌트
 * TDD Green Phase: 편집 일정 간트 요약 카드 위젯 구현
 * 
 * 기능:
 * - 프로젝트별 기획·촬영·편집 진행 상황 표시
 * - 주간/월간 뷰 전환
 * - 미니 간트 차트 (범례, Today 마커, 툴팁)
 * - 우선순위 및 지연 상태 표시
 */

import { useState } from 'react'

import type { ScheduleSummaryCardProps, ProjectSchedule } from '../model/types'

export function ScheduleSummaryCard({
  data,
  viewType,
  onViewTypeChange,
  onProjectClick,
  onViewDetails,
  onCreateProject
}: ScheduleSummaryCardProps) {
  const [hoveredPhase, setHoveredPhase] = useState<{
    projectId: string
    phase: string
    progress: number
  } | null>(null)

  // 단계별 상태 색상
  const getPhaseColor = (status: string, progress: number) => {
    switch (status) {
      case 'completed': return 'bg-success-500'
      case 'in_progress': return 'bg-primary-500'
      case 'overdue': return 'bg-error-500'
      case 'not_started': 
      default: return 'bg-gray-200'
    }
  }

  // 우선순위 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-error-500'
      case 'medium': return 'bg-warning-500'
      case 'low': return 'bg-success-500'
      default: return 'bg-gray-400'
    }
  }

  // 단계명 한글화
  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'planning': return '기획'
      case 'shooting': return '촬영'  
      case 'editing': return '편집'
      default: return phase
    }
  }

  // Today 마커 위치 계산 (간단화된 버전)
  const getTodayPosition = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    return `${(dayOfWeek / 7) * 100}%`
  }

  // 진행률 바 렌더링 (키보드 접근성 개선)
  const renderPhaseBar = (project: ProjectSchedule, phase: keyof ProjectSchedule['phases']) => {
    const phaseData = project.phases[phase]
    const progress = phaseData.progress
    const status = phaseData.status
    const phaseId = `${project.id}-${phase}`
    const tooltipId = `tooltip-${phaseId}`
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setHoveredPhase({
          projectId: project.id,
          phase: getPhaseLabel(phase),
          progress
        })
      } else if (e.key === 'Escape') {
        setHoveredPhase(null)
      }
    }
    
    return (
      <div className="relative">
        <div 
          className="w-full h-4 bg-gray-100 rounded-sm overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          tabIndex={0}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-describedby={tooltipId}
          aria-label={`${getPhaseLabel(phase)} 단계: ${progress}% 완료`}
          onMouseEnter={() => setHoveredPhase({
            projectId: project.id,
            phase: getPhaseLabel(phase),
            progress
          })}
          onMouseLeave={() => setHoveredPhase(null)}
          onFocus={() => setHoveredPhase({
            projectId: project.id,
            phase: getPhaseLabel(phase),
            progress
          })}
          onBlur={() => setHoveredPhase(null)}
          onKeyDown={handleKeyDown}
        >
          <div
            className={`h-full transition-all duration-300 ${getPhaseColor(status, progress)}`}
            style={{ width: `${progress}%` }}
            data-testid={`phase-${phase}-${project.id}`}
          />
        </div>
        
        {/* 접근성 개선된 툴팁 */}
        {hoveredPhase?.projectId === project.id && hoveredPhase.phase === getPhaseLabel(phase) && (
          <div
            id={tooltipId}
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-md whitespace-nowrap z-10 shadow-lg"
            role="tooltip"
            aria-live="polite"
          >
            {hoveredPhase.phase}: {hoveredPhase.progress}% 완료
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        )}
      </div>
    )
  }

  const isEmpty = data.currentProjects.length === 0

  return (
    <div
      className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200"
      role="region"
      aria-label="편집 일정 간트"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-vridge-50 rounded-xl">
            <svg className="w-5 h-5 text-vridge-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">편집 일정 간트</h3>
            <p className="text-sm text-gray-500">
              전체 {data.totalProjects}개, 정상 {data.onTimeProjects}개, 지연 {data.delayedProjects}개
            </p>
          </div>
        </div>

        {/* 보기 타입 전환 버튼 */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button
            onClick={() => onViewTypeChange?.('week')}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              viewType === 'week'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            주간
          </button>
          <button
            onClick={() => onViewTypeChange?.('month')}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              viewType === 'month'
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            월간
          </button>
        </div>
      </div>

      {/* 통계 */}
      {!isEmpty && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-vridge-500">{data.totalProjects}</div>
            <div className="text-xs text-gray-500">전체</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-500">{data.onTimeProjects}</div>
            <div className="text-xs text-gray-500">정상</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-error-500">{data.delayedProjects}</div>
            <div className="text-xs text-gray-500">지연</div>
          </div>
        </div>
      )}

      {/* 간트 차트 */}
      <div className="mb-6">
        {isEmpty ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">진행 중인 프로젝트가 없습니다</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
              새로운 프로젝트를 만들어 영상 제작 일정을 체계적으로 관리해보세요.
            </p>
            
            {/* 개선된 CTA 버튼들 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {onCreateProject && (
                <button
                  onClick={onCreateProject}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:bg-primary-600 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-w-44 min-h-11"
                  aria-label="새로운 프로젝트 만들기"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  첫 프로젝트 만들기
                </button>
              )}
              <button
                onClick={() => onViewDetails?.()}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 focus:bg-primary-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-w-44 min-h-11"
                aria-label="프로젝트 템플릿 둘러보기"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                템플릿 둘러보기
              </button>
            </div>
            
            <div className="mt-4">
              <a 
                href="/help/getting-started" 
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-200 focus:outline-none focus:text-gray-600"
                aria-label="프로젝트 관리 도움말 보기"
              >
                프로젝트 관리가 처음이신가요? 도움말 보기 →
              </a>
            </div>
          </div>
        ) : (
          <div role="table" aria-label="간트 차트">
            {/* 헤더 */}
            <div className="flex items-center mb-3 text-xs font-medium text-gray-500">
              <div className="w-32 flex-shrink-0">프로젝트</div>
              <div className="flex-1 grid grid-cols-3 gap-2 px-2">
                <span className="text-center">기획</span>
                <span className="text-center">촬영</span>
                <span className="text-center">편집</span>
              </div>
              <div className="w-16 text-center">진행률</div>
            </div>

            {/* Today 마커 */}
            <div className="relative mb-1">
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-error-500 z-10"
                style={{ left: getTodayPosition() }}
                data-testid="today-marker"
              />
              <div 
                className="absolute -top-4 text-xs font-bold text-error-500"
                style={{ left: getTodayPosition(), transform: 'translateX(-50%)' }}
              >
                Today
              </div>
            </div>

            {/* 프로젝트 행들 */}
            <div className="space-y-3">
              {data.currentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onProjectClick?.(project.id)}
                  tabIndex={0}
                  className="w-full flex items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-150 group"
                  aria-label={`${project.title} 프로젝트 상세보기`}
                >
                  {/* 프로젝트 정보 */}
                  <div className="w-32 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${getPriorityColor(project.priority)}`}
                        data-testid={`priority-${project.priority}`}
                      />
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {project.title}
                      </span>
                      {project.isDelayed && (
                        <span
                          className="text-xs px-1.5 py-0.5 bg-error-100 text-error-700 rounded"
                          data-testid="delayed-indicator"
                        >
                          지연
                        </span>
                      )}
                    </div>
                    {project.nextMilestone && (
                      <p className="text-xs text-gray-500 mt-1">{project.nextMilestone}</p>
                    )}
                  </div>

                  {/* 간트 바들 */}
                  <div className="flex-1 grid grid-cols-3 gap-2 px-2">
                    {renderPhaseBar(project, 'planning')}
                    {renderPhaseBar(project, 'shooting')}
                    {renderPhaseBar(project, 'editing')}
                  </div>

                  {/* 전체 진행률 */}
                  <div className="w-16 text-center">
                    <span className="text-sm font-bold text-vridge-500">
                      {project.overallProgress}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 범례 */}
      {!isEmpty && (
        <div className="flex items-center justify-center gap-6 mb-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-success-500 rounded-sm" />
            <span>완료</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-primary-500 rounded-sm" />
            <span>진행중</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-gray-200 rounded-sm" />
            <span>예정</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 bg-error-500 rounded-sm" />
            <span>지연</span>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="w-full px-4 py-2 text-sm font-medium text-vridge-500 bg-vridge-50 hover:bg-vridge-100 rounded-lg transition-colors duration-150"
        >
          전체보기
        </button>
      )}
    </div>
  )
}