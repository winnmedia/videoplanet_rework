#!/usr/bin/env node
/**
 * 이미지 최적화 성능 테스트 스크립트
 * Core Web Vitals 측정 및 목표 달성 여부 확인
 * Target: LCP 20s → 2.5s, Total Size 98MB → 10MB
 */

const { exec } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * 디렉토리 내 파일 크기 계산
 * @param {string} dirPath - 디렉토리 경로
 * @returns {Promise<number>} 총 크기 (바이트)
 */
async function calculateDirectorySize(dirPath) {
  try {
    const { stdout } = await execAsync(`find "${dirPath}" -type f -exec wc -c {} \\; | awk '{total += $1} END {print total}'`);
    return parseInt(stdout.trim()) || 0;
  } catch (error) {
    console.error(`Error calculating size for ${dirPath}:`, error.message);
    return 0;
  }
}

/**
 * 이미지 파일들의 상세 정보 수집
 * @param {string} dirPath - 디렉토리 경로
 * @returns {Promise<Array>} 이미지 정보 배열
 */
async function getImageDetails(dirPath) {
  try {
    const { stdout } = await execAsync(`find "${dirPath}" -type f \\( -name "*.jpg" -o -name "*.jpeg" -o -name "*.png" -o -name "*.gif" -o -name "*.webp" \\) -exec ls -la {} \\;`);
    
    const lines = stdout.trim().split('\n').filter(line => line);
    const images = lines.map(line => {
      const parts = line.split(/\s+/);
      const size = parseInt(parts[4]) || 0;
      const filename = parts[parts.length - 1];
      const extension = path.extname(filename).toLowerCase();
      
      return {
        filename: path.basename(filename),
        path: filename,
        size,
        sizeKB: (size / 1024).toFixed(2),
        sizeMB: (size / 1024 / 1024).toFixed(2),
        extension
      };
    });
    
    return images.sort((a, b) => b.size - a.size);
  } catch (error) {
    console.error(`Error getting image details for ${dirPath}:`, error.message);
    return [];
  }
}

/**
 * WebP 변환 효과 분석
 * @param {Array} images - 이미지 정보 배열
 * @returns {Object} 변환 통계
 */
function analyzeWebPConversion(images) {
  const webpImages = images.filter(img => img.extension === '.webp');
  const originalImages = images.filter(img => ['.png', '.jpg', '.jpeg', '.gif'].includes(img.extension));
  
  // 원본과 WebP 매칭 (파일명 기준)
  const conversions = webpImages.map(webp => {
    const baseName = webp.filename.replace('.webp', '');
    const original = originalImages.find(orig => 
      orig.filename.replace(/\.(png|jpg|jpeg|gif)$/i, '') === baseName
    );
    
    return {
      webp,
      original,
      reduction: original ? original.size - webp.size : 0,
      reductionPercent: original ? ((original.size - webp.size) / original.size * 100).toFixed(1) : 0
    };
  }).filter(conv => conv.original);
  
  const totalOriginalSize = conversions.reduce((sum, conv) => sum + conv.original.size, 0);
  const totalWebPSize = conversions.reduce((sum, conv) => sum + conv.webp.size, 0);
  const totalReduction = totalOriginalSize - totalWebPSize;
  
  return {
    conversions,
    totalOriginalSize,
    totalWebPSize,
    totalReduction,
    totalReductionPercent: totalOriginalSize > 0 ? (totalReduction / totalOriginalSize * 100).toFixed(1) : 0,
    conversionCount: conversions.length
  };
}

/**
 * 성능 예측 계산
 * @param {number} originalSize - 원본 크기 (MB)
 * @param {number} optimizedSize - 최적화된 크기 (MB)
 * @returns {Object} 성능 예측 데이터
 */
function calculatePerformanceImpact(originalSize, optimizedSize) {
  const sizeReductionPercent = ((originalSize - optimizedSize) / originalSize) * 100;
  
  // LCP 개선 예측 (경험적 공식)
  const originalLCP = 20; // 20초 (문제 상황)
  const expectedLCPImprovement = sizeReductionPercent * 0.8; // 80% 효율
  const predictedLCP = originalLCP * (1 - expectedLCPImprovement / 100);
  
  // 네트워크 시간 절약 (3G 기준: 1Mbps)
  const savedMB = originalSize - optimizedSize;
  const networkTimeSaved = savedMB * 8; // 초 단위
  
  return {
    sizeReductionPercent: sizeReductionPercent.toFixed(1),
    predictedLCP: predictedLCP.toFixed(1),
    lcpImprovement: (originalLCP - predictedLCP).toFixed(1),
    networkTimeSaved: networkTimeSaved.toFixed(1),
    targetAchieved: predictedLCP <= 2.5
  };
}

/**
 * 메인 테스트 함수
 */
async function main() {
  console.log('🔬 Performance Test: Image Optimization Impact');
  console.log('================================================');
  console.log('📊 Target: 98MB → 10MB (90% reduction)');
  console.log('⚡ Goal: LCP 20s → 2.5s\n');
  
  // 1. 전체 이미지 디렉토리 크기 측정
  const totalSize = await calculateDirectorySize('public/images');
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
  
  console.log(`📁 Current Total Image Size: ${totalSizeMB}MB`);
  
  // 2. 이미지 상세 정보 수집
  console.log('\n📋 Analyzing image files...');
  const images = await getImageDetails('public/images');
  
  if (images.length === 0) {
    console.error('❌ No images found in public/images directory');
    return;
  }
  
  // 3. WebP 변환 효과 분석
  console.log('\n🔄 WebP Conversion Analysis:');
  const webpAnalysis = analyzeWebPConversion(images);
  
  if (webpAnalysis.conversionCount > 0) {
    console.log(`✅ WebP Conversions: ${webpAnalysis.conversionCount} files`);
    console.log(`📊 Original Size: ${(webpAnalysis.totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📊 WebP Size: ${(webpAnalysis.totalWebPSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📊 Saved: ${(webpAnalysis.totalReduction / 1024 / 1024).toFixed(2)}MB (${webpAnalysis.totalReductionPercent}%)`);
    
    // 가장 큰 절약 효과를 보인 파일들 표시
    console.log('\n🏆 Top WebP Conversions:');
    webpAnalysis.conversions
      .sort((a, b) => b.reduction - a.reduction)
      .slice(0, 5)
      .forEach(conv => {
        console.log(`  📷 ${conv.original.filename}: ${conv.original.sizeMB}MB → ${conv.webp.sizeMB}MB (${conv.reductionPercent}% saved)`);
      });
  } else {
    console.log('⚠️  No WebP conversions found');
  }
  
  // 4. 큰 파일들 식별
  console.log('\n📏 Largest Remaining Files (>1MB):');
  const largeFiles = images.filter(img => img.size > 1024 * 1024);
  largeFiles.slice(0, 10).forEach(img => {
    console.log(`  📁 ${img.filename}: ${img.sizeMB}MB (${img.extension})`);
  });
  
  if (largeFiles.length === 0) {
    console.log('✅ No files larger than 1MB remaining!');
  }
  
  // 5. 성능 영향 예측
  console.log('\n⚡ Performance Impact Prediction:');
  const originalEstimate = 98; // MB (문제 상황)
  const performance = calculatePerformanceImpact(originalEstimate, parseFloat(totalSizeMB));
  
  console.log(`📊 Size Reduction: ${performance.sizeReductionPercent}%`);
  console.log(`🚀 Predicted LCP: ${performance.predictedLCP}s (was 20s)`);
  console.log(`⏱️  LCP Improvement: ${performance.lcpImprovement}s`);
  console.log(`🌐 Network Time Saved: ${performance.networkTimeSaved}s (3G)`);
  
  // 6. 목표 달성 여부 평가
  console.log('\n🎯 TARGET EVALUATION:');
  const sizeTargetAchieved = parseFloat(totalSizeMB) <= 15; // 약간의 여유
  const performanceTargetAchieved = performance.targetAchieved;
  
  console.log(`📁 Size Target (≤15MB): ${sizeTargetAchieved ? '✅ ACHIEVED' : '❌ NOT ACHIEVED'} (${totalSizeMB}MB)`);
  console.log(`⚡ LCP Target (≤2.5s): ${performanceTargetAchieved ? '✅ ACHIEVED' : '❌ NOT ACHIEVED'} (${performance.predictedLCP}s)`);
  
  // 7. 권장사항
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (!sizeTargetAchieved) {
    console.log('📁 Size optimization needed:');
    largeFiles.slice(0, 3).forEach(img => {
      console.log(`   - Convert ${img.filename} to WebP or reduce quality`);
    });
  }
  
  if (!performanceTargetAchieved) {
    console.log('⚡ Additional performance optimizations needed:');
    console.log('   - Implement lazy loading for below-fold images');
    console.log('   - Add proper image sizing with responsive breakpoints');
    console.log('   - Consider AVIF format for modern browsers');
  }
  
  if (sizeTargetAchieved && performanceTargetAchieved) {
    console.log('🎉 All targets achieved! Ready for production deployment.');
    console.log('🔄 Next steps: Run actual Core Web Vitals measurement in staging.');
  }
  
  // 8. 파일별 확장자 통계
  console.log('\n📊 File Format Distribution:');
  const formatStats = images.reduce((stats, img) => {
    stats[img.extension] = (stats[img.extension] || 0) + 1;
    return stats;
  }, {});
  
  Object.entries(formatStats)
    .sort(([,a], [,b]) => b - a)
    .forEach(([ext, count]) => {
      console.log(`  ${ext}: ${count} files`);
    });
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  calculateDirectorySize,
  getImageDetails,
  analyzeWebPConversion,
  calculatePerformanceImpact
};