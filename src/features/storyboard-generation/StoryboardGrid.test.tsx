import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { StoryboardGrid } from './StoryboardGrid'
import { StoryboardGrid as StoryboardGridType, GeneratedImage } from '@/shared/api/gemini'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// Mock API functions
const mockRegenerateShot = jest.fn()
const mockExportGrid = jest.fn()

jest.mock('@/shared/api/gemini', () => ({
  ...jest.requireActual('@/shared/api/gemini'),
  regenerateShot: jest.fn((...args) => mockRegenerateShot(...args)),
}))

// Mock data
const mockStoryboardData: StoryboardGridType = {
  projectId: 'test_project_001',
  gridLayout: '3x4',
  totalGenerationTime: 25000,
  overallConsistency: 0.85,
  images: Array.from({ length: 12 }, (_, i) => ({
    shotNumber: i + 1,
    imageUrl: `https://storage.googleapis.com/test-bucket/shot-${i + 1}.webp`,
    thumbnailUrl: `https://storage.googleapis.com/test-bucket/thumb-${i + 1}.webp`,
    prompt: `샷 ${i + 1} 프롬프트 - 주인공의 ${i % 3 === 0 ? '와이드샷' : i % 3 === 1 ? '미디엄샷' : '클로즈업'}`,
    generationTime: 2000 + Math.random() * 1000,
    status: 'completed' as const,
    provider: 'google' as const,
    version: 1,
    styleMetrics: {
      consistency: 0.8 + Math.random() * 0.15,
      colorHarmony: 0.85 + Math.random() * 0.1,
      characterSimilarity: 0.75 + Math.random() * 0.2
    }
  })),
  metadata: {
    createdAt: new Date(),
    styleSettings: {
      artStyle: 'cinematic',
      colorPalette: 'warm',
      aspectRatio: '16:9',
      quality: 'high'
    },
    fallbackUsed: false,
    totalRetries: 0
  }
}

describe('StoryboardGrid Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // RED: 기본 그리드 렌더링 테스트
  it('should render 12-shot storyboard grid with proper layout', () => {
    render(<StoryboardGrid storyboardData={mockStoryboardData} />)
    
    // 그리드 컨테이너 확인
    const gridContainer = screen.getByTestId('storyboard-grid')
    expect(gridContainer).toBeInTheDocument()
    expect(gridContainer).toHaveClass('grid', 'grid-cols-3', 'gap-4') // 3x4 레이아웃
    
    // 12개 샷 이미지 확인
    const shotImages = screen.getAllByTestId(/^shot-image-\d+$/)
    expect(shotImages).toHaveLength(12)
    
    // 각 샷의 기본 정보 확인
    shotImages.forEach((_, index) => {
      const shotNumber = index + 1
      expect(screen.getByText(`샷 ${shotNumber}`)).toBeInTheDocument()
      expect(screen.getByTestId(`shot-image-${shotNumber}`)).toBeInTheDocument()
    })
  })

  // RED: 그리드 레이아웃 변경 테스트
  it('should support different grid layouts', () => {
    const gridData4x3 = { ...mockStoryboardData, gridLayout: '4x3' as const }
    const { rerender } = render(<StoryboardGrid storyboardData={gridData4x3} />)
    
    let gridContainer = screen.getByTestId('storyboard-grid')
    expect(gridContainer).toHaveClass('grid-cols-4') // 4x3 레이아웃
    
    // 2x6 레이아웃 테스트
    const gridData2x6 = { ...mockStoryboardData, gridLayout: '2x6' as const }
    rerender(<StoryboardGrid storyboardData={gridData2x6} />)
    
    gridContainer = screen.getByTestId('storyboard-grid')
    expect(gridContainer).toHaveClass('grid-cols-2') // 2x6 레이아웃
  })

  // RED: 개별 샷 재생성 기능 테스트
  it('should handle individual shot regeneration', async () => {
    const user = userEvent.setup()
    mockRegenerateShot.mockResolvedValue({
      shotNumber: 5,
      imageUrl: 'https://storage.googleapis.com/test-bucket/shot-5-v2.webp',
      thumbnailUrl: 'https://storage.googleapis.com/test-bucket/thumb-5-v2.webp',
      prompt: '수정된 샷 5 프롬프트',
      generationTime: 3200,
      status: 'completed',
      version: 2,
      styleMetrics: { consistency: 0.88, colorHarmony: 0.92 }
    })

    render(<StoryboardGrid storyboardData={mockStoryboardData} />)
    
    // 샷 5의 재생성 버튼 클릭
    const shot5Container = screen.getByTestId('shot-container-5')
    const regenerateButton = screen.getByTestId('regenerate-shot-5')
    
    await user.click(regenerateButton)
    
    // 재생성 다이얼로그 확인
    expect(screen.getByText(/샷 5 재생성/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/새 프롬프트/i)).toBeInTheDocument()
    
    // 새 프롬프트 입력
    const promptInput = screen.getByLabelText(/새 프롬프트/i)
    await user.type(promptInput, '수정된 샷 5 프롬프트')
    
    // 재생성 실행
    const confirmButton = screen.getByRole('button', { name: /재생성 실행/i })
    await user.click(confirmButton)
    
    // API 호출 확인
    await waitFor(() => {
      expect(mockRegenerateShot).toHaveBeenCalledWith({
        projectId: 'test_project_001',
        shotNumber: 5,
        newPrompt: '수정된 샷 5 프롬프트',
        styleSettings: mockStoryboardData.metadata.styleSettings
      })
    })
    
    // 업데이트된 이미지 표시 확인
    await waitFor(() => {
      const updatedImage = screen.getByTestId('shot-image-5')
      expect(updatedImage).toHaveAttribute('src', 'https://storage.googleapis.com/test-bucket/shot-5-v2.webp')
    })
  })

  // RED: 로딩 상태 표시 테스트
  it('should show loading state during shot regeneration', async () => {
    const user = userEvent.setup()
    
    // 지연된 응답 모킹
    mockRegenerateShot.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          shotNumber: 3,
          imageUrl: 'new-image.webp',
          status: 'completed'
        }), 100)
      )
    )

    render(<StoryboardGrid storyboardData={mockStoryboardData} />)
    
    // 재생성 시작
    const regenerateButton = screen.getByTestId('regenerate-shot-3')
    await user.click(regenerateButton)
    
    const promptInput = screen.getByLabelText(/새 프롬프트/i)
    await user.type(promptInput, '새로운 프롬프트')
    
    const confirmButton = screen.getByRole('button', { name: /재생성 실행/i })
    await user.click(confirmButton)
    
    // 로딩 상태 확인
    expect(screen.getByText(/재생성 중.../i)).toBeInTheDocument()
    expect(screen.getByTestId('shot-loading-3')).toBeInTheDocument()
    
    // 로딩 완료 대기
    await waitFor(() => {
      expect(screen.queryByText(/재생성 중.../i)).not.toBeInTheDocument()
    })
  })

  // RED: 이미지 확대 보기 기능 테스트
  it('should open image in full size modal when clicked', async () => {
    const user = userEvent.setup()
    render(<StoryboardGrid storyboardData={mockStoryboardData} />)
    
    // 첫 번째 샷 이미지 클릭
    const shot1Image = screen.getByTestId('shot-image-1')
    await user.click(shot1Image)
    
    // 모달 창 확인
    expect(screen.getByTestId('image-modal')).toBeInTheDocument()
    expect(screen.getByTestId('modal-image')).toHaveAttribute('src', mockStoryboardData.images[0].imageUrl)
    expect(screen.getByText(/샷 1/i)).toBeInTheDocument()
    
    // 모달 닫기
    const closeButton = screen.getByTestId('close-modal')
    await user.click(closeButton)
    
    expect(screen.queryByTestId('image-modal')).not.toBeInTheDocument()
  })

  // RED: 키보드 네비게이션 테스트
  it('should support keyboard navigation between shots', async () => {
    const user = userEvent.setup()
    render(<StoryboardGrid storyboardData={mockStoryboardData} />)
    
    const shot1Image = screen.getByTestId('shot-image-1')
    shot1Image.focus()
    expect(shot1Image).toHaveFocus()
    
    // 오른쪽 화살표로 다음 샷 이동
    await user.keyboard('{ArrowRight}')
    const shot2Image = screen.getByTestId('shot-image-2')
    expect(shot2Image).toHaveFocus()
    
    // 아래 화살표로 다음 행 이동 (3x4 그리드에서 3칸 이동)
    await user.keyboard('{ArrowDown}')
    const shot5Image = screen.getByTestId('shot-image-5')
    expect(shot5Image).toHaveFocus()
    
    // Enter로 이미지 확대
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('image-modal')).toBeInTheDocument()
  })

  // RED: 스타일 일관성 메트릭 표시 테스트
  it('should display style consistency metrics', () => {
    render(<StoryboardGrid storyboardData={mockStoryboardData} />)
    
    // 전체 일관성 점수
    expect(screen.getByText(/전체 일관성: 85%/i)).toBeInTheDocument()
    
    // 개별 샷 메트릭 (호버 시 표시)
    const shot1Container = screen.getByTestId('shot-container-1')
    fireEvent.mouseEnter(shot1Container)
    
    expect(screen.getByText(/일관성:/i)).toBeInTheDocument()
    expect(screen.getByText(/색상 조화:/i)).toBeInTheDocument()
    expect(screen.getByText(/캐릭터 유사도:/i)).toBeInTheDocument()
  })

  // RED: 그리드 내보내기 기능 테스트
  it('should handle grid export functionality', async () => {
    const user = userEvent.setup()
    mockExportGrid = jest.fn().mockResolvedValue({
      gridImageUrl: 'https://storage.googleapis.com/test-bucket/grid-export.png',
      pdfUrl: 'https://storage.googleapis.com/test-bucket/storyboard.pdf'
    })

    render(<StoryboardGrid storyboardData={mockStoryboardData} onExport={mockExportGrid} />)
    
    // 내보내기 버튼 클릭
    const exportButton = screen.getByRole('button', { name: /스토리보드 내보내기/i })
    await user.click(exportButton)
    
    // 내보내기 옵션 확인
    expect(screen.getByText(/PNG 그리드/i)).toBeInTheDocument()
    expect(screen.getByText(/PDF 문서/i)).toBeInTheDocument()
    
    // PNG 내보내기 선택
    const pngOption = screen.getByRole('radio', { name: /PNG 그리드/i })
    await user.click(pngOption)
    
    const confirmExport = screen.getByRole('button', { name: /내보내기 실행/i })
    await user.click(confirmExport)
    
    // 내보내기 API 호출 확인
    await waitFor(() => {
      expect(mockExportGrid).toHaveBeenCalledWith({
        projectId: 'test_project_001',
        format: 'png',
        includeMetrics: false
      })
    })
  })

  // RED: 실패한 샷 표시 테스트
  it('should show failed shots with retry option', async () => {
    const dataWithFailures = {
      ...mockStoryboardData,
      failedShots: [7, 11],
      images: mockStoryboardData.images.map((img, index) => 
        [6, 10].includes(index) ? { ...img, status: 'failed' as const, errorMessage: '생성 실패' } : img
      )
    }

    const user = userEvent.setup()
    render(<StoryboardGrid storyboardData={dataWithFailures} />)
    
    // 실패한 샷 표시 확인
    const failedShot7 = screen.getByTestId('shot-container-7')
    expect(failedShot7).toHaveClass('border-red-500')
    expect(screen.getByText(/생성 실패/i)).toBeInTheDocument()
    
    // 재시도 버튼 확인
    const retryButton = screen.getByTestId('retry-shot-7')
    expect(retryButton).toBeInTheDocument()
    
    await user.click(retryButton)
    
    // 재시도 프롬프트 입력 확인
    expect(screen.getByText(/샷 7 재시도/i)).toBeInTheDocument()
  })

  // RED: 접근성 테스트
  it('should have no accessibility violations', async () => {
    const { container } = render(<StoryboardGrid storyboardData={mockStoryboardData} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  // RED: 반응형 레이아웃 테스트
  it('should adapt to different screen sizes', () => {
    // 모바일 크기로 변경
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    const { rerender } = render(<StoryboardGrid storyboardData={mockStoryboardData} />)
    
    const gridContainer = screen.getByTestId('storyboard-grid')
    expect(gridContainer).toHaveClass('sm:grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3')
    
    // 태블릿 크기
    Object.defineProperty(window, 'innerWidth', {
      value: 768,
    })
    
    rerender(<StoryboardGrid storyboardData={mockStoryboardData} />)
    // 반응형 클래스가 적용되어야 함
  })

  // RED: 성능 테스트 (이미지 지연 로딩)
  it('should implement lazy loading for images', () => {
    render(<StoryboardGrid storyboardData={mockStoryboardData} />)
    
    const images = screen.getAllByTestId(/^shot-image-\d+$/)
    images.forEach(img => {
      expect(img).toHaveAttribute('loading', 'lazy')
    })
  })

  // RED: 드래그 앤 드롭으로 샷 순서 변경 테스트
  it('should support drag and drop reordering of shots', async () => {
    const onReorder = jest.fn()
    render(<StoryboardGrid storyboardData={mockStoryboardData} onReorder={onReorder} />)
    
    const shot1 = screen.getByTestId('shot-container-1')
    const shot3 = screen.getByTestId('shot-container-3')
    
    // 드래그 앤 드롭 시뮬레이션
    fireEvent.dragStart(shot1)
    fireEvent.dragOver(shot3)
    fireEvent.drop(shot3)
    
    await waitFor(() => {
      expect(onReorder).toHaveBeenCalledWith({
        from: 1,
        to: 3,
        projectId: 'test_project_001'
      })
    })
  })
})