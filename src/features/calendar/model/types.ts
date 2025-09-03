// Calendar Feature Types

export interface CalendarState {
  events: CalendarEvent[]
  currentView: CalendarView
  currentDate: string
  selectedEvent: string | null
  isLoading: boolean
  error: string | null
  filters: CalendarFilters
  conflicts: EventConflict[]
  resources: Resource[]
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  type: 'meeting' | 'deadline' | 'milestone' | 'review' | 'shoot' | 'personal'
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  
  // Time information
  startDate: string
  endDate: string
  isAllDay: boolean
  timezone?: string
  duration: number // in minutes
  
  // Recurrence
  recurrence?: {
    frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    endDate?: string
    count?: number
    byWeekDay?: number[]
    byMonthDay?: number[]
  }
  
  // Project/Resource association
  projectId?: string
  resourceIds: string[]
  location?: string
  
  // Participants
  organizer: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  participants: EventParticipant[]
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  
  // Settings
  settings: {
    isPrivate: boolean
    allowGuests: boolean
    requireApproval: boolean
    sendReminders: boolean
    reminderIntervals: number[] // minutes before event
  }
  
  // Integration
  externalIds?: {
    googleCalendar?: string
    outlook?: string
    zoom?: string
  }
  
  // Custom fields
  customFields?: Record<string, unknown>
}

export interface EventParticipant {
  id: string
  userId?: string
  name: string
  email: string
  avatar?: string
  role: 'organizer' | 'required' | 'optional' | 'resource'
  status: 'pending' | 'accepted' | 'declined' | 'tentative' | 'no_response'
  responseDate?: string
  isExternal: boolean
}

export interface Resource {
  id: string
  name: string
  type: 'room' | 'equipment' | 'vehicle' | 'person' | 'virtual'
  description?: string
  capacity?: number
  location?: string
  features: string[]
  availability: ResourceAvailability[]
  bookingRules: {
    maxDuration?: number // minutes
    minAdvanceBooking?: number // minutes  
    maxAdvanceBooking?: number // minutes
    requireApproval: boolean
    allowRecurring: boolean
    conflictResolution: 'block' | 'queue' | 'override'
  }
  cost?: {
    currency: string
    amount: number
    per: 'hour' | 'day' | 'event'
  }
  isActive: boolean
}

export interface ResourceAvailability {
  id: string
  resourceId: string
  dayOfWeek: number // 0 = Sunday
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  isAvailable: boolean
  exceptions: Array<{
    date: string
    startTime?: string
    endTime?: string
    isAvailable: boolean
    reason?: string
  }>
}

export interface EventConflict {
  id: string
  type: 'resource' | 'participant' | 'time' | 'location'
  severity: 'warning' | 'error' | 'info'
  message: string
  events: string[] // conflicting event IDs
  suggestions: ConflictSuggestion[]
  isResolved: boolean
  resolvedAt?: string
  resolvedBy?: string
}

export interface ConflictSuggestion {
  id: string
  type: 'reschedule' | 'change_resource' | 'remove_participant' | 'split_event'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  autoApplicable: boolean
  changes: {
    eventId: string
    fieldChanges: Record<string, unknown>
  }[]
}

export type CalendarView = 
  | 'month' 
  | 'week' 
  | 'day' 
  | 'agenda' 
  | 'timeline'
  | 'gantt'
  | 'resource'

export interface CalendarFilters {
  eventTypes?: string[]
  projectIds?: string[]
  resourceIds?: string[]
  participantIds?: string[]
  statuses?: string[]
  priorities?: string[]
  dateRange?: {
    start: string
    end: string
  }
  showPrivate: boolean
  showDeclined: boolean
  showConflicts: boolean
  searchQuery?: string
}

// Form Data Types
export interface CreateEventData {
  title: string
  description?: string
  type: 'meeting' | 'deadline' | 'milestone' | 'review' | 'shoot' | 'personal'
  startDate: string
  endDate: string
  isAllDay: boolean
  timezone?: string
  
  projectId?: string
  resourceIds?: string[]
  location?: string
  
  participants: Array<{
    email: string
    role: 'required' | 'optional'
  }>
  
  recurrence?: {
    frequency: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
    interval: number
    endDate?: string
    count?: number
  }
  
  settings: {
    isPrivate: boolean
    allowGuests: boolean
    requireApproval: boolean
    sendReminders: boolean
    reminderIntervals: number[]
  }
  
  customFields?: Record<string, unknown>
}

export interface UpdateEventData {
  title?: string
  description?: string
  type?: 'meeting' | 'deadline' | 'milestone' | 'review' | 'shoot' | 'personal'
  startDate?: string
  endDate?: string
  isAllDay?: boolean
  timezone?: string
  
  projectId?: string
  resourceIds?: string[]
  location?: string
  
  settings?: {
    isPrivate?: boolean
    allowGuests?: boolean
    requireApproval?: boolean
    sendReminders?: boolean
    reminderIntervals?: number[]
  }
  
  customFields?: Record<string, unknown>
}

export interface EventRSVPData {
  status: 'accepted' | 'declined' | 'tentative'
  comment?: string
}

// Action Types
export interface CalendarActions {
  // View Management
  setView: (view: CalendarView) => void
  setCurrentDate: (date: string) => void
  navigateToToday: () => void
  navigateToPrevious: () => void
  navigateToNext: () => void
  
  // Event Management
  loadEvents: (dateRange: { start: string; end: string }) => Promise<void>
  createEvent: (data: CreateEventData) => Promise<string>
  updateEvent: (eventId: string, data: UpdateEventData) => Promise<void>
  deleteEvent: (eventId: string) => Promise<void>
  duplicateEvent: (eventId: string, newStartDate: string) => Promise<string>
  
  // Event Selection
  selectEvent: (eventId: string | null) => void
  
  // Participant Management
  inviteParticipants: (eventId: string, participants: Array<{ email: string; role: string }>) => Promise<void>
  removeParticipant: (eventId: string, participantId: string) => Promise<void>
  respondToInvite: (eventId: string, response: EventRSVPData) => Promise<void>
  
  // Resource Management
  loadResources: () => Promise<void>
  bookResource: (resourceId: string, eventId: string) => Promise<void>
  releaseResource: (resourceId: string, eventId: string) => Promise<void>
  checkResourceAvailability: (resourceId: string, startDate: string, endDate: string) => Promise<boolean>
  
  // Conflict Management
  detectConflicts: (eventId?: string) => Promise<void>
  resolveConflict: (conflictId: string, suggestionId: string) => Promise<void>
  ignoreConflict: (conflictId: string) => Promise<void>
  
  // Filtering
  setFilters: (filters: Partial<CalendarFilters>) => void
  clearFilters: () => void
  searchEvents: (query: string) => void
  
  // Import/Export
  importEvents: (file: File, format: 'ics' | 'csv' | 'json') => Promise<void>
  exportEvents: (format: 'ics' | 'csv' | 'json', dateRange?: { start: string; end: string }) => Promise<Blob>
  
  // Integration
  syncWithExternalCalendar: (provider: 'google' | 'outlook', credentials: unknown) => Promise<void>
  
  // Utility
  clearError: () => void
  resetState: () => void
}

// Event Types for real-time updates
export type CalendarEvent_RT = 
  | { type: 'event_created'; payload: { event: CalendarEvent } }
  | { type: 'event_updated'; payload: { eventId: string; updates: Partial<CalendarEvent> } }
  | { type: 'event_deleted'; payload: { eventId: string } }
  | { type: 'participant_response'; payload: { eventId: string; participantId: string; status: string } }
  | { type: 'conflict_detected'; payload: { conflict: EventConflict } }
  | { type: 'conflict_resolved'; payload: { conflictId: string } }
  | { type: 'resource_booked'; payload: { resourceId: string; eventId: string } }
  | { type: 'resource_released'; payload: { resourceId: string; eventId: string } }