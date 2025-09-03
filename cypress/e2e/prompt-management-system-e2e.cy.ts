/**
 * JSON 프롬프트 생성 및 가져오기/내보내기 시스템 E2E 테스트
 * 
 * 전체 워크플로우의 통합 테스트:
 * 1. 스토리 → 4막 구조 → 12샷 → JSON 프롬프트 생성
 * 2. 프롬프트 내보내기 (JSON, CSV, XML)
 * 3. 외부 도구 호환성 (OpenAI, Anthropic, HuggingFace)
 * 4. 프롬프트 가져오기 및 충돌 해결
 * 5. 데이터 무결성 검증
 * 6. 성능 요구사항 충족
 */

describe('JSON 프롬프트 관리 시스템 E2E 테스트', () => {
  beforeEach(() => {
    // 테스트 환경 초기화
    cy.visit('/prompt-management')
    cy.intercept('POST', '/api/prompts/generate', { fixture: 'prompt-generation-success.json' }).as('generatePrompt')
    cy.intercept('POST', '/api/prompts/export', { fixture: 'prompt-export-success.json' }).as('exportPrompt')
    cy.intercept('POST', '/api/prompts/import', { fixture: 'prompt-import-success.json' }).as('importPrompt')
    cy.intercept('GET', '/api/prompts/validate', { fixture: 'prompt-validation-success.json' }).as('validatePrompt')
  })

  describe('완전 자동 프롬프트 생성 워크플로우', () => {
    it('스토리에서 JSON 프롬프트까지 완전 자동 생성', () => {
      // 1단계: 스토리 입력
      cy.get('[data-cy="story-input-form"]').should('be.visible')
      cy.get('[data-cy="story-title"]').type('카페에서의 운명적 만남')
      cy.get('[data-cy="story-description"]').type('바쁜 도시의 작은 카페에서 우연히 마주친 두 사람의 첫 만남과 로맨틱한 순간들')
      cy.get('[data-cy="story-genre"]').select('romance')
      cy.get('[data-cy="story-duration"]').type('180')
      
      // 스타일 설정
      cy.get('[data-cy="art-style"]').select('cinematic')
      cy.get('[data-cy="color-palette"]').select('warm_tones')
      cy.get('[data-cy="visual-mood"]').select('romantic')
      cy.get('[data-cy="aspect-ratio"]').select('16:9')
      
      // 캐릭터 추가
      cy.get('[data-cy="add-character-btn"]').click()
      cy.get('[data-cy="character-name"]').type('지민')
      cy.get('[data-cy="character-role"]').select('female_lead')
      cy.get('[data-cy="character-description"]').type('독립적이고 창의적인 그래픽 디자이너')
      
      // 2단계: 자동 생성 시작
      cy.get('[data-cy="generate-prompt-btn"]').click()
      
      // 진행률 표시 확인
      cy.get('[data-cy="generation-progress"]').should('be.visible')
      cy.get('[data-cy="progress-step-1"]').should('contain', '스토리 분석 중')
      
      // 4막 구조 생성 완료 확인
      cy.wait('@generatePrompt', { timeout: 30000 })
      cy.get('[data-cy="progress-step-2"]').should('contain', '4막 구조 생성 완료')
      cy.get('[data-cy="four-act-preview"]').should('be.visible')
      cy.get('[data-cy="act-1-title"]').should('contain', '도입')
      cy.get('[data-cy="act-2-title"]').should('contain', '발전')
      cy.get('[data-cy="act-3-title"]').should('contain', '절정')
      cy.get('[data-cy="act-4-title"]').should('contain', '해결')
      
      // 12샷 계획 생성 확인
      cy.get('[data-cy="progress-step-3"]').should('contain', '12샷 계획 생성 완료')
      cy.get('[data-cy="shot-breakdown"]').should('be.visible')
      cy.get('[data-cy="shot-item"]').should('have.length', 12)
      
      // JSON 프롬프트 생성 완료
      cy.get('[data-cy="progress-step-4"]').should('contain', 'JSON 프롬프트 생성 완료')
      cy.get('[data-cy="json-prompt-preview"]').should('be.visible')
      
      // 품질 검증 통과 확인
      cy.get('[data-cy="quality-validation"]').should('contain', '품질 검증 통과')
      cy.get('[data-cy="consistency-score"]').should('contain', '75%') // 최소 임계값
      
      // 최종 결과 확인
      cy.get('[data-cy="generation-complete"]').should('be.visible')
      cy.get('[data-cy="generated-prompt-id"]').should('match', /^prompt_[a-zA-Z0-9]+$/)
      cy.get('[data-cy="total-generation-time"]').should('be.visible')
    })

    it('배치 프롬프트 생성 (다중 스토리)', () => {
      cy.get('[data-cy="batch-generation-tab"]').click()
      
      // 다중 스토리 입력
      const stories = [
        { title: '서점 만남', genre: 'romance', duration: 120 },
        { title: '공원 산책', genre: 'drama', duration: 90 },
        { title: '카페 대화', genre: 'romance', duration: 150 }
      ]
      
      stories.forEach((story, index) => {
        cy.get('[data-cy="add-story-btn"]').click()
        cy.get(`[data-cy="batch-story-${index}"]`).within(() => {
          cy.get('[data-cy="story-title"]').type(story.title)
          cy.get('[data-cy="story-genre"]').select(story.genre)
          cy.get('[data-cy="story-duration"]').type(story.duration.toString())
        })
      })
      
      // 배치 설정
      cy.get('[data-cy="batch-size"]').clear().type('2')
      cy.get('[data-cy="parallel-processing"]').check()
      
      // 배치 생성 실행
      cy.get('[data-cy="start-batch-generation"]').click()
      
      // 배치 진행률 모니터링
      cy.get('[data-cy="batch-progress"]').should('be.visible')
      cy.get('[data-cy="batch-progress-bar"]').should('exist')
      
      // 각 스토리별 결과 확인
      cy.wait('@generatePrompt', { timeout: 60000 })
      cy.get('[data-cy="batch-results"]').should('be.visible')
      cy.get('[data-cy="successful-generations"]').should('contain', '3')
      cy.get('[data-cy="failed-generations"]').should('contain', '0')
      
      // 개별 결과 상세보기
      cy.get('[data-cy="batch-result-0"]').click()
      cy.get('[data-cy="prompt-detail-modal"]').should('be.visible')
      cy.get('[data-cy="prompt-json"]').should('contain', 'videoPlanetPrompt')
    })

    it('실시간 미리보기 및 사용자 수정', () => {
      // 기본 스토리 입력
      cy.get('[data-cy="story-title"]').type('테스트 스토리')
      cy.get('[data-cy="story-description"]').type('테스트용 스토리 설명')
      
      // 실시간 미리보기 모드 활성화
      cy.get('[data-cy="live-preview-toggle"]').check()
      
      // 1단계 미리보기
      cy.get('[data-cy="preview-story-analysis"]').should('be.visible')
      cy.get('[data-cy="detected-themes"]').should('contain', 'romance')
      
      // 4막 구조 수정
      cy.get('[data-cy="edit-four-act-btn"]').click()
      cy.get('[data-cy="act-1-duration"]').clear().type('45')
      cy.get('[data-cy="save-act-changes"]').click()
      
      // 수정사항 반영 확인
      cy.get('[data-cy="act-1-duration-display"]').should('contain', '45초')
      
      // 샷 수동 편집
      cy.get('[data-cy="edit-shot-1"]').click()
      cy.get('[data-cy="shot-description"]').clear().type('수정된 샷 설명')
      cy.get('[data-cy="camera-angle"]').select('close')
      cy.get('[data-cy="save-shot"]').click()
      
      // 최종 JSON 생성
      cy.get('[data-cy="finalize-generation"]').click()
      cy.get('[data-cy="json-output"]').should('contain', '수정된 샷 설명')
    })
  })

  describe('다중 형식 내보내기 시스템', () => {
    beforeEach(() => {
      // 기존 프롬프트가 있다고 가정
      cy.get('[data-cy="existing-prompts-list"]').should('exist')
      cy.get('[data-cy="prompt-item"]').first().as('testPrompt')
    })

    it('JSON 형식 내보내기', () => {
      cy.get('@testPrompt').find('[data-cy="export-btn"]').click()
      cy.get('[data-cy="export-modal"]').should('be.visible')
      
      // JSON 형식 선택
      cy.get('[data-cy="export-format-json"]').check()
      
      // 옵션 설정
      cy.get('[data-cy="include-metadata"]').check()
      cy.get('[data-cy="include-usage-stats"]').check()
      cy.get('[data-cy="compression"]').select('gzip')
      
      // 내보내기 실행
      cy.get('[data-cy="start-export"]').click()
      
      cy.wait('@exportPrompt')
      cy.get('[data-cy="export-success"]').should('be.visible')
      cy.get('[data-cy="download-link"]').should('be.visible')
      cy.get('[data-cy="file-size"]').should('match', /\d+\s*(KB|MB)/)
      cy.get('[data-cy="compression-ratio"]').should('contain', '3:1')
    })

    it('CSV 형식 내보내기', () => {
      cy.get('@testPrompt').find('[data-cy="export-btn"]').click()
      
      // CSV 형식 선택
      cy.get('[data-cy="export-format-csv"]').check()
      
      // 필드 선택
      cy.get('[data-cy="field-selection"]').click()
      cy.get('[data-cy="field-id"]').check()
      cy.get('[data-cy="field-title"]').check()
      cy.get('[data-cy="field-category"]').check()
      cy.get('[data-cy="field-estimated-tokens"]').check()
      
      cy.get('[data-cy="start-export"]').click()
      
      cy.wait('@exportPrompt')
      cy.get('[data-cy="csv-preview"]').should('be.visible')
      cy.get('[data-cy="csv-preview"]').should('contain', 'id,title,category,estimatedTokens')
    })

    it('다중 형식 동시 내보내기', () => {
      // 여러 프롬프트 선택
      cy.get('[data-cy="select-all-prompts"]').check()
      cy.get('[data-cy="bulk-export-btn"]').click()
      
      // 다중 형식 선택
      cy.get('[data-cy="export-format-multiple"]').check()
      cy.get('[data-cy="format-json"]').check()
      cy.get('[data-cy="format-csv"]').check()
      cy.get('[data-cy="format-xml"]').check()
      
      // 매니페스트 포함
      cy.get('[data-cy="include-manifest"]').check()
      
      cy.get('[data-cy="start-bulk-export"]').click()
      
      // 진행률 모니터링
      cy.get('[data-cy="export-progress"]').should('be.visible')
      cy.get('[data-cy="current-format"]').should('be.visible')
      
      cy.wait('@exportPrompt', { timeout: 30000 })
      
      // 결과 확인
      cy.get('[data-cy="export-results"]').should('be.visible')
      cy.get('[data-cy="json-file-link"]').should('be.visible')
      cy.get('[data-cy="csv-file-link"]').should('be.visible')
      cy.get('[data-cy="xml-file-link"]').should('be.visible')
      cy.get('[data-cy="manifest-link"]').should('be.visible')
    })

    it('암호화된 내보내기', () => {
      cy.get('@testPrompt').find('[data-cy="export-btn"]').click()
      
      // 암호화 옵션 활성화
      cy.get('[data-cy="enable-encryption"]').check()
      cy.get('[data-cy="encryption-algorithm"]').select('AES-256')
      cy.get('[data-cy="encryption-password"]').type('secure-password-123')
      cy.get('[data-cy="confirm-password"]').type('secure-password-123')
      
      cy.get('[data-cy="start-export"]').click()
      
      cy.wait('@exportPrompt')
      cy.get('[data-cy="encryption-info"]').should('be.visible')
      cy.get('[data-cy="encryption-algorithm-display"]').should('contain', 'AES-256')
      cy.get('[data-cy="encrypted-file-notice"]').should('be.visible')
    })
  })

  describe('외부 도구 호환성 및 가져오기', () => {
    it('OpenAI DALL-E 형식으로 변환 및 내보내기', () => {
      cy.get('[data-cy="external-compatibility-tab"]').click()
      cy.get('[data-cy="openai-section"]').should('be.visible')
      
      // 기존 프롬프트 선택
      cy.get('[data-cy="prompt-selector"]').select('prompt_test_001')
      
      // OpenAI 변환 설정
      cy.get('[data-cy="openai-model"]').select('dall-e-3')
      cy.get('[data-cy="include-style-instructions"]').check()
      cy.get('[data-cy="max-prompt-length"]').clear().type('4000')
      
      // 변환 실행
      cy.get('[data-cy="convert-to-openai"]').click()
      
      // 변환 결과 확인
      cy.get('[data-cy="openai-preview"]').should('be.visible')
      cy.get('[data-cy="openai-model-display"]').should('contain', 'dall-e-3')
      cy.get('[data-cy="openai-size"]').should('contain', '1792x1024')
      cy.get('[data-cy="openai-prompt"]').should('have.length.at.most', 4000)
      
      // 내보내기
      cy.get('[data-cy="export-openai"]').click()
      cy.get('[data-cy="openai-json-download"]').should('be.visible')
    })

    it('Anthropic Claude 형식으로 변환', () => {
      cy.get('[data-cy="anthropic-section"]').should('be.visible')
      
      cy.get('[data-cy="prompt-selector"]').select('prompt_test_001')
      
      // Anthropic 설정
      cy.get('[data-cy="anthropic-model"]').select('claude-3-sonnet-20240229')
      cy.get('[data-cy="include-analysis"]').check()
      cy.get('[data-cy="response-format"]').select('detailed_description')
      cy.get('[data-cy="include-system-prompt"]').check()
      
      cy.get('[data-cy="convert-to-anthropic"]').click()
      
      // 결과 확인
      cy.get('[data-cy="anthropic-preview"]').should('be.visible')
      cy.get('[data-cy="anthropic-messages"]').should('have.length', 1)
      cy.get('[data-cy="anthropic-system-prompt"]').should('be.visible')
      cy.get('[data-cy="anthropic-max-tokens"]').should('contain', '1000')
    })

    it('HuggingFace 형식으로 변환', () => {
      cy.get('[data-cy="huggingface-section"]').should('be.visible')
      
      // HuggingFace 설정
      cy.get('[data-cy="hf-model"]').select('stabilityai/stable-diffusion-xl-base-1.0')
      cy.get('[data-cy="optimize-for-model"]').check()
      cy.get('[data-cy="include-negative-prompt"]').check()
      
      cy.get('[data-cy="convert-to-huggingface"]').click()
      
      // 결과 확인
      cy.get('[data-cy="hf-preview"]').should('be.visible')
      cy.get('[data-cy="hf-inputs"]').should('be.visible')
      cy.get('[data-cy="hf-width"]').should('contain', '1344')
      cy.get('[data-cy="hf-height"]').should('contain', '768')
      cy.get('[data-cy="hf-negative-prompt"]').should('contain', 'low quality')
    })

    it('외부 파일 가져오기 및 충돌 해결', () => {
      cy.get('[data-cy="import-tab"]').click()
      
      // 파일 업로드
      cy.get('[data-cy="file-upload"]').selectFile('cypress/fixtures/sample-openai-prompts.json')
      
      // 소스 형식 감지 확인
      cy.get('[data-cy="detected-format"]').should('contain', 'OpenAI')
      cy.get('[data-cy="detected-prompts-count"]').should('contain', '5')
      
      // 가져오기 설정
      cy.get('[data-cy="overwrite-existing"]').uncheck()
      cy.get('[data-cy="preserve-ids"]').check()
      cy.get('[data-cy="validate-integrity"]').check()
      
      // 충돌 해결 전략 설정
      cy.get('[data-cy="conflict-strategy"]').select('merge')
      
      // 가져오기 시작
      cy.get('[data-cy="start-import"]').click()
      
      cy.wait('@importPrompt')
      
      // 결과 확인
      cy.get('[data-cy="import-results"]').should('be.visible')
      cy.get('[data-cy="imported-count"]').should('contain', '3') // 2개 충돌로 3개만 가져오기
      cy.get('[data-cy="conflicts-count"]').should('contain', '2')
      
      // 충돌 상세 보기
      cy.get('[data-cy="view-conflicts"]').click()
      cy.get('[data-cy="conflict-item"]').should('have.length', 2)
      cy.get('[data-cy="conflict-resolution"]').first().should('contain', 'merged')
    })
  })

  describe('데이터 무결성 및 품질 검증', () => {
    it('실시간 데이터 무결성 검증', () => {
      // 잘못된 데이터로 프롬프트 생성 시도
      cy.get('[data-cy="story-title"]').clear() // 필수 필드 비우기
      cy.get('[data-cy="story-duration"]').clear().type('-100') // 잘못된 값
      
      cy.get('[data-cy="generate-prompt-btn"]').click()
      
      // 검증 오류 표시 확인
      cy.get('[data-cy="validation-errors"]').should('be.visible')
      cy.get('[data-cy="error-required-title"]').should('contain', '제목은 필수입니다')
      cy.get('[data-cy="error-invalid-duration"]').should('contain', '지속시간은 양수여야 합니다')
      
      // 자동 복구 제안
      cy.get('[data-cy="auto-fix-btn"]').click()
      cy.get('[data-cy="story-title"]').should('have.value', '제목 없음')
      cy.get('[data-cy="story-duration"]').should('have.value', '120')
    })

    it('대용량 데이터 처리 성능 검증', () => {
      cy.get('[data-cy="performance-test-tab"]').click()
      
      // 성능 테스트 시작
      cy.get('[data-cy="test-data-size"]').select('1000') // 1000개 프롬프트
      cy.get('[data-cy="start-performance-test"]').click()
      
      // 성능 지표 모니터링
      cy.get('[data-cy="performance-metrics"]').should('be.visible')
      cy.get('[data-cy="processing-speed"]', { timeout: 30000 }).should('be.visible')
      cy.get('[data-cy="memory-usage"]').should('be.visible')
      
      // 성능 요구사항 충족 확인
      cy.get('[data-cy="generation-time"]').should('match', /[0-9]+ms/) 
      cy.get('[data-cy="memory-usage"]').should('match', /<50MB/)
      cy.get('[data-cy="success-rate"]').should('contain', '100%')
    })

    it('품질 점수 및 개선 제안', () => {
      // 기존 프롬프트 품질 분석
      cy.get('[data-cy="quality-analysis-tab"]').click()
      cy.get('[data-cy="analyze-prompt-btn"]').click()
      
      cy.wait('@validatePrompt')
      
      // 품질 지표 확인
      cy.get('[data-cy="quality-score"]').should('be.visible')
      cy.get('[data-cy="consistency-score"]').should('match', /\d{1,3}%/)
      cy.get('[data-cy="completeness-score"]').should('match', /\d{1,3}%/)
      cy.get('[data-cy="technical-score"]').should('match', /\d{1,3}%/)
      
      // 개선 제안 확인
      cy.get('[data-cy="improvement-suggestions"]').should('be.visible')
      cy.get('[data-cy="suggestion-item"]').should('have.length.at.least', 1)
      
      // 자동 최적화 적용
      cy.get('[data-cy="apply-optimization"]').click()
      cy.get('[data-cy="optimization-result"]').should('contain', '품질 점수가 향상되었습니다')
    })
  })

  describe('통합 워크플로우 및 사용자 경험', () => {
    it('완전한 end-to-end 워크플로우', () => {
      // 1. 새 프로젝트 생성
      cy.get('[data-cy="new-project-btn"]').click()
      cy.get('[data-cy="project-name"]').type('E2E 테스트 프로젝트')
      cy.get('[data-cy="create-project"]').click()
      
      // 2. 스토리 생성 및 프롬프트 자동 생성
      cy.get('[data-cy="add-story-btn"]').click()
      cy.get('[data-cy="story-title"]').type('완전한 워크플로우 테스트')
      cy.get('[data-cy="story-description"]').type('E2E 테스트를 위한 통합 워크플로우')
      cy.get('[data-cy="generate-auto"]').click()
      
      cy.wait('@generatePrompt', { timeout: 30000 })
      
      // 3. 생성된 프롬프트 검증
      cy.get('[data-cy="generated-prompts-list"]').should('be.visible')
      cy.get('[data-cy="prompt-item"]').should('have.length', 1)
      
      // 4. 다중 형식 내보내기
      cy.get('[data-cy="export-all-formats"]').click()
      
      cy.wait('@exportPrompt')
      cy.get('[data-cy="export-complete"]').should('be.visible')
      
      // 5. 새 프로젝트에서 가져오기 테스트
      cy.get('[data-cy="new-project-btn"]').click()
      cy.get('[data-cy="project-name"]').type('가져오기 테스트 프로젝트')
      cy.get('[data-cy="create-project"]').click()
      
      cy.get('[data-cy="import-tab"]').click()
      cy.get('[data-cy="import-from-project"]').select('E2E 테스트 프로젝트')
      cy.get('[data-cy="start-import"]').click()
      
      cy.wait('@importPrompt')
      
      // 6. 최종 검증
      cy.get('[data-cy="imported-prompts"]').should('have.length', 1)
      cy.get('[data-cy="data-integrity-check"]').should('contain', '통과')
      
      // 성능 메트릭 확인
      cy.get('[data-cy="total-workflow-time"]').should('be.visible')
      cy.get('[data-cy="workflow-success-rate"]').should('contain', '100%')
    })

    it('오류 복구 및 사용자 피드백', () => {
      // 네트워크 오류 시뮬레이션
      cy.intercept('POST', '/api/prompts/generate', { 
        statusCode: 500, 
        body: { error: 'Internal Server Error' }
      }).as('generatePromptError')
      
      cy.get('[data-cy="story-title"]').type('네트워크 오류 테스트')
      cy.get('[data-cy="generate-prompt-btn"]').click()
      
      cy.wait('@generatePromptError')
      
      // 오류 처리 확인
      cy.get('[data-cy="error-message"]').should('be.visible')
      cy.get('[data-cy="error-details"]').should('contain', 'Internal Server Error')
      cy.get('[data-cy="retry-btn"]').should('be.visible')
      cy.get('[data-cy="support-contact"]').should('be.visible')
      
      // 자동 재시도 기능
      cy.intercept('POST', '/api/prompts/generate', { fixture: 'prompt-generation-success.json' }).as('generatePromptRetry')
      cy.get('[data-cy="auto-retry-toggle"]').check()
      
      cy.wait('@generatePromptRetry', { timeout: 10000 })
      cy.get('[data-cy="retry-success"]').should('be.visible')
    })

    it('접근성 및 사용성 검증', () => {
      // 키보드 네비게이션
      cy.get('body').tab()
      cy.focused().should('have.attr', 'data-cy', 'story-title')
      
      // 스크린 리더 지원
      cy.get('[data-cy="story-title"]').should('have.attr', 'aria-label')
      cy.get('[data-cy="generate-prompt-btn"]').should('have.attr', 'aria-describedby')
      
      // 고대비 모드
      cy.get('[data-cy="accessibility-menu"]').click()
      cy.get('[data-cy="high-contrast-mode"]').click()
      cy.get('body').should('have.class', 'high-contrast')
      
      // 다국어 지원
      cy.get('[data-cy="language-selector"]').select('en')
      cy.get('[data-cy="story-title-label"]').should('contain', 'Story Title')
    })

    it('모바일 반응형 테스트', () => {
      // 모바일 뷰포트로 변경
      cy.viewport('iphone-x')
      
      // 모바일 UI 요소 확인
      cy.get('[data-cy="mobile-menu-btn"]').should('be.visible')
      cy.get('[data-cy="mobile-menu-btn"]').click()
      cy.get('[data-cy="mobile-nav"]').should('be.visible')
      
      // 터치 인터랙션
      cy.get('[data-cy="story-input-form"]').should('be.visible')
      cy.get('[data-cy="mobile-generate-btn"]').should('be.visible')
      
      // 모바일 최적화된 진행률 표시
      cy.get('[data-cy="mobile-progress"]').should('exist')
      
      // 스와이프 제스처 (시뮬레이션)
      cy.get('[data-cy="prompt-carousel"]')
        .trigger('touchstart', { touches: [{ clientX: 300, clientY: 100 }] })
        .trigger('touchmove', { touches: [{ clientX: 100, clientY: 100 }] })
        .trigger('touchend')
      
      cy.get('[data-cy="carousel-next-item"]').should('be.visible')
    })
  })
})