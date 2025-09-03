/**
 * Realtime Collaboration E2E Tests
 * 실시간 협업 및 피드백 등록 시스템 종합 테스트
 * 
 * 테스트 시나리오:
 * 1. 실시간 WebSocket 통신
 * 2. 동시 편집 및 충돌 해결
 * 3. 실시간 피드백 시스템
 * 4. 성능 최적화
 * 5. 에러 처리 및 복원력
 */

describe('실시간 협업 시스템 E2E 테스트', () => {
  beforeEach(() => {
    // WebSocket 연결 테스트를 위한 설정
    cy.intercept('GET', '**/projects/*').as('getProject')
    cy.intercept('POST', '**/comments').as('createComment')
    cy.intercept('PUT', '**/comments/*').as('updateComment')
    cy.intercept('DELETE', '**/comments/*').as('deleteComment')
    
    // 테스트용 WebSocket 서버 설정
    cy.task('setupWebSocketServer', {
      port: 3001,
      endpoint: '/test-ws'
    })
    
    cy.visit('/feedback/project-123')
    cy.wait('@getProject')
  })

  afterEach(() => {
    // WebSocket 서버 정리
    cy.task('cleanupWebSocketServer')
  })

  describe('1. 실시간 WebSocket 통신', () => {
    it('WebSocket 연결 상태를 정확히 관리해야 한다', () => {
      // 연결 상태 표시 확인
      cy.get('[data-testid="connection-status"]')
        .should('exist')
        .and('contain.text', '연결 중')

      // 연결 완료 대기
      cy.get('[data-testid="connection-status"]', { timeout: 10000 })
        .should('contain.text', '연결됨')

      // 네트워크 중단 시뮬레이션
      cy.task('simulateNetworkDisconnection')
      
      cy.get('[data-testid="connection-status"]', { timeout: 5000 })
        .should('contain.text', '재연결 중')

      // 자동 재연결 확인
      cy.task('restoreNetworkConnection')
      
      cy.get('[data-testid="connection-status"]', { timeout: 15000 })
        .should('contain.text', '연결됨')
    })

    it('메시지 전달 보장 및 순서를 유지해야 한다', () => {
      // 여러 메시지 연속 전송
      const messages = ['첫 번째 댓글', '두 번째 댓글', '세 번째 댓글']
      
      messages.forEach((message, index) => {
        cy.get('[data-testid="comment-input"]')
          .type(message)
        
        cy.get('[data-testid="submit-comment"]')
          .click()
        
        // 메시지 순서 확인
        cy.get(`[data-testid="comment-${index}"]`)
          .should('contain.text', message)
          .and('have.attr', 'data-sequence-number', (index + 1).toString())
      })
    })

    it('다중 사용자 동시 접속을 지원해야 한다', () => {
      // 여러 브라우저 컨텍스트 시뮬레이션
      cy.task('simulateMultipleUsers', {
        userCount: 5,
        projectId: 'project-123'
      })

      // 실시간 사용자 목록 확인
      cy.get('[data-testid="realtime-users"]')
        .should('be.visible')
        .within(() => {
          cy.get('[data-testid="user-avatar"]')
            .should('have.length.at.least', 3)
        })

      // 사용자 상태 표시 확인
      cy.get('[data-testid="user-status-online"]')
        .should('have.length.at.least', 3)
    })

    it('연결 끊김 시 오프라인 모드로 전환해야 한다', () => {
      // 오프라인 모드 시뮬레이션
      cy.window().then((win) => {
        win.navigator.serviceWorker.ready.then((registration) => {
          registration.sync.register('offline-comments-sync')
        })
      })

      cy.task('simulateOfflineMode')

      // 오프라인 표시 확인
      cy.get('[data-testid="offline-indicator"]')
        .should('be.visible')
        .and('contain.text', '오프라인 모드')

      // 오프라인 상태에서 댓글 작성
      cy.get('[data-testid="comment-input"]')
        .type('오프라인 댓글')
      
      cy.get('[data-testid="submit-comment"]')
        .click()

      // 대기열에 저장됨을 확인
      cy.get('[data-testid="queued-comments-count"]')
        .should('contain.text', '1')

      // 온라인 복구 시뮬레이션
      cy.task('restoreOnlineMode')

      // 자동 동기화 확인
      cy.get('[data-testid="sync-indicator"]', { timeout: 10000 })
        .should('contain.text', '동기화 완료')
    })
  })

  describe('2. 동시 편집 및 충돌 해결', () => {
    it('Operational Transformation을 사용한 충돌 해결을 수행해야 한다', () => {
      // 두 사용자의 동시 편집 시뮬레이션
      cy.task('simulateCollaborativeEdit', {
        user1: {
          action: 'insert',
          position: 10,
          content: '사용자1 텍스트'
        },
        user2: {
          action: 'insert', 
          position: 15,
          content: '사용자2 텍스트'
        }
      })

      // OT 변환 결과 확인
      cy.get('[data-testid="document-content"]')
        .should('contain.text', '사용자1 텍스트')
        .and('contain.text', '사용자2 텍스트')

      // 충돌 해결 로그 확인
      cy.get('[data-testid="ot-log"]')
        .should('contain.text', 'Operation transformed')
        .and('contain.text', 'Conflict resolved')
    })

    it('실시간 커서 및 선택 영역을 표시해야 한다', () => {
      cy.task('simulateRemoteCursor', {
        userId: 'user-456',
        userName: '테스트 사용자',
        userColor: '#FF5722',
        position: { x: 100, y: 200 }
      })

      // 원격 사용자 커서 표시 확인
      cy.get('[data-testid="remote-cursor-user-456"]')
        .should('be.visible')
        .and('have.css', 'background-color', 'rgb(255, 87, 34)')
        .and('have.css', 'left', '100px')
        .and('have.css', 'top', '200px')

      // 커서 라벨 확인
      cy.get('[data-testid="cursor-label-user-456"]')
        .should('contain.text', '테스트 사용자')
    })

    it('편집 충돌 감지 및 자동 병합을 수행해야 한다', () => {
      // 동일한 위치에서 충돌하는 편집
      cy.task('simulateEditConflict', {
        conflictType: 'same_position',
        operations: [
          {
            userId: 'user1',
            type: 'delete',
            position: 20,
            length: 5
          },
          {
            userId: 'user2', 
            type: 'insert',
            position: 22,
            content: '새 내용'
          }
        ]
      })

      // 충돌 감지 알림 확인
      cy.get('[data-testid="conflict-notification"]')
        .should('be.visible')
        .and('contain.text', '편집 충돌이 감지되었습니다')

      // 자동 병합 결과 확인
      cy.get('[data-testid="auto-merge-result"]')
        .should('be.visible')
        .and('contain.text', '자동으로 병합되었습니다')
    })
  })

  describe('3. 실시간 피드백 시스템', () => {
    beforeEach(() => {
      // 비디오 플레이어 로드
      cy.get('[data-testid="video-player"]')
        .should('be.visible')
      
      // 댓글 시스템 초기화
      cy.get('[data-testid="comment-system"]')
        .should('be.visible')
    })

    it('타임코드 댓글을 실시간으로 동기화해야 한다', () => {
      // 비디오 특정 시점으로 이동
      cy.get('[data-testid="video-player"]')
        .then(($video) => {
          $video[0].currentTime = 30.5
        })

      // 댓글 작성
      cy.get('[data-testid="comment-input"]')
        .type('30초 지점 피드백')
      
      cy.get('[data-testid="submit-comment"]')
        .click()

      cy.wait('@createComment')

      // 타임코드 정확성 확인
      cy.get('[data-testid="comment-timecode"]')
        .should('contain.text', '00:30:500')

      // 다른 사용자에게 실시간 전파 확인
      cy.task('verifyRealtimeCommentSync', {
        commentId: 'new-comment-id',
        expectedTimecode: 30.5
      })
    })

    it('피드백 등록/수정/삭제가 즉시 반영되어야 한다', () => {
      // 댓글 등록
      const originalComment = '원본 피드백'
      cy.get('[data-testid="comment-input"]')
        .type(originalComment)
      
      cy.get('[data-testid="submit-comment"]')
        .click()

      cy.wait('@createComment')

      // 실시간 반영 확인
      cy.get('[data-testid="comment-list"]')
        .should('contain.text', originalComment)

      // 댓글 수정
      const editedComment = '수정된 피드백'
      cy.get('[data-testid="edit-comment-btn"]')
        .first()
        .click()

      cy.get('[data-testid="edit-comment-input"]')
        .clear()
        .type(editedComment)

      cy.get('[data-testid="save-edit-btn"]')
        .click()

      cy.wait('@updateComment')

      // 실시간 업데이트 확인
      cy.get('[data-testid="comment-content"]')
        .should('contain.text', editedComment)
        .and('not.contain.text', originalComment)

      // 댓글 삭제
      cy.get('[data-testid="delete-comment-btn"]')
        .first()
        .click()

      cy.get('[data-testid="confirm-delete-btn"]')
        .click()

      cy.wait('@deleteComment')

      // 실시간 삭제 확인
      cy.get('[data-testid="comment-content"]')
        .should('not.exist')
    })

    it('사용자 상태를 정확히 표시해야 한다', () => {
      // 온라인 사용자 표시
      cy.get('[data-testid="online-users"]')
        .should('be.visible')
        .within(() => {
          cy.get('[data-testid="user-online"]')
            .should('have.length.at.least', 1)
        })

      // 입력 중 상태 표시
      cy.task('simulateUserTyping', {
        userId: 'user-456',
        isTyping: true
      })

      cy.get('[data-testid="typing-indicator"]')
        .should('be.visible')
        .and('contain.text', '입력 중...')

      // 입력 완료
      cy.task('simulateUserTyping', {
        userId: 'user-456',
        isTyping: false
      })

      cy.get('[data-testid="typing-indicator"]')
        .should('not.exist')
    })

    it('읽음 상태 및 알림을 관리해야 한다', () => {
      // 새 댓글에 대한 알림 확인
      cy.task('simulateIncomingComment', {
        commentId: 'new-comment-123',
        content: '새로운 피드백',
        authorId: 'other-user',
        timestamp: Date.now()
      })

      // 알림 표시 확인
      cy.get('[data-testid="notification-badge"]')
        .should('be.visible')
        .and('contain.text', '1')

      // 댓글 읽기
      cy.get('[data-testid="comment-new-comment-123"]')
        .scrollIntoView()
        .should('be.visible')

      // 읽음 상태 업데이트 확인
      cy.get('[data-testid="notification-badge"]', { timeout: 2000 })
        .should('not.exist')

      // 읽음 표시 확인
      cy.get('[data-testid="comment-read-status"]')
        .should('contain.text', '읽음')
    })
  })

  describe('4. 성능 최적화', () => {
    it('메시지 큐잉 및 배치 처리를 수행해야 한다', () => {
      // 대량 메시지 전송
      cy.task('sendBulkMessages', {
        count: 100,
        interval: 10 // 10ms 간격
      })

      // 큐 크기 모니터링
      cy.get('[data-testid="message-queue-size"]')
        .should('contain.text', '100')

      // 배치 처리 확인
      cy.get('[data-testid="batch-processing-indicator"]')
        .should('be.visible')
        .and('contain.text', '메시지 처리 중')

      // 처리 완료 확인
      cy.get('[data-testid="message-queue-size"]', { timeout: 10000 })
        .should('contain.text', '0')
    })

    it('네트워크 지연 보상을 제공해야 한다', () => {
      // 고지연 네트워크 시뮬레이션
      cy.task('simulateNetworkLatency', { latency: 1000 })

      // 댓글 작성
      const timestamp = Date.now()
      cy.get('[data-testid="comment-input"]')
        .type('지연 보상 테스트')
      
      cy.get('[data-testid="submit-comment"]')
        .click()

      // 지연 보상 적용 확인
      cy.get('[data-testid="latency-compensation"]')
        .should('be.visible')
        .and('contain.text', '예상 지연: 1000ms')

      // 실제 응답 시간 측정
      cy.wait('@createComment').then((interception) => {
        const responseTime = Date.now() - timestamp
        expect(responseTime).to.be.lessThan(2000) // 보상 적용으로 체감 지연 감소
      })
    })

    it('메모리 누수를 방지해야 한다', () => {
      // 초기 메모리 사용량 측정
      cy.window().then((win) => {
        const initialMemory = win.performance.memory?.usedJSHeapSize || 0
        
        // 대량 이벤트 생성 및 해제
        cy.task('generateMassiveEvents', { count: 1000 })
        
        // 가비지 컬렉션 강제 실행
        if (win.gc) {
          win.gc()
        }
        
        // 메모리 사용량 재측정
        const finalMemory = win.performance.memory?.usedJSHeapSize || 0
        const memoryIncrease = finalMemory - initialMemory
        
        // 메모리 증가량이 허용 범위 내인지 확인 (50MB 이하)
        expect(memoryIncrease).to.be.lessThan(50 * 1024 * 1024)
      })
    })
  })

  describe('5. 에러 처리 및 복원력', () => {
    it('네트워크 오류에서 자동으로 복구해야 한다', () => {
      // 네트워크 오류 시뮬레이션
      cy.task('simulateNetworkError', {
        errorType: 'connection_timeout',
        duration: 5000
      })

      // 오류 표시 확인
      cy.get('[data-testid="error-notification"]')
        .should('be.visible')
        .and('contain.text', '연결 오류')

      // 자동 복구 대기
      cy.get('[data-testid="auto-recovery-indicator"]', { timeout: 10000 })
        .should('be.visible')
        .and('contain.text', '자동 복구 중')

      // 복구 완료 확인
      cy.get('[data-testid="connection-status"]', { timeout: 15000 })
        .should('contain.text', '연결됨')
    })

    it('메시지 순서를 보장해야 한다', () => {
      // 순서가 뒤바뀐 메시지 시뮬레이션
      cy.task('sendOutOfOrderMessages', [
        { id: 'msg-3', sequence: 3, content: '세 번째 메시지' },
        { id: 'msg-1', sequence: 1, content: '첫 번째 메시지' },
        { id: 'msg-2', sequence: 2, content: '두 번째 메시지' }
      ])

      // 올바른 순서로 표시되는지 확인
      cy.get('[data-testid="message-list"]').within(() => {
        cy.get('[data-testid="message"]')
          .eq(0)
          .should('contain.text', '첫 번째 메시지')
        
        cy.get('[data-testid="message"]')
          .eq(1) 
          .should('contain.text', '두 번째 메시지')
        
        cy.get('[data-testid="message"]')
          .eq(2)
          .should('contain.text', '세 번째 메시지')
      })
    })

    it('중복 메시지를 필터링해야 한다', () => {
      // 중복 메시지 전송
      const duplicateMessage = {
        id: 'duplicate-msg',
        content: '중복 테스트 메시지'
      }

      cy.task('sendDuplicateMessage', {
        message: duplicateMessage,
        count: 3
      })

      // 중복 제거 확인
      cy.get('[data-testid="message-list"]')
        .find(`[data-message-id="${duplicateMessage.id}"]`)
        .should('have.length', 1)

      // 중복 필터링 로그 확인
      cy.get('[data-testid="debug-log"]')
        .should('contain.text', 'Duplicate message filtered')
    })
  })

  describe('6. 성능 요구사항 검증', () => {
    it('WebSocket 연결이 2초 이내에 완료되어야 한다', () => {
      const startTime = Date.now()
      
      cy.visit('/feedback/project-123')
      
      cy.get('[data-testid="connection-status"]')
        .should('contain.text', '연결됨')
        .then(() => {
          const connectionTime = Date.now() - startTime
          expect(connectionTime).to.be.lessThan(2000)
        })
    })

    it('메시지 전달이 500ms 이내에 완료되어야 한다', () => {
      cy.get('[data-testid="connection-status"]')
        .should('contain.text', '연결됨')

      const startTime = Date.now()
      
      cy.get('[data-testid="comment-input"]')
        .type('성능 테스트 메시지')
      
      cy.get('[data-testid="submit-comment"]')
        .click()

      cy.wait('@createComment').then(() => {
        const responseTime = Date.now() - startTime
        expect(responseTime).to.be.lessThan(500)
      })
    })

    it('동시 사용자 100명을 지원해야 한다', () => {
      cy.task('simulateConcurrentUsers', {
        userCount: 100,
        actionsPerUser: 10,
        duration: 30000 // 30초
      })

      // 시스템 안정성 확인
      cy.get('[data-testid="system-status"]')
        .should('contain.text', '안정')

      // 응답 시간 유지 확인
      cy.get('[data-testid="avg-response-time"]')
        .should('contain.text', /^[0-4][0-9][0-9]ms$/) // 500ms 미만

      // 메모리 사용량 확인
      cy.get('[data-testid="memory-usage"]')
        .should('contain.text', /^[0-4][0-9]MB$/) // 50MB 미만
    })
  })

  describe('7. 모바일 디바이스 테스트', () => {
    beforeEach(() => {
      cy.viewport('iphone-x')
    })

    it('모바일에서 터치 이벤트를 정확히 처리해야 한다', () => {
      // 터치 시작
      cy.get('[data-testid="comment-input"]')
        .trigger('touchstart')
        .type('모바일 댓글 테스트')

      // 터치 스크롤 테스트
      cy.get('[data-testid="comment-list"]')
        .trigger('touchstart', { which: 1 })
        .trigger('touchmove', { clientY: -100 })
        .trigger('touchend')

      // 스크롤 위치 확인
      cy.get('[data-testid="comment-list"]')
        .should('have.prop', 'scrollTop')
        .and('be.greaterThan', 0)
    })

    it('모바일 네트워크 환경에 최적화되어야 한다', () => {
      // 저대역폭 네트워크 시뮬레이션
      cy.task('simulateMobileNetwork', {
        bandwidth: '3G',
        latency: 300
      })

      // 최적화된 메시지 압축 확인
      cy.get('[data-testid="compression-indicator"]')
        .should('be.visible')
        .and('contain.text', '압축 활성화')

      // 배터리 최적화 모드 확인
      cy.get('[data-testid="battery-optimization"]')
        .should('contain.text', '저전력 모드')
    })
  })
})

// Cypress 태스크 정의
declare global {
  namespace Cypress {
    interface Chainable {
      task(
        event: 'setupWebSocketServer' | 'cleanupWebSocketServer' | 'simulateNetworkDisconnection' | 
               'restoreNetworkConnection' | 'simulateMultipleUsers' | 'simulateOfflineMode' |
               'restoreOnlineMode' | 'simulateCollaborativeEdit' | 'simulateRemoteCursor' |
               'simulateEditConflict' | 'verifyRealtimeCommentSync' | 'simulateUserTyping' |
               'simulateIncomingComment' | 'sendBulkMessages' | 'simulateNetworkLatency' |
               'generateMassiveEvents' | 'simulateNetworkError' | 'sendOutOfOrderMessages' |
               'sendDuplicateMessage' | 'simulateConcurrentUsers' | 'simulateMobileNetwork',
        arg?: any
      ): Chainable<any>
    }
  }
}