/**
 * Global polyfills for Node.js environment
 * Fixes SSR issues with browser-only globals
 */

// Polyfill 'self' for Node.js environment
if (typeof global !== 'undefined' && typeof self === 'undefined') {
  global.self = global;
}