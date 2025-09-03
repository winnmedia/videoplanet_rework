// E2E 테스트: 이미지 생성 콘티 시스템
describe('스토리보드 이미지 생성 시스템 E2E', () => {
  // 테스트 데이터
  const testProject = {
    id: 'test_project_e2e',
    name: '테스트 프로젝트',
    storyOutline: '주인공이 마법의 숲에서 모험을 떠나는 판타지 스토리'
  }

  const mockApiResponses = {
    storyGeneration: {
      story: '주인공 엘라가 마법의 숲 입구에서 신비로운 빛을 발견하고...',
      themes: ['모험', '성장', '마법'],
      characters: ['엘라', '숲의 수호자', '마법사']
    },
    fourActStructure: {
      act1: { title: '1막: 발견', description: '마법의 숲 발견', duration: '30초' },
      act2: { title: '2막: 시험', description: '숲의 시험', duration: '60초' },
      act3: { title: '3막: 위기', description: '어둠의 등장', duration: '60초' },
      act4: { title: '4막: 해결', description: '마법의 힘으로 해결', duration: '30초' }
    },
    imageGeneration: Array.from({ length: 12 }, (_, i) => ({
      shotNumber: i + 1,
      imageUrl: `https://storage.googleapis.com/test-bucket/shot-${i + 1}.webp`,
      thumbnailUrl: `https://storage.googleapis.com/test-bucket/thumb-${i + 1}.webp`,
      prompt: `Shot ${i + 1}: 판타지 스타일의 마법 숲 장면`,
      generationTime: 2000 + Math.random() * 1000,
      status: 'completed',
      provider: 'google',
      styleMetrics: {
        consistency: 0.8 + Math.random() * 0.15,
        colorHarmony: 0.85 + Math.random() * 0.1
      }
    }))
  }

  beforeEach(() => {
    // API 호출 모킹
    cy.intercept('POST', '/api/gemini/story-generation', {
      statusCode: 200,
      body: mockApiResponses.storyGeneration,
      delay: 1000
    }).as('generateStory')

    cy.intercept('POST', '/api/gemini/four-act', {
      statusCode: 200,
      body: mockApiResponses.fourActStructure,
      delay: 1500
    }).as('generateFourAct')

    cy.intercept('POST', '/api/gemini/image-generation', {
      statusCode: 200,
      body: {
        projectId: testProject.id,
        images: mockApiResponses.imageGeneration,
        gridLayout: '3x4',
        totalGenerationTime: 25000,
        overallConsistency: 0.85,
        metadata: {
          createdAt: new Date(),
          styleSettings: {
            artStyle: 'cinematic',
            colorPalette: 'warm',
            aspectRatio: '16:9',
            quality: 'high'
          }
        }
      },
      delay: 3000
    }).as('generateImages')

    cy.intercept('POST', '/api/gemini/regenerate-shot', {
      statusCode: 200,
      body: {
        shotNumber: 5,
        imageUrl: 'https://storage.googleapis.com/test-bucket/shot-5-v2.webp',
        status: 'completed',
        version: 2,
        generationTime: 3200
      },
      delay: 2000
    }).as('regenerateShot')

    // 프로젝트 페이지로 이동
    cy.visit(`/projects/${testProject.id}/planning`)
  })

  // 메인 시나리오: 전체 스토리보드 생성 플로우
  it('should complete full storyboard generation workflow', () => {
    // 1단계: AI 기획 마법사 시작
    cy.get('[data-testid="planning-wizard"]').should('be.visible')
    cy.get('h1').should('contain', 'AI 기획 마법사')

    // 1단계: 스토리 개요 입력
    cy.get('label').contains('스토리 개요').should('be.visible')
    cy.get('[data-testid="story-outline-input"]').type(testProject.storyOutline)
    
    cy.get('label').contains('장르').should('be.visible')
    cy.get('[data-testid="genre-select"]').select('fantasy')
    
    cy.get('label').contains('타겟 길이').should('be.visible')
    cy.get('[data-testid="duration-select"]').select('3-5분')

    // 다음 단계 버튼 클릭
    cy.get('button').contains('다음 단계').click()

    // API 호출 대기 및 로딩 상태 확인
    cy.get('[data-testid="story-generation-loader"]').should('be.visible')
    cy.get('text').contains('AI가 스토리를 생성 중입니다').should('be.visible')
    
    cy.wait('@generateStory')

    // 2단계: 4막 구조 확인
    cy.get('h2').contains('2단계: 4막 구조').should('be.visible')
    cy.get('text').contains('주인공 엘라가 마법의 숲').should('be.visible')
    
    // 4막 구조 표시 확인
    cy.get('[data-testid="act-1"]').should('contain', '1막: 발견')
    cy.get('[data-testid="act-4"]').should('contain', '4막: 해결')

    // 다음 단계로 진행
    cy.get('button').contains('다음 단계').click()
    cy.wait('@generateFourAct')

    // 3단계: 12샷 리스트 생성
    cy.get('h2').contains('3단계: 12샷 리스트').should('be.visible')
    cy.get('button').contains('12샷 리스트 생성').click()
    cy.wait('@generateFourAct')

    // 이미지 생성 시작
    cy.get('button').contains('스토리보드 이미지 생성').click()

    // 진행률 표시 확인
    cy.get('[data-testid="progress-indicator"]').should('be.visible')
    cy.get('[role="progressbar"]').should('exist')
    cy.get('text').contains('이미지 생성 중').should('be.visible')

    cy.wait('@generateImages')

    // 생성 완료 후 그리드 표시 확인
    cy.get('[data-testid="storyboard-grid"]').should('be.visible')
    cy.get('[data-testid^="shot-image-"]').should('have.length', 12)
    
    // 전체 일관성 점수 표시 확인
    cy.get('text').contains('전체 일관성: 85%').should('be.visible')
  })

  // 시나리오 2: 12샷 스토리보드 그리드 상호작용
  it('should handle storyboard grid interactions correctly', () => {
    // 그리드가 로딩된 상태에서 시작 (전체 플로우 스킵)
    cy.intercept('GET', `/api/projects/${testProject.id}/storyboard`, {
      statusCode: 200,
      body: {
        projectId: testProject.id,
        images: mockApiResponses.imageGeneration,
        gridLayout: '3x4',
        overallConsistency: 0.85,
        metadata: { styleSettings: { artStyle: 'cinematic' } }
      }
    }).as('getStoryboard')

    cy.visit(`/projects/${testProject.id}/storyboard`)
    cy.wait('@getStoryboard')

    // 그리드 레이아웃 확인
    cy.get('[data-testid="storyboard-grid"]').should('have.class', 'grid-cols-3')
    
    // 개별 샷 이미지 클릭 - 확대보기 모달
    cy.get('[data-testid="shot-image-1"]').click()
    cy.get('[data-testid="image-modal"]').should('be.visible')
    cy.get('[data-testid="modal-image"]').should('be.visible')
    cy.get('h4').contains('샷 1').should('be.visible')

    // 모달 닫기
    cy.get('[data-testid="close-modal"]').click()
    cy.get('[data-testid="image-modal"]').should('not.exist')

    // 키보드 네비게이션 테스트
    cy.get('[data-testid="shot-image-1"]').focus()
    cy.get('[data-testid="shot-image-1"]').should('have.focus')
    
    // 오른쪽 화살표로 다음 샷 이동
    cy.get('[data-testid="shot-image-1"]').type('{rightarrow}')
    cy.get('[data-testid="shot-image-2"]').should('have.focus')
    
    // Enter로 이미지 확대
    cy.get('[data-testid="shot-image-2"]').type('{enter}')
    cy.get('[data-testid="image-modal"]').should('be.visible')
    cy.get('[data-testid="close-modal"]').click()
  })

  // 시나리오 3: 실시간 편집 및 개별 샷 재생성
  it('should handle real-time editing and shot regeneration', () => {
    // 스토리보드 그리드 페이지에서 시작
    cy.visit(`/projects/${testProject.id}/storyboard`)
    
    // 편집 모드 활성화
    cy.get('button').contains('편집 모드').click()
    cy.get('[data-testid="edit-mode-indicator"]').should('contain', '편집 모드 활성화')

    // 샷 5 재생성 시작
    cy.get('[data-testid="regenerate-shot-5"]').click()
    
    // 재생성 다이얼로그 확인
    cy.get('h3').contains('샷 5 재생성').should('be.visible')
    cy.get('[data-testid="new-prompt-input"]').should('be.visible')
    
    // 새 프롬프트 입력
    const newPrompt = '수정된 프롬프트: 엘라가 마법의 빛 속에서 놀라는 클로즈업 샷'
    cy.get('[data-testid="new-prompt-input"]').clear().type(newPrompt)
    
    // 재생성 실행
    cy.get('button').contains('재생성 실행').click()

    // 로딩 상태 확인
    cy.get('[data-testid="shot-loading-5"]').should('be.visible')
    cy.get('text').contains('재생성 중...').should('be.visible')

    cy.wait('@regenerateShot')

    // 업데이트된 이미지 확인
    cy.get('[data-testid="shot-image-5"]').should('have.attr', 'src').and('include', 'shot-5-v2')
    cy.get('[data-testid="shot-container-5"]').should('contain', 'v2') // 버전 표시 확인
    
    // 실시간 프롬프트 편집 테스트
    cy.get('[data-testid="shot-container-3"]').hover()
    cy.get('[data-testid="edit-prompt-3"]').click()
    
    const realTimePrompt = '실시간 편집: 숲의 수호자가 등장하는 미디엄 샷'
    cy.get('[data-testid="prompt-editor-3"]').clear().type(realTimePrompt)
    
    // 자동 저장 대기 (디바운스)
    cy.wait(2500)
    cy.get('[data-testid="auto-save-indicator"]').should('contain', '자동 저장됨')
    
    // 편집 모드 종료
    cy.get('button').contains('편집 완료').click()
    cy.get('[data-testid="edit-mode-indicator"]').should('not.exist')
  })

  // 시나리오 4: 스타일 일관성 확인 및 메트릭 표시
  it('should display style consistency metrics and deviations', () => {
    cy.visit(`/projects/${testProject.id}/storyboard`)

    // 전체 일관성 점수 확인
    cy.get('[data-testid="overall-consistency"]').should('contain', '85%')
    
    // 개별 샷 메트릭스 확인 (호버)
    cy.get('[data-testid="shot-container-1"]').trigger('mouseover')
    cy.get('[data-testid="style-metrics-tooltip"]').should('be.visible')
    cy.get('text').contains('일관성:').should('be.visible')
    cy.get('text').contains('색상 조화:').should('be.visible')
    
    // 일관성이 낮은 샷 표시 확인
    cy.intercept('GET', `/api/projects/${testProject.id}/consistency-report`, {
      statusCode: 200,
      body: {
        deviations: [
          {
            shotNumber: 8,
            deviationType: 'color',
            severity: 'high',
            description: '색상 팔레트가 다른 샷들과 상당히 다릅니다',
            suggestedFix: '따뜻한 색조로 조정 권장'
          }
        ]
      }
    }).as('getConsistencyReport')

    cy.get('button').contains('일관성 분석').click()
    cy.wait('@getConsistencyReport')

    // 일관성 문제가 있는 샷 하이라이트
    cy.get('[data-testid="shot-container-8"]').should('have.class', 'border-orange-500')
    cy.get('[data-testid="consistency-warning-8"]').should('be.visible')
    cy.get('text').contains('색상 팔레트가 다른 샷들과 상당히 다릅니다').should('be.visible')
  })

  // 시나리오 5: 스토리보드 내보내기 기능
  it('should export storyboard in multiple formats', () => {
    cy.visit(`/projects/${testProject.id}/storyboard`)

    // 내보내기 버튼 클릭
    cy.get('button').contains('스토리보드 내보내기').click()
    
    // 내보내기 옵션 다이얼로그
    cy.get('[data-testid="export-dialog"]').should('be.visible')
    cy.get('h3').contains('스토리보드 내보내기').should('be.visible')

    // PNG 그리드 내보내기
    cy.get('input[value="png_grid"]').check()
    cy.get('[data-testid="include-metrics"]').check() // 메트릭 포함
    cy.get('[data-testid="resolution-select"]').select('high')

    cy.intercept('POST', '/api/storyboard/export', {
      statusCode: 200,
      body: {
        exportId: 'export_123',
        outputUrls: [
          {
            type: 'grid',
            url: 'https://storage.googleapis.com/exports/storyboard-grid.png',
            filename: 'storyboard-grid-high.png'
          }
        ],
        status: 'completed'
      },
      delay: 2000
    }).as('exportStoryboard')

    cy.get('button').contains('내보내기 실행').click()

    // 내보내기 진행률 표시
    cy.get('[data-testid="export-progress"]').should('be.visible')
    cy.wait('@exportStoryboard')

    // 다운로드 링크 표시
    cy.get('[data-testid="download-link"]').should('be.visible')
    cy.get('a').contains('다운로드').should('have.attr', 'href').and('include', 'storyboard-grid.png')
    
    // PDF 내보내기도 테스트
    cy.get('input[value="pdf_document"]').check()
    cy.get('button').contains('내보내기 실행').click()
    cy.wait('@exportStoryboard')
  })

  // 시나리오 6: 성능 및 에러 처리
  it('should handle errors gracefully and meet performance requirements', () => {
    // API 오류 시뮬레이션
    cy.intercept('POST', '/api/gemini/image-generation', {
      statusCode: 503,
      body: { error: 'Service temporarily unavailable' }
    }).as('imageGenerationError')

    cy.visit(`/projects/${testProject.id}/planning`)
    
    // 스토리 생성 단계 스킵하여 이미지 생성으로 바로 이동
    cy.get('[data-testid="skip-to-images"]').click()
    cy.get('button').contains('스토리보드 이미지 생성').click()

    cy.wait('@imageGenerationError')

    // 에러 표시 확인
    cy.get('[data-testid="error-message"]').should('be.visible')
    cy.get('text').contains('이미지 생성에 실패했습니다').should('be.visible')
    cy.get('button').contains('재시도').should('be.visible')

    // 재시도 기능 테스트
    cy.intercept('POST', '/api/gemini/image-generation', {
      statusCode: 200,
      body: { projectId: testProject.id, images: mockApiResponses.imageGeneration }
    }).as('imageGenerationRetry')

    cy.get('button').contains('재시도').click()
    cy.wait('@imageGenerationRetry')

    // 성공적 복구 확인
    cy.get('[data-testid="storyboard-grid"]').should('be.visible')

    // 성능 요구사항 확인 (로딩 시간)
    cy.window().its('performance').invoke('now').as('startTime')
    cy.get('[data-testid="shot-image-1"]').should('be.visible')
    cy.window().its('performance').invoke('now').then(endTime => {
      cy.get('@startTime').then(startTime => {
        const loadTime = endTime - startTime
        expect(loadTime).to.be.lessThan(3000) // 3초 이내 로딩
      })
    })
  })

  // 시나리오 7: 접근성 및 키보드 네비게이션
  it('should be fully accessible with keyboard navigation', () => {
    cy.visit(`/projects/${testProject.id}/storyboard`)
    
    // 접근성 검사
    cy.injectAxe()
    cy.checkA11y()

    // 키보드 전용 네비게이션 테스트
    cy.get('body').tab()
    cy.focused().should('contain', '스토리보드 내보내기') // 첫 번째 포커스 가능한 요소

    // 그리드 네비게이션
    cy.get('[data-testid="shot-image-1"]').focus()
    cy.focused().tab() // 다음 샷으로 이동
    cy.focused().should('[data-testid="shot-image-2"]')

    // 스크린 리더 지원 확인
    cy.get('[data-testid="shot-image-1"]')
      .should('have.attr', 'alt')
      .and('include', '스토리보드 샷 1')

    cy.get('[role="progressbar"]')
      .should('have.attr', 'aria-label')
      .and('not.be.empty')

    // 고대비 모드 테스트
    cy.get('button[data-testid="toggle-high-contrast"]').click()
    cy.get('body').should('have.class', 'high-contrast')
    
    // 고대비 모드에서도 접근성 검사
    cy.checkA11y()
  })

  // 정리 작업
  afterEach(() => {
    // 로컬 스토리지 정리
    cy.clearLocalStorage()
    
    // 생성된 임시 파일 정리 (실제 환경에서)
    cy.task('cleanupTestFiles', testProject.id)
  })
})