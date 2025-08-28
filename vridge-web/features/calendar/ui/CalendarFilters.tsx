'use client'

import { useState } from 'react'
// import { CalendarIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { CalendarFilter, Project, PhaseType } from '@/entities/project/model/calendar-types'

interface CalendarFiltersProps {
  filter: CalendarFilter
  projects: Project[]
  organizations: string[]
  assignees: string[]
  onFilterChange: (filter: CalendarFilter) => void
  onReset: () => void
}

const phaseTypeLabels: Record<PhaseType, string> = {
  'pre-production': '사전 제작',
  'production': '제작',
  'post-production': '후반 작업',
  'review': '검토',
  'delivery': '납품'
}

export function CalendarFilters({
  filter,
  projects,
  organizations,
  assignees,
  onFilterChange,
  onReset
}: CalendarFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end' | null>(null)

  const handleProjectChange = (projectId: string, checked: boolean) => {
    const newProjects = checked 
      ? [...filter.projects, projectId]
      : filter.projects.filter(id => id !== projectId)
    
    onFilterChange({
      ...filter,
      projects: newProjects
    })
  }

  const handleOrganizationChange = (org: string, checked: boolean) => {
    const newOrganizations = checked
      ? [...filter.organizations, org]
      : filter.organizations.filter(o => o !== org)
    
    onFilterChange({
      ...filter,
      organizations: newOrganizations
    })
  }

  const handleAssigneeChange = (assignee: string, checked: boolean) => {
    const newAssignees = checked
      ? [...filter.assignees, assignee]
      : filter.assignees.filter(a => a !== assignee)
    
    onFilterChange({
      ...filter,
      assignees: newAssignees
    })
  }

  const handlePhaseTypeChange = (phaseType: PhaseType, checked: boolean) => {
    const newPhaseTypes = checked
      ? [...filter.phaseTypes, phaseType]
      : filter.phaseTypes.filter(t => t !== phaseType)
    
    onFilterChange({
      ...filter,
      phaseTypes: newPhaseTypes
    })
  }

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onFilterChange({
      ...filter,
      [field]: value || undefined
    })
    setDatePickerMode(null)
  }

  const activeFilterCount = [
    filter.projects.length,
    filter.organizations.length,
    filter.assignees.length,
    filter.phaseTypes.length,
    filter.startDate ? 1 : 0,
    filter.endDate ? 1 : 0,
    filter.showConflictsOnly ? 1 : 0,
    filter.showMyProjectsOnly ? 1 : 0
  ].reduce((sum, count) => sum + count, 0)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      {/* 필터 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">필터</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {activeFilterCount}개 적용
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
            disabled={activeFilterCount === 0}
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
              className={`w-4 h-4 text-gray-500 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 필터 옵션 */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* 빠른 토글 */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filter.showConflictsOnly}
                onChange={(e) => onFilterChange({
                  ...filter,
                  showConflictsOnly: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">충돌만 보기</span>
            </label>
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filter.showMyProjectsOnly}
                onChange={(e) => onFilterChange({
                  ...filter,
                  showMyProjectsOnly: e.target.checked
                })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">내 프로젝트만</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 프로젝트 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로젝트
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                {projects.map((project) => (
                  <label
                    key={project.id}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filter.projects.includes(project.id)}
                      onChange={(e) => handleProjectChange(project.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div 
                      className="w-3 h-3 rounded-sm border"
                      style={{
                        backgroundColor: `${project.color}40`,
                        borderColor: project.color
                      }}
                    />
                    <span className="text-gray-700 truncate">{project.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 조직 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                조직
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                {organizations.map((org) => (
                  <label
                    key={org}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filter.organizations.includes(org)}
                      onChange={(e) => handleOrganizationChange(org, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{org}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 담당자 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                담당자
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                {assignees.map((assignee) => (
                  <label
                    key={assignee}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filter.assignees.includes(assignee)}
                      onChange={(e) => handleAssigneeChange(assignee, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{assignee}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 페이즈 타입 필터 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                페이즈 유형
              </label>
              <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
                {(Object.keys(phaseTypeLabels) as PhaseType[]).map((phaseType) => (
                  <label
                    key={phaseType}
                    className="flex items-center gap-2 p-2 hover:bg-gray-50 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={filter.phaseTypes.includes(phaseType)}
                      onChange={(e) => handlePhaseTypeChange(phaseType, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{phaseTypeLabels[phaseType]}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 날짜 범위 필터 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              기간
            </label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={filter.startDate || ''}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  className="block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="시작일"
                />
              </div>
              <span className="text-gray-500 text-sm">~</span>
              <div className="relative">
                <input
                  type="date"
                  value={filter.endDate || ''}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  className="block w-full rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="종료일"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}