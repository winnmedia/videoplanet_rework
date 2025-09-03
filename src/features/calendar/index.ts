// Calendar Feature Public API

// Types
export type {
  CalendarState,
  CalendarEvent,
  EventParticipant,
  Resource,
  ResourceAvailability,
  EventConflict,
  ConflictSuggestion,
  CalendarFilters,
  CreateEventData,
  UpdateEventData,
  EventRSVPData,
  CalendarActions,
  CalendarEvent_RT
} from './model/types'

export type { CalendarView } from './model/types'

// Redux State Management
export { default as calendarReducer } from './model/calendarSlice'
export {
  setView,
  setCurrentDate,
  navigateToToday,
  navigateToPrevious,
  navigateToNext,
  loadEventsStart,
  loadEventsSuccess,
  loadEventsFailure,
  createEventStart,
  createEventSuccess,
  createEventFailure,
  updateEventSuccess,
  deleteEventSuccess,
  duplicateEventSuccess,
  selectEvent,
  updateParticipantResponse,
  loadResourcesSuccess,
  bookResourceSuccess,
  releaseResourceSuccess,
  detectConflictsSuccess,
  resolveConflictSuccess,
  ignoreConflictSuccess,
  setFilters,
  clearFilters,
  bulkUpdateEvents,
  bulkDeleteEvents,
  importEventsStart,
  importEventsSuccess,
  importEventsFailure,
  handleRealtimeEventUpdate,
  clearError,
  resetState
} from './model/calendarSlice'