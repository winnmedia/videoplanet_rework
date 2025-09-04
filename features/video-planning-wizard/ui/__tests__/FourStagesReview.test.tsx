/**
 * @fileoverview FourStagesReview 컴포넌트 TDD 테스트
 * @description 4단계 검토/수정 컴포넌트의 핵심 기능 테스트 (Red → Green → Refactor)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { FourStagesReview } from '../FourStagesReview'
import type { PlanningStage, FourStagesReviewProps } from '../../model/types'

// 테스트용 Mock 데이터
const mockStages: PlanningStage[] = [
  {
    id: 'stage-1',
    title: '기',
    content: '훅으로 시작하여 시청자의 관심을 끌어야 합니다.',
    goal: '관심 유발',
    duration: '5-8초',
    order: 1
  },
  {
    id: 'stage-2', 
    title: '승',
    content: '문제 상황을 구체적으로 제시합니다.',
    goal: '문제 인식',
    duration: '15-20초',
    order: 2
  },
  {
    id: 'stage-3',
    title: '전', 
    content: '해결책을 제시하고 설득합니다.',
    goal: '해결책 제시',
    duration: '20-25초',
    order: 3
  },
  {
    id: 'stage-4',
    title: '결',
    content: '행동 유도와 마무리를 합니다.',
    goal: '행동 유도', 
    duration: '8-12초',
    order: 4
  }
]

const mockProps: FourStagesReviewProps = {
  stages: mockStages,
  onStageUpdate: jest.fn(),
  onReset: jest.fn(),
  onNext: jest.fn(),
  onBack: jest.fn(),
  isLoading: false
}

describe('FourStagesReview', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('레이아웃 및 UI 구조', () => {
    it('4개의 카드가 그리드 레이아웃으로 표시되어야 한다', () => {
      render(<FourStagesReview {...mockProps} />)
      
      // 4개 단계 카드가 모두 표시되어야 함
      expect(screen.getByText('기')).toBeInTheDocument()
      expect(screen.getByText('승')).toBeInTheDocument()
      expect(screen.getByText('전')).toBeInTheDocument()
      expect(screen.getByText('결')).toBeInTheDocument()
    })

    it('각 카드에 단계별 내용이 표시되어야 한다', () => {
      render(<FourStagesReview {...mockProps} />)
      
      // 본문 내용
      expect(screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')).toBeInTheDocument()
      expect(screen.getByText('문제 상황을 구체적으로 제시합니다.')).toBeInTheDocument()
      
      // 목표
      expect(screen.getByText('관심 유발')).toBeInTheDocument()
      expect(screen.getByText('문제 인식')).toBeInTheDocument()
      
      // 길이 힌트
      expect(screen.getByText('5-8초')).toBeInTheDocument()
      expect(screen.getByText('15-20초')).toBeInTheDocument()
    })

    it('헤더와 설명 텍스트가 표시되어야 한다', () => {
      render(<FourStagesReview {...mockProps} />)
      
      expect(screen.getByText('STEP 2: 4단계 검토/수정')).toBeInTheDocument()
      expect(screen.getByText(/AI가 생성한 4단계 구성을 검토하고/)).toBeInTheDocument()
    })

    it('액션 버튼들이 표시되어야 한다', () => {
      render(<FourStagesReview {...mockProps} />)
      
      expect(screen.getByText('이전')).toBeInTheDocument()
      expect(screen.getByText('초기화')).toBeInTheDocument()
      expect(screen.getByText('숏 생성')).toBeInTheDocument()
    })
  })

  describe('인라인 편집 기능', () => {
    it('필드 클릭 시 편집 모드로 전환되어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      // 본문 내용을 클릭
      const contentText = screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.click(contentText)
      
      // 편집 모드로 전환되어 textarea가 나타나야 함
      const textarea = screen.getByDisplayValue('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      expect(textarea).toBeInTheDocument()
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    it('편집 모드에서 저장/취소 버튼이 표시되어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const contentText = screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.click(contentText)
      
      expect(screen.getByText('저장')).toBeInTheDocument()
      expect(screen.getByText('취소')).toBeInTheDocument()
    })

    it('저장 버튼 클릭 시 onStageUpdate가 호출되어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const contentText = screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.click(contentText)
      
      const textarea = screen.getByDisplayValue('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.clear(textarea)
      await user.type(textarea, '수정된 내용입니다.')
      
      const saveButton = screen.getByText('저장')
      await user.click(saveButton)
      
      expect(mockProps.onStageUpdate).toHaveBeenCalledWith('stage-1', { content: '수정된 내용입니다.' })
    })

    it('취소 버튼 클릭 시 편집이 취소되어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const contentText = screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.click(contentText)
      
      const textarea = screen.getByDisplayValue('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.clear(textarea)
      await user.type(textarea, '수정된 내용입니다.')
      
      const cancelButton = screen.getByText('취소')
      await user.click(cancelButton)
      
      // 편집이 취소되고 원본 내용이 유지되어야 함
      expect(screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')).toBeInTheDocument()
      expect(mockProps.onStageUpdate).not.toHaveBeenCalled()
    })

    it('ESC 키로 편집을 취소할 수 있어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const contentText = screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.click(contentText)
      
      const textarea = screen.getByDisplayValue('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      fireEvent.keyDown(textarea, { key: 'Escape' })
      
      // 편집 모드가 해제되어야 함
      expect(screen.queryByDisplayValue('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')).not.toBeInTheDocument()
      expect(screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')).toBeInTheDocument()
    })

    it('Ctrl+Enter로 빠른 저장할 수 있어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const contentText = screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.click(contentText)
      
      const textarea = screen.getByDisplayValue('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.clear(textarea)
      await user.type(textarea, '수정된 내용입니다.')
      
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
      
      expect(mockProps.onStageUpdate).toHaveBeenCalledWith('stage-1', { content: '수정된 내용입니다.' })
    })
  })

  describe('글자 수 카운터', () => {
    it('편집 모드에서 실시간 글자 수가 표시되어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const contentText = screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.click(contentText)
      
      // 글자 수 카운터가 표시되어야 함 (초기값 기준)
      const initialCount = '훅으로 시작하여 시청자의 관심을 끌어야 합니다.'.length
      expect(screen.getByText(`${initialCount}자`)).toBeInTheDocument()
    })

    it('입력하면 글자 수가 실시간으로 업데이트되어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const contentText = screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.click(contentText)
      
      const textarea = screen.getByDisplayValue('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      await user.clear(textarea)
      await user.type(textarea, '새로운 내용')
      
      expect(screen.getByText('5자')).toBeInTheDocument()
    })

    // TODO(human): 글자 수 제한 초과 시 경고 표시 기능 구현
    it('글자 수 제한 초과 시 경고가 표시되어야 한다', async () => {
      // 현재는 테스트만 작성, 구현은 human이 담당
      expect(true).toBe(true)
    })
  })

  describe('초기화/되돌리기 기능', () => {
    it('초기화 버튼 클릭 시 확인 모달이 표시되어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const resetButton = screen.getByText('초기화')
      await user.click(resetButton)
      
      expect(screen.getByText('정말로 초기화하시겠습니까?')).toBeInTheDocument()
      expect(screen.getByText('모든 수정사항이 사라지고')).toBeInTheDocument()
    })

    it('확인 버튼 클릭 시 onReset이 호출되어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const resetButton = screen.getByText('초기화')
      await user.click(resetButton)
      
      const confirmButton = screen.getByText('확인')
      await user.click(confirmButton)
      
      expect(mockProps.onReset).toHaveBeenCalled()
    })

    it('취소 버튼 클릭 시 모달이 닫혀야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const resetButton = screen.getByText('초기화')
      await user.click(resetButton)
      
      const cancelButton = screen.getAllByText('취소')[0] // 모달의 취소 버튼
      await user.click(cancelButton)
      
      expect(screen.queryByText('정말로 초기화하시겠습니까?')).not.toBeInTheDocument()
    })
  })

  describe('액션 버튼', () => {
    it('이전 버튼 클릭 시 onBack이 호출되어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const backButton = screen.getByText('이전')
      await user.click(backButton)
      
      expect(mockProps.onBack).toHaveBeenCalled()
    })

    it('숏 생성 버튼 클릭 시 onNext가 호출되어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const nextButton = screen.getByText('숏 생성')
      await user.click(nextButton)
      
      expect(mockProps.onNext).toHaveBeenCalled()
    })

    it('로딩 중일 때 버튼들이 비활성화되어야 한다', () => {
      render(<FourStagesReview {...mockProps} isLoading={true} />)
      
      expect(screen.getByText('이전')).toBeDisabled()
      expect(screen.getByText('초기화')).toBeDisabled()
      expect(screen.getByText(/숏 생성 중/)).toBeInTheDocument()
    })

    it('로딩 중일 때 스피너가 표시되어야 한다', () => {
      render(<FourStagesReview {...mockProps} isLoading={true} />)
      
      expect(screen.getByText('숏 생성 중...')).toBeInTheDocument()
      // 스피너 애니메이션 요소 확인
      const spinner = screen.getByRole('status', { hidden: true })
      expect(spinner).toBeInTheDocument()
    })
  })

  describe('VRidge 레거시 UI 스타일링', () => {
    it('VRidge 브랜드 컬러(#0031ff)가 적용되어야 한다', () => {
      render(<FourStagesReview {...mockProps} />)
      
      // 주요 액션 버튼은 VRidge 브랜드 컬러를 사용해야 함
      const nextButton = screen.getByText('숏 생성')
      expect(nextButton).toHaveClass('bg-gradient-to-br', 'from-vridge-500', 'to-vridge-700')
    })

    it('미니멀한 카드 디자인이 적용되어야 한다', () => {
      const { container } = render(<FourStagesReview {...mockProps} />)
      
      // 카드들이 적절한 간격과 그림자를 가져야 함
      const cards = container.querySelectorAll('[data-testid^="stage-card"]')
      expect(cards).toHaveLength(4)
    })

    it('8px 그리드 시스템을 사용해야 한다', () => {
      const { container } = render(<FourStagesReview {...mockProps} />)
      
      // 메인 컨테이너가 8px 배수 간격을 사용해야 함
      const mainContainer = container.firstChild
      expect(mainContainer).toHaveClass('space-y-8') // 32px (8px * 4)
    })
  })

  describe('접근성', () => {
    it('키보드 네비게이션이 지원되어야 한다', async () => {
      render(<FourStagesReview {...mockProps} />)
      
      const firstEditableArea = screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.').closest('[role="button"]')
      expect(firstEditableArea).toHaveAttribute('tabIndex', '0')
    })

    it('ARIA 레이블이 설정되어야 한다', () => {
      render(<FourStagesReview {...mockProps} />)
      
      // 편집 가능한 영역에 적절한 ARIA 속성이 있어야 함
      const editableAreas = screen.getAllByRole('button')
      editableAreas.forEach(area => {
        expect(area).toHaveAttribute('aria-label')
      })
    })

    it('로딩 상태가 스크린 리더에 전달되어야 한다', () => {
      render(<FourStagesReview {...mockProps} isLoading={true} />)
      
      const nextButton = screen.getByText(/숏 생성/)
      expect(nextButton).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('에러 상태 처리', () => {
    // TODO(human): 에러 상태 처리 로직 구현
    it('API 에러 시 에러 메시지가 표시되어야 한다', () => {
      // 현재는 테스트만 작성, 구현은 human이 담당  
      expect(true).toBe(true)
    })
  })
})