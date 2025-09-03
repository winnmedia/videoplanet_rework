// AI Video Planning and Prompt Builder commands for E2E tests

Cypress.Commands.add('createBasicVideoPlan', (planData: {
  story: string
  tone: 'professional' | 'casual' | 'dramatic' | 'upbeat' | 'minimalist'
  genre: 'commercial' | 'narrative' | 'documentary' | 'music-video'
  targetAudience: string
}) => {
  cy.visit('/video-planning/new')
  
  // STEP 1: Story input with tone/genre selection
  cy.get('[data-testid="story-input-textarea"]').type(planData.story)
  cy.get('[data-testid="tone-selector"]').select(planData.tone)
  cy.get('[data-testid="genre-selector"]').select(planData.genre)
  cy.get('[data-testid="target-audience-input"]').type(planData.targetAudience)
  
  cy.get('[data-testid="generate-structure-button"]').click()
  
  // Wait for Google Gemini API response (mocked)
  cy.get('[data-testid="ai-processing-indicator"]', { timeout: 15000 }).should('not.exist')
  cy.get('[data-testid="generated-structure"]').should('be.visible')
})

Cypress.Commands.add('reviewAndEdit4ActStructure', (edits?: {
  act1?: string
  act2?: string
  act3?: string
  act4?: string
}) => {
  // STEP 2: Review and edit 4-act structure
  cy.get('[data-testid="4act-structure-section"]').should('be.visible')
  
  if (edits) {
    if (edits.act1) {
      cy.get('[data-testid="act1-textarea"]').clear().type(edits.act1)
    }
    if (edits.act2) {
      cy.get('[data-testid="act2-textarea"]').clear().type(edits.act2)
    }
    if (edits.act3) {
      cy.get('[data-testid="act3-textarea"]').clear().type(edits.act3)
    }
    if (edits.act4) {
      cy.get('[data-testid="act4-textarea"]').clear().type(edits.act4)
    }
  }
  
  // Proceed to shot breakdown
  cy.get('[data-testid="proceed-to-shots-button"]').click()
  
  // Wait for shot generation
  cy.get('[data-testid="shot-generation-progress"]', { timeout: 15000 }).should('not.exist')
})

Cypress.Commands.add('generate12ShotGrid', () => {
  // STEP 3: Generate 12-shot grid with storyboard
  cy.get('[data-testid="12shot-grid"]').should('be.visible')
  
  // Verify all 12 shots are generated
  for (let i = 1; i <= 12; i++) {
    cy.get(`[data-testid="shot-${i}"]`).should('be.visible')
    cy.get(`[data-testid="shot-${i}-description"]`).should('not.be.empty')
  }
  
  // Generate storyboard images (mocked)
  cy.get('[data-testid="generate-storyboard-button"]').click()
  cy.get('[data-testid="storyboard-generation-progress"]', { timeout: 20000 }).should('not.exist')
  
  // Verify storyboard images are loaded
  cy.get('[data-testid="storyboard-images"]').should('be.visible')
  cy.get('[data-testid="storyboard-image"]').should('have.length', 12)
})

Cypress.Commands.add('exportToPDF', (exportOptions: {
  format: 'json' | 'marp' | 'both'
  includeStoryboard: boolean
  includeMetadata: boolean
}) => {
  // Open export options
  cy.get('[data-testid="export-plan-button"]').click()
  
  // Configure export options
  if (exportOptions.format === 'json' || exportOptions.format === 'both') {
    cy.get('[data-testid="export-json-checkbox"]').check()
  }
  if (exportOptions.format === 'marp' || exportOptions.format === 'both') {
    cy.get('[data-testid="export-marp-checkbox"]').check()
  }
  
  if (exportOptions.includeStoryboard) {
    cy.get('[data-testid="include-storyboard-checkbox"]').check()
  }
  
  if (exportOptions.includeMetadata) {
    cy.get('[data-testid="include-metadata-checkbox"]').check()
  }
  
  // Start export
  cy.get('[data-testid="start-export-button"]').click()
  
  // Wait for export completion
  cy.get('[data-testid="export-progress"]', { timeout: 30000 }).should('not.exist')
  cy.get('[data-testid="export-success-message"]').should('contain', '내보내기 완료')
})

Cypress.Commands.add('useAdvancedPromptBuilder', (promptData: {
  promptChain: Array<{
    step: string
    prompt: string
    expectedOutput?: string
  }>
  template?: 'commercial' | 'narrative' | 'documentary' | 'music-video'
  metadata?: {
    tone: string
    genre: string
    targetAudience: string
  }
}) => {
  cy.visit('/ai-prompt-builder')
  
  // Select template if provided
  if (promptData.template) {
    cy.get('[data-testid="template-selector"]').select(promptData.template)
    cy.get('[data-testid="load-template-button"]').click()
  }
  
  // Build prompt chain
  promptData.promptChain.forEach((step, index) => {
    if (index > 0) {
      cy.get('[data-testid="add-prompt-step-button"]').click()
    }
    
    cy.get(`[data-testid="prompt-step-${index}-name"]`).type(step.step)
    cy.get(`[data-testid="prompt-step-${index}-content"]`).type(step.prompt)
    
    if (step.expectedOutput) {
      cy.get(`[data-testid="prompt-step-${index}-expected-output"]`).type(step.expectedOutput)
    }
  })
  
  // Set metadata
  if (promptData.metadata) {
    cy.get('[data-testid="metadata-tone"]').type(promptData.metadata.tone)
    cy.get('[data-testid="metadata-genre"]').type(promptData.metadata.genre)
    cy.get('[data-testid="metadata-audience"]').type(promptData.metadata.targetAudience)
  }
  
  // Execute prompt chain
  cy.get('[data-testid="execute-prompt-chain-button"]').click()
  
  // Wait for AI processing
  cy.get('[data-testid="prompt-chain-processing"]', { timeout: 30000 }).should('not.exist')
  cy.get('[data-testid="prompt-chain-results"]').should('be.visible')
})

Cypress.Commands.add('managePromptVersions', () => {
  // Test prompt version management
  cy.get('[data-testid="prompt-history-tab"]').click()
  
  // Verify version history
  cy.get('[data-testid="version-history-list"]').should('be.visible')
  cy.get('[data-testid="version-item"]').should('have.length.at.least', 1)
  
  // Create new version
  cy.get('[data-testid="create-version-button"]').click()
  cy.get('[data-testid="version-name-input"]').type('v2.0 - Improved storytelling')
  cy.get('[data-testid="save-version-button"]').click()
  
  // Compare versions
  cy.get('[data-testid="compare-versions-button"]').click()
  cy.get('[data-testid="version-comparison-view"]').should('be.visible')
})

Cypress.Commands.add('testAIQualityValidation', () => {
  // Test AI response quality validation and retry mechanism
  cy.get('[data-testid="quality-validation-settings"]').click()
  
  // Configure quality thresholds
  cy.get('[data-testid="min-word-count-input"]').clear().type('100')
  cy.get('[data-testid="coherence-threshold-slider"]').invoke('val', 0.8).trigger('change')
  cy.get('[data-testid="creativity-threshold-slider"]').invoke('val', 0.7).trigger('change')
  
  // Save settings
  cy.get('[data-testid="save-quality-settings-button"]').click()
  
  // Test with intentionally poor input to trigger retry
  cy.get('[data-testid="story-input-textarea"]').clear().type('Bad story')
  cy.get('[data-testid="generate-structure-button"]').click()
  
  // Should trigger quality validation failure and retry
  cy.get('[data-testid="quality-validation-warning"]', { timeout: 10000 }).should('be.visible')
  cy.get('[data-testid="auto-retry-indicator"]').should('be.visible')
})

declare global {
  namespace Cypress {
    interface Chainable {
      createBasicVideoPlan(planData: {
        story: string
        tone: 'professional' | 'casual' | 'dramatic' | 'upbeat' | 'minimalist'
        genre: 'commercial' | 'narrative' | 'documentary' | 'music-video'
        targetAudience: string
      }): Chainable<void>
      reviewAndEdit4ActStructure(edits?: {
        act1?: string
        act2?: string
        act3?: string
        act4?: string
      }): Chainable<void>
      generate12ShotGrid(): Chainable<void>
      exportToPDF(exportOptions: {
        format: 'json' | 'marp' | 'both'
        includeStoryboard: boolean
        includeMetadata: boolean
      }): Chainable<void>
      useAdvancedPromptBuilder(promptData: {
        promptChain: Array<{
          step: string
          prompt: string
          expectedOutput?: string
        }>
        template?: 'commercial' | 'narrative' | 'documentary' | 'music-video'
        metadata?: {
          tone: string
          genre: string
          targetAudience: string
        }
      }): Chainable<void>
      managePromptVersions(): Chainable<void>
      testAIQualityValidation(): Chainable<void>
    }
  }
}