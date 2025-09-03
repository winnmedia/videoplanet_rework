module.exports = {
  ci: {
    collect: {
      // URLs to test (production and staging)
      url: process.env.NODE_ENV === 'production' || process.env.CI 
        ? [
            'https://vlanet.net/',
            'https://vlanet.net/projects',
            'https://vlanet.net/calendar',
            'https://vlanet.net/feedback'
          ]
        : [
            'http://localhost:3000/',
            'http://localhost:3000/projects',
            'http://localhost:3000/calendar',
            'http://localhost:3000/feedback'
          ],
      // Lighthouse settings
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage --headless --remote-debugging-port=0',
        // Test on mobile and desktop (CI에서는 desktop만)
        preset: process.env.CI ? 'desktop' : 'desktop',
        // Custom Lighthouse config
        configPath: './lighthouse-config.js'
      },
      numberOfRuns: process.env.CI ? 3 : 1, // CI에서는 3회, 로컬에서는 1회
      startServerCommand: process.env.CI ? 'pnpm run build && pnpm start' : null,
      startServerReadyPattern: 'ready on',
      startServerTimeout: 60000 // CI 환경에서는 더 긴 대기 시간
    },
    assert: {
      // Performance budget assertions based on performance-budget.config.js
      assertions: {
        // Core Web Vitals
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }], // WCAG 2.1 AA
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        
        // Core Web Vitals - specific metrics
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // 2.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],   // 0.1
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],   // 1.5s
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],        // 300ms
        'speed-index': ['warn', { maxNumericValue: 3000 }],              // 3s
        
        // Resource budgets
        'total-byte-weight': ['warn', { maxNumericValue: 2000000 }],     // 2MB
        'dom-size': ['warn', { maxNumericValue: 1500 }],                 // 1500 nodes
        'unused-css-rules': ['warn', { maxNumericValue: 0.1 }],          // 10% max unused CSS
        'unused-javascript': ['warn', { maxNumericValue: 0.2 }],         // 20% max unused JS
        
        // Image optimization
        'uses-optimized-images': 'error',
        'uses-webp-images': 'error', 
        'efficient-animated-content': 'error',
        'uses-responsive-images': 'warn',
        
        // Network optimization  
        'uses-text-compression': 'error',
        'uses-rel-preconnect': 'warn',
        'uses-rel-preload': 'warn',
        'preload-lcp-image': 'warn',
        
        // JavaScript optimization
        'render-blocking-resources': 'warn',
        'unminified-javascript': 'error',
        'unminified-css': 'error',
        
        // Accessibility requirements
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'button-name': 'error',
        'aria-valid-attr': 'error',
        'aria-allowed-attr': 'error',
        'heading-order': 'warn',
        'landmark-one-main': 'warn',
        
        // SEO requirements
        'meta-description': 'error',
        'document-title': 'error',
        'hreflang': 'warn',
        'canonical': 'warn'
      }
    },
    upload: {
      target: 'temporary-public-storage',
      // For GitHub Actions or CI/CD
      githubAppToken: process.env.LHCI_GITHUB_APP_TOKEN,
      githubToken: process.env.GITHUB_TOKEN
    },
    server: {
      // Optional: Use LHCI server for storing results
      // target: 'lhci',
      // serverBaseUrl: process.env.LHCI_SERVER_URL,
      // token: process.env.LHCI_SERVER_TOKEN
    },
    wizard: {
      // For first-time setup
      // Run: npx lhci wizard
    }
  }
}