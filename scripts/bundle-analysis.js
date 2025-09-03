#!/usr/bin/env node

/**
 * Bundle Analysis Script for VideoPlanet
 * Analyzes Next.js build output and checks against performance budgets
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import performance budget config
const performanceBudget = require('../performance-budget.config.js');

class BundleAnalyzer {
  constructor() {
    this.buildDir = path.join(process.cwd(), '.next');
    this.analysisResults = {
      javascript: {},
      css: {},
      images: {},
      fonts: [],
      violations: [],
      recommendations: []
    };
  }

  /**
   * Main analysis function
   */
  async analyze() {
    console.log('🔍 Starting bundle analysis...\n');

    // Check if build exists
    if (!fs.existsSync(this.buildDir)) {
      console.error('❌ No build found. Run "npm run build" first.');
      process.exit(1);
    }

    try {
      // Analyze different asset types
      await this.analyzeJavaScript();
      await this.analyzeCSS();
      await this.analyzeImages();
      await this.analyzeFonts();
      
      // Check against budgets
      this.checkBudgets();
      
      // Generate report
      this.generateReport();
      
      // Exit with error if violations found
      if (this.analysisResults.violations.length > 0) {
        console.error(`\n❌ ${this.analysisResults.violations.length} budget violations found!`);
        process.exit(1);
      } else {
        console.log('\n✅ All performance budgets passed!');
      }

    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Analyze JavaScript bundles
   */
  analyzeJavaScript() {
    console.log('📦 Analyzing JavaScript bundles...');
    
    const staticDir = path.join(this.buildDir, 'static');
    if (!fs.existsSync(staticDir)) return;

    // Find JS files
    const jsFiles = this.findFiles(staticDir, '.js');
    
    let mainBundleSize = 0;
    let vendorBundleSize = 0;
    const chunks = [];

    jsFiles.forEach(file => {
      const size = fs.statSync(file).size;
      const filename = path.basename(file);
      
      if (filename.includes('main') || filename.includes('pages')) {
        mainBundleSize += size;
      } else if (filename.includes('vendor') || filename.includes('framework')) {
        vendorBundleSize += size;
      } else if (!filename.includes('webpack-runtime') && !filename.includes('polyfills')) {
        chunks.push({ file: filename, size });
      }
    });

    this.analysisResults.javascript = {
      main: mainBundleSize,
      vendor: vendorBundleSize,
      chunks,
      total: jsFiles.reduce((total, file) => total + fs.statSync(file).size, 0)
    };

    console.log(`  Main bundle: ${this.formatSize(mainBundleSize)}`);
    console.log(`  Vendor bundle: ${this.formatSize(vendorBundleSize)}`);
    console.log(`  Chunks: ${chunks.length} files`);
    console.log(`  Total JS: ${this.formatSize(this.analysisResults.javascript.total)}`);
  }

  /**
   * Analyze CSS bundles
   */
  analyzeCSS() {
    console.log('\n🎨 Analyzing CSS bundles...');
    
    const staticDir = path.join(this.buildDir, 'static');
    if (!fs.existsSync(staticDir)) return;

    const cssFiles = this.findFiles(staticDir, '.css');
    
    let mainCSSSize = 0;
    
    cssFiles.forEach(file => {
      const size = fs.statSync(file).size;
      mainCSSSize += size;
    });

    this.analysisResults.css = {
      main: mainCSSSize,
      total: mainCSSSize
    };

    console.log(`  Total CSS: ${this.formatSize(mainCSSSize)}`);
  }

  /**
   * Analyze image assets
   */
  analyzeImages() {
    console.log('\n🖼️  Analyzing images...');
    
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) return;

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'];
    const imageFiles = [];
    
    imageExtensions.forEach(ext => {
      const files = this.findFiles(publicDir, ext);
      imageFiles.push(...files);
    });

    let totalSize = 0;
    const largeImages = [];
    
    imageFiles.forEach(file => {
      const size = fs.statSync(file).size;
      totalSize += size;
      
      // Flag large images (>200KB)
      if (size > 200000) {
        largeImages.push({ 
          file: path.relative(publicDir, file), 
          size 
        });
      }
    });

    this.analysisResults.images = {
      total: totalSize,
      count: imageFiles.length,
      largeImages
    };

    console.log(`  Total images: ${imageFiles.length} files (${this.formatSize(totalSize)})`);
    if (largeImages.length > 0) {
      console.log(`  ⚠️  Large images: ${largeImages.length} files >200KB`);
    }
  }

  /**
   * Analyze font assets
   */
  analyzeFonts() {
    console.log('\n🔤 Analyzing fonts...');
    
    const publicDir = path.join(process.cwd(), 'public');
    const fontExtensions = ['.woff', '.woff2', '.ttf', '.otf', '.eot'];
    const fontFiles = [];
    
    fontExtensions.forEach(ext => {
      const files = this.findFiles(publicDir, ext);
      fontFiles.push(...files);
    });

    let totalSize = 0;
    
    fontFiles.forEach(file => {
      const size = fs.statSync(file).size;
      totalSize += size;
      this.analysisResults.fonts.push({
        file: path.relative(publicDir, file),
        size
      });
    });

    console.log(`  Total fonts: ${fontFiles.length} files (${this.formatSize(totalSize)})`);
  }

  /**
   * Check against performance budgets
   */
  checkBudgets() {
    console.log('\n⚖️  Checking performance budgets...');
    
    const budget = performanceBudget.resources;
    
    // Check JavaScript budgets
    if (this.analysisResults.javascript.main > budget.javascript.main.target) {
      this.analysisResults.violations.push({
        type: 'javascript',
        asset: 'main',
        current: this.analysisResults.javascript.main,
        target: budget.javascript.main.target,
        message: `Main JS bundle exceeds target: ${this.formatSize(this.analysisResults.javascript.main)} > ${this.formatSize(budget.javascript.main.target)}`
      });
    }

    if (this.analysisResults.javascript.vendor > budget.javascript.vendor.target) {
      this.analysisResults.violations.push({
        type: 'javascript',
        asset: 'vendor',
        current: this.analysisResults.javascript.vendor,
        target: budget.javascript.vendor.target,
        message: `Vendor JS bundle exceeds target: ${this.formatSize(this.analysisResults.javascript.vendor)} > ${this.formatSize(budget.javascript.vendor.target)}`
      });
    }

    // Check CSS budgets
    if (this.analysisResults.css.main > budget.css.main.target) {
      this.analysisResults.violations.push({
        type: 'css',
        asset: 'main',
        current: this.analysisResults.css.main,
        target: budget.css.main.target,
        message: `Main CSS bundle exceeds target: ${this.formatSize(this.analysisResults.css.main)} > ${this.formatSize(budget.css.main.target)}`
      });
    }

    // Check total page weight
    const totalSize = this.analysisResults.javascript.total + this.analysisResults.css.total + this.analysisResults.images.total;
    if (totalSize > budget.total.target) {
      this.analysisResults.violations.push({
        type: 'total',
        asset: 'page',
        current: totalSize,
        target: budget.total.target,
        message: `Total page weight exceeds target: ${this.formatSize(totalSize)} > ${this.formatSize(budget.total.target)}`
      });
    }

    // Generate recommendations for large images
    this.analysisResults.images.largeImages.forEach(image => {
      this.analysisResults.recommendations.push({
        type: 'image',
        message: `Consider optimizing ${image.file} (${this.formatSize(image.size)}): use WebP format, compress, or implement lazy loading`
      });
    });
  }

  /**
   * Generate analysis report
   */
  generateReport() {
    console.log('\n📊 Bundle Analysis Report');
    console.log('========================\n');

    // Summary
    console.log('📈 Size Summary:');
    console.log(`  JavaScript: ${this.formatSize(this.analysisResults.javascript.total)}`);
    console.log(`  CSS: ${this.formatSize(this.analysisResults.css.total)}`);
    console.log(`  Images: ${this.formatSize(this.analysisResults.images.total)}`);
    
    const totalSize = this.analysisResults.javascript.total + this.analysisResults.css.total;
    console.log(`  Total (JS+CSS): ${this.formatSize(totalSize)}\n`);

    // Violations
    if (this.analysisResults.violations.length > 0) {
      console.log('❌ Budget Violations:');
      this.analysisResults.violations.forEach(violation => {
        console.log(`  • ${violation.message}`);
      });
      console.log('');
    }

    // Recommendations
    if (this.analysisResults.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      this.analysisResults.recommendations.slice(0, 5).forEach(rec => {
        console.log(`  • ${rec.message}`);
      });
      if (this.analysisResults.recommendations.length > 5) {
        console.log(`  ... and ${this.analysisResults.recommendations.length - 5} more`);
      }
      console.log('');
    }

    // Save detailed report to file
    const reportPath = path.join(process.cwd(), 'bundle-analysis-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.analysisResults, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }

  /**
   * Find files with specific extension recursively
   */
  findFiles(dir, extension) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const entries = fs.readdirSync(dir);
    
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.findFiles(fullPath, extension));
      } else if (fullPath.endsWith(extension)) {
        files.push(fullPath);
      }
    });
    
    return files;
  }

  /**
   * Format file size for display
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new BundleAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = BundleAnalyzer;