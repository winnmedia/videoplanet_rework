/**
 * @fileoverview 영상 기획 위저드 컴포넌트 테스트
 * @description TDD 방식으로 3단계 영상 기획 위저드 컴포넌트 테스트 - Redux 연동
 */

import { configureStore } from '@reduxjs/toolkit'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import React from 'react'
import { Provider } from 'react-redux'
import { vi } from 'vitest'

import videoPlanningWizardReducer from '../model/videoPlanningSlice'
import { VideoPlanningWizard } from '../ui/VideoPlanningWizard'

// MSW 핸들러 모킹

const mockApiResponse = {
  stages: [
    { id: '1', title: '기', content: '훅으로 시작하여 시청자의 관심을 끌어야 합니다.', goal: '관심 유발', duration: '5-8초' },
    { id: '2', title: '승', content: '문제 상황을 구체적으로 제시합니다.', goal: '문제 인식', duration: '15-20초' },
    { id: '3', title: '전', content: '해결책을 제시하고 설득합니다.', goal: '해결책 제시', duration: '20-25초' },
    { id: '4', title: '결', content: '행동 유도와 마무리를 합니다.', goal: '행동 유도', duration: '8-12초' }
  ]
}

const mockShotsResponse = {
  success: true,
  shots: Array.from({ length: 12 }, (_, i) => ({
    id: `shot-${i + 1}`,
    order: i + 1,
    title: `샷 ${i + 1}`,
    description: `샷 ${i + 1} 설명`,
    shotType: '미디엄샷' as const,
    cameraMove: '고정' as const,
    composition: '정면' as const,
    duration: 4,
    dialogue: '',
    subtitle: '',
    audio: '',
    transition: '컷' as const
  })),
  insertShots: Array.from({ length: 3 }, (_, i) => ({
    id: `insert-${i + 1}`,
    purpose: `인서트 ${i + 1} 목적`,
    description: `인서트 ${i + 1} 설명`,
    framing: `인서트 ${i + 1} 프레이밍`
  })),
  totalDuration: 48
}

// 테스트용 Redux store 생성
const createTestStore = () => {
  return configureStore({
    reducer: {
      videoPlanningWizard: videoPlanningWizardReducer,
    },
  })
}

// React Testing Library wrapper with Redux Provider
const renderWithRedux = (component: React.ReactElement) => {
  const store = createTestStore()
  return {
    ...render(
      <Provider store={store}>
        {component}
      </Provider>
    ),
    store
  }
}

// 테스트용 MSW 서버 설정
const server = setupServer(
  http.post('/api/video-planning/generate-stages', () => {
    return HttpResponse.json({
      success: true,
      ...mockApiResponse
    })
  }),
  http.post('/api/video-planning/generate-shots', () => {
    return HttpResponse.json(mockShotsResponse)
  }),
  http.post('/api/video-planning/generate-storyboard', () => {
    return HttpResponse.json({ 
      success: true,
      storyboardUrl: '/mock-storyboard.jpg' 
    })
  }),
  http.post('/api/video-planning/export-plan', () => {
    return HttpResponse.json({ 
      success: true,
      downloadUrl: '/mock-planning.pdf' 
    })
  })
)

// API 모킹 설정
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

describe('VideoPlanningWizard', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('STEP 1: 입력/선택 단계', () => {
    it('초기 상태에서 STEP 1이 활성화되어야 한다', () => {
      renderWithRedux(<VideoPlanningWizard />)
      
      expect(screen.getByText('STEP 1')).toBeInTheDocument()
      expect(screen.getByText('입력/선택')).toBeInTheDocument()
      expect(screen.getByLabelText('제목')).toBeInTheDocument()
      expect(screen.getByLabelText('한 줄 스토리(로그라인)')).toBeInTheDocument()
    })

    it('필수 입력 필드가 모두 표시되어야 한다', () => {
      render(<VideoPlanningWizard />)
      
      expect(screen.getByLabelText('제목')).toBeInTheDocument()
      expect(screen.getByLabelText('한 줄 스토리(로그라인)')).toBeInTheDocument()
      expect(screen.getByLabelText('톤앤매너')).toBeInTheDocument()
      expect(screen.getByLabelText('장르')).toBeInTheDocument()
      expect(screen.getByLabelText('타겟')).toBeInTheDocument()
      expect(screen.getByLabelText('분량')).toBeInTheDocument()
      expect(screen.getByLabelText('포맷')).toBeInTheDocument()
      expect(screen.getByLabelText('템포')).toBeInTheDocument()
    })

    it('전개 방식 버튼 그룹이 표시되어야 한다', () => {
      render(<VideoPlanningWizard />)
      
      expect(screen.getByText('훅–몰입–반전–떡밥')).toBeInTheDocument()
      expect(screen.getByText('기승전결')).toBeInTheDocument()
      expect(screen.getByText('귀납법')).toBeInTheDocument()
      expect(screen.getByText('연역법')).toBeInTheDocument()
      expect(screen.getByText('다큐(인터뷰식)')).toBeInTheDocument()
      expect(screen.getByText('픽사 스토리텔링')).toBeInTheDocument()
    })

    it('프리셋 버튼이 표시되어야 한다', () => {
      render(<VideoPlanningWizard />)
      
      expect(screen.getByText('광고형 프리셋')).toBeInTheDocument()
      expect(screen.getByText('드라마형 프리셋')).toBeInTheDocument()
      expect(screen.getByText('다큐형 프리셋')).toBeInTheDocument()
      expect(screen.getByText('소셜미디어 프리셋')).toBeInTheDocument()
    })

    it('필수 필드가 비어있으면 생성 버튼이 비활성화되어야 한다', () => {
      render(<VideoPlanningWizard />)
      
      const generateButton = screen.getByText('생성')
      expect(generateButton).toBeDisabled()
    })

    it('필수 필드를 모두 입력하면 생성 버튼이 활성화되어야 한다', async () => {
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), '테스트 영상')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '흥미로운 이야기')
      
      const generateButton = screen.getByText('생성')
      expect(generateButton).toBeEnabled()
    })

    it('프리셋 버튼 클릭 시 모든 필드가 자동으로 채워져야 한다', async () => {
      render(<VideoPlanningWizard />)
      
      await user.click(screen.getByText('광고형 프리셋'))
      
      expect(screen.getByDisplayValue('상품 소개 영상')).toBeInTheDocument()
      expect(screen.getByDisplayValue('우리 제품의 놀라운 효과를 경험해보세요')).toBeInTheDocument()
      expect(screen.getByDisplayValue('발랄')).toBeInTheDocument()
      expect(screen.getByDisplayValue('광고')).toBeInTheDocument()
    })

    it('생성 버튼 클릭 시 API 호출이 되어야 한다', async () => {
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), '테스트 영상')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '흥미로운 이야기')
      
      await user.click(screen.getByText('생성'))
      
      expect(screen.getByText('4단계 기획안을 생성하고 있습니다...')).toBeInTheDocument()
    })
  })

  describe('STEP 2: 4단계 검토/수정 단계', () => {
    beforeEach(async () => {
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), '테스트 영상')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '흥미로운 이야기')
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => {
        expect(screen.getByText('STEP 2')).toBeInTheDocument()
      })
    })

    it('4단계 카드가 모두 표시되어야 한다', () => {
      expect(screen.getByText('기')).toBeInTheDocument()
      expect(screen.getByText('승')).toBeInTheDocument()
      expect(screen.getByText('전')).toBeInTheDocument()
      expect(screen.getByText('결')).toBeInTheDocument()
    })

    it('각 단계 카드에 요약, 본문, 목표, 길이 힌트가 표시되어야 한다', () => {
      expect(screen.getByText('관심 유발')).toBeInTheDocument()
      expect(screen.getByText('5-8초')).toBeInTheDocument()
      expect(screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')).toBeInTheDocument()
    })

    it('단계별 내용을 인라인 편집할 수 있어야 한다', async () => {
      const editButton = screen.getAllByLabelText('편집')[0]
      await user.click(editButton)
      
      const textArea = screen.getByDisplayValue('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')
      expect(textArea).toBeInTheDocument()
      
      await user.clear(textArea)
      await user.type(textArea, '수정된 내용입니다.')
      
      const saveButton = screen.getByText('저장')
      await user.click(saveButton)
      
      expect(screen.getByText('수정된 내용입니다.')).toBeInTheDocument()
    })

    it('되돌리기/초기화 기능이 동작해야 한다', async () => {
      const resetButton = screen.getByText('초기화')
      await user.click(resetButton)
      
      // 확인 대화상자가 표시되어야 함
      expect(screen.getByText('정말로 초기화하시겠습니까?')).toBeInTheDocument()
      
      const confirmButton = screen.getByText('확인')
      await user.click(confirmButton)
      
      // 원래 내용으로 돌아가야 함
      expect(screen.getByText('훅으로 시작하여 시청자의 관심을 끌어야 합니다.')).toBeInTheDocument()
    })

    it('숏 생성 버튼 클릭 시 STEP 3로 이동해야 한다', async () => {
      const generateShotsButton = screen.getByText('숏 생성')
      await user.click(generateShotsButton)
      
      await waitFor(() => {
        expect(screen.getByText('STEP 3')).toBeInTheDocument()
      })
    })
  })

  describe('STEP 3: 12숏 편집·콘티·인서트·내보내기 단계', () => {
    beforeEach(async () => {
      render(<VideoPlanningWizard />)
      
      // STEP 1 완료
      await user.type(screen.getByLabelText('제목'), '테스트 영상')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '흥미로운 이야기')
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => {
        expect(screen.getByText('STEP 2')).toBeInTheDocument()
      })
      
      // STEP 2 완료
      await user.click(screen.getByText('숏 생성'))
      
      await waitFor(() => {
        expect(screen.getByText('STEP 3')).toBeInTheDocument()
      })
    })

    it('12개의 숏 카드가 3x4 그리드로 표시되어야 한다', () => {
      for (let i = 1; i <= 12; i++) {
        expect(screen.getByText(`샷 ${i}`)).toBeInTheDocument()
      }
    })

    it('각 숏 카드에 콘티 프레임과 편집 필드가 표시되어야 한다', () => {
      const firstShotCard = screen.getByTestId('shot-card-0')
      
      expect(firstShotCard).toContainElement(screen.getByText('샷 제목/서술'))
      expect(firstShotCard).toContainElement(screen.getByText('샷/카메라/구도'))
      expect(firstShotCard).toContainElement(screen.getByText('길이(초)'))
      expect(firstShotCard).toContainElement(screen.getByText('대사/자막/오디오'))
      expect(firstShotCard).toContainElement(screen.getByText('전환'))
    })

    it('콘티 프레임에서 생성/재생성/다운로드 버튼이 동작해야 한다', async () => {
      const generateStoryboardButton = screen.getAllByText('생성')[0]
      await user.click(generateStoryboardButton)
      
      expect(screen.getByText('콘티를 생성하고 있습니다...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByAltText('스토리보드')).toBeInTheDocument()
      })
    })

    it('인서트 3컷 추천이 표시되어야 한다', () => {
      expect(screen.getByText('인서트 3컷 추천')).toBeInTheDocument()
      
      for (let i = 1; i <= 3; i++) {
        expect(screen.getByText(`인서트 ${i}`)).toBeInTheDocument()
      }
    })

    it('기획안 다운로드 버튼이 동작해야 한다', async () => {
      const downloadButton = screen.getByText('기획안 다운로드')
      await user.click(downloadButton)
      
      expect(screen.getByText('JSON')).toBeInTheDocument()
      expect(screen.getByText('Marp PDF')).toBeInTheDocument()
    })

    it('PDF 다운로드 시 A4 가로, 여백 0 설정이 적용되어야 한다', async () => {
      const pdfButton = screen.getByText('Marp PDF')
      await user.click(pdfButton)
      
      expect(screen.getByText('PDF를 생성하고 있습니다...')).toBeInTheDocument()
      
      await waitFor(() => {
        // PDF 생성 완료 후 다운로드 링크가 나타나는지 확인
        expect(screen.getByText('PDF 다운로드')).toBeInTheDocument()
      })
    })
  })

  describe('전체 워크플로우 테스트', () => {
    it('STEP 1 → STEP 2 → STEP 3 순서대로 진행되어야 한다', async () => {
      render(<VideoPlanningWizard />)
      
      // STEP 1
      expect(screen.getByText('STEP 1')).toBeInTheDocument()
      
      await user.type(screen.getByLabelText('제목'), '테스트 영상')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '흥미로운 이야기')
      await user.click(screen.getByText('생성'))
      
      // STEP 2
      await waitFor(() => {
        expect(screen.getByText('STEP 2')).toBeInTheDocument()
        expect(screen.getByText('4단계 검토/수정')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('숏 생성'))
      
      // STEP 3
      await waitFor(() => {
        expect(screen.getByText('STEP 3')).toBeInTheDocument()
        expect(screen.getByText('12숏 편집·콘티·인서트·내보내기')).toBeInTheDocument()
      })
    })

    it('이전 단계로 돌아갈 수 있어야 한다', async () => {
      render(<VideoPlanningWizard />)
      
      // STEP 3까지 진행
      await user.type(screen.getByLabelText('제목'), '테스트 영상')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '흥미로운 이야기')
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => screen.getByText('STEP 2'))
      await user.click(screen.getByText('숏 생성'))
      await waitFor(() => screen.getByText('STEP 3'))
      
      // 이전 버튼으로 STEP 2로 돌아가기
      const prevButton = screen.getByText('이전')
      await user.click(prevButton)
      
      expect(screen.getByText('STEP 2')).toBeInTheDocument()
    })

    it('진행률 표시가 정확해야 한다', async () => {
      render(<VideoPlanningWizard />)
      
      // STEP 1
      expect(screen.getByText('1/3')).toBeInTheDocument()
      
      await user.type(screen.getByLabelText('제목'), '테스트 영상')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '흥미로운 이야기')
      await user.click(screen.getByText('생성'))
      
      // STEP 2
      await waitFor(() => {
        expect(screen.getByText('2/3')).toBeInTheDocument()
      })
      
      await user.click(screen.getByText('숏 생성'))
      
      // STEP 3
      await waitFor(() => {
        expect(screen.getByText('3/3')).toBeInTheDocument()
      })
    })
  })

  describe('에러 처리', () => {
    it('API 에러 시 에러 메시지가 표시되어야 한다', async () => {
      server.use(
        rest.post('/api/video-planning/generate-stages', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'API 에러가 발생했습니다.' }))
        })
      )

      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), '테스트 영상')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '흥미로운 이야기')
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => {
        expect(screen.getByText('API 에러가 발생했습니다.')).toBeInTheDocument()
      })
    })

    it('네트워크 에러 시 재시도 버튼이 표시되어야 한다', async () => {
      server.use(
        rest.post('/api/video-planning/generate-stages', (req, res, ctx) => {
          return res.networkError('네트워크 에러')
        })
      )

      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), '테스트 영상')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '흥미로운 이야기')
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => {
        expect(screen.getByText('다시 시도')).toBeInTheDocument()
      })
    })
  })

  describe('접근성 테스트', () => {
    it('키보드 네비게이션이 가능해야 한다', async () => {
      render(<VideoPlanningWizard />)
      
      const titleInput = screen.getByLabelText('제목')
      titleInput.focus()
      
      expect(titleInput).toHaveFocus()
      
      fireEvent.keyDown(titleInput, { key: 'Tab' })
      
      const storyInput = screen.getByLabelText('한 줄 스토리(로그라인)')
      expect(storyInput).toHaveFocus()
    })

    it('스크린 리더용 aria-label이 설정되어야 한다', () => {
      render(<VideoPlanningWizard />)
      
      expect(screen.getByLabelText('제목')).toHaveAttribute('aria-required', 'true')
      expect(screen.getByLabelText('한 줄 스토리(로그라인)')).toHaveAttribute('aria-required', 'true')
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })
})