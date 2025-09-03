// Project Management commands for E2E tests

Cypress.Commands.add('createProject', (projectData: {
  name: string
  description: string
  category?: 'commercial' | 'narrative' | 'documentary' | 'music-video'
  deadline?: string
}) => {
  cy.visit('/projects/new')
  
  // Fill project form
  cy.get('[data-testid="project-name-input"]').type(projectData.name)
  cy.get('[data-testid="project-description-input"]').type(projectData.description)
  
  if (projectData.category) {
    cy.get('[data-testid="project-category-select"]').select(projectData.category)
  }
  
  if (projectData.deadline) {
    cy.get('[data-testid="project-deadline-input"]').type(projectData.deadline)
  }
  
  // Submit project creation
  cy.get('[data-testid="create-project-button"]').click()
  
  // Wait for project creation to complete
  cy.url().should('include', '/projects/')
  cy.get('[data-testid="project-created-success"]').should('be.visible')
})

Cypress.Commands.add('inviteTeamMember', (inviteData: {
  email: string
  role: 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer'
  message?: string
}) => {
  // Open team invitation modal
  cy.get('[data-testid="invite-team-button"]').click()
  
  // Fill invitation form
  cy.get('[data-testid="invite-email-input"]').type(inviteData.email)
  cy.get('[data-testid="invite-role-select"]').select(inviteData.role)
  
  if (inviteData.message) {
    cy.get('[data-testid="invite-message-textarea"]').type(inviteData.message)
  }
  
  // Send invitation
  cy.get('[data-testid="send-invite-button"]').click()
  
  // Verify invitation sent
  cy.get('[data-testid="invite-success-message"]').should('contain', '초대장이 전송되었습니다')
  
  // Wait for cooldown (60 seconds as per DEVPLAN)
  cy.get('[data-testid="invite-cooldown"]', { timeout: 5000 }).should('be.visible')
})

Cypress.Commands.add('verifyAutoSchedule', () => {
  // Navigate to calendar/schedule view
  cy.get('[data-testid="calendar-tab"]').click()
  
  // Verify auto-generated schedule phases
  cy.get('[data-testid="schedule-phase-planning"]').should('be.visible')
  cy.get('[data-testid="schedule-phase-shooting"]').should('be.visible')
  cy.get('[data-testid="schedule-phase-editing"]').should('be.visible')
  
  // Verify default durations (1 week planning + 1 day shooting + 2 weeks editing)
  cy.get('[data-testid="planning-duration"]').should('contain', '1주')
  cy.get('[data-testid="shooting-duration"]').should('contain', '1일')
  cy.get('[data-testid="editing-duration"]').should('contain', '2주')
})

Cypress.Commands.add('checkProjectPermissions', (expectedRole: string) => {
  // Check role-based UI elements
  switch (expectedRole) {
    case 'owner':
      cy.get('[data-testid="project-settings-button"]').should('be.visible')
      cy.get('[data-testid="invite-team-button"]').should('be.visible')
      cy.get('[data-testid="delete-project-button"]').should('be.visible')
      break
    case 'admin':
      cy.get('[data-testid="project-settings-button"]').should('be.visible')
      cy.get('[data-testid="invite-team-button"]').should('be.visible')
      cy.get('[data-testid="delete-project-button"]').should('not.exist')
      break
    case 'viewer':
      cy.get('[data-testid="project-settings-button"]').should('not.exist')
      cy.get('[data-testid="invite-team-button"]').should('not.exist')
      break
    default:
      cy.log(`Testing permissions for role: ${expectedRole}`)
  }
})

Cypress.Commands.add('testShootingConflictDetection', () => {
  cy.visit('/calendar')
  
  // Create overlapping shooting schedules
  cy.get('[data-testid="add-schedule-button"]').click()
  cy.get('[data-testid="schedule-type-select"]').select('shooting')
  cy.get('[data-testid="schedule-start-date"]').type('2024-01-15')
  cy.get('[data-testid="schedule-end-date"]').type('2024-01-16')
  cy.get('[data-testid="save-schedule-button"]').click()
  
  // Try to create conflicting schedule
  cy.get('[data-testid="add-schedule-button"]').click()
  cy.get('[data-testid="schedule-type-select"]').select('shooting')
  cy.get('[data-testid="schedule-start-date"]').type('2024-01-15')
  cy.get('[data-testid="schedule-end-date"]').type('2024-01-17')
  cy.get('[data-testid="save-schedule-button"]').click()
  
  // Verify conflict warning
  cy.get('[data-testid="conflict-warning"]').should('contain', '촬영 일정 충돌')
  cy.get('[data-testid="conflict-details"]').should('be.visible')
})

declare global {
  namespace Cypress {
    interface Chainable {
      createProject(projectData: {
        name: string
        description: string
        category?: 'commercial' | 'narrative' | 'documentary' | 'music-video'
        deadline?: string
      }): Chainable<void>
      inviteTeamMember(inviteData: {
        email: string
        role: 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer'
        message?: string
      }): Chainable<void>
      verifyAutoSchedule(): Chainable<void>
      checkProjectPermissions(expectedRole: string): Chainable<void>
      testShootingConflictDetection(): Chainable<void>
    }
  }
}