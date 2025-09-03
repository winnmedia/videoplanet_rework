// Cypress component test support file
import { mount } from 'cypress/react18'
import 'cypress-axe'

// Augment the Cypress namespace to include type definitions for
// your custom command.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount
    }
  }
}

Cypress.Commands.add('mount', mount)

// Example command -- you can define many like this one!
// Cypress.Commands.add('mount', (component, options) => { ... })