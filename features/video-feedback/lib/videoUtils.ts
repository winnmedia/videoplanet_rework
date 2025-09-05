/**
 * @fileoverview Video Utility Functions
 * @module features/video-feedback/lib
 * 
 * 비디오 관련 유틸리티 함수 모음
 * - 포맷 변환
 * - 메타데이터 추출
 * - 썸네일 생성
 * - 청크 업로드
 * - 시간 포맷팅
 */

// ============================================================
// Time Formatting
// ============================================================

/**
 * 초 단위를 시:분:초 형식으로 변환
 */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 시:분:초 형식을 초 단위로 변환
 */
export function parseDuration(timeString: string): number {
  const parts = timeString.split(':').map(Number);
  
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 1) {
    return parts[0];
  }
  
  return 0;
}

/**
 * 상대적 시간 포맷팅 (예: 3일 전)
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffWeeks < 4) return `${diffWeeks}주 전`;
  if (diffMonths < 12) return `${diffMonths}개월 전`;
  return `${diffYears}년 전`;
}

// ============================================================
// File Size Formatting
// ============================================================

/**
 * 바이트를 읽기 쉬운 크기로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 업로드 속도 계산 및 포맷팅
 */
export function formatUploadSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';

  const k = 1024;
  const speeds = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + speeds[i];
}

/**
 * 남은 시간 계산
 */
export function calculateTimeRemaining(
  totalBytes: number,
  uploadedBytes: number,
  bytesPerSecond: number
): number {
  if (bytesPerSecond === 0) return Infinity;
  
  const remainingBytes = totalBytes - uploadedBytes;
  return Math.ceil(remainingBytes / bytesPerSecond);
}

// ============================================================
// Video Metadata Extraction
// ============================================================

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  frameRate?: number;
  bitRate?: number;
}

/**
 * 비디오 파일에서 메타데이터 추출
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const metadata: VideoMetadata = {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        aspectRatio: calculateAspectRatio(video.videoWidth, video.videoHeight)
      };

      URL.revokeObjectURL(video.src);
      resolve(metadata);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('비디오 메타데이터를 읽을 수 없습니다'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * 화면 비율 계산
 */
function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  const aspectWidth = width / divisor;
  const aspectHeight = height / divisor;
  
  // 일반적인 비율 표준화
  if (aspectWidth === 16 && aspectHeight === 9) return '16:9';
  if (aspectWidth === 4 && aspectHeight === 3) return '4:3';
  if (aspectWidth === 21 && aspectHeight === 9) return '21:9';
  if (aspectWidth === 1 && aspectHeight === 1) return '1:1';
  
  return `${aspectWidth}:${aspectHeight}`;
}

// ============================================================
// Thumbnail Generation
// ============================================================

export interface ThumbnailOptions {
  timestamp?: number; // 썸네일을 생성할 시간 (초), 기본값은 중간 지점
  width?: number; // 썸네일 너비
  height?: number; // 썸네일 높이
  quality?: number; // JPEG 품질 (0-1)
}

/**
 * 비디오에서 썸네일 생성
 */
export async function generateThumbnail(
  file: File,
  options: ThumbnailOptions = {}
): Promise<Blob> {
  const {
    timestamp,
    width = 640,
    height = 360,
    quality = 0.8
  } = options;

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas 컨텍스트를 생성할 수 없습니다'));
      return;
    }

    video.preload = 'metadata';
    video.muted = true;

    video.onloadedmetadata = () => {
      // 타임스탬프 설정 (기본값: 중간 지점)
      const seekTime = timestamp !== undefined ? timestamp : video.duration / 2;
      video.currentTime = Math.min(seekTime, video.duration);
    };

    video.onseeked = () => {
      // 캔버스 크기 설정
      canvas.width = width;
      canvas.height = height;

      // 비디오를 캔버스에 그리기 (비율 유지)
      const videoAspectRatio = video.videoWidth / video.videoHeight;
      const canvasAspectRatio = width / height;

      let drawWidth = width;
      let drawHeight = height;
      let offsetX = 0;
      let offsetY = 0;

      if (videoAspectRatio > canvasAspectRatio) {
        drawHeight = width / videoAspectRatio;
        offsetY = (height - drawHeight) / 2;
      } else {
        drawWidth = height * videoAspectRatio;
        offsetX = (width - drawWidth) / 2;
      }

      // 검은색 배경
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // 비디오 그리기
      ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

      // Blob 생성
      canvas.toBlob(
        (blob) => {
          if (blob) {
            URL.revokeObjectURL(video.src);
            resolve(blob);
          } else {
            reject(new Error('썸네일 생성 실패'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('비디오를 로드할 수 없습니다'));
    };

    video.src = URL.createObjectURL(file);
  });
}

/**
 * 여러 썸네일 생성 (타임라인용)
 */
export async function generateMultipleThumbnails(
  file: File,
  count: number = 10,
  options: Omit<ThumbnailOptions, 'timestamp'> = {}
): Promise<Blob[]> {
  const metadata = await extractVideoMetadata(file);
  const interval = metadata.duration / (count + 1);
  const thumbnails: Blob[] = [];

  for (let i = 1; i <= count; i++) {
    const timestamp = interval * i;
    const thumbnail = await generateThumbnail(file, { ...options, timestamp });
    thumbnails.push(thumbnail);
  }

  return thumbnails;
}

// ============================================================
// Chunk Upload Utilities
// ============================================================

export interface ChunkUploadOptions {
  chunkSize?: number; // 청크 크기 (바이트)
  maxRetries?: number; // 최대 재시도 횟수
  retryDelay?: number; // 재시도 간격 (ms)
  onProgress?: (progress: number) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
}

/**
 * 파일을 청크로 분할
 */
export function* createFileChunks(
  file: File,
  chunkSize: number = 5 * 1024 * 1024 // 5MB
): Generator<{ chunk: Blob; index: number; total: number }> {
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    yield { chunk, index: i, total: totalChunks };
  }
}

/**
 * 청크 업로드 해시 생성 (무결성 검증용)
 */
export async function calculateChunkHash(chunk: Blob): Promise<string> {
  const buffer = await chunk.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ============================================================
// Video Validation
// ============================================================

export interface VideoValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 비디오 파일 검증
 */
export async function validateVideoFile(
  file: File,
  options: {
    maxSize?: number;
    allowedFormats?: string[];
    minDuration?: number;
    maxDuration?: number;
    minResolution?: { width: number; height: number };
    maxResolution?: { width: number; height: number };
  } = {}
): Promise<VideoValidationResult> {
  const {
    maxSize = 5 * 1024 * 1024 * 1024, // 5GB
    allowedFormats = ['video/mp4', 'video/webm', 'video/quicktime'],
    minDuration = 1,
    maxDuration = 3600,
    minResolution = { width: 320, height: 240 },
    maxResolution = { width: 3840, height: 2160 }
  } = options;

  const result: VideoValidationResult = {
    valid: true,
    errors: [],
    warnings: []
  };

  // 파일 크기 검증
  if (file.size > maxSize) {
    result.errors.push(`파일 크기가 ${formatFileSize(maxSize)}를 초과합니다`);
    result.valid = false;
  }

  // 파일 형식 검증
  if (!allowedFormats.includes(file.type)) {
    result.errors.push(`지원하지 않는 파일 형식입니다. 지원 형식: ${allowedFormats.join(', ')}`);
    result.valid = false;
  }

  // 메타데이터 검증
  try {
    const metadata = await extractVideoMetadata(file);

    // 길이 검증
    if (metadata.duration < minDuration) {
      result.errors.push(`비디오가 너무 짧습니다 (최소 ${minDuration}초)`);
      result.valid = false;
    }
    if (metadata.duration > maxDuration) {
      result.errors.push(`비디오가 너무 깁니다 (최대 ${formatDuration(maxDuration)})`);
      result.valid = false;
    }

    // 해상도 검증
    if (metadata.width < minResolution.width || metadata.height < minResolution.height) {
      result.errors.push(`해상도가 너무 낮습니다 (최소 ${minResolution.width}x${minResolution.height})`);
      result.valid = false;
    }
    if (metadata.width > maxResolution.width || metadata.height > maxResolution.height) {
      result.warnings.push(`해상도가 매우 높습니다 (${metadata.width}x${metadata.height}). 처리 시간이 오래 걸릴 수 있습니다`);
    }

    // 비율 경고
    const ratio = metadata.width / metadata.height;
    if (ratio < 0.5 || ratio > 2.5) {
      result.warnings.push(`비정상적인 화면 비율입니다 (${metadata.aspectRatio})`);
    }
  } catch (error) {
    result.errors.push('비디오 메타데이터를 읽을 수 없습니다');
    result.valid = false;
  }

  return result;
}

// ============================================================
// WebRTC Utilities
// ============================================================

/**
 * 브라우저 미디어 기능 확인
 */
export function checkMediaCapabilities(): {
  webRTC: boolean;
  mediaRecorder: boolean;
  screenCapture: boolean;
} {
  return {
    webRTC: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    mediaRecorder: typeof MediaRecorder !== 'undefined',
    screenCapture: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
  };
}

/**
 * 지원되는 비디오 코덱 확인
 */
export function getSupportedVideoCodecs(): string[] {
  const video = document.createElement('video');
  const codecs = [
    { mime: 'video/webm; codecs="vp9"', name: 'VP9' },
    { mime: 'video/webm; codecs="vp8"', name: 'VP8' },
    { mime: 'video/mp4; codecs="avc1.42E01E"', name: 'H.264' },
    { mime: 'video/mp4; codecs="hev1.1.6.L93.B0"', name: 'H.265' },
    { mime: 'video/webm; codecs="av01"', name: 'AV1' }
  ];

  return codecs
    .filter(codec => video.canPlayType(codec.mime) !== '')
    .map(codec => codec.name);
}