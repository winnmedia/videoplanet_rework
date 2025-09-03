// MSW setup for Cypress E2E tests
import { setupWorker } from 'msw/browser'
import { allHandlers } from './msw-handlers'

// Create MSW worker for browser environment
export const worker = setupWorker(...allHandlers)

// Setup MSW for Cypress
Cypress.Commands.add('setupMSW', () => {
  cy.window().then((win) => {
    // Ensure MSW is available in the window object
    win.msw = { worker }
    
    // Start MSW worker
    return worker.start({
      onUnhandledRequest: 'bypass', // Allow real requests for non-mocked endpoints
      quiet: false // Log intercepted requests for debugging
    })
  })
})

Cypress.Commands.add('mockAPI', (method: string, url: string, response: any, status = 200) => {
  cy.window().then((win) => {
    if (win.msw && win.msw.worker) {
      // Add runtime handler
      win.msw.worker.use(
        // Dynamic handler based on method
        method.toLowerCase() === 'get' 
          ? http.get(url, () => new HttpResponse(JSON.stringify(response), { status }))
          : method.toLowerCase() === 'post'
          ? http.post(url, () => new HttpResponse(JSON.stringify(response), { status }))
          : method.toLowerCase() === 'put'
          ? http.put(url, () => new HttpResponse(JSON.stringify(response), { status }))
          : http.delete(url, () => new HttpResponse(JSON.stringify(response), { status }))
      )
    }
  })
})

Cypress.Commands.add('restoreAPI', () => {
  cy.window().then((win) => {
    if (win.msw && win.msw.worker) {
      // Reset to original handlers
      win.msw.worker.resetHandlers()
    }
  })
})

Cypress.Commands.add('stopMSW', () => {
  cy.window().then((win) => {
    if (win.msw && win.msw.worker) {
      win.msw.worker.stop()
    }
  })
})

// WebSocket mock for real-time features
Cypress.Commands.add('mockWebSocket', (wsUrl: string, messages: any[]) => {
  cy.window().then((win) => {
    const mockWebSocket = {
      url: wsUrl,
      readyState: 1, // OPEN
      send: cy.stub().as('mockWebSocketSend'),
      close: cy.stub().as('mockWebSocketClose'),
      addEventListener: cy.stub(),
      removeEventListener: cy.stub(),
      dispatchEvent: cy.stub()
    }
    
    // Override WebSocket constructor
    const originalWebSocket = win.WebSocket
    win.WebSocket = cy.stub().returns(mockWebSocket)
    
    // Simulate incoming messages
    setTimeout(() => {
      messages.forEach((message, index) => {
        setTimeout(() => {
          if (mockWebSocket.onmessage) {
            mockWebSocket.onmessage({ data: JSON.stringify(message) })
          }
        }, index * 1000) // 1 second delay between messages
      })
    }, 500) // Initial delay
    
    // Store original for cleanup
    win._originalWebSocket = originalWebSocket
  })
})

Cypress.Commands.add('restoreWebSocket', () => {
  cy.window().then((win) => {
    if (win._originalWebSocket) {
      win.WebSocket = win._originalWebSocket
      delete win._originalWebSocket
    }
  })
})

// Extend Cypress interface
declare global {
  namespace Cypress {
    interface Chainable {
      setupMSW(): Chainable<void>
      mockAPI(method: string, url: string, response: any, status?: number): Chainable<void>
      restoreAPI(): Chainable<void>
      stopMSW(): Chainable<void>
      mockWebSocket(wsUrl: string, messages: any[]): Chainable<void>
      restoreWebSocket(): Chainable<void>
    }
  }
  
  interface Window {
    msw?: {
      worker: any
    }
    _originalWebSocket?: any
  }
}

// Import http for dynamic handlers
import { http, HttpResponse } from 'msw'