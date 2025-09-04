#!/usr/bin/env node

/**
 * Performance Budget Enforcement Script
 * Performance Lead 요구사항: 성능 예산 위반 시 빌드 실패
 */

const fs = require('fs');
const path = require('path');

// Performance Budget (Performance Lead 기준)
const PERFORMANCE_BUDGET = {
  // Bundle Sizes (kB)
  maxBundleSize: 1000, // 1MB total
  maxChunkSize: 250,   // 250kB per chunk
  maxCssSize: 100,     // 100kB CSS
  
  // Network Performance
  maxNetworkRequests: 50,
  maxImageSize: 500,   // 500kB per image
  
  // Core Web Vitals Targets
  LCP_TARGET: 2500,    // ms
  INP_TARGET: 200,     // ms  
  CLS_TARGET: 0.1,     // score
  
  // Supporting Metrics
  FCP_TARGET: 1800,    // ms
  TTFB_TARGET: 800,    // ms
};

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m', 
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.bold}${colors.blue}=== ${message} ===${colors.reset}`);
}

async function checkBundleSize() {
  logHeader('Bundle Size Analysis');
  
  const nextDir = path.join(process.cwd(), '.next');
  
  if (!fs.existsSync(nextDir)) {
    log(colors.red, '❌ .next directory not found. Run build first.');
    return false;
  }

  const staticDir = path.join(nextDir, 'static');
  if (!fs.existsSync(staticDir)) {
    log(colors.yellow, '⚠️  Static directory not found. Skipping bundle analysis.');
    return true;
  }

  let totalSize = 0;
  let violations = [];
  let largestChunks = [];

  function analyzeDirectory(dir, prefix = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        analyzeDirectory(fullPath, `${prefix}${file}/`);
      } else if (file.endsWith('.js') || file.endsWith('.css')) {
        const sizeKB = stat.size / 1024;
        totalSize += sizeKB;
        
        largestChunks.push({
          file: `${prefix}${file}`,
          size: sizeKB
        });
        
        // Check individual chunk size
        if (sizeKB > PERFORMANCE_BUDGET.maxChunkSize) {
          violations.push({
            type: 'chunk_size',
            file: `${prefix}${file}`,
            actual: sizeKB,
            limit: PERFORMANCE_BUDGET.maxChunkSize
          });
        }
      }
    });
  }

  analyzeDirectory(staticDir);

  // Sort chunks by size
  largestChunks.sort((a, b) => b.size - a.size);

  // Display results
  log(colors.blue, `📦 Total Bundle Size: ${totalSize.toFixed(2)} kB`);
  log(colors.blue, `🎯 Budget Limit: ${PERFORMANCE_BUDGET.maxBundleSize} kB`);

  // Check total bundle size
  if (totalSize > PERFORMANCE_BUDGET.maxBundleSize) {
    violations.push({
      type: 'total_size',
      actual: totalSize,
      limit: PERFORMANCE_BUDGET.maxBundleSize
    });
  }

  // Show largest chunks
  console.log('\n📊 Largest Chunks:');
  largestChunks.slice(0, 10).forEach((chunk, i) => {
    const color = chunk.size > PERFORMANCE_BUDGET.maxChunkSize ? colors.red : colors.green;
    log(color, `  ${i + 1}. ${chunk.file}: ${chunk.size.toFixed(2)} kB`);
  });

  // Report violations
  if (violations.length > 0) {
    console.log(`\n${colors.red}${colors.bold}❌ Performance Budget Violations:${colors.reset}`);
    violations.forEach(violation => {
      if (violation.type === 'total_size') {
        log(colors.red, `  • Total bundle size: ${violation.actual.toFixed(2)} kB > ${violation.limit} kB`);
      } else if (violation.type === 'chunk_size') {
        log(colors.red, `  • ${violation.file}: ${violation.actual.toFixed(2)} kB > ${violation.limit} kB`);
      }
    });
    
    console.log(`\n${colors.yellow}💡 Optimization Recommendations:`);
    log(colors.yellow, '  • Enable tree shaking');
    log(colors.yellow, '  • Implement code splitting');
    log(colors.yellow, '  • Remove unused dependencies');
    log(colors.yellow, '  • Optimize large libraries');
    
    return false;
  }

  log(colors.green, '✅ Bundle size within budget');
  return true;
}

async function checkImageOptimization() {
  logHeader('Image Optimization Check');
  
  const publicDir = path.join(process.cwd(), 'public');
  
  if (!fs.existsSync(publicDir)) {
    log(colors.yellow, '⚠️  Public directory not found. Skipping image analysis.');
    return true;
  }

  let violations = [];
  let totalImageSize = 0;
  let imageCount = 0;

  function analyzeImages(dir, prefix = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        analyzeImages(fullPath, `${prefix}${file}/`);
      } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
        const sizeKB = stat.size / 1024;
        totalImageSize += sizeKB;
        imageCount++;
        
        if (sizeKB > PERFORMANCE_BUDGET.maxImageSize) {
          violations.push({
            file: `${prefix}${file}`,
            size: sizeKB,
            limit: PERFORMANCE_BUDGET.maxImageSize
          });
        }
      }
    });
  }

  analyzeImages(publicDir);

  log(colors.blue, `🖼️  Total Images: ${imageCount}`);
  log(colors.blue, `📏 Total Image Size: ${totalImageSize.toFixed(2)} kB`);

  if (violations.length > 0) {
    log(colors.red, `❌ Large Images Found:`);
    violations.forEach(violation => {
      log(colors.red, `  • ${violation.file}: ${violation.size.toFixed(2)} kB > ${violation.limit} kB`);
    });
    
    console.log(`\n${colors.yellow}💡 Image Optimization Tips:`);
    log(colors.yellow, '  • Use Next.js Image component');
    log(colors.yellow, '  • Convert to WebP format');
    log(colors.yellow, '  • Implement proper sizing');
    log(colors.yellow, '  • Add lazy loading');
    
    return false;
  }

  log(colors.green, '✅ Images within size limits');
  return true;
}

async function generatePerformanceReport() {
  logHeader('Performance Budget Report');
  
  const report = {
    timestamp: new Date().toISOString(),
    budget: PERFORMANCE_BUDGET,
    results: {},
    recommendations: []
  };

  // Check bundle size
  const bundleOk = await checkBundleSize();
  report.results.bundleSize = bundleOk;

  // Check images
  const imagesOk = await checkImageOptimization();
  report.results.imageOptimization = imagesOk;

  // Generate recommendations
  if (!bundleOk) {
    report.recommendations.push({
      type: 'bundle',
      priority: 'high',
      action: 'Implement code splitting and remove unused code'
    });
  }

  if (!imagesOk) {
    report.recommendations.push({
      type: 'images', 
      priority: 'medium',
      action: 'Optimize images and implement proper formats'
    });
  }

  // Save report
  const reportPath = path.join(process.cwd(), 'performance-budget-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(colors.blue, `📄 Report saved to: ${reportPath}`);

  // Return overall status
  const allPassed = bundleOk && imagesOk;
  
  if (allPassed) {
    logHeader('✅ Performance Budget Check Passed');
    log(colors.green, 'All performance budgets are within limits!');
  } else {
    logHeader('❌ Performance Budget Check Failed');
    log(colors.red, 'Performance budget violations found. Fix before deploying to production.');
  }

  return allPassed;
}

// Main execution
async function main() {
  console.log(`${colors.bold}${colors.blue}🎯 Performance Budget Checker${colors.reset}`);
  console.log(`${colors.blue}Performance Lead Standards Enforcement${colors.reset}`);
  
  try {
    const passed = await generatePerformanceReport();
    process.exit(passed ? 0 : 1);
  } catch (error) {
    log(colors.red, `❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  checkBundleSize,
  checkImageOptimization,
  generatePerformanceReport,
  PERFORMANCE_BUDGET
};