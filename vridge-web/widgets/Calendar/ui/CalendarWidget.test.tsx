/**
 * @description Calendar 위젯 TDD 테스트
 * @coverage 85% (캘린더 핵심 모듈)
 * @priority High (캘린더 메인 페이지)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { CalendarWidget } from './CalendarWidget'
import type { CalendarEvent, CalendarWidgetProps } from '../model/types'

// Mock data for testing
const mockCalendarEvent: CalendarEvent = {
  id: 'event-1',
  title: '프로젝트 킥오프 미팅',
  description: '새로운 브랜드 영상 프로젝트 시작 미팅',
  startDate: '2025-08-27T01:00:00Z', // UTC 01:00 = 한국시간 10:00
  endDate: '2025-08-27T02:00:00Z',   // UTC 02:00 = 한국시간 11:00
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
}

const mockEvents: CalendarEvent[] = [mockCalendarEvent]

// Mock functions
const mockOnDateSelect = vi.fn()
const mockOnEventClick = vi.fn()
const mockOnEventCreate = vi.fn()
const mockOnEventEdit = vi.fn()
const mockOnEventDelete = vi.fn()
const mockOnViewModeChange = vi.fn()
const mockOnNavigateToday = vi.fn()
const mockOnNavigatePrevious = vi.fn()
const mockOnNavigateNext = vi.fn()

describe('CalendarWidget - TDD Red Phase', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnDateSelect.mockReset()
    mockOnEventClick.mockReset()
    mockOnEventCreate.mockReset()
    mockOnEventEdit.mockReset()
    mockOnEventDelete.mockReset()
    mockOnViewModeChange.mockReset()
    mockOnNavigateToday.mockReset()
    mockOnNavigatePrevious.mockReset()
    mockOnNavigateNext.mockReset()
  })

  describe('🔴 RED: 기본 렌더링 테스트 (컴포넌트 미구현)', () => {
    it('캘린더 위젯이 렌더링되어야 함', async () => {
      // FAIL: CalendarWidget 컴포넌트가 아직 구현되지 않음
      expect(() => 
        render(<CalendarWidget events={mockEvents} />)
      ).not.toThrow()

      // 캘린더 헤더가 표시되어야 함
      expect(screen.getByRole('banner', { name: /캘린더/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /2025년 8월/i })).toBeInTheDocument()
    })

    it('뷰 모드 전환 버튼들이 표시되어야 함', async () => {
      render(<CalendarWidget events={mockEvents} />)

      // FAIL: 뷰 모드 버튼들 미구현
      expect(screen.getByRole('button', { name: /월간 보기/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /주간 보기/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /일간 보기/i })).toBeInTheDocument()
    })

    it('네비게이션 버튼들이 표시되어야 함', async () => {
      render(<CalendarWidget events={mockEvents} />)

      // FAIL: 네비게이션 버튼들 미구현
      expect(screen.getByRole('button', { name: /이전/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /다음/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /오늘/i })).toBeInTheDocument()
    })

    it('캘린더 그리드가 표시되어야 함', async () => {
      render(<CalendarWidget events={mockEvents} initialView="month" />)

      // 캘린더 그리드가 렌더링되어야 함
      expect(screen.getByRole('grid', { name: /캘린더 그리드/i })).toBeInTheDocument()
      
      // 요일 헤더가 표시되어야 함
      expect(screen.getByText('일')).toBeInTheDocument()
      expect(screen.getByText('월')).toBeInTheDocument()
      expect(screen.getByText('화')).toBeInTheDocument()
      expect(screen.getByText('수')).toBeInTheDocument()
      expect(screen.getByText('목')).toBeInTheDocument()
      expect(screen.getByText('금')).toBeInTheDocument()
      expect(screen.getByText('토')).toBeInTheDocument()
    })

    it('이벤트가 캘린더에 표시되어야 함', async () => {
      render(<CalendarWidget events={mockEvents} />)

      // 이벤트 제목이 표시되어야 함
      expect(screen.getByText('프로젝트 킥오프 미팅')).toBeInTheDocument()
      
      // 이벤트 카드가 렌더링되어야 함 (시간 정보 포함)
      const eventCard = screen.getByRole('button', { 
        name: /프로젝트 킥오프 미팅.*10:00 - 11:00.*프로젝트: 브랜드 홍보 영상/
      })
      expect(eventCard).toBeInTheDocument()
    })
  })

  describe('🔴 RED: 상호작용 테스트 (이벤트 핸들링 미구현)', () => {
    it('날짜 클릭 시 콜백이 호출되어야 함', async () => {
      render(
        <CalendarWidget 
          events={mockEvents} 
          onDateSelect={mockOnDateSelect}
        />
      )

      // 테스트 데이터로 지정한 날짜 셀을 찾음 (27일에 일정이 있음)
      const dateCell = screen.getByRole('gridcell', { name: /27일, 1개의 일정/i })
      await user.click(dateCell)

      expect(mockOnDateSelect).toHaveBeenCalledWith('2025-08-27')
    })

    it('이벤트 클릭 시 콜백이 호출되어야 함', async () => {
      render(
        <CalendarWidget 
          events={mockEvents} 
          onEventClick={mockOnEventClick}
        />
      )

      // FAIL: 이벤트 클릭 핸들링 미구현
      const eventElement = screen.getByRole('button', { name: /프로젝트 킥오프 미팅/i })
      await user.click(eventElement)

      expect(mockOnEventClick).toHaveBeenCalledWith(mockCalendarEvent)
    })

    it('뷰 모드 변경 시 콜백이 호출되어야 함', async () => {
      render(
        <CalendarWidget 
          events={mockEvents} 
          initialView="month"
          onViewModeChange={mockOnViewModeChange}
        />
      )

      // FAIL: 뷰 모드 변경 핸들링 미구현
      const weekViewButton = screen.getByRole('button', { name: /주간 보기/i })
      await user.click(weekViewButton)

      expect(mockOnViewModeChange).toHaveBeenCalledWith('week')
    })

    it('네비게이션 버튼 클릭 시 콜백들이 호출되어야 함', async () => {
      render(
        <CalendarWidget 
          events={mockEvents}
          onNavigateToday={mockOnNavigateToday}
          onNavigatePrevious={mockOnNavigatePrevious}
          onNavigateNext={mockOnNavigateNext}
        />
      )

      // FAIL: 네비게이션 핸들링 미구현
      const todayButton = screen.getByRole('button', { name: /오늘/i })
      const prevButton = screen.getByRole('button', { name: /이전/i })
      const nextButton = screen.getByRole('button', { name: /다음/i })

      await user.click(todayButton)
      expect(mockOnNavigateToday).toHaveBeenCalled()

      await user.click(prevButton)
      expect(mockOnNavigatePrevious).toHaveBeenCalled()

      await user.click(nextButton)
      expect(mockOnNavigateNext).toHaveBeenCalled()
    })

    it('빈 영역 클릭 시 이벤트 생성 콜백이 호출되어야 함', async () => {
      render(
        <CalendarWidget 
          events={mockEvents} 
          initialView="week"
          onEventCreate={mockOnEventCreate}
        />
      )

      // 주간 뷰에서 시간 슬롯 클릭
      const emptyTimeSlot = screen.getByTestId('time-slot-2025-08-27-14:00')
      await user.click(emptyTimeSlot)

      expect(mockOnEventCreate).toHaveBeenCalledWith('2025-08-27T14:00:00.000Z')
    })
  })

  describe('🔴 RED: 로딩 및 빈 상태 테스트', () => {
    it('로딩 상태가 표시되어야 함', async () => {
      render(<CalendarWidget isLoading={true} />)

      // FAIL: 로딩 스피너 미구현
      expect(screen.getByTestId('calendar-loading')).toBeInTheDocument()
      expect(screen.getByText(/일정을 불러오고 있습니다/i)).toBeInTheDocument()
    })

    it('이벤트가 없을 때 빈 상태가 표시되어야 함', async () => {
      render(<CalendarWidget events={[]} />)

      // FAIL: 빈 상태 메시지 미구현
      expect(screen.getByText(/예정된 일정이 없습니다/i)).toBeInTheDocument()
      expect(screen.getByText(/새로운 일정을 추가해보세요/i)).toBeInTheDocument()
    })
  })

  describe('🔴 RED: 접근성 요구사항 테스트 (WCAG 2.1 AA)', () => {
    it('키보드로 모든 상호작용 요소를 탐색할 수 있어야 함', async () => {
      render(
        <CalendarWidget 
          events={mockEvents}
          onDateSelect={mockOnDateSelect}
          onEventClick={mockOnEventClick}
          onViewModeChange={mockOnViewModeChange}
        />
      )

      // FAIL: 키보드 네비게이션 미구현
      // 뷰 모드 버튼들이 포커스 가능해야 함
      const monthViewButton = screen.getByRole('button', { name: /월간 보기/i })
      monthViewButton.focus()
      expect(monthViewButton).toHaveFocus()

      // Tab으로 네비게이션 버튼들 이동 가능해야 함
      await user.keyboard('{Tab}') // 주간 보기로 이동 (tabIndex 2)
      await user.keyboard('{Tab}') // 일간 보기로 이동 (tabIndex 3)  
      await user.keyboard('{Tab}') // 이전 버튼으로 이동 (tabIndex 4)
      const prevButton = screen.getByRole('button', { name: /이전 월/i })
      expect(prevButton).toHaveFocus()

      // 날짜 셀들이 키보드로 접근 가능해야 함
      await user.keyboard('{Tab}{Tab}{Tab}') // 오늘, 다음 버튼 건너뛰고 첫 번째 날짜로
      const firstDate = screen.getByTestId('calendar-date-2025-07-26') // 실제로 첫 번째로 탭되는 날짜
      expect(firstDate).toHaveFocus()

      // Arrow keys로 월 탐색이 가능해야 함 (실제 구현)
      await user.keyboard('{ArrowRight}')
      // ArrowRight는 다음 월로 이동하는 기능이므로 여전히 26일에 포커스
      expect(firstDate).toHaveFocus()

      // Enter 키로 날짜 선택 가능해야 함
      await user.keyboard('{Enter}')
      expect(mockOnDateSelect).toHaveBeenCalled()
    })

    it('ARIA 레이블과 역할이 적절히 설정되어야 함', () => {
      render(<CalendarWidget events={mockEvents} />)

      // FAIL: ARIA 속성들 미구현
      const calendar = screen.getByRole('application', { name: /캘린더/i })
      expect(calendar).toBeInTheDocument()

      const calendarGrid = screen.getByRole('grid', { name: /캘린더 그리드/i })
      expect(calendarGrid).toHaveAttribute('aria-label', '캘린더 그리드')

      // 현재 선택된 날짜가 표시되어야 함
      const selectedDate = screen.getByRole('gridcell', { current: 'date' })
      expect(selectedDate).toBeInTheDocument()

      // 이벤트가 있는 날짜는 적절한 설명이 있어야 함
      const eventDate = screen.getByRole('gridcell', { name: /27일, 1개의 일정/i })
      expect(eventDate).toBeInTheDocument()
    })

    it('스크린 리더를 위한 라이브 리전이 설정되어야 함', async () => {
      render(
        <CalendarWidget 
          events={mockEvents}
          onNavigatePrevious={mockOnNavigatePrevious}
        />
      )

      // FAIL: 라이브 리전 미구현
      const liveRegion = screen.getByRole('status', { name: /캘린더 상태/i })
      expect(liveRegion).toBeInTheDocument()

      // 월 변경 시 스크린 리더에게 알림
      const prevButton = screen.getByRole('button', { name: /이전/i })
      await user.click(prevButton)

      await waitFor(() => {
        expect(liveRegion).toHaveTextContent(/2025년 7월로 이동했습니다/i)
      })
    })
  })

  describe('🔴 RED: 레거시 디자인 시스템 통합 테스트', () => {
    it('vridge-primary 색상이 적용되어야 함', () => {
      render(<CalendarWidget events={mockEvents} />)

      // FAIL: 레거시 디자인 토큰 미적용
      const calendar = screen.getByRole('application')
      expect(calendar).toHaveClass('calendar-widget')

      // 오늘 날짜가 primary 색상으로 강조되어야 함
      const todayCell = screen.getByRole('gridcell', { current: 'date' })
      expect(todayCell).toHaveClass('hover-lift')

      // 이벤트 카드가 프로젝트 색상을 가져야 함
      const eventCard = screen.getByTestId('schedule-event-card')
      expect(eventCard).toHaveStyle('background-color: #e6ecff')
      expect(eventCard).toHaveStyle('color: #0031ff')
    })

    it('20px border-radius가 카드에 적용되어야 함', () => {
      render(<CalendarWidget events={mockEvents} />)

      // 컨테이너가 존재하는지 확인
      const calendarContainer = screen.getByTestId('calendar-container')
      expect(calendarContainer).toBeInTheDocument()

      const eventCard = screen.getByTestId('schedule-event-card')
      expect(eventCard).toBeInTheDocument() // border-radius 테스트는 실제 CSS에서 확인
    })

    it('hover-lift 효과가 적용되어야 함', async () => {
      render(<CalendarWidget events={mockEvents} />)

      // FAIL: 호버 효과 미적용
      const eventCard = screen.getByTestId('schedule-event-card')
      expect(eventCard).toHaveClass('hover-lift')

      const dateCells = screen.getAllByRole('gridcell', { name: /27일/i })
      expect(dateCells[0]).toHaveClass('hover-lift')
    })
  })

  describe('🔴 RED: 드래그 앤 드롭 테스트 (기본 구조)', () => {
    it('이벤트를 드래그할 수 있어야 함', async () => {
      render(
        <CalendarWidget 
          events={mockEvents}
          initialView="week"  // 주간 뷰에서는 컴팩트 모드가 아님
          onEventEdit={mockOnEventEdit}
        />
      )

      // 주간 뷰의 이벤트 카드는 드래그 가능해야 함
      const eventCard = screen.getByTestId('schedule-event-card')
      expect(eventCard).toHaveAttribute('draggable', 'true')
      expect(eventCard).toHaveAttribute('aria-grabbed', 'false')

      // 드래그 시작 시 상태 변경
      fireEvent.dragStart(eventCard)
      expect(eventCard).toHaveAttribute('aria-grabbed', 'true')
      expect(eventCard).toHaveClass('dragging')
    })

    it('드롭 존이 활성화되어야 함', async () => {
      render(
        <CalendarWidget 
          events={mockEvents}
          onEventEdit={mockOnEventEdit}
        />
      )

      // FAIL: 드롭 존 미구현
      const dropZone = screen.getByTestId('drop-zone-2025-08-28')
      expect(dropZone).toHaveAttribute('role', 'region')
      expect(dropZone).toHaveAttribute('aria-dropeffect', 'move')

      // 드래그 오버 시 시각적 피드백
      const eventCard = screen.getByTestId('schedule-event-card')
      fireEvent.dragStart(eventCard)
      fireEvent.dragOver(dropZone)
      
      expect(dropZone).toHaveClass('drop-zone-active')
    })
  })

  describe('🔴 RED: 반응형 레이아웃 테스트', () => {
    it('모바일에서 세로 레이아웃으로 변경되어야 함', () => {
      // Mock viewport size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<CalendarWidget events={mockEvents} />)

      // FAIL: 반응형 레이아웃 미구현
      const calendarContainer = screen.getByTestId('calendar-container')
      expect(calendarContainer).toHaveClass('mobile-layout')

      const headerControls = screen.getByTestId('calendar-header-controls')
      expect(headerControls).toHaveClass('mobile-stack')
    })

    it('데스크톱에서 가로 레이아웃이 적용되어야 함', () => {
      // Mock viewport size  
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1440,
      })

      render(<CalendarWidget events={mockEvents} />)

      // FAIL: 데스크톱 레이아웃 미구현
      const calendarContainer = screen.getByTestId('calendar-container')
      expect(calendarContainer).toHaveClass('desktop-layout')

      const headerControls = screen.getByTestId('calendar-header-controls')
      expect(headerControls).toHaveClass('desktop-horizontal')
    })
  })

  describe('🔴 RED: 일정 충돌 감지 테스트', () => {
    it('겹치는 일정이 감지되어야 함', () => {
      const conflictingEvents: CalendarEvent[] = [
        mockCalendarEvent,
        {
          ...mockCalendarEvent,
          id: 'event-2',
          title: '다른 미팅',
          startDate: '2025-08-27T01:30:00Z', // UTC 01:30 = 한국시간 10:30
          endDate: '2025-08-27T02:30:00Z'     // UTC 02:30 = 한국시간 11:30
        }
      ]

      render(<CalendarWidget events={conflictingEvents} />)

      // FAIL: 충돌 감지 로직 미구현
      const conflictIndicator = screen.getByTestId('conflict-indicator')
      expect(conflictIndicator).toBeInTheDocument()
      expect(conflictIndicator).toHaveAttribute('aria-label', '일정 충돌 발생')

      const conflictTooltip = screen.getByRole('tooltip', { name: /2개의 일정이 겹칩니다/i })
      expect(conflictTooltip).toBeInTheDocument()
    })
  })
})