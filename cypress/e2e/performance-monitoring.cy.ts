// 성능 모니터링 및 회귀 검증 E2E 테스트

describe('성능 모니터링 및 Web Vitals 검증', () => {
  const testUser = {
    email: 'performance@test.com',
    password: 'Test123!@#'
  }
  
  // 성능 예산 대비 (DEVPLAN.md 기준)
  const performanceBudgets = {
    LCP: 2500,  // Largest Contentful Paint < 2.5s
    INP: 200,   // Interaction to Next Paint < 200ms  
    CLS: 0.1,   // Cumulative Layout Shift < 0.1
    FCP: 1800,  // First Contentful Paint < 1.8s
    TTFB: 800   // Time to First Byte < 800ms
  }
  
  beforeEach(() => {
    // 성능 모니터링을 위한 설정
    cy.intercept('GET', '/_next/static/**').as('staticAssets')
    cy.intercept('GET', '/api/**').as('apiCalls')
  })
  
  describe('Core Web Vitals 검증', () => {
    const criticalPages = [
      { path: '/', name: '홈페이지', requiresAuth: false },
      { path: '/auth/login', name: '로그인 페이지', requiresAuth: false },
      { path: '/dashboard', name: '대시보드', requiresAuth: true },
      { path: '/projects', name: '프로젝트 목록', requiresAuth: true },
      { path: '/video-planning', name: 'AI 비디오 기획', requiresAuth: true }
    ]
    
    criticalPages.forEach((page) => {
      it(`${page.name} Core Web Vitals 기준 충족`, { tags: ['@performance', '@web-vitals'] }, () => {
        if (page.requiresAuth) {
          cy.login(testUser.email, testUser.password)
        }
        
        // 성능 측정 시작
        const _startTime = performance.now() // 향후 성능 분석용 예약
        
        cy.visit(page.path)
        
        // 페이지 로드 완료 대기
        cy.get('[data-testid="main-content"], main, [role="main"]')
          .should('be.visible')
        
        cy.window().then((win) => {
          // LCP (Largest Contentful Paint) 측정
          new Promise((resolve) => {
            new win.PerformanceObserver((list) => {
              const entries = list.getEntries()
              const lastEntry = entries[entries.length - 1]
              if (lastEntry) {
                const lcp = lastEntry.startTime
                cy.task('log', `${page.name} LCP: ${lcp.toFixed(2)}ms`)
                expect(lcp, `LCP should be less than ${performanceBudgets.LCP}ms`)
                  .to.be.lessThan(performanceBudgets.LCP)
                resolve(lcp)
              }
            }).observe({ entryTypes: ['largest-contentful-paint'] })
          })
          
          // FCP (First Contentful Paint) 측정
          const paintEntries = win.performance.getEntriesByType('paint')
          const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
          
          if (fcp) {
            cy.task('log', `${page.name} FCP: ${fcp.startTime.toFixed(2)}ms`)
            expect(fcp.startTime, `FCP should be less than ${performanceBudgets.FCP}ms`)
              .to.be.lessThan(performanceBudgets.FCP)
          }
          
          // CLS (Cumulative Layout Shift) 측정
          let clsValue = 0
          new win.PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value
              }
            }
          }).observe({ entryTypes: ['layout-shift'] })
          
          // CLS 값 검증 (페이지 로드 후 지연)
          cy.wait(2000).then(() => {
            cy.task('log', `${page.name} CLS: ${clsValue.toFixed(4)}`)
            expect(clsValue, `CLS should be less than ${performanceBudgets.CLS}`)
              .to.be.lessThan(performanceBudgets.CLS)
          })
          
          // TTFB (Time to First Byte) 측정
          const navigationTiming = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
          if (navigationTiming) {
            const ttfb = navigationTiming.responseStart - navigationTiming.requestStart
            cy.task('log', `${page.name} TTFB: ${ttfb.toFixed(2)}ms`)
            expect(ttfb, `TTFB should be less than ${performanceBudgets.TTFB}ms`)
              .to.be.lessThan(performanceBudgets.TTFB)
          }
        })
        
        // Percy 성능 스냅샷 (로드 시간 대비 시각적 완성도)
        cy.percySnapshot(`성능 검증 - ${page.name}`)
      })
    })
  })
  
  describe('리소스 로드 성능', () => {
    it('정적 자산 로드 성능', { tags: ['@performance', '@assets'] }, () => {
      cy.visit('/')
      
      // 대기 중인 모든 정적 자산 로드 완료
      cy.wait('@staticAssets')
      
      cy.window().then((win) => {
        const resourceEntries = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        
        const assetTypes = {
          css: [] as PerformanceResourceTiming[],
          js: [] as PerformanceResourceTiming[],
          image: [] as PerformanceResourceTiming[],
          font: [] as PerformanceResourceTiming[]
        }
        
        resourceEntries.forEach((entry) => {
          if (entry.name.includes('.css')) {
            assetTypes.css.push(entry)
          } else if (entry.name.includes('.js')) {
            assetTypes.js.push(entry)
          } else if (entry.name.match(/\.(jpg|jpeg|png|svg|webp)$/)) {
            assetTypes.image.push(entry)
          } else if (entry.name.includes('fonts.')) {
            assetTypes.font.push(entry)
          }
        })
        
        // CSS 파일 로드 시간 검증 (< 1초)
        assetTypes.css.forEach((entry) => {
          const loadTime = entry.responseEnd - entry.startTime
          cy.task('log', `CSS 로드 시간: ${entry.name} - ${loadTime.toFixed(2)}ms`)
          expect(loadTime).to.be.lessThan(1000)
        })
        
        // JavaScript 번들 크기 및 로드 시간 검증
        const jsBundle = assetTypes.js.find(entry => entry.name.includes('/_next/static/chunks/pages'))
        if (jsBundle) {
          const bundleSize = jsBundle.transferSize || jsBundle.encodedBodySize
          const loadTime = jsBundle.responseEnd - jsBundle.startTime
          
          cy.task('log', `JS 번들 크기: ${(bundleSize / 1024).toFixed(2)}KB`)
          cy.task('log', `JS 번들 로드 시간: ${loadTime.toFixed(2)}ms`)
          
          // 번들 크기 < 250KB, 로드 시간 < 2초
          expect(bundleSize).to.be.lessThan(250 * 1024)
          expect(loadTime).to.be.lessThan(2000)
        }
      })
    })
    
    it('이미지 최적화 및 레이지 로딩', { tags: ['@performance', '@images'] }, () => {
      cy.login(testUser.email, testUser.password)
      cy.visit('/projects')
      
      // 레이지 로딩된 이미지가 보이는 영역에 들어올 때 로드되는지 확인
      cy.get('[data-testid="project-thumbnail"]').first().scrollIntoView()
      
      cy.get('[data-testid="project-thumbnail"] img').first().should((img) => {
        // 이미지가 로드되었는지 확인
        expect(img[0].naturalWidth).to.be.greaterThan(0)
        expect(img[0].complete).to.be.true
        
        // 이미지 포맷 최적화 확인 (WebP 또는 AVIF)
        const src = img.attr('src')
        if (src) {
          expect(src).to.satisfy((url: string) => {
            return url.includes('webp') || url.includes('avif') || url.includes('/_next/image')
          }, '이미지가 최적화되어 있어야 합니다')
        }
      })
      
      // 이미지 로드 시간 측정
      cy.window().then((win) => {
        const imageEntries = win.performance.getEntriesByType('resource')
          .filter((entry: PerformanceResourceTiming) => entry.name.match(/\.(jpg|jpeg|png|svg|webp|avif)$/))
        
        imageEntries.forEach((entry) => {
          const loadTime = entry.responseEnd - entry.startTime
          const size = entry.transferSize || entry.encodedBodySize
          
          cy.task('log', `이미지 로드: ${entry.name} - ${loadTime.toFixed(2)}ms, ${(size / 1024).toFixed(2)}KB`)
          
          // 이미지 로드 시간 < 1초
          expect(loadTime).to.be.lessThan(1000)
        })
      })
    })
    
    it('폰트 로드 성능 및 FOUT 방지', { tags: ['@performance', '@fonts'] }, () => {
      cy.visit('/')
      
      cy.window().then((win) => {
        // 폰트 로드 시간 측정
        const fontEntries = win.performance.getEntriesByType('resource')
          .filter((entry: PerformanceResourceTiming) => 
            entry.name.includes('fonts.googleapis.com') || 
            entry.name.includes('fonts.gstatic.com') ||
            entry.name.includes('.woff')
          )
        
        fontEntries.forEach((entry) => {
          const loadTime = entry.responseEnd - entry.startTime
          cy.task('log', `폰트 로드: ${entry.name} - ${loadTime.toFixed(2)}ms`)
          
          // 폰트 로드 시간 < 2초
          expect(loadTime).to.be.lessThan(2000)
        })
        
        // FOUT(Flash of Unstyled Text) 방지 검증
        // font-display: swap 또는 fallback 사용 확인
        cy.get('body').should('have.css', 'font-family').then((fontFamily) => {
          // 폴백 폰트가 설정되어 있는지 확인
          expect(fontFamily).to.include('sans-serif')
        })
      })
    })
  })
  
  describe('인터렉션 성능', () => {
    beforeEach(() => {
      cy.login(testUser.email, testUser.password)
    })
    
    it('버튼 클릭 응답 시간', { tags: ['@performance', '@interaction'] }, () => {
      cy.visit('/projects')
      
      const interactionElements = [
        { selector: '[data-testid="create-project-button"]', name: '프로젝트 생성 버튼' },
        { selector: '[data-testid="filter-dropdown"]', name: '필터 드롭다운' },
        { selector: '[data-testid="search-input"]', name: '검색 입력필드' }
      ]
      
      interactionElements.forEach((element) => {
        cy.get(element.selector).then(($el) => {
          const startTime = performance.now()
          
          cy.wrap($el).click().then(() => {
            const responseTime = performance.now() - startTime
            cy.task('log', `${element.name} 응답 시간: ${responseTime.toFixed(2)}ms`)
            
            // 클릭 응답 시간 < 100ms (즉각 반응)
            expect(responseTime).to.be.lessThan(100)
          })
        })
      })
    })
    
    it('폼 입력 디바운스 성능', { tags: ['@performance', '@forms'] }, () => {
      cy.visit('/projects/new')
      
      const formInputs = [
        { selector: '[data-testid="project-name-input"]', testValue: 'Performance Test Project' },
        { selector: '[data-testid="project-description-textarea"]', testValue: 'This is a test description for performance validation.' }
      ]
      
      formInputs.forEach((input) => {
        cy.get(input.selector).then(($input) => {
          let inputCount = 0
          let totalTime = 0
          
          // 각 문자 입력 시 성능 측정
          input.testValue.split('').forEach((char) => {
            const startTime = performance.now()
            
            cy.wrap($input).type(char, { delay: 0 }).then(() => {
              const inputTime = performance.now() - startTime
              inputCount++
              totalTime += inputTime
            })
          })
          
          cy.then(() => {
            const avgInputTime = totalTime / inputCount
            cy.task('log', `${input.selector} 평균 입력 지연 시간: ${avgInputTime.toFixed(2)}ms`)
            
            // 평균 입력 디바운스 < 16ms (60fps 기준)
            expect(avgInputTime).to.be.lessThan(16)
          })
        })
      })
    })
    
    it('스크롤 성능 및 가상화', { tags: ['@performance', '@scroll'] }, () => {
      cy.visit('/projects')
      
      // 긴 열 롭이 있는 페이지로 이동 (또는 모킹 데이터 생성)
      cy.mockAPI('GET', '/api/projects', {
        projects: Array.from({ length: 100 }, (_, i) => ({
          id: `project-${i}`,
          name: `Test Project ${i}`,
          status: 'active',
          progress: Math.random() * 100
        }))
      })
      
      cy.reload()
      
      // 스크롤 성능 측정
      let scrollStartTime = performance.now()
      
      cy.window().then((win) => {
        // 스크롤 이벤트 성능 모니터링
        let frameCount = 0
        let totalScrollTime = 0
        
        const scrollHandler = () => {
          const scrollTime = performance.now() - scrollStartTime
          frameCount++
          totalScrollTime += scrollTime
          scrollStartTime = performance.now()
        }
        
        win.addEventListener('scroll', scrollHandler, { passive: true })
        
        // 빠른 스크롤 실행
        cy.scrollTo('bottom', { duration: 2000 }).then(() => {
          cy.wait(500).then(() => {
            win.removeEventListener('scroll', scrollHandler)
            
            if (frameCount > 0) {
              const avgScrollTime = totalScrollTime / frameCount
              cy.task('log', `스크롤 평균 처리 시간: ${avgScrollTime.toFixed(2)}ms`)
              
              // 스크롤 평균 지연 < 16ms (60fps)
              expect(avgScrollTime).to.be.lessThan(16)
            }
          })
        })
      })
      
      // 가상화 구현 확인 (React Window, React Virtualized 등)
      cy.get('[data-testid="virtualized-list"], [data-testid="project-list"]').then(($list) => {
        const visibleItems = $list.find('[data-testid="project-item"]:visible').length
        const totalItems = 100 // 모킹된 데이터 개수
        
        cy.task('log', `가시 아이템: ${visibleItems}, 전체: ${totalItems}`)
        
        // 가상화가 제대로 동작하는지 확인 (전체 아이템보다 적은 DOM 노드)
        expect(visibleItems).to.be.lessThan(totalItems)
        expect(visibleItems).to.be.lessThan(50) // 화면에 보이는 아이템만 렌더링
      })
    })
  })
  
  describe('메모리 사용량 모니터링', () => {
    it('메모리 누수 검직', { tags: ['@performance', '@memory'] }, () => {
      cy.login(testUser.email, testUser.password)
      
      // 여러 페이지를 돌아다니며 메모리 사용량 기록
      const pagesToVisit = [
        '/dashboard',
        '/projects',
        '/video-planning',
        '/feedback/test-video',
        '/calendar'
      ]
      
      const memorySnapshots: number[] = []
      
      pagesToVisit.forEach((page, index) => {
        cy.visit(page)
        cy.wait(2000) // 페이지 안정화 대기
        
        cy.window().then((win) => {
          // @ts-expect-error - performance.memory는 Chrome에서만 사용 가능한 비표준 API
          if (win.performance.memory) {
            // @ts-expect-error - Chrome 전용 비표준 API
            const memUsage = win.performance.memory.usedJSHeapSize / (1024 * 1024) // MB 단위
            memorySnapshots.push(memUsage)
            cy.task('log', `${page} 메모리 사용량: ${memUsage.toFixed(2)}MB`)
          }
        })
      })
      
      cy.then(() => {
        if (memorySnapshots.length > 1) {
          // 메모리 증가량 검사
          const initialMemory = memorySnapshots[0]
          const finalMemory = memorySnapshots[memorySnapshots.length - 1]
          const memoryIncrease = finalMemory - initialMemory
          
          cy.task('log', `첫 페이지: ${initialMemory.toFixed(2)}MB, 마지막: ${finalMemory.toFixed(2)}MB`)
          cy.task('log', `메모리 증가량: ${memoryIncrease.toFixed(2)}MB`)
          
          // 메모리 증가량 < 50MB (지나친 메모리 누수 방지)
          expect(memoryIncrease).to.be.lessThan(50)
        }
      })
    })
    
    it('대용량 데이터 렌더링 성능', { tags: ['@performance', '@large-data'] }, () => {
      cy.login(testUser.email, testUser.password)
      
      // 대량의 데이터를 렌더링하는 상황 시뮬레이션
      cy.mockAPI('GET', '/api/feedback/test-video-123/comments', {
        comments: Array.from({ length: 500 }, (_, i) => ({
          id: `comment-${i}`,
          user: `User ${i % 10}`,
          content: `This is test comment number ${i}`,
          timecode: `00:${String(Math.floor(i / 60) % 60).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`,
          timestamp: new Date(Date.now() - i * 60000).toISOString()
        }))
      })
      
      const startTime = performance.now()
      
      cy.visit('/feedback/test-video-123')
      
      // 대용량 댓글 목록이 로드될 때까지 시간 측정
      cy.get('[data-testid="comment-list"]').should('be.visible').then(() => {
        const renderTime = performance.now() - startTime
        cy.task('log', `500개 댓글 렌더링 시간: ${renderTime.toFixed(2)}ms`)
        
        // 대용량 데이터 렌더링 < 3초
        expect(renderTime).to.be.lessThan(3000)
      })
      
      // 가상화 또는 페이지네이션 구현 확인
      cy.get('[data-testid="comment-pagination"], [data-testid="load-more-button"]')
        .should('exist', '대용량 데이터를 위한 페이지네이션 구현 필요')
    })
  })
  
  describe('성능 회귀 방지', () => {
    it('이전 버전 대비 성능 비교', { tags: ['@performance', '@regression'] }, () => {
      // 이전 비즈드의 성능 데이터와 비교 (실제로는 CI/CD에서 수행)
      const performanceBaseline = {
        homepageLCP: 2000,
        dashboardFCP: 1500,
        jsBundle: 200 * 1024, // 200KB
        cssBundle: 50 * 1024   // 50KB
      }
      
      cy.visit('/')
      cy.measurePerformance()
      
      cy.window().then((win) => {
        // 현재 성능 측정
        const paintEntries = win.performance.getEntriesByType('paint')
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')
        
        if (fcp) {
          cy.task('log', `현재 FCP: ${fcp.startTime.toFixed(2)}ms, 기준: ${performanceBaseline.dashboardFCP}ms`)
          
          // 성능 회귀 감지 (20% 이상 느려지딩 실패)
          const regressionThreshold = performanceBaseline.dashboardFCP * 1.2
          expect(fcp.startTime).to.be.lessThan(regressionThreshold, 
            `FCP 성능이 ${((fcp.startTime / performanceBaseline.dashboardFCP - 1) * 100).toFixed(1)}% 회귀되었습니다`)
        }
        
        // 번들 크기 회귀 감지
        const resourceEntries = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const jsBundle = resourceEntries.find(entry => entry.name.includes('/_next/static/chunks/'))
        
        if (jsBundle) {
          const currentBundleSize = jsBundle.transferSize || jsBundle.encodedBodySize
          cy.task('log', `현재 JS 번들: ${(currentBundleSize / 1024).toFixed(2)}KB, 기준: ${(performanceBaseline.jsBundle / 1024).toFixed(2)}KB`)
          
          expect(currentBundleSize).to.be.lessThan(performanceBaseline.jsBundle * 1.1, 
            'JS 번들 크기가 10% 이상 증가했습니다')
        }
      })
      
      // 성능 회귀 Percy 스냅샷 (시각적 완성도 대비)
      cy.percySnapshot('성능 회귀 검증 - 홈페이지')
    })
  })
  
  after(() => {
    cy.task('log', '성능 모니터링 테스트 완료 - Web Vitals 및 리소스 성능 검증 완료')
  })
})