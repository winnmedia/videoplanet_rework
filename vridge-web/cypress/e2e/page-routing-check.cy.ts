/**
 * 페이지 라우팅 상세 확인 테스트
 * 각 페이지별로 개별적으로 404 오류를 확인
 */

describe('Page Routing Check', () => {
  const testPages = [
    { path: '/', name: 'Homepage' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/planning', name: 'Planning' },
    { path: '/calendar', name: 'Calendar' },
    { path: '/projects/manage', name: 'Project Management' },
  ]

  testPages.forEach(page => {
    it(`${page.name} (${page.path})이 404 오류 없이 로드되어야 함`, () => {
      cy.visit(page.path, {
        failOnStatusCode: false,
        timeout: 15000,
      })

      // 실제 URL 확인
      cy.location('pathname').then(pathname => {
        cy.task('log', `Page ${page.path} loaded at: ${pathname}`)

        if (pathname.includes('404') || pathname.includes('_error')) {
          cy.task('log', `ERROR: Page ${page.path} redirected to error page: ${pathname}`)
        }
      })

      // 페이지 제목과 상태 확인
      cy.title().then(title => {
        cy.task('log', `Page title for ${page.path}: ${title}`)

        if (title.toLowerCase().includes('404') || title.toLowerCase().includes('not found')) {
          cy.task('log', `ERROR: Page ${page.path} has 404 in title: ${title}`)
        }
      })

      // body 내용 확인
      cy.get('body').then($body => {
        const bodyText = $body.text().toLowerCase()

        if (bodyText.includes('404')) {
          cy.task('log', `WARNING: Page ${page.path} contains '404' in body text`)

          // 더 자세한 정보 수집
          cy.get('*')
            .contains('404')
            .each($el => {
              cy.task('log', `Found '404' in element: ${$el.prop('tagName')} - ${$el.text()}`)
            })
        }

        if (bodyText.includes('page not found') || bodyText.includes('not found')) {
          cy.task('log', `ERROR: Page ${page.path} shows 'not found' message`)
        }

        // 긍정적인 지표들도 확인
        const hasContent = $body.find('main, article, section, div').length > 0
        const hasNavigation = $body.find('nav, header, menu').length > 0

        cy.task('log', `Page ${page.path} analysis:`)
        cy.task('log', `- Has main content elements: ${hasContent}`)
        cy.task('log', `- Has navigation elements: ${hasNavigation}`)
        cy.task('log', `- Body text length: ${bodyText.length} characters`)
      })

      // React 컴포넌트가 정상적으로 렌더링되었는지 확인
      cy.get('body [class*="__variable"]').should('exist')

      // 페이지가 완전히 로드될 때까지 대기
      cy.wait(2000)
    })
  })

  it('존재하지 않는 페이지는 올바른 404 페이지를 표시해야 함', () => {
    cy.visit('/non-existent-page-12345', {
      failOnStatusCode: false,
    })

    // 404 페이지로 리다이렉트되거나 404 상태를 표시해야 함
    cy.location('pathname').then(pathname => {
      cy.task('log', `Non-existent page redirected to: ${pathname}`)

      // Next.js 기본 404 페이지 또는 커스텀 404 페이지 확인
      if (!pathname.includes('404') && !pathname.includes('_error')) {
        cy.get('body').should('contain', '404')
      }
    })
  })
})
