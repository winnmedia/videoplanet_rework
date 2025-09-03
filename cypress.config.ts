import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    pageLoadTimeout: 30000,
    video: true,
    screenshotOnRunFailure: true,
    
    // Retry configuration for flaky test prevention
    retries: {
      runMode: 2,
      openMode: 0
    },

    // Test file patterns
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    
    setupNodeEvents(on, config) {
      // Percy visual testing setup
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@percy/cypress/task')(on, config)
      
      // Grep plugin for test filtering
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@cypress/grep/src/plugin')(config)
      
      // WebSocket tasks for realtime collaboration testing
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { websocketTasks } = require('./cypress/support/tasks/websocket-tasks')
      
      // Performance monitoring and WebSocket tasks
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        table(message) {
          console.table(message)
          return null
        },
        // WebSocket 관련 태스크들 등록
        ...websocketTasks
      })

      return config
    },

    env: {
      // Environment for different test scenarios
      coverage: true,
      codeCoverage: {
        url: 'http://localhost:3000/__coverage__'
      }
    },

    // Browser configuration for cross-browser testing
    chromeWebSecurity: false,
    experimentalStudio: true,
    experimentalWebKitSupport: true
  },

  component: {
    devServer: {
      framework: 'next',
      bundler: 'webpack'
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts'
  }
})