/**
 * 커스텀 Next.js 이미지 로더
 * WebP 자동 감지 및 최적화된 이미지 제공
 * Core Web Vitals 성능 목표: LCP 20s → 2.5s
 */

// WebP 변환된 이미지 매핑
const WEBP_IMAGES = new Set([
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

/**
 * 이미지 로더 함수
 * @param {Object} params - 로더 파라미터
 * @param {string} params.src - 이미지 소스 경로
 * @param {number} params.width - 요청된 너비
 * @param {number} params.quality - 품질 (1-100)
 * @returns {string} 최적화된 이미지 URL
 */
function imageLoader({ src, width, quality }) {
  // WebP 버전이 있는지 확인
  const webpSrc = src.replace(/\.(png|jpg|jpeg|gif)$/i, '.webp');
  
  if (WEBP_IMAGES.has(webpSrc)) {
    // WebP 버전 사용
    return `${webpSrc}?w=${width}&q=${quality || 85}`;
  }
  
  // 원본 이미지 사용 (Next.js가 자동으로 최적화)
  return `${src}?w=${width}&q=${quality || 85}`;
}

module.exports = imageLoader;