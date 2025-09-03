// Video-related commands for E2E tests

Cypress.Commands.add('uploadVideo', (filePath: string) => {
  cy.get('[data-testid="video-upload-input"]').selectFile(filePath, { force: true })
  
  // Wait for upload to complete
  cy.get('[data-testid="upload-progress"]', { timeout: 30000 }).should('not.exist')
  cy.get('[data-testid="video-preview"]').should('be.visible')
})

Cypress.Commands.add('selectVideoQuality', (quality: '720p' | '1080p' | '4K') => {
  cy.get('[data-testid="quality-selector"]').click()
  cy.get(`[data-testid="quality-option-${quality}"]`).click()
})

Cypress.Commands.add('startVideoProcessing', () => {
  cy.get('[data-testid="process-video-button"]').click()
  
  // Verify processing started
  cy.get('[data-testid="processing-status"]').should('contain', 'Processing')
})

Cypress.Commands.add('waitForVideoProcessing', (timeout = 60000) => {
  cy.get('[data-testid="processing-status"]', { timeout }).should('contain', 'Completed')
  cy.get('[data-testid="processed-video-preview"]').should('be.visible')
})

Cypress.Commands.add('submitVideoFeedback', (feedback: {
  rating: number
  comment: string
  category: string
}) => {
  // Open feedback form
  cy.get('[data-testid="feedback-button"]').click()
  
  // Select rating
  cy.get(`[data-testid="star-rating-${feedback.rating}"]`).click()
  
  // Select category
  cy.get('[data-testid="feedback-category"]').select(feedback.category)
  
  // Enter comment
  cy.get('[data-testid="feedback-comment"]').type(feedback.comment)
  
  // Submit feedback
  cy.get('[data-testid="submit-feedback-button"]').click()
  
  // Verify submission
  cy.get('[data-testid="feedback-success"]').should('be.visible')
})

Cypress.Commands.add('verifyVideoMetadata', (expectedData: {
  duration?: string
  resolution?: string
  fileSize?: string
}) => {
  if (expectedData.duration) {
    cy.get('[data-testid="video-duration"]').should('contain', expectedData.duration)
  }
  
  if (expectedData.resolution) {
    cy.get('[data-testid="video-resolution"]').should('contain', expectedData.resolution)
  }
  
  if (expectedData.fileSize) {
    cy.get('[data-testid="video-filesize"]').should('contain', expectedData.fileSize)
  }
})

declare global {
  namespace Cypress {
    interface Chainable {
      uploadVideo(filePath: string): Chainable<void>
      selectVideoQuality(quality: '720p' | '1080p' | '4K'): Chainable<void>
      startVideoProcessing(): Chainable<void>
      waitForVideoProcessing(timeout?: number): Chainable<void>
      submitVideoFeedback(feedback: {
        rating: number
        comment: string
        category: string
      }): Chainable<void>
      verifyVideoMetadata(expectedData: {
        duration?: string
        resolution?: string
        fileSize?: string
      }): Chainable<void>
    }
  }
}