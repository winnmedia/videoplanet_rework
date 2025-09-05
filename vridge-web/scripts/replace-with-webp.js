#!/usr/bin/env node

/**
 * Replace Original Images with WebP Versions (Production Blocker Fix)
 * Performance Lead 요구사항: 원본 PNG 파일들을 WebP로 교체하여 총 크기 감축
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.bold}${colors.blue}=== ${message} ===${colors.reset}`);
}

// Files to replace with WebP versions
const REPLACEMENTS = [
  {
    original: 'public/images/User/bg.png',
    webp: 'public/images/User/bg.webp',
    backup: 'public/images/User/bg.png.bak'
  },
  {
    original: 'public/images/Home/img02.png', 
    webp: 'public/images/Home/img02.webp',
    backup: 'public/images/Home/img02.png.bak'
  },
  {
    original: 'public/images/Home/img07.png',
    webp: 'public/images/Home/img07.webp', 
    backup: 'public/images/Home/img07.png.bak'
  },
  {
    original: 'public/images/Home/img05.png',
    webp: 'public/images/Home/img05.webp',
    backup: 'public/images/Home/img05.png.bak'
  },
  {
    original: 'public/images/Home/img04.png',
    webp: 'public/images/Home/img04.webp',
    backup: 'public/images/Home/img04.png.bak'
  },
  {
    original: 'public/images/Home/img06.png',
    webp: 'public/images/Home/img06.webp',
    backup: 'public/images/Home/img06.png.bak'
  },
  {
    original: 'public/images/Home/img03.png',
    webp: 'public/images/Home/img03.webp',
    backup: 'public/images/Home/img03.png.bak'
  },
  {
    original: 'public/images/Cms/thumsample.png', 
    webp: 'public/images/Cms/thumsample.webp',
    backup: 'public/images/Cms/thumsample.png.bak'
  }
];

// SVG files to compress (they're very large)
const SVG_COMPRESSIONS = [
  'public/images/Home/symbol.svg',
  'public/images/symbol.svg'
];

function backupAndReplace(original, webp, backup) {
  try {
    // Check if WebP version exists and is smaller
    if (!fs.existsSync(webp)) {
      log(colors.yellow, `⚠️  WebP version not found: ${webp}`);
      return { success: false, reason: 'WebP not found' };
    }
    
    const originalStats = fs.statSync(original);
    const webpStats = fs.statSync(webp);
    
    const originalSizeKB = originalStats.size / 1024;
    const webpSizeKB = webpStats.size / 1024;
    const savings = originalSizeKB - webpSizeKB;
    
    if (webpSizeKB >= originalSizeKB) {
      log(colors.yellow, `⚠️  WebP not smaller: ${path.basename(original)}`);
      return { 
        success: false, 
        reason: 'WebP not smaller',
        originalSize: originalSizeKB,
        webpSize: webpSizeKB 
      };
    }
    
    // Create backup
    fs.copyFileSync(original, backup);
    log(colors.blue, `📁 Backed up: ${path.basename(original)} → ${path.basename(backup)}`);
    
    // Replace original with WebP
    fs.copyFileSync(webp, original.replace('.png', '.webp'));
    fs.unlinkSync(original); // Remove original PNG
    
    log(colors.green, `✅ Replaced: ${path.basename(original)}`);
    log(colors.green, `   ${originalSizeKB.toFixed(2)} KB → ${webpSizeKB.toFixed(2)} KB (saved ${savings.toFixed(2)} KB)`);
    
    return {
      success: true,
      originalSize: originalSizeKB,
      webpSize: webpSizeKB,
      savings: savings
    };
    
  } catch (error) {
    log(colors.red, `❌ Error replacing ${original}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function compressSVG(svgPath) {
  try {
    const content = fs.readFileSync(svgPath, 'utf8');
    const originalSize = Buffer.byteLength(content, 'utf8') / 1024;
    
    // Basic SVG optimization (remove unnecessary whitespace and comments)
    let optimized = content
      .replace(/<!--[\s\S]*?-->/g, '') // Remove comments
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
    
    // Remove unnecessary attributes and optimize paths if possible
    optimized = optimized
      .replace(/\s*=\s*"/g, '="') // Normalize attribute spacing
      .replace(/"\s+/g, '" '); // Normalize attribute ending
    
    const optimizedSize = Buffer.byteLength(optimized, 'utf8') / 1024;
    const savings = originalSize - optimizedSize;
    
    if (savings > 1) { // Only save if we save at least 1KB
      const backupPath = svgPath + '.bak';
      fs.copyFileSync(svgPath, backupPath);
      fs.writeFileSync(svgPath, optimized, 'utf8');
      
      log(colors.green, `✅ Optimized SVG: ${path.basename(svgPath)}`);
      log(colors.green, `   ${originalSize.toFixed(2)} KB → ${optimizedSize.toFixed(2)} KB (saved ${savings.toFixed(2)} KB)`);
      
      return { success: true, savings };
    } else {
      log(colors.yellow, `⚠️  SVG already optimized: ${path.basename(svgPath)}`);
      return { success: false, reason: 'Already optimized' };
    }
    
  } catch (error) {
    log(colors.red, `❌ Error optimizing SVG ${svgPath}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function replaceWithWebP() {
  logHeader('Replace Original Images with WebP Versions');
  
  let totalSavings = 0;
  let successCount = 0;
  let failedCount = 0;
  
  for (const replacement of REPLACEMENTS) {
    const { original, webp, backup } = replacement;
    
    if (!fs.existsSync(original)) {
      log(colors.yellow, `⚠️  Original file not found: ${original}`);
      continue;
    }
    
    log(colors.blue, `\n🔄 Processing: ${path.basename(original)}`);
    
    const result = backupAndReplace(original, webp, backup);
    
    if (result.success) {
      totalSavings += result.savings;
      successCount++;
    } else {
      failedCount++;
      log(colors.yellow, `   Reason: ${result.reason}`);
    }
  }
  
  // Compress SVG files
  logHeader('SVG Optimization');
  
  for (const svgPath of SVG_COMPRESSIONS) {
    if (!fs.existsSync(svgPath)) {
      log(colors.yellow, `⚠️  SVG file not found: ${svgPath}`);
      continue;
    }
    
    log(colors.blue, `\n🔧 Optimizing: ${path.basename(svgPath)}`);
    const result = await compressSVG(svgPath);
    
    if (result.success) {
      totalSavings += result.savings;
      successCount++;
    } else {
      failedCount++;
    }
  }
  
  // Summary
  logHeader('Replacement Summary');
  log(colors.blue, `✅ Successfully processed: ${successCount} files`);
  log(colors.blue, `❌ Failed: ${failedCount} files`);
  log(colors.green, `💾 Total space saved: ${totalSavings.toFixed(2)} KB (${(totalSavings/1024).toFixed(2)} MB)`);
  
  if (totalSavings > 1024) {
    log(colors.green, `🎉 Great! Performance budget should now pass.`);
  }
  
  return successCount > 0;
}

// Main execution
async function main() {
  console.log(`${colors.bold}${colors.magenta}🔄 Image Replacement Tool${colors.reset}`);
  console.log(`${colors.magenta}Production Blocker Fix - Final Step${colors.reset}`);
  
  try {
    const success = await replaceWithWebP();
    
    if (success) {
      logHeader('Next Steps');
      log(colors.yellow, '1. Run final performance budget check');
      log(colors.yellow, '2. Test image loading (check for broken images)'); 
      log(colors.yellow, '3. Update code references from .png to .webp if needed');
      log(colors.yellow, '4. Commit changes');
      
      log(colors.green, '\n🎉 Image replacement completed!');
      log(colors.green, 'Run: node scripts/performance-budget-check.js');
    } else {
      log(colors.red, '\n❌ Image replacement failed!');
      log(colors.red, 'Check WebP files exist and are smaller than originals.');
    }
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(colors.red, `❌ Unexpected error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  replaceWithWebP,
  REPLACEMENTS
};