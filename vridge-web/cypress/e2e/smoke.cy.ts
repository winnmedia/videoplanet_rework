/**
 * Smoke Test - 기본적인 앱 동작 확인
 */

describe('Smoke Tests', () => {
  it('페이지가 정상적으로 로드되어야 한다', () => {
    cy.visit('/')
    
    // 기본 페이지 요소들 확인
    cy.get('h1').should('contain.text', 'VLANET')
    cy.get('[data-testid="load-projects"]').should('be.visible')
  })

  it('API 연결이 작동해야 한다', () => {
    cy.visit('/')
    
    // 프로젝트 로드 버튼 클릭
    cy.get('[data-testid="load-projects"]').click()
    
    // 로딩 상태나 결과 확인
    cy.get('[data-testid="loading-indicator"], [data-testid="projects-list"], [data-testid="error-display"]', { timeout: 10000 })
      .should('exist')
  })

  it('기본적인 접근성 요소들이 존재해야 한다', () => {
    cy.visit('/')
    
    // 스킵 링크
    cy.get('[data-testid="skip-link"]').should('exist')
    
    // 메인 역할
    cy.get('[role="main"]').should('exist')
    
    // 제목 구조
    cy.get('h1').should('exist')
  })
})