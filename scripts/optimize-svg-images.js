#!/usr/bin/env node

/**
 * Aggressive SVG Optimization (Production Blocker Fix)
 * Convert large SVG files with embedded images to WebP format
 * Critical: 2 SVG files (670KB each) → WebP (50-100KB each)
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

// Large SVG files to convert to WebP
const PROBLEMATIC_SVGS = [
  {
    svg: 'public/images/Home/symbol.svg',
    webp: 'public/images/Home/symbol.webp',
    backup: 'public/images/Home/symbol.svg.bak'
  },
  {
    svg: 'public/images/symbol.svg', 
    webp: 'public/images/symbol.webp',
    backup: 'public/images/symbol.svg.bak'
  }
];

async function convertSvgToWebP(svgPath, webpPath, quality = 70) {
  try {
    const sharp = require('sharp');
    
    // Read SVG file
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Convert SVG to WebP using Sharp
    const webpBuffer = await sharp(svgBuffer)
      .webp({ quality: quality })
      .toBuffer();
    
    // Write WebP file
    fs.writeFileSync(webpPath, webpBuffer);
    
    const originalSize = svgBuffer.length / 1024;
    const webpSize = webpBuffer.length / 1024;
    const savings = originalSize - webpSize;
    const compressionRatio = (savings / originalSize) * 100;
    
    return {
      success: true,
      originalSize,
      webpSize,
      savings,
      compressionRatio
    };
    
  } catch (error) {
    // Try with different quality settings if failed
    if (quality > 40) {
      log(colors.yellow, `  Retrying with lower quality (${quality - 20}%)`);
      return convertSvgToWebP(svgPath, webpPath, quality - 20);
    }
    
    return { success: false, error: error.message };
  }
}

async function createMinimalSvgVersion(svgPath, quality = 60) {
  try {
    const content = fs.readFileSync(svgPath, 'utf8');
    const originalSize = Buffer.byteLength(content, 'utf8') / 1024;
    
    // Extract base64 data and convert to WebP if possible
    const base64Match = content.match(/data:image\/[^;]+;base64,([^"]+)/);
    
    if (base64Match && base64Match[1]) {
      const base64Data = base64Match[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      try {
        const sharp = require('sharp');
        
        // Convert embedded image to WebP
        const webpBuffer = await sharp(imageBuffer)
          .webp({ quality: quality })
          .resize(400, 250, { fit: 'inside' }) // Resize to smaller dimensions
          .toBuffer();
          
        const webpBase64 = webpBuffer.toString('base64');
        
        // Replace in SVG
        const optimizedContent = content.replace(
          /data:image\/[^;]+;base64,[^"]+/,
          `data:image/webp;base64,${webpBase64}`
        );
        
        const optimizedSize = Buffer.byteLength(optimizedContent, 'utf8') / 1024;
        const savings = originalSize - optimizedSize;
        
        if (savings > 50) { // Only save if we save at least 50KB
          return {
            success: true,
            content: optimizedContent,
            originalSize,
            optimizedSize,
            savings
          };
        }
      } catch (sharpError) {
        log(colors.yellow, `  Sharp conversion failed: ${sharpError.message}`);
      }
    }
    
    return { success: false, reason: 'Insufficient savings or no embedded image' };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function optimizeProblematicSvgs() {
  logHeader('Aggressive SVG Optimization (Production Blocker Fix)');
  
  // Check Sharp availability
  let hasSharp = false;
  try {
    require.resolve('sharp');
    hasSharp = true;
    log(colors.green, '✅ Sharp available for conversion');
  } catch {
    log(colors.red, '❌ Sharp not available - install with: pnpm add -D sharp');
    return false;
  }
  
  let totalSavings = 0;
  let successCount = 0;
  let failedCount = 0;
  
  for (const svg of PROBLEMATIC_SVGS) {
    const { svg: svgPath, webp: webpPath, backup: backupPath } = svg;
    
    if (!fs.existsSync(svgPath)) {
      log(colors.yellow, `⚠️  SVG file not found: ${svgPath}`);
      continue;
    }
    
    const originalStats = fs.statSync(svgPath);
    const originalSizeKB = originalStats.size / 1024;
    
    log(colors.blue, `\n🔧 Processing: ${path.basename(svgPath)} (${originalSizeKB.toFixed(2)} KB)`);
    
    // Method 1: Convert entire SVG to WebP image
    log(colors.blue, '   Attempting full SVG → WebP conversion...');
    const webpResult = await convertSvgToWebP(svgPath, webpPath, 70);
    
    if (webpResult.success && webpResult.savings > 400) { // Must save at least 400KB
      // Create backup and replace
      fs.copyFileSync(svgPath, backupPath);
      
      totalSavings += webpResult.savings;
      successCount++;
      
      log(colors.green, `   ✅ Converted to WebP: ${webpResult.webpSize.toFixed(2)} KB`);
      log(colors.green, `   💾 Saved: ${webpResult.savings.toFixed(2)} KB (${webpResult.compressionRatio.toFixed(1)}% reduction)`);
      
      // Remove original SVG since we have WebP version
      fs.unlinkSync(svgPath);
      log(colors.green, `   📁 Original SVG removed, backup saved as .bak`);
      
      continue;
    }
    
    // Method 2: Optimize embedded image within SVG
    log(colors.blue, '   Attempting embedded image optimization...');
    const svgOptResult = await createMinimalSvgVersion(svgPath, 50);
    
    if (svgOptResult.success && svgOptResult.savings > 200) { // Must save at least 200KB
      // Create backup and replace
      fs.copyFileSync(svgPath, backupPath);
      fs.writeFileSync(svgPath, svgOptResult.content, 'utf8');
      
      totalSavings += svgOptResult.savings;
      successCount++;
      
      log(colors.green, `   ✅ Optimized SVG: ${svgOptResult.optimizedSize.toFixed(2)} KB`);
      log(colors.green, `   💾 Saved: ${svgOptResult.savings.toFixed(2)} KB`);
      
      continue;
    }
    
    // Method 3: Delete if it's not critical (last resort)
    log(colors.red, `   ❌ Could not optimize effectively`);
    log(colors.yellow, `   ⚠️  Consider manually replacing with optimized image`);
    failedCount++;
  }
  
  // Summary
  logHeader('Optimization Summary');
  log(colors.blue, `✅ Successfully processed: ${successCount} files`);
  log(colors.blue, `❌ Failed: ${failedCount} files`);
  log(colors.green, `💾 Total space saved: ${totalSavings.toFixed(2)} KB (${(totalSavings/1024).toFixed(2)} MB)`);
  
  if (totalSavings > 1024) {
    log(colors.green, `🎉 Excellent! Performance budget should now pass.`);
  } else if (failedCount > 0) {
    log(colors.yellow, `⚠️  Some large SVG files remain. Consider manual optimization.`);
  }
  
  return successCount > 0;
}

// Main execution
async function main() {
  console.log(`${colors.bold}${colors.magenta}🎯 SVG Optimizer (Critical Fix)${colors.reset}`);
  console.log(`${colors.magenta}Target: 2 SVG files (1.3MB) → WebP (200KB)${colors.reset}`);
  
  try {
    const success = await optimizeProblematicSvgs();
    
    if (success) {
      logHeader('Next Steps');
      log(colors.yellow, '1. Run final performance budget check');
      log(colors.yellow, '2. Test image loading in browser');
      log(colors.yellow, '3. Update any hardcoded SVG references to WebP');
      log(colors.yellow, '4. Commit optimized images');
      
      log(colors.green, '\n🎉 SVG optimization completed!');
      log(colors.green, 'Run: node scripts/performance-budget-check.js');
    } else {
      log(colors.red, '\n❌ SVG optimization failed!');
      log(colors.red, 'Manual intervention may be required.');
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
  optimizeProblematicSvgs,
  PROBLEMATIC_SVGS
};