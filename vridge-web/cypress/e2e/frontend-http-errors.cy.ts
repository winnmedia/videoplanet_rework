/**
 * 프론트엔드 HTTP 오류 감지 테스트
 * 백엔드 없이 프론트엔드에서 발생하는 HTTP 오류만 감지
 */

describe('Frontend HTTP Error Detection', () => {
  const httpErrors: Array<{
    url: string
    status: number
    method: string
    timestamp: string
  }> = []

  beforeEach(() => {
    // 모든 HTTP 요청을 intercept하여 오류 수집
    cy.intercept('**', req => {
      req.continue(res => {
        if (res.statusCode >= 400) {
          httpErrors.push({
            url: req.url,
            status: res.statusCode,
            method: req.method,
            timestamp: new Date().toISOString(),
          })
          cy.task('log', `HTTP Error detected: ${req.method} ${req.url} -> ${res.statusCode}`)
        }
      })
    }).as('allRequests')

    // 콘솔 에러 감지
    cy.window().then(win => {
      cy.stub(win.console, 'error').callsFake((...args) => {
        cy.task('log', `Console Error: ${args.join(' ')}`)
      })
    })
  })

  it('메인 페이지에서 HTTP 404 이미지 오류를 감지해야 함', () => {
    cy.visit('/', {
      failOnStatusCode: false,
      timeout: 30000,
    })

    // 페이지가 로드될 때까지 대기
    cy.get('body').should('exist')
    cy.wait(3000) // 모든 리소스 로딩 대기

    // 이미지 요소들 확인
    cy.get('img').each($img => {
      const src = $img.prop('src')
      if (src) {
        cy.request({
          url: src,
          failOnStatusCode: false,
        }).then(response => {
          if (response.status === 404) {
            cy.task('log', `404 Image Error: ${src}`)
          }
        })
      }
    })

    // CSS background-image 확인
    cy.get('[style*="background-image"]').each($el => {
      const style = $el.prop('style').backgroundImage
      const urlMatch = style?.match(/url\("?([^"]*)"?\)/)
      if (urlMatch && urlMatch[1]) {
        const imageUrl = urlMatch[1]
        cy.request({
          url: imageUrl,
          failOnStatusCode: false,
        }).then(response => {
          if (response.status === 404) {
            cy.task('log', `404 Background Image Error: ${imageUrl}`)
          }
        })
      }
    })
  })

  it('CSS 파일들이 정상적으로 로드되어야 함', () => {
    cy.visit('/', { failOnStatusCode: false })

    // Next.js CSS 파일들 확인
    cy.get('link[rel="stylesheet"]').each($link => {
      const href = $link.prop('href')
      if (href) {
        cy.request({
          url: href,
          failOnStatusCode: false,
        }).then(response => {
          expect(response.status).to.not.eq(404, `CSS file should not return 404: ${href}`)
          if (response.status >= 400) {
            cy.task('log', `CSS Error: ${href} -> ${response.status}`)
          }
        })
      }
    })
  })

  it('JavaScript 번들 파일들이 정상적으로 로드되어야 함', () => {
    cy.visit('/', { failOnStatusCode: false })

    // Next.js JS 파일들 확인
    cy.get('script[src]').each($script => {
      const src = $script.prop('src')
      if (src && (src.includes('_next') || src.includes('static'))) {
        cy.request({
          url: src,
          failOnStatusCode: false,
        }).then(response => {
          expect(response.status).to.not.eq(404, `JS file should not return 404: ${src}`)
          if (response.status >= 400) {
            cy.task('log', `JS Error: ${src} -> ${response.status}`)
          }
        })
      }
    })
  })

  it('주요 페이지들이 404 오류 없이 로드되어야 함', () => {
    const pages = ['/', '/dashboard', '/planning', '/calendar', '/projects/manage']

    pages.forEach(page => {
      cy.visit(page, {
        failOnStatusCode: false,
        timeout: 15000,
      })

      // TODO(human): 실제 404 오류와 번들에 포함된 404 텍스트를 구분하는 로직 구현
      // 힌트: cy.location(), cy.title(), visible 요소 검사 등을 활용하세요

      // 페이지 내용이 실제로 로드되었는지 확인
      cy.get('body').should('be.visible')
    })
  })

  it('API 호출이 적절한 오류 처리를 해야 함', () => {
    // API 실패를 시뮬레이션
    cy.intercept('GET', '/api/**', {
      statusCode: 500,
      body: { error: 'Internal Server Error' },
    }).as('apiError')

    cy.visit('/dashboard', { failOnStatusCode: false })

    // API 오류가 발생해도 페이지가 완전히 깨지지 않아야 함
    cy.get('body').should('be.visible')
    cy.get('body').should('not.contain', 'Uncaught')
    cy.get('body').should('not.contain', 'TypeError')
  })

  afterEach(() => {
    // 수집된 HTTP 오류 리포트
    cy.then(() => {
      if (httpErrors.length > 0) {
        const errorSummary = {
          testName: Cypress.currentTest.title,
          totalErrors: httpErrors.length,
          errors: httpErrors.map(err => ({
            url: err.url.replace(Cypress.config().baseUrl, ''),
            status: err.status,
            method: err.method,
          })),
          categories: {
            images: httpErrors.filter(e => e.url.includes('/images/')).length,
            css: httpErrors.filter(e => e.url.includes('.css')).length,
            js: httpErrors.filter(e => e.url.includes('.js')).length,
            api: httpErrors.filter(e => e.url.includes('/api/')).length,
            other: httpErrors.filter(
              e =>
                !e.url.includes('/images/') &&
                !e.url.includes('.css') &&
                !e.url.includes('.js') &&
                !e.url.includes('/api/')
            ).length,
          },
        }

        cy.task('log', `HTTP Error Summary: ${JSON.stringify(errorSummary, null, 2)}`)
      }
    })

    // 다음 테스트를 위해 배열 초기화
    httpErrors.length = 0
  })
})
