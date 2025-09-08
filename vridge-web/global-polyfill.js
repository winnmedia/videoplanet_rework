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
      configurable: false,
    })
  }

  // Ensure globalThis is properly defined
  if (typeof global.globalThis === 'undefined') {
    Object.defineProperty(global, 'globalThis', {
      value: global,
      writable: false,
      enumerable: false,
      configurable: false,
    })
  }

  // Complete window.location polyfill for Next.js SSR compatibility
  // This fixes the "Cannot destructure property 'protocol' of 'window.location'" error
  global.window = global.window || {}
  global.window.location = global.window.location || {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    protocol: 'http:',
    hostname: 'localhost',
    host: 'localhost:3000',
    port: '3000',
    pathname: '/',
    search: '',
    hash: '',
    assign: function () {},
    reload: function () {},
    replace: function () {},
    toString: function () {
      return this.href
    },
  }

  // Enhanced document polyfill with DOM methods
  global.document = global.document || {
    // Essential DOM methods
    querySelector: function (selector) {
      return null
    },
    querySelectorAll: function (selector) {
      return []
    },
    getElementById: function (id) {
      return null
    },
    getElementsByClassName: function (className) {
      return []
    },
    getElementsByTagName: function (tagName) {
      return []
    },

    // Document structure
    head: { appendChild: function () {} },
    body: { appendChild: function () {} },
    documentElement: {},

    // Event handling
    addEventListener: function () {},
    removeEventListener: function () {},

    // Element creation
    createElement: function (tagName) {
      return {
        tagName: tagName.toUpperCase(),
        appendChild: function () {},
        removeChild: function () {},
        setAttribute: function () {},
        getAttribute: function () {
          return null
        },
        style: {},
        classList: {
          add: function () {},
          remove: function () {},
          contains: function () {
            return false
          },
        },
      }
    },
  }
  global.navigator = global.navigator || {}

  // Add location to global scope (same as window.location)
  global.location = global.location || global.window.location

  // Storage APIs
  global.localStorage = global.localStorage || {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  }

  global.sessionStorage = global.sessionStorage || global.localStorage

  // Network APIs
  global.XMLHttpRequest = global.XMLHttpRequest || class XMLHttpRequest {}
  global.fetch =
    global.fetch ||
    (() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        blob: () => Promise.resolve(new Blob()),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      }))

  // Console for debugging
  if (!global.console) {
    global.console = require('console')
  }
}
