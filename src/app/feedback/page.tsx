'use client'

import { useEffect, useState, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store'
import {
  loadVideoSuccess,
  loadCommentsSuccess,
  selectComment,
  play,
  pause,
  seek,
  enterDrawingMode,
  exitDrawingMode,
  addCommentSuccess
} from '@/features/video-feedback/model/videoFeedbackSlice'
import type { CreateCommentData } from '@/features/video-feedback/model/types'
import { PageLayout } from '@/widgets/PageLayout'
import { VideoPlayer, type VideoPlayerRef } from '@/shared/ui/VideoPlayer'
import { CommentSystem } from '@/features/video-feedback/ui/CommentSystem'
import { Button } from '@/shared/ui/Button'
import { Typography } from '@/shared/ui/Typography'

export default function FeedbackPage() {
  const dispatch = useAppDispatch()
  const { 
    currentVideo, 
    comments, 
    selectedComment, 
    playbackState, 
    canvasState,
    realtimeUsers
  } = useAppSelector((state) => state.videoFeedback)

  // Refs
  const videoPlayerRef = useRef<VideoPlayerRef>(null)
  
  // State
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [newComment, setNewComment] = useState('')

  // 초기 비디오 및 댓글 데이터 로드 (실제로는 API에서)
  useEffect(() => {
    // 목업 비디오 데이터
    const mockVideo = {
      id: 'video_123',
      projectId: 'project_456',
      fileName: 'sample-video.mp4',
      originalFileName: 'Marketing Campaign Final.mp4',
      fileUrl: '/videos/sample-video.mp4',
      thumbnailUrl: '/thumbnails/sample-video.jpg',
      duration: 180, // 3분
      resolution: { width: 1920, height: 1080 },
      fileSize: 75000000, // 75MB
      format: 'mp4',
      uploadedAt: new Date().toISOString(),
      uploadedBy: {
        id: 'user_789',
        name: '김감독',
        avatar: '/avatars/kim.jpg'
      },
      version: 2,
      status: 'ready' as const,
      metadata: {
        fps: 30,
        bitrate: 2500,
        codec: 'h264',
        hasAudio: true
      },
      permissions: {
        canComment: true,
        canEdit: true,
        canDelete: false,
        canShare: true,
        canDownload: true
      },
      settings: {
        allowAnonymousComments: false,
        requireApproval: false,
        autoplay: false,
        showTimestamps: true,
        allowDrawing: true
      }
    }

    // 목업 댓글 데이터
    const mockComments = [
      {
        id: 'comment_1',
        videoId: 'video_123',
        author: {
          id: 'user_456',
          name: '박클라이언트',
          avatar: '/avatars/park.jpg',
          role: 'client'
        },
        content: '로고가 좀 더 크게 나오면 좋겠어요. 브랜딩이 중요하거든요.',
        timestamp: 45.2,
        type: 'text' as const,
        status: 'pending' as const,
        priority: 'high' as const,
        tags: ['브랜딩', '로고'],
        reactions: [
          {
            emoji: '👍',
            users: [{ id: 'user_789', name: '김감독' }],
            count: 1
          }
        ],
        mentions: ['user_789'],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2시간 전
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        isEdited: false,
        isPinned: true,
        isPrivate: false
      },
      {
        id: 'comment_2', 
        videoId: 'video_123',
        author: {
          id: 'user_101',
          name: '이편집자',
          avatar: '/avatars/lee.jpg',
          role: 'editor'
        },
        content: '이 부분 색보정이 다른 씬과 톤이 맞지 않는 것 같습니다.',
        timestamp: 120.8,
        type: 'text' as const,
        status: 'pending' as const,
        priority: 'medium' as const,
        tags: ['색보정', '후반작업'],
        reactions: [],
        mentions: [],
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1시간 전
        updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        isEdited: false,
        isPinned: false,
        isPrivate: false
      }
    ]

    dispatch(loadVideoSuccess({ video: mockVideo }))
    dispatch(loadCommentsSuccess({ comments: mockComments }))
  }, [dispatch])

  // 현재 사용자 정보 (실제로는 인증 상태에서 가져옴)
  const currentUser = {
    id: 'current_user',
    name: '현재 사용자',
    avatar: '/avatars/current.jpg',
    role: 'member',
    color: '#9C88FF'
  }

  // 비디오 플레이어 이벤트 핸들러
  const handleVideoPlay = () => {
    dispatch(play())
  }

  const handleVideoPause = () => {
    dispatch(pause())
  }

  const handleVideoSeek = (time: number) => {
    dispatch(seek(time))
  }

  const handleVideoTimeUpdate = (time: number) => {
    // 실시간 시간 업데이트는 이미 Redux에서 관리
  }

  // 댓글 시스템 이벤트 핸들러
  const handleCommentAdd = (data: CreateCommentData & { parentId?: string }) => {
    const comment = {
      id: `comment_${Date.now()}`,
      videoId: currentVideo?.id || 'video_123',
      parentId: data.parentId || null,
      author: currentUser,
      content: data.content,
      timestamp: data.timestamp,
      type: data.type,
      status: 'pending' as const,
      priority: data.priority,
      tags: data.tags || [],
      reactions: [],
      mentions: data.mentions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEdited: false,
      isPinned: false,
      isPrivate: data.isPrivate || false,
      drawingData: data.drawingData || null,
      attachments: []
    }

    dispatch(addCommentSuccess({ comment }))
  }

  const handleCommentSelect = (commentId: string | null) => {
    dispatch(selectComment(commentId))
  }

  const handleTimeSeek = (time: number) => {
    dispatch(seek(time))
    videoPlayerRef.current?.seek(time)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!currentVideo) {
    return (
      <PageLayout title="비디오 피드백 - 로딩">
        <div className="flex items-center justify-center min-h-screen">
          <Typography variant="h2" className="text-gray-500">
            비디오를 불러오는 중...
          </Typography>
        </div>
      </PageLayout>
    )
  }

  // 댓글 마커 생성 (타임라인 표시용)
  const commentMarkers = comments.map(comment => ({
    id: comment.id,
    time: comment.timestamp,
    type: comment.priority === 'high' ? 'important' as const : 
          comment.status === 'approved' ? 'approved' as const :
          'comment' as const,
    author: comment.author.name,
    content: comment.content
  }))

  return (
    <PageLayout title="비디오 피드백">
      <div className="h-screen flex flex-col">
        {/* 헤더 */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <Typography variant="h1" className="text-2xl font-bold text-gray-900 mb-1">
                비디오 피드백
              </Typography>
              <Typography variant="body" className="text-gray-600 mb-1">
                {currentVideo.originalFileName}
              </Typography>
              <Typography variant="body2" className="text-gray-500">
                업로드: {currentVideo.uploadedBy.name} • {new Date(currentVideo.uploadedAt).toLocaleDateString('ko-KR')}
              </Typography>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => dispatch(canvasState.isDrawingMode ? exitDrawingMode() : enterDrawingMode())}
                variant={canvasState.isDrawingMode ? 'primary' : 'outline'}
                data-testid="drawing-mode-toggle"
              >
                {canvasState.isDrawingMode ? '드로잉 종료' : '드로잉 모드'}
              </Button>
            </div>
          </div>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 비디오 플레이어 영역 */}
          <div className="flex-1 flex flex-col p-6">
            <div className="flex-1">
              <VideoPlayer
                ref={videoPlayerRef}
                src={currentVideo.fileUrl}
                poster={currentVideo.thumbnailUrl}
                title={currentVideo.originalFileName}
                size="full"
                enableQualitySelector
                enableSpeedControl
                enableFullscreen
                enableKeyboardShortcuts
                enableTimecodeDisplay
                enableCommentMarkers
                commentMarkers={commentMarkers}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onSeek={handleVideoSeek}
                onTimeUpdate={handleVideoTimeUpdate}
                onCommentMarkerClick={(markerId, time) => {
                  handleCommentSelect(markerId)
                  handleTimeSeek(time)
                }}
                data-testid="video-player"
              />
            </div>

            {/* 비디오 정보 */}
            <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
              <Typography variant="h3" className="text-lg font-semibold mb-3">
                비디오 정보
              </Typography>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div data-testid="video-resolution">
                  <Typography variant="body2" className="text-gray-500 mb-1">해상도</Typography>
                  <Typography variant="body2">{currentVideo.resolution.width}×{currentVideo.resolution.height}</Typography>
                </div>
                <div data-testid="video-duration">
                  <Typography variant="body2" className="text-gray-500 mb-1">길이</Typography>
                  <Typography variant="body2">{formatTime(currentVideo.duration)}</Typography>
                </div>
                <div data-testid="video-filesize">
                  <Typography variant="body2" className="text-gray-500 mb-1">파일 크기</Typography>
                  <Typography variant="body2">{Math.round(currentVideo.fileSize / 1024 / 1024)}MB</Typography>
                </div>
                <div>
                  <Typography variant="body2" className="text-gray-500 mb-1">버전</Typography>
                  <Typography variant="body2">v{currentVideo.version}</Typography>
                </div>
              </div>
            </div>
          </div>

          {/* 댓글 시스템 */}
          <CommentSystem
            video={currentVideo}
            currentTime={playbackState.currentTime}
            duration={playbackState.duration}
            comments={comments}
            selectedCommentId={selectedComment}
            realtimeUsers={realtimeUsers}
            currentUser={currentUser}
            enableRealtime
            enableThreads
            enableMentions
            enableReactions
            enablePriority
            enableTags
            onCommentAdd={handleCommentAdd}
            onCommentSelect={handleCommentSelect}
            onTimeSeek={handleTimeSeek}
            size="xl"
            data-testid="comment-system"
          />
        </div>
      </div>
    </PageLayout>
  )
}