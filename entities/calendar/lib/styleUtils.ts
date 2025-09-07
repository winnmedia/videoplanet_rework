/**
 * 캘린더 스타일 유틸리티 함수
 * @description Tailwind 클래스 기반 스타일 생성 헬퍼
 * @layer entities/calendar/lib
 */

import { clsx } from 'clsx'

import {
  PROJECT_COLOR_CLASSES,
  PHASE_TYPE_STYLES,
  CONFLICT_SEVERITY_STYLES,
  CALENDAR_CELL_STYLES,
  PROJECT_STATUS_STYLES,
  EVENT_CARD_STYLES,
  FILTER_STYLES,
  LEGEND_STYLES,
  DRAG_DROP_STYLES,
  ANIMATION_STYLES
} from '../constants/styles'
import type { ProjectPhaseType, Project } from '../model/types'

/**
 * 프로젝트별 색상 클래스 반환
 */
export function getProjectColorClasses(projectId: string, projectIndex?: number) {
  const index = projectIndex ?? hashProjectId(projectId)
  const colorScheme = PROJECT_COLOR_CLASSES[index % PROJECT_COLOR_CLASSES.length]
  
  return {
    id: colorScheme.id,
    name: colorScheme.name,
    background: colorScheme.background,
    border: colorScheme.border,
    borderColor: colorScheme.borderColor,
    text: colorScheme.text,
    hover: colorScheme.hover,
    chip: colorScheme.chip,
    swatch: colorScheme.swatch,
    // 복합 클래스 조합
    card: clsx(colorScheme.background, colorScheme.border, 'border-l-4 p-3 rounded-lg'),
    badge: clsx(colorScheme.chip, 'px-2 py-1 rounded-full text-xs font-medium inline-flex items-center'),
    legendSwatch: clsx(colorScheme.swatch, LEGEND_STYLES.swatch.base, LEGEND_STYLES.swatch.size),
    eventCard: clsx(
      EVENT_CARD_STYLES.base,
      EVENT_CARD_STYLES.borderBase,
      colorScheme.background,
      colorScheme.border
    )
  }
}

/**
 * 페이즈 타입별 스타일 클래스 반환
 */
export function getPhaseTypeClasses(phaseType: ProjectPhaseType) {
  const styles = PHASE_TYPE_STYLES[phaseType]
  
  if (!styles) {
    // 기본 스타일 반환
    return {
      dot: 'bg-gray-500',
      text: 'text-gray-600',
      badge: 'bg-gray-100 text-gray-800',
      border: 'border-l-gray-500',
      name: '미정'
    }
  }
  
  return {
    ...styles,
    // 복합 클래스 조합
    indicator: clsx(styles.dot, 'w-2 h-2 rounded-full flex-shrink-0'),
    label: clsx(styles.text, 'font-medium text-sm'),
    chip: clsx(styles.badge, 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium'),
    timeline: clsx(styles.dot, 'w-3 h-3 rounded-full border-2 border-white shadow-sm')
  }
}

/**
 * 충돌 심각도별 스타일 클래스 반환
 */
export function getConflictClasses(severity: 'error' | 'warning' | 'info') {
  const styles = CONFLICT_SEVERITY_STYLES[severity]
  
  return {
    ...styles,
    // 복합 클래스 조합
    cell: clsx(
      styles.background,
      styles.border,
      'border-l-4 relative overflow-hidden'
    ),
    indicator: clsx(
      styles.indicator,
      'w-2 h-2 rounded-full border border-white shadow-sm',
      severity === 'error' && 'animate-pulse'
    ),
    card: clsx(
      styles.background,
      styles.hover,
      'border-l-4 p-3 rounded-lg relative overflow-hidden transition-colors duration-200',
      styles.border
    ),
    alert: clsx(
      styles.alert,
      'p-4 rounded-lg border flex items-start gap-3 mb-4'
    ),
    toast: clsx(
      styles.background,
      styles.text,
      'p-4 rounded-lg shadow-lg border flex items-center gap-3'
    ),
    badge: clsx(
      styles.badge,
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium'
    )
  }
}

/**
 * 캘린더 셀 스타일 클래스 생성
 */
export function getCalendarCellClasses(options: {
  isCurrentMonth?: boolean
  isToday?: boolean
  isSelected?: boolean
  isFocused?: boolean
  isWeekend?: boolean
  hasConflicts?: boolean
  conflictSeverity?: 'warning' | 'error' | 'info'
  isClickable?: boolean
}) {
  const {
    isCurrentMonth = true,
    isToday = false,
    isSelected = false,
    isFocused = false,
    isWeekend = false,
    hasConflicts = false,
    conflictSeverity,
    isClickable = true
  } = options
  
  return clsx(
    CALENDAR_CELL_STYLES.base,
    isClickable && CALENDAR_CELL_STYLES.hover,
    isClickable && 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
    !isCurrentMonth && CALENDAR_CELL_STYLES.otherMonth,
    isCurrentMonth && CALENDAR_CELL_STYLES.default,
    isToday && CALENDAR_CELL_STYLES.today,
    isSelected && CALENDAR_CELL_STYLES.selected,
    isFocused && CALENDAR_CELL_STYLES.focused,
    isWeekend && !isToday && CALENDAR_CELL_STYLES.weekend,
    hasConflicts && conflictSeverity && CONFLICT_SEVERITY_STYLES[conflictSeverity].background,
    hasConflicts && conflictSeverity && CONFLICT_SEVERITY_STYLES[conflictSeverity].border,
    ANIMATION_STYLES.transition.default
  )
}

/**
 * 이벤트 카드 스타일 클래스 생성
 */
export function getEventCardClasses(options: {
  projectId?: string
  isConflicting?: boolean
  conflictSeverity?: 'warning' | 'error'
  isSelected?: boolean
  isDragging?: boolean
  phaseType?: ProjectPhaseType
}) {
  const { 
    projectId, 
    isConflicting = false, 
    conflictSeverity, 
    isSelected = false,
    isDragging = false,
    phaseType 
  } = options
  
  // 프로젝트 색상 적용
  const projectColors = projectId ? getProjectColorClasses(projectId) : null
  
  return clsx(
    EVENT_CARD_STYLES.base,
    EVENT_CARD_STYLES.borderBase,
    'text-gray-800 bg-white',
    
    // 충돌 상태 스타일
    isConflicting && conflictSeverity === 'error' 
      ? EVENT_CARD_STYLES.conflictError
      : isConflicting && conflictSeverity === 'warning'
      ? EVENT_CARD_STYLES.conflictWarning
      : EVENT_CARD_STYLES.default,
    
    // 선택 상태
    isSelected && EVENT_CARD_STYLES.selected,
    
    // 드래그 상태
    isDragging && EVENT_CARD_STYLES.dragging,
    
    // 프로젝트 색상
    projectColors && !isConflicting && projectColors.background,
    projectColors && !isConflicting && projectColors.border,
    
    // 전환 효과
    ANIMATION_STYLES.transition.default
  )
}

/**
 * 프로젝트 상태 뱃지 클래스 반환
 */
export function getProjectStatusClasses(status: Project['status']) {
  const statusStyle = PROJECT_STATUS_STYLES[status]
  
  if (!statusStyle) {
    return PROJECT_STATUS_STYLES.planned.badge
  }
  
  return clsx(
    statusStyle.badge,
    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border transition-colors duration-200'
  )
}

/**
 * 프로젝트 범례 카드 스타일 생성
 */
export function getProjectLegendCardClasses(options: {
  isVisible?: boolean
  hasConflicts?: boolean
  isHovered?: boolean
}) {
  const { isVisible = true, hasConflicts = false, isHovered = false } = options
  
  return clsx(
    LEGEND_STYLES.card.base,
    isVisible ? LEGEND_STYLES.card.visible : LEGEND_STYLES.card.hidden,
    hasConflicts && LEGEND_STYLES.card.conflict,
    (isHovered || isVisible) && LEGEND_STYLES.card.hover,
    ANIMATION_STYLES.transition.default
  )
}

/**
 * 필터 체크박스 스타일 생성
 */
export function getFilterCheckboxClasses(isChecked: boolean) {
  return {
    input: clsx(
      FILTER_STYLES.checkbox.input,
      ANIMATION_STYLES.transition.colors
    ),
    label: clsx(
      FILTER_STYLES.checkbox.label,
      isChecked ? 'text-gray-900 font-medium' : 'text-gray-700'
    )
  }
}

/**
 * 드래그 앤 드롭 상태별 스타일 생성
 */
export function getDragDropClasses(state: 'preview' | 'validDrop' | 'invalidDrop' | 'dragging' | 'ghost') {
  const styleMap = {
    preview: DRAG_DROP_STYLES.preview,
    validDrop: DRAG_DROP_STYLES.dropZoneValid,
    invalidDrop: DRAG_DROP_STYLES.dropZoneInvalid,
    dragging: DRAG_DROP_STYLES.dragging,
    ghost: DRAG_DROP_STYLES.ghost
  }
  
  return clsx(
    styleMap[state],
    ANIMATION_STYLES.transition.transform
  )
}

/**
 * 캘린더 필터 퀵 토글 버튼 스타일
 */
export function getFilterQuickToggleClasses(isActive: boolean) {
  return clsx(
    FILTER_STYLES.quickToggle.base,
    isActive 
      ? FILTER_STYLES.quickToggle.active 
      : FILTER_STYLES.quickToggle.inactive,
    ANIMATION_STYLES.transition.colors
  )
}

/**
 * 타임라인 이벤트 연결선 스타일
 */
export function getTimelineConnectorClasses(phaseType: ProjectPhaseType, isCompleted: boolean) {
  const phaseStyles = getPhaseTypeClasses(phaseType)
  
  return clsx(
    'w-0.5 h-full absolute left-1/2 transform -translate-x-1/2',
    isCompleted ? phaseStyles.dot : 'bg-gray-300',
    ANIMATION_STYLES.transition.colors
  )
}

/**
 * 프로젝트 색상 스왓치 스타일 생성
 */
export function getProjectSwatchStyle(projectId: string, options: {
  hasConflict?: boolean
  isSelected?: boolean
  size?: 'sm' | 'md' | 'lg'
} = {}) {
  const { hasConflict = false, isSelected = false, size = 'md' } = options
  const colors = getProjectColorClasses(projectId)
  
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  }
  
  return {
    className: clsx(
      colors.swatch,
      sizeClasses[size],
      'rounded-sm border-2 shadow-sm transition-all duration-200',
      hasConflict && 'animate-pulse border-dashed border-red-500',
      isSelected && 'ring-2 ring-blue-500 ring-offset-1',
      'hover:scale-110 cursor-pointer'
    ),
    style: hasConflict ? { borderColor: '#ef4444' } : undefined
  }
}

/**
 * 반응형 그리드 클래스 생성
 */
export function getResponsiveGridClasses(itemCount: number) {
  if (itemCount <= 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-4'
  if (itemCount <= 6) return 'grid grid-cols-2 sm:grid-cols-3 gap-4'
  return 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4'
}

/**
 * 접근성 포커스 링 스타일
 */
export function getFocusRingClasses(colorScheme: 'blue' | 'red' | 'green' | 'yellow' = 'blue') {
  const colorMap = {
    blue: 'focus:ring-blue-500',
    red: 'focus:ring-red-500',
    green: 'focus:ring-green-500',
    yellow: 'focus:ring-yellow-500'
  }
  
  return clsx(
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    colorMap[colorScheme],
    ANIMATION_STYLES.transition.default
  )
}

// 헬퍼: 프로젝트 ID를 일관된 숫자로 해싱
function hashProjectId(projectId: string): number {
  let hash = 0
  for (let i = 0; i < projectId.length; i++) {
    const char = projectId.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * CSS 변수를 사용한 동적 색상 생성 (고급 기능)
 */
export function generateCustomColorVars(projectId: string) {
  const colors = getProjectColorClasses(projectId)
  const colorScheme = PROJECT_COLOR_CLASSES[hashProjectId(projectId) % PROJECT_COLOR_CLASSES.length]
  
  // Tailwind 색상 값 추출 (실제 구현에서는 색상 값 매핑 필요)
  const colorMap: Record<string, string> = {
    blue: '59 130 246',
    emerald: '16 185 129',
    amber: '245 158 11',
    purple: '147 51 234',
    rose: '244 63 94',
    teal: '20 184 166',
    orange: '249 115 22',
    indigo: '99 102 241',
    lime: '163 230 53',
    pink: '236 72 153',
    cyan: '6 182 212',
    slate: '100 116 139'
  }
  
  const baseColor = colorMap[colorScheme.id] || colorMap.blue
  
  return {
    '--project-color': baseColor,
    '--project-color-50': `rgb(${baseColor} / 0.05)`,
    '--project-color-100': `rgb(${baseColor} / 0.1)`,
    '--project-color-200': `rgb(${baseColor} / 0.2)`,
    '--project-color-500': `rgb(${baseColor})`,
    '--project-color-700': `rgb(${baseColor} / 0.8)`
  } as React.CSSProperties
}