/**
 * 고성능 Next.js 이미지 로더 (Production Blocker Fix)
 * Critical: 17MB → 5MB 이미지 최적화로 LCP 2.5s 목표 달성
 * Performance Lead 요구사항: 성능 예산 위반 해결
 */

// 중요: 성능 예산 위반 이미지들 (500KB+ 이미지 최적화 우선순위)
const CRITICAL_IMAGES = new Map([
  // 최우선 최적화 대상 (2MB+ 이미지)
  ['/images/Cms/video_sample.webp', { quality: 65, priority: 'high' }],
  ['/images/User/bg.webp', { quality: 70, priority: 'high' }],
  ['/images/Home/new/visual-bg.webp', { quality: 70, priority: 'high' }],
  
  // 고우선순위 최적화 대상 (500KB-1MB 이미지)  
  ['/images/Home/img02.png', { quality: 75, priority: 'medium' }],
  ['/images/Home/img07.png', { quality: 75, priority: 'medium' }],
  ['/images/Home/img05.png', { quality: 75, priority: 'medium' }],
  ['/images/Home/img04.png', { quality: 75, priority: 'medium' }],
  ['/images/Home/img06.png', { quality: 75, priority: 'medium' }],
  ['/images/Home/img03.png', { quality: 75, priority: 'medium' }],
  ['/images/Cms/thumsample.png', { quality: 75, priority: 'medium' }]
]);

// WebP 변환 가능한 모든 이미지 매핑
const WEBP_OPTIMIZED_IMAGES = new Set([
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
]);

// Above-the-fold 이미지들 (preload 대상)
const ABOVE_FOLD_IMAGES = new Set([
  '/images/Home/new/visual-bg.webp',
  '/images/User/bg.webp',
  '/images/Home/img01.png'
]);

/**
 * 성능 최적화된 이미지 로더 함수 
 * Critical Path: 성능 예산 위반 해결을 위한 공격적 최적화
 */
function imageLoader({ src, width, quality }) {
  // 1. Critical images 우선 처리 (Performance Budget 위반 해결)
  const criticalConfig = CRITICAL_IMAGES.get(src);
  if (criticalConfig) {
    const optimizedQuality = criticalConfig.quality;
    
    // WebP 버전 우선 확인
    const webpSrc = src.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp');
    if (WEBP_OPTIMIZED_IMAGES.has(webpSrc)) {
      return `${webpSrc}?w=${width}&q=${optimizedQuality}&format=webp`;
    }
    
    return `${src}?w=${width}&q=${optimizedQuality}`;
  }

  // 2. WebP 최적화 버전 확인
  const webpSrc = src.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp');
  if (WEBP_OPTIMIZED_IMAGES.has(webpSrc)) {
    return `${webpSrc}?w=${width}&q=${quality || 75}&format=webp`;
  }

  // 3. Above-the-fold 이미지는 높은 품질 유지하되 적절히 압축
  if (ABOVE_FOLD_IMAGES.has(src)) {
    return `${src}?w=${width}&q=${quality || 80}&priority=high`;
  }

  // 4. 일반 이미지 최적화 (기본 품질 하향 조정)
  return `${src}?w=${width}&q=${quality || 75}`;
}

/**
 * 이미지가 Critical Path에 있는지 확인
 * @param {string} src - 이미지 경로
 * @returns {boolean} Critical 이미지 여부
 */
function isCriticalImage(src) {
  return CRITICAL_IMAGES.has(src) || ABOVE_FOLD_IMAGES.has(src);
}

/**
 * 이미지 preload 힌트 생성
 * @param {string} src - 이미지 경로  
 * @returns {object|null} Preload 설정 또는 null
 */
function getPreloadHint(src) {
  if (ABOVE_FOLD_IMAGES.has(src)) {
    return {
      rel: 'preload',
      as: 'image',
      type: 'image/webp',
      fetchPriority: 'high'
    };
  }
  
  const criticalConfig = CRITICAL_IMAGES.get(src);
  if (criticalConfig && criticalConfig.priority === 'high') {
    return {
      rel: 'preload', 
      as: 'image',
      fetchPriority: 'high'
    };
  }
  
  return null;
}

module.exports = {
  default: imageLoader,
  imageLoader,
  isCriticalImage,
  getPreloadHint,
  CRITICAL_IMAGES,
  ABOVE_FOLD_IMAGES
};