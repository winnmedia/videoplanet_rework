/**
 * @fileoverview 캘린더 협업 E2E 테스트
 * @description 캘린더에서의 실시간 협업 기능 전체 워크플로우 테스트
 * @coverage 다중 사용자 일정 관리, 충돌 감지, 실시간 동기화, 드래그앤드롭 협업
 */

describe('캘린더 협업 E2E 테스트', () => {
  beforeEach(() => {
    // 협업 데이터 초기화
    cy.request('POST', '/api/collaboration/reset')
    
    // 캘린더 페이지 접속
    cy.visit('/calendar')
    cy.wait(1000) // 페이지 로드 대기
  })

  describe('기본 협업 환경 설정', () => {
    it('캘린더 페이지에 협업 UI가 표시되어야 한다', () => {
      // 활성 사용자 목록 (간소화된 버전)
      cy.get('[data-testid="calendar-active-users"]').should('be.visible')
      
      // 협업 상태 표시
      cy.get('[data-testid="collaboration-status"]').should('be.visible')
      cy.get('[data-testid="collaboration-status"]').should('contain', '연결됨')
      
      // 실시간 동기화 표시기
      cy.get('[data-testid="sync-indicator"]').should('be.visible')
      
      // 충돌 알림 영역
      cy.get('[data-testid="conflict-notification-area"]').should('be.visible')
    })

    it('다른 사용자가 참여할 때 실시간으로 표시되어야 한다', () => {
      // 초기 사용자 수 확인
      cy.get('[data-testid="calendar-active-users"]')
        .find('[data-testid^="user-"]')
        .then($users => {
          const initialCount = $users.length
          
          // 새 사용자 참여 시뮬레이션
          cy.request('POST', '/api/collaboration/simulate-user', {
            action: 'join',
            userId: 'calendar-user-new',
            userData: {
              name: '새로운 협업자',
              role: 'editor',
              section: 'calendar'
            }
          })
          
          // 폴링 주기 대기 (캘린더는 5초 주기)
          cy.wait(6000)
          
          // 새 사용자가 추가되었는지 확인
          cy.get('[data-testid="calendar-active-users"]')
            .find('[data-testid^="user-"]')
            .should('have.length', initialCount + 1)
          
          // 새 사용자 정보 확인
          cy.get('[data-testid="user-calendar-user-new"]').within(() => {
            cy.contains('새로운 협업자').should('be.visible')
            cy.get('[data-testid="user-status-online"]').should('be.visible')
          })
        })
    })

    it('협업 설정이 캘린더에 맞게 표시되어야 한다', () => {
      // 캘린더 협업 설정 열기
      cy.get('[data-testid="calendar-settings-button"]').click()
      
      // 캘린더 특화 설정들 확인
      cy.get('[data-testid="calendar-collaboration-settings"]').should('be.visible')
      cy.get('[data-testid="auto-conflict-resolution"]').should('be.visible')
      cy.get('[data-testid="time-slot-locking"]').should('be.visible')
      cy.get('[data-testid="overlap-prevention"]').should('be.visible')
      cy.get('[data-testid="team-calendar-sync"]').should('be.visible')
    })
  })

  describe('일정 생성 및 수정 협업', () => {
    it('새 일정 생성 시 실시간 동기화가 작동해야 한다', () => {
      // 빈 시간대 클릭하여 일정 생성
      cy.get('[data-testid="calendar-grid"]')
        .find('[data-testid="time-slot-9-00"]')
        .click()
      
      // 일정 생성 모달 표시 확인
      cy.get('[data-testid="event-create-modal"]').should('be.visible')
      
      // 일정 정보 입력
      cy.get('[data-testid="event-title-input"]')
        .type('협업 테스트 회의')
      
      cy.get('[data-testid="event-description-input"]')
        .type('실시간 협업 기능을 테스트하는 회의입니다')
      
      cy.get('[data-testid="event-duration-input"]').select('1시간')
      cy.get('[data-testid="event-participants-input"]').type('김작가, 박편집자')
      
      // 저장
      cy.get('[data-testid="save-event-button"]').click()
      
      // 모달이 닫히고 일정이 캘린더에 표시되는지 확인
      cy.get('[data-testid="event-create-modal"]').should('not.exist')
      cy.get('[data-testid="calendar-event-협업-테스트-회의"]').should('be.visible')
      
      // 협업 상태 확인
      cy.get('[data-testid="collaboration-status"]').should('contain', '동기화 중')
      cy.get('[data-testid="collaboration-status"]', { timeout: 8000 })
        .should('contain', '동기화됨')
      
      // 활동 알림이 다른 사용자들에게 표시되는지 확인
      cy.get('[data-testid="calendar-activity-notification"]')
        .should('be.visible')
        .should('contain', '새 일정이 추가되었습니다')
    })

    it('일정 수정 시 낙관적 업데이트와 동기화가 작동해야 한다', () => {
      // 기존 일정 클릭 (목 데이터에 있는 일정)
      cy.get('[data-testid="calendar-event-기존-일정"]').click()
      
      // 일정 수정 모달 표시 확인
      cy.get('[data-testid="event-edit-modal"]').should('be.visible')
      
      // 제목 수정
      cy.get('[data-testid="event-title-input"]')
        .clear()
        .type('수정된 일정 제목')
      
      // 시간 변경
      cy.get('[data-testid="event-start-time"]').clear().type('10:00')
      cy.get('[data-testid="event-end-time"]').clear().type('11:30')
      
      // 저장
      cy.get('[data-testid="save-event-button"]').click()
      
      // 낙관적 업데이트로 즉시 반영되는지 확인
      cy.get('[data-testid="event-edit-modal"]').should('not.exist')
      cy.get('[data-testid="calendar-event-수정된-일정-제목"]').should('be.visible')
      
      // 새로운 시간대에 일정이 이동했는지 확인
      cy.get('[data-testid="time-slot-10-00"]')
        .find('[data-testid="calendar-event-수정된-일정-제목"]')
        .should('be.visible')
      
      // 협업 상태 및 동기화 확인
      cy.get('[data-testid="sync-indicator"]').should('have.class', 'syncing')
      cy.get('[data-testid="sync-indicator"]', { timeout: 8000 })
        .should('have.class', 'synced')
    })

    it('드래그앤드롭으로 일정 이동 시 실시간 협업이 작동해야 한다', () => {
      // 일정을 다른 시간대로 드래그
      cy.get('[data-testid="calendar-event-기존-일정"]')
        .trigger('dragstart', { dataTransfer: {} })
      
      cy.get('[data-testid="time-slot-14-00"]')
        .trigger('drop', { dataTransfer: {} })
        .trigger('dragend')
      
      // 드래그 결과가 즉시 반영되는지 확인
      cy.get('[data-testid="time-slot-14-00"]')
        .find('[data-testid="calendar-event-기존-일정"]')
        .should('be.visible')
      
      // 드래그 중 다른 사용자에게 실시간 표시되는지 확인
      cy.get('[data-testid="drag-feedback"]')
        .should('contain', '일정을 이동 중입니다')
      
      // 이동 완료 후 협업 상태 확인
      cy.get('[data-testid="collaboration-status"]', { timeout: 8000 })
        .should('contain', '동기화됨')
      
      // 이동 알림이 표시되는지 확인
      cy.get('[data-testid="calendar-activity-notification"]')
        .should('contain', '일정이 이동되었습니다')
    })

    it('일정 삭제 시 협업 확인 절차가 작동해야 한다', () => {
      // 일정 우클릭으로 컨텍스트 메뉴 열기
      cy.get('[data-testid="calendar-event-기존-일정"]')
        .rightclick()
      
      // 컨텍스트 메뉴 확인
      cy.get('[data-testid="event-context-menu"]').should('be.visible')
      cy.get('[data-testid="delete-event-option"]').click()
      
      // 삭제 확인 모달 (다른 참여자가 있을 때)
      cy.get('[data-testid="delete-confirmation-modal"]').should('be.visible')
      cy.get('[data-testid="delete-confirmation-modal"]').within(() => {
        cy.contains('다른 참여자들에게 알림이 전송됩니다').should('be.visible')
        cy.get('[data-testid="delete-reason-input"]').type('일정 취소 사유')
        cy.get('[data-testid="notify-participants-checkbox"]').check()
      })
      
      // 삭제 확인
      cy.get('[data-testid="confirm-delete-button"]').click()
      
      // 일정이 캘린더에서 제거되는지 확인
      cy.get('[data-testid="calendar-event-기존-일정"]').should('not.exist')
      
      // 삭제 알림이 표시되는지 확인
      cy.get('[data-testid="calendar-activity-notification"]')
        .should('contain', '일정이 삭제되었습니다')
      
      // 협업 동기화 확인
      cy.get('[data-testid="collaboration-status"]', { timeout: 8000 })
        .should('contain', '동기화됨')
    })
  })

  describe('충돌 감지 및 해결', () => {
    it('시간대 중복 시 충돌이 감지되어야 한다', () => {
      // 첫 번째 일정 생성
      cy.get('[data-testid="time-slot-10-00"]').click()
      cy.get('[data-testid="event-title-input"]').type('회의 A')
      cy.get('[data-testid="event-duration-input"]').select('2시간')
      cy.get('[data-testid="save-event-button"]').click()
      
      // 같은 시간대에 중복 일정 생성 시도
      cy.get('[data-testid="time-slot-11-00"]').click() // 회의 A와 중복되는 시간
      cy.get('[data-testid="event-title-input"]').type('회의 B')
      cy.get('[data-testid="event-duration-input"]').select('1시간')
      cy.get('[data-testid="save-event-button"]').click()
      
      // 중복 경고 모달 표시 확인
      cy.get('[data-testid="schedule-conflict-modal"]').should('be.visible')
      cy.get('[data-testid="schedule-conflict-modal"]').within(() => {
        cy.contains('시간 중복이 감지되었습니다').should('be.visible')
        cy.get('[data-testid="existing-event-info"]').should('contain', '회의 A')
        cy.get('[data-testid="conflicting-event-info"]').should('contain', '회의 B')
      })
      
      // 해결 옵션들 확인
      cy.get('[data-testid="resolution-options"]').within(() => {
        cy.get('[data-testid="option-cancel"]').should('be.visible')
        cy.get('[data-testid="option-adjust-time"]').should('be.visible')
        cy.get('[data-testid="option-force-create"]').should('be.visible')
      })
    })

    it('충돌 해결을 통한 자동 시간 조정이 작동해야 한다', () => {
      // 충돌 상황에서 시간 조정 선택
      cy.get('[data-testid="time-slot-14-00"]').click()
      cy.get('[data-testid="event-title-input"]').type('충돌 테스트 A')
      cy.get('[data-testid="event-duration-input"]').select('3시간')
      cy.get('[data-testid="save-event-button"]').click()
      
      // 중복 일정 생성 시도
      cy.get('[data-testid="time-slot-15-30"]').click()
      cy.get('[data-testid="event-title-input"]').type('충돌 테스트 B')
      cy.get('[data-testid="event-duration-input"]').select('2시간')
      cy.get('[data-testid="save-event-button"]').click()
      
      // 충돌 해결에서 자동 조정 선택
      cy.get('[data-testid="schedule-conflict-modal"]').should('be.visible')
      cy.get('[data-testid="option-adjust-time"]').click()
      
      // 추천 시간 슬롯 표시 확인
      cy.get('[data-testid="suggested-times"]').should('be.visible')
      cy.get('[data-testid="suggested-times"]')
        .find('[data-testid^="suggestion-"]')
        .should('have.length.greaterThan', 0)
      
      // 첫 번째 추천 시간 선택
      cy.get('[data-testid="suggestion-0"]').click()
      cy.get('[data-testid="apply-suggestion-button"]').click()
      
      // 자동 조정된 시간에 일정이 생성되었는지 확인
      cy.get('[data-testid="calendar-event-충돌-테스트-B"]').should('be.visible')
      
      // 원본 일정은 그대로 유지되는지 확인
      cy.get('[data-testid="calendar-event-충돌-테스트-A"]').should('be.visible')
    })

    it('다중 사용자 동시 편집 시 충돌 해결이 작동해야 한다', () => {
      // 강제 충돌 생성 (다른 사용자가 같은 일정을 편집 중인 상황)
      cy.request('POST', '/api/collaboration/force-conflict', {
        resourceId: 'calendar-event-001',
        resourceType: 'calendar-event'
      })
      
      // 일정 편집 시도
      cy.get('[data-testid="calendar-event-기존-일정"]').click()
      cy.get('[data-testid="event-title-input"]')
        .clear()
        .type('로컬에서 수정한 제목')
      cy.get('[data-testid="save-event-button"]').click()
      
      // 편집 충돌 모달 표시 확인
      cy.get('[data-testid="edit-conflict-modal"]', { timeout: 8000 })
        .should('be.visible')
      
      cy.get('[data-testid="edit-conflict-modal"]').within(() => {
        cy.contains('다른 사용자가 동시에 편집하고 있습니다').should('be.visible')
        cy.get('[data-testid="local-changes"]').should('contain', '로컬에서 수정한 제목')
        cy.get('[data-testid="remote-changes"]').should('be.visible')
      })
      
      // 병합 해결 선택
      cy.get('[data-testid="resolution-merge"]').click()
      
      // 수동 병합 인터페이스 확인
      cy.get('[data-testid="manual-merge-editor"]').should('be.visible')
      cy.get('[data-testid="merge-title-input"]')
        .clear()
        .type('병합된 일정 제목')
      
      cy.get('[data-testid="apply-merge-button"]').click()
      
      // 병합 결과가 반영되었는지 확인
      cy.get('[data-testid="edit-conflict-modal"]').should('not.exist')
      cy.get('[data-testid="calendar-event-병합된-일정-제목"]').should('be.visible')
    })

    it('팀원 초대 시 권한 충돌이 적절히 처리되어야 한다', () => {
      // 일정에 새 참여자 초대
      cy.get('[data-testid="calendar-event-기존-일정"]').click()
      cy.get('[data-testid="event-participants-tab"]').click()
      
      // 새 참여자 추가
      cy.get('[data-testid="add-participant-button"]').click()
      cy.get('[data-testid="participant-email-input"]').type('newuser@example.com')
      cy.get('[data-testid="participant-role-select"]').select('editor')
      cy.get('[data-testid="send-invitation-button"]').click()
      
      // 권한 확인 모달 표시 (필요한 경우)
      cy.get('[data-testid="permission-confirmation-modal"]', { timeout: 3000 })
        .then($modal => {
          if ($modal.length > 0) {
            cy.get('[data-testid="permission-confirmation-modal"]').within(() => {
              cy.contains('편집 권한을 부여하시겠습니까?').should('be.visible')
              cy.get('[data-testid="confirm-permission-button"]').click()
            })
          }
        })
      
      // 초대 완료 확인
      cy.get('[data-testid="invitation-sent-notification"]')
        .should('be.visible')
        .should('contain', 'newuser@example.com에게 초대를 전송했습니다')
      
      // 참여자 목록 업데이트 확인
      cy.get('[data-testid="participants-list"]')
        .should('contain', 'newuser@example.com')
    })
  })

  describe('실시간 협업 시각화', () => {
    it('다른 사용자의 현재 보고 있는 시간대가 표시되어야 한다', () => {
      // 다른 사용자가 특정 시간대를 보고 있다고 시뮬레이션
      cy.request('POST', '/api/collaboration/simulate-user', {
        action: 'join',
        userId: 'viewer-user',
        userData: {
          name: '뷰어사용자',
          role: 'viewer',
          currentView: 'calendar',
          focusedTimeSlot: '15:00'
        }
      })
      
      // 폴링 대기
      cy.wait(6000)
      
      // 다른 사용자의 포커스가 표시되는지 확인
      cy.get('[data-testid="time-slot-15-00"]')
        .should('have.class', 'user-viewing')
      
      // 사용자 표시기 확인
      cy.get('[data-testid="time-slot-15-00"]')
        .find('[data-testid="viewing-indicator"]')
        .should('be.visible')
        .should('contain', '뷰어사용자')
    })

    it('일정 편집 중인 사용자가 시각적으로 표시되어야 한다', () => {
      // 편집 중인 상황 시뮬레이션
      cy.request('POST', '/api/collaboration/simulate-user', {
        action: 'join',
        userId: 'editor-user',
        userData: {
          name: '편집사용자',
          role: 'editor',
          currentAction: 'editing',
          editingResource: 'calendar-event-기존-일정'
        }
      })
      
      cy.wait(6000)
      
      // 편집 중인 일정에 표시기가 나타나는지 확인
      cy.get('[data-testid="calendar-event-기존-일정"]')
        .should('have.class', 'being-edited')
      
      // 편집 중인 사용자 정보 표시 확인
      cy.get('[data-testid="calendar-event-기존-일정"]')
        .find('[data-testid="editing-indicator"]')
        .should('be.visible')
        .should('contain', '편집사용자가 편집 중')
      
      // 편집 시도 시 경고 메시지 확인
      cy.get('[data-testid="calendar-event-기존-일정"]').click()
      cy.get('[data-testid="edit-warning-modal"]')
        .should('be.visible')
        .should('contain', '다른 사용자가 편집 중입니다')
    })

    it('드래그 중인 일정이 다른 사용자에게 실시간으로 표시되어야 한다', () => {
      // 드래그 시작
      cy.get('[data-testid="calendar-event-기존-일정"]')
        .trigger('dragstart', { dataTransfer: {} })
      
      // 드래그 중 상태가 다른 사용자에게 표시되는지 시뮬레이션 확인
      cy.get('[data-testid="calendar-event-기존-일정"]')
        .should('have.class', 'being-dragged')
      
      // 드래그 경로 표시
      cy.get('[data-testid="drag-path-indicator"]').should('be.visible')
      
      // 다른 시간대로 드래그
      cy.get('[data-testid="time-slot-16-00"]')
        .trigger('dragover', { dataTransfer: {} })
      
      // 드롭 가능한 영역 하이라이트 확인
      cy.get('[data-testid="time-slot-16-00"]')
        .should('have.class', 'drop-target-valid')
      
      // 드롭 완료
      cy.get('[data-testid="time-slot-16-00"]')
        .trigger('drop', { dataTransfer: {} })
        .trigger('dragend')
      
      // 드래그 완료 후 상태 정리 확인
      cy.get('[data-testid="drag-path-indicator"]').should('not.exist')
      cy.get('[data-testid="time-slot-16-00"]')
        .should('not.have.class', 'drop-target-valid')
    })

    it('캘린더 뷰 변경 시 협업 상태가 동기화되어야 한다', () => {
      // 주간 뷰에서 월간 뷰로 변경
      cy.get('[data-testid="view-selector"]').select('월간')
      
      // 뷰 변경이 반영되는지 확인
      cy.get('[data-testid="calendar-monthly-view"]').should('be.visible')
      cy.get('[data-testid="calendar-weekly-view"]').should('not.exist')
      
      // 협업 정보도 함께 동기화되는지 확인
      cy.get('[data-testid="calendar-active-users"]').should('be.visible')
      cy.get('[data-testid="collaboration-status"]').should('contain', '월간 보기')
      
      // 다른 사용자의 뷰 상태 업데이트 시뮬레이션
      cy.request('POST', '/api/collaboration/simulate-user', {
        action: 'update',
        userId: 'user1',
        userData: {
          currentView: 'monthly',
          viewDate: new Date().toISOString()
        }
      })
      
      cy.wait(6000)
      
      // 같은 뷰를 보는 사용자 표시 확인
      cy.get('[data-testid="user-user1"]')
        .should('have.class', 'same-view')
    })
  })

  describe('성능 및 확장성', () => {
    it('많은 일정이 있는 상황에서 협업 성능이 유지되어야 한다', () => {
      // 많은 일정 생성 (시뮬레이션)
      const startTime = Date.now()
      
      for (let hour = 9; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const timeSlot = `${hour.toString().padStart(2, '0')}-${minute.toString().padStart(2, '0')}`
          
          cy.get(`[data-testid="time-slot-${timeSlot}"]`).click()
          cy.get('[data-testid="event-title-input"]').type(`일정 ${hour}:${minute}`)
          cy.get('[data-testid="event-duration-input"]').select('30분')
          cy.get('[data-testid="save-event-button"]').click()
          
          // 모달이 닫힐 때까지 대기
          cy.get('[data-testid="event-create-modal"]').should('not.exist')
        }
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // 성능 기준: 18개 일정 생성이 60초 이내에 완료되어야 함
      expect(duration).to.be.lessThan(60000)
      
      // 모든 일정이 캘린더에 표시되는지 확인
      cy.get('[data-testid^="calendar-event-일정"]').should('have.length', 18)
      
      // 협업 기능이 여전히 정상 작동하는지 확인
      cy.get('[data-testid="collaboration-status"]').should('contain', '동기화됨')
      cy.get('[data-testid="calendar-active-users"]').should('be.visible')
    })

    it('여러 사용자가 동시에 작업할 때 성능이 유지되어야 한다', () => {
      // 여러 사용자 동시 참여 시뮬레이션
      const users = ['user-a', 'user-b', 'user-c', 'user-d', 'user-e']
      
      users.forEach((userId, index) => {
        cy.request('POST', '/api/collaboration/simulate-user', {
          action: 'join',
          userId,
          userData: {
            name: `협업자${index + 1}`,
            role: 'editor',
            currentAction: 'viewing'
          }
        })
      })
      
      // 모든 사용자가 표시될 때까지 대기
      cy.wait(6000)
      
      // 사용자 목록 확인
      cy.get('[data-testid="calendar-active-users"]')
        .find('[data-testid^="user-"]')
        .should('have.length', users.length + 2) // 기존 사용자들 + 새 사용자들
      
      // 각 사용자가 다른 일정을 편집하는 상황 시뮬레이션
      users.forEach((userId, index) => {
        const hour = 10 + index
        cy.request('POST', '/api/collaboration/simulate-user', {
          action: 'update',
          userId,
          userData: {
            currentAction: 'editing',
            editingResource: `calendar-event-${hour}-00`
          }
        })
      })
      
      cy.wait(6000)
      
      // UI 반응성 테스트
      const startTime = Date.now()
      cy.get('[data-testid="time-slot-18-00"]').click()
      cy.get('[data-testid="event-title-input"]').type('반응성 테스트')
      cy.get('[data-testid="save-event-button"]').click()
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      // 응답 시간이 3초 이내여야 함 (다중 사용자 환경에서도)
      expect(responseTime).to.be.lessThan(3000)
      
      // 새 일정이 정상적으로 생성되었는지 확인
      cy.get('[data-testid="calendar-event-반응성-테스트"]').should('be.visible')
    })

    it('장시간 사용 시 메모리 누수가 없어야 한다', () => {
      cy.window().then((win) => {
        const initialMemory = win.performance.memory?.usedJSHeapSize || 0
        
        // 반복적인 일정 생성/수정/삭제 작업
        for (let i = 0; i < 20; i++) {
          // 일정 생성
          cy.get('[data-testid="time-slot-12-00"]').click()
          cy.get('[data-testid="event-title-input"]').type(`메모리 테스트 ${i}`)
          cy.get('[data-testid="save-event-button"]').click()
          
          // 일정 수정
          cy.get(`[data-testid="calendar-event-메모리-테스트-${i}"]`).click()
          cy.get('[data-testid="event-title-input"]')
            .clear()
            .type(`수정된 메모리 테스트 ${i}`)
          cy.get('[data-testid="save-event-button"]').click()
          
          // 일정 삭제
          cy.get(`[data-testid="calendar-event-수정된-메모리-테스트-${i}"]`).rightclick()
          cy.get('[data-testid="delete-event-option"]').click()
          cy.get('[data-testid="confirm-delete-button"]').click()
        }
        
        cy.window().then((win) => {
          const finalMemory = win.performance.memory?.usedJSHeapSize || 0
          const memoryIncrease = finalMemory - initialMemory
          
          // 메모리 증가가 30MB 이하여야 함
          expect(memoryIncrease).to.be.lessThan(30 * 1024 * 1024)
        })
      })
    })

    it('오프라인/온라인 전환 시 데이터 무결성이 유지되어야 한다', () => {
      // 온라인 상태에서 일정 생성
      cy.get('[data-testid="time-slot-13-00"]').click()
      cy.get('[data-testid="event-title-input"]').type('오프라인 테스트 일정')
      cy.get('[data-testid="save-event-button"]').click()
      
      // 네트워크 오프라인 시뮬레이션
      cy.intercept('POST', '/api/collaboration/**', { forceNetworkError: true })
      
      // 오프라인 상태에서 일정 수정
      cy.get('[data-testid="calendar-event-오프라인-테스트-일정"]').click()
      cy.get('[data-testid="event-title-input"]')
        .clear()
        .type('오프라인에서 수정됨')
      cy.get('[data-testid="save-event-button"]').click()
      
      // 오프라인 상태 표시 확인
      cy.get('[data-testid="collaboration-status"]')
        .should('contain', '오프라인')
      
      // 로컬 변경사항이 보존되는지 확인
      cy.get('[data-testid="calendar-event-오프라인에서-수정됨"]').should('be.visible')
      
      // 대기 중인 변경사항 표시 확인
      cy.get('[data-testid="pending-sync-indicator"]')
        .should('be.visible')
        .should('contain', '동기화 대기 중')
      
      // 네트워크 복구 시뮬레이션
      cy.intercept('POST', '/api/collaboration/**').as('networkRestore')
      
      // 자동 동기화 확인
      cy.get('[data-testid="collaboration-status"]', { timeout: 10000 })
        .should('contain', '동기화됨')
      
      // 변경사항이 서버에 반영되었는지 확인
      cy.get('[data-testid="pending-sync-indicator"]').should('not.exist')
      cy.get('[data-testid="calendar-event-오프라인에서-수정됨"]').should('be.visible')
    })
  })
})