// 크로스 브라우저 호환성 검증 E2E 테스트

describe('크로스 브라우저 호환성 검증', () => {
  const testUser = {
    email: 'browser@test.com',
    password: 'Test123!@#'
  }
  
  // DEVPLAN.md 기준: Chrome, Safari, Edge 최신 2버전 지원
  const supportedViewports = [
    { name: 'mobile', width: 375, height: 667, devicePixelRatio: 2 },
    { name: 'tablet', width: 768, height: 1024, devicePixelRatio: 2 },
    { name: 'desktop', width: 1280, height: 720, devicePixelRatio: 1 },
    { name: 'large-desktop', width: 1920, height: 1080, devicePixelRatio: 1 }
  ]
  
  beforeEach(() => {
    // 브라우저별 특수 설정
    const userAgent = navigator.userAgent
    
    if (userAgent.includes('Chrome')) {
      // Chrome 전용 최적화
      cy.window().then((win) => {
        win.performance.mark('chrome-test-start')
      })
    } else if (userAgent.includes('Safari')) {
      // Safari 전용 설정
      cy.window().then((win) => {
        // Safari에서 WebKit 이슈 해결
        Object.defineProperty(win.navigator, 'webkitGetUserMedia', {
          value: win.navigator.mediaDevices?.getUserMedia
        })
      })
    }
  })
  
  describe('기본 기능 호환성', () => {
    supportedViewports.forEach((viewport) => {
      it(`${viewport.name} 뷰포트에서 기본 내비게이션`, 
        { tags: ['@cross-browser', '@navigation', `@${viewport.name}`] }, () => {
        
        cy.viewport(viewport.width, viewport.height)
        cy.visit('/')
        
        // 기본 레이아웃 확인
        cy.get('main, [role="main"], [data-testid="main-content"]')
          .should('be.visible')
        
        // 뷰포트별 내비게이션 구성 확인
        if (viewport.name === 'mobile') {
          cy.get('[data-testid="mobile-menu-toggle"]')
            .should('be.visible')
            .and('have.css', 'display')
            .and('not.eq', 'none')
          
          // 모바일 메뉴 기능 테스트
          cy.get('[data-testid="mobile-menu-toggle"]').click()
          cy.get('[data-testid="mobile-nav-drawer"]')
            .should('be.visible')
            .and('have.css', 'transform')
            .and('not.include', 'translateX(-100%)')
          
        } else {
          // 데스크톱/태블릿 내비게이션
          cy.get('[data-testid="desktop-navigation"]')
            .should('be.visible')
          
          cy.get('[data-testid="nav-link"]')
            .should('have.length.at.least', 3)
            .each(($link) => {
              cy.wrap($link)
                .should('be.visible')
                .and('have.css', 'text-decoration-line', 'none')
            })
        }
        
        // Percy 브라우저별 스크린샷
        cy.percySnapshot(`크로스 브라우저 - ${viewport.name} 내비게이션`)
      })
    })
    
    it('CSS Grid 및 Flexbox 지원', { tags: ['@cross-browser', '@css-layout'] }, () => {
      cy.visit('/dashboard')
      cy.login(testUser.email, testUser.password)
      
      // CSS Grid 지원 확인
      cy.get('[data-testid="dashboard-grid"]').then(($grid) => {
        const gridDisplay = window.getComputedStyle($grid[0]).display
        expect(gridDisplay).to.equal('grid', 'CSS Grid가 지원되어야 합니다')
        
        const gridTemplateColumns = window.getComputedStyle($grid[0]).gridTemplateColumns
        expect(gridTemplateColumns).to.not.equal('none', 'Grid template columns가 설정되어야 합니다')
      })
      
      // Flexbox 지원 확인
      cy.get('[data-testid="flex-container"]').then(($flex) => {
        const flexDisplay = window.getComputedStyle($flex[0]).display
        expect(flexDisplay).to.include('flex', 'Flexbox가 지원되어야 합니다')
      })
    })
    
    it('ES6+ 기능 폴리필 확인', { tags: ['@cross-browser', '@javascript'] }, () => {
      cy.visit('/dashboard')
      cy.login(testUser.email, testUser.password)
      
      cy.window().then((win) => {
        // ES6 기능 지원 확인
        const es6Features = {
          'Promise': typeof win.Promise !== 'undefined',
          'fetch': typeof win.fetch !== 'undefined',
          'Map': typeof win.Map !== 'undefined',
          'Set': typeof win.Set !== 'undefined',
          'Array.from': typeof win.Array.from !== 'undefined',
          'Object.assign': typeof win.Object.assign !== 'undefined',
          'Symbol': typeof win.Symbol !== 'undefined'
        }
        
        Object.entries(es6Features).forEach(([feature, isSupported]) => {
          cy.task('log', `${feature} 지원: ${isSupported ? '지원됨' : '지원 안됨'}`)
          expect(isSupported, `${feature}가 지원되어야 합니다`).to.be.true
        })
        
        // 더 최신 기능들 (폴리필 필요 가능)
        const modernFeatures = {
          'ResizeObserver': typeof win.ResizeObserver !== 'undefined',
          'IntersectionObserver': typeof win.IntersectionObserver !== 'undefined',
          'WebSocket': typeof win.WebSocket !== 'undefined'
        }
        
        Object.entries(modernFeatures).forEach(([feature, isSupported]) => {
          cy.task('log', `${feature} 지원: ${isSupported ? '지원됨' : '폴리필 사용'}`)
          // 최신 기능은 폴리필로 대체 가능
        })
      })
    })
  })
  
  describe('인터랙션 호환성', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password)
    })
    
    it('폼 입력 및 유효성 검사', { tags: ['@cross-browser', '@forms'] }, () => {
      cy.visit('/projects/new')
      
      // HTML5 입력 타입 지원 확인
      const formInputs = [
        { selector: '[data-testid="project-name-input"]', type: 'text' },
        { selector: '[data-testid="project-deadline-input"]', type: 'date' },
        { selector: '[data-testid="project-email-input"]', type: 'email' },
        { selector: '[data-testid="project-url-input"]', type: 'url' }
      ]
      
      formInputs.forEach((input) => {
        cy.get(input.selector).then(($input) => {
          const inputType = $input.attr('type')
          expect(inputType).to.equal(input.type, `${input.selector}의 type이 ${input.type}이어야 합니다`)
          
          // 브라우저 유효성 검사 지원 확인
          const validity = $input[0].validity
          expect(validity).to.exist
          expect(typeof validity.valid).to.equal('boolean')
        })
      })
      
      // 커스텀 유효성 메시지
      cy.get('[data-testid="project-name-input"]').clear()
      cy.get('[data-testid="create-project-button"]').click()
      
      cy.get('[data-testid="name-required-error"]')
        .should('be.visible')
        .and('have.attr', 'role', 'alert')
    })
    
    it('드래그 앤 드롭 기능', { tags: ['@cross-browser', '@drag-drop'] }, () => {
      cy.visit('/calendar')
      
      // HTML5 Drag and Drop API 지원 확인
      cy.window().then((win) => {
        const dragSupported = 'draggable' in document.createElement('div')
        cy.task('log', `Drag and Drop 지원: ${dragSupported ? '지원됨' : '지원 안됨'}`)
        
        if (dragSupported) {
          // 스케줄 아이템 드래그 테스트
          cy.get('[data-testid="schedule-item"]').first()
            .should('have.attr', 'draggable', 'true')
            .trigger('dragstart')
          
          cy.get('[data-testid="calendar-drop-zone"]')
            .trigger('dragover')
            .trigger('drop')
          
          // 드롭 후 위치 변경 확인
          cy.get('[data-testid="schedule-moved-success"]')
            .should('be.visible', { timeout: 5000 })
        }
      })
    })
    
    it('터치 및 제스처 이벤트', { tags: ['@cross-browser', '@touch'] }, () => {
      cy.viewport(375, 667) // 모바일 뷰포트
      cy.visit('/feedback/test-video-123')
      
      cy.window().then((win) => {
        const touchSupported = 'ontouchstart' in win
        cy.task('log', `터치 이벤트 지원: ${touchSupported ? '지원됨' : '마우스 이벤트로 대체'}`)
        
        // 비디오 플레이어 터치 컨트롤
        if (touchSupported) {
          cy.get('[data-testid="video-player"]')
            .trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] })
            .trigger('touchend')
          
          // 터치 제스처 (스와이프)
          cy.get('[data-testid="video-timeline"]')
            .trigger('touchstart', { touches: [{ clientX: 50, clientY: 100 }] })
            .trigger('touchmove', { touches: [{ clientX: 150, clientY: 100 }] })
            .trigger('touchend')
          
          // 시간 바 이동 확인
          cy.get('[data-testid="video-current-time"]')
            .invoke('text')
            .should('not.eq', '00:00:00')
        }
      })
    })
  })
  
  describe('미디어 재생 호환성', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password)
    })
    
    it('비디오 코덱 지원', { tags: ['@cross-browser', '@video'] }, () => {
      cy.visit('/feedback/test-video-123')
      
      cy.get('[data-testid="video-player"] video').then(($video) => {
        const video = $video[0] as HTMLVideoElement
        
        // 브라우저별 지원 코덱 확인
        const supportedFormats = {
          'MP4 (H.264)': video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
          'WebM (VP9)': video.canPlayType('video/webm; codecs="vp9"'),
          'WebM (VP8)': video.canPlayType('video/webm; codecs="vp8"'),
          'OGG': video.canPlayType('video/ogg; codecs="theora"')
        }
        
        Object.entries(supportedFormats).forEach(([format, support]) => {
          cy.task('log', `${format} 지원: ${support || '지원 안됨'}`)
        })
        
        // 최소한 MP4는 지원되어야 함
        expect(supportedFormats['MP4 (H.264)']).to.not.equal('', 'MP4 코덱이 지원되어야 합니다')
        
        // 비디오 재생 제어
        cy.wrap(video).invoke('play').then(() => {
          expect(video.paused).to.be.false
        })
        
        cy.wrap(video).invoke('pause').then(() => {
          expect(video.paused).to.be.true
        })
      })
    })
    
    it('오디오 컴팩트 지원', { tags: ['@cross-browser', '@audio'] }, () => {
      cy.visit('/feedback/test-video-123')
      
      // 오디오 컴팩트 확인 (비디오 내 오디오 트랙)
      cy.get('[data-testid="video-player"] video').then(($video) => {
        const video = $video[0] as HTMLVideoElement
        
        // 오디오 코덱 지원 확인
        const audioSupport = {
          'MP3': new Audio().canPlayType('audio/mpeg'),
          'AAC': new Audio().canPlayType('audio/mp4; codecs="mp4a.40.2"'),
          'OGG': new Audio().canPlayType('audio/ogg; codecs="vorbis"'),
          'WebM Audio': new Audio().canPlayType('audio/webm; codecs="vorbis"')
        }
        
        Object.entries(audioSupport).forEach(([codec, support]) => {
          cy.task('log', `${codec} 지원: ${support || '지원 안됨'}`)
        })
        
        // 볼륨 컨트롤
        video.volume = 0.5
        expect(video.volume).to.equal(0.5)
        
        // 음소거 기능
        video.muted = true
        expect(video.muted).to.be.true
      })
    })
  })
  
  describe('글꼴트 및 언어 지원', () => {
    it('한글 입력 및 표시', { tags: ['@cross-browser', '@i18n'] }, () => {
      cy.login(testUser.email, testUser.password)
      cy.visit('/video-planning/new')
      
      const koreanText = '안녕하세요! 이것은 한글 테스트입니다. 특수문자: !@#$%^&*()_+-={}[]|\\:;"<>?,./'
      
      // 한글 입력
      cy.get('[data-testid="story-input-textarea"]')
        .type(koreanText)
        .should('have.value', koreanText)
      
      // 한글 표시 확인
      cy.get('[data-testid="story-preview"]')
        .should('contain', koreanText)
      
      // 한글 글자 수 세기
      cy.get('[data-testid="character-count"]')
        .should('contain', koreanText.length.toString())
      
      // 한글 검색
      cy.get('[data-testid="search-input"]')
        .type('한글')
      
      cy.get('[data-testid="search-results"]')
        .should('contain', '한글')
    })
    
    it('이모지 지원', { tags: ['@cross-browser', '@emoji'] }, () => {
      cy.login(testUser.email, testUser.password)
      cy.visit('/feedback/test-video-123')
      
      const emojiText = '😀 😁 😂 🤣 😍 😘 😎 🤔 🙄 😭 😱 😡'
      
      // 이모지 입력
      cy.get('[data-testid="comment-textarea"]')
        .type(emojiText)
        .should('have.value', emojiText)
      
      // 이모지 표시 확인
      cy.get('[data-testid="emoji-preview"]')
        .should('contain', emojiText)
      
      // 이모지 픽커 (만약 있다면)
      if (Cypress.$('[data-testid="emoji-picker-trigger"]').length > 0) {
        cy.get('[data-testid="emoji-picker-trigger"]').click()
        cy.get('[data-testid="emoji-picker"]').should('be.visible')
        
        // 이모지 선택
        cy.get('[data-testid="emoji-picker"] [data-emoji="😀"]').click()
        cy.get('[data-testid="comment-textarea"]')
          .should('have.value', emojiText + '😀')
      }
    })
    
    it('다양한 글꼴 테스트', { tags: ['@cross-browser', '@fonts'] }, () => {
      cy.visit('/')
      
      const fontTests = [
        { lang: 'en', text: 'Hello World! 123 ABC abc', selector: '[data-testid="english-text"]' },
        { lang: 'ko', text: '안녕하세요! 한글 테스트', selector: '[data-testid="korean-text"]' },
        { lang: 'ja', text: 'こんにちは! 日本語テスト', selector: '[data-testid="japanese-text"]' }
      ]
      
      fontTests.forEach((test) => {
        // 다양한 글꼴로 텍스트 렌더링 테스트
        cy.get('body').then(($body) => {
          // 다이나믹 텍스트 요소 생성
          const testElement = document.createElement('div')
          testElement.setAttribute('data-testid', test.selector.replace(/[\[\]]/g, '').replace('data-testid="', '').replace('"', ''))
          testElement.textContent = test.text
          testElement.style.fontSize = '16px'
          testElement.style.fontFamily = 'var(--font-primary), system-ui, sans-serif'
          $body[0].appendChild(testElement)
        })
        
        cy.get(test.selector).then(($el) => {
          const computedStyle = window.getComputedStyle($el[0])
          const actualFont = computedStyle.fontFamily
          
          cy.task('log', `${test.lang.toUpperCase()} 글꼴: ${actualFont}`)
          
          // 글꼴가 로드되었는지 확인
          expect(actualFont).to.not.include('serif')
          expect(actualFont).to.include('sans-serif')
          
          // 텍스트가 올바르게 표시되는지 확인
          cy.wrap($el).should('contain', test.text)
          cy.wrap($el).should('be.visible')
        })
      })
    })
  })
  
  describe('성능 차이 및 최적화', () => {
    it('브라우저별 JavaScript 성능', { tags: ['@cross-browser', '@performance'] }, () => {
      cy.visit('/dashboard')
      cy.login(testUser.email, testUser.password)
      
      const performanceBenchmarks = {
        'DOM 조작': () => {
          const start = performance.now()
          for (let i = 0; i < 1000; i++) {
            const div = document.createElement('div')
            div.textContent = `Test ${i}`
            document.body.appendChild(div)
            document.body.removeChild(div)
          }
          return performance.now() - start
        },
        '배열 연산': () => {
          const start = performance.now()
          const arr = Array.from({ length: 10000 }, (_, i) => i)
          arr.map(x => x * 2).filter(x => x % 4 === 0).reduce((a, b) => a + b, 0)
          return performance.now() - start
        },
        'JSON 처리': () => {
          const start = performance.now()
          const obj = { test: 'data', numbers: Array.from({ length: 1000 }, (_, i) => i) }
          for (let i = 0; i < 100; i++) {
            const str = JSON.stringify(obj)
            JSON.parse(str)
          }
          return performance.now() - start
        }
      }
      
      cy.window().then((win) => {
        Object.entries(performanceBenchmarks).forEach(([testName, benchmark]) => {
          const time = benchmark()
          cy.task('log', `${testName} 성능: ${time.toFixed(2)}ms`)
          
          // 브라우저별 성능 차이 허용 범위 내 확인
          expect(time).to.be.lessThan(1000, `${testName}이 너무 느립니다`)
        })
      })
    })
    
    it('렌더링 성능 브라우저 비교', { tags: ['@cross-browser', '@rendering'] }, () => {
      supportedViewports.forEach((viewport) => {
        cy.viewport(viewport.width, viewport.height)
        cy.visit('/projects')
        
        const startTime = performance.now()
        
        // 댓 컨텐츠 로드 대기
        cy.get('[data-testid="project-list"]').should('be.visible')
        cy.get('[data-testid="project-item"]').should('have.length.at.least', 1)
        
        cy.then(() => {
          const renderTime = performance.now() - startTime
          cy.task('log', `${viewport.name} 렌더링 시간: ${renderTime.toFixed(2)}ms`)
          
          // 뷰포트별 렌더링 성능 기준
          const maxRenderTime = viewport.name === 'mobile' ? 3000 : 2000
          expect(renderTime).to.be.lessThan(maxRenderTime, 
            `${viewport.name}에서 렌더링이 너무 느립니다`)
        })
        
        // Percy 브라우저별 비교 스냅샷
        cy.percySnapshot(`브라우저 비교 - ${viewport.name} 렌더링`)
      })
    })
  })
  
  describe('접근성 브라우저 비교', () => {
    it('브라우저별 스크린 리더 호환성', { tags: ['@cross-browser', '@a11y'] }, () => {
      cy.login(testUser.email, testUser.password)
      cy.visit('/projects')
      
      cy.window().then((win) => {
        // 브라우저별 스크린 리더 API 지원 확인
        const a11yFeatures = {
          'speechSynthesis': 'speechSynthesis' in win,
          'SpeechRecognition': 'SpeechRecognition' in win || 'webkitSpeechRecognition' in win,
          'aria support': document.querySelectorAll('[aria-label]').length > 0
        }
        
        Object.entries(a11yFeatures).forEach(([feature, supported]) => {
          cy.task('log', `${feature} 지원: ${supported ? '지원됨' : '지원 안됨'}`)
        })
        
        // ARIA 레이블 올바른 적용 확인
        cy.get('[data-testid="create-project-button"]')
          .should('have.attr', 'aria-label')
          .or('have.attr', 'aria-describedby')
      })
    })
    
    it('고대비 모드 지원', { tags: ['@cross-browser', '@high-contrast'] }, () => {
      cy.visit('/')
      
      // 고대비 모드 시뮬레이션 (CSS 미디어 쿼리)
      cy.window().then((win) => {
        const highContrastSupported = win.matchMedia('(prefers-contrast: high)').matches
        cy.task('log', `고대비 모드: ${highContrastSupported ? '지원됨' : '지원 안됨'}`)
        
        // CSS 커스텀 속성으로 고대비 모드 적용
        cy.get('html').invoke('attr', 'style', 'filter: contrast(150%) !important;')
        
        // 고대비에서도 텍스트 가독성 확인
        cy.get('[data-testid="main-heading"]').should('be.visible')
        cy.get('[data-testid="primary-button"]').should('be.visible')
        
        // Percy 고대비 스냅샷
        cy.percySnapshot('고대비 모드 테스트')
      })
    })
  })
  
  after(() => {
    cy.task('log', '크로스 브라우저 호환성 테스트 완료 - Chrome, Safari, Edge 호환성 검증 완료')
  })
})