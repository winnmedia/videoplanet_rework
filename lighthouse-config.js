module.exports = {
  extends: 'lighthouse:default',
  settings: {
    // Performance budget based on our config
    budgets: [{
      resourceSizes: [
        { resourceType: 'script', budget: 500 }, // 500KB for JS (main + vendor)
        { resourceType: 'stylesheet', budget: 50 }, // 50KB for CSS
        { resourceType: 'image', budget: 500 }, // 500KB for images
        { resourceType: 'media', budget: 1000 }, // 1MB for media
        { resourceType: 'font', budget: 100 }, // 100KB for fonts
        { resourceType: 'document', budget: 50 }, // 50KB for HTML
        { resourceType: 'other', budget: 100 }, // 100KB for other resources
        { resourceType: 'total', budget: 2000 } // 2MB total
      ],
      timings: [
        { metric: 'first-contentful-paint', budget: 1500 }, // 1.5s
        { metric: 'largest-contentful-paint', budget: 2500 }, // 2.5s
        { metric: 'cumulative-layout-shift', budget: 0.1 }, // 0.1
        { metric: 'total-blocking-time', budget: 300 }, // 300ms
        { metric: 'speed-index', budget: 3000 } // 3s
      ]
    }],
    
    // Throttling settings for consistent results
    throttlingMethod: 'simulate',
    throttling: {
      rttMs: 40,
      throughputKbps: 1638.4, // Fast 3G
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 1638.4,
      uploadThroughputKbps: 675
    },
    
    // Screen emulation
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false
    },
    
    // Form factor
    formFactor: 'desktop',
    
    // Skip certain audits that may not be relevant
    skipAudits: [
      'uses-http2', // May not be controllable in all environments
      'redirects-http' // May not be relevant for local testing
    ],
    
    // Only run audits we care about for performance
    onlyAudits: [
      // Performance
      'first-contentful-paint',
      'largest-contentful-paint', 
      'cumulative-layout-shift',
      'total-blocking-time',
      'speed-index',
      'interactive',
      
      // Resource optimization
      'total-byte-weight',
      'dom-size',
      'unused-css-rules',
      'unused-javascript',
      'uses-optimized-images',
      'uses-webp-images',
      'uses-text-compression',
      'render-blocking-resources',
      'unminified-javascript',
      'unminified-css',
      
      // Network
      'uses-rel-preconnect',
      'uses-rel-preload',
      'preload-lcp-image',
      
      // Accessibility 
      'color-contrast',
      'image-alt',
      'label',
      'link-name', 
      'button-name',
      'aria-valid-attr',
      'aria-allowed-attr',
      
      // SEO
      'meta-description',
      'document-title'
    ]
  }
}