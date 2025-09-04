/**
 * @fileoverview STEP 3: 12숏 편집·콘티·인서트·내보내기 컴포넌트
 * @description 12개 숏 편집, 콘티 생성, 인서트 추천, PDF/JSON 내보내기
 */

'use client'

import { useState, useCallback } from 'react'

import { cn } from '@/shared/lib/utils'
import { Button, Card, Input, Select } from '@/shared/ui/index.modern'

import type { 
  TwelveShotsEditorProps, 
  VideoShot, 
  InsertShot,
  ShotType,
  CameraMove,
  Composition,
  Transition,
  ExportOptions
} from '../model/types'

interface StoryboardState {
  [shotId: string]: {
    isLoading: boolean
    imageUrl?: string
    error?: string
  }
}

interface ExportState {
  isLoading: boolean
  format: 'json' | 'pdf' | null
  error?: string
  downloadUrl?: string
}

const SHOT_TYPE_OPTIONS: ShotType[] = [
  '익스트림 롱샷', '롱샷', '미디엄샷', '클로즈업', '익스트림 클로즈업', 
  '와이드샷', '버드아이뷰', '웜즈아이뷰'
]

const CAMERA_MOVE_OPTIONS: CameraMove[] = [
  '고정', '팬', '틸트', '줌인', '줌아웃', '트래킹', '크레인샷', '핸드헬드'
]

const COMPOSITION_OPTIONS: Composition[] = [
  '정면', '측면', '비스듬', '백샷', '오버 숄더', '3분의 1 법칙', '대칭', '비대칭'
]

const TRANSITION_OPTIONS: Transition[] = [
  '컷', '디졸브', '페이드인', '페이드아웃', '와이프', '점프컷', '매치컷', '크로스컷'
]

export const TwelveShotsEditor = ({
  shots,
  insertShots,
  onShotUpdate,
  onInsertUpdate,
  onGenerateStoryboard,
  onExport,
  onBack,
  isLoading = false
}: TwelveShotsEditorProps) => {
  const [storyboardStates, setStoryboardStates] = useState<StoryboardState>({})
  const [exportState, setExportState] = useState<ExportState>({ isLoading: false, format: null })
  const [showExportModal, setShowExportModal] = useState(false)

  // 스토리보드 생성
  const handleGenerateStoryboard = useCallback(async (shotId: string) => {
    setStoryboardStates(prev => ({
      ...prev,
      [shotId]: { isLoading: true }
    }))

    try {
      await onGenerateStoryboard(shotId)
      setStoryboardStates(prev => ({
        ...prev,
        [shotId]: { 
          isLoading: false, 
          imageUrl: `/mock-storyboard-${shotId}.jpg` // 실제로는 API에서 받은 URL
        }
      }))
    } catch (error) {
      setStoryboardStates(prev => ({
        ...prev,
        [shotId]: { 
          isLoading: false, 
          error: '스토리보드 생성에 실패했습니다.' 
        }
      }))
    }
  }, [onGenerateStoryboard])

  // 내보내기 처리
  const handleExport = useCallback(async (format: 'json' | 'pdf') => {
    const options: ExportOptions = {
      format,
      includeStoryboard: true,
      includeInserts: true,
      pdfLayout: 'landscape'
    }

    setExportState({ isLoading: true, format })
    
    try {
      await onExport(options)
      // 실제로는 onExport가 다운로드 URL을 반환하거나 자동 다운로드를 트리거
      setExportState({ 
        isLoading: false, 
        format: null,
        downloadUrl: `/mock-planning-${format}.${format === 'pdf' ? 'pdf' : 'json'}`
      })
      setShowExportModal(false)
    } catch (error) {
      setExportState({ 
        isLoading: false, 
        format: null, 
        error: '내보내기에 실패했습니다.' 
      })
    }
  }, [onExport])

  // 숏 카드 렌더링
  const renderShotCard = (shot: VideoShot, index: number) => (
    <Card key={shot.id} className="p-4 space-y-4" data-testid={`shot-card-${index}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          샷 {shot.order}
        </h3>
        <span className="text-sm text-gray-500">
          {shot.duration}초
        </span>
      </div>

      {/* 콘티 프레임 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">콘티 프레임</label>
        <div className="aspect-video bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center relative">
          {storyboardStates[shot.id]?.isLoading ? (
            <div className="text-center text-gray-500">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-2" />
              <div className="text-sm">콘티를 생성하고 있습니다...</div>
            </div>
          ) : storyboardStates[shot.id]?.imageUrl ? (
            <>
              <img 
                src={storyboardStates[shot.id].imageUrl} 
                alt="스토리보드"
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/90"
                  onClick={() => handleGenerateStoryboard(shot.id)}
                >
                  재생성
                </Button>
                <a 
                  href={storyboardStates[shot.id].imageUrl} 
                  download
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-white/90 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  다운로드
                </a>
              </div>
            </>
          ) : (
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <Button
                size="sm"
                onClick={() => handleGenerateStoryboard(shot.id)}
                disabled={storyboardStates[shot.id]?.isLoading}
              >
                생성
              </Button>
              {storyboardStates[shot.id]?.error && (
                <div className="text-xs text-red-500 mt-1">
                  {storyboardStates[shot.id].error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 편집 필드들 */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Input
            label="샷 제목/서술"
            value={shot.title}
            onChange={(e) => onShotUpdate(shot.id, { title: e.target.value })}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Select
            label="샷/카메라/구도"
            value={shot.shotType}
            onValueChange={(value) => onShotUpdate(shot.id, { shotType: value as ShotType })}
            options={SHOT_TYPE_OPTIONS.map(option => ({ value: option, label: option }))}
          />
          <Select
            value={shot.cameraMove}
            onValueChange={(value) => onShotUpdate(shot.id, { cameraMove: value as CameraMove })}
            options={CAMERA_MOVE_OPTIONS.map(option => ({ value: option, label: option }))}
          />
          <Select
            value={shot.composition}
            onValueChange={(value) => onShotUpdate(shot.id, { composition: value as Composition })}
            options={COMPOSITION_OPTIONS.map(option => ({ value: option, label: option }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="길이(초)"
              type="number"
              value={shot.duration}
              onChange={(e) => onShotUpdate(shot.id, { duration: parseInt(e.target.value) || 0 })}
              min={1}
              max={60}
            />
          </div>
          <div>
            <Select
              label="전환"
              value={shot.transition}
              onValueChange={(value) => onShotUpdate(shot.id, { transition: value as Transition })}
              options={TRANSITION_OPTIONS.map(option => ({ value: option, label: option }))}
            />
          </div>
        </div>

        <div>
          <Input
            label="대사/자막/오디오"
            value={shot.dialogue}
            onChange={(e) => onShotUpdate(shot.id, { dialogue: e.target.value })}
            placeholder="대사나 자막, 오디오 지시사항을 입력하세요"
            className="w-full"
          />
        </div>
      </div>
    </Card>
  )

  // 인서트 카드 렌더링
  const renderInsertCard = (insertShot: InsertShot, index: number) => (
    <Card key={insertShot.id} className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold text-gray-900">
          인서트 {index + 1}
        </h4>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onInsertUpdate(insertShot.id, { 
            description: `재생성된 인서트 ${index + 1} 설명`,
            framing: '재생성된 프레이밍'
          })}
        >
          재생성
        </Button>
      </div>

      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">목적</label>
          <Input
            value={insertShot.purpose}
            onChange={(e) => onInsertUpdate(insertShot.id, { purpose: e.target.value })}
            className="w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">컷 설명</label>
          <Input
            value={insertShot.description}
            onChange={(e) => onInsertUpdate(insertShot.id, { description: e.target.value })}
            className="w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">프레이밍</label>
          <Input
            value={insertShot.framing}
            onChange={(e) => onInsertUpdate(insertShot.id, { framing: e.target.value })}
            className="w-full text-sm"
          />
        </div>
      </div>
    </Card>
  )

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* 헤더 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          STEP 3: 12숏 편집·콘티·인서트·내보내기
        </h2>
        <p className="text-gray-600">
          각 숏을 세밀하게 편집하고, 콘티를 생성하여 완성된 기획서를 만드세요
        </p>
      </div>

      {/* 전체 정보 */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">프로젝트 개요</h3>
            <p className="text-sm text-gray-600 mt-1">
              총 {shots.length}개 숏 · 예상 길이 {shots.reduce((total, shot) => total + shot.duration, 0)}초
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowExportModal(true)}
              disabled={exportState.isLoading}
            >
              기획안 다운로드
            </Button>
          </div>
        </div>
      </Card>

      {/* 12숏 그리드 (3x4) */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">12개 숏 구성</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {shots.map((shot, index) => renderShotCard(shot, index))}
        </div>
      </div>

      {/* 인서트 3컷 추천 */}
      {insertShots.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">인서트 3컷 추천</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insertShots.map((insertShot, index) => renderInsertCard(insertShot, index))}
          </div>
        </div>
      )}

      {/* 액션 버튼들 */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
        >
          이전
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => {
              // 전체 진행률 계산 및 프로젝트 저장
              console.log('프로젝트 저장 중...')
            }}
            disabled={isLoading}
          >
            프로젝트 저장
          </Button>
        </div>
      </div>

      {/* 내보내기 모달 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              기획안 다운로드
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  원하는 형식을 선택하세요
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleExport('json')}
                    disabled={exportState.isLoading}
                    className="h-20 flex-col"
                  >
                    <div className="text-lg mb-1">📄</div>
                    <div className="text-sm">JSON</div>
                    <div className="text-xs text-gray-500">데이터 파일</div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => handleExport('pdf')}
                    disabled={exportState.isLoading}
                    className="h-20 flex-col"
                  >
                    <div className="text-lg mb-1">📑</div>
                    <div className="text-sm">Marp PDF</div>
                    <div className="text-xs text-gray-500">A4 가로, 여백 0</div>
                  </Button>
                </div>
              </div>

              {exportState.isLoading && (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <div className="text-sm text-gray-600">
                    {exportState.format === 'pdf' ? 'PDF를 생성하고 있습니다...' : 'JSON을 생성하고 있습니다...'}
                  </div>
                </div>
              )}

              {exportState.error && (
                <div className="text-sm text-red-600 text-center">
                  {exportState.error}
                </div>
              )}

              {exportState.downloadUrl && (
                <div className="text-center">
                  <a 
                    href={exportState.downloadUrl} 
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF 다운로드
                  </a>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExportModal(false)
                  setExportState({ isLoading: false, format: null })
                }}
                disabled={exportState.isLoading}
              >
                닫기
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 도움말 */}
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="text-sm text-green-800">
          <div className="font-medium mb-2">완성 가이드:</div>
          <ul className="space-y-1 text-green-700">
            <li>• 각 숏의 콘티를 생성하여 시각적 구성을 확인하세요</li>
            <li>• 인서트 컷으로 영상의 완성도를 높이세요</li>
            <li>• JSON 파일은 향후 편집에 활용할 수 있습니다</li>
            <li>• PDF는 프레젠테이션용으로 최적화되어 있습니다</li>
          </ul>
        </div>
      </Card>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="text-center text-gray-600">
          <div className="text-sm">작업을 처리하고 있습니다...</div>
        </div>
      )}
    </div>
  )
}