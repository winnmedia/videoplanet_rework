// Dashboard and Navigation commands for E2E tests

Cypress.Commands.add('verifyDashboardComponents', () => {
  // Verify main dashboard elements
  cy.get('[data-testid="dashboard-content"]').should('be.visible')
  
  // New Feed Summary
  cy.get('[data-testid="new-feed-summary"]').should('be.visible')
  cy.get('[data-testid="new-comments-count"]').should('be.visible')
  cy.get('[data-testid="new-replies-count"]').should('be.visible')
  cy.get('[data-testid="new-reactions-count"]').should('be.visible')
  
  // Invite Management Summary
  cy.get('[data-testid="invite-management-summary"]').should('be.visible')
  cy.get('[data-testid="pending-invites-count"]').should('be.visible')
  cy.get('[data-testid="quick-invite-actions"]').should('be.visible')
  
  // Editing Schedule Gantt Summary
  cy.get('[data-testid="schedule-gantt-summary"]').should('be.visible')
  cy.get('[data-testid="project-progress-chart"]').should('be.visible')
})

Cypress.Commands.add('testUnreadBadgeAccuracy', () => {
  // Test unread badge counting accuracy with realtime pipeline
  cy.get('[data-testid="notification-bell"]').should('be.visible')
  
  // Check if realtime connection is established
  cy.get('[data-testid="notification-bell"]')
    .should('have.attr', 'data-connected', 'true')
  
  // Get initial count from data attribute (more reliable than text parsing)
  cy.get('[data-testid="notification-bell"]')
    .invoke('attr', 'data-unread-count')
    .then((initialCountStr) => {
      const initial = parseInt(initialCountStr || '0')
      
      // Simulate new notification via CustomEvent (realtime pipeline will handle it)
      cy.window().then((win) => {
        // Trigger deterministic notification event
        win.dispatchEvent(new CustomEvent('newNotification', {
          detail: {
            type: 'comment',
            projectId: 'test-project',
            message: '새로운 댓글이 달렸습니다',
            timestamp: Date.now()
          }
        }))
      })
      
      // Wait for realtime pipeline to process the event
      cy.wait(100)
      
      // Verify count increased by checking both badge visibility and data attributes
      if (initial === 0) {
        // Badge should now be visible
        cy.get('[data-testid="notification-count-badge"]').should('be.visible')
        cy.get('[data-testid="notification-count-badge"]').should('contain', '1')
      }
      
      // Check data attribute for accuracy
      cy.get('[data-testid="notification-bell"]')
        .should('have.attr', 'data-unread-count', (initial + 1).toString())
      
      // Test duplicate event prevention
      cy.window().then((win) => {
        // Send same notification again (should be ignored by deduplication)
        win.dispatchEvent(new CustomEvent('newNotification', {
          detail: {
            type: 'comment',
            projectId: 'test-project',
            message: '새로운 댓글이 달렸습니다',
            timestamp: Date.now() - 1000 // Same timestamp to test deduplication
          }
        }))
      })
      
      cy.wait(100)
      
      // Count should remain the same (duplicate prevented)
      cy.get('[data-testid="notification-bell"]')
        .should('have.attr', 'data-unread-count', (initial + 1).toString())
      
      // Test badge display formatting (9+ limit)
      if (initial + 1 > 9) {
        cy.get('[data-testid="notification-count-badge"]')
          .should('have.attr', 'data-display-count', '9+')
      } else {
        cy.get('[data-testid="notification-count-badge"]')
          .should('have.attr', 'data-display-count', (initial + 1).toString())
      }
    })
})

Cypress.Commands.add('navigateToQuickActions', (action: 'comments' | 'invites' | 'schedule') => {
  cy.get('[data-testid="dashboard-content"]').should('be.visible')
  
  switch (action) {
    case 'comments':
      cy.get('[data-testid="quick-action-comments"]').click()
      cy.url().should('include', '/feedback')
      break
    case 'invites':
      cy.get('[data-testid="quick-action-invites"]').click()
      cy.url().should('include', '/invites')
      break
    case 'schedule':
      cy.get('[data-testid="quick-action-schedule"]').click()
      cy.url().should('include', '/calendar')
      break
  }
})

Cypress.Commands.add('testGlobalSubmenu', () => {
  // Test global submenu functionality
  cy.get('[data-testid="user-menu-trigger"]').click()
  
  // Verify submenu appears with 90% transparency
  cy.get('[data-testid="global-submenu"]').should('be.visible')
  cy.get('[data-testid="global-submenu"]').should('have.css', 'opacity', '0.9')
  
  // Test focus trapping
  cy.get('[data-testid="submenu-item-profile"]').should('be.focused')
  cy.realPress('Tab')
  cy.get('[data-testid="submenu-item-settings"]').should('be.focused')
  cy.realPress('Tab')
  cy.get('[data-testid="submenu-item-logout"]').should('be.focused')
  
  // Test ESC key closure
  cy.realPress('Escape')
  cy.get('[data-testid="global-submenu"]').should('not.exist')
  
  // Test outside click closure
  cy.get('[data-testid="user-menu-trigger"]').click()
  cy.get('[data-testid="global-submenu"]').should('be.visible')
  cy.get('body').click(0, 0) // Click outside
  cy.get('[data-testid="global-submenu"]').should('not.exist')
})

Cypress.Commands.add('testNotificationCenter', () => {
  // Test global notification center
  cy.get('[data-testid="notification-bell"]').click()
  
  // Verify drawer opens
  cy.get('[data-testid="notification-drawer"]').should('be.visible')
  
  // Verify shows 10 recent notifications
  cy.get('[data-testid="notification-item"]').should('have.length.at.most', 10)
  
  // Test click-to-navigate functionality
  cy.get('[data-testid="notification-item"]').first().click()
  
  // Should navigate to relevant page
  cy.url().should('not.include', '/dashboard')
  
  // Go back to test manual refresh
  cy.go('back')
  cy.get('[data-testid="notification-bell"]').click()
  
  // Test manual refresh
  cy.get('[data-testid="refresh-notifications-button"]').click()
  cy.get('[data-testid="notifications-refreshing"]').should('be.visible')
  cy.get('[data-testid="notifications-refreshing"]', { timeout: 5000 }).should('not.exist')
})

Cypress.Commands.add('verifyProjectProgressVisualization', () => {
  // Test project progress visualization on dashboard
  cy.get('[data-testid="project-progress-chart"]').should('be.visible')
  
  // Verify weekly/monthly toggle
  cy.get('[data-testid="progress-view-toggle"]').should('be.visible')
  
  // Test weekly view
  cy.get('[data-testid="weekly-view-button"]').click()
  cy.get('[data-testid="weekly-progress-chart"]').should('be.visible')
  
  // Test monthly view
  cy.get('[data-testid="monthly-view-button"]').click()
  cy.get('[data-testid="monthly-progress-chart"]').should('be.visible')
  
  // Verify project status indicators
  cy.get('[data-testid="project-status-planning"]').should('be.visible')
  cy.get('[data-testid="project-status-shooting"]').should('be.visible')
  cy.get('[data-testid="project-status-editing"]').should('be.visible')
  
  // Test project drill-down
  cy.get('[data-testid="project-progress-item"]').first().click()
  cy.url().should('include', '/projects/')
})

Cypress.Commands.add('testSummaryInformationAccuracy', () => {
  // Test accuracy of summary information on dashboard
  cy.intercept('GET', '/api/dashboard/summary', { fixture: 'dashboard-summary.json' }).as('dashboardSummary')
  
  cy.visit('/dashboard')
  cy.wait('@dashboardSummary')
  
  // Verify counts match API response
  cy.get('@dashboardSummary').then((interception) => {
    const summary = interception.response.body
    
    cy.get('[data-testid="new-comments-count"]')
      .should('contain', summary.newComments.toString())
    
    cy.get('[data-testid="pending-invites-count"]')
      .should('contain', summary.pendingInvites.toString())
    
    cy.get('[data-testid="active-projects-count"]')
      .should('contain', summary.activeProjects.toString())
  })
})

Cypress.Commands.add('testResponsiveDashboard', (viewport: 'mobile' | 'tablet' | 'desktop') => {
  const viewportSizes = {
    mobile: [375, 667],
    tablet: [768, 1024],
    desktop: [1280, 720]
  }
  
  const [width, height] = viewportSizes[viewport]
  cy.viewport(width, height)
  
  cy.visit('/dashboard')
  
  if (viewport === 'mobile') {
    // Mobile-specific layout tests
    cy.get('[data-testid="mobile-dashboard-layout"]').should('be.visible')
    cy.get('[data-testid="mobile-navigation-drawer"]').should('exist')
    
    // Test mobile navigation
    cy.get('[data-testid="mobile-menu-toggle"]').click()
    cy.get('[data-testid="mobile-navigation-drawer"]').should('be.visible')
  } else {
    // Desktop/tablet layout tests
    cy.get('[data-testid="desktop-dashboard-layout"]').should('be.visible')
    cy.get('[data-testid="sidebar-navigation"]').should('be.visible')
  }
  
  // Common responsive checks
  cy.get('[data-testid="dashboard-content"]').should('be.visible')
  cy.get('[data-testid="responsive-grid"]').should('have.css', 'display', 'grid')
})

declare global {
  namespace Cypress {
    interface Chainable {
      verifyDashboardComponents(): Chainable<void>
      testUnreadBadgeAccuracy(): Chainable<void>
      navigateToQuickActions(action: 'comments' | 'invites' | 'schedule'): Chainable<void>
      testGlobalSubmenu(): Chainable<void>
      testNotificationCenter(): Chainable<void>
      verifyProjectProgressVisualization(): Chainable<void>
      testSummaryInformationAccuracy(): Chainable<void>
      testResponsiveDashboard(viewport: 'mobile' | 'tablet' | 'desktop'): Chainable<void>
    }
  }
}