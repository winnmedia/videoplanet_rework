/**
 * @description 프로젝트 생성 폼 TDD 테스트
 * @coverage 88% (프로젝트 관리 모듈 목표)
 * @priority Critical Path (인증 시스템 다음 순서)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { ProjectForm } from './ProjectForm'
// import { TestProvider } from '@/test/utils/test-utils'

// Mock functions for testing
const mockOnSubmit = vi.fn()

describe('ProjectForm - TDD Red Phase', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnSubmit.mockReset()
  })

  describe('🔴 RED: 실패하는 테스트 작성 (컴포넌트 미구현)', () => {
    it('프로젝트 생성 폼이 렌더링되어야 함', async () => {
      // FAIL: ProjectForm 컴포넌트가 아직 구현되지 않음
      expect(() => 
        render(<ProjectForm onSubmit={() => {}} />)
      ).not.toThrow()

      // 기본 입력 필드들이 존재해야 함
      expect(screen.getByLabelText(/프로젝트 제목/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/프로젝트 설명/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /프로젝트 생성/i })).toBeInTheDocument()
    })

    it('자동 일정 프리뷰 카드가 표시되어야 함 (DEVPLAN.md 요구사항)', async () => {
      render(<ProjectForm onSubmit={() => {}} />)

      // FAIL: AutoSchedulePreview 컴포넌트 미구현
      const previewCard = screen.getByTestId('auto-schedule-preview')
      expect(previewCard).toBeInTheDocument()
      
      // 기획 1주, 촬영 1일, 편집 2주 디폴트 표시
      expect(screen.getByText('기획 1주')).toBeInTheDocument()
      expect(screen.getByText('촬영 1일')).toBeInTheDocument() 
      expect(screen.getByText('편집 2주')).toBeInTheDocument()
    })

    it('프로젝트 생성 시 자동 일정이 생성되어야 함', async () => {
      const mockOnSubmit = vi.fn()
      vi.fn().mockResolvedValue({ 
        data: { id: '1', title: 'Test Project' } 
      })

      render(
<ProjectForm onSubmit={mockOnSubmit} />
      )

      // FAIL: 폼 제출 로직 미구현
      await user.type(screen.getByLabelText(/프로젝트 제목/i), 'Brand Video')
      await user.type(screen.getByLabelText(/프로젝트 설명/i), 'Brand promotion video')
      
      await user.click(screen.getByRole('button', { name: /프로젝트 생성/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          title: 'Brand Video',
          description: 'Brand promotion video',
          planningDuration: 7,
          shootingDuration: 1,
          editingDuration: 14
        })
      })
    })

    it('수동 일정 수정 시 프리뷰가 즉시 반영되어야 함', async () => {
      render(<ProjectForm onSubmit={() => {}} />)

      // FAIL: 실시간 프리뷰 업데이트 미구현
      const planningDurationInput = screen.getByLabelText(/기획 기간/i)
      await user.clear(planningDurationInput)
      await user.type(planningDurationInput, '10')

      // 프리뷰 카드가 즉시 업데이트되어야 함
      await waitFor(() => {
        expect(screen.getByText('기획 10일')).toBeInTheDocument()
      })
    })

    it('필수 필드 미입력 시 유효성 검사 에러가 표시되어야 함', async () => {
      render(<ProjectForm onSubmit={() => {}} />)

      // FAIL: 유효성 검사 미구현
      const submitButton = screen.getByRole('button', { name: /프로젝트 생성/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/프로젝트 제목은 필수입니다/i)).toBeInTheDocument()
      })
    })

    it('프로젝트 생성 중 로딩 상태가 표시되어야 함', async () => {
      // 지연된 onSubmit으로 로딩 상태 시뮬레이션
      const delayedOnSubmit = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<ProjectForm onSubmit={delayedOnSubmit} />)

      await user.type(screen.getByLabelText(/프로젝트 제목/i), 'Test Project')
      
      // 폼 제출 시작
      const submitButton = screen.getByRole('button', { name: /프로젝트 생성/i })
      await user.click(submitButton)

      // 로딩 상태 확인 (즉시 확인)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /생성 중.../i })).toBeInTheDocument()
      })
      
      // 버튼이 비활성화되어야 함
      expect(screen.getByRole('button', { name: /생성 중.../i })).toBeDisabled()
    })
  })

  describe('🔴 RED: 접근성 요구사항 테스트 (WCAG 2.1 AA)', () => {
    it('키보드로 모든 폼 요소를 탐색할 수 있어야 함', async () => {
      render(<ProjectForm onSubmit={() => {}} />)

      // 키보드 접근성 테스트 - 모든 focusable 요소를 순서대로 탐색
      const titleInput = screen.getByLabelText(/프로젝트 제목/i)
      titleInput.focus()
      expect(titleInput).toHaveFocus()
      
      // Tab 키로 다음 요소들로 이동 (프로젝트 설명)
      await user.keyboard('{Tab}')
      expect(screen.getByLabelText(/프로젝트 설명/i)).toHaveFocus()
      
      // Tab 키로 기획 기간 input으로 이동
      await user.keyboard('{Tab}')
      expect(screen.getByLabelText(/기획 기간/i)).toHaveFocus()
      
      // Tab 키로 촬영 기간 input으로 이동  
      await user.keyboard('{Tab}')
      expect(screen.getByLabelText(/촬영 기간/i)).toHaveFocus()
      
      // Tab 키로 편집 기간 input으로 이동
      await user.keyboard('{Tab}')
      expect(screen.getByLabelText(/편집 기간/i)).toHaveFocus()
      
      // Tab 키로 최종적으로 submit 버튼으로 이동
      await user.keyboard('{Tab}')  
      expect(screen.getByRole('button', { name: /프로젝트 생성/i })).toHaveFocus()
    })

    it('ARIA 레이블이 적절히 설정되어야 함', () => {
      render(<ProjectForm onSubmit={() => {}} />)

      // FAIL: ARIA 속성 미구현
      const form = screen.getByRole('form', { name: /새 프로젝트 생성/i })
      expect(form).toHaveAttribute('aria-describedby')
      
      const previewCard = screen.getByTestId('auto-schedule-preview')
      expect(previewCard).toHaveAttribute('aria-live', 'polite')
      expect(previewCard).toHaveAttribute('aria-label', '자동 생성된 일정 프리뷰')
    })
  })

  describe('🔴 RED: 레거시 톤앤매너 통합 테스트', () => {
    it('레거시 브랜드 색상이 적용되어야 함', () => {
      render(<ProjectForm onSubmit={() => {}} />)

      // FAIL: 레거시 스타일 미적용
      const submitButton = screen.getByRole('button', { name: /프로젝트 생성/i })
      expect(submitButton).toHaveClass('bg-vridge-primary') // #0031ff
      
      const form = screen.getByRole('form')
      expect(form).toHaveClass('legacy-card') // 20px radius, 다층 그림자
    })
  })
})