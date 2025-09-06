import { z } from 'zod'

import { 
  WebSocketMessage, 
  WebSocketMessageSchema, 
  ConnectionStatus 
} from '@/entities/notification'

export interface WebSocketManagerConfig {
  url: string
  onMessage: (message: WebSocketMessage) => void
  onConnectionStatusChange: (status: ConnectionStatus) => void
  reconnectInterval?: number
  maxReconnectAttempts?: number
  pingInterval?: number
  pingTimeout?: number
}

export class NotificationWebSocketManager {
  private ws: WebSocket | null = null
  private config: Required<WebSocketManagerConfig>
  private reconnectAttempts = 0
  private reconnectTimer: NodeJS.Timeout | null = null
  private pingTimer: NodeJS.Timeout | null = null
  private pingTimeoutTimer: NodeJS.Timeout | null = null
  private connectionStatus: ConnectionStatus = 'disconnected'
  private isManualDisconnection = false

  constructor(config: WebSocketManagerConfig) {
    this.config = {
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      pingInterval: 30000,
      pingTimeout: 10000,
      ...config
    }
  }

  async connect(): Promise<void> {
    // 이미 연결되어 있거나 연결 중인 경우 무시
    if (this.connectionStatus === 'connected' || this.connectionStatus === 'reconnecting') {
      return
    }

    this.isManualDisconnection = false
    this.setConnectionStatus('reconnecting')

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url)
        
        const onOpen = () => {
          console.log('WebSocket 연결 성공')
          this.reconnectAttempts = 0
          this.setConnectionStatus('connected')
          this.startPingInterval()
          this.ws?.removeEventListener('open', onOpen)
          this.ws?.removeEventListener('error', onError)
          resolve()
        }

        const onError = () => {
          console.error('WebSocket 연결 실패')
          this.ws?.removeEventListener('open', onOpen)
          this.ws?.removeEventListener('error', onError)
          this.handleConnectionError()
          reject(new Error('WebSocket 연결 실패'))
        }

        this.ws.addEventListener('open', onOpen)
        this.ws.addEventListener('error', onError)
        this.ws.addEventListener('message', this.handleMessage.bind(this))
        this.ws.addEventListener('close', this.handleClose.bind(this))

      } catch (error) {
        console.error('WebSocket 생성 실패:', error)
        this.handleConnectionError()
        reject(error)
      }
    })
  }

  disconnect(): void {
    this.isManualDisconnection = true
    this.cleanup()
    this.setConnectionStatus('disconnected')
  }

  sendMessage(message: any): void {
    if (this.connectionStatus !== 'connected' || !this.ws) {
      throw new Error('WebSocket이 연결되지 않았습니다')
    }

    try {
      this.ws.send(JSON.stringify(message))
    } catch (error) {
      console.error('메시지 전송 실패:', error)
      throw error
    }
  }

  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data)
      
      // 퐁 메시지 처리
      if (data.type === 'pong') {
        this.handlePong()
        return
      }

      // 스키마 검증
      const validatedMessage = WebSocketMessageSchema.parse(data)
      
      // 유효한 메시지를 콜백으로 전달
      this.config.onMessage(validatedMessage)
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.warn('유효하지 않은 WebSocket 메시지 형식:', error.errors)
      } else if (error instanceof SyntaxError) {
        console.warn('WebSocket 메시지 JSON 파싱 실패:', event.data)
      } else {
        console.error('WebSocket 메시지 처리 오류:', error)
      }
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket 연결 종료:', event.code, event.reason)
    
    this.cleanup()

    // 정상적인 종료(1000) 또는 수동 종료가 아닌 경우 재연결 시도
    if (!this.isManualDisconnection && event.code !== 1000) {
      this.attemptReconnect()
    } else {
      this.setConnectionStatus('disconnected')
    }
  }

  private handleConnectionError(): void {
    this.cleanup()

    if (!this.isManualDisconnection) {
      this.attemptReconnect()
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('최대 재연결 시도 횟수 초과')
      this.setConnectionStatus('failed')
      return
    }

    this.reconnectAttempts++
    this.setConnectionStatus('reconnecting')

    console.log(`재연결 시도 ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}`)

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('재연결 실패:', error)
        // connect 메서드에서 이미 handleConnectionError를 호출하므로 여기서는 별도 처리 불필요
      })
    }, this.config.reconnectInterval)
  }

  private startPingInterval(): void {
    this.stopPingInterval()
    
    this.pingTimer = setInterval(() => {
      if (this.connectionStatus === 'connected' && this.ws) {
        try {
          this.sendMessage({ type: 'ping' })
          this.startPingTimeout()
        } catch (error) {
          console.error('핑 전송 실패:', error)
        }
      }
    }, this.config.pingInterval)
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    this.stopPingTimeout()
  }

  private startPingTimeout(): void {
    this.stopPingTimeout()
    
    this.pingTimeoutTimer = setTimeout(() => {
      console.error('핑 타임아웃 - 연결 재시작')
      this.ws?.close(1000, 'Ping timeout')
    }, this.config.pingTimeout)
  }

  private stopPingTimeout(): void {
    if (this.pingTimeoutTimer) {
      clearTimeout(this.pingTimeoutTimer)
      this.pingTimeoutTimer = null
    }
  }

  private handlePong(): void {
    console.debug('퐁 수신')
    this.stopPingTimeout()
  }

  private cleanup(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopPingInterval()
  }

  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status
      this.config.onConnectionStatusChange(status)
    }
  }
}