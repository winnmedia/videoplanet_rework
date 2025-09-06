import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { CreateProjectForm } from '../CreateProjectForm'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

describe('CreateProjectForm - 자동 일정 시스템', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('자동 일정 프리뷰 카드', () => {
    it('프로젝트 생성 폼에 자동 일정 프리뷰 카드가 표시되어야 한다', () => {
      render(<CreateProjectForm />)
      
      // DEVPLAN 요구사항: 자동 일정 프리뷰 카드 (바 형태)
      const previewCard = screen.getByTestId('auto-schedule-preview-card')
      expect(previewCard).toBeInTheDocument()
      
      // 기획 1주, 촬영 1일, 편집 2주 기본 설정 확인
      expect(screen.getByText('기획: 1주')).toBeInTheDocument()
      expect(screen.getByText('촬영: 1일')).toBeInTheDocument()
      expect(screen.getByText('편집: 2주')).toBeInTheDocument()
    })

    it('시작 날짜 변경 시 자동 일정이 즉시 반영되어야 한다', async () => {
      render(<CreateProjectForm />)
      
      // 시작 날짜를 2024-01-01로 변경
      const startDateInput = screen.getByTestId('project-start-date-input')
      fireEvent.change(startDateInput, { target: { value: '2024-01-01' } })
      
      await waitFor(() => {
        // 자동 계산된 일정이 즉시 반영되는지 확인
        expect(screen.getByText('기획: 2024-01-01 ~ 2024-01-07')).toBeInTheDocument()
        expect(screen.getByText('촬영: 2024-01-08')).toBeInTheDocument()  
        expect(screen.getByText('편집: 2024-01-09 ~ 2024-01-22')).toBeInTheDocument()
      })
    })

    it('수동 전환 버튼 클릭 시 커스텀 일정 입력 모드로 변경되어야 한다', async () => {
      render(<CreateProjectForm />)
      
      // 수동 전환 버튼 클릭
      const manualToggle = screen.getByTestId('manual-schedule-toggle')
      fireEvent.click(manualToggle)
      
      await waitFor(() => {
        // 커스텀 일정 입력 필드들이 표시되는지 확인
        expect(screen.getByTestId('planning-duration-input')).toBeInTheDocument()
        expect(screen.getByTestId('filming-duration-input')).toBeInTheDocument()
        expect(screen.getByTestId('editing-duration-input')).toBeInTheDocument()
      })
    })
  })

  describe('자동 일정 계산 로직', () => {
    it('기본 일정(1주/1일/2주)이 올바르게 계산되어야 한다', () => {
      render(<CreateProjectForm />)
      
      const autoSchedule = screen.getByTestId('auto-schedule-data')
      const scheduleData = JSON.parse(autoSchedule.textContent || '{}')
      
      expect(scheduleData).toEqual({
        planning: { duration: 7, unit: 'days' },
        filming: { duration: 1, unit: 'days' },
        editing: { duration: 14, unit: 'days' },
        totalDuration: 22
      })
    })

    it('프로젝트 생성 시 자동 일정이 API 요청에 포함되어야 한다', async () => {
      const mockApiCall = vi.fn().mockResolvedValue({ success: true })
      vi.stubGlobal('fetch', mockApiCall)

      render(<CreateProjectForm />)
      
      // 필수 필드들 입력
      fireEvent.change(screen.getByTestId('project-title-input'), {
        target: { value: '테스트 프로젝트' }
      })
      fireEvent.change(screen.getByTestId('project-description-input'), {
        target: { value: '테스트 설명' }
      })
      
      // 프로젝트 유형 선택 (TODO: Select 컴포넌트 테스트 방법 확인 필요)
      
      // 폼 제출
      const submitButton = screen.getByTestId('submit-button')
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockApiCall).toHaveBeenCalledWith(
          expect.stringContaining('/api/projects'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"autoSchedule"')
          })
        )
      })
    })
  })
})