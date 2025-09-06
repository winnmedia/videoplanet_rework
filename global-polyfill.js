/**
 * Global Polyfill for Node.js SSR
 * This file must be loaded before any other modules to ensure
 * browser globals are available in the Node.js environment
 */

// Implementing approach #2: Object.defineProperty for better control
// This ensures the globals are properly defined and non-enumerable
if (typeof global !== 'undefined') {
  // Primary fix: Define 'self' as a non-configurable property
  if (typeof global.self === 'undefined') {
    Object.defineProperty(global, 'self', {
      value: global,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
  
  // Ensure globalThis is properly defined
  if (typeof global.globalThis === 'undefined') {
    Object.defineProperty(global, 'globalThis', {
      value: global,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
  
  // Additional globals that might be needed
  global.window = global.window || {};
  
  // Enhanced document polyfill with DOM methods
  global.document = global.document || {
    // Essential DOM methods
    querySelector: function(selector) { return null; },
    querySelectorAll: function(selector) { return []; },
    getElementById: function(id) { return null; },
    getElementsByClassName: function(className) { return []; },
    getElementsByTagName: function(tagName) { return []; },
    
    // Document structure
    head: { appendChild: function() {} },
    body: { appendChild: function() {} },
    documentElement: {},
    
    // Event handling
    addEventListener: function() {},
    removeEventListener: function() {},
    
    // Element creation
    createElement: function(tagName) {
      return {
        tagName: tagName.toUpperCase(),
        appendChild: function() {},
        removeChild: function() {},
        setAttribute: function() {},
        getAttribute: function() { return null; },
        style: {},
        classList: {
          add: function() {},
          remove: function() {},
          contains: function() { return false; }
        }
      };
    }
  };
  global.navigator = global.navigator || {};
  global.location = global.location || {};
  
  // Storage APIs
  global.localStorage = global.localStorage || {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null
  };
  
  global.sessionStorage = global.sessionStorage || global.localStorage;
  
  // Network APIs
  global.XMLHttpRequest = global.XMLHttpRequest || class XMLHttpRequest {};
  global.fetch = global.fetch || (() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
  }));
  
  // Console for debugging
  if (!global.console) {
    global.console = require('console');
  }
}