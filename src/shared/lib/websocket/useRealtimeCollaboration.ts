/**
 * useRealtimeCollaboration Hook
 * 실시간 협업 기능을 위한 React Hook
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { 
  RealtimeCollaborationManager, 
  CollaborationConfig, 
  RealtimeEvent, 
  CollaborationUser 
} from './RealtimeCollaborationManager'

interface UseRealtimeCollaborationOptions extends Omit<CollaborationConfig, 'userId' | 'userName'> {
  user: {
    id: string
    name: string
    color?: string
    avatar?: string
  }
  onCommentAdded?: (event: RealtimeEvent) => void
  onCommentUpdated?: (event: RealtimeEvent) => void
  onCommentDeleted?: (event: RealtimeEvent) => void
  onCommentResolved?: (event: RealtimeEvent) => void
  onUserJoined?: (event: RealtimeEvent) => void
  onUserLeft?: (event: RealtimeEvent) => void
  onUserTyping?: (event: RealtimeEvent) => void
  onCursorMoved?: (event: RealtimeEvent) => void
  onSelectionChanged?: (event: RealtimeEvent) => void
  onDocumentOperation?: (event: RealtimeEvent) => void
  onProjectUpdated?: (event: RealtimeEvent) => void
}

interface UseRealtimeCollaborationReturn {
  // 상태
  users: CollaborationUser[]
  isConnected: boolean
  isTyping: Record<string, boolean>
  
  // 댓글 기능
  addComment: (content: string, videoTimestamp: number, parentId?: string) => string
  updateComment: (commentId: string, content: string) => void
  deleteComment: (commentId: string) => void
  resolveComment: (commentId: string) => void
  
  // 사용자 상호작용
  setTyping: (isTyping: boolean, commentId?: string) => void
  updateCursor: (position: { x: number; y: number; element?: string }) => void
  updateSelection: (selection?: { startTime: number; endTime: number; elementId?: string }) => void
  
  // OT 기능 (활성화된 경우)
  applyOperation?: (operation: {
    type: 'insert' | 'delete' | 'retain' | 'format'
    position: number
    content?: string
    attributes?: Record<string, unknown>
    length?: number
  }) => string
  
  // 협업 제어
  start: () => Promise<void>
  stop: () => void
  
  // 유틸리티
  getUser: (userId: string) => CollaborationUser | undefined
  getUsersInProject: () => CollaborationUser[]
  getTypingUsers: () => CollaborationUser[]
}

/**
 * 실시간 협업 Hook
 */
export function useRealtimeCollaboration(
  options: UseRealtimeCollaborationOptions
): UseRealtimeCollaborationReturn {
  const {
    user,
    projectId,
    userColor = `#${Math.floor(Math.random()*16777215).toString(16)}`, // 랜덤 색상
    avatar,
    conflictResolution = 'latest_wins',
    enableCursorTracking = true,
    enableTypingIndicators = true,
    enableOperationalTransform = false,
    maxOperationsBuffer = 100,
    syncInterval = 1000,
    onCommentAdded,
    onCommentUpdated,
    onCommentDeleted,
    onCommentResolved,
    onUserJoined,
    onUserLeft,
    onUserTyping,
    onCursorMoved,
    onSelectionChanged,
    onDocumentOperation,
    onProjectUpdated
  } = options

  // State
  const [users, setUsers] = useState<CollaborationUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTypingState] = useState<Record<string, boolean>>({})
  
  // Refs
  const managerRef = useRef<RealtimeCollaborationManager>()
  const isInitializedRef = useRef(false)

  // 협업 매니저 초기화
  const initializeManager = useCallback(() => {
    if (isInitializedRef.current || !projectId) return

    const config: CollaborationConfig = {
      projectId,
      userId: user.id,
      userName: user.name,
      userColor: user.color || userColor,
      avatar,
      conflictResolution,
      enableCursorTracking,
      enableTypingIndicators,
      enableOperationalTransform,
      maxOperationsBuffer,
      syncInterval
    }

    managerRef.current = new RealtimeCollaborationManager(config)
    
    // 이벤트 리스너 등록
    const eventHandlers = {
      comment_added: onCommentAdded,
      comment_updated: onCommentUpdated,
      comment_deleted: onCommentDeleted,
      comment_resolved: onCommentResolved,
      user_joined: (event: RealtimeEvent) => {
        updateUsers()
        onUserJoined?.(event)
      },
      user_left: (event: RealtimeEvent) => {
        updateUsers()
        onUserLeft?.(event)
      },
      user_typing: (event: RealtimeEvent) => {
        if (event.type === 'user_typing') {
          setIsTypingState(prev => ({
            ...prev,
            [event.data.userId]: event.data.isTyping
          }))
        }
        onUserTyping?.(event)
      },
      cursor_moved: onCursorMoved,
      selection_changed: onSelectionChanged,
      document_operation: onDocumentOperation,
      project_updated: onProjectUpdated
    }

    Object.entries(eventHandlers).forEach(([eventType, handler]) => {
      if (handler && managerRef.current) {
        managerRef.current.on(eventType as RealtimeEvent['type'], handler)
      }
    })

    isInitializedRef.current = true
  }, [
    projectId,
    user.id,
    user.name,
    user.color,
    userColor,
    avatar,
    conflictResolution,
    enableCursorTracking,
    enableTypingIndicators,
    enableOperationalTransform,
    maxOperationsBuffer,
    syncInterval,
    onCommentAdded,
    onCommentUpdated,
    onCommentDeleted,
    onCommentResolved,
    onUserJoined,
    onUserLeft,
    onUserTyping,
    onCursorMoved,
    onSelectionChanged,
    onDocumentOperation,
    onProjectUpdated
  ])

  // 사용자 목록 업데이트
  const updateUsers = useCallback(() => {
    if (managerRef.current) {
      const collaborationUsers = managerRef.current.getCollaborationUsers()
      setUsers(collaborationUsers)
    }
  }, [])

  // 연결 상태 체크
  const checkConnection = useCallback(() => {
    if (managerRef.current) {
      setIsConnected(managerRef.current.isConnected())
    }
  }, [])

  // API 메서드들
  const addComment = useCallback((content: string, videoTimestamp: number, parentId?: string): string => {
    if (!managerRef.current) throw new Error('Collaboration manager not initialized')
    return managerRef.current.addComment(content, videoTimestamp, parentId)
  }, [])

  const updateComment = useCallback((commentId: string, content: string): void => {
    if (!managerRef.current) throw new Error('Collaboration manager not initialized')
    managerRef.current.updateComment(commentId, content)
  }, [])

  const deleteComment = useCallback((commentId: string): void => {
    if (!managerRef.current) throw new Error('Collaboration manager not initialized')
    managerRef.current.deleteComment(commentId)
  }, [])

  const resolveComment = useCallback((commentId: string): void => {
    if (!managerRef.current) throw new Error('Collaboration manager not initialized')
    managerRef.current.resolveComment(commentId)
  }, [])

  const setTyping = useCallback((typing: boolean, commentId?: string): void => {
    if (!managerRef.current) return
    managerRef.current.setTyping(typing, commentId)
  }, [])

  const updateCursor = useCallback((position: { x: number; y: number; element?: string }): void => {
    if (!managerRef.current) return
    managerRef.current.updateCursor(position)
  }, [])

  const updateSelection = useCallback((selection?: { startTime: number; endTime: number; elementId?: string }): void => {
    if (!managerRef.current) return
    managerRef.current.updateSelection(selection)
  }, [])

  const applyOperation = enableOperationalTransform ? useCallback((operation: {
    type: 'insert' | 'delete' | 'retain' | 'format'
    position: number
    content?: string
    attributes?: Record<string, unknown>
    length?: number
  }): string => {
    if (!managerRef.current) throw new Error('Collaboration manager not initialized')
    return managerRef.current.applyOperation(operation)
  }, []) : undefined

  const start = useCallback(async (): Promise<void> => {
    if (!managerRef.current) {
      initializeManager()
    }
    
    if (managerRef.current) {
      await managerRef.current.start()
      checkConnection()
      updateUsers()
    }
  }, [initializeManager, checkConnection, updateUsers])

  const stop = useCallback((): void => {
    if (managerRef.current) {
      managerRef.current.stop()
      setIsConnected(false)
      setUsers([])
      setIsTypingState({})
    }
  }, [])

  const getUser = useCallback((userId: string): CollaborationUser | undefined => {
    if (!managerRef.current) return undefined
    return managerRef.current.getUser(userId)
  }, [])

  const getUsersInProject = useCallback((): CollaborationUser[] => {
    return users.filter(user => user.isOnline)
  }, [users])

  const getTypingUsers = useCallback((): CollaborationUser[] => {
    return users.filter(user => user.isTyping && user.id !== user.id)
  }, [users, user.id])

  // 초기화
  useEffect(() => {
    initializeManager()
    
    // 연결 상태 모니터링
    const connectionCheckInterval = setInterval(checkConnection, 2000)
    
    return () => {
      clearInterval(connectionCheckInterval)
      // 컴포넌트 언마운트 시 협업 세션 종료
      if (managerRef.current) {
        managerRef.current.stop()
      }
    }
  }, [initializeManager, checkConnection])

  // 반환 객체
  const returnValue: UseRealtimeCollaborationReturn = useMemo(() => ({
    // 상태
    users,
    isConnected,
    isTyping,
    
    // 댓글 기능
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    
    // 사용자 상호작용
    setTyping,
    updateCursor,
    updateSelection,
    
    // 협업 제어
    start,
    stop,
    
    // 유틸리티
    getUser,
    getUsersInProject,
    getTypingUsers,
    
    // OT 기능 (조건부)
    ...(enableOperationalTransform && { applyOperation })
  }), [
    users,
    isConnected,
    isTyping,
    addComment,
    updateComment,
    deleteComment,
    resolveComment,
    setTyping,
    updateCursor,
    updateSelection,
    start,
    stop,
    getUser,
    getUsersInProject,
    getTypingUsers,
    enableOperationalTransform,
    applyOperation
  ])

  return returnValue
}