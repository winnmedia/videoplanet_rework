// Cypress E2E test support file
import './commands'
import './msw-setup'
import 'cypress-axe'
import 'cypress-real-events'
import '@percy/cypress'

// Global test configuration
beforeEach(() => {
  // Inject axe-core for accessibility testing
  cy.injectAxe()
  
  // Set up MSW for deterministic API mocking
  cy.setupMSW()
})

// Prevent uncaught exceptions from failing tests
Cypress.on('uncaught:exception', (err, _runnable) => {
  // Ignore specific errors that shouldn't fail tests
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  if (err.message.includes('Script error')) {
    return false
  }
  return true
})

// Performance timing commands
Cypress.Commands.add('measurePerformance', () => {
  cy.window().then((win) => {
    const perfData = win.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const metrics = {
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
      loadComplete: perfData.loadEventEnd - perfData.navigationStart,
      firstByte: perfData.responseStart - perfData.requestStart
    }
    
    cy.task('table', metrics)
    
    // Assert performance budgets
    expect(metrics.domContentLoaded).to.be.lessThan(2500) // 2.5s budget for LCP
    expect(metrics.loadComplete).to.be.lessThan(5000) // 5s budget for load complete
  })
})

// Accessibility testing command with detailed reporting
Cypress.Commands.add('checkA11yWithReport', (context?: string, options?: Record<string, unknown>) => {
  cy.checkA11y(context, options, (violations) => {
    if (violations.length > 0) {
      cy.task('log', `Found ${violations.length} accessibility violations:`)
      violations.forEach((violation) => {
        cy.task('log', `- ${violation.id}: ${violation.description}`)
        violation.nodes.forEach((node, index) => {
          cy.task('log', `  Node ${index + 1}: ${node.target}`)
        })
      })
    }
  })
})

declare global {
  namespace Cypress {
    interface Chainable {
      measurePerformance(): Chainable<void>
      checkA11yWithReport(context?: string, options?: Record<string, unknown>): Chainable<void>
    }
  }
}