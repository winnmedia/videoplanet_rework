'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { StoryboardGrid, GeneratedImage, regenerateShot } from '@/shared/api/gemini'
import { debounce } from 'lodash-es'

// 변경사항 타입 정의
interface PendingChange {
  shotNumber: number
  type: 'prompt_update' | 'style_change' | 'position_change'
  newPrompt?: string
  newStyle?: any
  newPosition?: { x: number; y: number }
  timestamp: Date
  previousValue?: any
}

// 작업 진행률 타입
interface OperationProgress {
  status: 'idle' | 'in_progress' | 'completed' | 'error'
  operation: string
  completed: number
  total: number
  percentage: number
  currentShot?: number
  error?: string
  startTime?: Date
  estimatedTimeRemaining?: number
}

// Hook 옵션 타입
interface UseRealtimeStoryboardEditOptions {
  autoSave?: boolean
  autoSaveDelay?: number
  maxPendingChanges?: number
  enableUndo?: boolean
  maxUndoHistory?: number
  onSaveChanges?: (changes: PendingChange[]) => Promise<boolean>
  onError?: (error: Error) => void
  onExternalUpdate?: (storyboard: StoryboardGrid) => void
}

// 배치 재생성 요청 타입
interface BatchRegenerateRequest {
  shotNumber: number
  newPrompt: string
}

// 진행률 콜백 타입
interface ProgressCallback {
  (progress: { completed: number; total: number; percentage: number }): void
}

export function useRealtimeStoryboardEdit(
  initialStoryboard: StoryboardGrid,
  options: UseRealtimeStoryboardEditOptions = {}
) {
  const {
    autoSave = false,
    autoSaveDelay = 2000,
    maxPendingChanges = 50,
    enableUndo = true,
    maxUndoHistory = 10,
    onSaveChanges,
    onError,
    onExternalUpdate
  } = options

  // 상태 관리
  const [storyboardData, setStoryboardData] = useState<StoryboardGrid>(initialStoryboard)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingShots, setEditingShots] = useState<Set<number>>(new Set())
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([])
  const [operationProgress, setOperationProgress] = useState<OperationProgress | null>(null)
  
  // Undo 기능을 위한 히스토리 관리
  const [changeHistory, setChangeHistory] = useState<Map<number, any[]>>(new Map())
  const [originalData, setOriginalData] = useState<StoryboardGrid>(initialStoryboard)

  // Refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const isExternalUpdateRef = useRef(false)

  // 디바운스된 자동 저장 함수
  const debouncedAutoSave = useMemo(() => 
    debounce(async (changes: PendingChange[]) => {
      if (changes.length === 0 || !onSaveChanges) return

      try {
        const success = await onSaveChanges(changes)
        if (success) {
          setPendingChanges([])
        }
      } catch (error) {
        onError?.(error as Error)
      }
    }, autoSaveDelay),
    [autoSaveDelay, onSaveChanges, onError]
  )

  // 편집 모드 토글
  const toggleEditMode = useCallback(() => {
    setIsEditMode(prev => {
      if (prev) {
        // 편집 모드 종료 시 편집중인 샷 초기화
        setEditingShots(new Set())
      }
      return !prev
    })
  }, [])

  // 개별 샷 편집 시작
  const startEditingShot = useCallback((shotNumber: number) => {
    setIsEditMode(true)
    setEditingShots(prev => new Set([...prev, shotNumber]))
  }, [])

  // 개별 샷 편집 종료
  const stopEditingShot = useCallback((shotNumber: number) => {
    setEditingShots(prev => {
      const newSet = new Set(prev)
      newSet.delete(shotNumber)
      return newSet
    })
  }, [])

  // 변경사항 히스토리 추가
  const addToHistory = useCallback((shotNumber: number, previousValue: any) => {
    if (!enableUndo) return

    setChangeHistory(prev => {
      const newHistory = new Map(prev)
      const shotHistory = newHistory.get(shotNumber) || []
      
      shotHistory.push(previousValue)
      
      // 최대 히스토리 개수 제한
      if (shotHistory.length > maxUndoHistory) {
        shotHistory.shift()
      }
      
      newHistory.set(shotNumber, shotHistory)
      return newHistory
    })
  }, [enableUndo, maxUndoHistory])

  // 샷 프롬프트 실시간 업데이트
  const updateShotPrompt = useCallback((shotNumber: number, newPrompt: string) => {
    if (isExternalUpdateRef.current) return

    setStoryboardData(prevData => {
      const currentImage = prevData.images.find(img => img.shotNumber === shotNumber)
      if (!currentImage) return prevData

      // 히스토리 추가
      addToHistory(shotNumber, currentImage.prompt)

      return {
        ...prevData,
        images: prevData.images.map(img =>
          img.shotNumber === shotNumber
            ? { ...img, prompt: newPrompt }
            : img
        )
      }
    })

    // 보류 중인 변경사항에 추가
    setPendingChanges(prev => {
      if (prev.length >= maxPendingChanges) {
        console.warn('최대 보류 변경사항 수에 도달했습니다. 일부 변경사항이 손실될 수 있습니다.')
        return prev
      }

      const existingChangeIndex = prev.findIndex(
        change => change.shotNumber === shotNumber && change.type === 'prompt_update'
      )

      const newChange: PendingChange = {
        shotNumber,
        type: 'prompt_update',
        newPrompt,
        timestamp: new Date()
      }

      if (existingChangeIndex >= 0) {
        // 기존 변경사항 업데이트
        const newChanges = [...prev]
        newChanges[existingChangeIndex] = newChange
        return newChanges
      }

      return [...prev, newChange]
    })

    // 자동 저장 트리거
    if (autoSave && debouncedAutoSave) {
      debouncedAutoSave(pendingChanges)
    }
  }, [addToHistory, maxPendingChanges, autoSave, debouncedAutoSave, pendingChanges])

  // 단일 샷 재생성
  const regenerateShot = useCallback(async (shotNumber: number, newPrompt: string): Promise<GeneratedImage> => {
    setOperationProgress({
      status: 'in_progress',
      operation: `샷 ${shotNumber} 재생성`,
      completed: 0,
      total: 1,
      percentage: 0,
      currentShot: shotNumber,
      startTime: new Date()
    })

    try {
      const result = await regenerateShot({
        projectId: storyboardData.projectId,
        shotNumber,
        newPrompt,
        styleSettings: storyboardData.metadata.styleSettings
      })

      if (result.status === 'completed') {
        setStoryboardData(prevData => ({
          ...prevData,
          images: prevData.images.map(img =>
            img.shotNumber === shotNumber ? result : img
          )
        }))

        setOperationProgress({
          status: 'completed',
          operation: `샷 ${shotNumber} 재생성 완료`,
          completed: 1,
          total: 1,
          percentage: 100
        })

        // 편집 상태 종료
        stopEditingShot(shotNumber)
      } else {
        throw new Error(result.errorMessage || '재생성에 실패했습니다')
      }

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      
      setOperationProgress({
        status: 'error',
        operation: `샷 ${shotNumber} 재생성 실패`,
        completed: 0,
        total: 1,
        percentage: 0,
        error: errorMessage
      })

      onError?.(error as Error)
      throw error
    }
  }, [storyboardData, stopEditingShot, onError])

  // 배치 재생성
  const batchRegenerateShots = useCallback(async (
    requests: BatchRegenerateRequest[],
    onProgress?: ProgressCallback
  ) => {
    const totalShots = requests.length
    let completed = 0

    setOperationProgress({
      status: 'in_progress',
      operation: `${totalShots}개 샷 배치 재생성`,
      completed: 0,
      total: totalShots,
      percentage: 0,
      startTime: new Date()
    })

    const results: GeneratedImage[] = []

    for (const request of requests) {
      try {
        const result = await regenerateShot(request.shotNumber, request.newPrompt)
        results.push(result)
        completed++

        const percentage = Math.round((completed / totalShots) * 100)
        
        setOperationProgress(prev => prev ? {
          ...prev,
          completed,
          percentage,
          currentShot: request.shotNumber
        } : null)

        onProgress?.({ completed, total: totalShots, percentage })
      } catch (error) {
        console.error(`샷 ${request.shotNumber} 재생성 실패:`, error)
        // 개별 실패는 배치 전체를 중단시키지 않음
      }
    }

    setOperationProgress({
      status: 'completed',
      operation: `배치 재생성 완료 (${results.length}/${totalShots})`,
      completed: totalShots,
      total: totalShots,
      percentage: 100
    })

    return results
  }, [regenerateShot])

  // 마지막 변경사항 되돌리기
  const undoLastChange = useCallback((shotNumber: number) => {
    if (!enableUndo) return

    const shotHistory = changeHistory.get(shotNumber)
    if (!shotHistory || shotHistory.length === 0) return

    const previousValue = shotHistory.pop()
    
    setChangeHistory(prev => {
      const newHistory = new Map(prev)
      newHistory.set(shotNumber, shotHistory)
      return newHistory
    })

    setStoryboardData(prevData => ({
      ...prevData,
      images: prevData.images.map(img =>
        img.shotNumber === shotNumber
          ? { ...img, prompt: previousValue }
          : img
      )
    }))
  }, [enableUndo, changeHistory])

  // 샷을 원본으로 초기화
  const resetShotToOriginal = useCallback((shotNumber: number) => {
    const originalImage = originalData.images.find(img => img.shotNumber === shotNumber)
    if (!originalImage) return

    setStoryboardData(prevData => ({
      ...prevData,
      images: prevData.images.map(img =>
        img.shotNumber === shotNumber ? originalImage : img
      )
    }))

    // 히스토리 초기화
    setChangeHistory(prev => {
      const newHistory = new Map(prev)
      newHistory.delete(shotNumber)
      return newHistory
    })

    // 보류 중인 변경사항에서 제거
    setPendingChanges(prev => 
      prev.filter(change => change.shotNumber !== shotNumber)
    )
  }, [originalData])

  // 외부 업데이트 처리
  const handleExternalUpdate = useCallback((newStoryboard: StoryboardGrid) => {
    isExternalUpdateRef.current = true

    setStoryboardData(prevData => {
      const updatedImages = newStoryboard.images.map(newImg => {
        // 현재 편집 중인 샷은 로컬 변경사항 유지
        if (editingShots.has(newImg.shotNumber)) {
          const currentImg = prevData.images.find(img => img.shotNumber === newImg.shotNumber)
          return currentImg || newImg
        }
        return newImg
      })

      return {
        ...newStoryboard,
        images: updatedImages
      }
    })

    setTimeout(() => {
      isExternalUpdateRef.current = false
    }, 0)

    onExternalUpdate?.(newStoryboard)
  }, [editingShots, onExternalUpdate])

  // 모든 보류 중인 변경사항 저장
  const savePendingChanges = useCallback(async () => {
    if (pendingChanges.length === 0 || !onSaveChanges) return true

    try {
      const success = await onSaveChanges(pendingChanges)
      if (success) {
        setPendingChanges([])
      }
      return success
    } catch (error) {
      onError?.(error as Error)
      return false
    }
  }, [pendingChanges, onSaveChanges, onError])

  // 자동 저장 효과
  useEffect(() => {
    if (autoSave && pendingChanges.length > 0 && debouncedAutoSave) {
      debouncedAutoSave(pendingChanges)
    }
  }, [pendingChanges, autoSave, debouncedAutoSave])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      debouncedAutoSave.cancel()
    }
  }, [debouncedAutoSave])

  return {
    // 상태
    storyboardData,
    isEditMode,
    editingShots,
    pendingChanges,
    operationProgress,
    changeHistory: enableUndo ? changeHistory : undefined,

    // 편집 모드 제어
    toggleEditMode,
    startEditingShot,
    stopEditingShot,

    // 실시간 편집 함수
    updateShotPrompt,
    regenerateShot,
    batchRegenerateShots,

    // Undo/Reset 함수
    undoLastChange: enableUndo ? undoLastChange : undefined,
    resetShotToOriginal,

    // 외부 연동 함수
    handleExternalUpdate,
    savePendingChanges,

    // 유틸리티 함수
    hasUnsavedChanges: pendingChanges.length > 0,
    isOperationInProgress: operationProgress?.status === 'in_progress',
    canUndo: enableUndo ? (shotNumber: number) => {
      const history = changeHistory.get(shotNumber)
      return history && history.length > 0
    } : () => false
  }
}