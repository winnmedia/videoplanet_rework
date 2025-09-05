#!/usr/bin/env node

/**
 * Critical Image Compression Script (Production Blocker Fix)
 * 17.55MB → 5MB 목표로 성능 예산 위반 해결
 * Performance Lead 긴급 요구사항: 24시간 내 해결
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Critical images that must be compressed immediately
const CRITICAL_COMPRESSIONS = [
  // Highest priority (2MB+ images)
  {
    input: 'public/images/Cms/video_sample.webp',
    targetQuality: 65,
    targetSize: 450, // KB
    priority: 'CRITICAL'
  },
  {
    input: 'public/images/User/bg.png', 
    output: 'public/images/User/bg.webp',
    targetQuality: 70,
    targetSize: 400, // KB
    priority: 'CRITICAL'
  },
  {
    input: 'public/images/Home/new/visual-bg.webp',
    targetQuality: 70,
    targetSize: 450, // KB  
    priority: 'CRITICAL'
  },
  
  // High priority (500KB-1MB images)
  {
    input: 'public/images/Home/img02.png',
    output: 'public/images/Home/img02.webp', 
    targetQuality: 75,
    targetSize: 300, // KB
    priority: 'HIGH'
  },
  {
    input: 'public/images/Home/img07.png',
    output: 'public/images/Home/img07.webp',
    targetQuality: 75, 
    targetSize: 300, // KB
    priority: 'HIGH'
  },
  {
    input: 'public/images/Home/img05.png',
    output: 'public/images/Home/img05.webp',
    targetQuality: 75,
    targetSize: 300, // KB
    priority: 'HIGH'  
  },
  {
    input: 'public/images/Home/img04.png',
    output: 'public/images/Home/img04.webp',
    targetQuality: 75,
    targetSize: 300, // KB
    priority: 'HIGH'
  },
  {
    input: 'public/images/Home/img06.png', 
    output: 'public/images/Home/img06.webp',
    targetQuality: 75,
    targetSize: 300, // KB
    priority: 'HIGH'
  },
  {
    input: 'public/images/Home/img03.png',
    output: 'public/images/Home/img03.webp',
    targetQuality: 75,
    targetSize: 300, // KB
    priority: 'HIGH'
  },
  {
    input: 'public/images/Cms/thumsample.png',
    output: 'public/images/Cms/thumsample.webp',
    targetQuality: 75,
    targetSize: 200, // KB
    priority: 'HIGH'
  }
];

function checkImageMagickAvailable() {
  try {
    execSync('convert -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkSharpAvailable() {
  try {
    require.resolve('sharp');
    return true;
  } catch {
    return false;
  }
}

async function compressImageWithSharp(inputPath, outputPath, quality, targetSizeKB) {
  try {
    const sharp = require('sharp');
    const inputBuffer = fs.readFileSync(inputPath);
    
    let compressed = sharp(inputBuffer)
      .webp({ quality: quality });
    
    let outputBuffer = await compressed.toBuffer();
    let currentSizeKB = outputBuffer.length / 1024;
    
    // Iteratively reduce quality if still too large
    let attempts = 0;
    while (currentSizeKB > targetSizeKB && quality > 40 && attempts < 5) {
      quality -= 10;
      attempts++;
      
      compressed = sharp(inputBuffer).webp({ quality: quality });
      outputBuffer = await compressed.toBuffer();
      currentSizeKB = outputBuffer.length / 1024;
      
      log(colors.yellow, `  Attempt ${attempts}: Quality ${quality}%, Size: ${currentSizeKB.toFixed(2)} KB`);
    }
    
    fs.writeFileSync(outputPath, outputBuffer);
    
    return {
      success: true,
      originalSize: inputBuffer.length / 1024,
      compressedSize: currentSizeKB,
      quality: quality,
      compressionRatio: ((inputBuffer.length - outputBuffer.length) / inputBuffer.length * 100)
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function compressImageWithImageMagick(inputPath, outputPath, quality, targetSizeKB) {
  try {
    const originalStats = fs.statSync(inputPath);
    const originalSizeKB = originalStats.size / 1024;
    
    // Convert to WebP with quality setting
    const cmd = `convert "${inputPath}" -quality ${quality} "${outputPath}"`;
    execSync(cmd, { stdio: 'pipe' });
    
    const compressedStats = fs.statSync(outputPath);
    const compressedSizeKB = compressedStats.size / 1024;
    
    // Check if we need further compression
    if (compressedSizeKB > targetSizeKB && quality > 40) {
      const newQuality = Math.max(40, quality - 15);
      const retryCmd = `convert "${inputPath}" -quality ${newQuality} "${outputPath}"`;
      execSync(retryCmd, { stdio: 'pipe' });
      
      const finalStats = fs.statSync(outputPath);
      const finalSizeKB = finalStats.size / 1024;
      
      return {
        success: true,
        originalSize: originalSizeKB,
        compressedSize: finalSizeKB,
        quality: newQuality,
        compressionRatio: ((originalStats.size - finalStats.size) / originalStats.size * 100)
      };
    }
    
    return {
      success: true,
      originalSize: originalSizeKB,
      compressedSize: compressedSizeKB, 
      quality: quality,
      compressionRatio: ((originalStats.size - compressedStats.size) / originalStats.size * 100)
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function compressCriticalImages() {
  logHeader('Critical Image Compression (Production Blocker Fix)');
  
  // Check compression tools availability
  const hasSharp = checkSharpAvailable();
  const hasImageMagick = checkImageMagickAvailable();
  
  if (!hasSharp && !hasImageMagick) {
    log(colors.red, '❌ No image compression tools available!');
    log(colors.yellow, 'Install either:');
    log(colors.yellow, '  • npm install sharp (recommended)');
    log(colors.yellow, '  • sudo apt-get install imagemagick (Linux)');
    log(colors.yellow, '  • brew install imagemagick (macOS)');
    return false;
  }
  
  const tool = hasSharp ? 'Sharp' : 'ImageMagick';
  log(colors.green, `✅ Using ${tool} for image compression`);
  
  let totalSavings = 0;
  let processedCount = 0;
  let failedCount = 0;
  
  for (const compression of CRITICAL_COMPRESSIONS) {
    const { input, output, targetQuality, targetSize, priority } = compression;
    const outputPath = output || input;
    
    if (!fs.existsSync(input)) {
      log(colors.yellow, `⚠️  Skipping ${input} (file not found)`);
      continue;
    }
    
    const originalStats = fs.statSync(input);
    const originalSizeKB = originalStats.size / 1024;
    
    log(colors.blue, `\n🔧 [${priority}] Processing: ${path.basename(input)}`);
    log(colors.blue, `   Original: ${originalSizeKB.toFixed(2)} KB → Target: ${targetSize} KB`);
    
    let result;
    
    if (hasSharp) {
      result = await compressImageWithSharp(input, outputPath, targetQuality, targetSize);
    } else {
      result = await compressImageWithImageMagick(input, outputPath, targetQuality, targetSize);
    }
    
    if (result.success) {
      const savings = result.originalSize - result.compressedSize;
      totalSavings += savings;
      processedCount++;
      
      log(colors.green, `   ✅ Success: ${result.compressedSize.toFixed(2)} KB (${result.compressionRatio.toFixed(1)}% reduction)`);
      log(colors.green, `   Quality: ${result.quality}%, Saved: ${savings.toFixed(2)} KB`);
      
      if (result.compressedSize <= targetSize) {
        log(colors.green, `   🎯 Target achieved!`);
      } else {
        log(colors.yellow, `   ⚠️  Still ${(result.compressedSize - targetSize).toFixed(2)} KB over target`);
      }
    } else {
      failedCount++;
      log(colors.red, `   ❌ Failed: ${result.error}`);
    }
  }
  
  // Summary
  logHeader('Compression Summary');
  log(colors.blue, `📊 Processed: ${processedCount} images`);
  log(colors.blue, `❌ Failed: ${failedCount} images`);
  log(colors.green, `💾 Total savings: ${totalSavings.toFixed(2)} KB (${(totalSavings/1024).toFixed(2)} MB)`);
  
  if (totalSavings > 1024) {
    log(colors.green, `🚀 Excellent! Significant space saved.`);
  }
  
  return processedCount > 0;
}

// Main execution
async function main() {
  console.log(`${colors.bold}${colors.magenta}🎯 Critical Image Compressor${colors.reset}`);
  console.log(`${colors.magenta}Production Blocker Fix - 17.55MB → 5MB Target${colors.reset}`);
  
  try {
    const success = await compressCriticalImages();
    
    if (success) {
      logHeader('Next Steps');
      log(colors.yellow, '1. Run performance budget check: node scripts/performance-budget-check.js');
      log(colors.yellow, '2. Test image loading in development');  
      log(colors.yellow, '3. Update image references in code if needed');
      log(colors.yellow, '4. Commit and push changes');
      
      log(colors.green, '\n🎉 Image compression completed!');
      log(colors.green, 'Performance budget should now pass.');
    } else {
      log(colors.red, '\n❌ Image compression failed!');
      log(colors.red, 'Install compression tools and try again.');
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
  compressCriticalImages,
  CRITICAL_COMPRESSIONS
};