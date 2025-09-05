/**
 * @fileoverview 비디오 기획 협업 E2E 테스트
 * @description 비디오 기획 위자드에서의 실시간 협업 기능 전체 워크플로우 테스트
 * @coverage 다중 사용자 협업, 실시간 동기화, 충돌 해결, 프로젝트 저장/로드
 */

describe('비디오 기획 협업 E2E 테스트', () => {
  beforeEach(() => {
    // 협업 데이터 초기화
    cy.request('POST', '/api/collaboration/reset')
    
    // 기본 프로젝트 데이터 설정
    cy.visit('/planning')
    cy.wait(1000) // 페이지 로드 대기
  })

  describe('기본 협업 기능', () => {
    it('비디오 기획 페이지에 활성 사용자 목록이 표시되어야 한다', () => {
      // 활성 사용자 목록 영역이 존재하는지 확인
      cy.get('[data-testid="active-users-list"]').should('be.visible')
      
      // 초기 사용자가 표시되는지 확인 (MSW 목 데이터)
      cy.get('[data-testid="active-users-list"]')
        .find('[data-testid^="user-"]')
        .should('have.length.greaterThan', 0)
      
      // 사용자 정보가 올바르게 표시되는지 확인
      cy.get('[data-testid="user-user1"]').within(() => {
        cy.contains('김작가').should('be.visible')
        cy.get('[data-testid="user-status-indicator"]').should('have.class', 'online')
      })
    })

    it('실시간 활동 피드가 동작해야 한다', () => {
      // 활동 피드 토글
      cy.get('[data-testid="toggle-activity-feed"]').click()
      
      // 활동 피드가 표시되는지 확인
      cy.get('[data-testid="activity-feed"]').should('be.visible')
      
      // 최근 활동이 표시되는지 확인
      cy.get('[data-testid="activity-feed"]')
        .find('[data-testid^="activity-"]')
        .should('have.length.greaterThan', 0)
      
      // 활동 내용이 올바르게 표시되는지 확인
      cy.get('[data-testid="activity-feed"]')
        .find('[data-testid^="activity-"]')
        .first()
        .within(() => {
          cy.get('[data-testid="activity-user"]').should('be.visible')
          cy.get('[data-testid="activity-action"]').should('be.visible')
          cy.get('[data-testid="activity-timestamp"]').should('be.visible')
        })
    })

    it('협업 설정이 올바르게 표시되어야 한다', () => {
      // 협업 설정 패널 열기
      cy.get('[data-testid="collaboration-settings-toggle"]').click()
      
      // 설정 옵션들이 표시되는지 확인
      cy.get('[data-testid="collaboration-settings-panel"]').should('be.visible')
      cy.get('[data-testid="polling-interval-setting"]').should('be.visible')
      cy.get('[data-testid="auto-sync-setting"]').should('be.visible')
      cy.get('[data-testid="conflict-resolution-setting"]').should('be.visible')
    })
  })

  describe('4단계 기획 협업 시나리오', () => {
    it('단계 수정 시 낙관적 업데이트와 실시간 동기화가 작동해야 한다', () => {
      // 비디오 기획 시작
      cy.get('[data-testid="start-planning-button"]').click()
      
      // 기본 정보 입력
      cy.get('[data-testid="video-title-input"]').type('협업 테스트 비디오')
      cy.get('[data-testid="logline-input"]').type('실시간 협업 기능을 테스트하는 비디오입니다')
      cy.get('[data-testid="generate-stages-button"]').click()
      
      // 4단계 생성 대기
      cy.get('[data-testid="stages-container"]', { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid^="stage-"]').should('have.length', 4)
      
      // 첫 번째 단계 수정
      cy.get('[data-testid="stage-1"]').within(() => {
        cy.get('[data-testid="edit-stage-button"]').click()
        cy.get('[data-testid="stage-content-input"]')
          .clear()
          .type('수정된 기 단계 내용입니다')
        cy.get('[data-testid="save-stage-button"]').click()
      })
      
      // 낙관적 업데이트 즉시 반영 확인
      cy.get('[data-testid="stage-1"]')
        .find('[data-testid="stage-content"]')
        .should('contain', '수정된 기 단계 내용입니다')
      
      // 협업 상태 표시 확인
      cy.get('[data-testid="collaboration-status"]').should('contain', '동기화 중')
      
      // 동기화 완료 대기
      cy.get('[data-testid="collaboration-status"]', { timeout: 5000 })
        .should('contain', '동기화됨')
      
      // 활동 피드에 변경사항 표시 확인
      cy.get('[data-testid="activity-feed"]').within(() => {
        cy.contains('단계 수정').should('be.visible')
        cy.contains('기 단계').should('be.visible')
      })
    })

    it('동시 편집 시 충돌이 감지되고 해결되어야 한다', () => {
      // 기획 시작 및 단계 생성
      cy.get('[data-testid="start-planning-button"]').click()
      cy.get('[data-testid="video-title-input"]').type('충돌 테스트 비디오')
      cy.get('[data-testid="logline-input"]').type('동시 편집 충돌 테스트')
      cy.get('[data-testid="generate-stages-button"]').click()
      
      cy.get('[data-testid="stages-container"]', { timeout: 10000 }).should('be.visible')
      
      // 강제 충돌 생성 (MSW를 통해)
      cy.request('POST', '/api/collaboration/force-conflict', {
        resourceId: 'stage-1',
        resourceType: 'video-planning'
      })
      
      // 첫 번째 단계 수정 시도
      cy.get('[data-testid="stage-1"]').within(() => {
        cy.get('[data-testid="edit-stage-button"]').click()
        cy.get('[data-testid="stage-content-input"]')
          .clear()
          .type('충돌 테스트를 위한 로컬 수정')
        cy.get('[data-testid="save-stage-button"]').click()
      })
      
      // 충돌 모달이 표시되는지 확인
      cy.get('[data-testid="conflict-resolution-modal"]', { timeout: 5000 })
        .should('be.visible')
      
      // 충돌 정보 표시 확인
      cy.get('[data-testid="conflict-modal"]').within(() => {
        cy.get('[data-testid="local-changes"]').should('contain', '충돌 테스트를 위한 로컬 수정')
        cy.get('[data-testid="remote-changes"]').should('be.visible')
        
        // 해결 옵션들 확인
        cy.get('[data-testid="resolution-option-local"]').should('be.visible')
        cy.get('[data-testid="resolution-option-remote"]').should('be.visible')
        cy.get('[data-testid="resolution-option-manual"]').should('be.visible')
      })
      
      // 로컬 변경사항으로 해결
      cy.get('[data-testid="resolution-option-local"]').click()
      cy.get('[data-testid="resolve-conflict-button"]').click()
      
      // 충돌 해결 완료 확인
      cy.get('[data-testid="conflict-resolution-modal"]').should('not.exist')
      cy.get('[data-testid="stage-1"]')
        .find('[data-testid="stage-content"]')
        .should('contain', '충돌 테스트를 위한 로컬 수정')
    })

    it('단계별 진행 상태가 실시간으로 동기화되어야 한다', () => {
      // 기획 진행
      cy.get('[data-testid="start-planning-button"]').click()
      cy.get('[data-testid="video-title-input"]').type('진행 상태 테스트')
      cy.get('[data-testid="logline-input"]').type('단계별 진행 상태 동기화 테스트')
      cy.get('[data-testid="generate-stages-button"]').click()
      
      cy.get('[data-testid="stages-container"]', { timeout: 10000 }).should('be.visible')
      
      // 12개 샷 생성 단계로 진행
      cy.get('[data-testid="proceed-to-shots-button"]').click()
      cy.get('[data-testid="generate-shots-button"]').click()
      
      // 12개 샷 생성 대기
      cy.get('[data-testid="shots-container"]', { timeout: 15000 }).should('be.visible')
      cy.get('[data-testid^="shot-"]').should('have.length', 12)
      
      // 진행 상태 표시 확인
      cy.get('[data-testid="progress-indicator"]').within(() => {
        cy.get('[data-testid="current-step"]').should('contain', '2')
        cy.get('[data-testid="total-steps"]').should('contain', '3')
        cy.get('[data-testid="progress-bar"]')
          .should('have.attr', 'value', '66') // 2/3 = 66%
      })
      
      // 다른 사용자의 진행 상태 시뮬레이션
      cy.request('POST', '/api/collaboration/simulate-user', {
        action: 'join',
        userId: 'collaborator-2',
        userData: {
          name: '협업자2',
          role: 'editor',
          currentStep: 'storyboard-generation'
        }
      })
      
      // 협업자 상태가 업데이트되는지 확인 (폴링을 통해)
      cy.wait(3000) // 폴링 주기 대기
      cy.get('[data-testid="user-collaborator-2"]').within(() => {
        cy.get('[data-testid="user-current-step"]')
          .should('contain', 'storyboard-generation')
      })
    })
  })

  describe('12개 샷 협업 시나리오', () => {
    beforeEach(() => {
      // 12개 샷 단계까지 진행
      cy.get('[data-testid="start-planning-button"]').click()
      cy.get('[data-testid="video-title-input"]').type('샷 협업 테스트')
      cy.get('[data-testid="logline-input"]').type('12개 샷 협업 기능 테스트')
      cy.get('[data-testid="generate-stages-button"]').click()
      
      cy.get('[data-testid="stages-container"]', { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid="proceed-to-shots-button"]').click()
      cy.get('[data-testid="generate-shots-button"]').click()
      cy.get('[data-testid="shots-container"]', { timeout: 15000 }).should('be.visible')
    })

    it('샷 순서 변경 시 실시간 동기화가 작동해야 한다', () => {
      // 첫 번째 샷을 세 번째 위치로 드래그
      cy.get('[data-testid="shot-1"]')
        .trigger('dragstart', { dataTransfer: {} })
      
      cy.get('[data-testid="shot-3"]')
        .trigger('drop', { dataTransfer: {} })
        .trigger('dragend')
      
      // 순서 변경이 즉시 반영되는지 확인
      cy.get('[data-testid="shots-list"] [data-testid^="shot-"]')
        .first()
        .should('have.attr', 'data-testid', 'shot-2')
      
      // 협업 상태 확인
      cy.get('[data-testid="collaboration-status"]').should('contain', '동기화 중')
      cy.get('[data-testid="collaboration-status"]', { timeout: 5000 })
        .should('contain', '동기화됨')
      
      // 활동 피드에서 순서 변경 기록 확인
      cy.get('[data-testid="activity-feed"]').within(() => {
        cy.contains('샷 순서 변경').should('be.visible')
      })
    })

    it('샷 내용 수정 시 협업 기능이 작동해야 한다', () => {
      // 첫 번째 샷 편집
      cy.get('[data-testid="shot-1"]').within(() => {
        cy.get('[data-testid="edit-shot-button"]').click()
      })
      
      // 샷 편집 모달이 열리는지 확인
      cy.get('[data-testid="shot-edit-modal"]').should('be.visible')
      
      // 샷 정보 수정
      cy.get('[data-testid="shot-title-input"]')
        .clear()
        .type('수정된 샷 제목')
      
      cy.get('[data-testid="shot-description-input"]')
        .clear()
        .type('실시간 협업으로 수정된 샷 설명입니다')
      
      cy.get('[data-testid="camera-move-select"]').select('줌아웃')
      cy.get('[data-testid="shot-duration-input"]').clear().type('5')
      
      // 저장
      cy.get('[data-testid="save-shot-button"]').click()
      
      // 모달이 닫히고 변경사항이 반영되는지 확인
      cy.get('[data-testid="shot-edit-modal"]').should('not.exist')
      cy.get('[data-testid="shot-1"]').within(() => {
        cy.get('[data-testid="shot-title"]').should('contain', '수정된 샷 제목')
        cy.get('[data-testid="shot-description"]')
          .should('contain', '실시간 협업으로 수정된 샷 설명입니다')
      })
      
      // 협업 상태 및 활동 피드 확인
      cy.get('[data-testid="collaboration-status"]', { timeout: 5000 })
        .should('contain', '동기화됨')
      
      cy.get('[data-testid="activity-feed"]').within(() => {
        cy.contains('샷 수정').should('be.visible')
        cy.contains('수정된 샷 제목').should('be.visible')
      })
    })

    it('스토리보드 생성 시 진행 상태가 공유되어야 한다', () => {
      // 첫 번째 샷의 스토리보드 생성 시작
      cy.get('[data-testid="shot-1"]').within(() => {
        cy.get('[data-testid="generate-storyboard-button"]').click()
      })
      
      // 스토리보드 생성 중 상태 표시 확인
      cy.get('[data-testid="shot-1"]').within(() => {
        cy.get('[data-testid="storyboard-generating"]').should('be.visible')
        cy.get('[data-testid="generation-progress"]').should('be.visible')
      })
      
      // 다른 사용자들에게도 상태가 표시되는지 확인
      cy.get('[data-testid="active-users-list"]').within(() => {
        cy.get('[data-testid="user-activity"]')
          .should('contain', '스토리보드 생성 중')
      })
      
      // 스토리보드 생성 완료 대기
      cy.get('[data-testid="shot-1"]')
        .find('[data-testid="storyboard-image"]', { timeout: 20000 })
        .should('be.visible')
      
      // 완료 상태 확인
      cy.get('[data-testid="shot-1"]').within(() => {
        cy.get('[data-testid="storyboard-generating"]').should('not.exist')
        cy.get('[data-testid="storyboard-completed"]').should('be.visible')
      })
    })

    it('인서트 컷 추가 시 협업이 작동해야 한다', () => {
      // 인서트 컷 추가 버튼 클릭
      cy.get('[data-testid="add-insert-cut-button"]').click()
      
      // 인서트 컷 편집 모달
      cy.get('[data-testid="insert-cut-modal"]').should('be.visible')
      
      // 인서트 컷 정보 입력
      cy.get('[data-testid="insert-title-input"]').type('협업 테스트 인서트')
      cy.get('[data-testid="insert-description-input"]')
        .type('실시간 협업으로 추가된 인서트 컷입니다')
      cy.get('[data-testid="insert-timing-input"]').type('30-32초 구간')
      cy.get('[data-testid="insert-purpose-input"]').type('강조 효과')
      
      // 저장
      cy.get('[data-testid="save-insert-cut-button"]').click()
      
      // 인서트 컷이 목록에 추가되었는지 확인
      cy.get('[data-testid="insert-cuts-list"]').within(() => {
        cy.get('[data-testid^="insert-cut-"]').should('have.length', 4) // 기본 3개 + 새로 추가된 1개
        cy.contains('협업 테스트 인서트').should('be.visible')
      })
      
      // 협업 상태 및 활동 피드 확인
      cy.get('[data-testid="collaboration-status"]', { timeout: 5000 })
        .should('contain', '동기화됨')
      
      cy.get('[data-testid="activity-feed"]').within(() => {
        cy.contains('인서트 컷 추가').should('be.visible')
        cy.contains('협업 테스트 인서트').should('be.visible')
      })
    })
  })

  describe('프로젝트 저장 및 로드 협업', () => {
    it('프로젝트 저장 시 협업 상태가 유지되어야 한다', () => {
      // 기획 완료까지 진행
      cy.get('[data-testid="start-planning-button"]').click()
      cy.get('[data-testid="video-title-input"]').type('저장 테스트 프로젝트')
      cy.get('[data-testid="logline-input"]').type('프로젝트 저장 협업 테스트')
      cy.get('[data-testid="generate-stages-button"]').click()
      
      cy.get('[data-testid="stages-container"]', { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid="proceed-to-shots-button"]').click()
      cy.get('[data-testid="generate-shots-button"]').click()
      cy.get('[data-testid="shots-container"]', { timeout: 15000 }).should('be.visible')
      
      // 프로젝트 저장
      cy.get('[data-testid="save-project-button"]').click()
      
      // 저장 모달 표시 확인
      cy.get('[data-testid="save-project-modal"]').should('be.visible')
      
      // 프로젝트 제목 입력
      cy.get('[data-testid="project-title-input"]')
        .clear()
        .type('협업 테스트 프로젝트 v1')
      
      // 저장 실행
      cy.get('[data-testid="confirm-save-button"]').click()
      
      // 저장 진행 상태 표시 확인
      cy.get('[data-testid="save-progress"]').should('be.visible')
      cy.get('[data-testid="save-progress"]').should('contain', '저장 중')
      
      // 저장 완료 확인
      cy.get('[data-testid="save-success"]', { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid="project-id"]').should('be.visible')
      
      // 협업 상태가 "프로젝트 저장됨"으로 표시되는지 확인
      cy.get('[data-testid="collaboration-status"]')
        .should('contain', '프로젝트 저장됨')
      
      // 활동 피드에 저장 기록 확인
      cy.get('[data-testid="activity-feed"]').within(() => {
        cy.contains('프로젝트 저장').should('be.visible')
        cy.contains('협업 테스트 프로젝트 v1').should('be.visible')
      })
    })

    it('저장된 프로젝트 로드 시 협업 상태가 복원되어야 한다', () => {
      // 프로젝트 로드 버튼 클릭
      cy.get('[data-testid="load-project-button"]').click()
      
      // 프로젝트 목록 모달 표시 확인
      cy.get('[data-testid="project-list-modal"]').should('be.visible')
      
      // 기존 프로젝트 선택 (MSW 목 데이터)
      cy.get('[data-testid="project-list"]').within(() => {
        cy.get('[data-testid="project-proj-vp-001"]').click()
      })
      
      // 로드 확인 버튼 클릭
      cy.get('[data-testid="load-project-button-confirm"]').click()
      
      // 로드 진행 상태 확인
      cy.get('[data-testid="load-progress"]').should('be.visible')
      cy.get('[data-testid="load-progress"]').should('contain', '불러오는 중')
      
      // 프로젝트 데이터 로드 완료 확인
      cy.get('[data-testid="stages-container"]', { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid="shots-container"]').should('be.visible')
      
      // 로드된 데이터 내용 확인
      cy.get('[data-testid^="stage-"]').should('have.length', 4)
      cy.get('[data-testid^="shot-"]').should('have.length', 12)
      
      // 협업 상태가 "프로젝트 로드됨"으로 표시되는지 확인
      cy.get('[data-testid="collaboration-status"]')
        .should('contain', '프로젝트 로드됨')
      
      // 활동 피드에 로드 기록 확인
      cy.get('[data-testid="activity-feed"]').within(() => {
        cy.contains('프로젝트 로드').should('be.visible')
        cy.contains('테스트 영상 기획').should('be.visible')
      })
      
      // 협업 기능이 정상적으로 복원되었는지 확인
      cy.get('[data-testid="active-users-list"]').should('be.visible')
      cy.get('[data-testid="collaboration-settings-toggle"]').should('be.visible')
    })

    it('동시에 같은 프로젝트를 편집할 때 버전 충돌이 처리되어야 한다', () => {
      // 프로젝트 로드
      cy.get('[data-testid="load-project-button"]').click()
      cy.get('[data-testid="project-proj-vp-001"]').click()
      cy.get('[data-testid="load-project-button-confirm"]').click()
      
      cy.get('[data-testid="stages-container"]', { timeout: 10000 }).should('be.visible')
      
      // 로컬 변경사항 생성
      cy.get('[data-testid="stage-1"]').within(() => {
        cy.get('[data-testid="edit-stage-button"]').click()
        cy.get('[data-testid="stage-content-input"]')
          .clear()
          .type('로컬에서 수정한 내용')
        cy.get('[data-testid="save-stage-button"]').click()
      })
      
      // 서버에서 버전 충돌 시뮬레이션
      cy.request('POST', '/api/collaboration/force-conflict', {
        resourceId: 'proj-vp-001',
        resourceType: 'project'
      })
      
      // 프로젝트 저장 시도
      cy.get('[data-testid="save-project-button"]').click()
      cy.get('[data-testid="confirm-save-button"]').click()
      
      // 버전 충돌 모달 표시 확인
      cy.get('[data-testid="version-conflict-modal"]', { timeout: 5000 })
        .should('be.visible')
      
      // 충돌 해결 옵션 확인
      cy.get('[data-testid="version-conflict-modal"]').within(() => {
        cy.get('[data-testid="conflict-option-merge"]').should('be.visible')
        cy.get('[data-testid="conflict-option-overwrite"]').should('be.visible')
        cy.get('[data-testid="conflict-option-reload"]').should('be.visible')
      })
      
      // 병합 옵션 선택
      cy.get('[data-testid="conflict-option-merge"]').click()
      cy.get('[data-testid="resolve-version-conflict-button"]').click()
      
      // 충돌 해결 완료 확인
      cy.get('[data-testid="version-conflict-modal"]').should('not.exist')
      cy.get('[data-testid="save-success"]', { timeout: 10000 }).should('be.visible')
    })
  })

  describe('성능 및 안정성 테스트', () => {
    it('대량의 동시 업데이트 시 성능이 유지되어야 한다', () => {
      // 기획 단계 진행
      cy.get('[data-testid="start-planning-button"]').click()
      cy.get('[data-testid="video-title-input"]').type('성능 테스트 프로젝트')
      cy.get('[data-testid="logline-input"]').type('대량 업데이트 성능 테스트')
      cy.get('[data-testid="generate-stages-button"]').click()
      
      cy.get('[data-testid="stages-container"]', { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid="proceed-to-shots-button"]').click()
      cy.get('[data-testid="generate-shots-button"]').click()
      cy.get('[data-testid="shots-container"]', { timeout: 15000 }).should('be.visible')
      
      const startTime = Date.now()
      
      // 여러 샷을 빠르게 연속 수정
      for (let i = 1; i <= 5; i++) {
        cy.get(`[data-testid="shot-${i}"]`).within(() => {
          cy.get('[data-testid="edit-shot-button"]').click()
        })
        
        cy.get('[data-testid="shot-title-input"]')
          .clear()
          .type(`성능 테스트 샷 ${i}`)
        
        cy.get('[data-testid="save-shot-button"]').click()
        
        // 모달이 닫힐 때까지 잠깐 대기
        cy.get('[data-testid="shot-edit-modal"]').should('not.exist')
      }
      
      // 모든 업데이트가 완료되고 동기화될 때까지 대기
      cy.get('[data-testid="collaboration-status"]', { timeout: 10000 })
        .should('contain', '동기화됨')
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // 성능 기준: 5개 연속 업데이트가 30초 이내에 완료되어야 함
      expect(duration).to.be.lessThan(30000)
      
      // UI가 여전히 반응하는지 확인
      cy.get('[data-testid="active-users-list"]').should('be.visible')
      cy.get('[data-testid="activity-feed"]').should('be.visible')
    })

    it('네트워크 장애 시 오프라인 모드가 작동해야 한다', () => {
      // 기획 진행
      cy.get('[data-testid="start-planning-button"]').click()
      cy.get('[data-testid="video-title-input"]').type('오프라인 테스트')
      cy.get('[data-testid="logline-input"]').type('네트워크 장애 테스트')
      cy.get('[data-testid="generate-stages-button"]').click()
      
      cy.get('[data-testid="stages-container"]', { timeout: 10000 }).should('be.visible')
      
      // 네트워크 오프라인 시뮬레이션
      cy.intercept('POST', '/api/collaboration/**', { forceNetworkError: true }).as('networkError')
      
      // 오프라인 상태에서 변경사항 생성
      cy.get('[data-testid="stage-1"]').within(() => {
        cy.get('[data-testid="edit-stage-button"]').click()
        cy.get('[data-testid="stage-content-input"]')
          .clear()
          .type('오프라인에서 수정한 내용')
        cy.get('[data-testid="save-stage-button"]').click()
      })
      
      // 오프라인 상태 표시 확인
      cy.get('[data-testid="collaboration-status"]')
        .should('contain', '오프라인')
      
      // 로컬 변경사항이 저장되었는지 확인
      cy.get('[data-testid="stage-1"]')
        .find('[data-testid="stage-content"]')
        .should('contain', '오프라인에서 수정한 내용')
      
      // 대기 중인 변경사항 표시 확인
      cy.get('[data-testid="pending-changes-indicator"]')
        .should('be.visible')
        .should('contain', '1개 변경사항 대기 중')
      
      // 네트워크 복구 시뮬레이션
      cy.intercept('POST', '/api/collaboration/**').as('networkRestore')
      
      // 자동 재연결 및 동기화 확인
      cy.get('[data-testid="collaboration-status"]', { timeout: 10000 })
        .should('contain', '동기화됨')
      
      // 대기 중이던 변경사항이 전송되었는지 확인
      cy.get('[data-testid="pending-changes-indicator"]')
        .should('not.exist')
    })

    it('메모리 사용량이 적정 수준을 유지해야 한다', () => {
      // 긴 세션 동안의 메모리 사용량 테스트
      cy.window().then((win) => {
        const initialMemory = win.performance.memory?.usedJSHeapSize || 0
        
        // 반복적인 작업 수행
        for (let i = 0; i < 10; i++) {
          cy.get('[data-testid="start-planning-button"]').click()
          cy.get('[data-testid="video-title-input"]').type(`메모리 테스트 ${i}`)
          cy.get('[data-testid="logline-input"]').type('메모리 사용량 테스트')
          cy.get('[data-testid="generate-stages-button"]').click()
          
          cy.get('[data-testid="stages-container"]', { timeout: 10000 }).should('be.visible')
          
          // 초기화
          cy.get('[data-testid="reset-planning-button"]').click()
          cy.get('[data-testid="confirm-reset-button"]').click()
        }
        
        cy.window().then((win) => {
          const finalMemory = win.performance.memory?.usedJSHeapSize || 0
          const memoryIncrease = finalMemory - initialMemory
          
          // 메모리 증가가 50MB 이하여야 함 (임의 기준)
          expect(memoryIncrease).to.be.lessThan(50 * 1024 * 1024)
        })
      })
    })
  })
})