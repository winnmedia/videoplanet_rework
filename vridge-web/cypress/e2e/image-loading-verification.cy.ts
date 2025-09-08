/**
 * @fileoverview Image Loading E2E Tests
 * @description 이미지 404 오류 해결 확인 및 이미지 로딩 검증
 * @layer e2e
 */

describe('Image Loading Verification', () => {
  beforeEach(() => {
    cy.visit('/')
    cy.injectAxe()
  })

  describe('Critical Image Loading', () => {
    it('should fail - load homepage background images without 404 errors', () => {
      // Red phase: 이 테스트는 실패해야 함
      cy.get('img[src*="bg"], img[src*="background"]').should('not.exist') // 의도적 실패
      
      cy.window().then((win) => {
        const consoleLogs: string[] = []
        const originalConsoleError = win.console.error
        win.console.error = (...args: any[]) => {
          consoleLogs.push(args.join(' '))
          originalConsoleError.apply(win.console, args)
        }
        
        cy.wrap(consoleLogs).as('consoleLogs')
      })
      
      cy.get('@consoleLogs').should('contain', '404') // 의도적 실패 - 404 에러가 있을 것으로 예상
    })

    it('should fail - load favicon without errors', () => {
      // Red phase: favicon 로딩 실패 예상
      cy.document().then((doc) => {
        const favicon = doc.querySelector('link[rel="icon"]') as HTMLLinkElement
        
        if (favicon) {
          cy.request({
            url: favicon.href,
            failOnStatusCode: false
          }).then((response) => {
            expect(response.status).to.eq(500) // 의도적 실패 - 에러 상태 기대
          })
        }
      })
    })

    it('should fail - verify all public images are accessible', () => {
      // Red phase: 공개 이미지들의 접근 불가 상태 확인
      const criticalImages = [
        '/images/Home/new/visual-img.png',
        '/images/Home/new/project-img.png',
        '/images/Home/new/feedback-img.png',
        '/images/Common/check.png',
        '/images/icons/plus.png'
      ]

      criticalImages.forEach((imagePath) => {
        cy.request({
          url: imagePath,
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(404) // 의도적 실패 - 404 에러 기대
        })
      })
    })

    it('should fail - verify browser console has no image-related errors', () => {
      cy.visit('/', { failOnStatusCode: false })
      
      cy.window().then((win) => {
        const errors: string[] = []
        const originalError = win.console.error
        
        win.console.error = (...args: any[]) => {
          const errorMessage = args.join(' ')
          if (errorMessage.includes('Failed to load resource') || 
              errorMessage.includes('404') || 
              errorMessage.includes('image')) {
            errors.push(errorMessage)
          }
          originalError.apply(win.console, args)
        }
        
        // 페이지가 완전히 로드될 때까지 대기
        cy.wait(3000)
        
        cy.wrap(errors).should('have.length.greaterThan', 0) // 의도적 실패 - 에러가 있을 것으로 예상
      })
    })
  })

  describe('Image Performance and Accessibility', () => {
    it('should fail - all images have proper alt attributes', () => {
      cy.get('img').each(($img) => {
        // Red phase: alt 속성 누락 확인
        cy.wrap($img).should('not.have.attr', 'alt') // 의도적 실패
      })
    })

    it('should fail - images load within performance budget', () => {
      cy.visit('/')
      
      // 네트워크 성능 측정
      cy.window().its('performance').invoke('getEntriesByType', 'resource')
        .then((entries: PerformanceResourceTiming[]) => {
          const imageEntries = entries.filter(entry => 
            entry.name.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)
          )
          
          imageEntries.forEach(entry => {
            const loadTime = entry.responseEnd - entry.requestStart
            expect(loadTime).to.be.greaterThan(5000) // 의도적 실패 - 5초 초과 기대
          })
        })
    })

    it('should fail - lazy loading images work correctly', () => {
      cy.get('img[loading="lazy"]').should('not.exist') // 의도적 실패 - lazy loading 없을 것으로 예상
      
      // 스크롤 테스트를 통한 lazy loading 확인
      cy.scrollTo('bottom')
      cy.wait(1000)
      
      cy.get('img').each(($img) => {
        cy.wrap($img).should('not.be.visible') // 의도적 실패 - 이미지가 보이지 않을 것으로 예상
      })
    })
  })

  describe('Browser Compatibility', () => {
    it('should fail - modern image formats are supported', () => {
      const modernFormats = ['.webp', '.avif']
      
      modernFormats.forEach(format => {
        cy.get(`img[src*="${format}"]`).should('exist') // 의도적 실패 - 최신 포맷 사용 안함
      })
    })

    it('should fail - responsive images work correctly', () => {
      // 다양한 뷰포트에서 이미지 테스트
      const viewports = [
        { width: 375, height: 667 },  // Mobile
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 } // Desktop
      ]

      viewports.forEach(viewport => {
        cy.viewport(viewport.width, viewport.height)
        cy.reload()
        
        cy.get('img').each(($img) => {
          cy.wrap($img).invoke('width').should('be.greaterThan', viewport.width) // 의도적 실패 - 반응형 아닐 것으로 예상
        })
      })
    })
  })

  describe('Error Recovery', () => {
    it('should fail - broken images show fallback content', () => {
      // 의도적으로 깨진 이미지 URL 테스트
      cy.get('body').then(($body) => {
        const brokenImg = document.createElement('img')
        brokenImg.src = '/images/non-existent-image.png'
        brokenImg.alt = 'Test image'
        $body[0].appendChild(brokenImg)
      })
      
      cy.get('img[src*="non-existent-image"]')
        .should('have.attr', 'src', '/images/non-existent-image.png') // 의도적 실패 - fallback 없음
    })

    it('should fail - image loading errors are handled gracefully', () => {
      // 네트워크 오류 시뮬레이션
      cy.intercept('GET', '/images/**', { statusCode: 500 }).as('imageError')
      
      cy.visit('/')
      
      cy.get('img').each(($img) => {
        cy.wrap($img).should('be.visible') // 의도적 실패 - 에러 시 숨겨짐
      })
    })
  })

  describe('Content Security Policy', () => {
    it('should fail - images comply with CSP restrictions', () => {
      cy.visit('/')
      
      cy.get('img').each(($img) => {
        const src = $img.attr('src')
        
        if (src && src.startsWith('http')) {
          // 외부 이미지 소스 체크
          expect(src).to.not.include('https://') // 의도적 실패 - 외부 소스 사용 안함
        }
      })
    })
  })

  describe('Image Optimization', () => {
    it('should fail - images are properly optimized', () => {
      cy.visit('/')
      
      cy.window().its('performance').invoke('getEntriesByType', 'resource')
        .then((entries: PerformanceResourceTiming[]) => {
          const imageEntries = entries.filter(entry => 
            entry.name.match(/\.(png|jpg|jpeg|gif)$/i)
          )
          
          imageEntries.forEach(entry => {
            // 이미지 크기 체크 (임의로 큰 크기 기대)
            expect(entry.transferSize).to.be.greaterThan(1000000) // 의도적 실패 - 1MB 이상 기대
          })
        })
    })
  })
})