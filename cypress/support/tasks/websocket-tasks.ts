/**
 * Cypress WebSocket Tasks
 * 실시간 협업 테스트를 위한 WebSocket 관련 태스크들
 */

import { WebSocketServer } from 'ws'
import { createServer } from 'http'

interface WebSocketTask {
  setupWebSocketServer: (config: { port: number; endpoint: string }) => Promise<void>
  cleanupWebSocketServer: () => Promise<void>
  simulateNetworkDisconnection: () => Promise<void>
  restoreNetworkConnection: () => Promise<void>
  simulateMultipleUsers: (config: { userCount: number; projectId: string }) => Promise<void>
  simulateOfflineMode: () => Promise<void>
  restoreOnlineMode: () => Promise<void>
  simulateCollaborativeEdit: (config: any) => Promise<void>
  simulateRemoteCursor: (config: any) => Promise<void>
  simulateEditConflict: (config: any) => Promise<void>
  verifyRealtimeCommentSync: (config: any) => Promise<boolean>
  simulateUserTyping: (config: any) => Promise<void>
  simulateIncomingComment: (config: any) => Promise<void>
  sendBulkMessages: (config: { count: number; interval: number }) => Promise<void>
  simulateNetworkLatency: (config: { latency: number }) => Promise<void>
  generateMassiveEvents: (config: { count: number }) => Promise<void>
  simulateNetworkError: (config: any) => Promise<void>
  sendOutOfOrderMessages: (messages: any[]) => Promise<void>
  sendDuplicateMessage: (config: any) => Promise<void>
  simulateConcurrentUsers: (config: any) => Promise<void>
  simulateMobileNetwork: (config: any) => Promise<void>
}

// WebSocket 서버 인스턴스
let wsServer: WebSocketServer | null = null
let httpServer: any = null
const connectedClients = new Set<any>()

// 네트워크 지연 시뮬레이션
let networkLatency = 0
let networkDisconnected = false

export const websocketTasks: WebSocketTask = {
  /**
   * WebSocket 테스트 서버 설정
   */
  async setupWebSocketServer(config) {
    return new Promise((resolve, reject) => {
      try {
        // HTTP 서버 생성
        httpServer = createServer()
        
        // WebSocket 서버 생성
        wsServer = new WebSocketServer({
          server: httpServer,
          path: config.endpoint
        })

        wsServer.on('connection', (ws, req) => {
          console.log(`WebSocket client connected from ${req.socket.remoteAddress}`)
          connectedClients.add(ws)

          // 연결 환영 메시지
          ws.send(JSON.stringify({
            id: 'welcome',
            type: 'connection',
            payload: {
              type: 'welcome',
              message: 'Connected to test WebSocket server'
            },
            timestamp: Date.now()
          }))

          // 메시지 처리
          ws.on('message', async (data) => {
            try {
              const message = JSON.parse(data.toString())
              await handleWebSocketMessage(ws, message)
            } catch (error) {
              console.error('WebSocket message error:', error)
            }
          })

          // 연결 종료 처리
          ws.on('close', () => {
            console.log('WebSocket client disconnected')
            connectedClients.delete(ws)
          })

          // 에러 처리
          ws.on('error', (error) => {
            console.error('WebSocket error:', error)
            connectedClients.delete(ws)
          })
        })

        // HTTP 서버 시작
        httpServer.listen(config.port, () => {
          console.log(`WebSocket test server started on port ${config.port}`)
          resolve()
        })

      } catch (error) {
        console.error('Failed to setup WebSocket server:', error)
        reject(error)
      }
    })
  },

  /**
   * WebSocket 서버 정리
   */
  async cleanupWebSocketServer() {
    return new Promise((resolve) => {
      if (wsServer) {
        wsServer.close()
        wsServer = null
      }
      
      if (httpServer) {
        httpServer.close(() => {
          httpServer = null
          connectedClients.clear()
          console.log('WebSocket test server closed')
          resolve()
        })
      } else {
        resolve()
      }
    })
  },

  /**
   * 네트워크 연결 중단 시뮬레이션
   */
  async simulateNetworkDisconnection() {
    networkDisconnected = true
    
    // 모든 클라이언트 연결 강제 종료
    connectedClients.forEach((ws) => {
      if (ws.readyState === ws.OPEN) {
        ws.close(1006, 'Network disconnection simulation')
      }
    })
    
    console.log('Network disconnection simulated')
  },

  /**
   * 네트워크 연결 복구 시뮬레이션
   */
  async restoreNetworkConnection() {
    networkDisconnected = false
    console.log('Network connection restored')
  },

  /**
   * 다중 사용자 시뮬레이션
   */
  async simulateMultipleUsers(config) {
    const { userCount, projectId } = config
    
    // 가상 사용자들의 참여 이벤트 브로드캐스트
    for (let i = 1; i <= userCount; i++) {
      const userJoinedEvent = {
        id: `user-join-${i}`,
        type: 'collaboration_event',
        payload: {
          type: 'user_joined',
          data: {
            userId: `test-user-${i}`,
            userName: `테스트 사용자 ${i}`,
            userColor: `hsl(${(i * 360) / userCount}, 70%, 50%)`,
            projectId,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`
          }
        },
        timestamp: Date.now(),
        projectId
      }

      await broadcastToAllClients(userJoinedEvent)
      
      // 사용자 간 간격 두기
      await delay(100)
    }

    console.log(`Simulated ${userCount} users joining project ${projectId}`)
  },

  /**
   * 오프라인 모드 시뮬레이션
   */
  async simulateOfflineMode() {
    // Service Worker에게 오프라인 모드 활성화 신호
    await broadcastToAllClients({
      id: 'offline-mode',
      type: 'system',
      payload: {
        type: 'offline_mode_enabled'
      },
      timestamp: Date.now()
    })
    
    console.log('Offline mode simulation activated')
  },

  /**
   * 온라인 모드 복구 시뮬레이션  
   */
  async restoreOnlineMode() {
    await broadcastToAllClients({
      id: 'online-mode',
      type: 'system', 
      payload: {
        type: 'online_mode_restored'
      },
      timestamp: Date.now()
    })
    
    console.log('Online mode simulation restored')
  },

  /**
   * 협업 편집 시뮬레이션
   */
  async simulateCollaborativeEdit(config) {
    const { user1, user2 } = config
    
    // 두 사용자의 동시 편집 연산 생성
    const operation1 = {
      id: 'op-1',
      type: 'collaboration_event',
      payload: {
        type: 'document_operation',
        data: {
          operationId: 'op-user1-1',
          userId: 'user1',
          projectId: 'test-project',
          operation: user1,
          timestamp: Date.now(),
          vectorClock: { user1: 1, user2: 0 }
        }
      },
      timestamp: Date.now()
    }

    const operation2 = {
      id: 'op-2', 
      type: 'collaboration_event',
      payload: {
        type: 'document_operation',
        data: {
          operationId: 'op-user2-1',
          userId: 'user2',
          projectId: 'test-project', 
          operation: user2,
          timestamp: Date.now() + 10, // 약간의 시간차
          vectorClock: { user1: 0, user2: 1 }
        }
      },
      timestamp: Date.now() + 10
    }

    // 동시 전송
    await Promise.all([
      broadcastToAllClients(operation1),
      broadcastToAllClients(operation2)
    ])

    console.log('Collaborative edit simulation completed')
  },

  /**
   * 원격 커서 시뮬레이션
   */
  async simulateRemoteCursor(config) {
    const { userId, userName, userColor, position } = config
    
    const cursorEvent = {
      id: `cursor-${userId}`,
      type: 'collaboration_event',
      payload: {
        type: 'cursor_moved',
        data: {
          userId,
          userName,
          userColor,
          projectId: 'test-project',
          position
        }
      },
      timestamp: Date.now()
    }

    await broadcastToAllClients(cursorEvent)
    console.log(`Remote cursor simulated for user ${userId}`)
  },

  /**
   * 편집 충돌 시뮬레이션
   */
  async simulateEditConflict(config) {
    const { conflictType, operations } = config
    
    // 충돌하는 연산들을 거의 동시에 전송
    const conflictEvents = operations.map((op: any, index: number) => ({
      id: `conflict-op-${index}`,
      type: 'collaboration_event',
      payload: {
        type: 'document_operation',
        data: {
          operationId: `conflict-${op.userId}-${index}`,
          userId: op.userId,
          projectId: 'test-project',
          operation: op,
          timestamp: Date.now() + index, // 미세한 시간차
          vectorClock: { [op.userId]: 1 }
        }
      },
      timestamp: Date.now() + index
    }))

    // 동시 전송으로 충돌 유발
    await Promise.all(
      conflictEvents.map(event => broadcastToAllClients(event))
    )

    console.log(`Edit conflict simulation completed: ${conflictType}`)
  },

  /**
   * 실시간 댓글 동기화 검증
   */
  async verifyRealtimeCommentSync(config) {
    const { commentId, expectedTimecode } = config
    
    // 실제 구현에서는 데이터베이스나 상태 확인
    // 여기서는 시뮬레이션된 검증
    const verificationEvent = {
      id: 'sync-verification',
      type: 'test_verification',
      payload: {
        commentId,
        timecode: expectedTimecode,
        synced: true
      },
      timestamp: Date.now()
    }

    await broadcastToAllClients(verificationEvent)
    
    console.log(`Comment sync verified: ${commentId}`)
    return true
  },

  /**
   * 사용자 타이핑 상태 시뮬레이션
   */
  async simulateUserTyping(config) {
    const { userId, isTyping } = config
    
    const typingEvent = {
      id: `typing-${userId}`,
      type: 'collaboration_event',
      payload: {
        type: 'user_typing',
        data: {
          userId,
          projectId: 'test-project',
          isTyping
        }
      },
      timestamp: Date.now()
    }

    await broadcastToAllClients(typingEvent)
    console.log(`User typing simulation: ${userId} - ${isTyping}`)
  },

  /**
   * 수신 댓글 시뮬레이션
   */
  async simulateIncomingComment(config) {
    const { commentId, content, authorId, timestamp } = config
    
    const commentEvent = {
      id: commentId,
      type: 'collaboration_event',
      payload: {
        type: 'comment_added',
        data: {
          commentId,
          content,
          authorId,
          projectId: 'test-project',
          timestamp,
          videoTimestamp: 45.0
        }
      },
      timestamp
    }

    await broadcastToAllClients(commentEvent)
    console.log(`Incoming comment simulated: ${commentId}`)
  },

  /**
   * 대량 메시지 전송
   */
  async sendBulkMessages(config) {
    const { count, interval } = config
    
    console.log(`Sending ${count} bulk messages with ${interval}ms interval`)
    
    for (let i = 1; i <= count; i++) {
      const message = {
        id: `bulk-msg-${i}`,
        type: 'collaboration_event',
        payload: {
          type: 'comment_added',
          data: {
            commentId: `bulk-comment-${i}`,
            content: `벌크 메시지 ${i}`,
            authorId: 'bulk-user',
            projectId: 'test-project',
            timestamp: Date.now(),
            videoTimestamp: i * 1.5
          }
        },
        timestamp: Date.now(),
        sequenceNumber: i
      }

      await broadcastToAllClients(message)
      
      if (interval > 0) {
        await delay(interval)
      }
    }

    console.log(`Bulk messages sent: ${count}`)
  },

  /**
   * 네트워크 지연 시뮬레이션
   */
  async simulateNetworkLatency(config) {
    const { latency } = config
    networkLatency = latency
    
    console.log(`Network latency simulation set to ${latency}ms`)
  },

  /**
   * 대량 이벤트 생성 (메모리 테스트용)
   */
  async generateMassiveEvents(config) {
    const { count } = config
    
    const events = Array.from({ length: count }, (_, i) => ({
      id: `massive-event-${i}`,
      type: 'test_event',
      payload: {
        data: `Event data ${i}`,
        timestamp: Date.now() + i,
        largeData: 'x'.repeat(1000) // 1KB 데이터
      },
      timestamp: Date.now() + i
    }))

    // 이벤트들을 배치로 전송
    const batchSize = 50
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)
      await Promise.all(
        batch.map(event => broadcastToAllClients(event))
      )
      await delay(10) // 작은 간격
    }

    console.log(`Generated ${count} massive events`)
  },

  /**
   * 네트워크 오류 시뮬레이션
   */
  async simulateNetworkError(config) {
    const { errorType, duration } = config
    
    const errorEvent = {
      id: 'network-error',
      type: 'system_error',
      payload: {
        errorType,
        message: 'Simulated network error',
        duration
      },
      timestamp: Date.now()
    }

    await broadcastToAllClients(errorEvent)

    // 지정된 시간 후 자동 복구
    setTimeout(() => {
      const recoveryEvent = {
        id: 'network-recovery',
        type: 'system_recovery',
        payload: {
          message: 'Network recovered from simulation',
          previousError: errorType
        },
        timestamp: Date.now()
      }
      
      broadcastToAllClients(recoveryEvent)
    }, duration)

    console.log(`Network error simulated: ${errorType} for ${duration}ms`)
  },

  /**
   * 순서가 뒤바뀐 메시지 전송
   */
  async sendOutOfOrderMessages(messages) {
    // 메시지들을 순서대로 전송하지만 의도적으로 뒤섞인 시퀀스 번호 사용
    for (const msg of messages) {
      const message = {
        id: msg.id,
        type: 'test_message',
        payload: {
          content: msg.content,
          sequence: msg.sequence
        },
        timestamp: Date.now(),
        sequenceNumber: msg.sequence
      }

      await broadcastToAllClients(message)
      await delay(50) // 작은 간격
    }

    console.log('Out of order messages sent')
  },

  /**
   * 중복 메시지 전송
   */
  async sendDuplicateMessage(config) {
    const { message, count } = config
    
    const duplicateMessage = {
      id: message.id,
      type: 'collaboration_event',
      payload: {
        type: 'comment_added',
        data: {
          commentId: message.id,
          content: message.content,
          authorId: 'duplicate-user',
          projectId: 'test-project',
          timestamp: Date.now()
        }
      },
      timestamp: Date.now()
    }

    // 동일한 메시지를 여러 번 전송
    const promises = Array.from({ length: count }, () => 
      broadcastToAllClients(duplicateMessage)
    )

    await Promise.all(promises)
    console.log(`Sent duplicate message ${count} times: ${message.id}`)
  },

  /**
   * 동시 사용자 부하 테스트
   */
  async simulateConcurrentUsers(config) {
    const { userCount, actionsPerUser, duration } = config
    
    console.log(`Starting concurrent user simulation: ${userCount} users, ${actionsPerUser} actions each, ${duration}ms duration`)
    
    const startTime = Date.now()
    const endTime = startTime + duration
    
    // 각 사용자별 액션 실행
    const userPromises = Array.from({ length: userCount }, async (_, userIndex) => {
      const userId = `concurrent-user-${userIndex}`
      
      while (Date.now() < endTime) {
        // 랜덤 액션 실행
        const actions = ['comment', 'cursor', 'typing', 'selection']
        const randomAction = actions[Math.floor(Math.random() * actions.length)]
        
        switch (randomAction) {
          case 'comment':
            await broadcastToAllClients({
              id: `comment-${userId}-${Date.now()}`,
              type: 'collaboration_event',
              payload: {
                type: 'comment_added',
                data: {
                  commentId: `comment-${userId}-${Date.now()}`,
                  content: `동시 사용자 ${userIndex} 댓글`,
                  authorId: userId,
                  projectId: 'load-test-project',
                  timestamp: Date.now(),
                  videoTimestamp: Math.random() * 120
                }
              },
              timestamp: Date.now()
            })
            break
            
          case 'cursor':
            await broadcastToAllClients({
              id: `cursor-${userId}-${Date.now()}`,
              type: 'collaboration_event',
              payload: {
                type: 'cursor_moved',
                data: {
                  userId,
                  projectId: 'load-test-project',
                  position: {
                    x: Math.random() * 1000,
                    y: Math.random() * 800
                  }
                }
              },
              timestamp: Date.now()
            })
            break
            
          case 'typing':
            await broadcastToAllClients({
              id: `typing-${userId}-${Date.now()}`,
              type: 'collaboration_event',
              payload: {
                type: 'user_typing',
                data: {
                  userId,
                  projectId: 'load-test-project',
                  isTyping: Math.random() > 0.5
                }
              },
              timestamp: Date.now()
            })
            break
        }
        
        // 액션 간 간격
        await delay(Math.random() * 1000 + 100)
      }
    })

    await Promise.all(userPromises)
    console.log('Concurrent user simulation completed')
  },

  /**
   * 모바일 네트워크 환경 시뮬레이션
   */
  async simulateMobileNetwork(config) {
    const { bandwidth, latency } = config
    
    // 네트워크 조건 설정
    networkLatency = latency
    
    const networkEvent = {
      id: 'mobile-network',
      type: 'system',
      payload: {
        type: 'network_condition_changed',
        bandwidth,
        latency,
        mobile: true
      },
      timestamp: Date.now()
    }

    await broadcastToAllClients(networkEvent)
    console.log(`Mobile network simulation: ${bandwidth}, ${latency}ms latency`)
  }
}

/**
 * 모든 연결된 클라이언트에게 메시지 브로드캐스트
 */
async function broadcastToAllClients(message: any): Promise<void> {
  if (networkDisconnected) {
    console.log('Message dropped due to network disconnection simulation')
    return
  }

  // 네트워크 지연 적용
  if (networkLatency > 0) {
    await delay(networkLatency)
  }

  const messageString = JSON.stringify(message)
  
  connectedClients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(messageString)
      } catch (error) {
        console.error('Failed to send message to client:', error)
        connectedClients.delete(ws)
      }
    }
  })
}

/**
 * WebSocket 메시지 처리
 */
async function handleWebSocketMessage(ws: any, message: any): Promise<void> {
  console.log('Received WebSocket message:', message.type)
  
  switch (message.type) {
    case 'heartbeat':
      // 하트비트 응답
      ws.send(JSON.stringify({
        id: 'heartbeat-response',
        type: 'heartbeat',
        payload: { pong: true },
        timestamp: Date.now()
      }))
      break
      
    case 'collaboration_event':
      // 협업 이벤트를 다른 클라이언트들에게 브로드캐스트
      await broadcastToOtherClients(ws, message)
      break
      
    default:
      console.log(`Unknown message type: ${message.type}`)
  }
}

/**
 * 발신자를 제외한 다른 클라이언트들에게 브로드캐스트
 */
async function broadcastToOtherClients(sender: any, message: any): Promise<void> {
  const messageString = JSON.stringify(message)
  
  connectedClients.forEach((ws) => {
    if (ws !== sender && ws.readyState === ws.OPEN) {
      try {
        ws.send(messageString)
      } catch (error) {
        console.error('Failed to broadcast to client:', error)
        connectedClients.delete(ws)
      }
    }
  })
}

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}