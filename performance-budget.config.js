// Performance Budget Configuration for VideoPlanet
// Based on CLAUDE.md requirements: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1

module.exports = {
  // Core Web Vitals Budgets
  coreWebVitals: {
    // Largest Contentful Paint
    lcp: {
      target: 2500, // 2.5 seconds
      warning: 2000, // 2.0 seconds warning threshold
      error: 3000    // 3.0 seconds error threshold
    },
    
    // Interaction to Next Paint  
    inp: {
      target: 200,   // 200ms
      warning: 150,  // 150ms warning threshold
      error: 300     // 300ms error threshold
    },
    
    // Cumulative Layout Shift
    cls: {
      target: 0.1,   // 0.1
      warning: 0.05, // 0.05 warning threshold
      error: 0.25    // 0.25 error threshold
    },
    
    // First Contentful Paint
    fcp: {
      target: 1500,  // 1.5 seconds
      warning: 1000, // 1.0 second warning threshold
      error: 2000    // 2.0 seconds error threshold
    }
  },

  // Resource Budgets
  resources: {
    // JavaScript bundles
    javascript: {
      main: {
        target: 250000,    // 250KB main bundle
        warning: 200000,   // 200KB warning
        error: 300000      // 300KB error
      },
      vendor: {
        target: 500000,    // 500KB vendor bundle
        warning: 400000,   // 400KB warning
        error: 600000      // 600KB error
      },
      chunks: {
        target: 100000,    // 100KB per chunk
        warning: 80000,    // 80KB warning
        error: 150000      // 150KB error
      }
    },

    // CSS bundles
    css: {
      main: {
        target: 50000,     // 50KB main CSS
        warning: 40000,    // 40KB warning
        error: 75000       // 75KB error
      }
    },

    // Images
    images: {
      hero: {
        target: 200000,    // 200KB hero images
        warning: 150000,   // 150KB warning
        error: 300000      // 300KB error
      },
      thumbnails: {
        target: 50000,     // 50KB thumbnails
        warning: 30000,    // 30KB warning
        error: 75000       // 75KB error
      }
    },

    // Total page weight
    total: {
      target: 2000000,     // 2MB total
      warning: 1500000,    // 1.5MB warning
      error: 3000000       // 3MB error
    }
  },

  // Lighthouse Performance Score Budgets
  lighthouse: {
    performance: {
      target: 90,          // Target score: 90+
      warning: 80,         // Warning threshold: 80-89
      error: 70            // Error threshold: <70
    },
    accessibility: {
      target: 95,          // Target score: 95+ (WCAG 2.1 AA)
      warning: 90,         // Warning threshold: 90-94
      error: 85            // Error threshold: <85
    },
    bestPractices: {
      target: 95,          // Target score: 95+
      warning: 90,         // Warning threshold: 90-94
      error: 85            // Error threshold: <85
    },
    seo: {
      target: 95,          // Target score: 95+
      warning: 90,         // Warning threshold: 90-94
      error: 85            // Error threshold: <85
    }
  },

  // Network Conditions for Testing
  networkConditions: {
    // Desktop - Fast 3G
    desktop: {
      offline: false,
      downloadThroughput: 1600000,  // 1.6Mbps
      uploadThroughput: 750000,     // 750Kbps
      latency: 40                   // 40ms RTT
    },
    
    // Mobile - Slow 3G  
    mobile: {
      offline: false,
      downloadThroughput: 500000,   // 500Kbps
      uploadThroughput: 500000,     // 500Kbps
      latency: 400                  // 400ms RTT
    }
  },

  // Page-specific budgets
  pages: {
    '/': {
      lcp: 2000,           // Landing page: stricter LCP
      fcp: 1000,           // Landing page: stricter FCP
      javascript: 200000,   // Landing page: smaller JS bundle
      css: 40000           // Landing page: smaller CSS bundle
    },
    
    '/projects': {
      lcp: 2500,           // Project list: standard LCP
      javascript: 300000,   // Project management: larger JS allowed
      images: 500000       // Project thumbnails: more images
    },
    
    '/calendar': {
      lcp: 2500,           // Calendar: standard LCP  
      javascript: 250000,   // Calendar logic: medium JS
      cls: 0.05            // Calendar: stricter layout shift
    },
    
    '/feedback': {
      lcp: 3000,           // Video feedback: relaxed LCP (video loading)
      javascript: 400000,   // Video player: larger JS bundle allowed
      inp: 100             // Video interaction: stricter INP
    }
  },

  // Build size analysis
  bundleAnalysis: {
    // Webpack Bundle Analyzer thresholds
    chunks: {
      maxSize: 244000,     // 244KB max chunk size (gzipped)
      warnSize: 200000     // 200KB warning size
    },
    
    // Dependencies analysis
    dependencies: {
      duplicates: {
        allowed: ['react', 'react-dom'], // Allow these duplicates
        maxDuplicates: 5     // Max 5 duplicate packages
      },
      
      // Large dependencies monitoring
      largeDeps: {
        threshold: 100000,    // 100KB threshold for large deps
        maxLargeDeps: 10     // Max 10 large dependencies
      }
    }
  },

  // CI/CD Integration
  ci: {
    // Fail build on budget violations
    failOnError: true,
    
    // Generate performance reports
    generateReports: true,
    
    // Report formats
    reportFormats: ['json', 'html', 'csv'],
    
    // Regression detection
    regression: {
      enabled: true,
      threshold: 0.1,      // 10% performance regression threshold
      compareBranch: 'main' // Compare against main branch
    }
  }
}

// Export configuration for different tools
module.exports.lighthouserc = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/projects',
        'http://localhost:3000/calendar', 
        'http://localhost:3000/feedback'
      ],
      settings: {
        chromeFlags: '--no-sandbox'
      }
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        
        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1500 }],
        
        // Resource budgets
        'total-byte-weight': ['warn', { maxNumericValue: 2000000 }],
        'dom-size': ['warn', { maxNumericValue: 1500 }],
        'uses-optimized-images': 'error',
        'uses-webp-images': 'error',
        'efficient-animated-content': 'error',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn'
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
}