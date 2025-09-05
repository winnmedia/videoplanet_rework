/**
 * Lighthouse CI Configuration for Performance Budget Enforcement
 * 성능 예산 강제 설정 - Core Web Vitals 중심
 */

module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      startServerCommand: 'pnpm run start',
      startServerReadyPattern: 'ready',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox --headless'
      }
    },
    assert: {
      // Core Web Vitals Budget (Performance Lead 요구사항)
      // 2024 Core Web Vitals: LCP, INP, CLS
      assertions: {
        // LCP: 2.5초 이내 (Critical)
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        
        // INP: 200ms 이내 (Critical - 2024년 새로운 Core Web Vital)
        'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],
        
        // CLS: 0.1 이하 (Critical)
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        
        // FCP: 1.8초 이내 (Supporting metric)
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        
        // TTI: 3.8초 이내 (Supporting metric)
        'interactive': ['error', { maxNumericValue: 3800 }],
        
        // Speed Index: 3초 이내 (Supporting metric)
        'speed-index': ['error', { maxNumericValue: 3000 }],
        
        // 접근성 점수 90점 이상
        'categories:accessibility': ['error', { minScore: 0.9 }],
        
        // 성능 점수 85점 이상
        'categories:performance': ['error', { minScore: 0.85 }],
        
        // Bundle Size Budgets
        'total-byte-weight': ['warn', { maxNumericValue: 1000000 }], // 1MB
        'unused-javascript': ['warn', { maxNumericValue: 200000 }],  // 200KB
        'unminified-javascript': 'error',
        
        // Network Performance
        'server-response-time': ['error', { maxNumericValue: 600 }],
        'render-blocking-resources': 'warn',
        
        // Image Optimization
        'uses-optimized-images': 'warn',
        'uses-webp-images': 'warn',
        'properly-sized-images': 'warn',
        
        // Critical Resource Hints
        'uses-rel-preload': 'warn',
        'uses-rel-preconnect': 'warn',
        
        // Security
        'is-on-https': 'off', // Development only
        'redirects-http': 'off' // Development only
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}