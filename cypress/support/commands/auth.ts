// Authentication commands for E2E tests

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/auth/login')
    cy.get('[data-testid="email-input"]').type(email)
    cy.get('[data-testid="password-input"]').type(password)
    cy.get('[data-testid="login-button"]').click()
    
    // Wait for successful login
    cy.url().should('not.include', '/auth/login')
    cy.get('[data-testid="user-profile"]').should('be.visible')
  }, {
    validate() {
      // Validate session is still valid
      cy.request({
        method: 'GET',
        url: '/api/auth/me',
        failOnStatusCode: false
      }).then((resp) => {
        expect(resp.status).to.equal(200)
      })
    }
  })
})

Cypress.Commands.add('signup', (userData: {
  email: string
  password: string
  confirmPassword: string
  username: string
}) => {
  cy.visit('/auth/signup')
  
  cy.get('[data-testid="username-input"]').type(userData.username)
  cy.get('[data-testid="email-input"]').type(userData.email)
  cy.get('[data-testid="password-input"]').type(userData.password)
  cy.get('[data-testid="confirm-password-input"]').type(userData.confirmPassword)
  
  // Handle terms acceptance
  cy.get('[data-testid="terms-checkbox"]').check()
  
  cy.get('[data-testid="signup-button"]').click()
  
  // Wait for signup completion (might redirect to verification page)
  cy.url().should('not.include', '/auth/signup')
})

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu-trigger"]').click()
  cy.get('[data-testid="logout-button"]').click()
  
  // Verify logout
  cy.url().should('include', '/auth/login')
  cy.get('[data-testid="login-button"]').should('be.visible')
})

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      signup(userData: {
        email: string
        password: string
        confirmPassword: string
        username: string
      }): Chainable<void>
      logout(): Chainable<void>
    }
  }
}