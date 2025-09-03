/**
 * 영상 피드백 업로드 및 타임코드 댓글 시스템 E2E 테스트
 * 
 * 테스트 환경:
 * - 미디어 저장소: MEDIA_ROOT=/app/media, MEDIA_URL=/media/
 * - WebSocket: wss://videoplanet.up.railway.app (실시간 동기화)
 * - 백엔드: https://api.vlanet.net
 * 
 * @description 완전한 비디오 피드백 시스템의 E2E 테스트 수트
 */

describe('영상 피드백 업로드 및 타임코드 댓글 시스템 E2E 테스트', () => {
  const testVideoFile = 'cypress/fixtures/test-video-500mb.mp4'
  const testProjectId = 'test-project-123'
  
  beforeEach(() => {
    // 테스트 환경 설정
    cy.intercept('GET', '/api/projects/*', { fixture: 'project.json' })
    cy.intercept('POST', '/api/videos/upload', { fixture: 'video-upload-response.json' })
    cy.intercept('GET', '/api/videos/*/comments', { fixture: 'video-comments.json' })
    cy.intercept('POST', '/api/videos/*/comments', { fixture: 'comment-create-response.json' })
    
    // MSW 핸들러 설정
    cy.window().then((win) => {
      if ('__msw' in win) {
        win.__msw.resetHandlers()
      }
    })
    
    // 인증된 사용자로 로그인
    cy.login({ username: 'test@videoplanet.com', password: 'testpass123' })
    
    // 피드백 페이지로 이동
    cy.visit('/feedback')
  })

  describe('1. 대용량 비디오 업로드 (500MB)', () => {
    it('청크 업로드 기능으로 대용량 파일을 업로드한다', () => {
      cy.get('[data-testid="upload-section"]').should('be.visible')
      
      // 파일 선택
      cy.get('[data-testid="video-upload-input"]')
        .selectFile(testVideoFile, { force: true })
      
      // 파일 정보 확인
      cy.get('[data-testid="selected-file-info"]').should('contain', '500MB')
      cy.get('[data-testid="selected-file-format"]').should('contain', 'MP4')
      
      // 업로드 설정 구성
      cy.get('[data-testid="upload-quality-select"]').select('1080p')
      cy.get('[data-testid="enable-chunked-upload"]').check()
      cy.get('[data-testid="chunk-size-select"]').select('10MB')
      
      // 업로드 시작
      cy.get('[data-testid="start-upload-button"]').click()
      
      // 청크 업로드 진행률 확인
      cy.get('[data-testid="upload-progress-bar"]').should('be.visible')
      cy.get('[data-testid="chunk-progress-info"]').should('contain', '청크 1/50')
      
      // 업로드 속도 모니터링
      cy.get('[data-testid="upload-speed-display"]').should('be.visible')
      cy.get('[data-testid="estimated-time-remaining"]').should('be.visible')
      
      // 업로드 완료 확인 (타임아웃 5분)
      cy.get('[data-testid="upload-success-message"]', { timeout: 300000 })
        .should('contain', '업로드가 완료되었습니다')
      
      // 자동 인코딩 시작 확인
      cy.get('[data-testid="encoding-status"]').should('contain', '인코딩 중...')
      
      // 썸네일 자동 생성 확인
      cy.get('[data-testid="video-thumbnail"]').should('be.visible')
    })

    it('네트워크 오류 시 자동 재시도 기능을 테스트한다', () => {
      // 네트워크 오류 시뮬레이션
      cy.intercept('POST', '/api/videos/upload-chunk', { 
        forceNetworkError: true 
      }).as('failedUpload')
      
      cy.get('[data-testid="video-upload-input"]')
        .selectFile(testVideoFile, { force: true })
      
      cy.get('[data-testid="start-upload-button"]').click()
      
      // 재시도 메시지 확인
      cy.get('[data-testid="retry-message"]')
        .should('contain', '네트워크 오류로 재시도 중...')
      
      // 재시도 성공 시뮬레이션
      cy.intercept('POST', '/api/videos/upload-chunk', { 
        statusCode: 200,
        body: { success: true, chunkId: 'chunk-123' }
      }).as('successUpload')
      
      // 재시도 후 성공 확인
      cy.get('[data-testid="retry-success-message"]')
        .should('be.visible')
    })

    it('업로드 일시정지 및 재개 기능을 테스트한다', () => {
      cy.get('[data-testid="video-upload-input"]')
        .selectFile(testVideoFile, { force: true })
      
      cy.get('[data-testid="start-upload-button"]').click()
      
      // 업로드 시작 후 일시정지
      cy.get('[data-testid="pause-upload-button"]').click()
      cy.get('[data-testid="upload-status"]').should('contain', '일시정지됨')
      
      // 재개
      cy.get('[data-testid="resume-upload-button"]').click()
      cy.get('[data-testid="upload-status"]').should('contain', '업로드 중')
      
      // 취소
      cy.get('[data-testid="cancel-upload-button"]').click()
      cy.get('[data-testid="upload-cancelled-message"]').should('be.visible')
    })
  })

  describe('2. 비디오 플레이어 통합', () => {
    beforeEach(() => {
      // 업로드된 비디오로 이동
      cy.visit(`/feedback/video/${testProjectId}`)
      cy.get('[data-testid="video-player"]').should('be.visible')
    })

    it('Video.js 플레이어가 올바르게 초기화된다', () => {
      // 플레이어 초기화 시간 측정 (2초 이내)
      const startTime = performance.now()
      
      cy.get('[data-testid="video-player"]').should('be.visible')
      cy.get('[data-testid="video-player"].vjs-has-started').should('exist')
      
      cy.then(() => {
        const initTime = performance.now() - startTime
        expect(initTime).to.be.lessThan(2000) // 2초 이내
      })
      
      // 기본 컨트롤 확인
      cy.get('[data-testid="play-button"]').should('be.visible')
      cy.get('[data-testid="volume-slider"]').should('be.visible')
      cy.get('[data-testid="progress-bar"]').should('be.visible')
      cy.get('[data-testid="fullscreen-button"]').should('be.visible')
    })

    it('타임코드 정확도가 프레임 단위로 작동한다', () => {
      const targetTime = 65.234 // 1분 5초 234ms
      
      // 정확한 시간으로 이동
      cy.get('[data-testid="timecode-input"]')
        .clear()
        .type('01:05:234')
      
      cy.get('[data-testid="seek-to-timecode-button"]').click()
      
      // 현재 시간 확인 (프레임 단위 정확도)
      cy.get('[data-testid="current-time-display"]')
        .should('contain', '01:05:234')
      
      // 플레이어 내부 시간과 동기화 확인
      cy.get('[data-testid="video-player"]').then(($player) => {
        const videoElement = $player.find('video')[0] as HTMLVideoElement
        expect(Math.abs(videoElement.currentTime - targetTime)).to.be.lessThan(0.1)
      })
    })

    it('재생 속도 조절이 모든 속도에서 작동한다', () => {
      const testSpeeds = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '2']
      
      testSpeeds.forEach((speed) => {
        cy.get('[data-testid="playback-rate-menu"]').click()
        cy.get(`[data-testid="playback-rate-${speed}x"]`).click()
        
        // 속도 적용 확인
        cy.get('[data-testid="current-playback-rate"]')
          .should('contain', `${speed}x`)
        
        // 실제 비디오 엘리먼트 속도 확인
        cy.get('[data-testid="video-player"] video').should(($video) => {
          expect($video[0].playbackRate).to.equal(parseFloat(speed))
        })
      })
    })

    it('키보드 단축키가 모든 기능에서 작동한다', () => {
      cy.get('[data-testid="video-player"]').focus()
      
      // 스페이스바: 재생/일시정지
      cy.realPress('Space')
      cy.get('[data-testid="video-player"]').should('have.class', 'vjs-playing')
      
      cy.realPress('Space')
      cy.get('[data-testid="video-player"]').should('have.class', 'vjs-paused')
      
      // 좌우 화살표: 10초 이동
      cy.realPress('ArrowRight')
      cy.get('[data-testid="current-time-display"]').should('not.contain', '00:00:000')
      
      cy.realPress('ArrowLeft')
      cy.get('[data-testid="current-time-display"]').should('contain', '00:00:000')
      
      // J, K, L: -10초, 일시정지, +10초
      cy.realPress('j')
      cy.realPress('k')
      cy.realPress('l')
      
      // M: 음소거
      cy.realPress('m')
      cy.get('[data-testid="volume-button"]').should('have.class', 'vjs-vol-0')
      
      // F: 전체화면
      cy.realPress('f')
      cy.get('[data-testid="video-player"]').should('have.class', 'vjs-fullscreen')
      
      // ESC로 전체화면 해제
      cy.realPress('Escape')
      cy.get('[data-testid="video-player"]').should('not.have.class', 'vjs-fullscreen')
    })
  })

  describe('3. 타임코드 기반 댓글 시스템', () => {
    beforeEach(() => {
      cy.visit(`/feedback/video/${testProjectId}`)
      cy.get('[data-testid="video-player"]').should('be.visible')
    })

    it('특정 시간대에 댓글을 등록한다', () => {
      const testComment = {
        timecode: '00:01:30',
        content: '이 장면의 조명이 너무 어둡습니다.',
        category: 'technical',
        priority: 'high'
      }
      
      // 특정 시간으로 이동
      cy.get('[data-testid="timecode-input"]')
        .clear()
        .type(testComment.timecode)
      
      cy.get('[data-testid="seek-to-timecode-button"]').click()
      
      // 댓글 추가 버튼 클릭
      cy.get('[data-testid="add-comment-button"]').click()
      
      // 타임코드 자동 입력 확인
      cy.get('[data-testid="comment-timecode-display"]')
        .should('contain', testComment.timecode)
      
      // 댓글 내용 입력
      cy.get('[data-testid="comment-textarea"]')
        .type(testComment.content)
      
      // 카테고리 선택
      cy.get('[data-testid="comment-category-select"]')
        .select(testComment.category)
      
      // 우선순위 선택
      cy.get('[data-testid="comment-priority-select"]')
        .select(testComment.priority)
      
      // 댓글 저장
      cy.get('[data-testid="save-comment-button"]').click()
      
      // 댓글 목록에서 확인
      cy.get('[data-testid="comment-list"]')
        .should('contain', testComment.content)
        .and('contain', testComment.timecode)
      
      // 우선순위 표시 확인
      cy.get('[data-testid="comment-priority-badge"]')
        .should('have.class', 'priority-high')
    })

    it('댓글 마커가 타임라인에 정확히 표시된다', () => {
      const testComments = [
        { timecode: '00:00:30', content: '첫 번째 댓글' },
        { timecode: '00:01:15', content: '두 번째 댓글' },
        { timecode: '00:02:45', content: '세 번째 댓글' }
      ]
      
      // 여러 댓글 추가
      testComments.forEach((comment) => {
        cy.addTimecodeComment({
          timecode: comment.timecode,
          comment: comment.content
        })
      })
      
      // 타임라인에 마커 표시 확인
      cy.get('[data-testid="timeline-markers"]')
        .find('[data-testid="comment-marker"]')
        .should('have.length', 3)
      
      // 각 마커 위치 확인
      testComments.forEach((comment, index) => {
        cy.get(`[data-testid="comment-marker-${index}"]`)
          .should('have.attr', 'data-timecode', comment.timecode)
      })
      
      // 마커 호버 시 댓글 미리보기 확인
      cy.get('[data-testid="comment-marker-0"]').trigger('mouseenter')
      cy.get('[data-testid="comment-tooltip"]')
        .should('contain', testComments[0].content)
        .and('contain', testComments[0].timecode)
    })

    it('댓글 클릭 시 해당 시간으로 정확히 이동한다', () => {
      const targetComment = {
        timecode: '00:02:15',
        content: '테스트 댓글입니다'
      }
      
      // 댓글 추가
      cy.addTimecodeComment(targetComment)
      
      // 다른 시간으로 이동
      cy.get('[data-testid="timecode-input"]')
        .clear()
        .type('00:00:00')
      
      cy.get('[data-testid="seek-to-timecode-button"]').click()
      
      // 댓글 목록에서 댓글 클릭
      cy.get('[data-testid="comment-list"]')
        .contains(targetComment.content)
        .click()
      
      // 정확한 시간으로 이동했는지 확인
      cy.get('[data-testid="current-time-display"]')
        .should('contain', targetComment.timecode)
      
      // 비디오 플레이어도 동기화되었는지 확인
      cy.get('[data-testid="video-player"] video').should(($video) => {
        const expectedSeconds = 2 * 60 + 15 // 2분 15초
        expect(Math.abs($video[0].currentTime - expectedSeconds)).to.be.lessThan(0.5)
      })
    })

    it('댓글 시간 범위 지정 기능을 테스트한다', () => {
      const rangeComment = {
        startTime: '00:01:00',
        endTime: '00:01:10',
        content: '이 구간 전체를 다시 검토해주세요'
      }
      
      // 시작 시간으로 이동
      cy.get('[data-testid="timecode-input"]')
        .clear()
        .type(rangeComment.startTime)
      
      cy.get('[data-testid="seek-to-timecode-button"]').click()
      
      // 댓글 추가 시작
      cy.get('[data-testid="add-comment-button"]').click()
      
      // 범위 모드 활성화
      cy.get('[data-testid="enable-time-range"]').check()
      
      // 종료 시간 설정
      cy.get('[data-testid="end-time-input"]')
        .clear()
        .type(rangeComment.endTime)
      
      // 댓글 내용 입력
      cy.get('[data-testid="comment-textarea"]')
        .type(rangeComment.content)
      
      cy.get('[data-testid="save-comment-button"]').click()
      
      // 범위 표시 확인
      cy.get('[data-testid="timeline-range-marker"]').should('be.visible')
      cy.get('[data-testid="comment-time-range"]')
        .should('contain', `${rangeComment.startTime} - ${rangeComment.endTime}`)
    })
  })

  describe('4. 실시간 댓글 동기화 (WebSocket)', () => {
    beforeEach(() => {
      cy.visit(`/feedback/video/${testProjectId}`)
      
      // WebSocket 연결 모킹
      cy.window().then((win) => {
        const mockWS = {
          send: cy.stub().as('wsSend'),
          close: cy.stub().as('wsClose'),
          readyState: 1, // WebSocket.OPEN
          onmessage: null,
          onopen: null,
          onclose: null,
          onerror: null
        }
        
        win.WebSocket = cy.stub().returns(mockWS).as('WebSocketConstructor')
        win.__mockWS = mockWS // 테스트에서 접근 가능하도록
      })
    })

    it('WebSocket 연결이 올바르게 설정된다', () => {
      // WebSocket 연결 확인
      cy.get('@WebSocketConstructor').should('have.been.calledWith', 
        'wss://videoplanet.up.railway.app/ws/video-feedback/' + testProjectId + '/')
      
      // 연결 상태 표시 확인
      cy.get('[data-testid="connection-status"]')
        .should('contain', '연결됨')
        .and('have.class', 'status-connected')
    })

    it('실시간 댓글 동기화가 500ms 이내에 작동한다', () => {
      // 현재 사용자 댓글 추가
      const userComment = {
        timecode: '00:01:30',
        content: '현재 사용자의 댓글입니다',
        author: 'current-user'
      }
      
      cy.addTimecodeComment(userComment)
      
      // WebSocket 메시지 전송 확인
      cy.get('@wsSend').should('have.been.called')
      
      // 다른 사용자의 댓글 시뮬레이션
      const incomingComment = {
        id: 'comment-realtime-123',
        videoId: testProjectId,
        author: {
          id: 'other-user',
          name: '다른 팀원',
          avatar: '/avatars/other-user.jpg',
          role: 'editor'
        },
        content: '실시간으로 추가된 댓글입니다',
        timestamp: 95.5, // 1분 35.5초
        timecode: '00:01:35',
        type: 'text',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString()
      }
      
      // WebSocket 메시지 수신 시뮬레이션
      const startTime = performance.now()
      
      cy.window().then((win) => {
        const mockWS = win.__mockWS
        if (mockWS && mockWS.onmessage) {
          mockWS.onmessage({
            data: JSON.stringify({
              type: 'comment_added',
              payload: { comment: incomingComment }
            })
          })
        }
      })
      
      // 실시간 댓글 표시 확인 (500ms 이내)
      cy.get('[data-testid="comment-list"]')
        .should('contain', incomingComment.content)
        .then(() => {
          const syncTime = performance.now() - startTime
          expect(syncTime).to.be.lessThan(500) // 500ms 이내
        })
      
      // 타임라인 마커도 실시간 업데이트 확인
      cy.get('[data-testid="timeline-markers"]')
        .find(`[data-testid="comment-marker"][data-timecode="${incomingComment.timecode}"]`)
        .should('exist')
    })

    it('사용자별 댓글 색상 구분이 작동한다', () => {
      const users = [
        { id: 'user-1', name: '사용자1', color: '#FF6B6B' },
        { id: 'user-2', name: '사용자2', color: '#4ECDC4' },
        { id: 'user-3', name: '사용자3', color: '#45B7D1' }
      ]
      
      users.forEach((user) => {
        const comment = {
          id: `comment-${user.id}`,
          author: { ...user, role: 'member' },
          content: `${user.name}의 댓글입니다`,
          timestamp: 60,
          timecode: '00:01:00'
        }
        
        // WebSocket으로 댓글 수신 시뮬레이션
        cy.window().then((win) => {
          const mockWS = win.__mockWS
          if (mockWS && mockWS.onmessage) {
            mockWS.onmessage({
              data: JSON.stringify({
                type: 'comment_added',
                payload: { comment }
              })
            })
          }
        })
        
        // 색상 구분 확인
        cy.get(`[data-testid="comment-${comment.id}"]`)
          .should('have.css', 'border-left-color', user.color)
        
        cy.get(`[data-testid="comment-avatar-${comment.id}"]`)
          .should('have.css', 'border-color', user.color)
      })
    })

    it('댓글 알림 시스템이 작동한다', () => {
      // 멘션이 포함된 댓글 시뮬레이션
      const mentionComment = {
        id: 'comment-mention-123',
        author: {
          id: 'other-user',
          name: '다른 팀원'
        },
        content: '@current-user 이 부분 어떻게 생각하세요?',
        mentions: ['current-user'],
        timestamp: 120,
        timecode: '00:02:00'
      }
      
      cy.window().then((win) => {
        const mockWS = win.__mockWS
        if (mockWS && mockWS.onmessage) {
          mockWS.onmessage({
            data: JSON.stringify({
              type: 'comment_added',
              payload: { comment: mentionComment }
            })
          })
        }
      })
      
      // 알림 배지 확인
      cy.get('[data-testid="notification-badge"]')
        .should('be.visible')
        .and('contain', '1')
      
      // 브라우저 알림 확인 (권한이 있을 때)
      cy.window().its('Notification').then((Notification) => {
        if (Notification && Notification.permission === 'granted') {
          cy.get('@notificationSpy').should('have.been.calledWith', 
            '새로운 멘션', 
            { body: '다른 팀원이 회원님을 멘션했습니다.' }
          )
        }
      })
      
      // 알림 클릭 시 댓글로 이동
      cy.get('[data-testid="notification-badge"]').click()
      cy.get('[data-testid="notification-list"]')
        .find('[data-testid="notification-item"]')
        .first()
        .click()
      
      // 해당 댓글로 스크롤 및 하이라이트 확인
      cy.get(`[data-testid="comment-${mentionComment.id}"]`)
        .should('be.visible')
        .and('have.class', 'highlighted')
    })

    it('WebSocket 연결 끊어짐 및 재연결 처리를 테스트한다', () => {
      // 연결 끊어짐 시뮬레이션
      cy.window().then((win) => {
        const mockWS = win.__mockWS
        if (mockWS && mockWS.onclose) {
          mockWS.onclose({ code: 1006, reason: 'Connection lost' })
        }
      })
      
      // 연결 상태 변경 확인
      cy.get('[data-testid="connection-status"]')
        .should('contain', '연결 끊어짐')
        .and('have.class', 'status-disconnected')
      
      // 재연결 시도 표시
      cy.get('[data-testid="reconnecting-indicator"]')
        .should('contain', '재연결 중...')
      
      // 재연결 성공 시뮬레이션
      cy.window().then((win) => {
        const mockWS = win.__mockWS
        if (mockWS && mockWS.onopen) {
          mockWS.onopen({})
        }
      })
      
      // 연결 복구 확인
      cy.get('[data-testid="connection-status"]')
        .should('contain', '연결됨')
        .and('have.class', 'status-connected')
    })
  })

  describe('5. 다중 해상도 지원', () => {
    beforeEach(() => {
      cy.visit(`/feedback/video/${testProjectId}`)
    })

    it('업로드 시 자동 인코딩으로 다중 해상도를 생성한다', () => {
      // 업로드 후 인코딩 프로세스 확인
      cy.get('[data-testid="encoding-status"]').should('contain', '인코딩 중')
      
      // 인코딩 진행 상황 확인
      const expectedResolutions = ['480p', '720p', '1080p']
      
      expectedResolutions.forEach((resolution) => {
        cy.get(`[data-testid="encoding-${resolution}"]`)
          .should('contain', '진행 중')
      })
      
      // 인코딩 완료 확인 (타임아웃 10분)
      cy.get('[data-testid="encoding-complete"]', { timeout: 600000 })
        .should('be.visible')
      
      // 생성된 해상도 옵션 확인
      cy.get('[data-testid="quality-selector"]').click()
      
      expectedResolutions.forEach((resolution) => {
        cy.get(`[data-testid="quality-option-${resolution}"]`)
          .should('be.visible')
          .and('not.have.class', 'disabled')
      })
    })

    it('네트워크 상태에 따른 적응형 품질 조정이 작동한다', () => {
      // 네트워크 속도 시뮬레이션 - 느린 연결
      cy.window().then((win) => {
        // Navigator.connection API 모킹
        Object.defineProperty(win.navigator, 'connection', {
          value: {
            effectiveType: '2g',
            downlink: 0.5, // 0.5 Mbps
            rtt: 2000
          },
          configurable: true
        })
        
        // 네트워크 변경 이벤트 트리거
        win.dispatchEvent(new Event('online'))
      })
      
      // 자동으로 낮은 품질로 전환되는지 확인
      cy.get('[data-testid="current-quality"]')
        .should('contain', '480p')
      
      cy.get('[data-testid="adaptive-quality-indicator"]')
        .should('contain', '네트워크 상태에 따라 자동 조정됨')
      
      // 빠른 연결로 변경
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'connection', {
          value: {
            effectiveType: '4g',
            downlink: 10, // 10 Mbps
            rtt: 50
          },
          configurable: true
        })
        
        win.dispatchEvent(new Event('online'))
      })
      
      // 높은 품질로 자동 전환 확인
      cy.get('[data-testid="current-quality"]', { timeout: 5000 })
        .should('contain', '1080p')
    })

    it('수동 품질 선택이 우선되고 버퍼링 상태를 모니터링한다', () => {
      // 수동으로 높은 품질 선택
      cy.get('[data-testid="quality-selector"]').click()
      cy.get('[data-testid="quality-option-1080p"]').click()
      
      // 품질 변경 확인
      cy.get('[data-testid="current-quality"]')
        .should('contain', '1080p')
      
      // 버퍼링 모니터링
      cy.get('[data-testid="video-player"]').click() // 재생 시작
      
      // 버퍼링 상태 확인
      cy.get('[data-testid="buffering-indicator"]')
        .should('be.visible')
      
      // 버퍼링 완료 후 재생 시작
      cy.get('[data-testid="video-player"]')
        .should('not.have.class', 'vjs-waiting')
      
      // 버퍼링 통계 확인
      cy.get('[data-testid="buffer-health"]')
        .should('contain', '버퍼: ')
        .and('contain', '초')
    })

    it('썸네일이 자동 생성되고 시간별로 표시된다', () => {
      // 썸네일 스트립 확인
      cy.get('[data-testid="thumbnail-strip"]').should('be.visible')
      
      // 프로그레스 바 호버 시 썸네일 미리보기
      cy.get('[data-testid="progress-bar"]')
        .trigger('mousemove', { clientX: 100 })
      
      cy.get('[data-testid="thumbnail-preview"]')
        .should('be.visible')
        .find('img')
        .should('have.attr', 'src')
        .and('include', '/thumbnails/')
      
      // 썸네일 시간 표시
      cy.get('[data-testid="thumbnail-time"]')
        .should('be.visible')
        .and('match', /\d{2}:\d{2}:\d{2}/)
      
      // 다양한 위치에서 썸네일 확인
      const positions = [25, 50, 75]
      positions.forEach((percent) => {
        cy.get('[data-testid="progress-bar"]')
          .trigger('mousemove', `${percent}%`)
        
        cy.get('[data-testid="thumbnail-preview"] img')
          .should('be.visible')
          .and(($img) => {
            expect($img[0].complete).to.be.true
          })
      })
    })
  })

  describe('6. 협업 기능', () => {
    beforeEach(() => {
      cy.visit(`/feedback/video/${testProjectId}`)
      
      // 다중 사용자 시뮬레이션 설정
      cy.window().then((win) => {
        win.__collaborativeUsers = [
          { id: 'user-1', name: '김감독', color: '#FF6B6B', role: 'director' },
          { id: 'user-2', name: '이편집자', color: '#4ECDC4', role: 'editor' },
          { id: 'user-3', name: '박클라이언트', color: '#45B7D1', role: 'client' }
        ]
      })
    })

    it('동시 시청 기능이 작동한다', () => {
      // 현재 사용자가 특정 시간으로 이동
      const syncTime = '00:01:45'
      
      cy.get('[data-testid="timecode-input"]')
        .clear()
        .type(syncTime)
      
      cy.get('[data-testid="seek-to-timecode-button"]').click()
      
      // 동시 시청 모드 활성화
      cy.get('[data-testid="sync-viewing-toggle"]').click()
      
      // 다른 사용자들이 동일한 시간으로 이동했다고 시뮬레이션
      cy.get('[data-testid="sync-status"]')
        .should('contain', '동시 시청 중')
        .and('contain', '3명이 시청 중')
      
      // 사용자 목록 표시
      cy.get('[data-testid="collaborative-users-list"]').should('be.visible')
      
      cy.window().then((win) => {
        win.__collaborativeUsers.forEach((user) => {
          cy.get(`[data-testid="user-${user.id}"]`)
            .should('be.visible')
            .and('contain', user.name)
            .and('have.css', 'border-color', user.color)
        })
      })
      
      // 재생 동기화 테스트
      cy.get('[data-testid="video-player"]').click() // 재생 시작
      
      // WebSocket을 통한 재생 상태 동기화 확인
      cy.get('@wsSend').should('have.been.calledWith', 
        cy.match(/playback_sync.*"isPlaying":true/)
      )
    })

    it('사용자별 댓글 색상과 역할이 구분된다', () => {
      cy.window().then((win) => {
        win.__collaborativeUsers.forEach((user, index) => {
          const comment = {
            id: `comment-${user.id}`,
            author: user,
            content: `${user.role}의 관점에서 본 피드백입니다`,
            timestamp: 60 + index * 5,
            timecode: `00:01:0${index}`,
            priority: user.role === 'director' ? 'high' : 'medium'
          }
          
          // WebSocket을 통한 댓글 추가 시뮬레이션
          const mockWS = win.__mockWS
          if (mockWS && mockWS.onmessage) {
            mockWS.onmessage({
              data: JSON.stringify({
                type: 'comment_added',
                payload: { comment }
              })
            })
          }
          
          // 역할별 색상 및 아이콘 확인
          cy.get(`[data-testid="comment-${comment.id}"]`)
            .should('be.visible')
            .and('have.css', 'border-left-color', user.color)
          
          cy.get(`[data-testid="comment-role-${comment.id}"]`)
            .should('contain', user.role)
          
          // 감독의 댓글은 우선순위가 높게 표시
          if (user.role === 'director') {
            cy.get(`[data-testid="comment-${comment.id}"]`)
              .should('have.class', 'priority-high')
          }
        })
      })
    })

    it('실시간 커서 및 상호작용 표시가 작동한다', () => {
      // 다른 사용자의 커서 이동 시뮬레이션
      const cursorData = {
        userId: 'user-1',
        userName: '김감독',
        position: { x: 300, y: 200 },
        timestamp: new Date().toISOString(),
        color: '#FF6B6B'
      }
      
      cy.window().then((win) => {
        const mockWS = win.__mockWS
        if (mockWS && mockWS.onmessage) {
          mockWS.onmessage({
            data: JSON.stringify({
              type: 'cursor_moved',
              payload: cursorData
            })
          })
        }
      })
      
      // 다른 사용자의 커서 표시 확인
      cy.get('[data-testid="collaborative-cursor-user-1"]')
        .should('be.visible')
        .and('have.css', 'left', '300px')
        .and('have.css', 'top', '200px')
        .and('have.css', 'border-color', cursorData.color)
      
      // 사용자 이름 툴팁 확인
      cy.get('[data-testid="cursor-tooltip-user-1"]')
        .should('contain', cursorData.userName)
      
      // 타이핑 상태 표시
      cy.window().then((win) => {
        const mockWS = win.__mockWS
        if (mockWS && mockWS.onmessage) {
          mockWS.onmessage({
            data: JSON.stringify({
              type: 'user_typing',
              payload: { userId: 'user-1', isTyping: true }
            })
          })
        }
      })
      
      cy.get('[data-testid="typing-indicator-user-1"]')
        .should('be.visible')
        .and('contain', '김감독님이 입력 중...')
    })

    it('댓글 알림 및 멘션 시스템이 작동한다', () => {
      // 현재 사용자를 멘션하는 댓글 추가
      const mentionComment = {
        id: 'comment-mention-test',
        author: {
          id: 'user-1',
          name: '김감독',
          role: 'director'
        },
        content: '@current-user 이 부분에 대한 의견을 듣고 싶습니다.',
        mentions: ['current-user'],
        timestamp: 90,
        timecode: '00:01:30'
      }
      
      cy.window().then((win) => {
        const mockWS = win.__mockWS
        if (mockWS && mockWS.onmessage) {
          mockWS.onmessage({
            data: JSON.stringify({
              type: 'comment_added',
              payload: { comment: mentionComment }
            })
          })
        }
      })
      
      // 멘션 알림 확인
      cy.get('[data-testid="mention-notification"]')
        .should('be.visible')
        .and('contain', '김감독님이 회원님을 멘션했습니다')
      
      // 알림 배지 업데이트
      cy.get('[data-testid="notification-count"]')
        .should('contain', '1')
      
      // 멘션된 댓글 하이라이트
      cy.get(`[data-testid="comment-${mentionComment.id}"]`)
        .should('have.class', 'mentioned')
      
      // 알림 클릭 시 해당 댓글로 이동
      cy.get('[data-testid="mention-notification"]').click()
      
      cy.get(`[data-testid="comment-${mentionComment.id}"]`)
        .should('be.visible')
        .and('have.class', 'focused')
      
      // 비디오도 해당 시간으로 이동
      cy.get('[data-testid="current-time-display"]')
        .should('contain', mentionComment.timecode)
    })
  })

  describe('7. 성능 요구사항', () => {
    it('업로드 속도가 네트워크 대역폭의 80% 활용한다', () => {
      // 네트워크 대역폭 측정 시뮬레이션
      cy.window().then((win) => {
        // Navigator.connection API 모킹
        Object.defineProperty(win.navigator, 'connection', {
          value: {
            downlink: 10, // 10 Mbps
            effectiveType: '4g'
          }
        })
      })
      
      const startTime = Date.now()
      let uploadSpeed = 0
      
      // 파일 업로드 시작
      cy.get('[data-testid="video-upload-input"]')
        .selectFile(testVideoFile, { force: true })
      
      cy.get('[data-testid="start-upload-button"]').click()
      
      // 업로드 속도 모니터링
      cy.get('[data-testid="upload-speed-display"]').should(($speedDisplay) => {
        const speedText = $speedDisplay.text()
        const speed = parseFloat(speedText.match(/(\d+\.?\d*)\s*Mbps/)?.[1] || '0')
        uploadSpeed = speed
        
        // 네트워크 대역폭의 80% 이상 활용하는지 확인
        const expectedMinSpeed = 10 * 0.8 // 8 Mbps
        expect(speed).to.be.greaterThan(expectedMinSpeed)
      })
      
      cy.get('[data-testid="upload-complete"]', { timeout: 300000 }).should('exist')
    })

    it('플레이어 초기화가 2초 이내에 완료된다', () => {
      const startTime = performance.now()
      
      // 새로운 비디오 페이지로 이동
      cy.visit(`/feedback/video/${testProjectId}`)
      
      // 플레이어 로딩 시작 확인
      cy.get('[data-testid="video-player-loading"]').should('be.visible')
      
      // 플레이어 초기화 완료 확인
      cy.get('[data-testid="video-player"].vjs-has-started')
        .should('exist')
        .then(() => {
          const initTime = performance.now() - startTime
          expect(initTime).to.be.lessThan(2000) // 2초 이내
        })
      
      // 기본 컨트롤들이 모두 로드되었는지 확인
      cy.get('[data-testid="play-button"]').should('be.visible')
      cy.get('[data-testid="volume-slider"]').should('be.visible')
      cy.get('[data-testid="progress-bar"]').should('be.visible')
      cy.get('[data-testid="fullscreen-button"]').should('be.visible')
    })

    it('댓글 동기화가 500ms 이내에 완료된다', () => {
      const syncTimes: number[] = []
      
      // 5개의 댓글에 대해 동기화 시간 측정
      for (let i = 0; i < 5; i++) {
        const comment = {
          id: `perf-test-comment-${i}`,
          content: `성능 테스트 댓글 ${i}`,
          timestamp: 60 + i * 5,
          timecode: `00:01:0${i}`,
          author: { id: 'test-user', name: '테스트 사용자' }
        }
        
        const startTime = performance.now()
        
        // WebSocket 메시지 시뮬레이션
        cy.window().then((win) => {
          const mockWS = win.__mockWS
          if (mockWS && mockWS.onmessage) {
            mockWS.onmessage({
              data: JSON.stringify({
                type: 'comment_added',
                payload: { comment }
              })
            })
          }
        })
        
        // 댓글이 화면에 표시되는지 확인하고 시간 측정
        cy.get(`[data-testid="comment-${comment.id}"]`)
          .should('be.visible')
          .then(() => {
            const syncTime = performance.now() - startTime
            syncTimes.push(syncTime)
            expect(syncTime).to.be.lessThan(500) // 500ms 이내
          })
      }
      
      cy.then(() => {
        const avgSyncTime = syncTimes.reduce((a, b) => a + b) / syncTimes.length
        cy.log(`평균 동기화 시간: ${avgSyncTime.toFixed(2)}ms`)
        expect(avgSyncTime).to.be.lessThan(300) // 평균 300ms 이내
      })
    })

    it('모바일 터치 제스처가 반응적으로 작동한다', () => {
      // 모바일 뷰포트로 변경
      cy.viewport(375, 667) // iPhone SE 크기
      
      // 터치 이벤트 시뮬레이션을 위한 설정
      cy.get('[data-testid="video-player"]').as('videoPlayer')
      
      // 탭하여 재생/일시정지
      cy.get('@videoPlayer').realTouch()
      cy.get('[data-testid="video-player"]').should('have.class', 'vjs-playing')
      
      cy.get('@videoPlayer').realTouch()
      cy.get('[data-testid="video-player"]').should('have.class', 'vjs-paused')
      
      // 더블 탭으로 빠르게 10초 이동
      cy.get('@videoPlayer').dblclick()
      cy.get('[data-testid="current-time-display"]')
        .should('not.contain', '00:00:000')
      
      // 스와이프 제스처로 시간 이동
      cy.get('@videoPlayer')
        .trigger('touchstart', { touches: [{ clientX: 100, clientY: 200 }] })
        .trigger('touchmove', { touches: [{ clientX: 200, clientY: 200 }] })
        .trigger('touchend')
      
      // 핀치 줌 제스처 (전체화면)
      cy.get('@videoPlayer')
        .trigger('touchstart', { 
          touches: [
            { clientX: 100, clientY: 100 },
            { clientX: 200, clientY: 200 }
          ] 
        })
        .trigger('touchmove', { 
          touches: [
            { clientX: 50, clientY: 50 },
            { clientX: 250, clientY: 250 }
          ] 
        })
        .trigger('touchend')
      
      // 모바일 컨트롤 패널 확인
      cy.get('[data-testid="mobile-controls"]').should('be.visible')
      cy.get('[data-testid="mobile-timeline"]').should('be.visible')
    })

    it('메모리 사용량이 안정적으로 관리된다', () => {
      // 초기 메모리 사용량 측정
      let initialMemory: number
      let peakMemory: number
      
      cy.window().then((win) => {
        if ('performance' in win && 'memory' in win.performance) {
          initialMemory = (win.performance as any).memory.usedJSHeapSize
        }
      })
      
      // 대량의 댓글 생성으로 메모리 압박 테스트
      for (let i = 0; i < 100; i++) {
        const comment = {
          id: `memory-test-${i}`,
          content: `메모리 테스트 댓글 ${i}`.repeat(10), // 긴 내용
          timestamp: i * 2,
          author: { id: `user-${i}`, name: `사용자${i}` }
        }
        
        cy.window().then((win) => {
          const mockWS = win.__mockWS
          if (mockWS && mockWS.onmessage) {
            mockWS.onmessage({
              data: JSON.stringify({
                type: 'comment_added',
                payload: { comment }
              })
            })
          }
        })
      }
      
      // 메모리 사용량 확인
      cy.window().then((win) => {
        if ('performance' in win && 'memory' in win.performance) {
          const currentMemory = (win.performance as any).memory.usedJSHeapSize
          const memoryIncrease = currentMemory - initialMemory
          
          // 메모리 증가량이 합리적인 범위 내인지 확인 (100MB 미만)
          expect(memoryIncrease).to.be.lessThan(100 * 1024 * 1024)
          
          peakMemory = currentMemory
        }
      })
      
      // 일부 댓글 삭제 후 가비지 컬렉션 확인
      for (let i = 0; i < 50; i++) {
        cy.window().then((win) => {
          const mockWS = win.__mockWS
          if (mockWS && mockWS.onmessage) {
            mockWS.onmessage({
              data: JSON.stringify({
                type: 'comment_deleted',
                payload: { commentId: `memory-test-${i}` }
              })
            })
          }
        })
      }
      
      // 가비지 컬렉션 유도 (실제로는 브라우저가 제어)
      cy.wait(2000)
      
      cy.window().then((win) => {
        if ('performance' in win && 'memory' in win.performance) {
          const finalMemory = (win.performance as any).memory.usedJSHeapSize
          
          // 메모리가 일부 해제되었는지 확인
          expect(finalMemory).to.be.lessThan(peakMemory)
        }
      })
    })
  })

  describe('8. 접근성 및 사용성', () => {
    it('스크린 리더 호환성이 완전히 작동한다', () => {
      // 페이지 구조 및 랜드마크 확인
      cy.get('[role="main"]').should('exist')
      cy.get('[role="navigation"]').should('exist')
      cy.get('[role="complementary"]').should('exist') // 댓글 사이드바
      
      // 비디오 플레이어 접근성
      cy.get('[data-testid="video-player"]')
        .should('have.attr', 'role', 'application')
        .and('have.attr', 'aria-label')
      
      // 재생/일시정지 버튼
      cy.get('[data-testid="play-button"]')
        .should('have.attr', 'aria-label')
        .and('have.attr', 'aria-pressed')
      
      // 시간 정보 live region
      cy.get('[data-testid="current-time-display"]')
        .should('have.attr', 'aria-live', 'polite')
      
      // 댓글 목록 구조
      cy.get('[data-testid="comment-list"]')
        .should('have.attr', 'role', 'log')
        .and('have.attr', 'aria-live', 'polite')
      
      // 각 댓글 항목
      cy.get('[data-testid="comment-list"] > *').each(($comment) => {
        cy.wrap($comment)
          .should('have.attr', 'role', 'article')
          .and('have.attr', 'aria-label')
      })
    })

    it('키보드 탐색이 논리적 순서로 작동한다', () => {
      // 탭 순서 확인
      const expectedTabOrder = [
        '[data-testid="video-player"]',
        '[data-testid="play-button"]',
        '[data-testid="timecode-input"]',
        '[data-testid="volume-slider"]',
        '[data-testid="quality-selector"]',
        '[data-testid="fullscreen-button"]',
        '[data-testid="add-comment-button"]',
        '[data-testid="comment-textarea"]'
      ]
      
      expectedTabOrder.forEach((selector, index) => {
        if (index === 0) {
          cy.get(selector).focus()
        } else {
          cy.realPress('Tab')
        }
        
        cy.focused().should('match', selector)
      })
      
      // Shift+Tab으로 역방향 탐색
      cy.realPress(['Shift', 'Tab'])
      cy.focused().should('match', expectedTabOrder[expectedTabOrder.length - 2])
    })

    it('고대비 모드에서 UI가 명확하게 구분된다', () => {
      // 고대비 모드 시뮬레이션
      cy.get('body').invoke('addClass', 'high-contrast-mode')
      
      // 주요 UI 요소들의 대비 확인
      const elements = [
        '[data-testid="video-player"]',
        '[data-testid="comment-list"]',
        '[data-testid="add-comment-button"]',
        '[data-testid="timecode-input"]'
      ]
      
      elements.forEach((selector) => {
        cy.get(selector).should(($el) => {
          const styles = window.getComputedStyle($el[0])
          const bgColor = styles.backgroundColor
          const textColor = styles.color
          const borderColor = styles.borderColor
          
          // 배경과 텍스트가 투명하지 않은지 확인
          expect(bgColor).not.to.equal('rgba(0, 0, 0, 0)')
          expect(textColor).not.to.equal('rgba(0, 0, 0, 0)')
          
          // 테두리가 있는 경우 충분한 대비 확인
          if (borderColor !== 'rgba(0, 0, 0, 0)') {
            expect(borderColor).not.to.equal(bgColor)
          }
        })
      })
    })

    it('음성 명령 및 대체 입력 방식을 지원한다', () => {
      // 음성 명령 시뮬레이션 (Web Speech API)
      cy.window().then((win) => {
        // SpeechRecognition 모킹
        const mockRecognition = {
          start: cy.stub(),
          stop: cy.stub(),
          onresult: null,
          onend: null,
          continuous: true,
          interimResults: true
        }
        
        win.SpeechRecognition = cy.stub().returns(mockRecognition)
        win.webkitSpeechRecognition = cy.stub().returns(mockRecognition)
        
        // 음성 명령 활성화
        cy.get('[data-testid="voice-command-toggle"]').click()
        
        // "재생" 명령 시뮬레이션
        if (mockRecognition.onresult) {
          mockRecognition.onresult({
            results: [{
              0: { transcript: '재생' },
              isFinal: true
            }]
          })
        }
        
        // 재생 상태 확인
        cy.get('[data-testid="video-player"]')
          .should('have.class', 'vjs-playing')
        
        // "일시정지" 명령
        if (mockRecognition.onresult) {
          mockRecognition.onresult({
            results: [{
              0: { transcript: '일시정지' },
              isFinal: true
            }]
          })
        }
        
        cy.get('[data-testid="video-player"]')
          .should('have.class', 'vjs-paused')
      })
    })
  })
})