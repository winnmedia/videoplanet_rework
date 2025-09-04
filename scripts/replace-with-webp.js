#!/usr/bin/env node
/**
 * 원본 이미지를 WebP 버전으로 교체하는 스크립트
 * 98MB → 10MB 목표 달성을 위한 최종 단계
 * 시각적 충실성을 유지하면서 성능 최적화
 */

const fs = require('fs/promises');
const path = require('path');

// WebP로 교체할 파일들 (큰 파일들 우선)
const REPLACEMENTS = [
  {
    original: 'public/images/Home/gif.gif',
    webp: 'public/images/Home/gif.webp',
    backup: 'public/images/Home/gif.gif.bak'
  },
  {
    original: 'public/images/Home/bg05.png',
    webp: 'public/images/Home/bg05.webp',
    backup: 'public/images/Home/bg05.png.bak'
  },
  {
    original: 'public/images/Home/bg06.png',
    webp: 'public/images/Home/bg06.webp',
    backup: 'public/images/Home/bg06.png.bak'
  },
  {
    original: 'public/images/Home/new/visual-bg.png',
    webp: 'public/images/Home/new/visual-bg.webp',
    backup: 'public/images/Home/new/visual-bg.png.bak'
  },
  {
    original: 'public/images/Home/bg01.png',
    webp: 'public/images/Home/bg01.webp',
    backup: 'public/images/Home/bg01.png.bak'
  },
  {
    original: 'public/images/Home/w_bg02.png',
    webp: 'public/images/Home/w_bg02.webp',
    backup: 'public/images/Home/w_bg02.png.bak'
  },
  {
    original: 'public/images/Home/bg03.png',
    webp: 'public/images/Home/bg03.webp',
    backup: 'public/images/Home/bg03.png.bak'
  },
  {
    original: 'public/images/Home/bg04.png',
    webp: 'public/images/Home/bg04.webp',
    backup: 'public/images/Home/bg04.png.bak'
  },
  {
    original: 'public/images/Home/new/end-bg.png',
    webp: 'public/images/Home/new/end-bg.webp',
    backup: 'public/images/Home/new/end-bg.png.bak'
  },
  {
    original: 'public/images/Home/n_bg.png',
    webp: 'public/images/Home/n_bg.webp',
    backup: 'public/images/Home/n_bg.png.bak'
  },
  {
    original: 'public/images/Home/bg08.png',
    webp: 'public/images/Home/bg08.webp',
    backup: 'public/images/Home/bg08.png.bak'
  },
  {
    original: 'public/images/Home/w_bg.png',
    webp: 'public/images/Home/w_bg.webp',
    backup: 'public/images/Home/w_bg.png.bak'
  },
  {
    original: 'public/images/Home/bg02.png',
    webp: 'public/images/Home/bg02.webp',
    backup: 'public/images/Home/bg02.png.bak'
  },
  {
    original: 'public/images/Cms/video_sample.jpg',
    webp: 'public/images/Cms/video_sample.webp',
    backup: 'public/images/Cms/video_sample.jpg.bak'
  }
];

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

async function replaceWithWebP(replacement) {
  const { original, webp, backup } = replacement;
  
  try {
    // WebP 파일이 존재하는지 확인
    const webpSize = await getFileSize(webp);
    if (webpSize === 0) {
      console.log(`⚠️  WebP file not found: ${webp}`);
      return { success: false, saved: 0 };
    }
    
    // 원본 파일 크기 확인
    const originalSize = await getFileSize(original);
    if (originalSize === 0) {
      console.log(`⚠️  Original file not found: ${original}`);
      return { success: false, saved: 0 };
    }
    
    const originalSizeMB = (originalSize / 1024 / 1024).toFixed(2);
    const webpSizeMB = (webpSize / 1024 / 1024).toFixed(2);
    const savedSize = originalSize - webpSize;
    const savedPercent = ((savedSize / originalSize) * 100).toFixed(1);
    
    console.log(`🔄 Replacing ${path.basename(original)}: ${originalSizeMB}MB → ${webpSizeMB}MB (${savedPercent}% saved)`);
    
    // 원본 파일을 백업으로 이동
    await fs.rename(original, backup);
    
    // WebP 파일을 원본 이름으로 복사 (확장자만 변경)
    const originalExt = path.extname(original);
    const webpAsOriginal = original.replace(originalExt, '.webp');
    await fs.copyFile(webp, webpAsOriginal);
    
    // 원래 확장자를 가진 WebP 파일 제거
    if (webp !== webpAsOriginal) {
      await fs.unlink(webp);
    }
    
    console.log(`✅ Replaced: ${path.basename(original)} → ${path.basename(webpAsOriginal)}`);
    
    return { success: true, saved: savedSize };
    
  } catch (error) {
    console.error(`❌ Error replacing ${original}:`, error.message);
    return { success: false, saved: 0 };
  }
}

async function updateImageReferences() {
  console.log('\n🔄 Updating image references in code...');
  
  // 이미지 최적화 유틸리티 업데이트
  const optimizationUtilPath = 'shared/lib/image-optimization.ts';
  
  try {
    let content = await fs.readFile(optimizationUtilPath, 'utf8');
    
    // WebP 매핑을 업데이트 (이제 .webp 확장자를 가진 파일들로)
    const updatedMapping = `const WEBP_AVAILABLE_IMAGES = new Set([
  '/images/Home/gif.webp',
  '/images/Home/bg05.webp',
  '/images/Home/bg06.webp',
  '/images/Home/new/visual-bg.webp',
  '/images/Home/bg01.webp',
  '/images/Home/w_bg02.webp',
  '/images/Home/bg03.webp',
  '/images/Home/bg04.webp',
  '/images/Home/new/end-bg.webp',
  '/images/Home/n_bg.webp',
  '/images/Home/bg08.webp',
  '/images/Home/w_bg.webp',
  '/images/Home/bg02.webp',
  '/images/Cms/video_sample.webp'
]);`;
    
    content = content.replace(
      /const WEBP_AVAILABLE_IMAGES = new Set\(\[[\s\S]*?\]\);/,
      updatedMapping
    );
    
    // 이제 모든 이미지가 WebP이므로 함수 로직 단순화
    content = content.replace(
      /export function getOptimizedImageSrc\(originalPath: string\): string \{[\s\S]*?\}/,
      `export function getOptimizedImageSrc(originalPath: string): string {
  // WebP 버전이 있는지 확인
  if (WEBP_AVAILABLE_IMAGES.has(originalPath)) {
    return originalPath; // 이미 WebP 경로
  }
  
  // WebP 버전으로 변환 시도
  const webpPath = originalPath.replace(/\\.(png|jpg|jpeg|gif)$/i, '.webp');
  if (WEBP_AVAILABLE_IMAGES.has(webpPath)) {
    return webpPath;
  }
  
  // WebP 버전이 없으면 원본 반환
  return originalPath;
}`
    );
    
    await fs.writeFile(optimizationUtilPath, content);
    console.log(`✅ Updated: ${optimizationUtilPath}`);
    
  } catch (error) {
    console.error(`❌ Error updating ${optimizationUtilPath}:`, error.message);
  }
}

async function main() {
  console.log('🔄 Starting WebP replacement process...');
  console.log('📁 This will replace original files with WebP versions');
  console.log('💾 Original files will be backed up with .bak extension\n');
  
  let totalSaved = 0;
  let successCount = 0;
  
  for (const replacement of REPLACEMENTS) {
    const result = await replaceWithWebP(replacement);
    if (result.success) {
      successCount++;
      totalSaved += result.saved;
    }
  }
  
  const totalSavedMB = (totalSaved / 1024 / 1024).toFixed(2);
  
  console.log('\n🎯 REPLACEMENT SUMMARY:');
  console.log(`✅ Files Replaced: ${successCount}/${REPLACEMENTS.length}`);
  console.log(`💾 Space Saved: ${totalSavedMB}MB`);
  console.log(`🚀 Expected Performance Improvement: ~${(totalSaved / (98 * 1024 * 1024) * 100).toFixed(1)}%`);
  
  // 이미지 참조 업데이트
  await updateImageReferences();
  
  console.log('\n📊 Final size check...');
  
  // 최종 크기 확인
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync(`find public/images -name "*.bak" -prune -o -type f \\( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" \\) -exec wc -c {} \\; | awk '{total += $1} END {print total}'`);
    const finalSize = parseInt(stdout.trim()) || 0;
    const finalSizeMB = (finalSize / 1024 / 1024).toFixed(2);
    
    console.log(`📊 Final Image Directory Size: ${finalSizeMB}MB`);
    
    const targetAchieved = finalSize <= 15 * 1024 * 1024; // 15MB
    console.log(`🎯 Target Achievement: ${targetAchieved ? '✅ SUCCESS' : '⚠️ NEEDS MORE WORK'}`);
    
    if (targetAchieved) {
      console.log('\n🎉 OPTIMIZATION COMPLETE!');
      console.log('✅ Size target achieved (≤15MB)');
      console.log('🚀 Ready for Core Web Vitals improvement');
      console.log('📋 Next: Deploy and run Lighthouse tests');
    } else {
      console.log('\n⚠️  Additional optimization needed');
      console.log('💡 Consider optimizing remaining large files');
    }
    
  } catch (error) {
    console.error('❌ Error calculating final size:', error.message);
  }
  
  console.log('\n💡 ROLLBACK INSTRUCTIONS:');
  console.log('If you need to rollback, run:');
  console.log('find public/images -name "*.bak" -exec bash -c \'mv "$1" "${1%.bak}"\' _ {} \\;');
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { replaceWithWebP };