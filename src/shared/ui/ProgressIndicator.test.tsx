import { render, screen, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ProgressIndicator } from './ProgressIndicator'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

describe('ProgressIndicator Component', () => {
  // RED: 기본 진행률 표시 테스트
  it('should display progress percentage correctly', () => {
    render(
      <ProgressIndicator 
        value={65} 
        label="이미지 생성 진행률"
        status="in-progress"
      />
    )

    expect(screen.getByText('65%')).toBeInTheDocument()
    expect(screen.getByText('이미지 생성 진행률')).toBeInTheDocument()
    
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-valuenow', '65')
    expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    expect(progressBar).toHaveAttribute('aria-valuemax', '100')
  })

  // RED: 다양한 상태 표시 테스트
  it('should display different status states correctly', () => {
    const { rerender } = render(
      <ProgressIndicator value={0} status="idle" label="대기 중" />
    )
    
    expect(screen.getByText('대기 중')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()

    // 진행 중 상태
    rerender(<ProgressIndicator value={45} status="in-progress" label="처리 중" />)
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveClass('bg-blue-500')

    // 완료 상태
    rerender(<ProgressIndicator value={100} status="completed" label="완료됨" />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveClass('bg-green-500')

    // 오류 상태
    rerender(
      <ProgressIndicator 
        value={30} 
        status="error" 
        label="오류 발생" 
        error="API 연결 실패" 
      />
    )
    expect(screen.getByText('오류 발생')).toBeInTheDocument()
    expect(screen.getByText('API 연결 실패')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveClass('bg-red-500')
  })

  // RED: 세부 정보 표시 테스트
  it('should display detailed information when provided', () => {
    render(
      <ProgressIndicator 
        value={75}
        status="in-progress"
        label="12샷 스토리보드 생성"
        currentItem="샷 9 생성 중"
        completed={9}
        total={12}
        estimatedTimeRemaining={30}
        showDetails={true}
      />
    )

    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('샷 9 생성 중')).toBeInTheDocument()
    expect(screen.getByText('9 / 12')).toBeInTheDocument()
    expect(screen.getByText('예상 완료: 30초')).toBeInTheDocument()
  })

  // RED: 애니메이션 진행률 바 테스트
  it('should animate progress bar changes smoothly', async () => {
    const { rerender } = render(
      <ProgressIndicator value={20} status="in-progress" label="애니메이션 테스트" />
    )

    let progressBar = screen.getByRole('progressbar')
    const progressFill = progressBar.querySelector('.progress-fill')
    expect(progressFill).toHaveStyle('width: 20%')

    rerender(
      <ProgressIndicator value={60} status="in-progress" label="애니메이션 테스트" />
    )

    // 애니메이션이 적용되는지 확인 (transition 클래스)
    progressBar = screen.getByRole('progressbar')
    const updatedProgressFill = progressBar.querySelector('.progress-fill')
    expect(updatedProgressFill).toHaveClass('transition-all', 'duration-300')
  })

  // RED: 사용자 정의 스타일 테스트
  it('should apply custom styles correctly', () => {
    render(
      <ProgressIndicator 
        value={50}
        status="in-progress"
        label="사용자 정의 스타일"
        size="large"
        variant="circular"
        color="purple"
        className="custom-progress"
      />
    )

    const container = screen.getByTestId('progress-indicator')
    expect(container).toHaveClass('custom-progress')
    expect(container).toHaveClass('size-large')
  })

  // RED: 원형 진행률 표시 테스트
  it('should render circular progress indicator', () => {
    render(
      <ProgressIndicator 
        value={80}
        status="in-progress"
        label="원형 진행률"
        variant="circular"
        size="medium"
      />
    )

    const circularProgress = screen.getByTestId('circular-progress')
    expect(circularProgress).toBeInTheDocument()
    
    const circle = circularProgress.querySelector('circle')
    expect(circle).toBeInTheDocument()
    
    // SVG 원형 진행률의 stroke-dasharray 확인
    expect(circle).toHaveAttribute('stroke-dasharray')
  })

  // RED: 실시간 업데이트 테스트
  it('should update progress in real-time', async () => {
    let currentValue = 0
    const TestComponent = () => (
      <ProgressIndicator 
        value={currentValue}
        status="in-progress"
        label="실시간 업데이트"
      />
    )

    const { rerender } = render(<TestComponent />)

    // 진행률을 여러 번 업데이트
    for (let i = 10; i <= 100; i += 10) {
      currentValue = i
      rerender(<TestComponent />)
      
      await waitFor(() => {
        expect(screen.getByText(`${i}%`)).toBeInTheDocument()
      })
    }
  })

  // RED: 접근성 테스트
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ProgressIndicator 
        value={65}
        status="in-progress"
        label="접근성 테스트"
        currentItem="현재 작업 항목"
        showDetails={true}
      />
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  // RED: ARIA 라벨 및 설명 테스트
  it('should provide proper ARIA labels and descriptions', () => {
    render(
      <ProgressIndicator 
        value={45}
        status="in-progress"
        label="ARIA 테스트"
        description="12개 샷 중 5개 완료"
        currentItem="샷 6 처리 중"
      />
    )

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('aria-label', 'ARIA 테스트')
    expect(progressBar).toHaveAttribute('aria-describedby')
    
    const description = screen.getByText('12개 샷 중 5개 완료')
    expect(description).toBeInTheDocument()
  })

  // RED: 키보드 네비게이션 및 스크린 리더 지원 테스트
  it('should support keyboard navigation and screen readers', () => {
    render(
      <ProgressIndicator 
        value={70}
        status="in-progress"
        label="스크린 리더 테스트"
        showDetails={true}
        completed={7}
        total={10}
      />
    )

    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toHaveAttribute('tabindex', '0')
    expect(progressBar).toHaveAccessibleName()
    expect(progressBar).toHaveAccessibleDescription()
  })

  // RED: 에러 처리 및 재시도 기능 테스트
  it('should display error state with retry option', () => {
    const onRetry = jest.fn()
    
    render(
      <ProgressIndicator 
        value={30}
        status="error"
        label="에러 테스트"
        error="네트워크 연결 실패"
        onRetry={onRetry}
      />
    )

    expect(screen.getByText('네트워크 연결 실패')).toBeInTheDocument()
    
    const retryButton = screen.getByRole('button', { name: /재시도/i })
    expect(retryButton).toBeInTheDocument()
    
    retryButton.click()
    expect(onRetry).toHaveBeenCalled()
  })

  // RED: 성능 테스트 (빈번한 업데이트)
  it('should handle frequent updates efficiently', () => {
    const startTime = performance.now()
    
    const { rerender } = render(
      <ProgressIndicator value={0} status="in-progress" label="성능 테스트" />
    )

    // 100번의 빠른 업데이트 시뮬레이션
    for (let i = 1; i <= 100; i++) {
      rerender(
        <ProgressIndicator value={i} status="in-progress" label="성능 테스트" />
      )
    }

    const endTime = performance.now()
    const processingTime = endTime - startTime

    // 50ms 이내에 완료되어야 함
    expect(processingTime).toBeLessThan(50)
  })

  // RED: 완료 상태에서의 성공 애니메이션 테스트
  it('should show success animation when completed', async () => {
    const { rerender } = render(
      <ProgressIndicator value={95} status="in-progress" label="완료 테스트" />
    )

    rerender(
      <ProgressIndicator 
        value={100} 
        status="completed" 
        label="완료됨"
        showSuccessAnimation={true}
      />
    )

    // 성공 아이콘이 나타나는지 확인
    await waitFor(() => {
      const successIcon = screen.getByTestId('success-icon')
      expect(successIcon).toBeInTheDocument()
      expect(successIcon).toHaveClass('animate-bounce')
    })
  })
})