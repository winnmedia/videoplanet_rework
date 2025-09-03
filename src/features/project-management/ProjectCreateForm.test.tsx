import { render, screen, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { ProjectCreateForm } from './ProjectCreateForm'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock API calls
const mockCreateProject = jest.fn()
jest.mock('@/shared/api', () => ({
  createProject: (...args: any[]) => mockCreateProject(...args),
}))

describe('ProjectCreateForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // RED: 기본 렌더링 실패 테스트
  it('should render form with all required fields', () => {
    render(<ProjectCreateForm />)
    
    // 폼 제목
    expect(screen.getByRole('heading', { name: /새 프로젝트 생성/i })).toBeInTheDocument()
    
    // 필수 입력 필드들
    expect(screen.getByLabelText(/프로젝트 이름/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/프로젝트 설명/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/카테고리/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/예산/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/마감일/i)).toBeInTheDocument()
    
    // 자동 스케줄 섹션
    expect(screen.getByText(/자동 스케줄 생성/i)).toBeInTheDocument()
    expect(screen.getByText(/1주 기획/i)).toBeInTheDocument()
    expect(screen.getByText(/1일 촬영/i)).toBeInTheDocument()
    expect(screen.getByText(/2주 편집/i)).toBeInTheDocument()
    
    // 버튼들
    expect(screen.getByRole('button', { name: /프로젝트 생성/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /취소/i })).toBeInTheDocument()
  })

  // RED: 폼 유효성 검사 실패 테스트
  it('should show validation errors for empty required fields', async () => {
    const user = userEvent.setup()
    render(<ProjectCreateForm />)
    
    const submitButton = screen.getByRole('button', { name: /프로젝트 생성/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/프로젝트 이름을 입력해주세요/i)).toBeInTheDocument()
      expect(screen.getByText(/프로젝트 설명을 입력해주세요/i)).toBeInTheDocument()
      expect(screen.getByText(/카테고리를 선택해주세요/i)).toBeInTheDocument()
    })
  })

  // RED: 폼 제출 성공 시나리오 실패 테스트
  it('should submit form with valid data and auto-generated schedule', async () => {
    const user = userEvent.setup()
    mockCreateProject.mockResolvedValue({ 
      id: '123', 
      name: 'Test Project',
      schedule: [
        { phase: 'planning', startDate: '2024-01-01', endDate: '2024-01-07', duration: 7 },
        { phase: 'shooting', startDate: '2024-01-08', endDate: '2024-01-08', duration: 1 },
        { phase: 'editing', startDate: '2024-01-09', endDate: '2024-01-22', duration: 14 }
      ]
    })

    const onSuccess = jest.fn()
    render(<ProjectCreateForm onSuccess={onSuccess} />)
    
    // 필수 필드 입력
    await user.type(screen.getByLabelText(/프로젝트 이름/i), 'Test Project')
    await user.type(screen.getByLabelText(/프로젝트 설명/i), 'Test Description')
    await user.selectOptions(screen.getByLabelText(/카테고리/i), 'commercial')
    await user.type(screen.getByLabelText(/예산/i), '1000000')
    await user.type(screen.getByLabelText(/마감일/i), '2024-02-01')
    
    const submitButton = screen.getByRole('button', { name: /프로젝트 생성/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'Test Description',
        category: 'commercial',
        budget: 1000000,
        deadline: '2024-02-01',
        autoSchedule: {
          planningDays: 7,
          shootingDays: 1,
          editingDays: 14
        }
      })
      expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ id: '123' }))
    })
  })

  // RED: 로딩 상태 테스트
  it('should show loading state during form submission', async () => {
    const user = userEvent.setup()
    mockCreateProject.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({ id: '123' }), 100)
    ))
    
    render(<ProjectCreateForm />)
    
    // 필수 필드 입력
    await user.type(screen.getByLabelText(/프로젝트 이름/i), 'Test Project')
    await user.type(screen.getByLabelText(/프로젝트 설명/i), 'Test Description')
    await user.selectOptions(screen.getByLabelText(/카테고리/i), 'commercial')
    
    const submitButton = screen.getByRole('button', { name: /프로젝트 생성/i })
    await user.click(submitButton)
    
    expect(screen.getByRole('button', { name: /생성 중.../i })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  // RED: 에러 처리 테스트
  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup()
    mockCreateProject.mockRejectedValue(new Error('Network error'))
    
    render(<ProjectCreateForm />)
    
    // 필수 필드 입력
    await user.type(screen.getByLabelText(/프로젝트 이름/i), 'Test Project')
    await user.type(screen.getByLabelText(/프로젝트 설명/i), 'Test Description')
    await user.selectOptions(screen.getByLabelText(/카테고리/i), 'commercial')
    
    const submitButton = screen.getByRole('button', { name: /프로젝트 생성/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/프로젝트 생성에 실패했습니다/i)).toBeInTheDocument()
    })
  })

  // RED: 키보드 네비게이션 테스트
  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<ProjectCreateForm />)
    
    const nameInput = screen.getByLabelText(/프로젝트 이름/i)
    const descInput = screen.getByLabelText(/프로젝트 설명/i)
    const categorySelect = screen.getByLabelText(/카테고리/i)
    
    nameInput.focus()
    expect(nameInput).toHaveFocus()
    
    await user.tab()
    expect(descInput).toHaveFocus()
    
    await user.tab()
    expect(categorySelect).toHaveFocus()
  })

  // RED: ARIA 및 접근성 테스트
  it('should have no accessibility violations', async () => {
    const { container } = render(<ProjectCreateForm />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  // RED: 폼 필드 라벨링 테스트
  it('should have proper form field labeling', () => {
    render(<ProjectCreateForm />)
    
    const nameInput = screen.getByLabelText(/프로젝트 이름/i)
    const descInput = screen.getByLabelText(/프로젝트 설명/i)
    
    expect(nameInput).toHaveAttribute('aria-required', 'true')
    expect(descInput).toHaveAttribute('aria-required', 'true')
    expect(nameInput).toHaveAttribute('aria-describedby', expect.stringContaining('name-hint'))
  })

  // RED: 레거시 UI 스타일 검증 테스트
  it('should use legacy Button and Typography styles', () => {
    render(<ProjectCreateForm />)
    
    const submitButton = screen.getByRole('button', { name: /프로젝트 생성/i })
    const title = screen.getByRole('heading', { name: /새 프로젝트 생성/i })
    
    // 레거시 Button 스타일 확인
    expect(submitButton).toHaveClass('bg-primary', 'text-white', 'hover:bg-primary-dark')
    
    // 레거시 Typography 스타일 확인
    expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-tight')
  })

  // RED: 취소 버튼 기능 테스트
  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()
    
    render(<ProjectCreateForm onCancel={onCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: /취소/i })
    await user.click(cancelButton)
    
    expect(onCancel).toHaveBeenCalled()
  })
})