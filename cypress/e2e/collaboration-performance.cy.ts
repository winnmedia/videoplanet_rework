/**
 * Collaboration Performance E2E Tests
 * Target: LCP < 1.5s with collaboration features active
 * Focus: Real-world collaboration scenarios
 */

describe('Collaboration Performance Tests', () => {
  let performanceMetrics: {
    lcp: number
    inp: number
    cls: number
    collaborationPollTime: number
    cacheHitRate: number
  }

  beforeEach(() => {
    cy.logTestStep('Initializing collaboration performance test')
    
    performanceMetrics = {
      lcp: 0,
      inp: 0,
      cls: 0,
      collaborationPollTime: 0,
      cacheHitRate: 0
    }

    // 성능 측정 설정
    cy.visit('/projects/create', {
      onBeforeLoad: (win) => {
        // Performance Observer 초기화
        if ('PerformanceObserver' in win) {
          win.__collaboration_performance__ = {
            metrics: performanceMetrics,
            measurements: []
          }
          
          // Collaboration-specific performance tracking
          const originalFetch = win.fetch
          let pollCount = 0
          let totalPollTime = 0
          let cacheHits = 0
          
          win.fetch = function(...args) {
            const startTime = performance.now()
            
            return originalFetch.apply(this, args).then(response => {
              const endTime = performance.now()
              const duration = endTime - startTime
              
              // Track collaboration polling requests
              if (args[0].toString().includes('collaboration')) {
                pollCount++
                totalPollTime += duration
                
                // Detect cache hits (very fast responses)
                if (duration < 10) {
                  cacheHits++
                }
                
                performanceMetrics.collaborationPollTime = totalPollTime / pollCount
                performanceMetrics.cacheHitRate = cacheHits / pollCount
              }
              
              return response
            })
          }
        }
      }
    })
  })

  describe('LCP < 1.5s Target with Active Collaboration', () => {
    it('프로젝트 생성 페이지가 협업 기능 활성화 상태에서 1.5초 내 로드되어야 한다', () => {
      cy.logTestStep('Testing LCP with collaboration features active')
      
      // 협업 기능 활성화 시뮬레이션
      cy.window().then((win) => {
        // 여러 사용자의 협업 상황 시뮬레이션
        cy.task('log', 'Simulating multi-user collaboration scenario')
      })
      
      cy.window().then((win) => {
        if ('PerformanceObserver' in win) {
          return new Promise((resolve) => {
            const observer = new win.PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.entryType === 'largest-contentful-paint') {
                  const lcp = entry.startTime
                  performanceMetrics.lcp = lcp
                  
                  cy.task('log', `LCP with collaboration: ${lcp.toFixed(2)}ms`)
                  
                  // 협업 기능 활성화 상태에서도 1.5초 이내 달성
                  expect(lcp).to.be.lessThan(1500, 'LCP should be less than 1.5 seconds with collaboration active')
                  resolve(lcp)
                }
              }
            })
            
            observer.observe({ entryTypes: ['largest-contentful-paint'] })
            
            setTimeout(() => {
              observer.disconnect()
              resolve(0)
            }, 5000)
          })
        }
      })
    })

    it('비디오 기획 페이지가 협업 데이터 로딩과 함께 1.5초 내 렌더링되어야 한다', () => {
      cy.logTestStep('Testing video planning with collaboration data loading')
      
      cy.visit('/planning')
      
      // 협업 데이터가 로딩되는 동안 성능 측정
      cy.window().then((win) => {
        return new Promise((resolve) => {
          let maxLCP = 0
          
          const observer = new win.PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'largest-contentful-paint') {
                if (entry.startTime > maxLCP) {
                  maxLCP = entry.startTime
                }
              }
            }
          })
          
          observer.observe({ entryTypes: ['largest-contentful-paint'] })
          
          // 협업 상호작용 시뮬레이션
          setTimeout(() => {
            cy.get('[data-testid="video-planning-stage"]').should('be.visible')
            cy.get('[data-testid="collaboration-indicator"]').should('be.visible')
          }, 100)
          
          setTimeout(() => {
            observer.disconnect()
            cy.task('log', `Video planning LCP with collaboration: ${maxLCP.toFixed(2)}ms`)
            
            expect(maxLCP).to.be.lessThan(1500, 'Video planning LCP should be less than 1.5 seconds')
            resolve(maxLCP)
          }, 3000)
        })
      })
    })
  })

  describe('Adaptive Polling Performance', () => {
    it('적응형 폴링이 네트워크 조건에 따라 최적화되어야 한다', () => {
      cy.logTestStep('Testing adaptive polling optimization')
      
      // 네트워크 조건 시뮬레이션
      cy.window().then((win) => {
        // Slow 3G 시뮬레이션
        Object.defineProperty(win.navigator, 'connection', {
          value: { effectiveType: '3g' },
          configurable: true
        })
      })
      
      cy.visit('/projects/1')
      
      // 폴링 간격 측정
      cy.window().then((win) => {
        return new Promise((resolve) => {
          const pollTimes: number[] = []
          let lastPollTime = Date.now()
          
          const originalFetch = win.fetch
          win.fetch = function(...args) {
            if (args[0].toString().includes('collaboration')) {
              const currentTime = Date.now()
              if (pollTimes.length > 0) {
                const interval = currentTime - lastPollTime
                pollTimes.push(interval)
              }
              lastPollTime = currentTime
            }
            
            return originalFetch.apply(this, args)
          }
          
          setTimeout(() => {
            if (pollTimes.length > 2) {
              const averageInterval = pollTimes.reduce((sum, time) => sum + time, 0) / pollTimes.length
              cy.task('log', `Average polling interval on 3G: ${averageInterval.toFixed(2)}ms`)
              
              // 3G에서는 더 긴 폴링 간격이 적용되어야 함
              expect(averageInterval).to.be.greaterThan(2500, 'Polling should be slower on 3G')
              expect(averageInterval).to.be.lessThan(8000, 'But not too slow for good UX')
            }
            resolve(pollTimes)
          }, 10000)
        })
      })
    })

    it('사용자 활동 기반 폴링 조정이 작동해야 한다', () => {
      cy.logTestStep('Testing activity-based polling adjustment')
      
      cy.visit('/calendar')
      
      // 초기 활성 상태에서 폴링 간격 측정
      cy.window().then((win) => {
        const pollIntervals: number[] = []
        let lastPollTime = performance.now()
        
        const originalFetch = win.fetch
        win.fetch = function(...args) {
          if (args[0].toString().includes('collaboration')) {
            const currentTime = performance.now()
            if (pollIntervals.length > 0) {
              pollIntervals.push(currentTime - lastPollTime)
            }
            lastPollTime = currentTime
          }
          
          return originalFetch.apply(this, args)
        }
        
        // 사용자 활동 시뮬레이션
        cy.get('[data-testid="calendar-view"]').click()
        cy.wait(100)
        cy.get('[data-testid="calendar-view"]').click()
        cy.wait(100)
        
        // 비활성 상태 시뮬레이션 (마우스/키보드 이벤트 없음)
        cy.wait(5000)
        
        cy.then(() => {
          if (pollIntervals.length > 3) {
            const activeInterval = pollIntervals.slice(0, 2).reduce((sum, time) => sum + time, 0) / 2
            const inactiveInterval = pollIntervals.slice(-2).reduce((sum, time) => sum + time, 0) / 2
            
            cy.task('log', `Active polling: ${activeInterval.toFixed(2)}ms, Inactive: ${inactiveInterval.toFixed(2)}ms`)
            
            // 비활성 상태에서 더 느린 폴링
            expect(inactiveInterval).to.be.greaterThan(activeInterval, 'Polling should be slower when inactive')
          }
        })
      })
    })
  })

  describe('Request Deduplication & Caching', () => {
    it('중복 요청이 효과적으로 제거되어야 한다', () => {
      cy.logTestStep('Testing request deduplication')
      
      cy.visit('/projects/1')
      
      cy.window().then((win) => {
        const requestCount = { collaboration: 0 }
        const requestTimes: number[] = []
        
        const originalFetch = win.fetch
        win.fetch = function(...args) {
          if (args[0].toString().includes('collaboration')) {
            requestCount.collaboration++
            requestTimes.push(Date.now())
          }
          
          return originalFetch.apply(this, args)
        }
        
        // 동시 다발적 사용자 활동 시뮬레이션
        for (let i = 0; i < 5; i++) {
          cy.get('[data-testid="project-title"]').click()
        }
        
        cy.wait(3000)
        
        cy.then(() => {
          cy.task('log', `Total collaboration requests: ${requestCount.collaboration}`)
          
          // 중복 제거로 인해 요청 수가 제한되어야 함
          expect(requestCount.collaboration).to.be.lessThan(10, 'Request deduplication should limit concurrent requests')
          
          // 요청 간격 분석
          if (requestTimes.length > 1) {
            const intervals = requestTimes.slice(1).map((time, index) => time - requestTimes[index])
            const minInterval = Math.min(...intervals)
            
            cy.task('log', `Minimum request interval: ${minInterval}ms`)
            expect(minInterval).to.be.greaterThan(100, 'Requests should be properly spaced')
          }
        })
      })
    })

    it('캐시가 효과적으로 작동하여 응답 시간을 개선해야 한다', () => {
      cy.logTestStep('Testing smart caching effectiveness')
      
      cy.visit('/projects/1')
      
      cy.window().then((win) => {
        const responseTimes: number[] = []
        let cacheHits = 0
        
        const originalFetch = win.fetch
        win.fetch = function(...args) {
          const startTime = performance.now()
          
          return originalFetch.apply(this, args).then(response => {
            const responseTime = performance.now() - startTime
            
            if (args[0].toString().includes('collaboration')) {
              responseTimes.push(responseTime)
              
              // 매우 빠른 응답은 캐시 히트로 간주
              if (responseTime < 50) {
                cacheHits++
              }
            }
            
            return response
          })
        }
        
        // 반복적인 데이터 요청 시뮬레이션
        cy.get('[data-testid="refresh-collaboration"]').click()
        cy.wait(1000)
        cy.get('[data-testid="refresh-collaboration"]').click()
        cy.wait(1000)
        cy.get('[data-testid="refresh-collaboration"]').click()
        
        cy.wait(2000)
        
        cy.then(() => {
          if (responseTimes.length > 2) {
            const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
            const cacheHitRate = cacheHits / responseTimes.length
            
            cy.task('log', `Average response time: ${averageResponseTime.toFixed(2)}ms`)
            cy.task('log', `Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`)
            
            // 캐시로 인한 성능 개선 확인
            expect(averageResponseTime).to.be.lessThan(200, 'Cache should improve average response time')
            expect(cacheHitRate).to.be.greaterThan(0.3, 'Cache hit rate should be at least 30%')
          }
        })
      })
    })
  })

  describe('Bundle Size Impact', () => {
    it('협업 기능의 번들 크기 영향이 제한되어야 한다', () => {
      cy.logTestStep('Testing collaboration bundle size impact')
      
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const collaborationResources = resources.filter(resource => 
          resource.name.includes('collaboration') || 
          resource.name.includes('collab')
        )
        
        let totalCollaborationSize = 0
        collaborationResources.forEach(resource => {
          const size = resource.transferSize || resource.encodedBodySize
          totalCollaborationSize += size
        })
        
        cy.task('log', `Collaboration features size: ${Math.round(totalCollaborationSize / 1024)}KB`)
        
        // 협업 기능의 번들 크기 제한
        expect(totalCollaborationSize).to.be.lessThan(50 * 1024, 'Collaboration features should be less than 50KB')
      })
    })

    it('협업 기능이 지연 로딩되어 초기 번들에 영향을 주지 않아야 한다', () => {
      cy.logTestStep('Testing collaboration lazy loading')
      
      // 협업 기능 없는 페이지 먼저 로드
      cy.visit('/')
      
      cy.window().then((win) => {
        const initialResources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const hasCollaborationInInitial = initialResources.some(resource => 
          resource.name.includes('collaboration')
        )
        
        expect(hasCollaborationInInitial).to.be.false, 'Collaboration should not be loaded on non-collaboration pages')
      })
      
      // 협업 기능 필요한 페이지로 이동
      cy.visit('/projects/1')
      
      cy.window().then((win) => {
        // 협업 컴포넌트가 표시될 때까지 대기
        cy.get('[data-testid="collaboration-indicator"]').should('be.visible')
        
        const projectResources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const collaborationResource = projectResources.find(resource => 
          resource.name.includes('collaboration')
        )
        
        if (collaborationResource) {
          cy.task('log', `Collaboration lazy loaded: ${collaborationResource.name}`)
        }
      })
    })
  })

  describe('Performance Under Load', () => {
    it('다중 사용자 협업 시나리오에서 성능이 유지되어야 한다', () => {
      cy.logTestStep('Testing performance under multi-user collaboration')
      
      cy.visit('/projects/1')
      
      // 다중 사용자 시뮬레이션 (서버 목업에서 처리)
      cy.window().then((win) => {
        // 10명의 동시 사용자 시뮬레이션
        ;(win as any).__mock_active_users_count = 10
      })
      
      cy.window().then((win) => {
        const performanceStart = performance.now()
        let maxINP = 0
        
        const observer = new win.PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'event') {
              const totalDelay = entry.processingStart - entry.startTime + entry.duration
              if (totalDelay > maxINP) {
                maxINP = totalDelay
              }
            }
          }
        })
        
        observer.observe({ entryTypes: ['event'] })
        
        // 협업 상호작용 시뮬레이션
        for (let i = 0; i < 5; i++) {
          cy.get('[data-testid="project-title"]').click()
          cy.wait(200)
        }
        
        setTimeout(() => {
          observer.disconnect()
          const totalTime = performance.now() - performanceStart
          
          cy.task('log', `Multi-user scenario completed in: ${totalTime.toFixed(2)}ms`)
          cy.task('log', `Max INP during collaboration: ${maxINP.toFixed(2)}ms`)
          
          // 다중 사용자 상황에서도 성능 기준 유지
          expect(maxINP).to.be.lessThan(200, 'INP should remain under 200ms even with multiple users')
        }, 3000)
      })
    })
  })

  afterEach(() => {
    // 성능 메트릭 로깅
    cy.task('log', `Final Performance Metrics:`)
    cy.task('log', `- LCP: ${performanceMetrics.lcp.toFixed(2)}ms`)
    cy.task('log', `- INP: ${performanceMetrics.inp.toFixed(2)}ms`)
    cy.task('log', `- CLS: ${performanceMetrics.cls.toFixed(4)}`)
    cy.task('log', `- Collaboration Poll Time: ${performanceMetrics.collaborationPollTime.toFixed(2)}ms`)
    cy.task('log', `- Cache Hit Rate: ${(performanceMetrics.cacheHitRate * 100).toFixed(1)}%`)
  })
})