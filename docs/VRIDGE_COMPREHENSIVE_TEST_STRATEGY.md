# VRidge 비디오 협업 플랫폼 종합 테스트 전략

## Grace (QA Lead) 수립 - 2025.08.26

---

## 🎯 Executive Summary

### 프로젝트 현황 분석
VRidge는 **5개 핵심 모듈**로 구성된 비디오 협업 플랫폼으로, 각 모듈별 고유한 기술적 복잡성과 비즈니스 크리티컬한 요구사항을 가지고 있습니다.

**핵심 기술 스택**:
- **Frontend**: Next.js 15.5 + React 19 + FSD Architecture
- **Backend**: Django 4.2 + PostgreSQL + Redis
- **Testing**: Vitest 3 + RTL + MSW 2.0 + Playwright

**품질 목표**:
- 전체 테스트 커버리지: **70%+**
- 크리티컬 패스 커버리지: **90%+**
- 뮤테이션 테스트 스코어: **75%+**
- 플래키 테스트 비율: **< 1%**

---

## 📊 Part 1: 5개 핵심 모듈별 테스트 전략

### 1.1 대시보드 모듈 (Dashboard)

#### 비즈니스 크리티컬 요구사항
- 새 피드 요약 집계 정확성 (코멘트/대댓글/감정표현 변화)
- 읽지 않음 배지 실시간 상태 관리 (최대 9+ 표시)
- 초대 관리 요약 현황 정합성

#### 테스트 매트릭스
```typescript
interface DashboardTestMatrix {
  unitTests: {
    coverage: "85%",
    focus: [
      "피드 집계 로직",
      "배지 카운터 계산",
      "초대 상태 분류"
    ],
    priority: "P0-Critical"
  },
  
  integrationTests: {
    coverage: "75%",
    focus: [
      "API 데이터 동기화",
      "실시간 상태 업데이트",
      "필터링 및 검색"
    ],
    mockStrategy: "MSW로 API 응답 모킹"
  },
  
  e2eTests: {
    criticalPaths: [
      "대시보드 초기 로딩 → 읽지 않음 배지 확인",
      "새 코멘트 알림 → 상세 페이지 이동",
      "모두 읽음 처리 → 배지 상태 초기화"
    ]
  }
}
```

#### 특수 테스트 시나리오
```typescript
describe('대시보드 실시간 업데이트', () => {
  it('새 코멘트 도착 시 배지 카운터 자동 증가', async () => {
    // Given: 현재 읽지 않음 배지가 3개
    const initialBadgeCount = 3
    render(<Dashboard />)
    
    // When: 새 코멘트 WebSocket 이벤트 수신
    await act(() => {
      mockWebSocket.emit('new_comment', {
        projectId: 'proj-1',
        commentId: 'comment-new'
      })
    })
    
    // Then: 배지 카운터가 4로 증가
    expect(screen.getByTestId('unread-badge')).toHaveTextContent('4')
  })
})
```

### 1.2 전체일정 모듈 (Calendar)

#### 비즈니스 크리티컬 요구사항
- 촬영 일정 충돌 감지 정확성 (기획/편집 충돌은 경고 없음)
- 드래그&드롭 일정 조정 권한별 제어
- 프로젝트별 색상 범례 고정 및 충돌만 보기 필터링

#### 테스트 매트릭스
```typescript
interface CalendarTestMatrix {
  unitTests: {
    coverage: "90%",
    focus: [
      "충돌 감지 알고리즘",
      "드래그&드롭 유효성 검증",
      "권한 기반 액션 제어"
    ],
    testCases: [
      "촬영 일정 중복 → 경고 표시",
      "기획/편집 중복 → 경고 없음",
      "Viewer 권한 → 드래그 불가"
    ]
  },
  
  integrationTests: {
    coverage: "80%",
    focus: [
      "캘린더 UI 상호작용",
      "간트 차트 동기화",
      "필터링 상태 관리"
    ]
  }
}
```

#### 복잡 비즈니스 로직 테스트
```typescript
describe('촬영 충돌 감지 엔진', () => {
  const conflictDetector = new ConflictDetector()
  
  it.each([
    // [일정A, 일정B, 충돌여부, 설명]
    [
      { type: 'shooting', start: '2025-09-01 09:00', end: '2025-09-01 18:00' },
      { type: 'shooting', start: '2025-09-01 14:00', end: '2025-09-01 20:00' },
      true,
      '촬영 일정 겹침 → 충돌'
    ],
    [
      { type: 'planning', start: '2025-09-01 09:00', end: '2025-09-01 18:00' },
      { type: 'editing', start: '2025-09-01 14:00', end: '2025-09-01 20:00' },
      false,
      '기획-편집 겹침 → 충돌 아님'
    ]
  ])('충돌 감지: %s', (scheduleA, scheduleB, expectedConflict, description) => {
    const result = conflictDetector.detect(scheduleA, scheduleB)
    expect(result.hasConflict).toBe(expectedConflict)
  })
})
```

### 1.3 프로젝트 관리 모듈 (Project Management)

#### 비즈니스 크리티컬 요구사항
- RBAC (Owner/Admin/Editor/Reviewer/Viewer) 권한 체계 정확성
- SendGrid 이메일 전송 및 재전송 쿨다운 (60초) 제어
- 자동 일정 디폴트 (기획 1주, 촬영 1일, 편집 2주) 생성

#### 테스트 매트릭스
```typescript
interface ProjectManagementTestMatrix {
  unitTests: {
    coverage: "88%",
    focus: [
      "RBAC 권한 매트릭스 검증",
      "이메일 쿨다운 로직",
      "자동 일정 생성 알고리즘"
    ]
  },
  
  contractTests: {
    coverage: "100%",
    focus: [
      "SendGrid API 계약 검증",
      "이메일 템플릿 렌더링",
      "권한 변경 이벤트 처리"
    ]
  }
}
```

#### RBAC 권한 매트릭스 테스트
```typescript
describe('RBAC 권한 시스템', () => {
  const permissionMatrix = [
    ['Owner',    ['create', 'read', 'update', 'delete', 'invite', 'transfer']],
    ['Admin',    ['create', 'read', 'update', 'delete', 'invite']],
    ['Editor',   ['create', 'read', 'update']],
    ['Reviewer', ['read', 'comment']],
    ['Viewer',   ['read']]
  ] as const

  test.each(permissionMatrix)(
    '%s 권한은 %j 액션만 허용',
    (role, allowedActions) => {
      const user = createUserWithRole(role)
      const project = createProject()

      allowedActions.forEach(action => {
        expect(hasPermission(user, project, action)).toBe(true)
      })

      const forbiddenActions = ALL_ACTIONS.filter(
        action => !allowedActions.includes(action)
      )
      
      forbiddenActions.forEach(action => {
        expect(hasPermission(user, project, action)).toBe(false)
      })
    }
  )
})
```

### 1.4 영상 기획 모듈 (Video Planning)

#### 비즈니스 크리티컬 요구사항
- Google Gemini LLM API 통합 (한 줄 스토리 → 4단계 → 12숏)
- PDF 생성 파이프라인 (JSON → Marp → A4 가로/여백 0)
- 콘티 이미지 생성 (Google 이미지 생성 API)

#### 테스트 매트릭스
```typescript
interface VideoPlanningTestMatrix {
  unitTests: {
    coverage: "75%",
    focus: [
      "LLM 프롬프트 생성 로직",
      "JSON→Marp 변환 파이프라인", 
      "12숏 분해 알고리즘"
    ]
  },
  
  integrationTests: {
    coverage: "85%",
    focus: [
      "LLM API 응답 처리",
      "PDF 생성 전체 플로우",
      "이미지 생성 API 통합"
    ],
    mockStrategy: "외부 API는 MSW로 완전 모킹"
  },
  
  contractTests: {
    coverage: "100%",
    apiContracts: [
      "Google Gemini API 스키마",
      "이미지 생성 API 응답",
      "Marp PDF 출력 검증"
    ]
  }
}
```

#### LLM 오케스트레이션 테스트
```typescript
describe('LLM 오케스트레이션 파이프라인', () => {
  const llmOrchestrator = new LLMOrchestrator()
  
  it('한 줄 스토리를 4단계로 정확히 분해', async () => {
    // Given: 입력 데이터
    const input = {
      logline: "평범한 회사원이 갑자기 슈퍼파워를 얻게 된다",
      tone: "잔잔",
      genre: "드라마",
      tempo: "보통"
    }
    
    // When: LLM 처리
    const result = await llmOrchestrator.generateFourStages(input)
    
    // Then: 4단계 구조 검증
    expect(result).toHaveProperty('stages')
    expect(result.stages).toHaveLength(4)
    expect(result.stages[0]).toHaveProperty('title', '기')
    expect(result.stages[3]).toHaveProperty('title', '결')
    
    // 각 단계별 필수 필드 검증
    result.stages.forEach(stage => {
      expect(stage).toHaveProperty('summary')
      expect(stage).toHaveProperty('content')
      expect(stage).toHaveProperty('duration')
    })
  })
  
  it('12숏 분해 시 정확히 12개 생성', async () => {
    // Given: 4단계 데이터
    const fourStages = createMockFourStages()
    
    // When: 12숏 분해
    const shots = await llmOrchestrator.generateTwelveShots(fourStages)
    
    // Then: 정확히 12개 숏 생성
    expect(shots).toHaveLength(12)
    
    // 각 단계별 3숏씩 균등 분배 검증
    const shotsByStage = groupBy(shots, 'stageIndex')
    expect(Object.keys(shotsByStage)).toHaveLength(4)
    Object.values(shotsByStage).forEach(stageShots => {
      expect(stageShots).toHaveLength(3)
    })
  })
})
```

#### PDF 생성 파이프라인 테스트
```typescript
describe('PDF 생성 파이프라인', () => {
  const pdfGenerator = new MarpPDFGenerator()
  
  it('JSON → Marp → PDF 전체 플로우 검증', async () => {
    // Given: 12숏 JSON 데이터
    const planData = create12ShotPlanData()
    
    // When: PDF 생성
    const pdfBuffer = await pdfGenerator.generate(planData, {
      format: 'A4',
      orientation: 'landscape',
      margin: '0'
    })
    
    // Then: PDF 메타데이터 검증
    const pdfInfo = await parsePDFInfo(pdfBuffer)
    expect(pdfInfo.pageCount).toBe(15) // 표지 + 4단계 + 12숏 페이지
    expect(pdfInfo.pageSize).toBe('A4')
    expect(pdfInfo.orientation).toBe('landscape')
    
    // 푸터 페이지 번호 패턴 검증
    const footerText = await extractPDFFooter(pdfBuffer, 1)
    expect(footerText).toMatch(/VLANET • .+ • 1\/15/)
  })
})
```

### 1.5 영상 피드백 모듈 (Video Feedback)

#### 비즈니스 크리티컬 요구사항
- 비디오 플레이어 상태 동기화 (재생/일시정지/시크)
- 타임코드 기반 코멘트 시스템 ([mm:ss.mmm] 자동 삽입)
- 대댓글 및 감정표현 (좋아요/싫어요/질문 있어요) 관리

#### 테스트 매트릭스
```typescript
interface VideoFeedbackTestMatrix {
  unitTests: {
    coverage: "82%",
    focus: [
      "타임코드 파싱 및 포맷팅",
      "비디오 상태 동기화 로직",
      "코멘트 정렬 및 필터링"
    ]
  },
  
  integrationTests: {
    coverage: "88%",
    focus: [
      "플레이어-코멘트 연동",
      "실시간 코멘트 업데이트",
      "스크린샷 캡처 및 첨부"
    ],
    complexScenarios: [
      "동영상 재생 중 타임코드 코멘트 작성",
      "특정 시점 이동 후 관련 코멘트 하이라이트",
      "스크린샷 캡처 → 파일명 규칙 적용"
    ]
  }
}
```

#### 비디오 플레이어 상태 동기화 테스트
```typescript
describe('비디오 플레이어 상태 동기화', () => {
  let player: VideoPlayer
  let commentSystem: CommentSystem
  
  beforeEach(() => {
    player = new VideoPlayer()
    commentSystem = new CommentSystem(player)
  })
  
  it('현재 시점 코멘트 버튼 클릭 시 타임코드 자동 삽입', async () => {
    // Given: 동영상이 2분 30초 500ms 지점에서 재생 중
    await player.seekTo(150.5) // 2:30.500
    
    // When: 현재 시점 코멘트 버튼 클릭
    const commentInput = screen.getByTestId('comment-input')
    const timeCodeButton = screen.getByTestId('current-time-comment')
    
    await userEvent.click(timeCodeButton)
    
    // Then: 입력창에 타임코드 자동 삽입
    expect(commentInput).toHaveValue('[02:30.500] ')
    expect(commentInput).toHaveFocus()
    expect(commentInput.selectionStart).toBe(12) // 커서가 타임코드 뒤에 위치
  })
  
  it('타임코드 클릭 시 해당 시점으로 이동', async () => {
    // Given: 타임코드가 포함된 코멘트
    const comment = createCommentWithTimecode('[01:15.250] 이 부분 수정 필요')
    render(<CommentItem comment={comment} />)
    
    // When: 타임코드 링크 클릭
    const timeCodeLink = screen.getByText('[01:15.250]')
    await userEvent.click(timeCodeLink)
    
    // Then: 플레이어가 해당 시점으로 이동
    expect(player.getCurrentTime()).toBe(75.25)
  })
})
```

#### 스크린샷 파일명 규칙 테스트
```typescript
describe('스크린샷 파일명 규칙', () => {
  const screenshotCapture = new ScreenshotCapture()
  
  it('파일명 규칙: project-{slug}_TC{mmssfff}_{timestamp}.jpg', async () => {
    // Given: 프로젝트 슬러그 및 타임코드 설정
    const project = { slug: 'my-awesome-video' }
    const currentTime = 95.125 // 1분 35초 125ms = TC0135125
    const mockDate = new Date('2025-08-26T14:30:45.123Z')
    
    jest.setSystemTime(mockDate)
    
    // When: 스크린샷 캡처
    const filename = await screenshotCapture.generateFilename(project, currentTime)
    
    // Then: 파일명 규칙 준수 확인
    expect(filename).toBe('my-awesome-video_TC0135125_2025-08-26T143045.jpg')
  })
})
```

---

## 🧪 Part 2: 복잡 비즈니스 로직 테스트 전략

### 2.1 LLM API 통합 테스트 전략

#### 테스트 더블 전략
```typescript
// MSW를 활용한 Google Gemini API 모킹
const llmHandlers = [
  http.post('https://generativelanguage.googleapis.com/v1/models/*', 
    ({ request, params }) => {
      const requestBody = await request.json()
      
      // 프롬프트 패턴별 응답 분기
      if (requestBody.contents[0].parts[0].text.includes('4단계로 분해')) {
        return HttpResponse.json(mockFourStageResponse)
      }
      
      if (requestBody.contents[0].parts[0].text.includes('12개 숏으로')) {
        return HttpResponse.json(mock12ShotResponse)
      }
      
      return HttpResponse.json({ error: 'Unknown prompt pattern' }, { status: 400 })
    }
  )
]
```

#### LLM 응답 검증 및 후처리 테스트
```typescript
describe('LLM 응답 후처리 파이프라인', () => {
  const responseProcessor = new LLMResponseProcessor()
  
  it('불완전한 LLM 응답 보정', async () => {
    // Given: 일부 필드가 누락된 LLM 응답
    const incompleteResponse = {
      stages: [
        { title: '기', summary: '시작', content: '...' }, // duration 누락
        { title: '승', summary: '전개', content: '...', duration: 20 },
        // 3, 4단계 누락
      ]
    }
    
    // When: 응답 보정 처리
    const correctedResponse = await responseProcessor.correct(incompleteResponse)
    
    // Then: 누락 필드 자동 보정
    expect(correctedResponse.stages).toHaveLength(4)
    expect(correctedResponse.stages[0].duration).toBeGreaterThan(0)
    expect(correctedResponse.stages[2].title).toBe('전')
    expect(correctedResponse.stages[3].title).toBe('결')
  })
})
```

### 2.2 파일 업로드/처리 테스트

#### 대용량 파일 테스트
```typescript
describe('대용량 비디오 파일 처리', () => {
  const fileUploader = new VideoFileUploader()
  
  it('청크 단위 업로드 진행률 추적', async () => {
    // Given: 100MB 모의 비디오 파일
    const largeMockFile = createMockVideoFile({ size: 100 * 1024 * 1024 })
    const progressCallback = jest.fn()
    
    // When: 청크 업로드 수행
    await fileUploader.uploadWithProgress(largeMockFile, progressCallback)
    
    // Then: 진행률 콜백 호출 검증
    expect(progressCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        loaded: expect.any(Number),
        total: 100 * 1024 * 1024,
        percentage: expect.any(Number)
      })
    )
  })
  
  it('업로드 중단 및 재시작 지원', async () => {
    // Given: 업로드 진행 중인 파일
    const uploadPromise = fileUploader.upload(mockFile)
    
    // When: 업로드 중단 후 재시작
    fileUploader.abort()
    await expect(uploadPromise).rejects.toThrow('Upload aborted')
    
    const resumePromise = fileUploader.resume(mockFile)
    await expect(resumePromise).resolves.toBeDefined()
  })
})
```

### 2.3 실시간 협업 기능 테스트

#### WebSocket 이벤트 시뮬레이션
```typescript
describe('실시간 협업 기능', () => {
  let mockWebSocket: MockWebSocket
  let collaborationManager: CollaborationManager
  
  beforeEach(() => {
    mockWebSocket = new MockWebSocket()
    collaborationManager = new CollaborationManager(mockWebSocket)
  })
  
  it('동시 편집 충돌 감지 및 해결', async () => {
    // Given: 두 사용자가 동시에 같은 코멘트 편집
    const userA = createUser('userA')
    const userB = createUser('userB')
    const commentId = 'comment-1'
    
    // When: 동시 편집 이벤트 발생
    mockWebSocket.simulate('edit_start', { 
      userId: userA.id, 
      commentId, 
      timestamp: Date.now() 
    })
    
    mockWebSocket.simulate('edit_start', { 
      userId: userB.id, 
      commentId, 
      timestamp: Date.now() + 100 // 100ms 후
    })
    
    // Then: 충돌 감지 및 후순위 사용자에게 경고
    await waitFor(() => {
      expect(screen.getByText(/다른 사용자가 편집 중/)).toBeInTheDocument()
    })
  })
})
```

---

## 🏗️ Part 3: TDD 사이클 최적화

### 3.1 Red-Green-Refactor 최적화

#### 실패 우선 테스트 패턴
```typescript
// Red Phase: 명확한 실패 이유를 가진 테스트
describe('프로젝트 초대 시스템', () => {
  it('이미 초대된 이메일 재초대 시 에러', async () => {
    // 이 테스트는 처음에 실패해야 함 (기능 미구현)
    const project = await createProject()
    const email = 'test@example.com'
    
    // 첫 번째 초대
    await inviteUser(project.id, email)
    
    // 두 번째 초대 시도 - 실패해야 함
    await expect(inviteUser(project.id, email))
      .rejects
      .toThrow('이미 초대된 이메일입니다')
  })
})

// Green Phase: 최소 구현으로 테스트 통과
export async function inviteUser(projectId: string, email: string) {
  const existingInvites = await getProjectInvites(projectId)
  
  if (existingInvites.some(invite => invite.email === email)) {
    throw new Error('이미 초대된 이메일입니다')
  }
  
  return await createInvite(projectId, email)
}

// Refactor Phase: 코드 품질 개선
export class InviteService {
  private inviteRepository: InviteRepository
  
  constructor(inviteRepository: InviteRepository) {
    this.inviteRepository = inviteRepository
  }
  
  async inviteUser(projectId: string, email: string): Promise<Invite> {
    await this.validateEmailNotAlreadyInvited(projectId, email)
    return this.inviteRepository.create({ projectId, email, status: 'pending' })
  }
  
  private async validateEmailNotAlreadyInvited(
    projectId: string, 
    email: string
  ): Promise<void> {
    const exists = await this.inviteRepository.existsByProjectAndEmail(
      projectId, 
      email
    )
    
    if (exists) {
      throw new InviteValidationError('DUPLICATE_EMAIL')
    }
  }
}
```

### 3.2 테스트 퍼스트 개발 플로우

#### 기능 명세서 기반 테스트 작성
```typescript
// 1단계: 수용 조건을 테스트로 변환
describe('영상 기획 위저드 - 사용자 여정', () => {
  describe('STEP 1: 입력/선택', () => {
    it('필수 필드 미입력 시 다음 단계 비활성화', () => {
      render(<PlanningWizard />)
      
      const nextButton = screen.getByRole('button', { name: '다음 단계' })
      expect(nextButton).toBeDisabled()
      
      // 제목만 입력
      userEvent.type(screen.getByLabelText('제목'), '테스트 영상')
      expect(nextButton).toBeDisabled() // 여전히 비활성화
      
      // 한 줄 스토리 추가 입력
      userEvent.type(screen.getByLabelText('한 줄 스토리'), '스토리 내용')
      expect(nextButton).toBeEnabled() // 활성화
    })
    
    it('프리셋 버튼 클릭 시 모든 필드 자동 채움', () => {
      render(<PlanningWizard />)
      
      const presetButton = screen.getByText('브랜드30초·빠른·훅몰반')
      userEvent.click(presetButton)
      
      // 자동 채움 검증
      expect(screen.getByDisplayValue('30초')).toBeInTheDocument()
      expect(screen.getByDisplayValue('빠르게')).toBeInTheDocument()
      expect(screen.getByDisplayValue('훅–몰입–반전–떡밥')).toBeInTheDocument()
    })
  })
})
```

---

## 🎪 Part 4: CI/CD 품질 체크포인트

### 4.1 다단계 품질 게이트

```yaml
# .github/workflows/quality-gates.yml
name: VRidge Quality Gates

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  # 1단계: 빠른 피드백 (< 2분)
  fast-feedback:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: 유닛 테스트 실행
        run: npm run test:unit
        timeout-minutes: 2
        
      - name: 린터 검사
        run: npm run lint
        
      - name: 타입 검사
        run: npm run type-check

  # 2단계: 통합 테스트 (< 5분)  
  integration:
    needs: fast-feedback
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - name: 통합 테스트 실행
        run: npm run test:integration
        timeout-minutes: 5
        
      - name: API 계약 테스트
        run: npm run test:contract

  # 3단계: E2E 및 성능 테스트 (< 15분)
  comprehensive:
    needs: integration
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: E2E 테스트 실행
        run: npm run test:e2e
        timeout-minutes: 10
        
      - name: 성능 회귀 테스트
        run: npm run test:performance
        
      - name: 보안 스캔
        run: npm run security:scan

  # 4단계: 커버리지 및 품질 메트릭
  quality-metrics:
    needs: comprehensive
    runs-on: ubuntu-latest
    steps:
      - name: 코드 커버리지 수집
        run: npm run test:coverage
        
      - name: 뮤테이션 테스트 (주간 실행)
        if: github.event.schedule == '0 2 * * 1' # 매주 월요일
        run: npm run test:mutation
        
      - name: 테스트 품질 리포트
        run: |
          echo "## 테스트 품질 리포트" >> $GITHUB_STEP_SUMMARY
          npm run test:quality-report >> $GITHUB_STEP_SUMMARY
```

### 4.2 커버리지 및 품질 임계값

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      thresholds: {
        // 전역 임계값
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        },
        
        // 모듈별 차등 임계값
        './src/shared/**/*': {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        },
        
        './src/entities/**/*': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        
        './src/features/**/*': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      
      // 제외 패턴
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/test/**',
        '**/*.test.*',
        '**/*.spec.*'
      ]
    },
    
    // 성능 임계값
    timeout: 5000, // 5초
    testTimeout: 10000, // 개별 테스트 10초
    
    // 플래키 테스트 감지
    retry: 2,
    bail: 5 // 5개 실패 시 중단
  }
})
```

### 4.3 자동화된 품질 리포팅

```typescript
// scripts/quality-report.ts
interface QualityMetrics {
  coverage: CoverageReport
  testResults: TestResults
  performance: PerformanceMetrics
  flakiness: FlakinessReport
}

class QualityReporter {
  async generateReport(): Promise<QualityMetrics> {
    return {
      coverage: await this.getCoverageMetrics(),
      testResults: await this.getTestResults(),
      performance: await this.getPerformanceMetrics(),
      flakiness: await this.getFlakinessReport()
    }
  }
  
  async checkQualityGates(metrics: QualityMetrics): Promise<boolean> {
    const gates = [
      this.checkCoverageGate(metrics.coverage),
      this.checkPerformanceGate(metrics.performance),
      this.checkFlakinessGate(metrics.flakiness)
    ]
    
    return gates.every(gate => gate.passed)
  }
  
  private checkCoverageGate(coverage: CoverageReport): QualityGate {
    return {
      name: 'Coverage Gate',
      passed: coverage.global.lines >= 70,
      message: `Line coverage: ${coverage.global.lines}% (threshold: 70%)`
    }
  }
}
```

---

## 🗃️ Part 5: 테스트 데이터 관리 및 MSW 목 서비스

### 5.1 계층화된 테스트 데이터 전략

```typescript
// test/fixtures/index.ts
export const fixtures = {
  // 기본 엔티티
  user: {
    admin: {
      id: 'user-admin',
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['read', 'write', 'delete']
    },
    viewer: {
      id: 'user-viewer', 
      email: 'viewer@example.com',
      role: 'viewer',
      permissions: ['read']
    }
  },
  
  // 프로젝트 관련
  project: {
    active: {
      id: 'proj-active',
      title: '테스트 프로젝트',
      status: 'active',
      schedule: {
        planning: { duration: 7, unit: 'days' },
        shooting: { duration: 1, unit: 'days' },
        editing: { duration: 14, unit: 'days' }
      }
    },
    
    withConflicts: {
      id: 'proj-conflicts',
      schedule: {
        shooting: { 
          start: '2025-09-01T09:00:00Z',
          end: '2025-09-01T18:00:00Z'
        }
      }
    }
  },
  
  // 복잡한 시나리오 데이터
  scenarios: {
    multiUserCollaboration: {
      users: [fixtures.user.admin, fixtures.user.viewer],
      project: fixtures.project.active,
      comments: [
        {
          id: 'comment-1',
          content: '[00:30.500] 이 부분 수정 필요',
          userId: 'user-admin',
          timecode: 30.5
        }
      ]
    }
  }
}
```

### 5.2 동적 테스트 데이터 팩토리

```typescript
// test/factories/projectFactory.ts
export class ProjectFactory {
  private static defaultProject = {
    title: '기본 프로젝트',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }
  
  static create(overrides: Partial<Project> = {}): Project {
    return {
      ...this.defaultProject,
      id: generateUniqueId(),
      ...overrides
    }
  }
  
  static createWithSchedule(
    scheduleOverrides: Partial<ProjectSchedule> = {}
  ): Project {
    const defaultSchedule = {
      planning: { start: addDays(new Date(), 0), duration: 7 },
      shooting: { start: addDays(new Date(), 7), duration: 1 },
      editing: { start: addDays(new Date(), 8), duration: 14 }
    }
    
    return this.create({
      schedule: { ...defaultSchedule, ...scheduleOverrides }
    })
  }
  
  static createWithConflict(): Project[] {
    const baseDate = new Date('2025-09-01T09:00:00Z')
    
    return [
      this.createWithSchedule({
        shooting: { start: baseDate, end: addHours(baseDate, 9) }
      }),
      this.createWithSchedule({
        shooting: { start: addHours(baseDate, 5), end: addHours(baseDate, 12) }
      })
    ]
  }
}
```

### 5.3 MSW 핸들러 구성

```typescript
// test/mocks/handlers.ts
export const handlers = [
  // 인증 관련
  http.post('/api/auth/login', ({ request }) => {
    const { email, password } = request.json()
    
    if (email === 'test@example.com' && password === 'password') {
      return HttpResponse.json({
        user: fixtures.user.admin,
        token: 'mock-jwt-token'
      })
    }
    
    return HttpResponse.json(
      { error: '인증 실패' }, 
      { status: 401 }
    )
  }),
  
  // 프로젝트 관련
  http.get('/api/projects', ({ request }) => {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    
    const projects = ProjectFactory.createMany(3, { ownerId: userId })
    return HttpResponse.json(projects)
  }),
  
  http.post('/api/projects/:projectId/invites', ({ params, request }) => {
    const { projectId } = params
    const { email, role } = request.json()
    
    // 중복 초대 체크
    const existingInvites = inviteStore.getByProjectId(projectId)
    if (existingInvites.some(invite => invite.email === email)) {
      return HttpResponse.json(
        { error: '이미 초대된 이메일입니다' },
        { status: 409 }
      )
    }
    
    const invite = InviteFactory.create({ projectId, email, role })
    inviteStore.add(invite)
    
    return HttpResponse.json(invite, { status: 201 })
  }),
  
  // LLM API 모킹
  http.post('*/v1/models/:model:generateContent', ({ params, request }) => {
    const prompt = request.json().contents[0].parts[0].text
    
    if (prompt.includes('4단계')) {
      return HttpResponse.json({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(mockFourStageResponse) }]
          }
        }]
      })
    }
    
    if (prompt.includes('12개 숏')) {
      return HttpResponse.json({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(mock12ShotResponse) }]
          }
        }]
      })
    }
    
    return HttpResponse.json(
      { error: '알 수 없는 프롬프트 패턴' },
      { status: 400 }
    )
  }),
  
  // 이메일 전송 (SendGrid) 모킹
  http.post('https://api.sendgrid.com/v3/mail/send', ({ request }) => {
    const emailData = request.json()
    
    // 이메일 전송 로깅
    emailLogStore.add({
      to: emailData.personalizations[0].to[0].email,
      subject: emailData.subject,
      sentAt: new Date()
    })
    
    return HttpResponse.json({ message: 'success' })
  })
]
```

### 5.4 시나리오별 목 데이터 관리

```typescript
// test/scenarios/collaborationScenario.ts
export class CollaborationScenario {
  private mockWebSocket: MockWebSocket
  private users: User[]
  private project: Project
  
  constructor() {
    this.mockWebSocket = new MockWebSocket()
    this.setupScenario()
  }
  
  private setupScenario() {
    this.users = [
      UserFactory.create({ role: 'admin', name: 'Admin User' }),
      UserFactory.create({ role: 'editor', name: 'Editor User' }),
      UserFactory.create({ role: 'viewer', name: 'Viewer User' })
    ]
    
    this.project = ProjectFactory.createWithMembers(this.users)
  }
  
  // 동시 편집 시나리오
  async simulateSimultaneousEdit() {
    const commentId = 'comment-1'
    
    // Admin 사용자가 편집 시작
    this.mockWebSocket.emit('edit_start', {
      userId: this.users[0].id,
      commentId,
      timestamp: Date.now()
    })
    
    // 100ms 후 Editor 사용자가 같은 코멘트 편집 시도
    setTimeout(() => {
      this.mockWebSocket.emit('edit_start', {
        userId: this.users[1].id,
        commentId,
        timestamp: Date.now()
      })
    }, 100)
    
    return this.waitForConflictResolution()
  }
  
  // 실시간 알림 시나리오
  async simulateRealtimeNotification() {
    const notification = {
      type: 'new_comment',
      projectId: this.project.id,
      data: {
        commentId: 'comment-new',
        userId: this.users[0].id,
        content: '새로운 피드백입니다'
      }
    }
    
    this.mockWebSocket.emit('notification', notification)
    
    return this.waitForNotificationDisplay()
  }
}
```

---

## 📊 Part 6: 성능 및 플래키 테스트 관리

### 6.1 테스트 성능 모니터링

```typescript
// test/utils/performanceTracker.ts
export class TestPerformanceTracker {
  private metrics: Map<string, TestMetrics> = new Map()
  
  startTest(testName: string) {
    this.metrics.set(testName, {
      name: testName,
      startTime: performance.now(),
      memoryStart: process.memoryUsage()
    })
  }
  
  endTest(testName: string) {
    const metric = this.metrics.get(testName)
    if (!metric) return
    
    metric.endTime = performance.now()
    metric.duration = metric.endTime - metric.startTime
    metric.memoryEnd = process.memoryUsage()
    metric.memoryDelta = metric.memoryEnd.heapUsed - metric.memoryStart.heapUsed
    
    this.checkPerformanceThreshold(metric)
  }
  
  private checkPerformanceThreshold(metric: TestMetrics) {
    const thresholds = {
      unit: 50, // 50ms
      integration: 500, // 500ms
      e2e: 5000 // 5s
    }
    
    const testType = this.categorizeTest(metric.name)
    const threshold = thresholds[testType]
    
    if (metric.duration > threshold) {
      console.warn(
        `⚠️ Slow test detected: ${metric.name} took ${metric.duration}ms ` +
        `(threshold: ${threshold}ms)`
      )
    }
  }
}
```

### 6.2 플래키 테스트 감지 시스템

```typescript
// test/utils/flakinessDetector.ts
export class FlakinessDetector {
  private testHistory: Map<string, TestRun[]> = new Map()
  
  recordTestRun(testName: string, result: TestResult) {
    if (!this.testHistory.has(testName)) {
      this.testHistory.set(testName, [])
    }
    
    const history = this.testHistory.get(testName)!
    history.push({
      timestamp: Date.now(),
      result: result.status,
      duration: result.duration,
      error: result.error
    })
    
    // 최근 100회 실행만 보관
    if (history.length > 100) {
      history.shift()
    }
    
    this.analyzeFlakiness(testName, history)
  }
  
  private analyzeFlakiness(testName: string, history: TestRun[]) {
    if (history.length < 10) return // 최소 10회 실행 후 분석
    
    const recentRuns = history.slice(-20) // 최근 20회
    const failureRate = recentRuns.filter(run => run.result === 'failed').length / recentRuns.length
    
    if (failureRate > 0.1) { // 10% 이상 실패율
      console.warn(`🔄 Flaky test detected: ${testName} (failure rate: ${failureRate * 100}%)`)
      
      this.suggestFlakinessRemedies(testName, history)
    }
  }
  
  private suggestFlakinessRemedies(testName: string, history: TestRun[]) {
    const patterns = this.detectFailurePatterns(history)
    
    if (patterns.timeouts > patterns.totalFailures * 0.7) {
      console.log(`💡 Suggestion: Increase timeout for ${testName}`)
    }
    
    if (patterns.networkErrors > patterns.totalFailures * 0.5) {
      console.log(`💡 Suggestion: Add network retry logic for ${testName}`)
    }
    
    if (patterns.racingConditions > 0) {
      console.log(`💡 Suggestion: Add proper await/waitFor for ${testName}`)
    }
  }
}
```

### 6.3 자동 플래키 테스트 격리

```typescript
// test/utils/flakyTestIsolation.ts
export class FlakyTestIsolation {
  async runWithIsolation<T>(testFn: () => Promise<T>): Promise<T> {
    // 1. 독립된 테스트 컨텍스트 생성
    const isolatedContext = await this.createIsolatedContext()
    
    try {
      // 2. 테스트 실행 전 상태 초기화
      await this.resetGlobalState()
      await this.clearTestArtifacts()
      
      // 3. 테스트 실행
      return await testFn()
      
    } finally {
      // 4. 정리 작업
      await this.cleanup(isolatedContext)
    }
  }
  
  private async resetGlobalState() {
    // Redux 스토어 초기화
    store.dispatch({ type: 'RESET' })
    
    // 로컬 스토리지 클리어
    localStorage.clear()
    sessionStorage.clear()
    
    // 타이머 클리어
    jest.clearAllTimers()
    
    // MSW 상태 초기화
    server.resetHandlers()
  }
  
  private async clearTestArtifacts() {
    // 임시 파일 삭제
    await fs.rm('./test-artifacts', { recursive: true, force: true })
    
    // 테스트 데이터베이스 초기화
    await testDb.clear()
    
    // 메모리 캐시 클리어
    cache.clear()
  }
}
```

---

## 🎓 Part 7: 팀 교육 및 TDD 문화 정착

### 7.1 단계별 TDD 교육 프로그램

```markdown
## Phase 1: TDD 기초 (2주)

### Week 1: 개념과 원리
- **Day 1-2**: Red-Green-Refactor 사이클 이해
- **Day 3-4**: 좋은 테스트의 특징 (FIRST 원칙)
- **Day 5**: 실습 - 간단한 유틸리티 함수 TDD

### Week 2: 도구와 환경
- **Day 1-2**: Vitest + RTL 설정 및 기초
- **Day 3-4**: MSW를 활용한 API 모킹
- **Day 5**: 실습 - 컴포넌트 TDD

## Phase 2: 실제 적용 (2주)

### Week 3: 프로젝트 적용
- **Day 1-2**: 기존 코드에 테스트 추가 (페어 프로그래밍)
- **Day 3-4**: 새 기능 TDD로 개발
- **Day 5**: 코드 리뷰 및 피드백

### Week 4: 고급 주제
- **Day 1-2**: E2E 테스트 작성
- **Day 3-4**: 성능 테스트 및 최적화
- **Day 5**: 팀 회고 및 개선점 도출
```

### 7.2 TDD 체크리스트 및 가이드라인

```typescript
// .github/pull_request_template.md
## TDD 체크리스트

### 테스트 작성 확인
- [ ] 새로운 기능에 대한 테스트가 먼저 작성되었는가?
- [ ] 테스트가 Red-Green-Refactor 사이클을 따랐는가?
- [ ] 모든 테스트가 독립적으로 실행 가능한가?

### 테스트 품질 확인
- [ ] 테스트 이름이 명확하게 시나리오를 설명하는가?
- [ ] 테스트가 구현이 아닌 동작을 검증하는가?
- [ ] 적절한 수준의 모킹이 적용되었는가?

### 커버리지 확인
- [ ] 새 코드의 커버리지가 80% 이상인가?
- [ ] 크리티컬 패스가 모두 테스트되었는가?
- [ ] 엣지 케이스가 고려되었는가?

### 성능 확인
- [ ] 테스트 실행 시간이 임계값 이하인가?
- [ ] 플래키 테스트가 없는가?
- [ ] 메모리 누수가 없는가?
```

### 7.3 지속적인 개선 시스템

```typescript
// scripts/tdd-metrics.ts
export class TDDMetricsCollector {
  async collectWeeklyMetrics(): Promise<TDDMetrics> {
    return {
      testFirstCommits: await this.countTestFirstCommits(),
      coverageTrend: await this.getCoverageTrend(),
      testExecutionTime: await this.getTestExecutionTrend(),
      flakyTestCount: await this.getFlakyTestCount(),
      teamAdoptionRate: await this.calculateAdoptionRate()
    }
  }
  
  async generateImprovementSuggestions(
    metrics: TDDMetrics
  ): Promise<string[]> {
    const suggestions = []
    
    if (metrics.testFirstCommits < 0.8) {
      suggestions.push('TDD 사이클 준수율 향상이 필요합니다')
    }
    
    if (metrics.testExecutionTime > 120) {
      suggestions.push('테스트 실행 시간 최적화가 필요합니다')
    }
    
    if (metrics.flakyTestCount > 5) {
      suggestions.push('플래키 테스트 수정이 우선 필요합니다')
    }
    
    return suggestions
  }
}
```

---

## 🏆 Part 8: 성공 지표 및 모니터링

### 8.1 핵심 KPI 정의

```typescript
interface VRidgeTestingKPIs {
  quality: {
    // 품질 지표
    defectEscapeRate: number      // 목표: < 5%
    criticalPathCoverage: number  // 목표: > 90%
    mutationScore: number         // 목표: > 75%
    codeReliability: number       // 목표: > 95%
  }
  
  velocity: {
    // 개발 속도 지표  
    testExecutionTime: number     // 목표: < 2분
    deploymentFrequency: number   // 목표: > 3회/주
    leadTime: number             // 목표: < 2일
    changeFailureRate: number    // 목표: < 5%
  }
  
  adoption: {
    // TDD 도입 지표
    testFirstCommitRate: number   // 목표: > 80%
    teamTDDAdoption: number      // 목표: 100%
    testMaintainabilityIndex: number // 목표: > 80
  }
  
  efficiency: {
    // 효율성 지표
    testToCodeRatio: number       // 목표: 1.5:1
    testMaintenanceTime: number   // 목표: < 20%
    automationCoverage: number    // 목표: > 95%
  }
}
```

### 8.2 실시간 품질 대시보드

```typescript
// monitoring/qualityDashboard.ts
export class QualityDashboard {
  private metrics: MetricsCollector
  private alerts: AlertManager
  
  async generateDashboard(): Promise<DashboardData> {
    const currentMetrics = await this.metrics.collect()
    
    return {
      overview: {
        overallHealth: this.calculateHealthScore(currentMetrics),
        trend: this.calculateTrend(currentMetrics),
        alerts: await this.alerts.getActiveAlerts()
      },
      
      modules: {
        dashboard: await this.getModuleMetrics('dashboard'),
        calendar: await this.getModuleMetrics('calendar'),
        projectManagement: await this.getModuleMetrics('project-management'),
        videoPlanning: await this.getModuleMetrics('video-planning'),
        videoFeedback: await this.getModuleMetrics('video-feedback')
      },
      
      testPyramid: {
        unit: currentMetrics.testCounts.unit,
        integration: currentMetrics.testCounts.integration,
        e2e: currentMetrics.testCounts.e2e,
        distribution: this.calculatePyramidHealth(currentMetrics.testCounts)
      },
      
      performance: {
        executionTimes: currentMetrics.performance.executionTimes,
        flakyTests: currentMetrics.flakiness.flakyTests,
        coverage: currentMetrics.coverage
      }
    }
  }
  
  private calculateHealthScore(metrics: TestingMetrics): number {
    const weights = {
      coverage: 0.3,
      testExecution: 0.2,
      flakiness: 0.2,
      performance: 0.15,
      adoption: 0.15
    }
    
    const scores = {
      coverage: Math.min(metrics.coverage.overall / 70, 1) * 100,
      testExecution: Math.max(0, (120 - metrics.performance.averageTime) / 120) * 100,
      flakiness: Math.max(0, (100 - metrics.flakiness.rate * 10)) / 100 * 100,
      performance: metrics.performance.regressionCount === 0 ? 100 : 50,
      adoption: metrics.adoption.tddRate * 100
    }
    
    return Object.entries(weights).reduce((total, [key, weight]) => {
      return total + (scores[key as keyof typeof scores] * weight)
    }, 0)
  }
}
```

---

## 🚀 결론 및 실행 로드맵

### 즉시 실행 항목 (Week 1)

1. **테스트 인프라 구축**
   - Vitest + RTL + MSW 설정 완료
   - 첫 번째 TDD 사이클 실습 (대시보드 읽지 않음 배지)

2. **품질 게이트 설정**
   - CI/CD 파이프라인에 테스트 단계 추가
   - 최소 커버리지 임계값 설정 (30% → 점진적 증가)

3. **팀 교육 시작**
   - TDD 기초 교육 세션 (2시간)
   - 페어 프로그래밍 세션 계획

### 단기 목표 (Month 1)

- **크리티컬 패스 30% 커버리지** 달성
- **5개 모듈별 테스트 매트릭스** 완성  
- **MSW 핸들러** 전체 API 대응
- **첫 E2E 테스트** 작성 (로그인 → 대시보드)

### 중기 목표 (Month 2-3)

- **전체 50% 커버리지** 달성
- **뮤테이션 테스트** 도입
- **성능 회귀 테스트** 자동화
- **TDD 문화** 팀 전체 정착

### 장기 목표 (Month 4-6)

- **70% 커버리지, 90% 크리티컬 패스** 달성
- **플래키 테스트 < 1%** 유지
- **테스트 실행 시간 < 2분** 달성
- **지속적 품질 개선** 프로세스 확립

---

### Risk Mitigation Plan

```typescript
const riskMitigationPlan = {
  "팀 저항": {
    strategy: "점진적 도입 + 성공 사례 공유",
    actions: ["작은 성공 경험", "페어 프로그래밍", "인센티브 제공"]
  },
  
  "시간 부족": {
    strategy: "테스트 작성 시간을 스프린트에 명시적 할당",
    actions: ["스프린트 계획에 테스트 시간 포함", "기술 부채 시간 확보"]
  },
  
  "복잡성 증가": {
    strategy: "단순한 테스트부터 시작하여 점진적 확장",
    actions: ["유닛 테스트 우선", "통합 테스트 점진적 추가"]
  }
}
```

VRidge 플랫폼의 복잡한 비즈니스 로직과 기술적 도전사항을 고려한 이 종합 테스트 전략은 품질을 기반으로 한 지속가능한 개발 문화를 구축하는 로드맵을 제시합니다. TDD를 통해 안정적이고 신뢰할 수 있는 비디오 협업 플랫폼을 구축해나가겠습니다.

---

**작성자**: Grace (QA Lead)  
**날짜**: 2025-08-26  
**버전**: 1.0.0  
**다음 리뷰**: 2025-09-26