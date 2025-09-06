/**
 * Server-side polyfills for browser globals
 * Must be loaded before any modules that use browser APIs
 */

// Emergency deployment - enhanced polyfills for SSR
if (typeof global !== 'undefined') {
  // Force self polyfill at the very beginning
  global.self = global;
  
  // Force window polyfill
  global.window = global;
  
  // Force globalThis polyfill
  global.globalThis = global;
  
  // Document polyfill (basic)
  if (!global.document) {
    global.document = {
      createElement: () => ({}),
      createDocumentFragment: () => ({}),
      addEventListener: () => {},
      removeEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => []
    };
  }
  
  // Location polyfill
  if (!global.location) {
    global.location = {
      origin: 'https://videoplanet.vercel.app',
      href: 'https://videoplanet.vercel.app',
      pathname: '/',
      search: '',
      hash: ''
    };
  }
  
  // Navigator polyfill
  if (!global.navigator) {
    global.navigator = {
      userAgent: 'Node.js SSR'
    };
  }
  
  // Console polyfill (ensure it exists)
  if (!global.console) {
    global.console = {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {}
    };
  }
}

// Additional emergency polyfill at module level
if (typeof self === 'undefined') {
  global.self = global;
}