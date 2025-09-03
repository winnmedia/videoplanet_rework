import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { 
  CalendarState, 
  CalendarEvent, 
  CalendarView,
  CalendarFilters,
  Resource,
  EventConflict
} from './types'

const initialState: CalendarState = {
  events: [],
  currentView: 'month',
  currentDate: new Date().toISOString().split('T')[0],
  selectedEvent: null,
  isLoading: false,
  error: null,
  filters: {
    showPrivate: true,
    showDeclined: false,
    showConflicts: true
  },
  conflicts: [],
  resources: []
}

const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    // View Management
    setView: (state, action: PayloadAction<CalendarView>) => {
      state.currentView = action.payload
    },
    setCurrentDate: (state, action: PayloadAction<string>) => {
      state.currentDate = action.payload
    },
    navigateToToday: (state) => {
      state.currentDate = new Date().toISOString().split('T')[0]
    },
    navigateToPrevious: (state) => {
      const currentDate = new Date(state.currentDate)
      switch (state.currentView) {
        case 'day':
          currentDate.setDate(currentDate.getDate() - 1)
          break
        case 'week':
          currentDate.setDate(currentDate.getDate() - 7)
          break
        case 'month':
          currentDate.setMonth(currentDate.getMonth() - 1)
          break
        default:
          currentDate.setDate(currentDate.getDate() - 1)
      }
      state.currentDate = currentDate.toISOString().split('T')[0]
    },
    navigateToNext: (state) => {
      const currentDate = new Date(state.currentDate)
      switch (state.currentView) {
        case 'day':
          currentDate.setDate(currentDate.getDate() + 1)
          break
        case 'week':
          currentDate.setDate(currentDate.getDate() + 7)
          break
        case 'month':
          currentDate.setMonth(currentDate.getMonth() + 1)
          break
        default:
          currentDate.setDate(currentDate.getDate() + 1)
      }
      state.currentDate = currentDate.toISOString().split('T')[0]
    },

    // Event Loading
    loadEventsStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    loadEventsSuccess: (state, action: PayloadAction<{ events: CalendarEvent[] }>) => {
      state.isLoading = false
      state.events = action.payload.events
    },
    loadEventsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // Event Management
    createEventStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    createEventSuccess: (state, action: PayloadAction<{ event: CalendarEvent }>) => {
      state.isLoading = false
      state.events.push(action.payload.event)
      // 시작 시간순으로 정렬
      state.events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    },
    createEventFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    updateEventSuccess: (state, action: PayloadAction<{ 
      eventId: string
      updates: Partial<CalendarEvent>
    }>) => {
      const { eventId, updates } = action.payload
      const eventIndex = state.events.findIndex(e => e.id === eventId)
      if (eventIndex !== -1) {
        state.events[eventIndex] = { ...state.events[eventIndex], ...updates }
        // 시간이 변경된 경우 재정렬
        if (updates.startDate || updates.endDate) {
          state.events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        }
      }
    },

    deleteEventSuccess: (state, action: PayloadAction<{ eventId: string }>) => {
      state.events = state.events.filter(e => e.id !== action.payload.eventId)
      if (state.selectedEvent === action.payload.eventId) {
        state.selectedEvent = null
      }
    },

    duplicateEventSuccess: (state, action: PayloadAction<{ event: CalendarEvent }>) => {
      state.events.push(action.payload.event)
      state.events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    },

    // Event Selection
    selectEvent: (state, action: PayloadAction<string | null>) => {
      state.selectedEvent = action.payload
    },

    // Participant Management  
    updateParticipantResponse: (state, action: PayloadAction<{
      eventId: string
      participantId: string
      status: string
      responseDate: string
    }>) => {
      const { eventId, participantId, status, responseDate } = action.payload
      const event = state.events.find(e => e.id === eventId)
      if (event) {
        const participant = event.participants.find(p => p.id === participantId)
        if (participant) {
          participant.status = status as 'pending' | 'accepted' | 'declined' | 'tentative'
          participant.responseDate = responseDate
        }
      }
    },

    // Resource Management
    loadResourcesSuccess: (state, action: PayloadAction<{ resources: Resource[] }>) => {
      state.resources = action.payload.resources
    },

    bookResourceSuccess: (state, action: PayloadAction<{ 
      resourceId: string
      eventId: string
    }>) => {
      const event = state.events.find(e => e.id === action.payload.eventId)
      if (event && !event.resourceIds.includes(action.payload.resourceId)) {
        event.resourceIds.push(action.payload.resourceId)
      }
    },

    releaseResourceSuccess: (state, action: PayloadAction<{ 
      resourceId: string
      eventId: string
    }>) => {
      const event = state.events.find(e => e.id === action.payload.eventId)
      if (event) {
        event.resourceIds = event.resourceIds.filter(id => id !== action.payload.resourceId)
      }
    },

    // Conflict Management
    detectConflictsSuccess: (state, action: PayloadAction<{ conflicts: EventConflict[] }>) => {
      state.conflicts = action.payload.conflicts
    },

    resolveConflictSuccess: (state, action: PayloadAction<{ conflictId: string }>) => {
      const conflictIndex = state.conflicts.findIndex(c => c.id === action.payload.conflictId)
      if (conflictIndex !== -1) {
        state.conflicts[conflictIndex].isResolved = true
        state.conflicts[conflictIndex].resolvedAt = new Date().toISOString()
      }
    },

    ignoreConflictSuccess: (state, action: PayloadAction<{ conflictId: string }>) => {
      state.conflicts = state.conflicts.filter(c => c.id !== action.payload.conflictId)
    },

    // Filtering
    setFilters: (state, action: PayloadAction<Partial<CalendarFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearFilters: (state) => {
      state.filters = {
        showPrivate: true,
        showDeclined: false,
        showConflicts: true
      }
    },

    // Batch Operations
    bulkUpdateEvents: (state, action: PayloadAction<{ 
      eventIds: string[]
      updates: Partial<CalendarEvent>
    }>) => {
      const { eventIds, updates } = action.payload
      eventIds.forEach(eventId => {
        const eventIndex = state.events.findIndex(e => e.id === eventId)
        if (eventIndex !== -1) {
          state.events[eventIndex] = { ...state.events[eventIndex], ...updates }
        }
      })
    },

    bulkDeleteEvents: (state, action: PayloadAction<{ eventIds: string[] }>) => {
      const eventIds = new Set(action.payload.eventIds)
      state.events = state.events.filter(e => !eventIds.has(e.id))
      if (state.selectedEvent && eventIds.has(state.selectedEvent)) {
        state.selectedEvent = null
      }
    },

    // Import/Export
    importEventsStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    importEventsSuccess: (state, action: PayloadAction<{ 
      events: CalendarEvent[]
      importedCount: number
    }>) => {
      state.isLoading = false
      state.events = [...state.events, ...action.payload.events]
      state.events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    },
    importEventsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // Real-time updates
    handleRealtimeEventUpdate: (state, action: PayloadAction<{
      type: 'created' | 'updated' | 'deleted'
      event?: CalendarEvent
      eventId?: string
      updates?: Partial<CalendarEvent>
    }>) => {
      const { type, event, eventId, updates } = action.payload
      
      switch (type) {
        case 'created':
          if (event) {
            state.events.push(event)
            state.events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          }
          break
          
        case 'updated':
          if (eventId && updates) {
            const eventIndex = state.events.findIndex(e => e.id === eventId)
            if (eventIndex !== -1) {
              state.events[eventIndex] = { ...state.events[eventIndex], ...updates }
            }
          }
          break
          
        case 'deleted':
          if (eventId) {
            state.events = state.events.filter(e => e.id !== eventId)
            if (state.selectedEvent === eventId) {
              state.selectedEvent = null
            }
          }
          break
      }
    },

    // Utility
    clearError: (state) => {
      state.error = null
    },
    resetState: () => initialState
  }
})

export const {
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
} = calendarSlice.actions

export default calendarSlice.reducer