'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { StoryboardGrid as StoryboardGridType, GeneratedImage, regenerateShot } from '@/shared/api/gemini'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'

interface StoryboardGridProps {
  storyboardData: StoryboardGridType
  onReorder?: (params: { from: number; to: number; projectId: string }) => void
  onExport?: (params: { projectId: string; format: 'png' | 'pdf'; includeMetrics?: boolean }) => Promise<{ gridImageUrl?: string; pdfUrl?: string }>
}

interface ShotRegenerationState {
  shotNumber: number | null
  isGenerating: boolean
  newPrompt: string
  error?: string
}

interface ImageModalState {
  isOpen: boolean
  image: GeneratedImage | null
}

export function StoryboardGrid({ 
  storyboardData, 
  onReorder,
  onExport 
}: StoryboardGridProps) {
  const [images, setImages] = useState(storyboardData.images)
  const [regenerationState, setRegenerationState] = useState<ShotRegenerationState>({
    shotNumber: null,
    isGenerating: false,
    newPrompt: ''
  })
  const [imageModal, setImageModal] = useState<ImageModalState>({
    isOpen: false,
    image: null
  })
  const [draggedShot, setDraggedShot] = useState<number | null>(null)
  const [focusedShot, setFocusedShot] = useState<number>(1)
  const gridRef = useRef<HTMLDivElement>(null)

  // 그리드 레이아웃 클래스 매핑
  const getGridClass = useCallback((layout: StoryboardGridType['gridLayout']) => {
    const baseClasses = 'grid gap-4 w-full'
    const layoutClasses = {
      '3x4': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
      '4x3': 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
      '2x6': 'grid-cols-1 sm:grid-cols-2',
      '6x2': 'grid-cols-2 sm:grid-cols-4 md:grid-cols-6'
    }
    return `${baseClasses} ${layoutClasses[layout]}`
  }, [])

  // 개별 샷 재생성 핸들러
  const handleRegenerateShot = useCallback(async (shotNumber: number, newPrompt: string) => {
    setRegenerationState(prev => ({ ...prev, isGenerating: true, error: undefined }))

    try {
      const regeneratedImage = await regenerateShot({
        projectId: storyboardData.projectId,
        shotNumber,
        newPrompt,
        styleSettings: storyboardData.metadata.styleSettings
      })

      if (regeneratedImage.status === 'completed') {
        setImages(prev => prev.map(img => 
          img.shotNumber === shotNumber ? regeneratedImage : img
        ))
        setRegenerationState({
          shotNumber: null,
          isGenerating: false,
          newPrompt: ''
        })
      } else {
        throw new Error(regeneratedImage.errorMessage || '재생성에 실패했습니다')
      }
    } catch (error) {
      setRegenerationState(prev => ({
        ...prev,
        isGenerating: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
      }))
    }
  }, [storyboardData.projectId, storyboardData.metadata.styleSettings])

  // 키보드 네비게이션 핸들러
  const handleKeyNavigation = useCallback((e: React.KeyboardEvent, shotNumber: number) => {
    const { gridLayout } = storyboardData
    const cols = gridLayout === '3x4' ? 3 : gridLayout === '4x3' ? 4 : gridLayout === '2x6' ? 2 : 6
    let nextShot = shotNumber

    switch (e.key) {
      case 'ArrowRight':
        nextShot = Math.min(shotNumber + 1, images.length)
        break
      case 'ArrowLeft':
        nextShot = Math.max(shotNumber - 1, 1)
        break
      case 'ArrowDown':
        nextShot = Math.min(shotNumber + cols, images.length)
        break
      case 'ArrowUp':
        nextShot = Math.max(shotNumber - cols, 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        const image = images.find(img => img.shotNumber === shotNumber)
        if (image) {
          setImageModal({ isOpen: true, image })
        }
        return
      default:
        return
    }

    if (nextShot !== shotNumber) {
      e.preventDefault()
      setFocusedShot(nextShot)
      const nextElement = document.querySelector(`[data-shot="${nextShot}"]`) as HTMLElement
      nextElement?.focus()
    }
  }, [images, storyboardData.gridLayout])

  // 드래그 앤 드롭 핸들러
  const handleDragStart = useCallback((e: React.DragEvent, shotNumber: number) => {
    setDraggedShot(shotNumber)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetShotNumber: number) => {
    e.preventDefault()
    
    if (draggedShot && draggedShot !== targetShotNumber && onReorder) {
      onReorder({
        from: draggedShot,
        to: targetShotNumber,
        projectId: storyboardData.projectId
      })
    }
    
    setDraggedShot(null)
  }, [draggedShot, onReorder, storyboardData.projectId])

  // 전체 일관성 점수 계산
  const overallConsistency = storyboardData.overallConsistency || 
    images.reduce((sum, img) => sum + (img.styleMetrics?.consistency || 0), 0) / images.length

  return (
    <div className="space-y-6">
      {/* 헤더 영역 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-900">
            12샷 스토리보드
          </h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>전체 일관성: {Math.round(overallConsistency * 100)}%</span>
            <span>생성 시간: {Math.round(storyboardData.totalGenerationTime / 1000)}초</span>
            {storyboardData.failedShots && storyboardData.failedShots.length > 0 && (
              <span className="text-red-600">
                실패한 샷: {storyboardData.failedShots.length}개
              </span>
            )}
          </div>
        </div>
        
        {onExport && (
          <button
            type="button"
            onClick={() => onExport({ 
              projectId: storyboardData.projectId, 
              format: 'png',
              includeMetrics: true 
            })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            스토리보드 내보내기
          </button>
        )}
      </div>

      {/* 메인 그리드 */}
      <div
        ref={gridRef}
        data-testid="storyboard-grid"
        className={getGridClass(storyboardData.gridLayout)}
        role="grid"
        aria-label="12샷 스토리보드 그리드"
      >
        {images.map((image, index) => (
          <motion.div
            key={`${image.shotNumber}-${image.version || 1}`}
            data-testid={`shot-container-${image.shotNumber}`}
            className={clsx(
              'relative group bg-white rounded-lg shadow-md overflow-hidden',
              'border-2 transition-all duration-200 cursor-pointer',
              {
                'border-gray-200 hover:border-blue-300': image.status === 'completed',
                'border-red-500 bg-red-50': image.status === 'failed',
                'border-yellow-500 bg-yellow-50': regenerationState.shotNumber === image.shotNumber && regenerationState.isGenerating,
                'ring-2 ring-blue-500': focusedShot === image.shotNumber
              }
            )}
            draggable
            onDragStart={(e) => handleDragStart(e, image.shotNumber)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, image.shotNumber)}
            role="gridcell"
            tabIndex={0}
            data-shot={image.shotNumber}
            onKeyDown={(e) => handleKeyNavigation(e, image.shotNumber)}
            onFocus={() => setFocusedShot(image.shotNumber)}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* 샷 번호 라벨 */}
            <div className="absolute top-2 left-2 z-10">
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-black bg-opacity-70 text-white">
                샷 {image.shotNumber}
              </span>
              {image.version && image.version > 1 && (
                <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-xs bg-blue-600 text-white">
                  v{image.version}
                </span>
              )}
            </div>

            {/* 이미지 영역 */}
            <div 
              className="aspect-video relative bg-gray-100"
              onClick={() => setImageModal({ isOpen: true, image })}
            >
              {image.status === 'completed' && image.imageUrl ? (
                <img
                  src={image.thumbnailUrl || image.imageUrl}
                  alt={`스토리보드 샷 ${image.shotNumber}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  data-testid={`shot-image-${image.shotNumber}`}
                />
              ) : image.status === 'failed' ? (
                <div className="w-full h-full flex items-center justify-center text-red-500">
                  <div className="text-center">
                    <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs">생성 실패</p>
                  </div>
                </div>
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center"
                  data-testid={`shot-loading-${image.shotNumber}`}
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              {/* 로딩 오버레이 */}
              {regenerationState.shotNumber === image.shotNumber && regenerationState.isGenerating && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                    <p className="text-xs">재생성 중...</p>
                  </div>
                </div>
              )}
            </div>

            {/* 프롬프트 텍스트 */}
            <div className="p-3">
              <p className="text-xs text-gray-600 line-clamp-2" title={image.prompt}>
                {image.prompt}
              </p>
              
              {/* 스타일 메트릭스 (호버 시 표시) */}
              <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {image.styleMetrics && (
                  <div className="flex space-x-3 text-xs">
                    <span>일관성: {Math.round(image.styleMetrics.consistency * 100)}%</span>
                    <span>색상 조화: {Math.round(image.styleMetrics.colorHarmony * 100)}%</span>
                    {image.styleMetrics.characterSimilarity && (
                      <span>캐릭터 유사도: {Math.round(image.styleMetrics.characterSimilarity * 100)}%</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setRegenerationState({
                      shotNumber: image.shotNumber,
                      isGenerating: false,
                      newPrompt: image.prompt
                    })
                  }}
                  className="p-1 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-md shadow-sm"
                  data-testid={image.status === 'failed' ? `retry-shot-${image.shotNumber}` : `regenerate-shot-${image.shotNumber}`}
                  aria-label={image.status === 'failed' ? '재시도' : '재생성'}
                >
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* 재생성 다이얼로그 */}
      <AnimatePresence>
        {regenerationState.shotNumber && !regenerationState.isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setRegenerationState({ shotNumber: null, isGenerating: false, newPrompt: '' })
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium mb-4">
                샷 {regenerationState.shotNumber} {
                  images.find(img => img.shotNumber === regenerationState.shotNumber)?.status === 'failed' 
                    ? '재시도' 
                    : '재생성'
                }
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="new-prompt" className="block text-sm font-medium text-gray-700 mb-1">
                    새 프롬프트
                  </label>
                  <textarea
                    id="new-prompt"
                    value={regenerationState.newPrompt}
                    onChange={(e) => setRegenerationState(prev => ({ ...prev, newPrompt: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="새로운 프롬프트를 입력하세요..."
                  />
                </div>

                {regenerationState.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{regenerationState.error}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setRegenerationState({ shotNumber: null, isGenerating: false, newPrompt: '' })}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (regenerationState.shotNumber && regenerationState.newPrompt.trim()) {
                        handleRegenerateShot(regenerationState.shotNumber, regenerationState.newPrompt.trim())
                      }
                    }}
                    disabled={!regenerationState.newPrompt.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-md transition-colors"
                  >
                    재생성 실행
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 이미지 확대 모달 */}
      <AnimatePresence>
        {imageModal.isOpen && imageModal.image && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50"
            data-testid="image-modal"
            onClick={() => setImageModal({ isOpen: false, image: null })}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={imageModal.image.imageUrl}
                alt={`스토리보드 샷 ${imageModal.image.shotNumber} 확대보기`}
                className="max-w-full max-h-full object-contain"
                data-testid="modal-image"
              />
              
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg">
                <h4 className="font-medium">샷 {imageModal.image.shotNumber}</h4>
                <p className="text-sm mt-1 opacity-90">{imageModal.image.prompt}</p>
              </div>
              
              <button
                type="button"
                onClick={() => setImageModal({ isOpen: false, image: null })}
                className="absolute top-4 right-4 p-2 bg-black bg-opacity-70 hover:bg-opacity-90 text-white rounded-full transition-colors"
                data-testid="close-modal"
                aria-label="모달 닫기"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}