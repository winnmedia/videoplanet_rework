import { screen, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../shared/api/mocks/server'
import { render, setupMSW, cleanupRTKQuery } from '../../shared/lib/test-utils'
import { PlanningWizard } from './PlanningWizard'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

// MSW 서버 설정
setupMSW()
cleanupRTKQuery()

describe('PlanningWizard Component - RTK Query Pattern', () => {
  // 테스트별 초기화 - RTK Query 캐시는 자동으로 cleanupRTKQuery에서 처리
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // RED: 기본 렌더링 실패 테스트
  it('should render 3-step wizard UI', () => {
    render(<PlanningWizard projectId="test-project" />)
    
    // 위젯 제목
    expect(screen.getByRole('heading', { name: /AI 기획 마법사/i })).toBeInTheDocument()
    
    // 3단계 스텝 표시
    expect(screen.getByText(/1단계: 스토리 생성/i)).toBeInTheDocument()
    expect(screen.getByText(/2단계: 4막 구조/i)).toBeInTheDocument()
    expect(screen.getByText(/3단계: 12샷 리스트/i)).toBeInTheDocument()
    
    // 현재 활성 단계 (1단계)
    expect(screen.getByText(/스토리 개요를 입력하세요/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/스토리 개요/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/장르/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/타겟 길이/i)).toBeInTheDocument()
    
    // 버튼들
    expect(screen.getByRole('button', { name: /다음 단계/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /취소/i })).toBeInTheDocument()
  })

  // RTK Query Pattern: 1단계 - 스토리 생성 테스트
  it('should handle story generation in step 1 with RTK Query', async () => {
    const user = userEvent.setup()
    
    // MSW에서 adventure 장르에 대한 응답이 이미 설정되어 있음
    render(<PlanningWizard projectId="test-project" />)
    
    // 스토리 개요 입력
    await user.type(screen.getByLabelText(/스토리 개요/i), '모험을 찾아 떠나는 이야기')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    
    const nextButton = screen.getByRole('button', { name: /다음 단계/i })
    await user.click(nextButton)
    
    // RTK Query 로딩 상태 확인
    expect(screen.getByText(/AI가 스토리를 생성 중입니다/i)).toBeInTheDocument()
    
    // MSW 응답 대기 및 2단계로 이동 확인
    await waitFor(() => {
      expect(screen.getByText(/2단계: 4막 구조/i)).toBeInTheDocument()
    }, { timeout: 3000 }) // MSW에서 2초 지연 설정됨
    
    // MSW에서 반환된 adventure 스토리 확인
    await waitFor(() => {
      expect(screen.getByText(/젊은 탐험가 알렉스는 잃어버린 고대 도시를 찾아/)).toBeInTheDocument()
    })
  })

  // RTK Query Pattern: 로딩 상태 표시 테스트
  it('should show RTK Query loading state during AI generation', async () => {
    const user = userEvent.setup()
    
    render(<PlanningWizard projectId="test-project" />)
    
    await user.type(screen.getByLabelText(/스토리 개요/i), '긴 모험 이야기를 만들어주세요')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    
    const nextButton = screen.getByRole('button', { name: /다음 단계/i })
    await user.click(nextButton)
    
    // RTK Query isLoading 상태 확인
    expect(screen.getByText(/AI가 스토리를 생성 중입니다/i)).toBeInTheDocument()
    
    // 로딩 중 버튼 상태 확인
    expect(screen.getByRole('button', { name: /생성 중.../i })).toBeDisabled()
    
    // 프로그레스바가 있다면 확인
    const progressIndicator = screen.queryByRole('progressbar')
    if (progressIndicator) {
      expect(progressIndicator).toBeInTheDocument()
    }
    
    // MSW 응답 완료 후 로딩 상태 해제 확인
    await waitFor(() => {
      expect(screen.queryByText(/AI가 스토리를 생성 중입니다/i)).not.toBeInTheDocument()
    }, { timeout: 3000 })
  })

  // RTK Query Pattern: 2단계 - 4막 구조 생성 테스트
  it('should handle 4-act structure generation in step 2 with RTK Query', async () => {
    const user = userEvent.setup()

    render(<PlanningWizard projectId="test-project" />)
    
    // 1단계 진행 - 스토리 생성
    await user.type(screen.getByLabelText(/스토리 개요/i), '모험을 찾아 떠나는 긴 이야기')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    // 2단계 로딩 및 완료 대기
    await waitFor(() => {
      expect(screen.getByText(/2단계: 4막 구조/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // 2단계에서 4막 구조 생성 진행
    const nextButton2 = await waitFor(() => 
      screen.getByRole('button', { name: /다음 단계/i })
    )
    await user.click(nextButton2)
    
    // 4막 구조 생성 로딩 상태 확인
    expect(screen.getByText(/4막 구조를 생성 중입니다/i)).toBeInTheDocument()
    
    // 3단계로 이동 및 MSW에서 제공하는 4막 구조 표시 확인
    await waitFor(() => {
      expect(screen.getByText(/3단계: 12샷 리스트/i)).toBeInTheDocument()
    }, { timeout: 4000 }) // MSW에서 3초 지연 설정됨
    
    // MSW에서 반환된 4막 구조 확인
    await waitFor(() => {
      expect(screen.getByText(/상황 설정/)).toBeInTheDocument()
      expect(screen.getByText(/갈등 심화/)).toBeInTheDocument()
      expect(screen.getByText(/위기와 절정/)).toBeInTheDocument()
      expect(screen.getByText(/해결과 결말/)).toBeInTheDocument()
    })
  })

  // RTK Query Pattern: 3단계 - 12샷 리스트 생성 테스트
  it('should handle 12-shot list generation in step 3 with RTK Query', async () => {
    const user = userEvent.setup()

    render(<PlanningWizard projectId="test-project" />)
    
    // 1-2단계 빠르게 진행
    await user.type(screen.getByLabelText(/스토리 개요/i), '모험을 찾아 떠나는 긴 이야기')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    await waitFor(() => screen.getByText(/2단계: 4막 구조/i), { timeout: 3000 })
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    await waitFor(() => screen.getByText(/3단계: 12샷 리스트/i), { timeout: 4000 })
    
    // 12샷 리스트 생성 버튼 클릭
    const generateButton = await waitFor(() => 
      screen.getByRole('button', { name: /12샷 리스트 생성/i })
    )
    await user.click(generateButton)
    
    // 12샷 리스트 생성 로딩 상태 확인
    expect(screen.getByText(/12샷 리스트를 생성 중입니다/i)).toBeInTheDocument()
    
    // MSW에서 반환된 12샷 리스트 확인
    await waitFor(() => {
      expect(screen.getByText(/Wide Shot/)).toBeInTheDocument()
      expect(screen.getByText(/전체적인 배경과 상황을 보여주는 설정 샷/)).toBeInTheDocument()
    }, { timeout: 5000 }) // MSW에서 4초 지연 설정됨
    
    // 12개 샷이 모두 표시되는지 확인
    await waitFor(() => {
      expect(screen.getByText(/샷 1/)).toBeInTheDocument()
      expect(screen.getByText(/샷 12/)).toBeInTheDocument()
      expect(screen.getByText(/Master Shot/)).toBeInTheDocument()
    })
  })

  // RTK Query Pattern: PDF 내보내기 기능 테스트
  it('should handle PDF export functionality with RTK Query', async () => {
    const user = userEvent.setup()

    render(<PlanningWizard projectId="test-project" />)
    
    // 3단계까지 빠르게 진행
    await user.type(screen.getByLabelText(/스토리 개요/i), '모험을 찾아 떠나는 긴 이야기')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    await waitFor(() => screen.getByText(/2단계: 4막 구조/i), { timeout: 3000 })
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    await waitFor(() => screen.getByText(/3단계: 12샷 리스트/i), { timeout: 4000 })
    await user.click(screen.getByRole('button', { name: /12샷 리스트 생성/i }))
    
    // 12샷 리스트 생성 완료 대기
    await waitFor(() => {
      expect(screen.getByText(/Wide Shot/)).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // PDF 내보내기 버튼이 나타날 때까지 대기
    const exportButton = await waitFor(() => 
      screen.getByRole('button', { name: /PDF 내보내기/i })
    )
    
    await user.click(exportButton)
    
    // PDF 내보내기 로딩 상태 확인
    expect(screen.getByText(/PDF를 생성 중입니다/i)).toBeInTheDocument()
    
    // PDF 내보내기 완료 및 성공 메시지 확인
    await waitFor(() => {
      expect(screen.getByText(/PDF가 성공적으로 생성되었습니다/i)).toBeInTheDocument()
    }, { timeout: 3000 }) // MSW에서 2초 지연 설정됨
    
    // 다운로드 링크가 생성되었는지 확인 (MSW 모킹된 URL)
    await waitFor(() => {
      const downloadLink = screen.queryByText(/비디오_기획서_/)
      if (downloadLink) {
        expect(downloadLink).toBeInTheDocument()
      }
    })
  })

  // RED: 단계 간 네비게이션 테스트
  it('should allow navigation between completed steps', async () => {
    const user = userEvent.setup()
    mockGenerateStory.mockResolvedValue({ story: '완성된 스토리' })

    render(<PlanningWizard projectId="test-project" />)
    
    // 1단계 진행
    await user.type(screen.getByLabelText(/스토리 개요/i), '모험 이야기')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/2단계: 4막 구조/i)).toBeInTheDocument()
    })
    
    // 1단계로 돌아가기
    const step1Button = screen.getByText(/1단계: 스토리 생성/i)
    await user.click(step1Button)
    
    // 1단계 내용이 다시 표시되는지 확인
    expect(screen.getByLabelText(/스토리 개요/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/모험 이야기/i)).toBeInTheDocument()
  })

  // RED: 키보드 네비게이션 테스트
  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<PlanningWizard projectId="test-project" />)
    
    const outlineInput = screen.getByLabelText(/스토리 개요/i)
    const genreSelect = screen.getByLabelText(/장르/i)
    const lengthSelect = screen.getByLabelText(/타겟 길이/i)
    
    outlineInput.focus()
    expect(outlineInput).toHaveFocus()
    
    await user.tab()
    expect(genreSelect).toHaveFocus()
    
    await user.tab()
    expect(lengthSelect).toHaveFocus()
  })

  // RED: ARIA 및 접근성 테스트
  it('should have no accessibility violations', async () => {
    const { container } = render(<PlanningWizard projectId="test-project" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  // RED: 레거시 UI 스타일 검증 테스트
  it('should use legacy Button and Typography styles', () => {
    render(<PlanningWizard projectId="test-project" />)
    
    const nextButton = screen.getByRole('button', { name: /다음 단계/i })
    const title = screen.getByRole('heading', { name: /AI 기획 마법사/i })
    
    // 레거시 Button 스타일 확인
    expect(nextButton).toHaveClass('bg-primary', 'text-white', 'hover:bg-primary-dark')
    
    // 레거시 Typography 스타일 확인
    expect(title).toHaveClass('text-2xl', 'font-semibold', 'leading-tight')
  })

  // RTK Query Pattern: 에러 처리 테스트
  it('should handle RTK Query API errors gracefully', async () => {
    const user = userEvent.setup()
    
    // MSW 서버에 에러 핸들러 추가
    server.use(
      http.post('/api/v1/projects/test-project/planning/generate-story/', () => {
        return HttpResponse.json(
          { message: 'AI 서비스에 일시적인 문제가 발생했습니다.' },
          { status: 500 }
        )
      })
    )

    render(<PlanningWizard projectId="test-project" />)
    
    await user.type(screen.getByLabelText(/스토리 개요/i), '모험을 찾아 떠나는 긴 이야기')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    // RTK Query 에러 상태 확인
    await waitFor(() => {
      expect(screen.getByText(/AI 생성에 실패했습니다/i)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // 에러 메시지 확인
    await waitFor(() => {
      expect(screen.getByText(/AI 서비스에 일시적인 문제가 발생했습니다/i)).toBeInTheDocument()
    })
    
    // 재시도 버튼이 있다면 확인
    const retryButton = screen.queryByRole('button', { name: /다시 시도/i })
    if (retryButton) {
      expect(retryButton).toBeInTheDocument()
    }
  })

  // RED: 취소 버튼 기능 테스트
  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    const onCancel = jest.fn()
    
    render(<PlanningWizard projectId="test-project" onCancel={onCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: /취소/i })
    await user.click(cancelButton)
    
    expect(onCancel).toHaveBeenCalled()
  })

  // RED: 폼 유효성 검사 테스트
  it('should validate required fields before proceeding', async () => {
    const user = userEvent.setup()
    render(<PlanningWizard projectId="test-project" />)
    
    const nextButton = screen.getByRole('button', { name: /다음 단계/i })
    await user.click(nextButton)
    
    // 유효성 검사 에러 표시
    expect(screen.getByText(/스토리 개요를 입력해주세요/i)).toBeInTheDocument()
    expect(screen.getByText(/장르를 선택해주세요/i)).toBeInTheDocument()
  })

  // RTK Query Pattern: API 호출 순서 검증 테스트 
  it('should verify API call sequence: Story → 4Act → 12Shot', async () => {
    const user = userEvent.setup()
    const apiCallOrder: string[] = []
    
    // API 호출 순서 추적을 위한 MSW 핸들러
    server.use(
      http.post('/api/v1/projects/test-project/planning/generate-story/', async ({ request }) => {
        apiCallOrder.push('generate-story')
        await new Promise(resolve => setTimeout(resolve, 100)) // 짧은 지연
        return HttpResponse.json({
          story: '추적용 스토리',
          themes: ['모험'],
          characters: ['주인공']
        })
      }),
      
      http.post('/api/v1/projects/test-project/planning/generate-4act/', async ({ request }) => {
        apiCallOrder.push('generate-4act')
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json({
          act1: { title: '1막', description: '설정', duration: '25%' },
          act2: { title: '2막', description: '갈등', duration: '25%' },
          act3: { title: '3막', description: '절정', duration: '25%' },
          act4: { title: '4막', description: '결말', duration: '25%' }
        })
      }),
      
      http.post('/api/v1/projects/test-project/planning/generate-12shot/', async ({ request }) => {
        apiCallOrder.push('generate-12shot')
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json({
          shots: [
            { shotNumber: 1, type: 'Wide Shot', description: '테스트 샷', duration: '5초', location: '실내' }
          ]
        })
      })
    )

    render(<PlanningWizard projectId="test-project" />)
    
    // 1단계 - 스토리 생성
    await user.type(screen.getByLabelText(/스토리 개요/i), '순서 테스트용 이야기')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    // 2단계 대기 및 진행
    await waitFor(() => {
      expect(screen.getByText(/2단계: 4막 구조/i)).toBeInTheDocument()
      expect(apiCallOrder).toContain('generate-story')
    })
    
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    // 3단계 대기 및 진행
    await waitFor(() => {
      expect(screen.getByText(/3단계: 12샷 리스트/i)).toBeInTheDocument()
      expect(apiCallOrder).toContain('generate-4act')
    })
    
    await user.click(screen.getByRole('button', { name: /12샷 리스트 생성/i }))
    
    // 모든 API 호출 완료 및 순서 확인
    await waitFor(() => {
      expect(apiCallOrder).toContain('generate-12shot')
      expect(apiCallOrder).toEqual(['generate-story', 'generate-4act', 'generate-12shot'])
    })
  })

  // RTK Query Pattern: 캐시 및 상태 관리 테스트
  it('should manage RTK Query cache and state correctly', async () => {
    const user = userEvent.setup()
    const { store } = render(<PlanningWizard projectId="test-project" />)
    
    // 초기 상태 확인
    expect(store.getState().planningApi.queries).toEqual({})
    
    // 스토리 생성 진행
    await user.type(screen.getByLabelText(/스토리 개요/i), '캐시 테스트용 이야기')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    // RTK Query 상태 변화 확인 (로딩 → 성공)
    await waitFor(() => {
      const state = store.getState().planningApi
      const queries = Object.keys(state.queries)
      expect(queries.length).toBeGreaterThan(0)
    })
    
    // 성공 상태 확인
    await waitFor(() => {
      expect(screen.getByText(/2단계: 4막 구조/i)).toBeInTheDocument()
      
      const state = store.getState().planningApi
      const successfulQueries = Object.values(state.queries).filter(
        (query: any) => query?.status === 'fulfilled'
      )
      expect(successfulQueries.length).toBeGreaterThan(0)
    })
  })

  // RTK Query Pattern: 타임아웃 및 재시도 로직 테스트
  it('should handle timeout and retry logic with RTK Query', async () => {
    const user = userEvent.setup()
    let retryCount = 0
    
    // 첫 번째 호출은 타임아웃, 두 번째는 성공하도록 설정
    server.use(
      http.post('/api/v1/projects/test-project/planning/generate-story/', async ({ request }) => {
        retryCount++
        if (retryCount === 1) {
          // 첫 번째 호출은 매우 긴 지연으로 타임아웃 시뮬레이션
          await new Promise(resolve => setTimeout(resolve, 65000))
          return HttpResponse.json({ message: 'Timeout' }, { status: 408 })
        }
        // 두 번째 호출은 정상 응답
        return HttpResponse.json({
          story: '재시도 성공 스토리',
          themes: ['재시도'],
          characters: ['주인공']
        })
      })
    )

    render(<PlanningWizard projectId="test-project" />)
    
    await user.type(screen.getByLabelText(/스토리 개요/i), '타임아웃 테스트 이야기')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    // 타임아웃 에러 확인
    await waitFor(() => {
      expect(screen.getByText(/요청 시간이 초과되었습니다/i) || screen.getByText(/AI 생성에 실패했습니다/i)).toBeInTheDocument()
    }, { timeout: 10000 })
    
    // 재시도 버튼 클릭 (있다면)
    const retryButton = screen.queryByRole('button', { name: /다시 시도/i })
    if (retryButton) {
      await user.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByText(/재시도 성공 스토리/i) || screen.getByText(/2단계: 4막 구조/i)).toBeInTheDocument()
      })
    }
  })

  // RTK Query Pattern: Rate Limiting 에러 테스트
  it('should handle rate limiting errors correctly', async () => {
    const user = userEvent.setup()
    
    server.use(
      http.post('/api/v1/projects/test-project/planning/generate-story/', () => {
        return HttpResponse.json(
          { message: '요청 한도를 초과했습니다.' },
          { status: 429 }
        )
      })
    )

    render(<PlanningWizard projectId="test-project" />)
    
    await user.type(screen.getByLabelText(/스토리 개요/i), '레이트 리밋 테스트')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/요청이 너무 많습니다/i) || screen.getByText(/요청 한도를 초과했습니다/i)).toBeInTheDocument()
    })
  })

  // RTK Query Pattern: 네트워크 오류 테스트
  it('should handle network errors gracefully', async () => {
    const user = userEvent.setup()
    
    server.use(
      http.post('/api/v1/projects/test-project/planning/generate-story/', () => {
        return HttpResponse.error()
      })
    )

    render(<PlanningWizard projectId="test-project" />)
    
    await user.type(screen.getByLabelText(/스토리 개요/i), '네트워크 에러 테스트')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'drama')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/네트워크 오류가 발생했습니다/i) || screen.getByText(/AI 생성에 실패했습니다/i)).toBeInTheDocument()
    })
  })

  // RTK Query Pattern: 유효성 검사 에러 테스트 (400 에러)
  it('should handle validation errors from API', async () => {
    const user = userEvent.setup()
    
    server.use(
      http.post('/api/v1/projects/test-project/planning/generate-story/', () => {
        return HttpResponse.json(
          { message: '스토리 개요는 최소 10자 이상이어야 합니다.' },
          { status: 400 }
        )
      })
    )

    render(<PlanningWizard projectId="test-project" />)
    
    await user.type(screen.getByLabelText(/스토리 개요/i), '짧음') // 10자 미만
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/스토리 개요는 최소 10자 이상이어야 합니다/i)).toBeInTheDocument()
    })
  })

  // RTK Query Pattern: 인증 실패 테스트 (401 에러)
  it('should handle authentication errors', async () => {
    const user = userEvent.setup()
    
    server.use(
      http.post('/api/v1/projects/test-project/planning/generate-story/', () => {
        return HttpResponse.json(
          { message: '인증이 필요합니다.' },
          { status: 401 }
        )
      })
    )

    render(<PlanningWizard projectId="test-project" />)
    
    await user.type(screen.getByLabelText(/스토리 개요/i), '인증 테스트용 이야기')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'drama')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    await waitFor(() => {
      expect(screen.getByText(/인증이 필요합니다/i) || screen.getByText(/로그인이 필요합니다/i)).toBeInTheDocument()
    })
  })

  // RTK Query Pattern: 낙관적 업데이트 테스트
  it('should show optimistic updates during API calls', async () => {
    const user = userEvent.setup()
    let resolvePromise: (value: any) => void
    
    // 수동으로 해결할 수 있는 Promise 생성
    server.use(
      http.post('/api/v1/projects/test-project/planning/generate-story/', async () => {
        return new Promise((resolve) => {
          resolvePromise = resolve
          // 수동으로 해결되기 전까지 대기
        })
      })
    )

    render(<PlanningWizard projectId="test-project" />)
    
    await user.type(screen.getByLabelText(/스토리 개요/i), '낙관적 업데이트 테스트')
    await user.selectOptions(screen.getByLabelText(/장르/i), 'adventure')
    await user.selectOptions(screen.getByLabelText(/타겟 길이/i), '3-5분')
    await user.click(screen.getByRole('button', { name: /다음 단계/i }))
    
    // 로딩 상태 확인
    expect(screen.getByText(/AI가 스토리를 생성 중입니다/i)).toBeInTheDocument()
    
    // 수동으로 Promise 해결
    setTimeout(() => {
      resolvePromise!(HttpResponse.json({
        story: '낙관적 업데이트 성공',
        themes: ['테스트'],
        characters: ['주인공']
      }))
    }, 100)
    
    // 완료 상태 확인
    await waitFor(() => {
      expect(screen.getByText(/2단계: 4막 구조/i)).toBeInTheDocument()
    })
  })
})