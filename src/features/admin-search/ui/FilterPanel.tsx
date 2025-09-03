import { ReactNode, useState } from 'react'
import { AdminCard } from 'shared/ui'
import { clsx } from 'clsx'

export interface FilterOption {
  /** 옵션 값 */
  value: string
  
  /** 옵션 라벨 */
  label: string
  
  /** 옵션 개수 (선택적) */
  count?: number
  
  /** 비활성화 상태 */
  disabled?: boolean
}

export interface FilterGroup {
  /** 그룹 키 */
  key: string
  
  /** 그룹 제목 */
  title: string
  
  /** 다중 선택 여부 */
  multiple?: boolean
  
  /** 옵션 목록 */
  options: FilterOption[]
  
  /** 현재 선택된 값들 */
  selectedValues: string[]
  
  /** 선택 변경 이벤트 */
  onChange: (values: string[]) => void
}

export interface FilterPanelProps {
  /** 필터 그룹 목록 */
  filterGroups: FilterGroup[]
  
  /** 전체 초기화 이벤트 */
  onReset?: () => void
  
  /** 필터 적용 이벤트 */
  onApply?: () => void
  
  /** 패널 접기/펼치기 상태 */
  collapsed?: boolean
  
  /** 접기/펼치기 토글 이벤트 */
  onToggleCollapsed?: (collapsed: boolean) => void
  
  /** 추가 CSS 클래스 */
  className?: string
  
  /** 테스트를 위한 ID */
  'data-testid'?: string
}

function FilterGroupItem({ group }: { group: FilterGroup }) {
  const handleOptionChange = (optionValue: string, checked: boolean) => {
    if (group.multiple) {
      // 다중 선택
      if (checked) {
        group.onChange([...group.selectedValues, optionValue])
      } else {
        group.onChange(group.selectedValues.filter(v => v !== optionValue))
      }
    } else {
      // 단일 선택
      group.onChange(checked ? [optionValue] : [])
    }
  }
  
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-neutral-900">
        {group.title}
      </h4>
      
      <div className="space-y-2">
        {group.options.map((option) => {
          const isSelected = group.selectedValues.includes(option.value)
          const inputType = group.multiple ? 'checkbox' : 'radio'
          const inputName = group.multiple ? undefined : group.key
          
          return (
            <label
              key={option.value}
              className={clsx(
                'flex items-center gap-2 p-2 rounded hover:bg-neutral-50 cursor-pointer',
                'transition-colors duration-200',
                option.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <input
                type={inputType}
                name={inputName}
                value={option.value}
                checked={isSelected}
                disabled={option.disabled}
                onChange={(e) => handleOptionChange(option.value, e.target.checked)}
                className="text-primary-600 focus-ring"
              />
              
              <span className="text-sm text-neutral-700 flex-1">
                {option.label}
              </span>
              
              {typeof option.count === 'number' && (
                <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                  {option.count}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}

function FilterActions({ 
  onReset, 
  onApply, 
  hasActiveFilters 
}: { 
  onReset?: () => void
  onApply?: () => void
  hasActiveFilters: boolean 
}) {
  if (!onReset && !onApply) return null
  
  return (
    <div className="flex items-center gap-2 pt-4 border-t border-border-light">
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          disabled={!hasActiveFilters}
          className={clsx(
            'flex-1 px-3 py-2 text-sm font-medium text-neutral-600 bg-neutral-100',
            'hover:bg-neutral-200 focus-ring rounded transition-colors duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          초기화
        </button>
      )}
      
      {onApply && (
        <button
          type="button"
          onClick={onApply}
          className={clsx(
            'flex-1 px-3 py-2 text-sm font-medium text-white bg-primary-600',
            'hover:bg-primary-700 focus-ring rounded transition-colors duration-200'
          )}
        >
          적용
        </button>
      )}
    </div>
  )
}

export function FilterPanel({
  filterGroups,
  onReset,
  onApply,
  collapsed = false,
  onToggleCollapsed,
  className,
  'data-testid': testId,
}: FilterPanelProps) {
  // 활성 필터가 있는지 확인
  const hasActiveFilters = filterGroups.some(group => group.selectedValues.length > 0)
  
  // 활성 필터 개수 계산
  const activeFilterCount = filterGroups.reduce(
    (count, group) => count + group.selectedValues.length,
    0
  )
  
  const headerAction = onToggleCollapsed ? (
    <button
      type="button"
      onClick={() => onToggleCollapsed(!collapsed)}
      className="text-sm text-primary-600 hover:text-primary-700 focus-ring px-2 py-1 rounded"
      aria-label={collapsed ? '필터 패널 펼치기' : '필터 패널 접기'}
    >
      {collapsed ? '펼치기' : '접기'}
    </button>
  ) : undefined
  
  const title = (
    <div className="flex items-center gap-2">
      <span>필터</span>
      {activeFilterCount > 0 && (
        <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
          {activeFilterCount}
        </span>
      )}
    </div>
  )
  
  return (
    <AdminCard
      title={title}
      action={headerAction}
      size="sm"
      className={clsx('min-w-64', className)}
      data-testid={testId}
    >
      {!collapsed && (
        <div className="space-y-6">
          {filterGroups.map((group) => (
            <FilterGroupItem key={group.key} group={group} />
          ))}
          
          <FilterActions
            onReset={onReset}
            onApply={onApply}
            hasActiveFilters={hasActiveFilters}
          />
        </div>
      )}
      
      {collapsed && hasActiveFilters && (
        <div className="text-sm text-neutral-600">
          {activeFilterCount}개 필터 적용됨
        </div>
      )}
    </AdminCard>
  )
}

export default FilterPanel