/**
 * VideoIntegration API 클라이언트
 * Phase 2 - 비디오 통합 서비스 API
 */

import type { CaptionTrack, VideoQualityOption, VideoStats } from '../model/types'

/**
 * 비디오 품질 옵션 조회
 */
export async function getVideoQualityOptions(videoId: string): Promise<VideoQualityOption[]> {
  try {
    const response = await fetch(`/api/videos/${videoId}/quality-options`)
    if (!response.ok) {
      throw new Error(`품질 옵션 조회 실패: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('비디오 품질 옵션 조회 중 오류:', error)
    
    // 기본 품질 옵션 반환
    return [
      {
        label: '자동',
        value: 'auto',
        bitrate: 0,
        resolution: { width: 0, height: 0 },
        isActive: true,
        isAvailable: true
      },
      {
        label: '1080p',
        value: '1080p',
        bitrate: 5000000,
        resolution: { width: 1920, height: 1080 },
        isActive: false,
        isAvailable: true
      },
      {
        label: '720p',
        value: '720p',
        bitrate: 2500000,
        resolution: { width: 1280, height: 720 },
        isActive: false,
        isAvailable: true
      },
      {
        label: '480p',
        value: '480p',
        bitrate: 1000000,
        resolution: { width: 854, height: 480 },
        isActive: false,
        isAvailable: true
      }
    ]
  }
}

/**
 * 자막 트랙 조회
 */
export async function getCaptionTracks(videoId: string): Promise<CaptionTrack[]> {
  try {
    const response = await fetch(`/api/videos/${videoId}/captions`)
    if (!response.ok) {
      throw new Error(`자막 트랙 조회 실패: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('자막 트랙 조회 중 오류:', error)
    
    // 기본 자막 트랙 반환
    return [
      {
        id: 'ko',
        language: 'ko',
        label: '한국어',
        kind: 'captions',
        src: `/api/videos/${videoId}/captions/ko.vtt`,
        isDefault: true,
        isActive: false
      },
      {
        id: 'en',
        language: 'en',
        label: 'English',
        kind: 'captions',
        src: `/api/videos/${videoId}/captions/en.vtt`,
        isDefault: false,
        isActive: false
      }
    ]
  }
}

/**
 * 비디오 통계 저장
 */
export async function saveVideoStats(videoId: string, stats: VideoStats): Promise<void> {
  try {
    const response = await fetch(`/api/videos/${videoId}/stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        stats
      })
    })
    
    if (!response.ok) {
      throw new Error(`통계 저장 실패: ${response.status}`)
    }
  } catch (error) {
    console.error('비디오 통계 저장 중 오류:', error)
    // 통계 저장 실패는 치명적이지 않으므로 무시
  }
}

/**
 * 사용자 접근성 설정 저장
 */
export async function saveAccessibilityPreferences(preferences: {
  captionsEnabled: boolean
  captionLanguage: string
  captionFontSize: string
  audioDescriptionEnabled: boolean
  keyboardShortcutsEnabled: boolean
  highContrastEnabled: boolean
  reducedMotionEnabled: boolean
}): Promise<void> {
  try {
    const response = await fetch('/api/user/accessibility-preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferences)
    })
    
    if (!response.ok) {
      throw new Error(`접근성 설정 저장 실패: ${response.status}`)
    }
  } catch (error) {
    console.error('접근성 설정 저장 중 오류:', error)
    // 로컬 스토리지에 백업 저장
    try {
      localStorage.setItem('video-accessibility-preferences', JSON.stringify(preferences))
    } catch (localStorageError) {
      console.error('로컬 스토리지 저장 실패:', localStorageError)
    }
  }
}

/**
 * 사용자 접근성 설정 조회
 */
export async function getAccessibilityPreferences(): Promise<{
  captionsEnabled: boolean
  captionLanguage: string
  captionFontSize: string
  audioDescriptionEnabled: boolean
  keyboardShortcutsEnabled: boolean
  highContrastEnabled: boolean
  reducedMotionEnabled: boolean
} | null> {
  try {
    const response = await fetch('/api/user/accessibility-preferences')
    if (!response.ok) {
      throw new Error(`접근성 설정 조회 실패: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('접근성 설정 조회 중 오류:', error)
    
    // 로컬 스토리지에서 백업 조회
    try {
      const stored = localStorage.getItem('video-accessibility-preferences')
      return stored ? JSON.parse(stored) : null
    } catch (localStorageError) {
      console.error('로컬 스토리지 조회 실패:', localStorageError)
      return null
    }
  }
}

/**
 * 비디오 협업 세션 생성
 */
export async function createCollaborationSession(videoId: string, options: {
  syncPlayback: boolean
  allowMarkers: boolean
  maxParticipants: number
}): Promise<{
  sessionId: string
  wsUrl: string
  token: string
}> {
  try {
    const response = await fetch(`/api/videos/${videoId}/collaboration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(options)
    })
    
    if (!response.ok) {
      throw new Error(`협업 세션 생성 실패: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('협업 세션 생성 중 오류:', error)
    throw error
  }
}

/**
 * 비디오 협업 세션 참여
 */
export async function joinCollaborationSession(sessionId: string): Promise<{
  wsUrl: string
  token: string
  sessionInfo: {
    participants: number
    isLeader: boolean
    syncEnabled: boolean
  }
}> {
  try {
    const response = await fetch(`/api/collaboration/${sessionId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`협업 세션 참여 실패: ${response.status}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('협업 세션 참여 중 오류:', error)
    throw error
  }
}