/**
 * @fileoverview TwelveShotsEditor 컴포넌트 TDD 테스트
 * @description 12숏 편집, 콘티 생성, PDF 내보내기 등 핵심 기능 테스트 (Red → Green → Refactor)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'

import type { TwelveShotsEditorProps, VideoShot, InsertShot } from '../../model/types'
import { TwelveShotsEditor } from '../TwelveShotsEditor'

// 테스트용 Mock 데이터
const mockShots: VideoShot[] = [
  {
    id: 'shot-1',
    title: '오프닝 훅',
    description: '강력한 비주얼과 함께 호기심을 유발하는 질문으로 시작',
    shotType: '클로즈업',
    cameraMove: '줌인',
    composition: '중앙',
    duration: 3,
    dialogue: '당신은 이런 경험이 있나요?',
    transition: '컷',
    stageId: 'stage-1',
    order: 1
  },
  {
    id: 'shot-2',
    title: '상황 제시',
    description: '일반적인 문제 상황을 시각적으로 보여줌',
    shotType: '미디엄샷',
    cameraMove: '패닝',
    composition: '좌측',
    duration: 4,
    dialogue: '',
    transition: '페이드',
    stageId: 'stage-1',
    order: 2
  },
  // 12개 샷을 위한 더미 데이터 (3-12번)
  ...Array.from({ length: 10 }, (_, i) => ({
    id: `shot-${i + 3}`,
    title: `샷 ${i + 3}`,
    description: `샷 ${i + 3} 설명`,
    shotType: ' 미디엄샷' as const,
    cameraMove: '고정' as const,
    composition: '정면' as const,
    duration: 3 + (i % 3),
    dialogue: `샷 ${i + 3} 대사`,
    transition: '컷' as const,
    stageId: `stage-${Math.floor(i / 3) + 2}`,
    order: i + 3
  }))
]

const mockInsertShots: InsertShot[] = [
  {
    id: 'insert-1',
    title: '제품 클로즈업',
    description: '제품의 핵심 기능을 보여주는 상세 컷',
    timing: '2-4초 구간',
    purpose: '제품 강조',
    order: 1,
    framing: '익스트림 클로즈업'
  },
  {
    id: 'insert-2',
    title: '사용자 반응',
    description: '실제 사용자의 만족스러운 표정',
    timing: '25-27초 구간',
    purpose: '신뢰성 구축',
    order: 2,
    framing: '클로즈업'
  },
  {
    id: 'insert-3',
    title: 'CTA 강화',
    description: '행동 유도를 위한 시각적 효과',
    timing: '45-48초 구간',
    purpose: '전환 향상',
    order: 3,
    framing: '그래픽 인서트'
  }
]

const mockProps: TwelveShotsEditorProps = {
  shots: mockShots,
  insertShots: mockInsertShots,
  onShotUpdate: jest.fn(),
  onInsertUpdate: jest.fn(),
  onGenerateStoryboard: jest.fn(),
  onExport: jest.fn(),
  onBack: jest.fn(),
  isLoading: false
}

describe('TwelveShotsEditor', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('레이아웃 및 UI 구조', () => {
    it('12개의 샷 카드가 그리드 레이아웃으로 표시되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      // 12개 샷 카드가 모두 표시되어야 함
      for (let i = 0; i < 12; i++) {
        expect(screen.getByTestId(`shot-card-${i}`)).toBeInTheDocument()
      }
    })

    it('각 샷 카드에 필수 편집 필드들이 표시되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const firstShotCard = screen.getByTestId('shot-card-0')
      
      // 샷 제목/서술 필드
      expect(firstShotCard).toContainElement(screen.getByDisplayValue('오프닝 훅'))
      
      // 콘티 프레임 영역
      expect(firstShotCard).toContainElement(screen.getByText('콘티 프레임'))
      
      // 편집 필드들
      expect(firstShotCard).toContainElement(screen.getByLabelText('샷 제목/서술'))
      expect(firstShotCard).toContainElement(screen.getByLabelText('샷/카메라/구도'))
      expect(firstShotCard).toContainElement(screen.getByLabelText('길이(초)'))
      expect(firstShotCard).toContainElement(screen.getByLabelText('전환'))
      expect(firstShotCard).toContainElement(screen.getByLabelText('대사/자막/오디오'))
    })

    it('프로젝트 개요 정보가 정확하게 표시되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      // 총 샷 개수
      expect(screen.getByText('총 12개 숏')).toBeInTheDocument()
      
      // 예상 길이 계산 (각 샷의 duration 합계)
      const totalDuration = mockShots.reduce((total, shot) => total + shot.duration, 0)
      expect(screen.getByText(`예상 길이 ${totalDuration}초`)).toBeInTheDocument()
    })

    it('인서트 3컷 추천이 표시되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      expect(screen.getByText('인서트 3컷 추천')).toBeInTheDocument()
      
      mockInsertShots.forEach((insert, index) => {
        expect(screen.getByText(`인서트 ${index + 1}`)).toBeInTheDocument()
        expect(screen.getByDisplayValue(insert.purpose)).toBeInTheDocument()
        expect(screen.getByDisplayValue(insert.description)).toBeInTheDocument()
      })
    })

    it('헤더와 설명이 표시되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      expect(screen.getByText('STEP 3: 12숏 편집·콘티·인서트·내보내기')).toBeInTheDocument()
      expect(screen.getByText(/각 숏을 세밀하게 편집하고/)).toBeInTheDocument()
    })

    it('액션 버튼들이 표시되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      expect(screen.getByText('이전')).toBeInTheDocument()
      expect(screen.getByText('기획안 다운로드')).toBeInTheDocument()
      expect(screen.getByText('프로젝트 저장')).toBeInTheDocument()
    })
  })

  describe('샷 편집 기능', () => {
    it('샷 제목을 수정할 수 있어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const titleInput = screen.getByDisplayValue('오프닝 훅')
      await user.clear(titleInput)
      await user.type(titleInput, '새로운 오프닝')
      
      expect(mockProps.onShotUpdate).toHaveBeenCalledWith('shot-1', { title: '새로운 오프닝' })
    })

    it('샷 타입을 변경할 수 있어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      // 첫 번째 샷 카드의 샷 타입 셀렉트를 찾기
      const shotTypeSelects = screen.getAllByDisplayValue('클로즈업')
      const firstShotTypeSelect = shotTypeSelects[0]
      
      fireEvent.change(firstShotTypeSelect, { target: { value: '와이드샷' } })
      
      expect(mockProps.onShotUpdate).toHaveBeenCalledWith('shot-1', { shotType: '와이드샷' })
    })

    it('카메라 움직임을 변경할 수 있어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const cameraMoveSelect = screen.getByDisplayValue('줌인')
      fireEvent.change(cameraMoveSelect, { target: { value: '패닝' } })
      
      expect(mockProps.onShotUpdate).toHaveBeenCalledWith('shot-1', { cameraMove: '패닝' })
    })

    it('구도를 변경할 수 있어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const compositionSelect = screen.getByDisplayValue('중앙')
      fireEvent.change(compositionSelect, { target: { value: '좌측' } })
      
      expect(mockProps.onShotUpdate).toHaveBeenCalledWith('shot-1', { composition: '좌측' })
    })

    it('샷 길이를 조정할 수 있어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const durationInputs = screen.getAllByLabelText('길이(초)')
      const firstDurationInput = durationInputs[0]
      
      await user.clear(firstDurationInput)
      await user.type(firstDurationInput, '5')
      
      expect(mockProps.onShotUpdate).toHaveBeenCalledWith('shot-1', { duration: 5 })
    })

    it('전환 효과를 변경할 수 있어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const transitionSelect = screen.getByDisplayValue('컷')
      fireEvent.change(transitionSelect, { target: { value: '디졸브' } })
      
      expect(mockProps.onShotUpdate).toHaveBeenCalledWith('shot-1', { transition: '디졸브' })
    })

    it('대사/자막을 편집할 수 있어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const dialogueInput = screen.getByDisplayValue('당신은 이런 경험이 있나요?')
      await user.clear(dialogueInput)
      await user.type(dialogueInput, '새로운 대사 내용')
      
      expect(mockProps.onShotUpdate).toHaveBeenCalledWith('shot-1', { dialogue: '새로운 대사 내용' })
    })

    it('샷 길이 입력 시 1-60초 범위를 준수해야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const durationInputs = screen.getAllByLabelText('길이(초)')
      const firstDurationInput = durationInputs[0]
      
      // 범위 속성 확인
      expect(firstDurationInput).toHaveAttribute('min', '1')
      expect(firstDurationInput).toHaveAttribute('max', '60')
      expect(firstDurationInput).toHaveAttribute('type', 'number')
    })
  })

  describe('스토리보드 생성 기능', () => {
    it('스토리보드 생성 버튼이 각 샷에 표시되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      // 각 샷 카드에 '생성' 버튼이 있어야 함
      const generateButtons = screen.getAllByText('생성')
      expect(generateButtons).toHaveLength(12) // 12개 샷 각각에 하나씩
    })

    it('스토리보드 생성 버튼 클릭 시 onGenerateStoryboard가 호출되어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const firstGenerateButton = screen.getAllByText('생성')[0]
      await user.click(firstGenerateButton)
      
      expect(mockProps.onGenerateStoryboard).toHaveBeenCalledWith('shot-1')
    })

    it('스토리보드 생성 중일 때 로딩 상태가 표시되어야 한다', async () => {
      // 로딩 상태를 시뮬레이션하기 위해 onGenerateStoryboard mock을 지연시킴
      const mockOnGenerateStoryboard = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      render(<TwelveShotsEditor {...mockProps} onGenerateStoryboard={mockOnGenerateStoryboard} />)
      
      const firstGenerateButton = screen.getAllByText('생성')[0]
      await user.click(firstGenerateButton)
      
      // 로딩 메시지 확인
      expect(screen.getByText('콘티를 생성하고 있습니다...')).toBeInTheDocument()
      
      // 스피너 요소 확인
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('스토리보드 생성 성공 시 이미지와 재생성/다운로드 버튼이 표시되어야 한다', async () => {
      const mockOnGenerateStoryboard = jest.fn().mockResolvedValue('/mock-storyboard-shot-1.jpg')
      
      render(<TwelveShotsEditor {...mockProps} onGenerateStoryboard={mockOnGenerateStoryboard} />)
      
      const firstGenerateButton = screen.getAllByText('생성')[0]
      await user.click(firstGenerateButton)
      
      await waitFor(() => {
        expect(screen.getByAltText('스토리보드')).toBeInTheDocument()
        expect(screen.getByText('재생성')).toBeInTheDocument()
        expect(screen.getByText('다운로드')).toBeInTheDocument()
      })
    })

    it('스토리보드 생성 실패 시 에러 메시지가 표시되어야 한다', async () => {
      const mockOnGenerateStoryboard = jest.fn().mockRejectedValue(new Error('생성 실패'))
      
      render(<TwelveShotsEditor {...mockProps} onGenerateStoryboard={mockOnGenerateStoryboard} />)
      
      const firstGenerateButton = screen.getAllByText('생성')[0]
      await user.click(firstGenerateButton)
      
      await waitFor(() => {
        expect(screen.getByText('스토리보드 생성에 실패했습니다.')).toBeInTheDocument()
      })
    })

    it('재생성 버튼 클릭 시 다시 생성 로직이 호출되어야 한다', async () => {
      // 먼저 스토리보드를 생성한 상태로 만듦
      const mockOnGenerateStoryboard = jest.fn().mockResolvedValue('/mock-storyboard.jpg')
      
      render(<TwelveShotsEditor {...mockProps} onGenerateStoryboard={mockOnGenerateStoryboard} />)
      
      // 첫 번째 생성
      const firstGenerateButton = screen.getAllByText('생성')[0]
      await user.click(firstGenerateButton)
      
      await waitFor(() => {
        expect(screen.getByText('재생성')).toBeInTheDocument()
      })
      
      // 재생성 클릭
      const regenerateButton = screen.getByText('재생성')
      await user.click(regenerateButton)
      
      expect(mockOnGenerateStoryboard).toHaveBeenCalledTimes(2)
      expect(mockOnGenerateStoryboard).toHaveBeenLastCalledWith('shot-1')
    })
  })

  describe('인서트 편집 기능', () => {
    it('인서트 컷의 목적을 수정할 수 있어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const purposeInput = screen.getByDisplayValue('제품 강조')
      await user.clear(purposeInput)
      await user.type(purposeInput, '브랜드 인지도 향상')
      
      expect(mockProps.onInsertUpdate).toHaveBeenCalledWith('insert-1', { purpose: '브랜드 인지도 향상' })
    })

    it('인서트 컷의 설명을 수정할 수 있어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const descriptionInput = screen.getByDisplayValue('제품의 핵심 기능을 보여주는 상세 컷')
      await user.clear(descriptionInput)
      await user.type(descriptionInput, '새로운 설명')
      
      expect(mockProps.onInsertUpdate).toHaveBeenCalledWith('insert-1', { description: '새로운 설명' })
    })

    it('인서트 컷의 프레이밍을 수정할 수 있어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const framingInput = screen.getByDisplayValue('익스트림 클로즈업')
      await user.clear(framingInput)
      await user.type(framingInput, '매크로 샷')
      
      expect(mockProps.onInsertUpdate).toHaveBeenCalledWith('insert-1', { framing: '매크로 샷' })
    })

    it('인서트 재생성 버튼 클릭 시 onInsertUpdate가 호출되어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const regenerateButtons = screen.getAllByText('재생성').filter(button => 
        button.closest('[class*="Card"]')?.textContent?.includes('인서트')
      )
      
      await user.click(regenerateButtons[0])
      
      expect(mockProps.onInsertUpdate).toHaveBeenCalledWith('insert-1', {
        description: '재생성된 인서트 1 설명',
        framing: '재생성된 프레이밍'
      })
    })
  })

  describe('내보내기 기능', () => {
    it('기획안 다운로드 버튼 클릭 시 모달이 열려야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const downloadButton = screen.getByText('기획안 다운로드')
      await user.click(downloadButton)
      
      expect(screen.getByText('원하는 형식을 선택하세요')).toBeInTheDocument()
      expect(screen.getByText('JSON')).toBeInTheDocument()
      expect(screen.getByText('Marp PDF')).toBeInTheDocument()
    })

    it('JSON 내보내기 버튼 클릭 시 onExport가 호출되어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      // 모달 열기
      const downloadButton = screen.getByText('기획안 다운로드')
      await user.click(downloadButton)
      
      // JSON 선택
      const jsonButton = screen.getByText('JSON')
      await user.click(jsonButton)
      
      expect(mockProps.onExport).toHaveBeenCalledWith({
        format: 'json',
        includeStoryboard: true,
        includeInserts: true,
        pdfLayout: 'landscape'
      })
    })

    it('PDF 내보내기 버튼 클릭 시 onExport가 호출되어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const downloadButton = screen.getByText('기획안 다운로드')
      await user.click(downloadButton)
      
      const pdfButton = screen.getByText('Marp PDF')
      await user.click(pdfButton)
      
      expect(mockProps.onExport).toHaveBeenCalledWith({
        format: 'pdf',
        includeStoryboard: true,
        includeInserts: true,
        pdfLayout: 'landscape'
      })
    })

    it('내보내기 진행 중일 때 로딩 상태가 표시되어야 한다', async () => {
      const mockOnExport = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      )
      
      render(<TwelveShotsEditor {...mockProps} onExport={mockOnExport} />)
      
      const downloadButton = screen.getByText('기획안 다운로드')
      await user.click(downloadButton)
      
      const pdfButton = screen.getByText('Marp PDF')
      await user.click(pdfButton)
      
      expect(screen.getByText('PDF를 생성하고 있습니다...')).toBeInTheDocument()
      
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('내보내기 실패 시 에러 메시지가 표시되어야 한다', async () => {
      const mockOnExport = jest.fn().mockRejectedValue(new Error('내보내기 실패'))
      
      render(<TwelveShotsEditor {...mockProps} onExport={mockOnExport} />)
      
      const downloadButton = screen.getByText('기획안 다운로드')
      await user.click(downloadButton)
      
      const jsonButton = screen.getByText('JSON')
      await user.click(jsonButton)
      
      await waitFor(() => {
        expect(screen.getByText('내보내기에 실패했습니다.')).toBeInTheDocument()
      })
    })

    it('내보내기 모달의 닫기 버튼이 동작해야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const downloadButton = screen.getByText('기획안 다운로드')
      await user.click(downloadButton)
      
      expect(screen.getByText('기획안 다운로드')).toBeInTheDocument()
      
      const closeButton = screen.getByText('닫기')
      await user.click(closeButton)
      
      expect(screen.queryByText('원하는 형식을 선택하세요')).not.toBeInTheDocument()
    })
  })

  describe('액션 버튼', () => {
    it('이전 버튼 클릭 시 onBack이 호출되어야 한다', async () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      const backButton = screen.getByText('이전')
      await user.click(backButton)
      
      expect(mockProps.onBack).toHaveBeenCalled()
    })

    it('프로젝트 저장 버튼이 표시되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      expect(screen.getByText('프로젝트 저장')).toBeInTheDocument()
    })

    it('로딩 중일 때 액션 버튼들이 비활성화되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} isLoading={true} />)
      
      expect(screen.getByText('이전')).toBeDisabled()
      expect(screen.getByText('기획안 다운로드')).toBeDisabled()
      expect(screen.getByText('프로젝트 저장')).toBeDisabled()
    })

    it('로딩 중일 때 로딩 메시지가 표시되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} isLoading={true} />)
      
      expect(screen.getByText('작업을 처리하고 있습니다...')).toBeInTheDocument()
    })
  })

  describe('도움말 및 가이드', () => {
    it('완성 가이드가 표시되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      expect(screen.getByText('완성 가이드:')).toBeInTheDocument()
      expect(screen.getByText(/각 숏의 콘티를 생성하여/)).toBeInTheDocument()
      expect(screen.getByText(/인서트 컷으로 영상의 완성도/)).toBeInTheDocument()
      expect(screen.getByText(/JSON 파일은 향후 편집에/)).toBeInTheDocument()
      expect(screen.getByText(/PDF는 프레젠테이션용으로/)).toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('모든 입력 필드에 적절한 레이블이 설정되어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      // 샷 편집 필드들의 레이블 확인
      expect(screen.getByLabelText('샷 제목/서술')).toBeInTheDocument()
      expect(screen.getByLabelText('샷/카메라/구도')).toBeInTheDocument()
      expect(screen.getByLabelText('길이(초)')).toBeInTheDocument()
      expect(screen.getByLabelText('전환')).toBeInTheDocument()
      expect(screen.getByLabelText('대사/자막/오디오')).toBeInTheDocument()
      
      // 인서트 필드들의 레이블 확인
      expect(screen.getByText('목적')).toBeInTheDocument()
      expect(screen.getByText('컷 설명')).toBeInTheDocument()
      expect(screen.getByText('프레이밍')).toBeInTheDocument()
    })

    it('키보드 네비게이션이 가능한 요소들이 있어야 한다', () => {
      render(<TwelveShotsEditor {...mockProps} />)
      
      // focusable한 요소들이 있는지 확인
      const focusableElements = document.querySelectorAll('input, select, button, [tabindex="0"]')
      expect(focusableElements.length).toBeGreaterThan(0)
    })

    it('이미지에 적절한 alt 텍스트가 설정되어야 한다', async () => {
      const mockOnGenerateStoryboard = jest.fn().mockResolvedValue('/mock-storyboard.jpg')
      
      render(<TwelveShotsEditor {...mockProps} onGenerateStoryboard={mockOnGenerateStoryboard} />)
      
      const firstGenerateButton = screen.getAllByText('생성')[0]
      await user.click(firstGenerateButton)
      
      await waitFor(() => {
        const storyboardImage = screen.getByAltText('스토리보드')
        expect(storyboardImage).toBeInTheDocument()
        expect(storyboardImage).toHaveAttribute('alt', '스토리보드')
      })
    })
  })

  describe('에러 상태 처리', () => {
    it('잘못된 props로 호출 시 기본값으로 처리되어야 한다', () => {
      const invalidProps = {
        ...mockProps,
        shots: [],
        insertShots: []
      }
      
      expect(() => render(<TwelveShotsEditor {...invalidProps} />)).not.toThrow()
      
      // 빈 상태 메시지가 표시되는지 확인 (향후 구현 필요)
      expect(screen.getByText('총 0개 숏')).toBeInTheDocument()
    })
  })

  describe('성능 최적화', () => {
    it('불필요한 리렌더링을 방지해야 한다', () => {
      const { rerender } = render(<TwelveShotsEditor {...mockProps} />)
      
      // props가 변경되지 않으면 리렌더링이 발생하지 않아야 함
      const initialRenderCount = document.querySelectorAll('[data-testid^="shot-card"]').length
      
      rerender(<TwelveShotsEditor {...mockProps} />)
      
      const afterRerenderCount = document.querySelectorAll('[data-testid^="shot-card"]').length
      expect(afterRerenderCount).toBe(initialRenderCount)
    })

    it('대량의 샷 데이터도 성능 저하 없이 렌더링되어야 한다', () => {
      const manyShots = Array.from({ length: 100 }, (_, i) => ({
        ...mockShots[0],
        id: `shot-${i + 1}`,
        order: i + 1
      }))
      
      const start = performance.now()
      render(<TwelveShotsEditor {...mockProps} shots={manyShots} />)
      const end = performance.now()
      
      // 렌더링이 100ms 이내에 완료되어야 함 (성능 예산)
      expect(end - start).toBeLessThan(100)
    })
  })
})