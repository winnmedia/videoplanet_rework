/**
 * 캘린더 UI 스타일 상수
 * @description Tailwind CSS 기반 캘린더 컴포넌트 스타일 정의
 * @layer entities/calendar/constants
 */

// 프로젝트 색상 팔레트 (12개 WCAG AA 준수)
export const PROJECT_COLOR_CLASSES = [
  {
    id: 'vridge',
    name: 'VRidge Blue',
    background: 'bg-blue-100/20',
    border: 'border-l-blue-700',
    borderColor: 'border-blue-700',
    text: 'text-blue-700',
    hover: 'hover:bg-blue-100/30',
    chip: 'bg-blue-100 text-blue-700',
    swatch: 'bg-blue-500 border-blue-700'
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    background: 'bg-emerald-100/20',
    border: 'border-l-emerald-700',
    borderColor: 'border-emerald-700',
    text: 'text-emerald-700',
    hover: 'hover:bg-emerald-100/30',
    chip: 'bg-emerald-100 text-emerald-700',
    swatch: 'bg-emerald-500 border-emerald-700'
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    background: 'bg-amber-100/20',
    border: 'border-l-amber-700',
    borderColor: 'border-amber-700',
    text: 'text-amber-700',
    hover: 'hover:bg-amber-100/30',
    chip: 'bg-amber-100 text-amber-700',
    swatch: 'bg-amber-500 border-amber-700'
  },
  {
    id: 'purple',
    name: 'Purple Violet',
    background: 'bg-purple-100/20',
    border: 'border-l-purple-700',
    borderColor: 'border-purple-700',
    text: 'text-purple-700',
    hover: 'hover:bg-purple-100/30',
    chip: 'bg-purple-100 text-purple-700',
    swatch: 'bg-purple-500 border-purple-700'
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    background: 'bg-rose-100/20',
    border: 'border-l-rose-700',
    borderColor: 'border-rose-700',
    text: 'text-rose-700',
    hover: 'hover:bg-rose-100/30',
    chip: 'bg-rose-100 text-rose-700',
    swatch: 'bg-rose-500 border-rose-700'
  },
  {
    id: 'teal',
    name: 'Teal Cyan',
    background: 'bg-teal-100/20',
    border: 'border-l-teal-700',
    borderColor: 'border-teal-700',
    text: 'text-teal-700',
    hover: 'hover:bg-teal-100/30',
    chip: 'bg-teal-100 text-teal-700',
    swatch: 'bg-teal-500 border-teal-700'
  },
  {
    id: 'orange',
    name: 'Orange Fire',
    background: 'bg-orange-100/20',
    border: 'border-l-orange-700',
    borderColor: 'border-orange-700',
    text: 'text-orange-700',
    hover: 'hover:bg-orange-100/30',
    chip: 'bg-orange-100 text-orange-700',
    swatch: 'bg-orange-500 border-orange-700'
  },
  {
    id: 'indigo',
    name: 'Indigo Deep',
    background: 'bg-indigo-100/20',
    border: 'border-l-indigo-700',
    borderColor: 'border-indigo-700',
    text: 'text-indigo-700',
    hover: 'hover:bg-indigo-100/30',
    chip: 'bg-indigo-100 text-indigo-700',
    swatch: 'bg-indigo-500 border-indigo-700'
  },
  {
    id: 'lime',
    name: 'Lime Fresh',
    background: 'bg-lime-100/20',
    border: 'border-l-lime-700',
    borderColor: 'border-lime-700',
    text: 'text-lime-700',
    hover: 'hover:bg-lime-100/30',
    chip: 'bg-lime-100 text-lime-700',
    swatch: 'bg-lime-500 border-lime-700'
  },
  {
    id: 'pink',
    name: 'Pink Magenta',
    background: 'bg-pink-100/20',
    border: 'border-l-pink-700',
    borderColor: 'border-pink-700',
    text: 'text-pink-700',
    hover: 'hover:bg-pink-100/30',
    chip: 'bg-pink-100 text-pink-700',
    swatch: 'bg-pink-500 border-pink-700'
  },
  {
    id: 'cyan',
    name: 'Cyan Sky',
    background: 'bg-cyan-100/20',
    border: 'border-l-cyan-700',
    borderColor: 'border-cyan-700',
    text: 'text-cyan-700',
    hover: 'hover:bg-cyan-100/30',
    chip: 'bg-cyan-100 text-cyan-700',
    swatch: 'bg-cyan-500 border-cyan-700'
  },
  {
    id: 'slate',
    name: 'Slate Gray',
    background: 'bg-slate-100/20',
    border: 'border-l-slate-700',
    borderColor: 'border-slate-700',
    text: 'text-slate-700',
    hover: 'hover:bg-slate-100/30',
    chip: 'bg-slate-100 text-slate-700',
    swatch: 'bg-slate-500 border-slate-700'
  }
] as const

// 페이즈 타입별 스타일
export const PHASE_TYPE_STYLES = {
  'pre-production': {
    dot: 'bg-blue-500',
    text: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-800',
    border: 'border-l-blue-500',
    name: '사전 제작'
  },
  'production': {
    dot: 'bg-green-500',
    text: 'text-green-600',
    badge: 'bg-green-100 text-green-800',
    border: 'border-l-green-500',
    conflictBadge: 'bg-yellow-100 text-yellow-800',
    name: '제작'
  },
  'post-production': {
    dot: 'bg-purple-500',
    text: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-800',
    border: 'border-l-purple-500',
    name: '후반 작업'
  },
  'review': {
    dot: 'bg-amber-500',
    text: 'text-amber-600',
    badge: 'bg-amber-100 text-amber-800',
    border: 'border-l-amber-500',
    name: '검토'
  },
  'delivery': {
    dot: 'bg-gray-500',
    text: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-800',
    border: 'border-l-gray-500',
    name: '납품'
  }
} as const

// 충돌 심각도별 스타일
export const CONFLICT_SEVERITY_STYLES = {
  error: {
    background: 'bg-red-50',
    border: 'border-red-500',
    borderDashed: 'border-red-500 border-dashed',
    text: 'text-red-700',
    indicator: 'bg-red-500',
    indicatorAnimate: 'bg-red-500 animate-pulse',
    badge: 'bg-red-100 text-red-800',
    hover: 'hover:bg-red-100',
    pattern: 'text-red-500',
    alert: 'bg-red-50 border-red-200',
    alertIcon: '🚨',
    alertText: '심각한 충돌이 발생했습니다'
  },
  warning: {
    background: 'bg-amber-50',
    border: 'border-amber-500',
    borderDashed: 'border-amber-500 border-dashed',
    text: 'text-amber-700',
    indicator: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    hover: 'hover:bg-amber-100',
    pattern: 'text-amber-500',
    alert: 'bg-amber-50 border-amber-200',
    alertIcon: '⚠️',
    alertText: '일정 충돌이 감지되었습니다'
  },
  info: {
    background: 'bg-blue-50',
    border: 'border-blue-500',
    borderDashed: 'border-blue-500 border-dashed',
    text: 'text-blue-700',
    indicator: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    hover: 'hover:bg-blue-100',
    pattern: 'text-blue-500',
    alert: 'bg-blue-50 border-blue-200',
    alertIcon: 'ℹ️',
    alertText: '정보성 알림입니다'
  }
} as const

// 캘린더 셀 상태 스타일
export const CALENDAR_CELL_STYLES = {
  default: 'bg-white text-gray-900 border border-gray-200',
  otherMonth: 'bg-gray-50 text-gray-400',
  today: 'bg-blue-50 border-blue-200 ring-1 ring-blue-200',
  selected: 'ring-2 ring-blue-500 ring-inset bg-blue-50',
  focused: 'ring-2 ring-blue-400 ring-offset-1 outline-none',
  weekend: 'bg-gray-50',
  hover: 'hover:bg-gray-50 hover:border-gray-300',
  base: 'min-h-32 border-r border-b border-gray-100 p-2 cursor-pointer transition-all duration-200 relative'
} as const

// 프로젝트 상태 스타일
export const PROJECT_STATUS_STYLES = {
  active: {
    badge: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
    text: '진행중',
    ring: 'ring-green-200'
  },
  completed: {
    badge: 'bg-gray-100 text-gray-800 border-gray-200',
    dot: 'bg-gray-500',
    text: '완료',
    ring: 'ring-gray-200'
  },
  'on-hold': {
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    dot: 'bg-yellow-500',
    text: '보류',
    ring: 'ring-yellow-200'
  },
  cancelled: {
    badge: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
    text: '취소',
    ring: 'ring-red-200'
  },
  planned: {
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
    text: '계획됨',
    ring: 'ring-blue-200'
  }
} as const

// 필터 컴포넌트 스타일
export const FILTER_STYLES = {
  container: 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden',
  header: 'flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50',
  section: 'p-4 border-b border-gray-100 last:border-b-0',
  sectionTitle: 'text-sm font-medium text-gray-900 mb-3',
  badge: {
    active: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200',
    count: 'inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-red-500 text-white ml-2'
  },
  checkbox: {
    input: 'rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0',
    label: 'ml-2 text-sm text-gray-700 cursor-pointer select-none'
  },
  quickToggle: {
    active: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200',
    inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200',
    base: 'inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 border'
  },
  clearButton: 'text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors'
} as const

// 드래그 앤 드롭 스타일
export const DRAG_DROP_STYLES = {
  preview: 'bg-blue-100 opacity-75 border-2 border-dashed border-blue-400',
  dropZoneValid: 'bg-green-100 border-2 border-dashed border-green-500 transition-colors duration-200',
  dropZoneInvalid: 'bg-red-50 border-2 border-dashed border-red-500 transition-colors duration-200',
  dragging: 'opacity-50 cursor-move scale-105 rotate-2 shadow-lg z-50',
  dragHandle: 'cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors',
  ghost: 'opacity-30 pointer-events-none'
} as const

// 범례(Legend) 스타일
export const LEGEND_STYLES = {
  container: 'bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden',
  header: 'flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50',
  headerTitle: 'text-sm font-medium text-gray-900',
  headerToggle: 'text-xs text-blue-600 hover:text-blue-800 cursor-pointer transition-colors',
  grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-4',
  card: {
    visible: 'bg-white border-gray-200 shadow-sm cursor-pointer transition-all duration-200',
    hidden: 'bg-gray-50 border-gray-200 opacity-60 cursor-pointer transition-all duration-200',
    conflict: 'ring-1 ring-red-200 bg-red-50 border-red-200',
    hover: 'hover:shadow-md hover:border-gray-300 hover:scale-105',
    base: 'p-3 border rounded-lg flex items-center gap-3'
  },
  swatch: {
    size: 'w-4 h-4 flex-shrink-0',
    base: 'rounded-sm border-2 shadow-sm transition-all duration-200',
    pulse: 'animate-pulse'
  },
  cardContent: {
    title: 'text-sm font-medium text-gray-900 truncate',
    subtitle: 'text-xs text-gray-500 truncate',
    badge: 'inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium'
  }
} as const

// 이벤트 카드 스타일
export const EVENT_CARD_STYLES = {
  base: 'text-xs px-2 py-1 rounded-md text-left w-full transition-all duration-200 cursor-pointer select-none',
  borderBase: 'border-l-2 hover:shadow-sm focus:ring-1 focus:ring-blue-500 focus:outline-none',
  default: 'border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50',
  conflictError: 'border-l-4 border-red-500 bg-red-50 hover:bg-red-100 animate-pulse',
  conflictWarning: 'border-l-4 border-amber-500 bg-amber-50 hover:bg-amber-100',
  selected: 'ring-2 ring-blue-500 ring-inset bg-blue-50',
  dragging: 'shadow-lg z-50 rotate-2 scale-105',
  content: {
    title: 'font-medium text-gray-900 truncate mb-1',
    time: 'text-gray-500 text-xs',
    status: 'text-xs font-medium px-1 py-0.5 rounded'
  }
} as const

// 공통 애니메이션 및 전환 클래스
export const ANIMATION_STYLES = {
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  spin: 'animate-spin',
  transition: {
    default: 'transition-all duration-200',
    fast: 'transition-all duration-100',
    slow: 'transition-all duration-300',
    colors: 'transition-colors duration-200',
    transform: 'transition-transform duration-200',
    shadow: 'transition-shadow duration-200'
  },
  fadeIn: 'animate-in fade-in duration-200',
  slideDown: 'animate-in slide-in-from-top-2 duration-200',
  slideUp: 'animate-in slide-in-from-bottom-2 duration-200',
  scaleIn: 'animate-in zoom-in-95 duration-200'
} as const

// 알림 및 토스트 스타일
export const TOAST_STYLES = {
  container: 'fixed top-4 right-4 z-50 space-y-2',
  base: 'flex items-center p-4 rounded-lg shadow-lg border max-w-sm',
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  icon: {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  },
  closeButton: 'ml-auto text-gray-400 hover:text-gray-600 cursor-pointer'
} as const

// 모달 및 다이얼로그 스타일
export const MODAL_STYLES = {
  overlay: 'fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4',
  container: 'bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto',
  header: 'flex items-center justify-between p-6 border-b border-gray-200',
  title: 'text-lg font-semibold text-gray-900',
  closeButton: 'text-gray-400 hover:text-gray-600 cursor-pointer transition-colors',
  body: 'p-6',
  footer: 'flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50'
} as const

// 버튼 스타일 변형
export const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 border-transparent',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 border-transparent',
  outline: 'bg-transparent text-blue-600 hover:bg-blue-50 focus:ring-blue-500 border-blue-600',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 border-transparent',
  base: 'inline-flex items-center px-4 py-2 border font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200'
} as const