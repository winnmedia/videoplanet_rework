import { render, screen } from '@testing-library/react'
import { ProjectSchedulePreview } from '../ProjectSchedulePreview'

describe('ProjectSchedulePreview', () => {
  const mockSchedule = {
    planning: { duration: 7, label: '기획 1주' },
    filming: { duration: 1, label: '촬영 1일' },
    editing: { duration: 14, label: '편집 2주' }
  }

  it('자동 일정을 바 형태로 렌더링해야 함', () => {
    render(<ProjectSchedulePreview schedule={mockSchedule} />)
    
    expect(screen.getByText('기획 1주')).toBeInTheDocument()
    expect(screen.getByText('촬영 1일')).toBeInTheDocument()
    expect(screen.getByText('편집 2주')).toBeInTheDocument()
  })

  it('총 프로젝트 기간을 계산하여 표시해야 함', () => {
    render(<ProjectSchedulePreview schedule={mockSchedule} />)
    
    expect(screen.getByText('총 프로젝트 기간: 22일')).toBeInTheDocument()
  })

  it('각 단계별 진행률 바를 표시해야 함', () => {
    render(<ProjectSchedulePreview schedule={mockSchedule} />)
    
    const planningBar = screen.getByTestId('planning-bar')
    const filmingBar = screen.getByTestId('filming-bar')
    const editingBar = screen.getByTestId('editing-bar')

    expect(planningBar).toBeInTheDocument()
    expect(filmingBar).toBeInTheDocument()
    expect(editingBar).toBeInTheDocument()
  })

  it('커스텀 스케줄로 업데이트가 가능해야 함', () => {
    const customSchedule = {
      planning: { duration: 10, label: '기획 10일' },
      filming: { duration: 2, label: '촬영 2일' },
      editing: { duration: 21, label: '편집 3주' }
    }

    render(<ProjectSchedulePreview schedule={customSchedule} />)
    
    expect(screen.getByText('기획 10일')).toBeInTheDocument()
    expect(screen.getByText('촬영 2일')).toBeInTheDocument()
    expect(screen.getByText('편집 3주')).toBeInTheDocument()
    expect(screen.getByText('총 프로젝트 기간: 33일')).toBeInTheDocument()
  })
})