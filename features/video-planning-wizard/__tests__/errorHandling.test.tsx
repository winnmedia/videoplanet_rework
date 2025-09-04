/**
 * @fileoverview 에러 처리 및 복구 시나리오 테스트
 * @description LLM API 실패, 네트워크 오류, 타임아웃 등 다양한 에러 상황에 대한 처리 테스트
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '@/lib/api/msw-server'
import { http, HttpResponse } from 'msw'

import { VideoPlanningWizard } from '../ui/VideoPlanningWizard'
import { FourStagesReview } from '../ui/FourStagesReview'
import { TwelveShotsEditor } from '../ui/TwelveShotsEditor'
import { VideoPlanningWizardApi } from '../api/videoPlanningApi'
import type { 
  PlanningInput, 
  PlanningStage, 
  VideoShot, 
  FourStagesReviewProps,
  TwelveShotsEditorProps
} from '../model/types'

// 테스트용 Mock 데이터
const mockValidInput: PlanningInput = {
  title: '에러 테스트 프로젝트',
  logline: '에러 상황 처리를 검증하는 테스트',
  toneAndManner: '신뢰감 있는',
  genre: '테스트',
  target: '개발자',
  duration: '60초',
  format: '16:9',
  tempo: '보통',
  developmentMethod: '기승전결'
}

const mockValidStages: PlanningStage[] = [
  {
    id: 'stage-1',
    title: '기',
    content: '테스트 시작 단계',
    goal: '에러 검증 시작',
    duration: '5-8초',
    order: 1
  },
  {
    id: 'stage-2',
    title: '승',
    content: '에러 발생 시뮬레이션',
    goal: '에러 상황 연출',
    duration: '15-20초',
    order: 2
  },
  {
    id: 'stage-3',
    title: '전',
    content: '복구 로직 실행',
    goal: '에러 복구',
    duration: '20-25초',
    order: 3
  },
  {
    id: 'stage-4',
    title: '결',
    content: '정상 상태 복구',
    goal: '테스트 완료',
    duration: '8-12초',
    order: 4
  }
]

const mockValidShots: VideoShot[] = Array.from({ length: 12 }, (_, i) => ({
  id: `shot-${i + 1}`,
  title: `에러 테스트 샷 ${i + 1}`,
  description: `샷 ${i + 1} 설명`,
  shotType: ['클로즈업', '미디엄샷', '와이드샷'][i % 3],
  cameraMove: ['고정', '줌인', '패닝'][i % 3],
  composition: ['정면', '좌측', '우측'][i % 3],
  duration: 3 + (i % 3),
  dialogue: i % 2 === 0 ? `샷 ${i + 1} 대사` : '',
  transition: ['컷', '페이드', '와이프'][i % 3],
  stageId: `stage-${Math.floor(i / 3) + 1}`,
  order: i + 1
}))

// 에러 시뮬레이션 헬퍼
const ErrorSimulator = {
  setupNetworkError: () => {
    server.use(
      http.post('*/api/video-planning/generate-stages', () => {
        return HttpResponse.error()
      })
    )
  },

  setupTimeoutError: () => {
    server.use(
      http.post('*/api/video-planning/generate-stages', async () => {
        // 35초 지연 (30초 타임아웃보다 길게)
        await new Promise(resolve => setTimeout(resolve, 35000))
        return HttpResponse.json({ success: true })
      })
    )
  },

  setupServerError: (statusCode = 500, errorMessage = '서버 내부 오류') => {
    server.use(
      http.post('*/api/video-planning/generate-stages', () => {
        return HttpResponse.json({
          success: false,
          error: 'INTERNAL_SERVER_ERROR',
          message: errorMessage
        }, { status: statusCode })
      })
    )
  },

  setupLLMServiceError: () => {
    server.use(
      http.post('*/api/video-planning/generate-stages', () => {
        return HttpResponse.json({
          success: false,
          error: 'LLM_SERVICE_UNAVAILABLE',
          message: 'AI 서비스가 일시적으로 사용할 수 없습니다. 잠시 후 다시 시도해주세요.',
          retryAfter: 30
        }, { status: 503 })
      })
    )
  },

  setupRateLimitError: () => {
    server.use(
      http.post('*/api/video-planning/generate-stages', () => {
        return HttpResponse.json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
          retryAfter: 60
        }, { status: 429 })
      })
    )
  },

  setupAuthenticationError: () => {
    server.use(
      http.post('*/api/video-planning/generate-stages', () => {
        return HttpResponse.json({
          success: false,
          error: 'AUTHENTICATION_FAILED',
          message: '인증에 실패했습니다. 다시 로그인해주세요.'
        }, { status: 401 })
      })
    )
  },

  setupValidationError: () => {
    server.use(
      http.post('*/api/video-planning/generate-stages', () => {
        return HttpResponse.json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: '입력 데이터가 올바르지 않습니다.',
          details: {
            title: '제목은 5자 이상이어야 합니다.',
            logline: '로그라인은 20자 이상이어야 합니다.'
          }
        }, { status: 400 })
      })
    )
  },

  setupIntermittentError: (failureRate = 0.7) => {
    let attemptCount = 0
    server.use(
      http.post('*/api/video-planning/generate-stages', () => {
        attemptCount++
        
        if (Math.random() < failureRate) {
          return HttpResponse.json({
            success: false,
            error: 'INTERMITTENT_ERROR',
            message: `서비스가 불안정합니다. (시도 ${attemptCount}회)`
          }, { status: 503 })
        }
        
        return HttpResponse.json({
          success: true,
          stages: mockValidStages,
          message: `${attemptCount}번째 시도에서 성공했습니다.`
        })
      })
    )
  },

  reset: () => {
    server.resetHandlers()
  }
}

describe('Error Handling and Recovery Scenarios', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    ErrorSimulator.reset()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('네트워크 에러 처리', () => {
    it('네트워크 연결 실패 시 적절한 에러 메시지와 재시도 옵션을 제공해야 한다', async () => {
      // Arrange
      ErrorSimulator.setupNetworkError()
      render(<VideoPlanningWizard />)
      
      // 기본 입력
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      
      // Act
      await user.click(screen.getByText('생성'))
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/네트워크 연결을 확인/)).toBeInTheDocument()
        expect(screen.getByText('다시 시도')).toBeInTheDocument()
      }, { timeout: 10000 })
      
      // 재시도 버튼이 작동하는지 확인
      const retryButton = screen.getByText('다시 시도')
      expect(retryButton).toBeEnabled()
    })

    it('네트워크 복구 후 재시도가 성공해야 한다', async () => {
      // Arrange - 처음엔 실패
      ErrorSimulator.setupNetworkError()
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => {
        expect(screen.getByText('다시 시도')).toBeInTheDocument()
      })
      
      // Act - 네트워크 복구 시뮬레이션
      ErrorSimulator.reset() // 정상 핸들러로 복구
      
      const retryButton = screen.getByText('다시 시도')
      await user.click(retryButton)
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText('STEP 2')).toBeInTheDocument()
        expect(screen.getByText('4단계 검토/수정')).toBeInTheDocument()
      }, { timeout: 10000 })
    })

    it('오프라인 상태 감지 시 적절한 안내를 제공해야 한다', async () => {
      // Arrange - navigator.onLine을 false로 모킹
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })
      
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      
      // Act
      await user.click(screen.getByText('생성'))
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/인터넷 연결을 확인/)).toBeInTheDocument()
      })
      
      // Cleanup
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
    })
  })

  describe('서버 에러 처리', () => {
    it('500 내부 서버 에러 시 기술적 세부사항을 숨기고 사용자 친화적 메시지를 표시해야 한다', async () => {
      // Arrange
      ErrorSimulator.setupServerError(500, '데이터베이스 연결 실패: connection timeout')
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      
      // Act
      await user.click(screen.getByText('생성'))
      
      // Assert
      await waitFor(() => {
        // 기술적 세부사항은 노출되지 않아야 함
        expect(screen.queryByText(/데이터베이스 연결 실패/)).not.toBeInTheDocument()
        expect(screen.queryByText(/connection timeout/)).not.toBeInTheDocument()
        
        // 사용자 친화적 메시지만 표시
        expect(screen.getByText(/서비스에 일시적인 문제가 발생/)).toBeInTheDocument()
        expect(screen.getByText('다시 시도')).toBeInTheDocument()
      })
    })

    it('503 서비스 이용 불가 시 예상 복구 시간을 안내해야 한다', async () => {
      // Arrange
      ErrorSimulator.setupLLMServiceError()
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      
      // Act
      await user.click(screen.getByText('생성'))
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/AI 서비스가 일시적으로 사용할 수 없습니다/)).toBeInTheDocument()
        expect(screen.getByText(/30초 후/)).toBeInTheDocument()
        expect(screen.getByText('다시 시도')).toBeInTheDocument()
      })
    })

    it('429 요청 한도 초과 시 대기 시간을 표시하고 자동 재시도를 제공해야 한다', async () => {
      // Arrange
      ErrorSimulator.setupRateLimitError()
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      
      // Act
      await user.click(screen.getByText('생성'))
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/요청 한도를 초과했습니다/)).toBeInTheDocument()
        expect(screen.getByText(/60초 후/)).toBeInTheDocument()
        
        // 자동 재시도 카운트다운이 표시되는지 확인
        expect(screen.getByText(/자동으로 다시 시도/)).toBeInTheDocument()
      })
    })
  })

  describe('인증 및 권한 에러 처리', () => {
    it('401 인증 실패 시 로그인 페이지로 리다이렉트 안내를 제공해야 한다', async () => {
      // Arrange
      ErrorSimulator.setupAuthenticationError()
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      
      // Act
      await user.click(screen.getByText('생성'))
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/인증에 실패했습니다/)).toBeInTheDocument()
        expect(screen.getByText(/다시 로그인/)).toBeInTheDocument()
        expect(screen.getByText('로그인 페이지로 이동')).toBeInTheDocument()
      })
    })
  })

  describe('입력 검증 에러 처리', () => {
    it('400 유효성 검사 실패 시 구체적인 필드별 에러를 표시해야 한다', async () => {
      // Arrange
      ErrorSimulator.setupValidationError()
      render(<VideoPlanningWizard />)
      
      // 의도적으로 짧은 입력 사용
      await user.type(screen.getByLabelText('제목'), '짧음')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '너무짧음')
      
      // Act
      await user.click(screen.getByText('생성'))
      
      // Assert
      await waitFor(() => {
        // 전체 에러 메시지
        expect(screen.getByText(/입력 데이터가 올바르지 않습니다/)).toBeInTheDocument()
        
        // 필드별 구체적 에러
        expect(screen.getByText(/제목은 5자 이상이어야 합니다/)).toBeInTheDocument()
        expect(screen.getByText(/로그라인은 20자 이상이어야 합니다/)).toBeInTheDocument()
      })
      
      // 해당 필드들이 에러 상태로 표시되는지 확인
      const titleInput = screen.getByLabelText('제목')
      const loglineInput = screen.getByLabelText('한 줄 스토리(로그라인)')
      
      expect(titleInput).toHaveClass('border-red-500') // 에러 스타일링
      expect(loglineInput).toHaveClass('border-red-500')
    })

    it('필드별 에러 수정 시 실시간으로 에러 상태가 해제되어야 한다', async () => {
      // Arrange
      ErrorSimulator.setupValidationError()
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), '짧음')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '너무짧음')
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => {
        expect(screen.getByText(/제목은 5자 이상이어야 합니다/)).toBeInTheDocument()
      })
      
      // Act - 제목 필드 수정
      const titleInput = screen.getByLabelText('제목')
      await user.clear(titleInput)
      await user.type(titleInput, '올바른 길이의 제목')
      
      // Assert - 제목 필드 에러만 해제되어야 함
      await waitFor(() => {
        expect(screen.queryByText(/제목은 5자 이상이어야 합니다/)).not.toBeInTheDocument()
        expect(screen.getByText(/로그라인은 20자 이상이어야 합니다/)).toBeInTheDocument() // 여전히 남아있음
      })
    })
  })

  describe('타임아웃 처리', () => {
    it('API 타임아웃 발생 시 적절한 에러 메시지와 재시도 옵션을 제공해야 한다', async () => {
      // Arrange
      ErrorSimulator.setupTimeoutError()
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      
      // Act
      await user.click(screen.getByText('생성'))
      
      // Assert
      await waitFor(() => {
        expect(screen.getByText(/요청 시간이 초과되었습니다/)).toBeInTheDocument()
        expect(screen.getByText(/네트워크 상태를 확인/)).toBeInTheDocument()
        expect(screen.getByText('다시 시도')).toBeInTheDocument()
      }, { timeout: 35000 })
    })
  })

  describe('부분적 실패 처리', () => {
    it('스토리보드 생성 일부 실패 시 성공한 것들은 유지하고 실패한 것만 재시도할 수 있어야 한다', async () => {
      // Arrange
      const mockProps: TwelveShotsEditorProps = {
        shots: mockValidShots.slice(0, 3), // 3개만 테스트
        insertShots: [],
        onShotUpdate: jest.fn(),
        onInsertUpdate: jest.fn(),
        onGenerateStoryboard: jest.fn(),
        onExport: jest.fn(),
        onBack: jest.fn(),
        isLoading: false
      }

      // 첫 번째는 성공, 두 번째는 실패, 세 번째는 성공하도록 설정
      let callCount = 0
      server.use(
        http.post('*/api/video-planning/generate-storyboard', async ({ request }) => {
          callCount++
          const body = await request.json() as { shot: VideoShot }
          
          if (body.shot.id === 'shot-2') {
            return HttpResponse.json({
              success: false,
              error: 'IMAGE_GENERATION_FAILED',
              message: '스토리보드 생성에 실패했습니다.'
            }, { status: 500 })
          }
          
          return HttpResponse.json({
            success: true,
            storyboardUrl: `/mock-storyboard-${body.shot.id}.jpg`,
            message: '스토리보드가 성공적으로 생성되었습니다.'
          })
        })
      )

      render(<TwelveShotsEditor {...mockProps} />)

      // Act - 모든 스토리보드 생성 버튼 클릭
      const generateButtons = screen.getAllByText('생성')
      
      for (const button of generateButtons.slice(0, 3)) {
        await user.click(button)
      }

      // Assert
      await waitFor(() => {
        // 성공한 스토리보드들은 표시되어야 함
        expect(screen.getByAltText('스토리보드')).toBeInTheDocument() // shot-1
        
        // 실패한 것은 에러 메시지와 재시도 버튼이 있어야 함
        expect(screen.getByText('스토리보드 생성에 실패했습니다.')).toBeInTheDocument()
        expect(screen.getAllByText('재생성')).toHaveLength(1) // shot-2의 재생성 버튼
      }, { timeout: 10000 })
    })
  })

  describe('복구 시나리오', () => {
    it('간헐적 에러가 발생해도 지수적 백오프로 결국 성공해야 한다', async () => {
      // Arrange - 70% 확률로 실패하는 불안정한 서비스
      ErrorSimulator.setupIntermittentError(0.7)
      
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      
      // Act - 여러 번 재시도
      await user.click(screen.getByText('생성'))
      
      let retryCount = 0
      const maxRetries = 5
      
      while (retryCount < maxRetries) {
        try {
          await waitFor(() => {
            if (screen.queryByText('STEP 2')) {
              return true // 성공
            } else if (screen.queryByText('다시 시도')) {
              throw new Error('아직 실패 상태')
            }
            throw new Error('예상치 못한 상태')
          }, { timeout: 5000 })
          
          break // 성공했으므로 루프 종료
        } catch {
          retryCount++
          
          if (retryCount < maxRetries) {
            const retryButton = screen.getByText('다시 시도')
            await user.click(retryButton)
          }
        }
      }
      
      // Assert - 최종적으로는 성공해야 함
      expect(screen.getByText('STEP 2')).toBeInTheDocument()
      expect(retryCount).toBeLessThan(maxRetries) // 최대 재시도 전에 성공
    }, 30000)

    it('로컬 스토리지에서 진행 상태를 복구할 수 있어야 한다', async () => {
      // Arrange - 로컬 스토리지에 진행 상태 저장
      const savedState = {
        currentStep: 2,
        input: mockValidInput,
        stages: mockValidStages,
        timestamp: Date.now()
      }
      
      localStorage.setItem('video-planning-progress', JSON.stringify(savedState))
      
      // Act
      render(<VideoPlanningWizard />)
      
      // Assert - STEP 2부터 시작해야 함
      await waitFor(() => {
        expect(screen.getByText('STEP 2')).toBeInTheDocument()
        expect(screen.getByText('4단계 검토/수정')).toBeInTheDocument()
        
        // 이전에 저장된 데이터가 복구되었는지 확인
        expect(screen.getByText('에러 테스트 프로젝트')).toBeInTheDocument()
      })
      
      // Cleanup
      localStorage.removeItem('video-planning-progress')
    })

    it('브라우저 새로고침 후에도 현재 진행 상태를 유지해야 한다', async () => {
      // Arrange
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => {
        expect(screen.getByText('STEP 2')).toBeInTheDocument()
      }, { timeout: 10000 })
      
      // Act - 새로고침 시뮬레이션 (컴포넌트 재마운트)
      const { unmount } = render(<></>)
      unmount()
      render(<VideoPlanningWizard />)
      
      // Assert - 상태가 복구되어야 함
      await waitFor(() => {
        expect(screen.getByText('STEP 2')).toBeInTheDocument()
        expect(screen.getByText('기')).toBeInTheDocument()
      })
    })
  })

  describe('사용자 경험 개선', () => {
    it('에러 발생 시 사용자가 작성한 데이터는 보존되어야 한다', async () => {
      // Arrange
      ErrorSimulator.setupServerError()
      render(<VideoPlanningWizard />)
      
      const titleValue = '사용자가 열심히 작성한 제목'
      const loglineValue = '매우 정성스럽게 작성한 로그라인 내용입니다'
      
      await user.type(screen.getByLabelText('제목'), titleValue)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), loglineValue)
      
      // Act
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => {
        expect(screen.getByText('다시 시도')).toBeInTheDocument()
      })
      
      // Assert - 입력한 데이터가 여전히 남아있어야 함
      expect(screen.getByDisplayValue(titleValue)).toBeInTheDocument()
      expect(screen.getByDisplayValue(loglineValue)).toBeInTheDocument()
    })

    it('긴 처리 시간 중에 진행률 표시와 취소 옵션을 제공해야 한다', async () => {
      // Arrange - 긴 처리 시간 시뮬레이션
      server.use(
        http.post('*/api/video-planning/generate-stages', async () => {
          await new Promise(resolve => setTimeout(resolve, 5000)) // 5초 지연
          return HttpResponse.json({
            success: true,
            stages: mockValidStages
          })
        })
      )
      
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      
      // Act
      await user.click(screen.getByText('생성'))
      
      // Assert - 진행률 표시와 취소 버튼 확인
      expect(screen.getByText('4단계 기획안을 생성하고 있습니다...')).toBeInTheDocument()
      
      // 진행률 표시가 있는지 확인 (스피너 또는 진행률 바)
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
      
      // 취소 버튼이 있는지 확인
      expect(screen.getByText('취소')).toBeInTheDocument()
      
      // 취소 버튼 클릭 시 요청이 중단되는지 확인
      await user.click(screen.getByText('취소'))
      
      expect(screen.queryByText('4단계 기획안을 생성하고 있습니다...')).not.toBeInTheDocument()
    }, 15000)

    it('에러 로그를 수집하여 개발팀에게 전송할 수 있어야 한다', async () => {
      // Arrange
      const errorReportSpy = jest.fn()
      
      // 전역 에러 리포터 모킹
      window.reportError = errorReportSpy
      
      ErrorSimulator.setupServerError(500, 'Critical system failure')
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), mockValidInput.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), mockValidInput.logline)
      
      // Act
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => {
        expect(screen.getByText('다시 시도')).toBeInTheDocument()
      })
      
      // Assert - 에러가 자동으로 리포트되었는지 확인
      expect(errorReportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Critical system failure',
          context: expect.objectContaining({
            component: 'VideoPlanningWizard',
            action: 'generate-stages',
            input: expect.any(Object)
          })
        })
      )
      
      // Cleanup
      delete window.reportError
    })
  })
})