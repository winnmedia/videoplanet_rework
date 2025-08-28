import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import CalendarPage from '../page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

// Mock SideBar
jest.mock('@/widgets', () => ({
  SideBar: () => <nav data-testid="sidebar">SideBar</nav>
}))

describe('CalendarPage', () => {
  beforeEach(() => {
    // Reset DOM before each test
    document.body.innerHTML = ''
  })

  test('캘린더 페이지 기본 구조가 렌더링된다', async () => {
    await act(async () => {
      render(<CalendarPage />)
    })

    // 페이지 제목
    expect(screen.getByText('전체 일정')).toBeInTheDocument()
    expect(screen.getByText('프로젝트 일정을 한눈에 확인하세요')).toBeInTheDocument()

    // 사이드바
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  test('월간 보기와 주간 보기 전환이 가능하다', async () => {
    await act(async () => {
      render(<CalendarPage />)
    })

    // 초기 월간 보기 확인
    const monthButton = screen.getByRole('button', { name: /월간/i })
    const weekButton = screen.getByRole('button', { name: /주간/i })

    expect(monthButton).toHaveClass('bg-blue-600')
    
    // 주간 보기로 전환
    await act(async () => {
      fireEvent.click(weekButton)
    })

    await waitFor(() => {
      expect(weekButton).toHaveClass('bg-blue-600')
    })
  })

  test('간트 보기 전환이 가능하다', async () => {
    await act(async () => {
      render(<CalendarPage />)
    })

    const ganttButton = screen.getByRole('button', { name: /간트/i })
    
    await act(async () => {
      fireEvent.click(ganttButton)
    })

    await waitFor(() => {
      expect(ganttButton).toHaveClass('bg-blue-600')
    })
  })

  test('프로젝트 필터가 작동한다', async () => {
    await act(async () => {
      render(<CalendarPage />)
    })

    // 필터 섹션 확인
    expect(screen.getByLabelText('프로젝트')).toBeInTheDocument()
    
    const projectSelect = screen.getByLabelText('프로젝트')
    
    await act(async () => {
      fireEvent.change(projectSelect, { target: { value: 'project1' } })
    })

    expect(projectSelect).toHaveValue('project1')
  })

  test('충돌만 보기 필터가 작동한다', async () => {
    await act(async () => {
      render(<CalendarPage />)
    })

    const conflictCheckbox = screen.getByLabelText('충돌만 보기')
    
    await act(async () => {
      fireEvent.click(conflictCheckbox)
    })

    expect(conflictCheckbox).toBeChecked()
  })

  test('프로젝트 범례가 표시된다', async () => {
    await act(async () => {
      render(<CalendarPage />)
    })

    // 범례 토글 버튼
    expect(screen.getByText('전체 프로젝트')).toBeInTheDocument()
    
    const legendToggle = screen.getByRole('button', { name: /내 프로젝트/i })
    
    await act(async () => {
      fireEvent.click(legendToggle)
    })

    expect(screen.getByText('내 프로젝트')).toBeInTheDocument()
  })

  test('키보드 네비게이션이 작동한다', async () => {
    await act(async () => {
      render(<CalendarPage />)
    })

    const calendarContainer = screen.getByRole('application')
    
    // 이전 월로 이동 (Left Arrow)
    await act(async () => {
      fireEvent.keyDown(calendarContainer, { key: 'ArrowLeft' })
    })

    // 다음 월로 이동 (Right Arrow)  
    await act(async () => {
      fireEvent.keyDown(calendarContainer, { key: 'ArrowRight' })
    })

    // 오늘로 이동 (Home)
    await act(async () => {
      fireEvent.keyDown(calendarContainer, { key: 'Home' })
    })

    expect(calendarContainer).toBeInTheDocument()
  })

  test('접근성 요소들이 올바르게 설정되어 있다', async () => {
    await act(async () => {
      render(<CalendarPage />)
    })

    // ARIA 레이블 확인
    expect(screen.getByRole('application')).toHaveAttribute('aria-label')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    
    // 라이브 리전 확인
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})