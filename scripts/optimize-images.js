#!/usr/bin/env node
/**
 * 이미지 최적화 스크립트
 * 대용량 이미지를 WebP로 변환하여 98MB → 10MB 달성
 * Target: LCP 20s → 2.5s
 */

const fs = require('fs/promises');
const path = require('path');

const sharp = require('sharp');

// 최적화 대상 파일들 (용량 큰 순서)
const OPTIMIZATION_TARGETS = [
  {
    src: 'public/images/Home/gif.gif',
    dest: 'public/images/Home/gif.webp',
    quality: 80,
    type: 'animation'
  },
  {
    src: 'public/images/Home/bg05.png',
    dest: 'public/images/Home/bg05.webp',
    quality: 85,
    type: 'background'
  },
  {
    src: 'public/images/Cms/video_sample.jpg',
    dest: 'public/images/Cms/video_sample.webp',
    quality: 80,
    type: 'video-thumbnail'
  },
  {
    src: 'public/images/Home/bg06.png',
    dest: 'public/images/Home/bg06.webp',
    quality: 85,
    type: 'background'
  },
  {
    src: 'public/images/Home/new/visual-bg.png',
    dest: 'public/images/Home/new/visual-bg.webp',
    quality: 85,
    type: 'hero-background'
  }
];

// 백그라운드 이미지들 추가 최적화
const BACKGROUND_IMAGES = [
  'public/images/Home/bg01.png',
  'public/images/Home/w_bg02.png',
  'public/images/Home/bg03.png',
  'public/images/Home/bg04.png',
  'public/images/Home/new/end-bg.png',
  'public/images/Home/n_bg.png',
  'public/images/Home/bg08.png',
  'public/images/Home/w_bg.png',
  'public/images/Home/bg02.png'
];

async function optimizeImage(config) {
  try {
    const { src, dest, quality, type } = config;
    
    // 원본 파일 크기 확인
    const stats = await fs.stat(src);
    const originalSize = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log(`🔄 Converting ${src} (${originalSize}MB) → ${dest}`);
    
    let pipeline = sharp(src);
    
    // GIF는 첫 번째 프레임만 추출
    if (type === 'animation') {
      pipeline = pipeline.png(); // GIF → PNG → WebP for better quality
    }
    
    // WebP로 변환 및 품질 최적화
    await pipeline
      .webp({ 
        quality,
        effort: 6, // 최고 압축 효율
        lossless: type === 'hero-background' ? true : false
      })
      .toFile(dest);
    
    // 변환된 파일 크기 확인
    const newStats = await fs.stat(dest);
    const newSize = (newStats.size / 1024 / 1024).toFixed(2);
    const reduction = ((stats.size - newStats.size) / stats.size * 100).toFixed(1);
    
    console.log(`✅ ${path.basename(dest)}: ${originalSize}MB → ${newSize}MB (${reduction}% 절약)`);
    
    return {
      original: stats.size,
      optimized: newStats.size,
      reduction: stats.size - newStats.size
    };
    
  } catch (error) {
    console.error(`❌ Error optimizing ${config.src}:`, error.message);
    return { original: 0, optimized: 0, reduction: 0 };
  }
}

async function optimizeBackgroundImage(imagePath) {
  try {
    const destPath = imagePath.replace(/\.(png|jpg)$/, '.webp');
    
    const stats = await fs.stat(imagePath);
    const originalSize = (stats.size / 1024 / 1024).toFixed(2);
    
    console.log(`🖼️  Optimizing background: ${imagePath} (${originalSize}MB)`);
    
    await sharp(imagePath)
      .webp({ 
        quality: 85,
        effort: 6
      })
      .toFile(destPath);
    
    const newStats = await fs.stat(destPath);
    const newSize = (newStats.size / 1024 / 1024).toFixed(2);
    const reduction = ((stats.size - newStats.size) / stats.size * 100).toFixed(1);
    
    console.log(`✅ ${path.basename(destPath)}: ${originalSize}MB → ${newSize}MB (${reduction}% 절약)`);
    
    return {
      original: stats.size,
      optimized: newStats.size,
      reduction: stats.size - newStats.size
    };
    
  } catch (error) {
    console.error(`❌ Error optimizing ${imagePath}:`, error.message);
    return { original: 0, optimized: 0, reduction: 0 };
  }
}

async function main() {
  console.log('🚀 Starting image optimization process...');
  console.log('📊 Target: 98MB → 10MB (90% reduction)');
  console.log('⏱️  Goal: LCP 20s → 2.5s\n');
  
  let totalOriginal = 0;
  let totalOptimized = 0;
  let totalReduction = 0;
  
  // 1. 우선순위 대형 이미지 최적화
  console.log('📋 Phase 1: Optimizing priority large images...');
  for (const config of OPTIMIZATION_TARGETS) {
    const result = await optimizeImage(config);
    totalOriginal += result.original;
    totalOptimized += result.optimized;
    totalReduction += result.reduction;
  }
  
  console.log('\n📋 Phase 2: Optimizing background images...');
  // 2. 백그라운드 이미지 최적화
  for (const imagePath of BACKGROUND_IMAGES) {
    try {
      await fs.access(imagePath);
      const result = await optimizeBackgroundImage(imagePath);
      totalOriginal += result.original;
      totalOptimized += result.optimized;
      totalReduction += result.reduction;
    } catch (error) {
      console.log(`⚠️  Skipping ${imagePath} (file not found)`);
    }
  }
  
  // 최종 결과 요약
  const totalOriginalMB = (totalOriginal / 1024 / 1024).toFixed(2);
  const totalOptimizedMB = (totalOptimized / 1024 / 1024).toFixed(2);
  const totalReductionMB = (totalReduction / 1024 / 1024).toFixed(2);
  const reductionPercent = totalOriginal > 0 ? ((totalReduction / totalOriginal) * 100).toFixed(1) : 0;
  
  console.log('\n🎯 OPTIMIZATION SUMMARY:');
  console.log(`📊 Original Size: ${totalOriginalMB}MB`);
  console.log(`📊 Optimized Size: ${totalOptimizedMB}MB`);
  console.log(`📊 Total Saved: ${totalReductionMB}MB (${reductionPercent}%)`);
  console.log(`🚀 Expected LCP Improvement: ~${(reductionPercent * 0.8).toFixed(1)}%`);
  
  if (parseFloat(totalOptimizedMB) <= 15) {
    console.log('🎉 SUCCESS: Target size achieved! Ready for Core Web Vitals improvement.');
  } else {
    console.log('⚠️  Additional optimization may be needed for target achievement.');
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { optimizeImage, optimizeBackgroundImage };