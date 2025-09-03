// Video Feedback and Real-time Comments commands for E2E tests

Cypress.Commands.add('setupVideoFeedbackSession', (videoData: {
  videoId: string
  videoTitle: string
  duration: string
}) => {
  cy.visit(`/feedback/${videoData.videoId}`)
  
  // Verify video player setup
  cy.get('[data-testid="video-player"]').should('be.visible')
  cy.get('[data-testid="video-title"]').should('contain', videoData.videoTitle)
  cy.get('[data-testid="video-duration"]').should('contain', videoData.duration)
  
  // Verify feedback panel setup
  cy.get('[data-testid="feedback-panel"]').should('be.visible')
  cy.get('[data-testid="comments-tab"]').should('be.visible')
  cy.get('[data-testid="team-tab"]').should('be.visible')
  cy.get('[data-testid="project-tab"]').should('be.visible')
})

Cypress.Commands.add('addTimecodeComment', (commentData: {
  timecode: string
  comment: string
  category?: 'general' | 'technical' | 'creative' | 'urgent'
  mentions?: string[]
}) => {
  // Play video to specific timecode
  cy.get('[data-testid="video-player"]').click() // Start playing
  cy.get('[data-testid="timecode-input"]').clear().type(commentData.timecode)
  cy.get('[data-testid="seek-to-timecode-button"]').click()
  
  // Use T-shortcut for automatic timecode insertion
  cy.get('[data-testid="comment-textarea"]').focus()
  cy.realPress('t') // T-shortcut
  
  // Verify timecode was inserted automatically
  cy.get('[data-testid="comment-textarea"]').should('contain', commentData.timecode)
  
  // Add comment text
  cy.get('[data-testid="comment-textarea"]').type(`{end} ${commentData.comment}`)
  
  // Set category if provided
  if (commentData.category) {
    cy.get('[data-testid="comment-category-select"]').select(commentData.category)
  }
  
  // Add mentions if provided
  if (commentData.mentions) {
    commentData.mentions.forEach(mention => {
      cy.get('[data-testid="comment-textarea"]').type(`{end} @${mention}`)
      cy.get('[data-testid="mention-suggestion"]').contains(mention).click()
    })
  }
  
  // Submit comment
  cy.get('[data-testid="submit-comment-button"]').click()
  
  // Verify comment was added
  cy.get('[data-testid="comment-list"]')
    .contains(commentData.comment)
    .should('be.visible')
})

Cypress.Commands.add('testRealTimeComments', () => {
  // Test WebSocket real-time functionality
  // Open multiple sessions (simulated)
  
  cy.window().then((win) => {
    // Mock WebSocket connection
    const mockWS = {
      send: cy.stub().as('wsSend'),
      close: cy.stub().as('wsClose'),
      readyState: 1 // OPEN
    }
    
    // Override WebSocket
    win.WebSocket = cy.stub().returns(mockWS)
    
    // Add comment from current session
    cy.addTimecodeComment({
      timecode: '00:01:30',
      comment: '이 장면의 조명이 너무 어둑습니다',
      category: 'technical'
    })
    
    // Verify WebSocket message was sent
    cy.get('@wsSend').should('have.been.called')
    
    // Simulate receiving comment from another user
    const incomingComment = {
      id: 'comment-123',
      user: '다른 팀원',
      timecode: '00:01:35',
      comment: '동의합니다. 조명을 올려주세요',
      timestamp: new Date().toISOString()
    }
    
    // Trigger WebSocket message event
    const wsOnMessage = mockWS.onmessage
    if (wsOnMessage) {
      wsOnMessage({ data: JSON.stringify(incomingComment) })
    }
    
    // Verify real-time comment appears
    cy.get('[data-testid="comment-list"]')
      .should('contain', incomingComment.comment)
  })
})

Cypress.Commands.add('takeScreenshot', (screenshotData: {
  timecode: string
  projectSlug: string
  description?: string
}) => {
  // Navigate to specific timecode
  cy.get('[data-testid="timecode-input"]').clear().type(screenshotData.timecode)
  cy.get('[data-testid="seek-to-timecode-button"]').click()
  
  // Take screenshot with standardized naming
  cy.get('[data-testid="screenshot-button"]').click()
  
  // Verify screenshot dialog
  cy.get('[data-testid="screenshot-dialog"]').should('be.visible')
  
  // Check standardized filename format: project-{slug}_TC{mmssfff}_{YYYY-MM-DD}T{HHmmss}.jpg
  const expectedPattern = new RegExp(`${screenshotData.projectSlug}_TC\\d{6}_\\d{8}T\\d{6}\\.jpg`)
  cy.get('[data-testid="screenshot-filename"]')
    .invoke('text')
    .should('match', expectedPattern)
  
  // Add description if provided
  if (screenshotData.description) {
    cy.get('[data-testid="screenshot-description-input"]').type(screenshotData.description)
  }
  
  // Save screenshot
  cy.get('[data-testid="save-screenshot-button"]').click()
  
  // Verify screenshot was saved
  cy.get('[data-testid="screenshot-success-message"]').should('be.visible')
})

Cypress.Commands.add('testVideoPlayerFeatures', () => {
  // Test Video.js player functionality
  const player = cy.get('[data-testid="video-player"]')
  
  // Test play/pause
  player.click() // Play
  cy.get('[data-testid="play-button"]').should('have.class', 'playing')
  
  player.click() // Pause
  cy.get('[data-testid="play-button"]').should('not.have.class', 'playing')
  
  // Test volume control
  cy.get('[data-testid="volume-slider"]')
    .invoke('val', 50)
    .trigger('input')
  
  // Test fullscreen
  cy.get('[data-testid="fullscreen-button"]').click()
  cy.get('[data-testid="video-player"]').should('have.class', 'vjs-fullscreen')
  
  // Exit fullscreen
  cy.realPress('Escape')
  cy.get('[data-testid="video-player"]').should('not.have.class', 'vjs-fullscreen')
  
  // Test speed control
  cy.get('[data-testid="playback-rate-menu"]').click()
  cy.get('[data-testid="playback-rate-1.5x"]').click()
  
  // Test timecode navigation
  cy.get('[data-testid="timecode-display"]').should('contain', '00:')
})

Cypress.Commands.add('verifyCommentNotifications', (expectedNotifications: {
  type: 'mention' | 'reply' | 'new-comment'
  count: number
}) => {
  // Check notification center
  cy.get('[data-testid="notification-bell"]').click()
  
  // Verify notification count
  cy.get('[data-testid="notification-count-badge"]')
    .should('contain', expectedNotifications.count.toString())
  
  // Verify notification type
  cy.get(`[data-testid="notification-${expectedNotifications.type}"]`)
    .should('have.length', expectedNotifications.count)
  
  // Test click-to-navigate
  cy.get(`[data-testid="notification-${expectedNotifications.type}"]`).first().click()
  
  // Should navigate to the specific comment
  cy.url().should('include', '#comment-')
})

Cypress.Commands.add('testCommentThreading', () => {
  // Test reply functionality
  cy.get('[data-testid="comment-item"]').first().within(() => {
    cy.get('[data-testid="reply-button"]').click()
  })
  
  // Add reply
  cy.get('[data-testid="reply-textarea"]').type('좋은 지적입니다. 수정하겠습니다.')
  cy.get('[data-testid="submit-reply-button"]').click()
  
  // Verify threaded structure
  cy.get('[data-testid="comment-thread"]').should('be.visible')
  cy.get('[data-testid="reply-item"]').should('be.visible')
  
  // Test nested replies
  cy.get('[data-testid="reply-item"]').within(() => {
    cy.get('[data-testid="reply-button"]').click()
  })
  
  cy.get('[data-testid="nested-reply-textarea"]').type('감사합니다!')
  cy.get('[data-testid="submit-nested-reply-button"]').click()
  
  // Verify nested structure
  cy.get('[data-testid="nested-reply-item"]').should('be.visible')
})

declare global {
  namespace Cypress {
    interface Chainable {
      setupVideoFeedbackSession(videoData: {
        videoId: string
        videoTitle: string
        duration: string
      }): Chainable<void>
      addTimecodeComment(commentData: {
        timecode: string
        comment: string
        category?: 'general' | 'technical' | 'creative' | 'urgent'
        mentions?: string[]
      }): Chainable<void>
      testRealTimeComments(): Chainable<void>
      takeScreenshot(screenshotData: {
        timecode: string
        projectSlug: string
        description?: string
      }): Chainable<void>
      testVideoPlayerFeatures(): Chainable<void>
      verifyCommentNotifications(expectedNotifications: {
        type: 'mention' | 'reply' | 'new-comment'
        count: number
      }): Chainable<void>
      testCommentThreading(): Chainable<void>
    }
  }
}