/**
 * Calendar Widget - FSD Public API
 * Feature-Sliced Design 아키텍처에 따른 공개 인터페이스
 * 다른 레이어에서는 이 파일을 통해서만 Calendar 위젯에 접근
 */

// UI Components
export { CalendarWidget } from './ui/CalendarWidget'
export { CalendarGrid } from './ui/CalendarGrid'
export { ScheduleEventCard } from './ui/ScheduleEventCard'
export { DatePicker } from './ui/DatePicker'
export { EventModal } from './ui/EventModal'

// Types and Interfaces
export type {
  // Core Calendar Types
  CalendarViewMode,
  EventCategory,
  EventPriority,
  RecurrenceType,
  CalendarEvent,
  CalendarDay,
  CalendarWeek,
  CalendarMonth,

  // Component Props
  CalendarWidgetProps,
  CalendarGridProps,
  ScheduleEventCardProps,
  DatePickerProps,
  EventModalProps,

  // Calendar State & Context
  CalendarState,
  CalendarActions,

  // API Response Types
  CalendarEventsResponse,
  CalendarEventCreateRequest,
  CalendarEventUpdateRequest,

  // Drag & Drop Types
  DragEventData,
  DropZoneData,

  // Calendar Utilities Types
  TimeSlot,
  CalendarConflict,

  // Mock Data Types
  MockCalendarData
} from './model/types'

// API Layer
export {
  calendarApiClient,
  fetchMonthEvents,
  fetchWeekEvents,
  fetchTodayEvents,
  refreshCalendarData,
  createMockCalendarData,
  mockCalendarApi
} from './api/calendarApi'

export type {
  CalendarApiConfig,
  ApiError
} from './api/calendarApi'

// Utility Functions
export { calculateEventHeight } from './ui/ScheduleEventCard'

// Re-export commonly used utilities
// 향후 유틸리티 함수들이 추가될 경우 여기서 re-export

/**
 * Calendar Widget 사용 가이드
 * 
 * 기본 사용법:
 * ```tsx
 * import { CalendarWidget } from '@/widgets/Calendar'
 * 
 * function MyCalendarPage() {
 *   return (
 *     <CalendarWidget
 *       initialView="month"
 *       events={events}
 *       onDateSelect={(date) => console.log('Selected date:', date)}
 *       onEventClick={(event) => console.log('Event clicked:', event)}
 *     />
 *   )
 * }
 * ```
 * 
 * 주요 기능:
 * - 월간/주간/일간 뷰 전환
 * - 이벤트 생성/편집/삭제
 * - 드래그 앤 드롭으로 이벤트 이동
 * - 프로젝트별 일정 색상 구분
 * - 반복 일정 지원
 * - 일정 충돌 감지
 * - 키보드 네비게이션 지원
 * - 접근성 (WCAG 2.1 AA) 준수
 * - 레거시 디자인 시스템 통합
 * - 반응형 레이아웃
 */