/**
 * @description Video Feedback API Layer
 * @purpose Mock 데이터와 실제 API 호출을 위한 인터페이스 제공
 */

import type {
  VideoFeedbackSession,
  VideoFeedbackResponse,
  VideoFeedbackListResponse,
  TimestampComment,
  VideoMarker,
  FeedbackStatus,
  FeedbackStats,
  VideoMetadata
} from '../model/types';

// Mock 데이터
const mockVideoMetadata: VideoMetadata = {
  id: 'video-001',
  filename: 'brand_promotion_v2.mp4',
  url: '/api/videos/brand_promotion_v2.mp4',
  thumbnail: '/api/videos/thumbnails/brand_promotion_v2.jpg',
  duration: 180, // 3분
  fileSize: 52428800, // 50MB
  format: 'mp4',
  resolution: {
    width: 1920,
    height: 1080
  },
  uploadedAt: '2025-08-25T14:30:00Z',
  uploadedBy: 'user-editor-001'
};

const mockComments: TimestampComment[] = [
  {
    id: 'comment-001',
    videoId: 'video-001',
    timestamp: 15.5,
    x: 45.2,
    y: 32.1,
    content: '로고 크기가 너무 작아서 브랜드 인지도가 떨어질 것 같습니다. 좀 더 크게 해주세요.',
    author: {
      id: 'user-client-001',
      name: '김클라이언트',
      avatar: '/avatars/client-001.jpg',
      role: 'client'
    },
    createdAt: '2025-08-26T09:15:00Z',
    status: 'open',
    priority: 'high',
    tags: ['로고', '브랜딩']
  },
  {
    id: 'comment-002',
    videoId: 'video-001',
    timestamp: 45.0,
    content: '배경음악이 너무 커서 내레이션이 잘 들리지 않습니다.',
    author: {
      id: 'user-reviewer-001',
      name: '박검토자',
      avatar: '/avatars/reviewer-001.jpg',
      role: 'reviewer'
    },
    createdAt: '2025-08-26T09:32:00Z',
    status: 'open',
    priority: 'urgent',
    tags: ['음향', '믹싱']
  },
  {
    id: 'comment-003',
    videoId: 'video-001',
    timestamp: 90.5,
    x: 75.8,
    y: 20.3,
    content: '이 장면의 색감이 이전 씬과 달라서 일관성이 떨어져 보입니다.',
    author: {
      id: 'user-editor-002',
      name: '최편집자',
      avatar: '/avatars/editor-002.jpg',
      role: 'editor'
    },
    createdAt: '2025-08-26T10:45:00Z',
    status: 'resolved',
    priority: 'medium',
    tags: ['색보정', '연출']
  },
  {
    id: 'comment-004',
    videoId: 'video-001',
    timestamp: 120.0,
    content: '마지막 CTA 버튼의 애니메이션이 너무 빨라서 읽기 어렵습니다.',
    author: {
      id: 'user-client-002',
      name: '이담당자',
      avatar: '/avatars/client-002.jpg',
      role: 'client'
    },
    createdAt: '2025-08-26T11:20:00Z',
    status: 'open',
    priority: 'medium',
    tags: ['애니메이션', 'CTA']
  },
  {
    id: 'comment-005',
    videoId: 'video-001',
    timestamp: 165.2,
    x: 30.5,
    y: 80.7,
    content: '엔드 크레딧에 저작권 표시가 빠져있습니다.',
    author: {
      id: 'user-admin-001',
      name: '관리자',
      avatar: '/avatars/admin-001.jpg',
      role: 'admin'
    },
    createdAt: '2025-08-26T12:00:00Z',
    status: 'open',
    priority: 'high',
    tags: ['법무', '저작권']
  }
];

const mockMarkers: VideoMarker[] = [
  {
    id: 'marker-001',
    videoId: 'video-001',
    timestamp: 15.5,
    type: 'rectangle',
    coordinates: {
      x: 40.0,
      y: 25.0,
      width: 15.0,
      height: 20.0
    },
    style: {
      color: '#ff4444',
      strokeWidth: 2,
      opacity: 0.8
    },
    linkedCommentId: 'comment-001',
    createdBy: 'user-client-001',
    createdAt: '2025-08-26T09:15:30Z'
  },
  {
    id: 'marker-002',
    videoId: 'video-001',
    timestamp: 90.5,
    type: 'circle',
    coordinates: {
      x: 75.8,
      y: 20.3,
      radius: 8.0
    },
    style: {
      color: '#ffaa00',
      strokeWidth: 3,
      opacity: 0.9
    },
    linkedCommentId: 'comment-003',
    createdBy: 'user-editor-002',
    createdAt: '2025-08-26T10:45:15Z'
  }
];

const mockFeedbackSession: VideoFeedbackSession = {
  id: 'session-001',
  projectId: 'project-brand-promo',
  videoMetadata: mockVideoMetadata,
  status: 'in_review',
  title: '브랜드 홍보 영상 v2.0 피드백',
  description: '클라이언트 1차 검토 후 수정된 버전입니다. 로고 크기와 음향 밸런스를 조정했습니다.',
  version: 'v2.0',
  createdBy: 'user-editor-001',
  createdAt: '2025-08-25T14:30:00Z',
  updatedAt: '2025-08-26T12:00:00Z',
  deadline: '2025-08-28T18:00:00Z',
  reviewers: ['user-client-001', 'user-client-002', 'user-reviewer-001'],
  comments: mockComments,
  markers: mockMarkers,
  totalComments: 5,
  resolvedComments: 1,
  pendingComments: 4
};

const mockStats: FeedbackStats = {
  totalSessions: 12,
  activeSessions: 3,
  completedSessions: 9,
  averageResolutionTime: 48, // 48시간
  commentsByStatus: {
    open: 15,
    resolved: 8,
    archived: 2
  },
  commentsByPriority: {
    low: 3,
    medium: 12,
    high: 7,
    urgent: 3
  }
};

// API 함수들
export class VideoFeedbackApi {
  private static baseUrl = '/api/video-feedback';

  /**
   * 비디오 피드백 세션 조회
   */
  static async getSession(sessionId: string): Promise<VideoFeedbackResponse> {
    // TODO: 실제 API 호출로 교체
    // 테스트 환경에서는 지연 없이 즉시 응답
    if (process.env.NODE_ENV !== 'test') {
      await this.delay(100); // 개발 환경에서만 지연
    }

    if (sessionId === 'session-001') {
      return {
        session: mockFeedbackSession,
        success: true
      };
    }

    if (sessionId === 'loading') {
      // 테스트용 무한 로딩 - 테스트에서는 타임아웃으로 처리
      if (process.env.NODE_ENV === 'test') {
        await this.delay(5000); // 5초 후 타임아웃
        return {
          session: {} as VideoFeedbackSession,
          success: false,
          message: 'Loading timeout',
          errors: ['TIMEOUT']
        };
      } else {
        await new Promise(() => {}); // never resolves (개발 환경에서만)
      }
    }

    if (sessionId === 'not-found') {
      return {
        session: {} as VideoFeedbackSession,
        success: false,
        message: '세션을 찾을 수 없습니다.',
        errors: ['SESSION_NOT_FOUND']
      };
    }

    if (sessionId === 'network-error') {
      throw new Error('네트워크 오류가 발생했습니다');
    }

    return {
      session: {} as VideoFeedbackSession,
      success: false,
      message: '세션을 찾을 수 없습니다.',
      errors: ['SESSION_NOT_FOUND']
    };
  }

  /**
   * 피드백 세션 목록 조회
   */
  static async getSessions(
    page = 1,
    pageSize = 10,
    filters?: {
      status?: FeedbackStatus;
      projectId?: string;
      reviewerId?: string;
    }
  ): Promise<VideoFeedbackListResponse> {
    // TODO: 실제 API 호출로 교체
    if (process.env.NODE_ENV !== 'test') {
      await this.delay(600);
    }

    return {
      sessions: [mockFeedbackSession],
      total: 1,
      page,
      pageSize,
      hasMore: false
    };
  }

  /**
   * 새로운 코멘트 추가
   */
  static async addComment(
    sessionId: string,
    comment: Omit<TimestampComment, 'id' | 'createdAt'>
  ): Promise<VideoFeedbackResponse> {
    // TODO: 실제 API 호출로 교체
    if (process.env.NODE_ENV !== 'test') {
      await this.delay(500);
    }

    const newComment: TimestampComment = {
      ...comment,
      id: `comment-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    // Mock 데이터 업데이트
    mockFeedbackSession.comments.push(newComment);
    mockFeedbackSession.totalComments += 1;
    mockFeedbackSession.pendingComments += 1;

    return {
      session: mockFeedbackSession,
      success: true,
      message: '코멘트가 추가되었습니다.'
    };
  }

  /**
   * 코멘트 업데이트
   */
  static async updateComment(
    sessionId: string,
    commentId: string,
    updates: Partial<TimestampComment>
  ): Promise<VideoFeedbackResponse> {
    // TODO: 실제 API 호출로 교체
    if (process.env.NODE_ENV !== 'test') {
      await this.delay(400);
    }

    const commentIndex = mockFeedbackSession.comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) {
      return {
        session: {} as VideoFeedbackSession,
        success: false,
        message: '코멘트를 찾을 수 없습니다.',
        errors: ['COMMENT_NOT_FOUND']
      };
    }

    // Mock 데이터 업데이트
    mockFeedbackSession.comments[commentIndex] = {
      ...mockFeedbackSession.comments[commentIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    return {
      session: mockFeedbackSession,
      success: true,
      message: '코멘트가 업데이트되었습니다.'
    };
  }

  /**
   * 코멘트 삭제
   */
  static async deleteComment(
    sessionId: string,
    commentId: string
  ): Promise<VideoFeedbackResponse> {
    // TODO: 실제 API 호출로 교체
    if (process.env.NODE_ENV !== 'test') {
      await this.delay(400);
    }

    const commentIndex = mockFeedbackSession.comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) {
      return {
        session: {} as VideoFeedbackSession,
        success: false,
        message: '코멘트를 찾을 수 없습니다.',
        errors: ['COMMENT_NOT_FOUND']
      };
    }

    // Mock 데이터에서 삭제
    mockFeedbackSession.comments.splice(commentIndex, 1);
    mockFeedbackSession.totalComments -= 1;
    mockFeedbackSession.pendingComments -= 1;

    return {
      session: mockFeedbackSession,
      success: true,
      message: '코멘트가 삭제되었습니다.'
    };
  }

  /**
   * 코멘트 해결 처리
   */
  static async resolveComment(
    sessionId: string,
    commentId: string
  ): Promise<VideoFeedbackResponse> {
    // TODO: 실제 API 호출로 교체
    if (process.env.NODE_ENV !== 'test') {
      await this.delay(350);
    }

    const commentIndex = mockFeedbackSession.comments.findIndex(c => c.id === commentId);
    
    if (commentIndex === -1) {
      return {
        session: {} as VideoFeedbackSession,
        success: false,
        message: '코멘트를 찾을 수 없습니다.',
        errors: ['COMMENT_NOT_FOUND']
      };
    }

    // Mock 데이터 업데이트
    mockFeedbackSession.comments[commentIndex].status = 'resolved';
    mockFeedbackSession.comments[commentIndex].updatedAt = new Date().toISOString();
    mockFeedbackSession.resolvedComments += 1;
    mockFeedbackSession.pendingComments -= 1;

    return {
      session: mockFeedbackSession,
      success: true,
      message: '코멘트가 해결되었습니다.'
    };
  }

  /**
   * 비디오 마커 추가
   */
  static async addMarker(
    sessionId: string,
    marker: Omit<VideoMarker, 'id' | 'createdAt'>
  ): Promise<VideoFeedbackResponse> {
    // TODO: 실제 API 호출로 교체
    if (process.env.NODE_ENV !== 'test') {
      await this.delay(400);
    }

    const newMarker: VideoMarker = {
      ...marker,
      id: `marker-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    // Mock 데이터 업데이트
    mockFeedbackSession.markers.push(newMarker);

    return {
      session: mockFeedbackSession,
      success: true,
      message: '마커가 추가되었습니다.'
    };
  }

  /**
   * 피드백 세션 상태 변경
   */
  static async updateSessionStatus(
    sessionId: string,
    newStatus: FeedbackStatus
  ): Promise<VideoFeedbackResponse> {
    // TODO: 실제 API 호출로 교체
    if (process.env.NODE_ENV !== 'test') {
      await this.delay(500);
    }

    // Mock 데이터 업데이트
    mockFeedbackSession.status = newStatus;
    mockFeedbackSession.updatedAt = new Date().toISOString();

    return {
      session: mockFeedbackSession,
      success: true,
      message: `상태가 ${this.getStatusLabel(newStatus)}(으)로 변경되었습니다.`
    };
  }

  /**
   * 피드백 통계 조회
   */
  static async getStats(projectId?: string): Promise<{ stats: FeedbackStats; success: boolean }> {
    // TODO: 실제 API 호출로 교체
    if (process.env.NODE_ENV !== 'test') {
      await this.delay(300);
    }

    return {
      stats: mockStats,
      success: true
    };
  }

  // 유틸리티 메서드들
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static getStatusLabel(status: FeedbackStatus): string {
    const labels: Record<FeedbackStatus, string> = {
      draft: '초안',
      pending: '검토 대기',
      in_review: '검토중',
      revision_needed: '수정 필요',
      approved: '승인됨',
      rejected: '거절됨',
      completed: '완료'
    };
    return labels[status] || status;
  }

  /**
   * 타임스탬프를 포맷된 시간으로 변환
   */
  static formatTimestamp(timestamp: number): string {
    const hours = Math.floor(timestamp / 3600);
    const minutes = Math.floor((timestamp % 3600) / 60);
    const seconds = Math.floor(timestamp % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * 상대적 시간 표시 (예: "5분 전", "2시간 전")
   */
  static getRelativeTime(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return time.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}