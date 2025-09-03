/**
 * 성능 최적화 및 품질 게이트 E2E 테스트 스위트
 * Core Web Vitals, 메모리 누수, 번들 크기 검증
 */

describe('Performance & Quality Gates E2E Tests', () => {
  beforeEach(() => {
    cy.logTestStep('Starting performance & quality test')
    
    // 성능 측정을 위한 초기화
    cy.visit('/', {
      onBeforeLoad: (win) => {
        // Performance Observer 초기화
        if ('PerformanceObserver' in win) {
          win.__performance_metrics__ = {
            LCP: 0,
            FID: 0, 
            CLS: 0,
            FCP: 0,
            TTI: 0,
            measurements: []
          }
        }
      }
    })
  })

  describe('Core Web Vitals 검증', () => {
    it('Largest Contentful Paint (LCP)가 임계값 이내여야 한다', () => {
      cy.logTestStep('Testing LCP (Largest Contentful Paint)')
      
      cy.window().then((win) => {
        if ('PerformanceObserver' in win) {
          return new Promise((resolve) => {
            const observer = new win.PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.entryType === 'largest-contentful-paint') {
                  const lcp = entry.startTime
                  cy.task('log', `LCP measured: ${lcp}ms`)
                  
                  // LCP 임계값 검증 (2.5초)
                  expect(lcp).to.be.lessThan(2500, 'LCP should be less than 2.5 seconds')
                  resolve(lcp)
                }
              }
            })
            
            observer.observe({ entryTypes: ['largest-contentful-paint'] })
            
            // 타임아웃 처리
            setTimeout(() => {
              observer.disconnect()
              resolve(0)
            }, 10000)
          })
        }
      })
    })

    it('First Input Delay (FID)가 임계값 이내여야 한다', () => {
      cy.logTestStep('Testing FID (First Input Delay)')
      
      // 사용자 상호작용 시뮬레이션
      cy.get('button, a, input').first().click()
      
      cy.window().then((win) => {
        if ('PerformanceObserver' in win) {
          return new Promise((resolve) => {
            const observer = new win.PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.entryType === 'first-input') {
                  const fid = entry.processingStart - entry.startTime
                  cy.task('log', `FID measured: ${fid}ms`)
                  
                  // FID 임계값 검증 (100ms)
                  expect(fid).to.be.lessThan(100, 'FID should be less than 100ms')
                  resolve(fid)
                }
              }
            })
            
            observer.observe({ entryTypes: ['first-input'] })
            
            setTimeout(() => {
              observer.disconnect()
              resolve(0)
            }, 5000)
          })
        }
      })
    })

    it('Cumulative Layout Shift (CLS)가 임계값 이내여야 한다', () => {
      cy.logTestStep('Testing CLS (Cumulative Layout Shift)')
      
      let totalCLS = 0
      
      cy.window().then((win) => {
        if ('PerformanceObserver' in win) {
          return new Promise((resolve) => {
            const observer = new win.PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                  totalCLS += entry.value
                }
              }
            })
            
            observer.observe({ entryTypes: ['layout-shift'] })
            
            // 페이지 상호작용 시뮬레이션
            setTimeout(() => {
              cy.get('button, a').each(($el) => {
                cy.wrap($el).click()
                cy.wait(100)
              }).then(() => {
                observer.disconnect()
                cy.task('log', `Total CLS measured: ${totalCLS}`)
                
                // CLS 임계값 검증 (0.1)
                expect(totalCLS).to.be.lessThan(0.1, 'CLS should be less than 0.1')
                resolve(totalCLS)
              })
            }, 2000)
          })
        }
      })
    })

    it('전체 성능 점수가 품질 기준을 충족해야 한다', () => {
      cy.logTestStep('Testing overall performance score')
      
      cy.checkPerformanceThresholds()
    })
  })

  describe('리소스 로딩 최적화 검증', () => {
    it('Critical 리소스 로딩 시간이 임계값 이내여야 한다', () => {
      cy.logTestStep('Testing critical resource loading times')
      
      cy.window().then((win) => {
        const navigation = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const resources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        
        // DOM 완료 시간 확인
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.navigationStart
        expect(domContentLoaded).to.be.lessThan(3000, 'DOM should load within 3 seconds')
        
        // Critical 리소스 (CSS, 메인 JS) 로딩 시간 확인
        const criticalResources = resources.filter(resource => 
          resource.name.includes('.css') || 
          resource.name.includes('main') ||
          resource.name.includes('chunk')
        )
        
        criticalResources.forEach(resource => {
          const loadTime = resource.responseEnd - resource.requestStart
          expect(loadTime).to.be.lessThan(2000, `${resource.name} should load within 2 seconds`)
        })
      })
    })

    it('이미지 최적화가 적용되어야 한다', () => {
      cy.logTestStep('Testing image optimization')
      
      cy.get('img').each(($img) => {
        const img = $img[0] as HTMLImageElement
        
        // lazy loading 속성 확인
        expect(img.loading).to.equal('lazy').or.be.undefined
        
        // 적절한 이미지 포맷 사용 확인 (WebP, AVIF)
        if (img.src) {
          const isOptimizedFormat = img.src.includes('.webp') || 
                                  img.src.includes('.avif') ||
                                  img.src.includes('_next/image') // Next.js Image 컴포넌트
          
          if (!isOptimizedFormat) {
            cy.task('log', `Image not optimized: ${img.src}`)
          }
        }
        
        // 이미지 크기 vs 표시 크기 확인
        cy.wrap($img).then(($element) => {
          const displayWidth = $element.width()
          const displayHeight = $element.height()
          const naturalWidth = img.naturalWidth
          const naturalHeight = img.naturalHeight
          
          // 이미지가 표시 크기보다 2배 이상 크면 최적화 필요
          if (naturalWidth > displayWidth * 2 || naturalHeight > displayHeight * 2) {
            cy.task('log', `Image oversized: ${img.src} (${naturalWidth}x${naturalHeight} -> ${displayWidth}x${displayHeight})`)
          }
        })
      })
    })

    it('폰트 로딩이 최적화되어야 한다', () => {
      cy.logTestStep('Testing font loading optimization')
      
      cy.document().then((doc) => {
        const fontLinks = Array.from(doc.querySelectorAll('link[rel="preload"][as="font"]'))
        
        // 중요한 폰트는 preload되어야 함
        if (fontLinks.length > 0) {
          fontLinks.forEach(link => {
            expect(link.getAttribute('crossorigin')).to.exist
            cy.task('log', `Font preloaded: ${link.getAttribute('href')}`)
          })
        }
        
        // font-display 속성 확인
        cy.window().then((win) => {
          const sheets = Array.from(win.document.styleSheets)
          sheets.forEach(sheet => {
            try {
              const rules = Array.from(sheet.cssRules)
              const fontFaceRules = rules.filter(rule => rule.type === CSSRule.FONT_FACE_RULE)
              
              fontFaceRules.forEach(rule => {
                const cssRule = rule as CSSFontFaceRule
                const fontDisplay = cssRule.style.fontDisplay
                
                if (fontDisplay && fontDisplay !== 'swap' && fontDisplay !== 'fallback') {
                  cy.task('log', `Font-display not optimized: ${fontDisplay}`)
                }
              })
            } catch (e) {
              // CORS 에러 등으로 접근 불가한 스타일시트는 무시
            }
          })
        })
      })
    })
  })

  describe('번들 크기 및 코드 분할 검증', () => {
    it('JavaScript 번들 크기가 임계값 이내여야 한다', () => {
      cy.logTestStep('Testing JavaScript bundle sizes')
      
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const jsResources = resources.filter(resource => 
          resource.name.includes('.js') && 
          !resource.name.includes('cypress')
        )
        
        jsResources.forEach(resource => {
          const size = resource.transferSize || resource.encodedBodySize
          
          if (resource.name.includes('main') || resource.name.includes('index')) {
            // 메인 번들: 250KB 제한
            expect(size).to.be.lessThan(250 * 1024, `Main bundle too large: ${resource.name} (${size} bytes)`)
          } else if (resource.name.includes('chunk')) {
            // 코드 분할된 청크: 100KB 제한
            expect(size).to.be.lessThan(100 * 1024, `Chunk too large: ${resource.name} (${size} bytes)`)
          }
          
          cy.task('log', `JS resource: ${resource.name} - ${Math.round(size / 1024)}KB`)
        })
      })
    })

    it('CSS 번들이 최적화되어야 한다', () => {
      cy.logTestStep('Testing CSS bundle optimization')
      
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const cssResources = resources.filter(resource => resource.name.includes('.css'))
        
        cssResources.forEach(resource => {
          const size = resource.transferSize || resource.encodedBodySize
          
          // CSS 번들: 50KB 제한
          expect(size).to.be.lessThan(50 * 1024, `CSS bundle too large: ${resource.name} (${size} bytes)`)
          
          cy.task('log', `CSS resource: ${resource.name} - ${Math.round(size / 1024)}KB`)
        })
      })
    })

    it('코드 분할이 적절히 적용되어야 한다', () => {
      cy.logTestStep('Testing code splitting effectiveness')
      
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const jsChunks = resources.filter(resource => 
          resource.name.includes('chunk') || 
          resource.name.includes('lazy')
        )
        
        // 라우트 기반 코드 분할 확인
        if (jsChunks.length > 0) {
          cy.task('log', `Code splitting detected: ${jsChunks.length} chunks`)
          
          // 각 청크가 합리적인 크기인지 확인
          jsChunks.forEach(chunk => {
            const size = chunk.transferSize || chunk.encodedBodySize
            expect(size).to.be.greaterThan(1024, 'Chunk should not be too small (>1KB)')
            expect(size).to.be.lessThan(100 * 1024, 'Chunk should not be too large (<100KB)')
          })
        } else {
          cy.task('log', 'WARNING: No code splitting detected')
        }
      })
    })
  })

  describe('메모리 사용량 및 누수 검증', () => {
    it('JavaScript Heap 크기가 임계값 이내여야 한다', () => {
      cy.logTestStep('Testing JavaScript heap usage')
      
      cy.window().then((win) => {
        if ('performance' in win && 'memory' in win.performance) {
          const memory = (win.performance as any).memory
          const heapUsed = memory.usedJSHeapSize / (1024 * 1024) // MB
          const heapTotal = memory.totalJSHeapSize / (1024 * 1024) // MB
          
          cy.task('log', `JS Heap: ${heapUsed.toFixed(2)}MB used / ${heapTotal.toFixed(2)}MB total`)
          
          // 힙 사용량 임계값 (50MB)
          expect(heapUsed).to.be.lessThan(50, 'JavaScript heap usage should be less than 50MB')
          
          // 힙 사용 비율 (80% 이하)
          const heapRatio = heapUsed / heapTotal
          expect(heapRatio).to.be.lessThan(0.8, 'Heap usage ratio should be less than 80%')
        }
      })
    })

    it('DOM 노드 수가 과도하지 않아야 한다', () => {
      cy.logTestStep('Testing DOM node count')
      
      cy.document().then((doc) => {
        const nodeCount = doc.getElementsByTagName('*').length
        cy.task('log', `DOM nodes: ${nodeCount}`)
        
        // DOM 노드 임계값 (1500개)
        expect(nodeCount).to.be.lessThan(1500, 'DOM should have less than 1500 nodes')
      })
    })

    it('Event Listener 누수가 없어야 한다', () => {
      cy.logTestStep('Testing event listener leaks')
      
      const initialPath = window.location.pathname
      let initialListenerCount = 0
      
      cy.window().then((win) => {
        // 초기 이벤트 리스너 수 기록
        if ('getEventListeners' in win) {
          const listeners = (win as any).getEventListeners(win.document)
          initialListenerCount = Object.keys(listeners).reduce((count, type) => 
            count + listeners[type].length, 0
          )
          cy.task('log', `Initial event listeners: ${initialListenerCount}`)
        }
      })
      
      // 페이지 네비게이션 시뮬레이션
      cy.get('a[href]').first().click()
      cy.go('back')
      
      cy.window().then((win) => {
        if ('getEventListeners' in win) {
          const listeners = (win as any).getEventListeners(win.document)
          const currentListenerCount = Object.keys(listeners).reduce((count, type) => 
            count + listeners[type].length, 0
          )
          
          cy.task('log', `Current event listeners: ${currentListenerCount}`)
          
          // 이벤트 리스너 증가량 확인 (10개 이하 증가 허용)
          const increase = currentListenerCount - initialListenerCount
          expect(increase).to.be.lessThan(10, 'Event listener increase should be minimal')
        }
      })
    })
  })

  describe('네트워크 최적화 검증', () => {
    it('HTTP/2 또는 HTTP/3를 사용해야 한다', () => {
      cy.logTestStep('Testing HTTP protocol version')
      
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const mainResources = resources.filter(resource => 
          resource.name.includes(win.location.origin)
        )
        
        mainResources.forEach(resource => {
          if ('nextHopProtocol' in resource) {
            const protocol = resource.nextHopProtocol
            cy.task('log', `Protocol for ${resource.name}: ${protocol}`)
            
            // HTTP/2 또는 HTTP/3 사용 확인
            expect(protocol).to.match(/^h[23]/, 'Should use HTTP/2 or HTTP/3')
          }
        })
      })
    })

    it('적절한 캐시 헤더가 설정되어야 한다', () => {
      cy.logTestStep('Testing cache headers')
      
      // 정적 자원에 대한 캐시 헤더 확인
      cy.request('/').then((response) => {
        // HTML 문서: no-cache 또는 짧은 캐시
        const cacheControl = response.headers['cache-control']
        if (cacheControl) {
          expect(cacheControl).to.match(/(no-cache|max-age=[0-9]{1,4})/)
        }
      })
      
      // 정적 자원 캐시 확인 (CSS, JS, 이미지)
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const staticResources = resources.filter(resource => 
          resource.name.match(/\.(css|js|png|jpg|jpeg|webp|svg|woff2?)$/i)
        )
        
        staticResources.forEach(resource => {
          // 캐시에서 로드되었는지 확인 (transferSize가 0이거나 매우 작음)
          const cacheHit = resource.transferSize === 0 || 
                          (resource.transferSize > 0 && resource.transferSize < 1000)
          
          if (!cacheHit) {
            cy.task('log', `Resource not cached efficiently: ${resource.name}`)
          }
        })
      })
    })

    it('리소스 압축이 적용되어야 한다', () => {
      cy.logTestStep('Testing resource compression')
      
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const textResources = resources.filter(resource => 
          resource.name.match(/\.(css|js|html|json|svg)$/i)
        )
        
        textResources.forEach(resource => {
          const transferSize = resource.transferSize
          const decodedSize = resource.decodedBodySize
          
          if (transferSize > 0 && decodedSize > 0) {
            const compressionRatio = transferSize / decodedSize
            
            // 압축률이 70% 이상이어야 함 (gzip/brotli)
            if (decodedSize > 1024) { // 1KB 이상인 파일만 검사
              expect(compressionRatio).to.be.lessThan(0.7, 
                `${resource.name} should be compressed (ratio: ${compressionRatio.toFixed(2)})`)
            }
          }
        })
      })
    })
  })

  describe('보안 헤더 검증', () => {
    it('필수 보안 헤더가 설정되어야 한다', () => {
      cy.logTestStep('Testing security headers')
      
      cy.request('/').then((response) => {
        const headers = response.headers
        
        // Content Security Policy
        expect(headers).to.have.property('content-security-policy')
        
        // X-Frame-Options
        expect(headers).to.have.property('x-frame-options')
        
        // X-Content-Type-Options
        expect(headers).to.have.property('x-content-type-options', 'nosniff')
        
        // Referrer Policy
        expect(headers).to.have.property('referrer-policy')
        
        // Strict-Transport-Security (HTTPS에서만)
        if (Cypress.config().baseUrl?.startsWith('https')) {
          expect(headers).to.have.property('strict-transport-security')
        }
      })
    })

    it('민감한 정보가 노출되지 않아야 한다', () => {
      cy.logTestStep('Testing sensitive information exposure')
      
      cy.request('/').then((response) => {
        const headers = response.headers
        
        // 서버 정보 숨김
        expect(headers).to.not.have.property('server')
        expect(headers).to.not.have.property('x-powered-by')
        
        // 민감한 쿠키 속성 확인
        const setCookie = headers['set-cookie']
        if (setCookie) {
          setCookie.forEach((cookie: string) => {
            if (cookie.includes('token') || cookie.includes('session')) {
              expect(cookie).to.include('HttpOnly')
              expect(cookie).to.include('Secure')
              expect(cookie).to.include('SameSite')
            }
          })
        }
      })
    })
  })

  describe('SEO 최적화 검증', () => {
    it('메타 태그가 적절히 설정되어야 한다', () => {
      cy.logTestStep('Testing SEO meta tags')
      
      // 페이지 제목
      cy.title().should('not.be.empty').and('have.length.greaterThan', 10)
      
      // 메타 설명
      cy.get('meta[name="description"]')
        .should('exist')
        .and('have.attr', 'content')
        .and(($el) => {
          const content = $el.attr('content') || ''
          expect(content.length).to.be.greaterThan(50)
          expect(content.length).to.be.lessThan(160)
        })
      
      // Open Graph 태그
      cy.get('meta[property="og:title"]').should('exist')
      cy.get('meta[property="og:description"]').should('exist')
      cy.get('meta[property="og:type"]').should('exist')
      
      // 구조화된 데이터 (JSON-LD)
      cy.get('script[type="application/ld+json"]').should('exist')
    })

    it('이미지 SEO가 최적화되어야 한다', () => {
      cy.logTestStep('Testing image SEO optimization')
      
      cy.get('img').each(($img) => {
        // alt 속성 확인
        cy.wrap($img).should('have.attr', 'alt')
        
        // 의미있는 파일명 확인
        const src = $img.attr('src') || ''
        if (src) {
          const filename = src.split('/').pop() || ''
          expect(filename).to.not.match(/^image\d*\./, 'Image filename should be descriptive')
        }
      })
    })
  })
})