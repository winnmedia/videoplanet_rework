/**
 * WebSocket & Realtime Collaboration - Public API
 * 실시간 통신 및 협업 기능의 공개 인터페이스
 */

export { 
  WebSocketClient, 
  getWebSocketClient, 
  destroyWebSocketClient,
  type WebSocketMessage,
  type ConnectionState,
  type UserStatus,
  type WebSocketEventListeners,
  type WebSocketConfig
} from './WebSocketClient'

export {
  RealtimeCollaborationManager,
  type RealtimeEvent,
  type CollaborationUser,
  type ConflictResolutionStrategy,
  type OTOperation,
  type CollaborationConfig
} from './RealtimeCollaborationManager'

export { useRealtimeCollaboration } from './useRealtimeCollaboration'
export { useWebSocketConnection } from './useWebSocketConnection'