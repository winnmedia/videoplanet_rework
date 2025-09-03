/**
 * WebSocket Client - VideoPlanet 실시간 통신 클라이언트
 * 
 * 기능:
 * - 자동 재연결 (지수 백오프)
 * - 메시지 큐잉 및 순서 보장
 * - 하트비트 및 연결 상태 관리
 * - 이벤트 기반 아키텍처
 * - 타입 안전 메시지 처리
 */

'use client'

import { z } from 'zod'

// WebSocket 메시지 스키마 정의
export const WebSocketMessageSchema = z.object({
  id: z.string(),
  type: z.enum([
    'connection',
    'heartbeat',
    'comment',
    'cursor',
    'user_status',
    'collaboration_event',
    'feedback_update',
    'project_sync'
  ]),
  payload: z.unknown(),
  timestamp: z.number(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
  sequenceNumber: z.number().optional()
})

export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>

// 연결 상태 타입
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed'

// 사용자 상태 타입
export type UserStatus = 'online' | 'offline' | 'away' | 'typing'

// 이벤트 리스너 타입
export interface WebSocketEventListeners {
  onConnectionChange: (state: ConnectionState) => void
  onMessage: (message: WebSocketMessage) => void
  onUserStatusChange: (userId: string, status: UserStatus) => void
  onError: (error: Error) => void
  onReconnectAttempt: (attempt: number, maxAttempts: number) => void
}

// WebSocket 설정 타입
export interface WebSocketConfig {
  url: string
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
  messageQueueSize: number
  enableLogging: boolean
  protocols?: string[]
}

// 기본 설정
const DEFAULT_CONFIG: WebSocketConfig = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'wss://videoplanet.up.railway.app',
  reconnectInterval: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL || '5000'),
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  messageQueueSize: 1000,
  enableLogging: process.env.NODE_ENV === 'development'
}

/**
 * WebSocket 클라이언트 클래스
 */
export class WebSocketClient {
  private ws: WebSocket | null = null
  private config: WebSocketConfig
  private connectionState: ConnectionState = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimeoutId: NodeJS.Timeout | null = null
  private heartbeatIntervalId: NodeJS.Timeout | null = null
  private messageQueue: WebSocketMessage[] = []
  private sequenceNumber = 0
  private listeners: Partial<WebSocketEventListeners> = {}
  private isDestroyed = false

  // 메시지 처리 상태
  private lastProcessedSequence = 0
  private pendingAcks = new Set<string>()
  
  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.log('WebSocket client initialized', this.config)
  }

  /**
   * WebSocket 연결 시작
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDestroyed) {
        reject(new Error('WebSocket client has been destroyed'))
        return
      }

      if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
        resolve()
        return
      }

      this.setConnectionState('connecting')
      this.log('Attempting to connect to WebSocket server:', this.config.url)

      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols)
        this.setupEventHandlers(resolve, reject)
      } catch (error) {
        this.handleError(error as Error)
        reject(error)
      }
    })
  }

  /**
   * WebSocket 연결 종료
   */
  public disconnect(): void {
    this.log('Disconnecting WebSocket')
    this.isDestroyed = true
    
    this.clearTimeouts()
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting')
      this.ws = null
    }
    
    this.setConnectionState('disconnected')
  }

  /**
   * 메시지 전송
   */
  public send(type: WebSocketMessage['type'], payload: unknown, options: {
    userId?: string
    projectId?: string
    requireAck?: boolean
  } = {}): string {
    const messageId = this.generateMessageId()
    const message: WebSocketMessage = {
      id: messageId,
      type,
      payload,
      timestamp: Date.now(),
      userId: options.userId,
      projectId: options.projectId,
      sequenceNumber: ++this.sequenceNumber
    }

    if (this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN) {
      this.sendMessage(message)
      if (options.requireAck) {
        this.pendingAcks.add(messageId)
      }
    } else {
      this.queueMessage(message)
    }

    return messageId
  }

  /**
   * 이벤트 리스너 등록
   */
  public on<K extends keyof WebSocketEventListeners>(
    event: K,
    listener: WebSocketEventListeners[K]
  ): void {
    this.listeners[event] = listener
  }

  /**
   * 이벤트 리스너 해제
   */
  public off<K extends keyof WebSocketEventListeners>(event: K): void {
    delete this.listeners[event]
  }

  /**
   * 연결 상태 반환
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * 연결된 상태인지 확인
   */
  public isConnected(): boolean {
    return this.connectionState === 'connected' && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * 대기 중인 메시지 수 반환
   */
  public getQueueSize(): number {
    return this.messageQueue.length
  }

  /**
   * WebSocket 이벤트 핸들러 설정
   */
  private setupEventHandlers(resolve: () => void, reject: (error: Error) => void): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this.log('WebSocket connection established')
      this.setConnectionState('connected')
      this.reconnectAttempts = 0
      this.startHeartbeat()
      this.processMessageQueue()
      resolve()
    }

    this.ws.onclose = (event) => {
      this.log('WebSocket connection closed:', event.code, event.reason)
      this.stopHeartbeat()
      
      if (!this.isDestroyed && event.code !== 1000) {
        this.handleReconnect()
      } else {
        this.setConnectionState('disconnected')
      }
    }

    this.ws.onerror = (error) => {
      this.log('WebSocket error:', error)
      const errorObj = new Error('WebSocket connection error')
      this.handleError(errorObj)
      
      if (this.connectionState === 'connecting') {
        reject(errorObj)
      }
    }

    this.ws.onmessage = (event) => {
      this.handleIncomingMessage(event.data)
    }
  }

  /**
   * 수신 메시지 처리
   */
  private handleIncomingMessage(data: string): void {
    try {
      const rawMessage = JSON.parse(data)
      const message = WebSocketMessageSchema.parse(rawMessage)
      
      this.log('Received message:', message.type, message.id)

      // 시퀀스 번호 확인 (순서 보장)
      if (message.sequenceNumber && message.sequenceNumber <= this.lastProcessedSequence) {
        this.log('Duplicate or out-of-order message ignored:', message.id)
        return
      }

      if (message.sequenceNumber) {
        this.lastProcessedSequence = message.sequenceNumber
      }

      // 특별 메시지 타입 처리
      switch (message.type) {
        case 'heartbeat':
          this.handleHeartbeat()
          break
        
        case 'connection':
          this.handleConnectionMessage(message)
          break
        
        default:
          // 일반 메시지를 리스너에게 전달
          this.listeners.onMessage?.(message)
      }

    } catch (error) {
      this.log('Failed to parse incoming message:', error)
      this.handleError(error as Error)
    }
  }

  /**
   * 하트비트 메시지 처리
   */
  private handleHeartbeat(): void {
    this.send('heartbeat', { pong: true })
  }

  /**
   * 연결 메시지 처리
   */
  private handleConnectionMessage(message: WebSocketMessage): void {
    const payload = message.payload as any
    
    if (payload.type === 'welcome') {
      this.log('Received welcome message')
    } else if (payload.type === 'user_joined') {
      this.listeners.onUserStatusChange?.(payload.userId, 'online')
    } else if (payload.type === 'user_left') {
      this.listeners.onUserStatusChange?.(payload.userId, 'offline')
    }
  }

  /**
   * 메시지 전송 (실제 WebSocket 전송)
   */
  private sendMessage(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.queueMessage(message)
      return
    }

    try {
      const messageString = JSON.stringify(message)
      this.ws.send(messageString)
      this.log('Sent message:', message.type, message.id)
    } catch (error) {
      this.log('Failed to send message:', error)
      this.queueMessage(message)
      this.handleError(error as Error)
    }
  }

  /**
   * 메시지 큐에 추가
   */
  private queueMessage(message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.config.messageQueueSize) {
      this.messageQueue.shift() // 가장 오래된 메시지 제거
      this.log('Message queue full, dropping oldest message')
    }
    
    this.messageQueue.push(message)
    this.log('Message queued:', message.type, message.id, `(queue size: ${this.messageQueue.length})`)
  }

  /**
   * 메시지 큐 처리
   */
  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return

    this.log('Processing message queue:', this.messageQueue.length, 'messages')
    
    const messages = [...this.messageQueue]
    this.messageQueue = []
    
    messages.forEach(message => {
      this.sendMessage(message)
    })
  }

  /**
   * 재연결 처리 (지수 백오프)
   */
  private handleReconnect(): void {
    if (this.isDestroyed || this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.setConnectionState('failed')
      this.log('Max reconnection attempts reached')
      return
    }

    this.setConnectionState('reconnecting')
    this.reconnectAttempts++
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // 최대 30초
    )

    this.log(`Reconnection attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`)
    
    this.listeners.onReconnectAttempt?.(this.reconnectAttempts, this.config.maxReconnectAttempts)

    this.reconnectTimeoutId = setTimeout(() => {
      this.connect().catch(error => {
        this.log('Reconnection failed:', error)
        this.handleReconnect()
      })
    }, delay)
  }

  /**
   * 하트비트 시작
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatIntervalId = setInterval(() => {
      if (this.isConnected()) {
        this.send('heartbeat', { ping: true })
      }
    }, this.config.heartbeatInterval)
  }

  /**
   * 하트비트 중지
   */
  private stopHeartbeat(): void {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId)
      this.heartbeatIntervalId = null
    }
  }

  /**
   * 타임아웃 정리
   */
  private clearTimeouts(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }
    
    this.stopHeartbeat()
  }

  /**
   * 연결 상태 변경
   */
  private setConnectionState(state: ConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state
      this.log('Connection state changed to:', state)
      this.listeners.onConnectionChange?.(state)
    }
  }

  /**
   * 에러 처리
   */
  private handleError(error: Error): void {
    this.log('WebSocket error:', error.message)
    this.listeners.onError?.(error)
  }

  /**
   * 메시지 ID 생성
   */
  private generateMessageId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 로깅
   */
  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      console.log('[WebSocketClient]', ...args)
    }
  }
}

// 싱글톤 인스턴스
let instance: WebSocketClient | null = null

/**
 * WebSocket 클라이언트 싱글톤 인스턴스 반환
 */
export function getWebSocketClient(config?: Partial<WebSocketConfig>): WebSocketClient {
  if (!instance || config) {
    instance = new WebSocketClient(config)
  }
  return instance
}

/**
 * WebSocket 클라이언트 종료
 */
export function destroyWebSocketClient(): void {
  if (instance) {
    instance.disconnect()
    instance = null
  }
}