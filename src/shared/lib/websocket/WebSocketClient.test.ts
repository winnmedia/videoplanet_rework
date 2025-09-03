/**
 * WebSocketClient Unit Tests
 * WebSocket 클라이언트의 핵심 기능 테스트
 */

import { WebSocketClient, WebSocketMessage, ConnectionState } from './WebSocketClient'
import WS from 'jest-websocket-mock'

// WebSocket Mock 설정
const WS_URL = 'ws://localhost:1234'

describe('WebSocketClient', () => {
  let server: WS
  let client: WebSocketClient

  beforeEach(() => {
    server = new WS(WS_URL)
    client = new WebSocketClient({
      url: WS_URL,
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
      heartbeatInterval: 1000,
      enableLogging: false
    })
  })

  afterEach(async () => {
    client.disconnect()
    WS.clean()
  })

  describe('연결 관리', () => {
    it('성공적으로 WebSocket에 연결해야 한다', async () => {
      const connectionPromise = client.connect()
      await server.connected

      await connectionPromise
      expect(client.getConnectionState()).toBe('connected')
      expect(client.isConnected()).toBe(true)
    })

    it('연결 실패 시 에러를 처리해야 한다', async () => {
      const invalidClient = new WebSocketClient({
        url: 'ws://invalid-url:9999',
        enableLogging: false
      })

      await expect(invalidClient.connect()).rejects.toThrow()
    })

    it('연결 상태 변경 이벤트를 발생시켜야 한다', async () => {
      const onConnectionChange = jest.fn()
      client.on('onConnectionChange', onConnectionChange)

      const connectionPromise = client.connect()
      await server.connected
      await connectionPromise

      expect(onConnectionChange).toHaveBeenCalledWith('connecting')
      expect(onConnectionChange).toHaveBeenCalledWith('connected')
    })

    it('연결 해제를 올바르게 처리해야 한다', async () => {
      await client.connect()
      await server.connected

      client.disconnect()
      expect(client.getConnectionState()).toBe('disconnected')
      expect(client.isConnected()).toBe(false)
    })
  })

  describe('메시지 전송', () => {
    beforeEach(async () => {
      await client.connect()
      await server.connected
    })

    it('메시지를 성공적으로 전송해야 한다', async () => {
      const messageId = client.send('comment', {
        content: '테스트 메시지'
      })

      expect(messageId).toBeDefined()
      await expect(server).toReceiveMessage(
        expect.stringContaining('테스트 메시지')
      )
    })

    it('메시지에 시퀀스 번호를 포함해야 한다', async () => {
      client.send('comment', { content: '첫 번째' })
      client.send('comment', { content: '두 번째' })

      const messages = await server.nextMessage
      const parsedMessage = JSON.parse(messages as string)
      expect(parsedMessage.sequenceNumber).toBeDefined()
    })

    it('연결되지 않은 상태에서 메시지를 큐에 저장해야 한다', () => {
      client.disconnect()
      
      const messageId = client.send('comment', {
        content: '큐잉된 메시지'
      })

      expect(messageId).toBeDefined()
      expect(client.getQueueSize()).toBe(1)
    })

    it('재연결 후 큐잉된 메시지를 전송해야 한다', async () => {
      client.disconnect()
      client.send('comment', { content: '큐잉된 메시지' })
      
      expect(client.getQueueSize()).toBe(1)

      // 재연결
      const reconnectPromise = client.connect()
      await server.connected
      await reconnectPromise

      await expect(server).toReceiveMessage(
        expect.stringContaining('큐잉된 메시지')
      )
      expect(client.getQueueSize()).toBe(0)
    })
  })

  describe('메시지 수신', () => {
    beforeEach(async () => {
      await client.connect()
      await server.connected
    })

    it('수신된 메시지를 올바르게 파싱해야 한다', async () => {
      const onMessage = jest.fn()
      client.on('onMessage', onMessage)

      const testMessage: WebSocketMessage = {
        id: 'test-1',
        type: 'comment',
        payload: { content: '테스트 댓글' },
        timestamp: Date.now(),
        userId: 'user-123'
      }

      server.send(JSON.stringify(testMessage))

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(onMessage).toHaveBeenCalledWith(testMessage)
    })

    it('잘못된 형식의 메시지를 무시해야 한다', async () => {
      const onMessage = jest.fn()
      const onError = jest.fn()
      
      client.on('onMessage', onMessage)
      client.on('onError', onError)

      server.send('invalid json')

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(onMessage).not.toHaveBeenCalled()
      expect(onError).toHaveBeenCalled()
    })

    it('하트비트 메시지에 응답해야 한다', async () => {
      const heartbeatMessage: WebSocketMessage = {
        id: 'heartbeat-1',
        type: 'heartbeat',
        payload: { ping: true },
        timestamp: Date.now()
      }

      server.send(JSON.stringify(heartbeatMessage))

      await expect(server).toReceiveMessage(
        expect.stringContaining('pong')
      )
    })
  })

  describe('재연결 로직', () => {
    it('연결이 끊어지면 자동으로 재연결을 시도해야 한다', async () => {
      const onReconnectAttempt = jest.fn()
      client.on('onReconnectAttempt', onReconnectAttempt)

      await client.connect()
      await server.connected

      // 서버 연결 강제 종료
      server.close()

      // 재연결 시도 대기
      await new Promise(resolve => setTimeout(resolve, 200))
      
      expect(onReconnectAttempt).toHaveBeenCalled()
      expect(client.getConnectionState()).toBe('reconnecting')
    })

    it('최대 재연결 시도 횟수에 도달하면 실패 상태로 변경해야 한다', async () => {
      const onConnectionChange = jest.fn()
      client.on('onConnectionChange', onConnectionChange)

      await client.connect()
      await server.connected

      // 서버 연결 강제 종료
      server.close()

      // 재연결 시도 대기 (최대 시도 횟수 초과 대기)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(onConnectionChange).toHaveBeenCalledWith('failed')
    })
  })

  describe('메시지 순서 보장', () => {
    beforeEach(async () => {
      await client.connect()
      await server.connected
    })

    it('시퀀스 번호가 낮은 중복 메시지를 무시해야 한다', async () => {
      const onMessage = jest.fn()
      client.on('onMessage', onMessage)

      // 높은 시퀀스 번호 메시지 먼저 전송
      const highSeqMessage: WebSocketMessage = {
        id: 'high-seq',
        type: 'comment',
        payload: { content: '높은 시퀀스' },
        timestamp: Date.now(),
        sequenceNumber: 5
      }

      server.send(JSON.stringify(highSeqMessage))
      await new Promise(resolve => setTimeout(resolve, 50))

      // 낮은 시퀀스 번호 메시지 전송 (무시되어야 함)
      const lowSeqMessage: WebSocketMessage = {
        id: 'low-seq',
        type: 'comment',
        payload: { content: '낮은 시퀀스' },
        timestamp: Date.now(),
        sequenceNumber: 3
      }

      server.send(JSON.stringify(lowSeqMessage))
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(onMessage).toHaveBeenCalledTimes(1)
      expect(onMessage).toHaveBeenCalledWith(highSeqMessage)
    })
  })

  describe('에러 처리', () => {
    it('WebSocket 오류 시 에러 이벤트를 발생시켜야 한다', async () => {
      const onError = jest.fn()
      client.on('onError', onError)

      await client.connect()
      await server.connected

      // WebSocket 오류 시뮬레이션
      server.error()

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(onError).toHaveBeenCalled()
    })

    it('파괴된 클라이언트는 연결을 거부해야 한다', async () => {
      client.disconnect()
      
      await expect(client.connect()).rejects.toThrow(
        'WebSocket client has been destroyed'
      )
    })
  })

  describe('성능 및 리소스 관리', () => {
    it('큐 크기 제한을 준수해야 한다', () => {
      const maxQueueSize = 10
      const testClient = new WebSocketClient({
        url: WS_URL,
        messageQueueSize: maxQueueSize,
        enableLogging: false
      })

      // 큐 크기보다 많은 메시지 전송
      for (let i = 0; i < maxQueueSize + 5; i++) {
        testClient.send('comment', { content: `메시지 ${i}` })
      }

      expect(testClient.getQueueSize()).toBe(maxQueueSize)
      testClient.disconnect()
    })

    it('연결 해제 시 모든 타이머를 정리해야 한다', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      await client.connect()
      await server.connected
      
      client.disconnect()

      expect(clearTimeoutSpy).toHaveBeenCalled()
      expect(clearIntervalSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
      clearIntervalSpy.mockRestore()
    })
  })

  describe('메시지 검증', () => {
    beforeEach(async () => {
      await client.connect()
      await server.connected
    })

    it('유효하지 않은 메시지 타입을 거부해야 한다', async () => {
      const onError = jest.fn()
      client.on('onError', onError)

      const invalidMessage = {
        id: 'invalid',
        type: 'invalid_type', // 유효하지 않은 타입
        payload: {},
        timestamp: Date.now()
      }

      server.send(JSON.stringify(invalidMessage))

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(onError).toHaveBeenCalled()
    })

    it('필수 필드가 누락된 메시지를 거부해야 한다', async () => {
      const onError = jest.fn()
      client.on('onError', onError)

      const incompleteMessage = {
        // id 필드 누락
        type: 'comment',
        payload: {},
        timestamp: Date.now()
      }

      server.send(JSON.stringify(incompleteMessage))

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(onError).toHaveBeenCalled()
    })
  })
})