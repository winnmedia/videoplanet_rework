/**
 * Calendar API - Data Layer
 * FSD 아키텍처에 따른 캘린더 데이터 처리 및 API 통신
 */

import { apiClient } from '@/shared/api/client'

import type {
  CalendarEvent,
  CalendarEventsResponse,
  CalendarEventCreateRequest,
  CalendarEventUpdateRequest,
  MockCalendarData
} from '../model/types'

// ===========================
// API Configuration
// ===========================

export interface CalendarApiConfig {
  baseUrl: string
  timeout: number
  retryAttempts: number
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

const defaultConfig: CalendarApiConfig = {
  baseUrl: '/api/calendar',
  timeout: 10000,
  retryAttempts: 3
}

// ===========================
// Calendar API Client
// ===========================

export const calendarApiClient = {
  /**
   * 기간별 캘린더 이벤트 조회
   */
  async getEvents(params: {
    startDate: string // YYYY-MM-DD
    endDate: string   // YYYY-MM-DD
    projectId?: string
    category?: string
    limit?: number
    cursor?: string
  }): Promise<CalendarEventsResponse> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('startDate', params.startDate)
      queryParams.append('endDate', params.endDate)
      
      if (params.projectId) queryParams.append('projectId', params.projectId)
      if (params.category) queryParams.append('category', params.category)
      if (params.limit) queryParams.append('limit', params.limit.toString())
      if (params.cursor) queryParams.append('cursor', params.cursor)

      const response = await apiClient.get<CalendarEventsResponse>(
        `${defaultConfig.baseUrl}/events?${queryParams.toString()}`
      )
      
      if (!response.data) {
        throw new Error('No data received from calendar API')
      }
      if (!response.data) {
        throw new Error('No data received from calendar API')
      }
      return response.data
    } catch (error) {
      throw new Error(`Failed to fetch calendar events: ${error}`)
    }
  },

  /**
   * 특정 이벤트 조회
   */
  async getEventById(eventId: string): Promise<CalendarEvent> {
    try {
      const response = await apiClient.get<CalendarEvent>(
        `${defaultConfig.baseUrl}/events/${eventId}`
      )
      
      if (!response.data) {
        throw new Error('No event data received from calendar API')
      }
      if (!response.data) {
        throw new Error('No data received from calendar API')
      }
      return response.data
    } catch (error) {
      throw new Error(`Failed to fetch calendar event: ${error}`)
    }
  },

  /**
   * 새 이벤트 생성
   */
  async createEvent(eventData: CalendarEventCreateRequest): Promise<CalendarEvent> {
    try {
      const response = await apiClient.post<CalendarEvent>(
        `${defaultConfig.baseUrl}/events`,
        eventData
      )
      if (!response.data) {
        throw new Error('No data received from calendar API')
      }
      return response.data
    } catch (error) {
      throw new Error(`Failed to create calendar event: ${error}`)
    }
  },

  /**
   * 기존 이벤트 업데이트
   */
  async updateEvent(
    eventId: string, 
    updates: CalendarEventUpdateRequest
  ): Promise<CalendarEvent> {
    try {
      const response = await apiClient.put<CalendarEvent>(
        `${defaultConfig.baseUrl}/events/${eventId}`,
        updates
      )
      if (!response.data) {
        throw new Error('No data received from calendar API')
      }
      return response.data
    } catch (error) {
      throw new Error(`Failed to update calendar event: ${error}`)
    }
  },

  /**
   * 이벤트 삭제
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      await apiClient.delete(`${defaultConfig.baseUrl}/events/${eventId}`)
    } catch (error) {
      throw new Error(`Failed to delete calendar event: ${error}`)
    }
  },

  /**
   * 이벤트 드래그 앤 드롭으로 시간 변경
   */
  async moveEvent(eventId: string, newDateTime: {
    startDate: string
    endDate: string
  }): Promise<CalendarEvent> {
    try {
      const response = await apiClient.patch<CalendarEvent>(
        `${defaultConfig.baseUrl}/events/${eventId}/move`,
        newDateTime
      )
      if (!response.data) {
        throw new Error('No data received from calendar API')
      }
      return response.data
    } catch (error) {
      throw new Error(`Failed to move calendar event: ${error}`)
    }
  },

  /**
   * 이벤트 완료 상태 토글
   */
  async toggleEventCompletion(eventId: string): Promise<CalendarEvent> {
    try {
      const response = await apiClient.patch<CalendarEvent>(
        `${defaultConfig.baseUrl}/events/${eventId}/toggle-completion`
      )
      if (!response.data) {
        throw new Error('No data received from calendar API')
      }
      return response.data
    } catch (error) {
      throw new Error(`Failed to toggle event completion: ${error}`)
    }
  },

  /**
   * 프로젝트별 이벤트 조회
   */
  async getProjectEvents(projectId: string): Promise<CalendarEvent[]> {
    try {
      const response = await apiClient.get<CalendarEvent[]>(
        `${defaultConfig.baseUrl}/projects/${projectId}/events`
      )
      if (!response.data) {
        throw new Error('No data received from calendar API')
      }
      return response.data
    } catch (error) {
      throw new Error(`Failed to fetch project events: ${error}`)
    }
  }
}

// ===========================
// High-level API Functions
// ===========================

/**
 * 현재 월의 모든 이벤트를 가져오는 헬퍼 함수
 */
export async function fetchMonthEvents(date: string): Promise<CalendarEvent[]> {
  const startOfMonth = new Date(date)
  startOfMonth.setDate(1)
  
  const endOfMonth = new Date(date)
  endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0)
  
  const response = await calendarApiClient.getEvents({
    startDate: startOfMonth.toISOString().split('T')[0],
    endDate: endOfMonth.toISOString().split('T')[0]
  })
  
  return response.events
}

/**
 * 현재 주의 모든 이벤트를 가져오는 헬퍼 함수
 */
export async function fetchWeekEvents(date: string): Promise<CalendarEvent[]> {
  const currentDate = new Date(date)
  const startOfWeek = new Date(currentDate)
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
  
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  
  const response = await calendarApiClient.getEvents({
    startDate: startOfWeek.toISOString().split('T')[0],
    endDate: endOfWeek.toISOString().split('T')[0]
  })
  
  return response.events
}

/**
 * 오늘의 이벤트를 가져오는 헬퍼 함수
 */
export async function fetchTodayEvents(): Promise<CalendarEvent[]> {
  const today = new Date().toISOString().split('T')[0]
  
  const response = await calendarApiClient.getEvents({
    startDate: today,
    endDate: today
  })
  
  return response.events
}

/**
 * 캘린더 데이터 새로고침
 */
export async function refreshCalendarData(
  viewMode: 'month' | 'week' | 'day',
  currentDate: string
): Promise<CalendarEvent[]> {
  switch (viewMode) {
    case 'month':
      return await fetchMonthEvents(currentDate)
    case 'week':
      return await fetchWeekEvents(currentDate)
    case 'day':
      return await fetchTodayEvents()
    default:
      throw new Error(`Unsupported view mode: ${viewMode}`)
  }
}

// ===========================
// Mock Data for Development
// ===========================

/**
 * 개발용 Mock 데이터 생성
 */
export function createMockCalendarData(): MockCalendarData {
  const today = new Date()
  const mockEvents: CalendarEvent[] = [
    {
      id: 'event-1',
      title: '프로젝트 킥오프 미팅',
      description: '새로운 브랜드 영상 프로젝트 시작 미팅',
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 0).toISOString(),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 11, 0).toISOString(),
      isAllDay: false,
      category: 'meeting',
      priority: 'high',
      projectId: 'project-1',
      projectTitle: '브랜드 홍보 영상',
      projectColor: '#0031ff',
      recurrence: 'none',
      createdBy: 'user-1',
      assignedTo: ['user-1', 'user-2'],
      isCompleted: false,
      backgroundColor: '#e6ecff',
      textColor: '#0031ff'
    },
    {
      id: 'event-2',
      title: '촬영 스케줄',
      description: '메인 촬영 일정',
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 9, 0).toISOString(),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 18, 0).toISOString(),
      isAllDay: false,
      category: 'project-deadline',
      priority: 'high',
      projectId: 'project-1',
      projectTitle: '브랜드 홍보 영상',
      projectColor: '#0031ff',
      recurrence: 'none',
      createdBy: 'user-1',
      assignedTo: ['user-1', 'user-2', 'user-3'],
      isCompleted: false,
      backgroundColor: '#ffebee',
      textColor: '#d93a3a'
    },
    {
      id: 'event-3',
      title: '편집 완료 마감',
      description: '최종 편집본 납품',
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString().split('T')[0] + 'T00:00:00.000Z',
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7).toISOString().split('T')[0] + 'T23:59:59.999Z',
      isAllDay: true,
      category: 'milestone',
      priority: 'high',
      projectId: 'project-1',
      projectTitle: '브랜드 홍보 영상',
      projectColor: '#0031ff',
      recurrence: 'none',
      createdBy: 'user-1',
      assignedTo: ['user-2'],
      isCompleted: false,
      backgroundColor: '#fff3e0',
      textColor: '#ffc107'
    }
  ]

  return {
    events: mockEvents,
    projects: [
      {
        id: 'project-1',
        title: '브랜드 홍보 영상',
        color: '#0031ff'
      },
      {
        id: 'project-2',
        title: '제품 소개 영상',
        color: '#28a745'
      }
    ],
    holidays: [
      {
        date: new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0],
        name: '한글날'
      }
    ]
  }
}

/**
 * Mock API 클라이언트 (개발/테스트용)
 */
export const mockCalendarApi = {
  async getEvents(params: Parameters<typeof calendarApiClient.getEvents>[0]): Promise<CalendarEventsResponse> {
    // 실제 개발 중에는 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const mockData = createMockCalendarData()
    return {
      events: mockData.events,
      totalCount: mockData.events.length,
      hasMore: false
    }
  },

  async createEvent(eventData: CalendarEventCreateRequest): Promise<CalendarEvent> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    return {
      id: `event-${Date.now()}`,
      ...eventData,
      createdBy: 'current-user',
      isCompleted: false,
      backgroundColor: '#e6ecff',
      textColor: '#0031ff'
    }
  },

  async updateEvent(eventId: string, updates: CalendarEventUpdateRequest): Promise<CalendarEvent> {
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const mockData = createMockCalendarData()
    const existingEvent = mockData.events.find(e => e.id === eventId)
    
    if (!existingEvent) {
      throw new Error('Event not found')
    }
    
    return {
      ...existingEvent,
      ...updates
    }
  },

  async deleteEvent(eventId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200))
    // Mock deletion - in real implementation, this would remove from backend
  }
}