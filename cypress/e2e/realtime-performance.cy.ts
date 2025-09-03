/**
 * Realtime Collaboration Performance Tests
 * 실시간 협업 시스템의 성능 및 안정성 검증 테스트
 * 
 * 성능 요구사항:
 * - WebSocket 연결: 2초 이내
 * - 메시지 전달: 500ms 이내  
 * - 동시 사용자: 100명 이상
 * - 메모리 사용량: 50MB 이하 (클라이언트)
 */

describe('실시간 협업 성능 테스트', () => {
  // 성능 측정 헬퍼
  const measurePerformance = (operation: string, threshold: number) => {
    const startTime = performance.now()
    
    return {
      end: () => {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        cy.log(`${operation} 수행 시간: ${duration.toFixed(2)}ms`)
        expect(duration).to.be.lessThan(threshold)
        
        return duration
      }
    }
  }

  beforeEach(() => {
    // 성능 모니터링 설정
    cy.window().then((win) => {
      // Performance Observer 설정
      if ('PerformanceObserver' in win) {
        const observer = new win.PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name.includes('websocket') || entry.name.includes('realtime')) {
              cy.task('log', `Performance: ${entry.name} - ${entry.duration}ms`)
            }
          })
        })
        observer.observe({ entryTypes: ['measure', 'navigation'] })
      }
    })

    cy.visit('/feedback/project-123')
  })

  describe('연결 성능', () => {
    it('WebSocket 연결이 2초 이내에 완료되어야 한다', () => {
      const measurement = measurePerformance('WebSocket 연결', 2000)
      
      cy.get('[data-testid="connection-status"]')
        .should('not.contain.text', '연결 중')
        .then(() => {
          measurement.end()
        })

      cy.get('[data-testid="connection-status"]')
        .should('contain.text', '연결됨')
    })

    it('재연결이 5초 이내에 완료되어야 한다', () => {
      // 먼저 연결 확인
      cy.get('[data-testid="connection-status"]')
        .should('contain.text', '연결됨')

      // 연결 끊기
      cy.task('simulateNetworkDisconnection')
      
      cy.get('[data-testid="connection-status"]')
        .should('contain.text', '재연결 중')

      const measurement = measurePerformance('WebSocket 재연결', 5000)
      
      // 연결 복구
      cy.task('restoreNetworkConnection')
      
      cy.get('[data-testid="connection-status"]', { timeout: 10000 })
        .should('contain.text', '연결됨')
        .then(() => {
          measurement.end()
        })
    })
  })

  describe('메시지 전달 성능', () => {
    beforeEach(() => {
      cy.get('[data-testid="connection-status"]')
        .should('contain.text', '연결됨')
    })

    it('단일 메시지 전달이 500ms 이내에 완료되어야 한다', () => {
      const measurement = measurePerformance('단일 메시지 전달', 500)
      
      cy.get('[data-testid="comment-input"]')
        .type('성능 테스트 메시지')
      
      cy.get('[data-testid="submit-comment"]')
        .click()

      cy.get('[data-testid="comment-list"]')
        .should('contain.text', '성능 테스트 메시지')
        .then(() => {
          measurement.end()
        })
    })

    it('배치 메시지 처리가 효율적이어야 한다', () => {
      const messageCount = 50
      const maxTotalTime = 5000 // 5초 이내에 50개 메시지 처리

      const measurement = measurePerformance(`${messageCount}개 배치 메시지 처리`, maxTotalTime)
      
      // 배치 메시지 전송
      cy.task('sendBulkMessages', {
        count: messageCount,
        interval: 0 // 연속 전송
      })

      // 모든 메시지 수신 확인
      cy.get('[data-testid="comment-list"]')
        .find('[data-testid^="comment-"]')
        .should('have.length.at.least', messageCount)
        .then(() => {
          measurement.end()
        })
    })

    it('고지연 네트워크에서 지연 보상이 작동해야 한다', () => {
      // 1초 지연 네트워크 시뮬레이션
      cy.task('simulateNetworkLatency', { latency: 1000 })

      const measurement = measurePerformance('지연 보상 메시지 전달', 1500)
      
      cy.get('[data-testid="comment-input"]')
        .type('지연 보상 테스트')
      
      cy.get('[data-testid="submit-comment"]')
        .click()

      // 지연 보상 표시 확인
      cy.get('[data-testid="latency-compensation"]')
        .should('be.visible')

      // 실제 응답 확인
      cy.get('[data-testid="comment-list"]')
        .should('contain.text', '지연 보상 테스트')
        .then(() => {
          measurement.end()
        })
    })
  })

  describe('동시 사용자 성능', () => {
    it('50명 동시 사용자 시나리오를 처리해야 한다', () => {
      const userCount = 50
      const testDuration = 30000 // 30초

      const measurement = measurePerformance(`${userCount}명 동시 사용자 처리`, testDuration)
      
      cy.task('simulateConcurrentUsers', {
        userCount,
        actionsPerUser: 5,
        duration: testDuration
      })

      // 시스템 안정성 모니터링
      cy.get('[data-testid="system-status"]', { timeout: 35000 })
        .should('contain.text', '안정')

      // 평균 응답 시간 확인
      cy.get('[data-testid="avg-response-time"]')
        .should('not.contain.text', /[5-9][0-9][0-9]ms/) // 500ms 이상 응답시간 없어야 함
        .then(() => {
          measurement.end()
        })
    })

    it('동시 댓글 작성 부하를 처리해야 한다', () => {
      const commentCount = 20
      
      // 동시 댓글 작성 시뮬레이션
      cy.task('simulateSimultaneousComments', {
        count: commentCount,
        projectId: 'project-123'
      })

      const measurement = measurePerformance(`${commentCount}개 동시 댓글 처리`, 3000)

      // 모든 댓글 수신 확인
      cy.get('[data-testid="comment-list"]', { timeout: 5000 })
        .find('[data-testid^="comment-"]')
        .should('have.length.at.least', commentCount)
        .then(() => {
          measurement.end()
        })
    })
  })

  describe('메모리 사용량', () => {
    it('장시간 사용 시 메모리 누수가 없어야 한다', () => {
      cy.window().then((win) => {
        const initialMemory = (win.performance as any).memory?.usedJSHeapSize || 0
        
        // 대량 이벤트 생성 및 처리
        cy.task('generateMassiveEvents', { count: 1000 })

        // 10초 대기 (이벤트 처리 시간)
        cy.wait(10000)

        // 가비지 컬렉션 강제 실행
        if ((win as any).gc) {
          (win as any).gc()
        }

        // 메모리 사용량 재측정
        const finalMemory = (win.performance as any).memory?.usedJSHeapSize || 0
        const memoryIncrease = finalMemory - initialMemory
        const memoryIncreaseMB = memoryIncrease / (1024 * 1024)

        cy.log(`메모리 증가량: ${memoryIncreaseMB.toFixed(2)}MB`)
        
        // 50MB 이하 메모리 증가 허용
        expect(memoryIncreaseMB).to.be.lessThan(50)
      })
    })

    it('연결된 사용자 수에 비례한 메모리 사용량을 유지해야 한다', () => {
      const userCounts = [10, 25, 50]
      const memoryMeasurements: number[] = []

      cy.wrap(userCounts).each((userCount: number) => {
        cy.task('simulateMultipleUsers', {
          userCount,
          projectId: 'project-123'
        })

        cy.wait(2000) // 사용자 정보 로드 대기

        cy.window().then((win) => {
          const memory = (win.performance as any).memory?.usedJSHeapSize || 0
          const memoryMB = memory / (1024 * 1024)
          memoryMeasurements.push(memoryMB)
          
          cy.log(`${userCount}명 사용자 시 메모리 사용량: ${memoryMB.toFixed(2)}MB`)
        })

        cy.task('cleanupSimulatedUsers')
        cy.wait(1000)
      }).then(() => {
        // 메모리 사용량이 선형적으로 증가하는지 확인
        expect(memoryMeasurements[1]).to.be.greaterThan(memoryMeasurements[0])
        expect(memoryMeasurements[2]).to.be.greaterThan(memoryMeasurements[1])
        
        // 최대 메모리 사용량 제한 확인
        expect(Math.max(...memoryMeasurements)).to.be.lessThan(100) // 100MB 이하
      })
    })
  })

  describe('네트워크 효율성', () => {
    it('메시지 압축이 효과적이어야 한다', () => {
      // 압축 가능한 대용량 메시지 전송
      const largeMessage = 'A'.repeat(1000) // 1KB 메시지

      cy.intercept('POST', '**/websocket', (req) => {
        const bodySize = JSON.stringify(req.body).length
        cy.wrap(bodySize).as('messageSize')
      })

      cy.get('[data-testid="comment-input"]')
        .type(largeMessage)
      
      cy.get('[data-testid="submit-comment"]')
        .click()

      cy.get('@messageSize').then((size: number) => {
        // 압축률 확인 (최소 50% 압축)
        expect(size).to.be.lessThan(largeMessage.length * 0.5)
      })
    })

    it('중복 메시지 필터링이 효율적이어야 한다', () => {
      const duplicateMessageId = 'duplicate-test-message'
      
      // 동일 메시지 5회 전송
      cy.task('sendDuplicateMessage', {
        message: {
          id: duplicateMessageId,
          content: '중복 메시지 테스트'
        },
        count: 5
      })

      // 중복 제거 효과 확인
      cy.get('[data-testid="comment-list"]')
        .find(`[data-message-id="${duplicateMessageId}"]`)
        .should('have.length', 1) // 하나만 표시되어야 함

      // 중복 필터링 통계 확인
      cy.get('[data-testid="duplicate-filtered-count"]')
        .should('contain.text', '4') // 4개 필터링
    })
  })

  describe('사용자 경험 성능', () => {
    it('타이핑 인디케이터가 즉시 표시되어야 한다', () => {
      // 다른 사용자 타이핑 시뮬레이션
      const measurement = measurePerformance('타이핑 인디케이터 표시', 100)
      
      cy.task('simulateUserTyping', {
        userId: 'other-user',
        isTyping: true
      })

      cy.get('[data-testid="typing-indicator"]')
        .should('be.visible')
        .and('contain.text', '입력 중')
        .then(() => {
          measurement.end()
        })
    })

    it('커서 이동이 부드럽게 표시되어야 한다', () => {
      const cursorPositions = [
        { x: 100, y: 100 },
        { x: 200, y: 150 },
        { x: 300, y: 200 },
        { x: 150, y: 250 }
      ]

      let totalTime = 0

      cursorPositions.forEach((position, index) => {
        const measurement = measurePerformance(`커서 이동 ${index + 1}`, 50)
        
        cy.task('simulateRemoteCursor', {
          userId: 'other-user',
          userName: '다른 사용자',
          userColor: '#FF5722',
          position
        })

        cy.get('[data-testid="remote-cursor-other-user"]')
          .should('have.css', 'left', `${position.x}px`)
          .and('have.css', 'top', `${position.y}px`)
          .then(() => {
            const duration = measurement.end()
            totalTime += duration
          })

        cy.wait(100) // 부드러운 애니메이션을 위한 간격
      })

      // 평균 커서 업데이트 시간 확인
      cy.then(() => {
        const avgTime = totalTime / cursorPositions.length
        expect(avgTime).to.be.lessThan(50) // 평균 50ms 이하
      })
    })

    it('대량 실시간 업데이트 시 UI가 반응성을 유지해야 한다', () => {
      // 초당 10개 업데이트 전송
      const updatesPerSecond = 10
      const testDuration = 5000 // 5초
      const totalUpdates = (updatesPerSecond * testDuration) / 1000

      cy.task('sendHighFrequencyUpdates', {
        updatesPerSecond,
        duration: testDuration
      })

      // UI 반응성 측정
      const measurement = measurePerformance('UI 반응성 유지', 1000)

      // 사용자 상호작용 테스트
      cy.get('[data-testid="comment-input"]')
        .type('반응성 테스트')
        .should('have.value', '반응성 테스트')
        .then(() => {
          measurement.end()
        })

      // 모든 업데이트 처리 확인
      cy.get('[data-testid="processed-updates-count"]', { timeout: 7000 })
        .should('contain.text', totalUpdates.toString())
    })
  })

  describe('에러 복구 성능', () => {
    it('네트워크 오류 후 빠른 복구를 수행해야 한다', () => {
      // 연결 확인
      cy.get('[data-testid="connection-status"]')
        .should('contain.text', '연결됨')

      // 네트워크 오류 시뮬레이션
      cy.task('simulateNetworkError', {
        errorType: 'connection_timeout',
        duration: 3000
      })

      const measurement = measurePerformance('네트워크 오류 복구', 4000)

      // 자동 복구 확인
      cy.get('[data-testid="connection-status"]', { timeout: 8000 })
        .should('contain.text', '연결됨')
        .then(() => {
          measurement.end()
        })

      // 복구 후 정상 동작 확인
      cy.get('[data-testid="comment-input"]')
        .type('복구 후 메시지')
      
      cy.get('[data-testid="submit-comment"]')
        .click()

      cy.get('[data-testid="comment-list"]')
        .should('contain.text', '복구 후 메시지')
    })

    it('대기열 처리가 효율적이어야 한다', () => {
      // 오프라인 상태에서 메시지 누적
      cy.task('simulateOfflineMode')

      const queuedMessageCount = 20
      
      for (let i = 1; i <= queuedMessageCount; i++) {
        cy.get('[data-testid="comment-input"]')
          .clear()
          .type(`오프라인 메시지 ${i}`)
        
        cy.get('[data-testid="submit-comment"]')
          .click()
      }

      // 대기열 확인
      cy.get('[data-testid="queued-messages-count"]')
        .should('contain.text', queuedMessageCount.toString())

      const measurement = measurePerformance('대기열 일괄 처리', 3000)

      // 온라인 복구
      cy.task('restoreOnlineMode')

      // 대기열 일괄 처리 확인
      cy.get('[data-testid="queued-messages-count"]', { timeout: 5000 })
        .should('contain.text', '0')
        .then(() => {
          measurement.end()
        })

      // 모든 메시지 동기화 확인
      cy.get('[data-testid="comment-list"]')
        .find('[data-testid^="comment-"]')
        .should('have.length.at.least', queuedMessageCount)
    })
  })
})

// 성능 테스트를 위한 추가 Cypress 태스크 선언
declare global {
  namespace Cypress {
    interface Chainable {
      task(
        event: 'simulateSimultaneousComments' | 'cleanupSimulatedUsers' | 
               'sendHighFrequencyUpdates',
        arg?: any
      ): Chainable<any>
    }
  }
}