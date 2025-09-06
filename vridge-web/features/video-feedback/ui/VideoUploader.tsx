'use client';

/**
 * @fileoverview Video Uploader Component
 * @module features/video-feedback/ui
 * 
 * Drag & Drop 비디오 업로드 컴포넌트
 * - 파일 검증 및 청크 업로드
 * - 썸네일 자동 생성
 * - 진행률 표시
 * - 접근성 완전 지원
 */

import React, { useCallback, useRef, useState } from 'react';

import { VideoFileValidation, UploadProgress, VideoUploadStatus } from '../model/feedback.schema';

// ============================================================
// Types
// ============================================================

export interface VideoUploaderProps {
  /**
   * 업로드 성공 콜백
   */
  onUploadComplete: (videoId: string, metadata: any) => void;
  
  /**
   * 업로드 진행 콜백
   */
  onProgressUpdate?: (progress: UploadProgress) => void;
  
  /**
   * 에러 콜백
   */
  onError?: (error: Error) => void;
  
  /**
   * 파일 검증 규칙 (선택적)
   */
  validation?: Partial<VideoFileValidation>;
  
  /**
   * 청크 크기 (기본 5MB)
   */
  chunkSize?: number;
  
  /**
   * 컴포넌트 비활성화
   */
  disabled?: boolean;
  
  /**
   * 업로드 엔드포인트 URL
   */
  uploadUrl: string;
}

// ============================================================
// Main Component
// ============================================================

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onUploadComplete,
  onProgressUpdate,
  onError,
  validation,
  chunkSize = 5 * 1024 * 1024, // 5MB
  disabled = false,
  uploadUrl
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<VideoUploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================
  // File Validation
  // ============================================================
  
  const validateFile = useCallback((file: File): boolean => {
    // 파일 크기 검증
    const maxSize = validation?.maxSize || 5 * 1024 * 1024 * 1024; // 5GB
    if (file.size > maxSize) {
      setErrorMessage(`파일 크기가 너무 큽니다. 최대 ${Math.round(maxSize / (1024 * 1024 * 1024))}GB까지 가능합니다.`);
      return false;
    }
    
    // 파일 형식 검증
    const allowedFormats = validation?.allowedFormats || [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska'
    ];
    
    if (!allowedFormats.includes(file.type)) {
      setErrorMessage('지원하지 않는 파일 형식입니다. MP4, WebM, MOV, AVI, MKV만 가능합니다.');
      return false;
    }
    
    return true;
  }, [validation]);

  // ============================================================
  // Thumbnail Generation
  // ============================================================
  
  const generateThumbnail = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      video.preload = 'metadata';
      video.muted = true;
      
      video.onloadedmetadata = () => {
        // 비디오 중간 지점으로 이동
        video.currentTime = video.duration / 2;
      };
      
      video.onseeked = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              resolve(url);
            } else {
              reject(new Error('썸네일 생성 실패'));
            }
          }, 'image/jpeg', 0.8);
        }
      };
      
      video.onerror = () => reject(new Error('비디오 로드 실패'));
      
      video.src = URL.createObjectURL(file);
    });
  }, []);

  // ============================================================
  // Chunk Upload
  // ============================================================
  
  const uploadChunk = async (
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number,
    fileId: string
  ): Promise<void> => {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', String(chunkIndex));
    formData.append('totalChunks', String(totalChunks));
    formData.append('fileId', fileId);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      signal: abortControllerRef.current?.signal
    });
    
    if (!response.ok) {
      throw new Error(`청크 업로드 실패: ${response.statusText}`);
    }
  };
  
  const uploadFile = useCallback(async (file: File) => {
    try {
      setUploadStatus('validating');
      setErrorMessage(null);
      
      // 파일 검증
      if (!validateFile(file)) {
        setUploadStatus('failed');
        return;
      }
      
      // 썸네일 생성
      setUploadStatus('generating_thumbnail');
      const thumbnail = await generateThumbnail(file);
      setThumbnailUrl(thumbnail);
      
      // 청크 업로드 준비
      setUploadStatus('uploading');
      abortControllerRef.current = new AbortController();
      
      const fileId = crypto.randomUUID();
      const totalChunks = Math.ceil(file.size / chunkSize);
      let uploadedChunks = 0;
      
      // 청크별 업로드
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        await uploadChunk(chunk, i, totalChunks, fileId);
        
        uploadedChunks++;
        const progressPercent = Math.round((uploadedChunks / totalChunks) * 100);
        setProgress(progressPercent);
        
        onProgressUpdate?.({
          status: 'uploading',
          progress: progressPercent,
          speed: undefined,
          timeRemaining: undefined
        });
      }
      
      // 업로드 완료
      setUploadStatus('completed');
      onUploadComplete(fileId, {
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        thumbnailUrl: thumbnail
      });
      
    } catch (error) {
      setUploadStatus('failed');
      const errorMsg = error instanceof Error ? error.message : '업로드 실패';
      setErrorMessage(errorMsg);
      onError?.(error instanceof Error ? error : new Error(errorMsg));
    }
  }, [validateFile, generateThumbnail, chunkSize, uploadUrl, onUploadComplete, onProgressUpdate, onError]);

  // ============================================================
  // Drag & Drop Handlers
  // ============================================================
  
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find(file => file.type.startsWith('video/'));
    
    if (videoFile) {
      uploadFile(videoFile);
    } else {
      setErrorMessage('비디오 파일을 선택해주세요.');
    }
  }, [disabled, uploadFile]);
  
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  }, [uploadFile]);
  
  const handleClick = useCallback(() => {
    if (!disabled && uploadStatus === 'idle') {
      fileInputRef.current?.click();
    }
  }, [disabled, uploadStatus]);
  
  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setUploadStatus('idle');
    setProgress(0);
    setThumbnailUrl(null);
    setErrorMessage(null);
  }, []);

  // ============================================================
  // Progress Bar Component
  // ============================================================
  
  const ProgressBar: React.FC = () => (
    <div className="w-full bg-neutral-200 rounded-full h-2 mt-4">
      <div
        className="bg-vridge-600 h-2 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="업로드 진행률"
      />
    </div>
  );

  // ============================================================
  // Render
  // ============================================================
  
  return (
    <div className="w-full">
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8
          transition-all duration-200
          ${isDragging ? 'border-vridge-600 bg-vridge-50' : 'border-neutral-300 bg-white'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-vridge-500'}
          ${uploadStatus !== 'idle' ? 'pointer-events-none' : ''}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="비디오 파일 선택 영역"
        aria-disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          onChange={handleFileSelect}
          disabled={disabled}
          className="sr-only"
          aria-label="비디오 파일 선택"
        />
        
        {/* Upload States */}
        {uploadStatus === 'idle' && (
          <div className="text-center">
            {/* Upload Icon */}
            <svg
              className="mx-auto h-12 w-12 text-neutral-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            
            <p className="text-base font-medium text-neutral-900 mb-1">
              비디오 파일을 드래그하거나 클릭하여 선택
            </p>
            <p className="text-sm text-neutral-600">
              MP4, WebM, MOV, AVI, MKV (최대 5GB)
            </p>
          </div>
        )}
        
        {uploadStatus === 'generating_thumbnail' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-vridge-600 mx-auto mb-4" />
            <p className="text-base font-medium text-neutral-900">
              썸네일 생성 중...
            </p>
          </div>
        )}
        
        {uploadStatus === 'uploading' && (
          <div className="text-center">
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt="비디오 썸네일"
                className="mx-auto mb-4 rounded-lg shadow-md max-h-40"
              />
            )}
            <p className="text-base font-medium text-neutral-900 mb-2">
              업로드 중... {progress}%
            </p>
            <ProgressBar />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancel();
              }}
              className="mt-4 px-4 py-2 text-sm font-medium text-error-600 hover:text-error-700 transition-colors"
              aria-label="업로드 취소"
            >
              취소
            </button>
          </div>
        )}
        
        {uploadStatus === 'completed' && (
          <div className="text-center">
            {thumbnailUrl && (
              <img
                src={thumbnailUrl}
                alt="비디오 썸네일"
                className="mx-auto mb-4 rounded-lg shadow-md max-h-40"
              />
            )}
            {/* Success Icon */}
            <svg
              className="mx-auto h-12 w-12 text-success-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-base font-medium text-success-600">
              업로드 완료!
            </p>
          </div>
        )}
        
        {uploadStatus === 'failed' && errorMessage && (
          <div className="text-center">
            {/* Error Icon */}
            <svg
              className="mx-auto h-12 w-12 text-error-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-base font-medium text-error-600 mb-2">
              업로드 실패
            </p>
            <p className="text-sm text-neutral-600">
              {errorMessage}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUploadStatus('idle');
                setErrorMessage(null);
              }}
              className="mt-4 px-4 py-2 text-sm font-medium text-vridge-600 hover:text-vridge-700 transition-colors"
              aria-label="다시 시도"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
      
      {/* Screen Reader Announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {uploadStatus === 'uploading' && `업로드 진행 중: ${progress}%`}
        {uploadStatus === 'completed' && '업로드가 완료되었습니다'}
        {uploadStatus === 'failed' && `업로드 실패: ${errorMessage}`}
      </div>
    </div>
  );
};