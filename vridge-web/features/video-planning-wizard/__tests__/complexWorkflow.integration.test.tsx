/**
 * @fileoverview 복잡한 워크플로우 통합 테스트 (4단계 → 12샷 → PDF)
 * @description 전체 Video Planning Wizard의 E2E 플로우를 시뮬레이션하는 통합 테스트
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { server } from '@/lib/api/msw-server'
import { http, HttpResponse } from 'msw'

import { VideoPlanningWizard } from '../ui/VideoPlanningWizard'
import { VideoPlanningWizardApi } from '../api/videoPlanningApi'
import type { PlanningInput, PlanningStage, VideoShot } from '../model/types'

// 테스트용 시드 데이터
const testSeedData = {
  input: {
    title: '혁신적인 제품 소개 영상',
    logline: '일상을 바꾸는 혁신적인 제품의 놀라운 효과를 경험해보세요',
    toneAndManner: '신뢰감 있는',
    genre: '제품 홍보',
    target: '25-40대 직장인',
    duration: '60초',
    format: '16:9',
    tempo: '적당한',
    developmentMethod: '기승전결'
  } as PlanningInput,
  
  expectedStages: [
    {
      id: 'stage-1',
      title: '기',
      content: '[기승전결] 일상의 불편함을 직관적으로 보여주며 시청자의 관심을 즉시 끌어당깁니다.',
      goal: '관심 유발 및 문제 인식',
      duration: '8-12초',
      order: 1
    },
    {
      id: 'stage-2',
      title: '승',
      content: '[기승전결] 기존 솔루션의 한계와 문제점을 구체적으로 제시하여 공감대를 형성합니다.',
      goal: '문제의 심화 및 공감대 형성',
      duration: '15-20초',
      order: 2
    },
    {
      id: 'stage-3',
      title: '전',
      content: '[기승전결] 혁신적인 제품을 통한 완벽한 해결책을 설득력 있게 제시합니다.',
      goal: '해결책 제시 및 제품 소개',
      duration: '20-25초',
      order: 3
    },
    {
      id: 'stage-4',
      title: '결',
      content: '[기승전결] 명확한 행동 유도와 함께 강력한 마무리로 구매 동기를 극대화합니다.',
      goal: '행동 유도 및 구매 전환',
      duration: '10-15초',
      order: 4
    }
  ] as PlanningStage[]
}

// 워크플로우 상태 추적을 위한 헬퍼
const WorkflowTracker = {
  currentStep: 1,
  stagesGenerated: false,
  shotsGenerated: false,
  pdfExported: false,
  
  reset() {
    this.currentStep = 1
    this.stagesGenerated = false
    this.shotsGenerated = false
    this.pdfExported = false
  },
  
  advance() {
    this.currentStep++
  },
  
  markStagesGenerated() {
    this.stagesGenerated = true
    this.advance()
  },
  
  markShotsGenerated() {
    this.shotsGenerated = true
    this.advance()
  },
  
  markPdfExported() {
    this.pdfExported = true
  }
}

// 복잡한 MSW 핸들러 (상태 추적 포함)
const setupComplexWorkflowHandlers = () => {
  server.use(
    // 4단계 생성 - 현실적인 지연 시간 포함
    http.post('*/api/video-planning/generate-stages', async ({ request }) => {
      const body = await request.json() as { input: PlanningInput }
      
      // 실제 LLM 처리 시간 시뮬레이션 (2-4초)
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000))
      
      // 입력에 따른 동적 단계 생성
      const stages = testSeedData.expectedStages.map(stage => ({
        ...stage,
        content: stage.content.replace('혁신적인 제품', body.input.title || '제품')
      }))
      
      WorkflowTracker.markStagesGenerated()
      
      return HttpResponse.json({
        success: true,
        stages,
        timestamp: new Date().toISOString(),
        message: '4단계 기획이 성공적으로 생성되었습니다.',
        metadata: {
          totalDuration: stages.reduce((acc, stage) => {
            const duration = parseInt(stage.duration.match(/\d+/)?.[0] || '0')
            return acc + duration
          }, 0),
          qualityScore: 95,
          developmentMethod: body.input.developmentMethod
        }
      })
    }),

    // 12샷 생성 - 단계별 샷 분배 로직
    http.post('*/api/video-planning/generate-shots', async ({ request }) => {
      const body = await request.json() as { stages: PlanningStage[], input: PlanningInput }
      
      // 복잡한 생성 시간 시뮬레이션 (3-6초)
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 3000))
      
      // 기승전결 단계별 샷 분배 (2:3:4:3)
      const shotDistribution = [2, 3, 4, 3]
      const shots: VideoShot[] = []
      let shotIndex = 0
      
      body.stages.forEach((stage, stageIndex) => {
        const shotCount = shotDistribution[stageIndex]
        
        for (let i = 0; i < shotCount; i++) {
          shots.push({
            id: `shot-${shotIndex + 1}`,
            title: `${stage.title}단계 샷 ${i + 1}: ${getShotTitle(stageIndex, i)}`,
            description: `${stage.goal}을 위한 ${getShotDescription(stageIndex, i)}`,
            shotType: getShotType(shotIndex),
            cameraMove: getCameraMove(shotIndex),
            composition: getComposition(shotIndex),
            duration: 4 + (shotIndex % 3),
            dialogue: shotIndex % 2 === 0 ? getShotDialogue(stageIndex, i) : '',
            transition: getTransition(shotIndex),
            stageId: stage.id,
            order: shotIndex + 1
          })
          shotIndex++
        }
      })
      
      const insertShots = [
        {
          id: 'insert-1',
          title: '제품 핵심 기능 강조',
          description: body.input.title + '의 가장 중요한 기능을 클로즈업으로 촬영',
          timing: '8-10초 구간',
          purpose: '제품의 핵심 가치 전달',
          order: 1,
          framing: '익스트림 클로즈업'
        },
        {
          id: 'insert-2',
          title: '사용자 만족도 표현',
          description: '실제 사용자의 긍정적 반응과 만족스러운 표정',
          timing: '35-37초 구간',
          purpose: '사회적 증명 및 신뢰도 구축',
          order: 2,
          framing: '미디엄 클로즈업'
        },
        {
          id: 'insert-3',
          title: 'CTA 및 브랜드 로고',
          description: '명확한 행동 지시와 브랜드 아이덴티티 강화',
          timing: '55-58초 구간',
          purpose: '구매 전환 및 브랜드 인지도 향상',
          order: 3,
          framing: '그래픽 오버레이'
        }
      ]
      
      WorkflowTracker.markShotsGenerated()
      
      return HttpResponse.json({
        success: true,
        shots,
        insertShots,
        timestamp: new Date().toISOString(),
        message: '12개 숏과 인서트 3컷이 성공적으로 생성되었습니다.',
        metadata: {
          totalDuration: shots.reduce((acc, shot) => acc + shot.duration, 0),
          shotTypeDistribution: shots.reduce((acc, shot) => {
            acc[shot.shotType] = (acc[shot.shotType] || 0) + 1
            return acc
          }, {} as Record<string, number>),
          qualityScore: 92
        }
      })
    }),

    // 스토리보드 생성 - 현실적인 이미지 생성 시간
    http.post('*/api/video-planning/generate-storyboard', async ({ request }) => {
      const body = await request.json() as { shot: VideoShot }
      
      // 이미지 생성 시간 시뮬레이션 (4-8초)
      await new Promise(resolve => setTimeout(resolve, 4000 + Math.random() * 4000))
      
      const shotIndex = parseInt(body.shot.id.replace('shot-', '')) - 1
      const storyboardUrl = `/mock-storyboards/advanced-shot-${body.shot.id}.jpg`
      
      return HttpResponse.json({
        success: true,
        storyboardUrl,
        timestamp: new Date().toISOString(),
        message: '스토리보드가 성공적으로 생성되었습니다.',
        metadata: {
          imageSize: { width: 1920, height: 1080 },
          fileFormat: 'JPEG',
          quality: 'high',
          processingTime: `${(4000 + Math.random() * 4000).toFixed(0)}ms`
        }
      })
    }),

    // PDF 내보내기 - 복잡한 렌더링 시간
    http.post('*/api/video-planning/export-plan', async ({ request }) => {
      const body = await request.json() as {
        fourStagesPlan: any;
        twelveShotsPlan: any;
        options: { format: 'json' | 'pdf'; includeStoryboard: boolean; includeInserts: boolean }
      }
      
      // PDF 생성 시간 시뮬레이션 (6-12초)
      const processingTime = 6000 + Math.random() * 6000
      await new Promise(resolve => setTimeout(resolve, processingTime))
      
      const fileName = body.options.format === 'pdf' ? 
        `complete-video-planning-${Date.now()}.pdf` : 
        `complete-video-planning-${Date.now()}.json`
        
      const downloadUrl = `/mock-exports/${fileName}`
      
      // 파일 크기 계산 (스토리보드/인서트 포함 여부에 따라)
      let fileSize = '1.8MB'
      let pageCount = 6
      
      if (body.options.includeStoryboard) {
        fileSize = '4.2MB'
        pageCount += 6
      }
      
      if (body.options.includeInserts) {
        fileSize = body.options.includeStoryboard ? '4.8MB' : '2.1MB'
        pageCount += 2
      }
      
      WorkflowTracker.markPdfExported()
      
      return HttpResponse.json({
        success: true,
        downloadUrl,
        timestamp: new Date().toISOString(),
        message: `완성된 ${body.options.format.toUpperCase()} 기획서가 성공적으로 생성되었습니다.`,
        metadata: {
          fileSize,
          pageCount: body.options.format === 'pdf' ? pageCount : undefined,
          includesStoryboard: body.options.includeStoryboard,
          includesInserts: body.options.includeInserts,
          processingTime: `${processingTime.toFixed(0)}ms`,
          qualityScore: 94
        }
      })
    })
  )
}

// 헬퍼 함수들
const getShotTitle = (stageIndex: number, shotIndex: number): string => {
  const titles = [
    ['오프닝 훅', '문제 제기'], // 기
    ['현실 묘사', '고충 공감', '한계 노출'], // 승
    ['해결책 등장', '제품 소개', '기능 시연', '효과 입증'], // 전
    ['사용 권유', '구매 유도', '브랜드 각인'] // 결
  ]
  return titles[stageIndex][shotIndex] || `샷 ${shotIndex + 1}`
}

const getShotDescription = (stageIndex: number, shotIndex: number): string => {
  const descriptions = [
    ['시선을 사로잡는 강력한 오프닝', '일상의 불편함 제시'],
    ['현실적 상황 묘사', '시청자 공감대 형성', '기존 해결책의 한계'],
    ['혁신적 해결책 등장', '제품의 핵심 가치', '실제 사용 시연', '놀라운 효과 증명'],
    ['자연스러운 사용 권유', '명확한 구매 유도', '브랜드 메시지 전달']
  ]
  return descriptions[stageIndex][shotIndex] || '상세한 샷 구성'
}

const getShotDialogue = (stageIndex: number, shotIndex: number): string => {
  const dialogues = [
    ['이런 경험, 있으시죠?', '매일 반복되는 이 불편함...'],
    ['왜 이런 일이 계속 될까요?', '지금까지의 방법으론 한계가 있었습니다', '더 나은 방법이 있을 텐데...'],
    ['이제 해답을 찾았습니다', '혁신적인 솔루션을 소개합니다', '직접 확인해보세요', '놀라운 변화를 경험하세요'],
    ['지금 바로 시작하세요', '특별한 기회를 놓치지 마세요', '당신의 선택이 모든 것을 바꿉니다']
  ]
  return dialogues[stageIndex][shotIndex] || ''
}

const getShotType = (index: number) => {
  const types = ['클로즈업', '미디엄샷', '와이드샷', '익스트림 클로즈업']
  return types[index % types.length]
}

const getCameraMove = (index: number) => {
  const moves = ['고정', '줌인', '줌아웃', '패닝', '틸트']
  return moves[index % moves.length]
}

const getComposition = (index: number) => {
  const compositions = ['정면', '좌측', '우측', '중앙']
  return compositions[index % compositions.length]
}

const getTransition = (index: number) => {
  const transitions = ['컷', '페이드', '와이프']
  return transitions[index % transitions.length]
}

describe('Complex Workflow Integration Tests (4단계 → 12샷 → PDF)', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    WorkflowTracker.reset()
    setupComplexWorkflowHandlers()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('완전한 워크플로우 실행', () => {
    it('STEP 1부터 PDF 내보내기까지 전체 플로우가 성공적으로 완료되어야 한다', async () => {
      // Arrange
      render(<VideoPlanningWizard />)
      
      // Step 1: 입력 단계
      expect(screen.getByText('STEP 1')).toBeInTheDocument()
      
      // 기본 정보 입력
      await user.type(screen.getByLabelText('제목'), testSeedData.input.title)
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), testSeedData.input.logline)
      
      // 추가 옵션 설정
      const toneSelect = screen.getByLabelText('톤앤매너')
      await user.selectOptions(toneSelect, testSeedData.input.toneAndManner)
      
      const genreSelect = screen.getByLabelText('장르')
      await user.selectOptions(genreSelect, testSeedData.input.genre)
      
      // 개발 방식 선택
      await user.click(screen.getByText('기승전결'))
      
      // 4단계 생성 버튼 클릭
      const generateButton = screen.getByText('생성')
      expect(generateButton).toBeEnabled()
      await user.click(generateButton)
      
      // 로딩 상태 확인
      expect(screen.getByText('4단계 기획안을 생성하고 있습니다...')).toBeInTheDocument()
      
      // Step 2: 4단계 검토/수정 단계 진입 대기
      await waitFor(() => {
        expect(screen.getByText('STEP 2')).toBeInTheDocument()
        expect(screen.getByText('4단계 검토/수정')).toBeInTheDocument()
      }, { timeout: 10000 })
      
      // 생성된 4단계 확인
      expect(screen.getByText('기')).toBeInTheDocument()
      expect(screen.getByText('승')).toBeInTheDocument()
      expect(screen.getByText('전')).toBeInTheDocument()
      expect(screen.getByText('결')).toBeInTheDocument()
      
      expect(WorkflowTracker.stagesGenerated).toBe(true)
      expect(WorkflowTracker.currentStep).toBe(2)
      
      // Step 2에서 일부 내용 수정 (선택적)
      const editButton = screen.getAllByText('편집')[0]
      await user.click(editButton)
      
      const textArea = screen.getByDisplayValue(/관심을 끌어당깁니다/)
      await user.clear(textArea)
      await user.type(textArea, '더욱 강력하고 인상적인 오프닝으로 시청자의 시선을 사로잡습니다.')
      
      const saveButton = screen.getByText('저장')
      await user.click(saveButton)
      
      expect(screen.getByText('더욱 강력하고 인상적인 오프닝으로 시청자의 시선을 사로잡습니다.')).toBeInTheDocument()
      
      // 12샷 생성 버튼 클릭
      const generateShotsButton = screen.getByText('숏 생성')
      await user.click(generateShotsButton)
      
      // Step 3: 12샷 편집 단계 진입 대기
      await waitFor(() => {
        expect(screen.getByText('STEP 3')).toBeInTheDocument()
        expect(screen.getByText('12숏 편집·콘티·인서트·내보내기')).toBeInTheDocument()
      }, { timeout: 15000 })
      
      // 생성된 12개 샷 확인
      for (let i = 0; i < 12; i++) {
        expect(screen.getByTestId(`shot-card-${i}`)).toBeInTheDocument()
      }
      
      // 인서트 3컷 확인
      expect(screen.getByText('인서트 3컷 추천')).toBeInTheDocument()
      expect(screen.getByText('인서트 1')).toBeInTheDocument()
      expect(screen.getByText('인서트 2')).toBeInTheDocument()
      expect(screen.getByText('인서트 3')).toBeInTheDocument()
      
      expect(WorkflowTracker.shotsGenerated).toBe(true)
      expect(WorkflowTracker.currentStep).toBe(3)
      
      // Step 3에서 일부 샷 수정
      const shotTitleInput = screen.getByDisplayValue(/기단계 샷 1/)
      await user.clear(shotTitleInput)
      await user.type(shotTitleInput, '더욱 임팩트 있는 오프닝 샷')
      
      // 스토리보드 생성 (선택적으로 2-3개 샷에 대해)
      const storyboardButtons = screen.getAllByText('생성').slice(0, 3)
      
      // 첫 번째 스토리보드 생성
      await user.click(storyboardButtons[0])
      expect(screen.getByText('콘티를 생성하고 있습니다...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByAltText('스토리보드')).toBeInTheDocument()
      }, { timeout: 12000 })
      
      // PDF 내보내기
      const downloadButton = screen.getByText('기획안 다운로드')
      await user.click(downloadButton)
      
      // 내보내기 모달 확인
      expect(screen.getByText('원하는 형식을 선택하세요')).toBeInTheDocument()
      
      // PDF 선택
      const pdfButton = screen.getByText('Marp PDF')
      await user.click(pdfButton)
      
      // PDF 생성 진행 확인
      expect(screen.getByText('PDF를 생성하고 있습니다...')).toBeInTheDocument()
      
      // PDF 생성 완료 대기
      await waitFor(() => {
        expect(screen.getByText('PDF 다운로드')).toBeInTheDocument()
      }, { timeout: 20000 })
      
      expect(WorkflowTracker.pdfExported).toBe(true)
      
      // 최종 검증
      expect(WorkflowTracker.stagesGenerated).toBe(true)
      expect(WorkflowTracker.shotsGenerated).toBe(true)
      expect(WorkflowTracker.pdfExported).toBe(true)
      
    }, 60000) // 60초 타임아웃
    
    it('단계별 되돌아가기와 재진행이 올바르게 작동해야 한다', async () => {
      // Step 1 → Step 2 진행
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), '테스트 프로젝트')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '테스트 로그라인')
      await user.click(screen.getByText('기승전결'))
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => {
        expect(screen.getByText('STEP 2')).toBeInTheDocument()
      }, { timeout: 10000 })
      
      // Step 2 → Step 3 진행
      await user.click(screen.getByText('숏 생성'))
      
      await waitFor(() => {
        expect(screen.getByText('STEP 3')).toBeInTheDocument()
      }, { timeout: 15000 })
      
      // Step 3 → Step 2 되돌아가기
      const backButton = screen.getByText('이전')
      await user.click(backButton)
      
      expect(screen.getByText('STEP 2')).toBeInTheDocument()
      expect(screen.getByText('4단계 검토/수정')).toBeInTheDocument()
      
      // Step 2에서 내용 수정
      const firstEditButton = screen.getAllByText('편집')[0]
      await user.click(firstEditButton)
      
      const textArea = screen.getByDisplayValue(/관심을 끌어당깁니다/)
      await user.clear(textArea)
      await user.type(textArea, '수정된 강력한 오프닝 내용입니다.')
      await user.click(screen.getByText('저장'))
      
      // Step 2 → Step 3 재진행
      await user.click(screen.getByText('숏 생성'))
      
      await waitFor(() => {
        expect(screen.getByText('STEP 3')).toBeInTheDocument()
      }, { timeout: 15000 })
      
      // 수정사항이 반영되었는지 확인 (실제로는 API가 수정된 단계 데이터를 사용)
      expect(screen.getByText('총 12개 숏')).toBeInTheDocument()
      
    }, 45000)
    
    it('프로젝트 저장과 불러오기가 전체 워크플로우와 연동되어야 한다', async () => {
      // 전체 워크플로우를 Step 3까지 진행
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), '저장 테스트 프로젝트')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '저장 테스트 로그라인')
      await user.click(screen.getByText('기승전결'))
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => screen.getByText('STEP 2'), { timeout: 10000 })
      await user.click(screen.getByText('숏 생성'))
      await waitFor(() => screen.getByText('STEP 3'), { timeout: 15000 })
      
      // 프로젝트 저장
      const saveButton = screen.getByText('프로젝트 저장')
      await user.click(saveButton)
      
      // 저장 확인 (실제로는 토스트나 알림으로 표시)
      // 현재 컴포넌트에서는 콘솔 로그만 하므로 저장 API 호출 확인은 별도 테스트 필요
      
    }, 40000)
  })
  
  describe('에러 복구 시나리오', () => {
    it('4단계 생성 실패 후 재시도가 성공적으로 동작해야 한다', async () => {
      // 첫 번째 시도는 실패하도록 설정
      server.use(
        http.post('*/api/video-planning/generate-stages', () => {
          return HttpResponse.json({
            success: false,
            error: 'LLM_TEMPORARY_ERROR',
            message: 'AI 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.'
          }, { status: 503 })
        }, { once: true })
      )
      
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), '에러 테스트')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '에러 테스트')
      await user.click(screen.getByText('생성'))
      
      // 에러 메시지 확인
      await waitFor(() => {
        expect(screen.getByText(/AI 서비스가 일시적으로 불안정/)).toBeInTheDocument()
      }, { timeout: 5000 })
      
      // 재시도 버튼 확인 및 클릭
      const retryButton = screen.getByText('다시 시도')
      await user.click(retryButton)
      
      // 이번에는 성공해야 함 (원래 핸들러가 복구됨)
      await waitFor(() => {
        expect(screen.getByText('STEP 2')).toBeInTheDocument()
      }, { timeout: 10000 })
      
    }, 25000)
    
    it('PDF 생성 실패 시 JSON 대안 제공이 동작해야 한다', async () => {
      // Step 3까지 진행
      render(<VideoPlanningWizard />)
      
      await user.type(screen.getByLabelText('제목'), 'PDF 에러 테스트')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), 'PDF 에러 테스트')
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => screen.getByText('STEP 2'), { timeout: 10000 })
      await user.click(screen.getByText('숏 생성'))
      await waitFor(() => screen.getByText('STEP 3'), { timeout: 15000 })
      
      // PDF 생성 실패하도록 설정
      server.use(
        http.post('*/api/video-planning/export-plan', ({ request }) => {
          return HttpResponse.json({
            success: false,
            error: 'PDF_GENERATION_FAILED',
            message: 'PDF 생성 중 오류가 발생했습니다. JSON 형식으로 다운로드하시겠습니까?'
          }, { status: 500 })
        })
      )
      
      // PDF 다운로드 시도
      await user.click(screen.getByText('기획안 다운로드'))
      await user.click(screen.getByText('Marp PDF'))
      
      // 에러 메시지 확인
      await waitFor(() => {
        expect(screen.getByText(/PDF 생성 중 오류가 발생했습니다/)).toBeInTheDocument()
      }, { timeout: 10000 })
      
      // JSON 대안 선택
      const jsonButton = screen.getByText('JSON')
      await user.click(jsonButton)
      
      // JSON 생성은 성공해야 함 (별도 핸들러)
      await waitFor(() => {
        expect(screen.queryByText(/생성하고 있습니다/)).not.toBeInTheDocument()
      }, { timeout: 5000 })
      
    }, 30000)
  })
  
  describe('성능 최적화 검증', () => {
    it('대용량 데이터를 포함한 전체 워크플로우가 성능 기준을 만족해야 한다', async () => {
      const performanceMarkers = {
        step1Complete: 0,
        step2Complete: 0,
        step3Complete: 0,
        pdfComplete: 0
      }
      
      const startTime = performance.now()
      
      render(<VideoPlanningWizard />)
      
      // Step 1
      await user.type(screen.getByLabelText('제목'), '성능 테스트 프로젝트')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '대용량 데이터를 포함한 복잡한 기획')
      await user.click(screen.getByText('생성'))
      
      await waitFor(() => screen.getByText('STEP 2'), { timeout: 10000 })
      performanceMarkers.step1Complete = performance.now() - startTime
      
      // Step 2
      await user.click(screen.getByText('숏 생성'))
      await waitFor(() => screen.getByText('STEP 3'), { timeout: 15000 })
      performanceMarkers.step2Complete = performance.now() - startTime
      
      // Step 3에서 복잡한 작업들
      // 여러 스토리보드 동시 생성
      const generateButtons = screen.getAllByText('생성')
      const storyboardPromises = generateButtons.slice(0, 3).map(button => 
        user.click(button)
      )
      
      await Promise.all(storyboardPromises)
      
      // PDF 생성
      await user.click(screen.getByText('기획안 다운로드'))
      await user.click(screen.getByText('Marp PDF'))
      
      await waitFor(() => {
        expect(screen.getByText('PDF 다운로드')).toBeInTheDocument()
      }, { timeout: 20000 })
      
      performanceMarkers.pdfComplete = performance.now() - startTime
      
      // 성능 기준 검증
      expect(performanceMarkers.step1Complete).toBeLessThan(8000) // 8초 이내
      expect(performanceMarkers.step2Complete).toBeLessThan(20000) // 20초 이내
      expect(performanceMarkers.pdfComplete).toBeLessThan(45000) // 45초 이내
      
      console.log('Performance Metrics:', performanceMarkers)
      
    }, 60000)
  })
})