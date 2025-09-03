/**
 * Realtime Collaboration Manager
 * 실시간 협업 기능을 위한 고수준 관리자 클래스
 * 
 * 기능:
 * - 실시간 댓글/피드백 동기화
 * - 사용자 상태 및 커서 추적
 * - Operational Transformation (OT) 지원
 * - 충돌 해결 및 동시 편집 관리
 * - 오프라인/온라인 동기화
 */

'use client'

import { z } from 'zod'
import { WebSocketClient, WebSocketMessage, getWebSocketClient } from './WebSocketClient'

// 실시간 이벤트 스키마 정의
export const RealtimeEventSchema = z.discriminatedUnion('type', [
  // 댓글 관련 이벤트
  z.object({
    type: z.literal('comment_added'),
    data: z.object({
      commentId: z.string(),
      content: z.string(),
      timestamp: z.number(),
      authorId: z.string(),
      projectId: z.string(),
      videoTimestamp: z.number(),
      parentId: z.string().optional()
    })
  }),
  z.object({
    type: z.literal('comment_updated'),
    data: z.object({
      commentId: z.string(),
      content: z.string(),
      authorId: z.string(),
      projectId: z.string()
    })
  }),
  z.object({
    type: z.literal('comment_deleted'),
    data: z.object({
      commentId: z.string(),
      authorId: z.string(),
      projectId: z.string()
    })
  }),
  z.object({
    type: z.literal('comment_resolved'),
    data: z.object({
      commentId: z.string(),
      resolvedBy: z.string(),
      projectId: z.string()
    })
  }),
  
  // 사용자 상태 이벤트
  z.object({
    type: z.literal('user_joined'),
    data: z.object({
      userId: z.string(),
      userName: z.string(),
      userColor: z.string(),
      projectId: z.string(),
      avatar: z.string().optional()
    })
  }),
  z.object({
    type: z.literal('user_left'),
    data: z.object({
      userId: z.string(),
      projectId: z.string()
    })
  }),
  z.object({
    type: z.literal('user_typing'),
    data: z.object({
      userId: z.string(),
      projectId: z.string(),
      isTyping: z.boolean(),
      commentId: z.string().optional()
    })
  }),
  
  // 커서 및 선택 영역 이벤트
  z.object({
    type: z.literal('cursor_moved'),
    data: z.object({
      userId: z.string(),
      projectId: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
        element: z.string().optional()
      })
    })
  }),
  z.object({
    type: z.literal('selection_changed'),
    data: z.object({
      userId: z.string(),
      projectId: z.string(),
      selection: z.object({
        startTime: z.number(),
        endTime: z.number(),
        elementId: z.string().optional()
      }).optional()
    })
  }),
  
  // 협업 편집 이벤트
  z.object({
    type: z.literal('document_operation'),
    data: z.object({
      operationId: z.string(),
      userId: z.string(),
      projectId: z.string(),
      operation: z.object({
        type: z.enum(['insert', 'delete', 'retain', 'format']),
        position: z.number(),
        content: z.string().optional(),
        attributes: z.record(z.unknown()).optional(),
        length: z.number().optional()
      }),
      timestamp: z.number(),
      vectorClock: z.record(z.number()).optional()
    })
  }),
  
  // 프로젝트 동기화 이벤트
  z.object({
    type: z.literal('project_updated'),
    data: z.object({
      projectId: z.string(),
      updatedBy: z.string(),
      changes: z.array(z.object({
        field: z.string(),
        oldValue: z.unknown(),
        newValue: z.unknown()
      }))
    })
  })
])

export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>

// 사용자 정보 타입
export interface CollaborationUser {
  id: string
  name: string
  color: string
  avatar?: string
  isOnline: boolean
  lastSeen: Date
  cursor?: {
    x: number
    y: number
    element?: string
  }
  selection?: {
    startTime: number
    endTime: number
    elementId?: string
  }
  isTyping: boolean
}

// 충돌 해결 정책
export type ConflictResolutionStrategy = 'latest_wins' | 'manual' | 'operational_transform'

// Operational Transformation 연산
export interface OTOperation {
  id: string
  type: 'insert' | 'delete' | 'retain' | 'format'
  position: number
  content?: string
  attributes?: Record<string, unknown>
  length?: number
  userId: string
  timestamp: number
  vectorClock?: Record<string, number>
}

// 협업 매니저 설정
export interface CollaborationConfig {
  projectId: string
  userId: string
  userName: string
  userColor: string
  avatar?: string
  conflictResolution: ConflictResolutionStrategy
  enableCursorTracking: boolean
  enableTypingIndicators: boolean
  enableOperationalTransform: boolean
  maxOperationsBuffer: number
  syncInterval: number
}

/**
 * 실시간 협업 매니저 클래스
 */
export class RealtimeCollaborationManager {
  private wsClient: WebSocketClient
  private config: CollaborationConfig
  private users = new Map<string, CollaborationUser>()
  private operationsBuffer: OTOperation[] = []
  private vectorClock: Record<string, number> = {}
  private isDestroyed = false
  
  // 이벤트 리스너들
  private eventListeners = new Map<string, Set<(event: RealtimeEvent) => void>>()
  
  // 타이핑 상태 관리
  private typingTimeouts = new Map<string, NodeJS.Timeout>()
  private currentTypingState = false
  
  // OT 관련 상태
  private pendingOperations = new Map<string, OTOperation>()
  private lastAppliedOperation = 0

  constructor(config: CollaborationConfig) {
    this.config = config
    this.wsClient = getWebSocketClient()
    this.vectorClock[config.userId] = 0
    
    this.setupWebSocketHandlers()
    this.initializeCollaboration()
  }

  /**
   * 협업 세션 시작
   */
  public async start(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('Collaboration manager has been destroyed')
    }

    await this.wsClient.connect()
    
    // 프로젝트 참여 알림
    this.wsClient.send('collaboration_event', {
      type: 'user_joined',
      data: {
        userId: this.config.userId,
        userName: this.config.userName,
        userColor: this.config.userColor,
        projectId: this.config.projectId,
        avatar: this.config.avatar
      }
    }, { 
      userId: this.config.userId,
      projectId: this.config.projectId
    })
  }

  /**
   * 협업 세션 종료
   */
  public stop(): void {
    this.isDestroyed = true
    
    // 프로젝트 탈퇴 알림
    if (this.wsClient.isConnected()) {
      this.wsClient.send('collaboration_event', {
        type: 'user_left',
        data: {
          userId: this.config.userId,
          projectId: this.config.projectId
        }
      }, { 
        userId: this.config.userId,
        projectId: this.config.projectId
      })
    }
    
    this.clearTypingTimeouts()
    this.wsClient.disconnect()
  }

  /**
   * 댓글 추가
   */
  public addComment(content: string, videoTimestamp: number, parentId?: string): string {
    const commentId = this.generateId()
    const event: RealtimeEvent = {
      type: 'comment_added',
      data: {
        commentId,
        content,
        timestamp: Date.now(),
        authorId: this.config.userId,
        projectId: this.config.projectId,
        videoTimestamp,
        parentId
      }
    }

    this.broadcastEvent(event)
    return commentId
  }

  /**
   * 댓글 업데이트
   */
  public updateComment(commentId: string, content: string): void {
    const event: RealtimeEvent = {
      type: 'comment_updated',
      data: {
        commentId,
        content,
        authorId: this.config.userId,
        projectId: this.config.projectId
      }
    }

    this.broadcastEvent(event)
  }

  /**
   * 댓글 삭제
   */
  public deleteComment(commentId: string): void {
    const event: RealtimeEvent = {
      type: 'comment_deleted',
      data: {
        commentId,
        authorId: this.config.userId,
        projectId: this.config.projectId
      }
    }

    this.broadcastEvent(event)
  }

  /**
   * 댓글 해결
   */
  public resolveComment(commentId: string): void {
    const event: RealtimeEvent = {
      type: 'comment_resolved',
      data: {
        commentId,
        resolvedBy: this.config.userId,
        projectId: this.config.projectId
      }
    }

    this.broadcastEvent(event)
  }

  /**
   * 타이핑 상태 업데이트
   */
  public setTyping(isTyping: boolean, commentId?: string): void {
    if (this.currentTypingState === isTyping) return
    
    this.currentTypingState = isTyping
    
    const event: RealtimeEvent = {
      type: 'user_typing',
      data: {
        userId: this.config.userId,
        projectId: this.config.projectId,
        isTyping,
        commentId
      }
    }

    this.broadcastEvent(event)
    
    // 자동으로 타이핑 상태 해제
    if (isTyping) {
      const timeoutId = setTimeout(() => {
        this.setTyping(false, commentId)
      }, 3000)
      
      this.typingTimeouts.set(`${commentId || 'global'}`, timeoutId)
    } else {
      const timeoutId = this.typingTimeouts.get(`${commentId || 'global'}`)
      if (timeoutId) {
        clearTimeout(timeoutId)
        this.typingTimeouts.delete(`${commentId || 'global'}`)
      }
    }
  }

  /**
   * 커서 위치 업데이트
   */
  public updateCursor(position: { x: number; y: number; element?: string }): void {
    if (!this.config.enableCursorTracking) return

    const event: RealtimeEvent = {
      type: 'cursor_moved',
      data: {
        userId: this.config.userId,
        projectId: this.config.projectId,
        position
      }
    }

    this.broadcastEvent(event)
  }

  /**
   * 선택 영역 업데이트
   */
  public updateSelection(selection?: { startTime: number; endTime: number; elementId?: string }): void {
    const event: RealtimeEvent = {
      type: 'selection_changed',
      data: {
        userId: this.config.userId,
        projectId: this.config.projectId,
        selection
      }
    }

    this.broadcastEvent(event)
  }

  /**
   * Operational Transformation 연산 적용
   */
  public applyOperation(operation: Omit<OTOperation, 'id' | 'userId' | 'timestamp' | 'vectorClock'>): string {
    if (!this.config.enableOperationalTransform) {
      throw new Error('Operational Transform is not enabled')
    }

    const operationId = this.generateId()
    this.vectorClock[this.config.userId]++
    
    const otOperation: OTOperation = {
      ...operation,
      id: operationId,
      userId: this.config.userId,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock }
    }

    // 로컬 버퍼에 추가
    this.operationsBuffer.push(otOperation)
    
    // 최대 버퍼 크기 제한
    if (this.operationsBuffer.length > this.config.maxOperationsBuffer) {
      this.operationsBuffer.shift()
    }

    const event: RealtimeEvent = {
      type: 'document_operation',
      data: {
        operationId,
        userId: this.config.userId,
        projectId: this.config.projectId,
        operation,
        timestamp: otOperation.timestamp,
        vectorClock: otOperation.vectorClock
      }
    }

    this.broadcastEvent(event)
    return operationId
  }

  /**
   * 이벤트 리스너 등록
   */
  public on(eventType: RealtimeEvent['type'], listener: (event: RealtimeEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    this.eventListeners.get(eventType)!.add(listener)
  }

  /**
   * 이벤트 리스너 해제
   */
  public off(eventType: RealtimeEvent['type'], listener: (event: RealtimeEvent) => void): void {
    const listeners = this.eventListeners.get(eventType)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * 현재 협업 사용자 목록 반환
   */
  public getCollaborationUsers(): CollaborationUser[] {
    return Array.from(this.users.values())
  }

  /**
   * 특정 사용자 정보 반환
   */
  public getUser(userId: string): CollaborationUser | undefined {
    return this.users.get(userId)
  }

  /**
   * 연결 상태 확인
   */
  public isConnected(): boolean {
    return this.wsClient.isConnected()
  }

  /**
   * WebSocket 이벤트 핸들러 설정
   */
  private setupWebSocketHandlers(): void {
    this.wsClient.on('onMessage', (message: WebSocketMessage) => {
      if (message.type === 'collaboration_event' && message.projectId === this.config.projectId) {
        this.handleCollaborationEvent(message.payload)
      }
    })

    this.wsClient.on('onConnectionChange', (state) => {
      if (state === 'connected') {
        this.syncPendingOperations()
      }
    })
  }

  /**
   * 협업 초기화
   */
  private initializeCollaboration(): void {
    // 현재 사용자를 사용자 목록에 추가
    this.users.set(this.config.userId, {
      id: this.config.userId,
      name: this.config.userName,
      color: this.config.userColor,
      avatar: this.config.avatar,
      isOnline: true,
      lastSeen: new Date(),
      isTyping: false
    })
  }

  /**
   * 협업 이벤트 처리
   */
  private handleCollaborationEvent(payload: unknown): void {
    try {
      const event = RealtimeEventSchema.parse(payload)
      
      // 자신이 보낸 이벤트는 무시 (이미 로컬에서 처리됨)
      if ('data' in event && 'userId' in event.data && event.data.userId === this.config.userId) {
        return
      }

      switch (event.type) {
        case 'user_joined':
          this.handleUserJoined(event.data)
          break
        case 'user_left':
          this.handleUserLeft(event.data)
          break
        case 'user_typing':
          this.handleUserTyping(event.data)
          break
        case 'cursor_moved':
          this.handleCursorMoved(event.data)
          break
        case 'selection_changed':
          this.handleSelectionChanged(event.data)
          break
        case 'document_operation':
          this.handleDocumentOperation(event.data)
          break
        default:
          // 다른 모든 이벤트는 리스너에게 전달
          this.emitEvent(event)
      }

    } catch (error) {
      console.error('Failed to parse collaboration event:', error)
    }
  }

  /**
   * 사용자 참여 처리
   */
  private handleUserJoined(data: any): void {
    const user: CollaborationUser = {
      id: data.userId,
      name: data.userName,
      color: data.userColor,
      avatar: data.avatar,
      isOnline: true,
      lastSeen: new Date(),
      isTyping: false
    }

    this.users.set(data.userId, user)
    this.emitEvent({ type: 'user_joined', data })
  }

  /**
   * 사용자 탈퇴 처리
   */
  private handleUserLeft(data: any): void {
    const user = this.users.get(data.userId)
    if (user) {
      user.isOnline = false
      user.lastSeen = new Date()
    }

    this.emitEvent({ type: 'user_left', data })
  }

  /**
   * 타이핑 상태 처리
   */
  private handleUserTyping(data: any): void {
    const user = this.users.get(data.userId)
    if (user) {
      user.isTyping = data.isTyping
    }

    this.emitEvent({ type: 'user_typing', data })
  }

  /**
   * 커서 이동 처리
   */
  private handleCursorMoved(data: any): void {
    const user = this.users.get(data.userId)
    if (user) {
      user.cursor = data.position
    }

    this.emitEvent({ type: 'cursor_moved', data })
  }

  /**
   * 선택 영역 변경 처리
   */
  private handleSelectionChanged(data: any): void {
    const user = this.users.get(data.userId)
    if (user) {
      user.selection = data.selection
    }

    this.emitEvent({ type: 'selection_changed', data })
  }

  /**
   * 문서 연산 처리 (OT)
   */
  private handleDocumentOperation(data: any): void {
    if (!this.config.enableOperationalTransform) return

    const operation: OTOperation = {
      id: data.operationId,
      type: data.operation.type,
      position: data.operation.position,
      content: data.operation.content,
      attributes: data.operation.attributes,
      length: data.operation.length,
      userId: data.userId,
      timestamp: data.timestamp,
      vectorClock: data.vectorClock
    }

    // Vector Clock 업데이트
    if (operation.vectorClock) {
      for (const [userId, clock] of Object.entries(operation.vectorClock)) {
        this.vectorClock[userId] = Math.max(this.vectorClock[userId] || 0, clock)
      }
    }

    // 로컬 연산과 충돌 해결
    const transformedOperation = this.transformOperation(operation)
    
    this.emitEvent({
      type: 'document_operation',
      data: {
        ...data,
        operation: transformedOperation
      }
    })
  }

  /**
   * Operational Transform 적용
   */
  private transformOperation(remoteOp: OTOperation): OTOperation {
    let transformedOp = { ...remoteOp }

    // 현재 버퍼의 로컬 연산들과 비교하여 변환
    for (const localOp of this.operationsBuffer) {
      if (localOp.timestamp < remoteOp.timestamp) {
        transformedOp = this.transformAgainstLocal(transformedOp, localOp)
      }
    }

    return transformedOp
  }

  /**
   * 로컬 연산에 대해 원격 연산 변환
   */
  private transformAgainstLocal(remoteOp: OTOperation, localOp: OTOperation): OTOperation {
    // 간단한 위치 기반 변환 (실제 구현에서는 더 정교한 OT 알고리즘 사용)
    if (remoteOp.type === 'insert' && localOp.type === 'insert') {
      if (remoteOp.position >= localOp.position) {
        return {
          ...remoteOp,
          position: remoteOp.position + (localOp.content?.length || 0)
        }
      }
    } else if (remoteOp.type === 'delete' && localOp.type === 'insert') {
      if (remoteOp.position > localOp.position) {
        return {
          ...remoteOp,
          position: remoteOp.position + (localOp.content?.length || 0)
        }
      }
    }

    return remoteOp
  }

  /**
   * 이벤트 브로드캐스트
   */
  private broadcastEvent(event: RealtimeEvent): void {
    this.wsClient.send('collaboration_event', event, {
      userId: this.config.userId,
      projectId: this.config.projectId
    })
  }

  /**
   * 이벤트 발생
   */
  private emitEvent(event: RealtimeEvent): void {
    const listeners = this.eventListeners.get(event.type)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event)
        } catch (error) {
          console.error('Event listener error:', error)
        }
      })
    }
  }

  /**
   * 대기 중인 연산 동기화
   */
  private syncPendingOperations(): void {
    // 연결이 복구되었을 때 대기 중인 연산들을 재전송
    const pendingOps = Array.from(this.pendingOperations.values())
    pendingOps.forEach(op => {
      const event: RealtimeEvent = {
        type: 'document_operation',
        data: {
          operationId: op.id,
          userId: op.userId,
          projectId: this.config.projectId,
          operation: {
            type: op.type,
            position: op.position,
            content: op.content,
            attributes: op.attributes,
            length: op.length
          },
          timestamp: op.timestamp,
          vectorClock: op.vectorClock
        }
      }
      this.broadcastEvent(event)
    })
  }

  /**
   * 타이핑 타임아웃 정리
   */
  private clearTypingTimeouts(): void {
    this.typingTimeouts.forEach(timeoutId => clearTimeout(timeoutId))
    this.typingTimeouts.clear()
  }

  /**
   * ID 생성
   */
  private generateId(): string {
    return `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}