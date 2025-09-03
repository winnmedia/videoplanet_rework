// 완전한 사용자 여정 E2E 테스트 - DEVPLAN.md 기반
// 회원가입 → 로그인 → 프로젝트 생성 → 팀원 초대 → AI 기획안 생성 → 프롬프트 빌더 → 영상 피드백

describe('VLANET 완전한 사용자 여정 테스트', () => {
  let testUser: {
    username: string
    email: string
    password: string
    confirmPassword: string
  }
  
  let testProject: {
    name: string
    description: string
    category: 'commercial' | 'narrative' | 'documentary' | 'music-video'
    deadline: string
  }
  
  before(() => {
    // 결정론적 테스트 데이터 생성
    const timestamp = Date.now()
    testUser = {
      username: `testuser_${timestamp}`,
      email: `test_${timestamp}@example.com`,
      password: 'Test123!@#',
      confirmPassword: 'Test123!@#'
    }
    
    testProject = {
      name: `E2E Test Project ${timestamp}`,
      description: 'Complete E2E test project for VLANET platform validation',
      category: 'commercial',
      deadline: '2024-02-15'
    }
    
    cy.task('log', 'Starting complete user journey E2E test')
  })
  
  beforeEach(() => {
    // 각 테스트 시작 전 MSW 및 성능 측정 초기화
    cy.visit('/')
    cy.measurePerformance()
  })
  
  describe('Phase 1: 회원가입 및 인증 플로우', () => {
    it('새 사용자 회원가입 성공 시나리오', { tags: '@smoke @auth @p1' }, () => {
      cy.signup(testUser)
      
      // 회원가입 성공 검증
      cy.get('[data-testid="signup-success-message"]')
        .should('be.visible')
        .and('contain', '계정이 성공적으로 생성되었습니다')
      
      // 접근성 검증 (WCAG 2.1 AA)
      cy.checkA11yWithReport(null, {
        rules: {
          'color-contrast': { enabled: true },
          'keyboard-navigation': { enabled: true },
          'focus-management': { enabled: true },
          'aria-labels': { enabled: true }
        }
      })
      
      // Percy 시각적 회귀 테스트
      cy.percySnapshot('Phase 1 - 회원가입 완료 페이지', {
        widths: [375, 768, 1280]
      })
    })
    
    it('로그인 및 대시보드 접근', { tags: '@smoke @auth @p1' }, () => {
      cy.login(testUser.email, testUser.password)
      
      // 대시보드 접근 및 구성 요소 검증
      cy.visit('/dashboard')
      cy.verifyDashboardComponents()
      
      // 성능 예산 검증 (LCP < 2.5s, INP < 200ms)
      cy.measurePerformance()
      
      // 사용자 환영 메시지 확인
      cy.get('[data-testid="user-welcome-message"]')
        .should('contain', testUser.username)
      
      // Percy 스크린샷 - 다양한 뷰포트
      cy.percySnapshot('Phase 1 - 대시보드 로그인 상태')
    })
    
    it('세션 관리 및 보안 테스트', { tags: '@security @p1' }, () => {
      cy.login(testUser.email, testUser.password)
      
      // 세션 만료 시뮬레이션
      cy.clearCookies()
      cy.visit('/dashboard')
      
      // 자동 로그아웃 및 리다이렉트 검증
      cy.url().should('include', '/auth/login')
      cy.get('[data-testid="session-expired-message"]')
        .should('be.visible')
    })
  })
  
  describe('Phase 2: 프로젝트 생성 및 팀원 초대', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password)
    })
    
    it('프로젝트 생성 및 자동 스케줄 생성', { tags: '@smoke @project @p2' }, () => {
      cy.createProject(testProject)
      
      // 프로젝트 생성 성공 검증
      cy.get('[data-testid="project-created-success"]')
        .should('contain', '프로젝트가 성공적으로 생성되었습니다')
      
      // 자동 스케줄 생성 검증 (1주 기획 + 1일 촬영 + 2주 편집)
      cy.verifyAutoSchedule()
      
      // 프로젝트 권한 확인 (생성자는 owner)
      cy.checkProjectPermissions('owner')
      
      // 접근성 검증
      cy.checkA11yWithReport()
      
      // Percy 스크린샷
      cy.percySnapshot('Phase 2 - 프로젝트 생성 완료')
    })
    
    it('팀원 초대 및 SendGrid 통합', { tags: '@integration @project @sendgrid @p2' }, () => {
      // 기존 프로젝트로 이동
      cy.visit('/projects/project-123') // MSW에서 생성된 ID
      
      // 다양한 역할로 팀원 초대
      const invitations = [
        { email: 'admin@test.com', role: 'admin' as const, message: '프로젝트 관리를 도와주세요' },
        { email: 'editor@test.com', role: 'editor' as const, message: '편집 작업을 부탁드립니다' },
        { email: 'client@test.com', role: 'reviewer' as const, message: '검토 및 승인 부탁드립니다' }
      ]
      
      invitations.forEach((invite) => {
        cy.inviteTeamMember(invite)
        
        // 초대 성공 및 쿨다운 확인 (60초)
        cy.get('[data-testid="invite-cooldown"]').should('be.visible')
      })
      
      // 초대 관리 요약 확인
      cy.get('[data-testid="pending-invites-count"]').should('contain', '3')
      
      // Percy 스크린샷
      cy.percySnapshot('Phase 2 - 팀원 초대 완료')
    })
    
    it('촬영 일정 충돌 감지 알고리즘 테스트', { tags: '@algorithm @calendar @p2' }, () => {
      cy.testShootingConflictDetection()
      
      // 충돌 경고 메시지 확인
      cy.get('[data-testid="conflict-warning"]')
        .should('be.visible')
        .and('contain', '촬영 일정 충돌')
      
      // 충돌 상세 정보 확인
      cy.get('[data-testid="conflict-details"]')
        .should('contain', 'Existing Project')
        .and('contain', '2024-01-15')
    })
    
    it('5단계 권한 시스템 테스트', { tags: '@rbac @security @p2' }, () => {
      // 각 역할별 권한 테스트
      const roles = ['owner', 'admin', 'editor', 'reviewer', 'viewer']
      
      roles.forEach((role) => {
        // 역할별 사용자로 로그인 시뮬레이션
        cy.mockAPI('GET', '/api/projects/project-123/permissions', {
          projectId: 'project-123',
          userRole: role,
          permissions: {
            canEdit: ['owner', 'admin', 'editor'].includes(role),
            canInvite: ['owner', 'admin'].includes(role),
            canDelete: role === 'owner',
            canManageSettings: ['owner', 'admin'].includes(role)
          }
        })
        
        cy.visit('/projects/project-123')
        cy.checkProjectPermissions(role)
      })
      
      cy.restoreAPI() // MSW 핸들러 복원
    })
  })
  
  describe('Phase 3: AI 영상 기획 및 프롬프트 빌더', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password)
      cy.visit('/projects/project-123')
    })
    
    it('기본 3단계 마법사 플로우 - Google Gemini 통합', { tags: '@smoke @ai @gemini @p3' }, () => {
      const planData = {
        story: '혁신적인 기술 스타트업이 새로운 AI 솔루션을 출시하는 이야기. 팀워크와 도전정신을 통해 성공을 이루어내는 감동적인 여정을 담고 있습니다.',
        tone: 'professional' as const,
        genre: 'commercial' as const,
        targetAudience: '25-40세 기술업계 종사자 및 투자자'
      }
      
      // STEP 1: 스토리 입력 및 Google Gemini API 호출
      cy.createBasicVideoPlan(planData)
      
      // AI 생성 구조 검증
      cy.get('[data-testid="generated-structure"]').should('be.visible')
      cy.get('[data-testid="ai-metadata"]').should('contain', planData.tone)
      
      // STEP 2: 4막 구조 검토 및 편집
      cy.reviewAndEdit4ActStructure({
        act1: '도입부: 스타트업 팀의 도전 의지와 비전 제시',
        act2: '전개: 기술 개발 과정의 어려움과 팀워크',
        act3: '위기: 출시 직전 예상치 못한 기술적 문제 발생',
        act4: '해결: 팀의 협력으로 문제 해결 및 성공적 출시'
      })
      
      // STEP 3: 12샷 그리드 및 스토리보드 생성
      cy.generate12ShotGrid()
      
      // 생성된 샷 구성 검증
      cy.get('[data-testid="shot-breakdown"]').should('be.visible')
      cy.get('[data-testid="shot-item"]').should('have.length', 12)
      
      // 접근성 검증
      cy.checkA11yWithReport()
      
      // Percy 스크린샷
      cy.percySnapshot('Phase 3 - AI 기획안 생성 완료')
    })
    
    it('고급 프롬프트 빌더 - 프롬프트 체인 관리', { tags: '@advanced @ai @prompt-builder @p3' }, () => {
      const advancedPromptData = {
        promptChain: [
          {
            step: '컨셉 정의',
            prompt: '혁신적인 기술 스타트업의 핵심 가치와 미션을 강조하는 상업 광고 컨셉을 생성해주세요.',
            expectedOutput: '브랜드 컨셉 및 핵심 메시지'
          },
          {
            step: '타겟 분석',
            prompt: '25-40세 기술업계 종사자들의 니즈와 관심사를 분석하여 어필 포인트를 도출해주세요.',
            expectedOutput: '타겟 오디언스 인사이트'
          },
          {
            step: '스토리텔링',
            prompt: '앞서 정의한 컨셉과 타겟 분석을 바탕으로 감동적인 스토리를 구성해주세요.',
            expectedOutput: '완성된 스토리 구조'
          }
        ],
        template: 'commercial' as const,
        metadata: {
          tone: 'professional, inspiring',
          genre: 'commercial',
          targetAudience: 'Tech professionals aged 25-40'
        }
      }
      
      cy.useAdvancedPromptBuilder(advancedPromptData)
      
      // 프롬프트 체인 실행 결과 검증
      cy.get('[data-testid="prompt-chain-results"]').should('be.visible')
      cy.get('[data-testid="execution-step-result"]').should('have.length', 3)
      
      // 품질 점수 확인
      cy.get('[data-testid="overall-quality-score"]')
        .invoke('text')
        .then((score) => {
          expect(parseFloat(score)).to.be.above(0.8)
        })
      
      // Percy 스크린샷
      cy.percySnapshot('Phase 3 - 고급 프롬프트 빌더')
    })
    
    it('프롬프트 버전 관리 및 A/B 테스트', { tags: '@version-control @ai @p3' }, () => {
      cy.managePromptVersions()
      
      // 버전 히스토리 확인
      cy.get('[data-testid="version-history-list"]').should('be.visible')
      cy.get('[data-testid="version-item"]').should('have.length.at.least', 2)
      
      // 버전 비교 기능
      cy.get('[data-testid="version-comparison-view"]').should('be.visible')
      cy.get('[data-testid="version-diff"]').should('be.visible')
    })
    
    it('AI 응답 품질 검증 및 재시도 메커니즘', { tags: '@quality @ai @p3' }, () => {
      cy.testAIQualityValidation()
      
      // 품질 검증 경고 확인
      cy.get('[data-testid="quality-validation-warning"]').should('be.visible')
      
      // 자동 재시도 확인
      cy.get('[data-testid="auto-retry-indicator"]').should('be.visible')
      
      // 재시도 후 결과 개선 확인
      cy.get('[data-testid="quality-improved-notice"]', { timeout: 15000 }).should('be.visible')
    })
    
    it('JSON/Marp PDF 내보내기 파이프라인', { tags: '@export @pdf @p3' }, () => {
      // 기본 기획안이 있는 상태에서 시작
      cy.visit('/video-planning/project-123/plan-123')
      
      const exportOptions = {
        format: 'both' as const,
        includeStoryboard: true,
        includeMetadata: true
      }
      
      cy.exportToPDF(exportOptions)
      
      // 내보내기 완료 확인
      cy.get('[data-testid="export-success-message"]')
        .should('contain', '내보내기 완료')
      
      // 다운로드 링크 확인
      cy.get('[data-testid="download-json-link"]').should('be.visible')
      cy.get('[data-testid="download-pdf-link"]').should('be.visible')
    })
  })
  
  describe('Phase 4: 영상 피드백 및 실시간 협업', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password)
    })
    
    it('비디오 피드백 세션 설정 및 Video.js 플레이어', { tags: '@smoke @video @feedback @p4' }, () => {
      const videoData = {
        videoId: 'test-video-123',
        videoTitle: 'E2E Test Commercial Video',
        duration: '00:02:30'
      }
      
      cy.setupVideoFeedbackSession(videoData)
      
      // Video.js 플레이어 기능 테스트
      cy.testVideoPlayerFeatures()
      
      // 피드백 패널 구성 확인
      cy.get('[data-testid="comments-tab"]').should('be.visible')
      cy.get('[data-testid="team-tab"]').should('be.visible')
      cy.get('[data-testid="project-tab"]').should('be.visible')
      
      // Percy 스크린샷
      cy.percySnapshot('Phase 4 - 비디오 피드백 세션')
    })
    
    it('타임코드 기반 댓글 및 T-단축키', { tags: '@interaction @feedback @p4' }, () => {
      cy.visit('/feedback/test-video-123')
      
      const comments = [
        {
          timecode: '00:00:15',
          comment: '오프닝 로고 애니메이션이 너무 빠릅니다. 좀 더 천천히 나타나게 해주세요.',
          category: 'technical' as const,
          mentions: ['editor@test.com']
        },
        {
          timecode: '00:01:30',
          comment: '이 장면의 색감이 브랜드 가이드라인과 맞지 않습니다.',
          category: 'creative' as const
        },
        {
          timecode: '00:02:10',
          comment: '마지막 CTA 문구가 명확하지 않습니다. 더 직접적으로 표현해주세요.',
          category: 'urgent' as const
        }
      ]
      
      comments.forEach((comment) => {
        cy.addTimecodeComment(comment)
      })
      
      // 댓글 스레딩 테스트
      cy.testCommentThreading()
      
      // 댓글 목록 확인
      cy.get('[data-testid="comment-list"] [data-testid="comment-item"]')
        .should('have.length', comments.length)
    })
    
    it('WebSocket 실시간 댓글 시스템', { tags: '@websocket @realtime @p4' }, () => {
      cy.visit('/feedback/test-video-123')
      
      // WebSocket 모킹 및 실시간 댓글 테스트
      const realtimeMessages = [
        {
          type: 'new_comment',
          user: '다른 팀원',
          timecode: '00:00:45',
          comment: '좋은 지적입니다. 수정하겠습니다.',
          timestamp: new Date().toISOString()
        },
        {
          type: 'comment_reply',
          user: '클라이언트',
          parentCommentId: 'comment-123',
          comment: '빠른 수정 부탁드립니다.',
          timestamp: new Date().toISOString()
        }
      ]
      
      cy.mockWebSocket('ws://localhost:3000/ws/feedback/test-video-123', realtimeMessages)
      
      cy.testRealTimeComments()
      
      // 실시간 댓글 수신 확인
      cy.get('[data-testid="realtime-comment"]', { timeout: 10000 })
        .should('be.visible')
        .and('contain', '다른 팀원')
      
      cy.restoreWebSocket()
    })
    
    it('표준화된 스크린샷 네이밍 규칙', { tags: '@screenshot @naming @p4' }, () => {
      cy.visit('/feedback/test-video-123')
      
      const screenshotData = {
        timecode: '00:01:45',
        projectSlug: 'e2e-test-project',
        description: 'Logo placement feedback screenshot'
      }
      
      cy.takeScreenshot(screenshotData)
      
      // 표준 파일명 형식 확인: project-{slug}_TC{mmssfff}_{YYYY-MM-DD}T{HHmmss}.jpg
      cy.get('[data-testid="screenshot-filename"]')
        .invoke('text')
        .should('match', /e2e-test-project_TC\d{6}_\d{8}T\d{6}\.jpg/)
    })
    
    it('알림 센터 및 댓글 알림', { tags: '@notifications @p4' }, () => {
      cy.visit('/dashboard')
      
      // 알림 센터 테스트
      cy.testNotificationCenter()
      
      // 댓글 알림 검증
      cy.verifyCommentNotifications({
        type: 'new-comment',
        count: 3
      })
      
      // 멘션 알림 검증
      cy.verifyCommentNotifications({
        type: 'mention',
        count: 1
      })
    })
  })
  
  describe('Phase 5: 통합 테스트 및 사용자 경험 검증', () => {
    it('전체 사용자 여정 완료율 100% 검증', { tags: '@integration @complete-journey @p5' }, () => {
      // 처음부터 끝까지 전체 여정 실행
      cy.task('log', '전체 사용자 여정 통합 테스트 시작')
      
      // Phase 1: 회원가입 및 로그인
      cy.signup(testUser)
      cy.login(testUser.email, testUser.password)
      
      // Phase 2: 프로젝트 생성 및 팀원 초대
      cy.createProject(testProject)
      cy.inviteTeamMember({
        email: 'teammate@test.com',
        role: 'editor',
        message: '함께 작업해요!'
      })
      
      // Phase 3: AI 기획안 생성
      cy.createBasicVideoPlan({
        story: '완전한 E2E 테스트를 위한 샘플 스토리',
        tone: 'professional',
        genre: 'commercial',
        targetAudience: 'QA 테스터 및 개발자'
      })
      
      cy.reviewAndEdit4ActStructure()
      cy.generate12ShotGrid()
      
      // Phase 4: 비디오 피드백
      cy.visit('/feedback/test-video-123')
      cy.addTimecodeComment({
        timecode: '00:01:00',
        comment: 'E2E 테스트 완료 확인용 댓글',
        category: 'general'
      })
      
      // 전체 여정 완료 검증
      cy.task('log', '전체 사용자 여정 성공적으로 완료')
      
      // 최종 Percy 스크린샷
      cy.percySnapshot('Phase 5 - 전체 여정 완료')
    })
    
    it('데이터 영속성 및 상태 일관성 검증', { tags: '@data-persistence @consistency @p5' }, () => {
      cy.login(testUser.email, testUser.password)
      
      // 생성된 데이터들이 각 페이지에서 일관되게 표시되는지 확인
      
      // 대시보드에서 프로젝트 정보 확인
      cy.visit('/dashboard')
      cy.get('[data-testid="project-list"]')
        .should('contain', testProject.name)
      
      // 프로젝트 상세 페이지에서 팀원 정보 확인
      cy.visit('/projects/project-123')
      cy.get('[data-testid="team-member-list"]')
        .should('contain', 'teammate@test.com')
      
      // 기획안 페이지에서 AI 생성 결과 확인
      cy.visit('/video-planning/project-123')
      cy.get('[data-testid="generated-plan"]')
        .should('be.visible')
      
      // 피드백 페이지에서 댓글 확인
      cy.visit('/feedback/test-video-123')
      cy.get('[data-testid="comment-list"]')
        .should('contain', 'E2E 테스트 완료 확인용 댓글')
    })
  })
  
  after(() => {
    // 테스트 정리
    cy.task('log', 'Complete user journey E2E test finished')
    
    // 테스트 사용자 데이터 정리 (실제 환경에서는 API 호출)
    // 개발/테스트 환경에서만 실행
    if (Cypress.env('environment') !== 'production') {
      cy.task('log', 'Cleaning up test data...')
    }
  })
})