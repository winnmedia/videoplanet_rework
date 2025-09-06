/**
 * Server-side polyfills for browser globals
 * Must be loaded before any modules that use browser APIs
 */

// Comprehensive polyfills for SSR
if (typeof global !== 'undefined') {
  // Self polyfill
  if (!global.self) {
    global.self = global;
  }
  
  // Window polyfill
  if (!global.window) {
    global.window = global;
  }
  
  // Document polyfill (basic)
  if (!global.document) {
    global.document = {
      createElement: () => ({}),
      createDocumentFragment: () => ({}),
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  }
  
  // Location polyfill
  if (!global.location) {
    global.location = {
      origin: 'http://localhost:3000',
      href: 'http://localhost:3000',
      pathname: '/',
      search: '',
      hash: ''
    };
  }
  
  // Navigator polyfill
  if (!global.navigator) {
    global.navigator = {
      userAgent: 'Node.js'
    };
  }
}