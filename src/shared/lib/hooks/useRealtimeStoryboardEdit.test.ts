import { renderHook, act, waitFor } from '@testing-library/react'
import { useRealtimeStoryboardEdit } from './useRealtimeStoryboardEdit'
import { generateStoryboardImages, regenerateShot } from '@/shared/api/gemini'
import type { StoryboardGrid, ImageGenerationRequest } from '@/shared/api/gemini'

// Mock API functions
jest.mock('@/shared/api/gemini', () => ({
  generateStoryboardImages: jest.fn(),
  regenerateShot: jest.fn()
}))

const mockGenerateStoryboardImages = generateStoryboardImages as jest.MockedFunction<typeof generateStoryboardImages>
const mockRegenerateShot = regenerateShot as jest.MockedFunction<typeof regenerateShot>

// Mock storyboard data
const mockStoryboardData: StoryboardGrid = {
  projectId: 'test_project_001',
  gridLayout: '3x4',
  totalGenerationTime: 25000,
  overallConsistency: 0.85,
  images: Array.from({ length: 12 }, (_, i) => ({
    shotNumber: i + 1,
    imageUrl: `https://storage.googleapis.com/test-bucket/shot-${i + 1}.webp`,
    thumbnailUrl: `https://storage.googleapis.com/test-bucket/thumb-${i + 1}.webp`,
    prompt: `샷 ${i + 1} 프롬프트`,
    generationTime: 2000,
    status: 'completed' as const,
    provider: 'google' as const,
    version: 1,
    styleMetrics: {
      consistency: 0.8,
      colorHarmony: 0.85
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

describe('useRealtimeStoryboardEdit Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // RED: 초기 상태 테스트
  it('should initialize with provided storyboard data', () => {
    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(mockStoryboardData)
    )

    expect(result.current.storyboardData).toEqual(mockStoryboardData)
    expect(result.current.isEditMode).toBe(false)
    expect(result.current.editingShots).toEqual(new Set())
    expect(result.current.pendingChanges).toHaveLength(0)
    expect(result.current.operationProgress).toBeNull()
  })

  // RED: 편집 모드 토글 테스트
  it('should toggle edit mode correctly', () => {
    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(mockStoryboardData)
    )

    act(() => {
      result.current.toggleEditMode()
    })

    expect(result.current.isEditMode).toBe(true)

    act(() => {
      result.current.toggleEditMode()
    })

    expect(result.current.isEditMode).toBe(false)
    expect(result.current.editingShots).toEqual(new Set()) // 편집 모드 종료 시 편집중인 샷 초기화
  })

  // RED: 단일 샷 편집 시작/종료 테스트
  it('should handle single shot editing state', () => {
    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(mockStoryboardData)
    )

    // 편집 시작
    act(() => {
      result.current.startEditingShot(3)
    })

    expect(result.current.editingShots.has(3)).toBe(true)
    expect(result.current.isEditMode).toBe(true) // 자동으로 편집 모드 활성화

    // 편집 종료
    act(() => {
      result.current.stopEditingShot(3)
    })

    expect(result.current.editingShots.has(3)).toBe(false)
  })

  // RED: 다중 샷 동시 편집 테스트
  it('should support multiple shots editing simultaneously', () => {
    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(mockStoryboardData)
    )

    act(() => {
      result.current.startEditingShot(1)
      result.current.startEditingShot(5)
      result.current.startEditingShot(9)
    })

    expect(result.current.editingShots.size).toBe(3)
    expect(result.current.editingShots.has(1)).toBe(true)
    expect(result.current.editingShots.has(5)).toBe(true)
    expect(result.current.editingShots.has(9)).toBe(true)
  })

  // RED: 프롬프트 업데이트 테스트 (실시간)
  it('should update shot prompt in real-time without API call', () => {
    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(mockStoryboardData)
    )

    const newPrompt = '업데이트된 샷 1 프롬프트'

    act(() => {
      result.current.updateShotPrompt(1, newPrompt)
    })

    // 로컬 상태가 즉시 업데이트되어야 함
    const updatedShot = result.current.storyboardData.images.find(img => img.shotNumber === 1)
    expect(updatedShot?.prompt).toBe(newPrompt)

    // 보류 중인 변경사항에 추가되어야 함
    expect(result.current.pendingChanges).toHaveLength(1)
    expect(result.current.pendingChanges[0]).toEqual({
      shotNumber: 1,
      type: 'prompt_update',
      newPrompt,
      timestamp: expect.any(Date)
    })
  })

  // RED: 샷 재생성 테스트 (API 호출 포함)
  it('should regenerate shot with API call', async () => {
    mockRegenerateShot.mockResolvedValue({
      shotNumber: 3,
      imageUrl: 'https://storage.googleapis.com/test-bucket/shot-3-v2.webp',
      thumbnailUrl: 'https://storage.googleapis.com/test-bucket/thumb-3-v2.webp',
      prompt: '재생성된 샷 3 프롬프트',
      generationTime: 3200,
      status: 'completed',
      provider: 'google',
      version: 2,
      styleMetrics: { consistency: 0.88, colorHarmony: 0.92 }
    })

    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(mockStoryboardData)
    )

    let regeneratedShot
    await act(async () => {
      regeneratedShot = await result.current.regenerateShot(3, '재생성된 샷 3 프롬프트')
    })

    // API 호출 확인
    expect(mockRegenerateShot).toHaveBeenCalledWith({
      projectId: 'test_project_001',
      shotNumber: 3,
      newPrompt: '재생성된 샷 3 프롬프트',
      styleSettings: mockStoryboardData.metadata.styleSettings
    })

    // 상태 업데이트 확인
    const updatedShot = result.current.storyboardData.images.find(img => img.shotNumber === 3)
    expect(updatedShot?.imageUrl).toBe('https://storage.googleapis.com/test-bucket/shot-3-v2.webp')
    expect(updatedShot?.version).toBe(2)
    expect(regeneratedShot).toBeDefined()
  })

  // RED: 배치 재생성 테스트
  it('should handle batch regeneration with progress tracking', async () => {
    mockRegenerateShot
      .mockResolvedValueOnce({
        shotNumber: 1,
        imageUrl: 'new-1.webp',
        status: 'completed',
        generationTime: 2000,
        prompt: 'new prompt 1'
      })
      .mockResolvedValueOnce({
        shotNumber: 2,
        imageUrl: 'new-2.webp',
        status: 'completed',
        generationTime: 2500,
        prompt: 'new prompt 2'
      })
      .mockResolvedValueOnce({
        shotNumber: 3,
        imageUrl: 'new-3.webp',
        status: 'completed',
        generationTime: 2200,
        prompt: 'new prompt 3'
      })

    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(mockStoryboardData)
    )

    const progressCallback = jest.fn()
    const shotsToRegenerate = [
      { shotNumber: 1, newPrompt: 'new prompt 1' },
      { shotNumber: 2, newPrompt: 'new prompt 2' },
      { shotNumber: 3, newPrompt: 'new prompt 3' }
    ]

    await act(async () => {
      await result.current.batchRegenerateShots(shotsToRegenerate, progressCallback)
    })

    // 진행률 콜백 확인
    expect(progressCallback).toHaveBeenCalledTimes(4) // 시작 + 3개 완료
    expect(progressCallback).toHaveBeenLastCalledWith({
      completed: 3,
      total: 3,
      percentage: 100
    })

    // 모든 샷이 업데이트되었는지 확인
    expect(mockRegenerateShot).toHaveBeenCalledTimes(3)
  })

  // RED: 변경사항 자동 저장 테스트
  it('should auto-save pending changes after debounce', async () => {
    jest.useFakeTimers()
    
    const mockSaveChanges = jest.fn().mockResolvedValue(true)
    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(mockStoryboardData, {
        autoSave: true,
        autoSaveDelay: 2000,
        onSaveChanges: mockSaveChanges
      })
    )

    // 여러 변경사항을 빠르게 추가
    act(() => {
      result.current.updateShotPrompt(1, '변경 1')
      result.current.updateShotPrompt(2, '변경 2')
      result.current.updateShotPrompt(3, '변경 3')
    })

    expect(result.current.pendingChanges).toHaveLength(3)

    // 디바운스 타이머 실행
    act(() => {
      jest.advanceTimersByTime(2000)
    })

    await waitFor(() => {
      expect(mockSaveChanges).toHaveBeenCalledTimes(1)
      expect(result.current.pendingChanges).toHaveLength(0)
    })

    jest.useRealTimers()
  })

  // RED: 실시간 협업 업데이트 테스트
  it('should handle external updates while editing', () => {
    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(mockStoryboardData)
    )

    // 로컬에서 편집 중
    act(() => {
      result.current.startEditingShot(5)
      result.current.updateShotPrompt(5, '로컬 편집')
    })

    // 외부에서 다른 샷 업데이트
    const externalUpdate = {
      ...mockStoryboardData,
      images: mockStoryboardData.images.map(img => 
        img.shotNumber === 7 ? { ...img, prompt: '외부에서 업데이트됨' } : img
      )
    }

    act(() => {
      result.current.handleExternalUpdate(externalUpdate)
    })

    // 편집 중이 아닌 샷은 외부 업데이트 적용
    const shot7 = result.current.storyboardData.images.find(img => img.shotNumber === 7)
    expect(shot7?.prompt).toBe('외부에서 업데이트됨')

    // 편집 중인 샷은 로컬 변경사항 유지
    const shot5 = result.current.storyboardData.images.find(img => img.shotNumber === 5)
    expect(shot5?.prompt).toBe('로컬 편집')
  })

  // RED: 에러 처리 테스트
  it('should handle regeneration errors gracefully', async () => {
    mockRegenerateShot.mockRejectedValue(new Error('재생성 API 오류'))

    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(mockStoryboardData)
    )

    await act(async () => {
      const result_promise = result.current.regenerateShot(1, '실패할 프롬프트')
      await expect(result_promise).rejects.toThrow('재생성 API 오류')
    })

    // 에러 상태 확인
    expect(result.current.operationProgress?.status).toBe('error')
    expect(result.current.operationProgress?.error).toBe('재생성 API 오류')
  })

  // RED: 변경사항 되돌리기 테스트
  it('should support undoing recent changes', () => {
    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(mockStoryboardData)
    )

    const originalPrompt = mockStoryboardData.images[0].prompt

    act(() => {
      result.current.updateShotPrompt(1, '첫 번째 변경')
      result.current.updateShotPrompt(1, '두 번째 변경')
      result.current.updateShotPrompt(1, '세 번째 변경')
    })

    const shot1 = result.current.storyboardData.images.find(img => img.shotNumber === 1)
    expect(shot1?.prompt).toBe('세 번째 변경')

    // 한 단계 되돌리기
    act(() => {
      result.current.undoLastChange(1)
    })

    const shot1AfterUndo = result.current.storyboardData.images.find(img => img.shotNumber === 1)
    expect(shot1AfterUndo?.prompt).toBe('두 번째 변경')

    // 모든 변경사항 되돌리기
    act(() => {
      result.current.resetShotToOriginal(1)
    })

    const shot1AfterReset = result.current.storyboardData.images.find(img => img.shotNumber === 1)
    expect(shot1AfterReset?.prompt).toBe(originalPrompt)
  })

  // RED: 성능 테스트 (큰 데이터셋)
  it('should handle large number of shots efficiently', () => {
    const largeStoryboard = {
      ...mockStoryboardData,
      images: Array.from({ length: 100 }, (_, i) => ({
        ...mockStoryboardData.images[0],
        shotNumber: i + 1,
        prompt: `Large shot ${i + 1}`
      }))
    }

    const startTime = performance.now()
    
    const { result } = renderHook(() => 
      useRealtimeStoryboardEdit(largeStoryboard)
    )

    // 여러 샷 동시 편집
    act(() => {
      for (let i = 1; i <= 50; i++) {
        result.current.updateShotPrompt(i, `Updated shot ${i}`)
      }
    })

    const endTime = performance.now()
    const processingTime = endTime - startTime

    // 100ms 이내에 완료되어야 함
    expect(processingTime).toBeLessThan(100)
    expect(result.current.pendingChanges).toHaveLength(50)
  })
})