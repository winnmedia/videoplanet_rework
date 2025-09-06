/**
 * Server-side polyfills for browser globals
 * Must be loaded before any modules that use browser APIs
 */

// Polyfill self for webpack chunk loading - minimal approach
if (typeof global !== 'undefined' && typeof global.self === 'undefined') {
  global.self = global;
}