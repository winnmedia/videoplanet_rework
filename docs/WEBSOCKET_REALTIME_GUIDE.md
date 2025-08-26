# VRidge WebSocket 및 실시간 기능 개선 가이드

## 📋 목차
1. [현재 WebSocket 구현 분석](#1-현재-websocket-구현-분석)
2. [개선된 WebSocket 아키텍처](#2-개선된-websocket-아키텍처)
3. [실시간 기능 구현](#3-실시간-기능-구현)
4. [성능 최적화](#4-성능-최적화)
5. [모니터링 및 디버깅](#5-모니터링-및-디버깅)

---

## 1. 현재 WebSocket 구현 분석

### 현재 문제점
- 인증 미들웨어 부재
- 에러 처리 미흡
- 연결 관리 전략 부재
- 메시지 검증 부족
- 재연결 메커니즘 없음

---

## 2. 개선된 WebSocket 아키텍처

### 2.1 계층적 구조

```
┌─────────────────────────────────────┐
│         Client (Browser)            │
├─────────────────────────────────────┤
│      WebSocket Connection           │
├─────────────────────────────────────┤
│     Django Channels (ASGI)          │
├─────────────────────────────────────┤
│         Consumer Layer              │
├─────────────────────────────────────┤
│      Channel Layer (Redis)          │
├─────────────────────────────────────┤
│     Application Services            │
├─────────────────────────────────────┤
│       Domain Logic                  │
└─────────────────────────────────────┘
```

### 2.2 개선된 Consumer 베이스 클래스

```python
# src/infrastructure/websocket/base.py
import json
import logging
from typing import Dict, Any, Optional, List
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """WebSocket 메시지 타입"""
    # 시스템 메시지
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    ERROR = "error"
    PING = "ping"
    PONG = "pong"
    
    # 인증
    AUTHENTICATE = "authenticate"
    AUTHENTICATED = "authenticated"
    
    # 사용자 상태
    USER_ONLINE = "user_online"
    USER_OFFLINE = "user_offline"
    USER_TYPING = "user_typing"
    
    # 콘텐츠
    MESSAGE = "message"
    NOTIFICATION = "notification"
    UPDATE = "update"

@dataclass
class WebSocketMessage:
    """WebSocket 메시지 구조"""
    type: MessageType
    data: Dict[str, Any]
    timestamp: str
    correlation_id: Optional[str] = None
    
    def to_json(self) -> str:
        return json.dumps({
            'type': self.type.value,
            'data': self.data,
            'timestamp': self.timestamp,
            'correlationId': self.correlation_id
        })

class BaseWebSocketConsumer(AsyncJsonWebsocketConsumer):
    """WebSocket Consumer 베이스 클래스"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.groups: List[str] = []
        self.connection_id: Optional[str] = None
        self.heartbeat_task = None
        
    async def connect(self):
        """WebSocket 연결 처리"""
        try:
            # 연결 ID 생성
            self.connection_id = self._generate_connection_id()
            
            # 인증 확인
            if not await self.authenticate():
                await self.close(code=4001, reason="Unauthorized")
                return
            
            # 기본 그룹 참가
            await self.join_default_groups()
            
            # 연결 수락
            await self.accept()
            
            # 연결 성공 메시지
            await self.send_json({
                'type': MessageType.CONNECT.value,
                'data': {
                    'connectionId': self.connection_id,
                    'userId': self.user.id if self.user else None
                }
            })
            
            # 하트비트 시작
            await self.start_heartbeat()
            
            # 온라인 상태 업데이트
            await self.update_online_status(True)
            
            logger.info(f"WebSocket connected: {self.connection_id}")
            
        except Exception as e:
            logger.error(f"Connection error: {e}")
            await self.close(code=4000, reason="Connection error")
    
    async def disconnect(self, close_code):
        """WebSocket 연결 해제 처리"""
        try:
            # 하트비트 중지
            if self.heartbeat_task:
                self.heartbeat_task.cancel()
            
            # 온라인 상태 업데이트
            await self.update_online_status(False)
            
            # 그룹 나가기
            for group in self.groups:
                await self.channel_layer.group_discard(group, self.channel_name)
            
            logger.info(f"WebSocket disconnected: {self.connection_id}")
            
        except Exception as e:
            logger.error(f"Disconnect error: {e}")
    
    async def receive_json(self, content: Dict[str, Any]):
        """JSON 메시지 수신 처리"""
        try:
            # 메시지 검증
            if not self.validate_message(content):
                await self.send_error("Invalid message format")
                return
            
            message_type = content.get('type')
            handler = self.get_message_handler(message_type)
            
            if handler:
                await handler(content)
            else:
                await self.send_error(f"Unknown message type: {message_type}")
                
        except Exception as e:
            logger.error(f"Receive error: {e}")
            await self.send_error("Message processing error")
    
    async def authenticate(self) -> bool:
        """사용자 인증"""
        # JWT 토큰 확인
        token = self.scope.get('query_string', b'').decode()
        if 'token=' in token:
            token = token.split('token=')[1].split('&')[0]
            self.user = await self.get_user_from_token(token)
            return self.user is not None
        
        # 세션 기반 인증
        self.user = self.scope.get('user')
        return self.user and self.user.is_authenticated
    
    @database_sync_to_async
    def get_user_from_token(self, token: str):
        """토큰에서 사용자 조회"""
        from rest_framework_simplejwt.tokens import AccessToken
        from django.contrib.auth import get_user_model
        
        try:
            access_token = AccessToken(token)
            User = get_user_model()
            return User.objects.get(id=access_token['user_id'])
        except Exception:
            return None
    
    async def join_default_groups(self):
        """기본 그룹 참가"""
        if self.user:
            # 사용자 개인 채널
            user_group = f"user_{self.user.id}"
            await self.channel_layer.group_add(user_group, self.channel_name)
            self.groups.append(user_group)
            
            # 전체 브로드캐스트 채널
            await self.channel_layer.group_add("broadcast", self.channel_name)
            self.groups.append("broadcast")
    
    async def start_heartbeat(self):
        """하트비트 시작"""
        import asyncio
        
        async def heartbeat():
            while True:
                await asyncio.sleep(30)
                await self.send_json({
                    'type': MessageType.PING.value,
                    'timestamp': self._get_timestamp()
                })
        
        self.heartbeat_task = asyncio.create_task(heartbeat())
    
    async def update_online_status(self, is_online: bool):
        """온라인 상태 업데이트"""
        if not self.user:
            return
        
        cache_key = f"user_online_{self.user.id}"
        if is_online:
            cache.set(cache_key, True, timeout=300)  # 5분
        else:
            cache.delete(cache_key)
        
        # 다른 사용자들에게 상태 변경 알림
        await self.channel_layer.group_send(
            "broadcast",
            {
                'type': 'online_status_change',
                'user_id': self.user.id,
                'is_online': is_online
            }
        )
    
    async def send_error(self, message: str, code: Optional[str] = None):
        """에러 메시지 전송"""
        await self.send_json({
            'type': MessageType.ERROR.value,
            'data': {
                'message': message,
                'code': code
            },
            'timestamp': self._get_timestamp()
        })
    
    def validate_message(self, content: Dict[str, Any]) -> bool:
        """메시지 유효성 검증"""
        return 'type' in content and 'data' in content
    
    def get_message_handler(self, message_type: str):
        """메시지 타입별 핸들러 반환"""
        handlers = {
            MessageType.PING.value: self.handle_ping,
            MessageType.AUTHENTICATE.value: self.handle_authenticate,
        }
        return handlers.get(message_type)
    
    async def handle_ping(self, content: Dict[str, Any]):
        """Ping 메시지 처리"""
        await self.send_json({
            'type': MessageType.PONG.value,
            'timestamp': self._get_timestamp()
        })
    
    async def handle_authenticate(self, content: Dict[str, Any]):
        """인증 메시지 처리"""
        token = content.get('data', {}).get('token')
        if token:
            self.user = await self.get_user_from_token(token)
            if self.user:
                await self.join_default_groups()
                await self.send_json({
                    'type': MessageType.AUTHENTICATED.value,
                    'data': {'userId': self.user.id},
                    'timestamp': self._get_timestamp()
                })
            else:
                await self.send_error("Invalid token", "AUTH_001")
    
    async def online_status_change(self, event):
        """온라인 상태 변경 이벤트 처리"""
        await self.send_json({
            'type': MessageType.USER_ONLINE.value if event['is_online'] else MessageType.USER_OFFLINE.value,
            'data': {
                'userId': event['user_id']
            },
            'timestamp': self._get_timestamp()
        })
    
    def _generate_connection_id(self) -> str:
        """연결 ID 생성"""
        import uuid
        return str(uuid.uuid4())
    
    def _get_timestamp(self) -> str:
        """현재 타임스탬프 반환"""
        from datetime import datetime
        return datetime.utcnow().isoformat() + 'Z'
```

---

## 3. 실시간 기능 구현

### 3.1 피드백 실시간 협업

```python
# src/infrastructure/websocket/consumers/feedback.py
from typing import Dict, Any
from src.infrastructure.websocket.base import BaseWebSocketConsumer, MessageType
from src.application.feedbacks.services import FeedbackService
from channels.db import database_sync_to_async
import json

class FeedbackConsumer(BaseWebSocketConsumer):
    """피드백 실시간 협업 Consumer"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.feedback_id = None
        self.feedback_group = None
        self.feedback_service = FeedbackService()
        self.typing_users = set()
    
    async def connect(self):
        """피드백 WebSocket 연결"""
        # 피드백 ID 추출
        self.feedback_id = self.scope['url_route']['kwargs']['feedback_id']
        self.feedback_group = f'feedback_{self.feedback_id}'
        
        # 부모 클래스 연결 처리
        await super().connect()
        
        # 피드백 접근 권한 확인
        if not await self.has_feedback_access():
            await self.close(code=4003, reason="Forbidden")
            return
        
        # 피드백 그룹 참가
        await self.channel_layer.group_add(
            self.feedback_group,
            self.channel_name
        )
        self.groups.append(self.feedback_group)
        
        # 현재 활성 사용자 목록 전송
        await self.send_active_users()
        
        # 다른 사용자들에게 참가 알림
        await self.channel_layer.group_send(
            self.feedback_group,
            {
                'type': 'user_joined',
                'user_id': self.user.id,
                'username': self.user.nickname or self.user.username
            }
        )
    
    async def disconnect(self, close_code):
        """연결 해제"""
        if self.feedback_group:
            # 타이핑 상태 초기화
            if self.user.id in self.typing_users:
                self.typing_users.remove(self.user.id)
                await self.broadcast_typing_status(False)
            
            # 다른 사용자들에게 퇴장 알림
            await self.channel_layer.group_send(
                self.feedback_group,
                {
                    'type': 'user_left',
                    'user_id': self.user.id
                }
            )
        
        await super().disconnect(close_code)
    
    def get_message_handler(self, message_type: str):
        """피드백 메시지 핸들러"""
        handlers = {
            **super().get_message_handler(message_type),
            'send_comment': self.handle_send_comment,
            'update_comment': self.handle_update_comment,
            'delete_comment': self.handle_delete_comment,
            'resolve_comment': self.handle_resolve_comment,
            'typing_start': self.handle_typing_start,
            'typing_stop': self.handle_typing_stop,
            'cursor_move': self.handle_cursor_move,
            'video_seek': self.handle_video_seek,
            'drawing_start': self.handle_drawing_start,
            'drawing_update': self.handle_drawing_update,
            'drawing_end': self.handle_drawing_end,
        }
        return handlers.get(message_type)
    
    @database_sync_to_async
    def has_feedback_access(self) -> bool:
        """피드백 접근 권한 확인"""
        from src.domain.feedbacks.models import Feedback
        
        try:
            feedback = Feedback.objects.get(id=self.feedback_id)
            return feedback.project.members.filter(user=self.user).exists()
        except Feedback.DoesNotExist:
            return False
    
    async def handle_send_comment(self, content: Dict[str, Any]):
        """코멘트 전송 처리"""
        data = content.get('data', {})
        
        # 코멘트 생성
        comment = await database_sync_to_async(self.feedback_service.add_comment)(
            feedback_id=self.feedback_id,
            user_id=self.user.id,
            text=data.get('text'),
            time_start=data.get('timeStart'),
            time_end=data.get('timeEnd'),
            metadata=data.get('metadata', {})
        )
        
        # 모든 사용자에게 브로드캐스트
        await self.channel_layer.group_send(
            self.feedback_group,
            {
                'type': 'new_comment',
                'comment': self.serialize_comment(comment),
                'user_id': self.user.id
            }
        )
        
        # 알림 전송
        await self.send_comment_notification(comment)
    
    async def handle_update_comment(self, content: Dict[str, Any]):
        """코멘트 수정 처리"""
        data = content.get('data', {})
        comment_id = data.get('commentId')
        
        # 권한 확인
        if not await self.can_edit_comment(comment_id):
            await self.send_error("Permission denied", "PERM_001")
            return
        
        # 코멘트 업데이트
        comment = await database_sync_to_async(self.feedback_service.update_comment)(
            comment_id=comment_id,
            text=data.get('text'),
            metadata=data.get('metadata')
        )
        
        # 브로드캐스트
        await self.channel_layer.group_send(
            self.feedback_group,
            {
                'type': 'comment_updated',
                'comment': self.serialize_comment(comment),
                'user_id': self.user.id
            }
        )
    
    async def handle_delete_comment(self, content: Dict[str, Any]):
        """코멘트 삭제 처리"""
        data = content.get('data', {})
        comment_id = data.get('commentId')
        
        # 권한 확인
        if not await self.can_delete_comment(comment_id):
            await self.send_error("Permission denied", "PERM_002")
            return
        
        # 코멘트 삭제
        await database_sync_to_async(self.feedback_service.delete_comment)(comment_id)
        
        # 브로드캐스트
        await self.channel_layer.group_send(
            self.feedback_group,
            {
                'type': 'comment_deleted',
                'comment_id': comment_id,
                'user_id': self.user.id
            }
        )
    
    async def handle_resolve_comment(self, content: Dict[str, Any]):
        """코멘트 해결 처리"""
        data = content.get('data', {})
        comment_id = data.get('commentId')
        is_resolved = data.get('isResolved', True)
        
        # 코멘트 해결 상태 변경
        comment = await database_sync_to_async(self.feedback_service.resolve_comment)(
            comment_id=comment_id,
            is_resolved=is_resolved,
            resolved_by=self.user.id
        )
        
        # 브로드캐스트
        await self.channel_layer.group_send(
            self.feedback_group,
            {
                'type': 'comment_resolved',
                'comment': self.serialize_comment(comment),
                'user_id': self.user.id
            }
        )
    
    async def handle_typing_start(self, content: Dict[str, Any]):
        """타이핑 시작 처리"""
        self.typing_users.add(self.user.id)
        await self.broadcast_typing_status(True)
    
    async def handle_typing_stop(self, content: Dict[str, Any]):
        """타이핑 중지 처리"""
        if self.user.id in self.typing_users:
            self.typing_users.remove(self.user.id)
        await self.broadcast_typing_status(False)
    
    async def handle_cursor_move(self, content: Dict[str, Any]):
        """커서 이동 처리 (협업 커서)"""
        data = content.get('data', {})
        
        await self.channel_layer.group_send(
            self.feedback_group,
            {
                'type': 'cursor_position',
                'user_id': self.user.id,
                'position': data.get('position'),
                'timestamp': data.get('timestamp')
            }
        )
    
    async def handle_video_seek(self, content: Dict[str, Any]):
        """비디오 시크 처리"""
        data = content.get('data', {})
        
        await self.channel_layer.group_send(
            self.feedback_group,
            {
                'type': 'video_seeked',
                'user_id': self.user.id,
                'time': data.get('time'),
                'username': self.user.nickname or self.user.username
            }
        )
    
    async def handle_drawing_start(self, content: Dict[str, Any]):
        """그리기 시작 처리"""
        data = content.get('data', {})
        
        drawing_id = await database_sync_to_async(self.feedback_service.create_drawing)(
            feedback_id=self.feedback_id,
            user_id=self.user.id,
            type=data.get('type'),
            color=data.get('color'),
            size=data.get('size')
        )
        
        await self.channel_layer.group_send(
            self.feedback_group,
            {
                'type': 'drawing_started',
                'drawing_id': drawing_id,
                'user_id': self.user.id,
                'data': data
            }
        )
    
    async def handle_drawing_update(self, content: Dict[str, Any]):
        """그리기 업데이트 처리"""
        data = content.get('data', {})
        
        await self.channel_layer.group_send(
            self.feedback_group,
            {
                'type': 'drawing_updated',
                'user_id': self.user.id,
                'drawing_id': data.get('drawingId'),
                'points': data.get('points')
            }
        )
    
    async def handle_drawing_end(self, content: Dict[str, Any]):
        """그리기 종료 처리"""
        data = content.get('data', {})
        
        await database_sync_to_async(self.feedback_service.finalize_drawing)(
            drawing_id=data.get('drawingId'),
            points=data.get('points')
        )
        
        await self.channel_layer.group_send(
            self.feedback_group,
            {
                'type': 'drawing_ended',
                'user_id': self.user.id,
                'drawing_id': data.get('drawingId')
            }
        )
    
    async def broadcast_typing_status(self, is_typing: bool):
        """타이핑 상태 브로드캐스트"""
        await self.channel_layer.group_send(
            self.feedback_group,
            {
                'type': 'typing_status',
                'user_id': self.user.id,
                'username': self.user.nickname or self.user.username,
                'is_typing': is_typing
            }
        )
    
    async def send_active_users(self):
        """활성 사용자 목록 전송"""
        # 현재 연결된 사용자 목록 조회
        active_users = await self.get_active_users()
        
        await self.send_json({
            'type': 'active_users',
            'data': {
                'users': active_users
            }
        })
    
    @database_sync_to_async
    def get_active_users(self):
        """활성 사용자 목록 조회"""
        from django.core.cache import cache
        
        active_users = []
        # Redis에서 활성 사용자 조회
        pattern = f"feedback_{self.feedback_id}_user_*"
        for key in cache.keys(pattern):
            user_id = key.split('_')[-1]
            user_data = cache.get(key)
            if user_data:
                active_users.append(user_data)
        
        return active_users
    
    def serialize_comment(self, comment) -> Dict[str, Any]:
        """코멘트 직렬화"""
        return {
            'id': comment.id,
            'text': comment.text,
            'userId': comment.user_id,
            'username': comment.user.nickname or comment.user.username,
            'timeStart': comment.time_start,
            'timeEnd': comment.time_end,
            'isResolved': comment.is_resolved,
            'resolvedBy': comment.resolved_by_id,
            'createdAt': comment.created_at.isoformat(),
            'updatedAt': comment.updated_at.isoformat(),
            'metadata': comment.metadata or {}
        }
    
    # 이벤트 핸들러들
    async def new_comment(self, event):
        """새 코멘트 이벤트"""
        if event['user_id'] != self.user.id:
            await self.send_json({
                'type': 'new_comment',
                'data': event['comment']
            })
    
    async def comment_updated(self, event):
        """코멘트 수정 이벤트"""
        await self.send_json({
            'type': 'comment_updated',
            'data': event['comment']
        })
    
    async def comment_deleted(self, event):
        """코멘트 삭제 이벤트"""
        await self.send_json({
            'type': 'comment_deleted',
            'data': {
                'commentId': event['comment_id']
            }
        })
    
    async def comment_resolved(self, event):
        """코멘트 해결 이벤트"""
        await self.send_json({
            'type': 'comment_resolved',
            'data': event['comment']
        })
    
    async def typing_status(self, event):
        """타이핑 상태 이벤트"""
        if event['user_id'] != self.user.id:
            await self.send_json({
                'type': 'typing_status',
                'data': {
                    'userId': event['user_id'],
                    'username': event['username'],
                    'isTyping': event['is_typing']
                }
            })
    
    async def cursor_position(self, event):
        """커서 위치 이벤트"""
        if event['user_id'] != self.user.id:
            await self.send_json({
                'type': 'cursor_position',
                'data': {
                    'userId': event['user_id'],
                    'position': event['position']
                }
            })
    
    async def user_joined(self, event):
        """사용자 참가 이벤트"""
        if event['user_id'] != self.user.id:
            await self.send_json({
                'type': 'user_joined',
                'data': {
                    'userId': event['user_id'],
                    'username': event['username']
                }
            })
    
    async def user_left(self, event):
        """사용자 퇴장 이벤트"""
        if event['user_id'] != self.user.id:
            await self.send_json({
                'type': 'user_left',
                'data': {
                    'userId': event['user_id']
                }
            })
```

### 3.2 실시간 알림 시스템

```python
# src/infrastructure/websocket/consumers/notification.py
from src.infrastructure.websocket.base import BaseWebSocketConsumer
from channels.db import database_sync_to_async
from typing import Dict, Any, List

class NotificationConsumer(BaseWebSocketConsumer):
    """실시간 알림 Consumer"""
    
    async def connect(self):
        """알림 WebSocket 연결"""
        await super().connect()
        
        if not self.user:
            await self.close(code=4001)
            return
        
        # 사용자별 알림 채널 구독
        notification_group = f"notifications_{self.user.id}"
        await self.channel_layer.group_add(
            notification_group,
            self.channel_name
        )
        self.groups.append(notification_group)
        
        # 읽지 않은 알림 전송
        await self.send_unread_notifications()
    
    async def send_unread_notifications(self):
        """읽지 않은 알림 전송"""
        notifications = await self.get_unread_notifications()
        
        await self.send_json({
            'type': 'unread_notifications',
            'data': {
                'notifications': notifications,
                'count': len(notifications)
            }
        })
    
    @database_sync_to_async
    def get_unread_notifications(self) -> List[Dict[str, Any]]:
        """읽지 않은 알림 조회"""
        from src.domain.notifications.models import Notification
        
        notifications = Notification.objects.filter(
            user=self.user,
            is_read=False
        ).order_by('-created_at')[:50]
        
        return [
            {
                'id': n.id,
                'type': n.type,
                'title': n.title,
                'message': n.message,
                'data': n.data,
                'createdAt': n.created_at.isoformat(),
                'isRead': n.is_read
            }
            for n in notifications
        ]
    
    def get_message_handler(self, message_type: str):
        """알림 메시지 핸들러"""
        handlers = {
            **super().get_message_handler(message_type),
            'mark_as_read': self.handle_mark_as_read,
            'mark_all_as_read': self.handle_mark_all_as_read,
            'delete_notification': self.handle_delete_notification,
        }
        return handlers.get(message_type)
    
    async def handle_mark_as_read(self, content: Dict[str, Any]):
        """알림 읽음 처리"""
        notification_id = content.get('data', {}).get('notificationId')
        
        await database_sync_to_async(self.mark_notification_as_read)(
            notification_id
        )
        
        await self.send_json({
            'type': 'notification_read',
            'data': {
                'notificationId': notification_id
            }
        })
    
    async def handle_mark_all_as_read(self, content: Dict[str, Any]):
        """모든 알림 읽음 처리"""
        count = await database_sync_to_async(self.mark_all_as_read)()
        
        await self.send_json({
            'type': 'all_notifications_read',
            'data': {
                'count': count
            }
        })
    
    async def handle_delete_notification(self, content: Dict[str, Any]):
        """알림 삭제"""
        notification_id = content.get('data', {}).get('notificationId')
        
        await database_sync_to_async(self.delete_notification)(
            notification_id
        )
        
        await self.send_json({
            'type': 'notification_deleted',
            'data': {
                'notificationId': notification_id
            }
        })
    
    def mark_notification_as_read(self, notification_id: str):
        """알림을 읽음으로 표시"""
        from src.domain.notifications.models import Notification
        
        Notification.objects.filter(
            id=notification_id,
            user=self.user
        ).update(is_read=True)
    
    def mark_all_as_read(self) -> int:
        """모든 알림을 읽음으로 표시"""
        from src.domain.notifications.models import Notification
        
        return Notification.objects.filter(
            user=self.user,
            is_read=False
        ).update(is_read=True)
    
    def delete_notification(self, notification_id: str):
        """알림 삭제"""
        from src.domain.notifications.models import Notification
        
        Notification.objects.filter(
            id=notification_id,
            user=self.user
        ).delete()
    
    # 이벤트 핸들러
    async def send_notification(self, event):
        """새 알림 전송"""
        await self.send_json({
            'type': 'new_notification',
            'data': event['notification']
        })
```

---

## 4. 성능 최적화

### 4.1 연결 풀링

```python
# src/infrastructure/websocket/pool.py
from typing import Dict, Set, Optional
from dataclasses import dataclass
from datetime import datetime
import asyncio

@dataclass
class ConnectionInfo:
    """연결 정보"""
    connection_id: str
    user_id: Optional[str]
    channel_name: str
    connected_at: datetime
    last_activity: datetime
    groups: Set[str]

class ConnectionPool:
    """WebSocket 연결 풀 관리"""
    
    def __init__(self, max_connections: int = 10000):
        self.connections: Dict[str, ConnectionInfo] = {}
        self.user_connections: Dict[str, Set[str]] = {}
        self.max_connections = max_connections
        self._lock = asyncio.Lock()
    
    async def add_connection(
        self,
        connection_id: str,
        channel_name: str,
        user_id: Optional[str] = None
    ) -> bool:
        """연결 추가"""
        async with self._lock:
            if len(self.connections) >= self.max_connections:
                return False
            
            conn_info = ConnectionInfo(
                connection_id=connection_id,
                user_id=user_id,
                channel_name=channel_name,
                connected_at=datetime.now(),
                last_activity=datetime.now(),
                groups=set()
            )
            
            self.connections[connection_id] = conn_info
            
            if user_id:
                if user_id not in self.user_connections:
                    self.user_connections[user_id] = set()
                self.user_connections[user_id].add(connection_id)
            
            return True
    
    async def remove_connection(self, connection_id: str):
        """연결 제거"""
        async with self._lock:
            if connection_id in self.connections:
                conn_info = self.connections[connection_id]
                
                # 사용자 연결 목록에서 제거
                if conn_info.user_id:
                    self.user_connections[conn_info.user_id].discard(
                        connection_id
                    )
                    if not self.user_connections[conn_info.user_id]:
                        del self.user_connections[conn_info.user_id]
                
                del self.connections[connection_id]
    
    async def get_user_connections(
        self,
        user_id: str
    ) -> List[ConnectionInfo]:
        """사용자의 모든 연결 조회"""
        async with self._lock:
            conn_ids = self.user_connections.get(user_id, set())
            return [
                self.connections[conn_id]
                for conn_id in conn_ids
                if conn_id in self.connections
            ]
    
    async def update_activity(self, connection_id: str):
        """활동 시간 업데이트"""
        async with self._lock:
            if connection_id in self.connections:
                self.connections[connection_id].last_activity = datetime.now()
    
    async def cleanup_inactive_connections(self, timeout_seconds: int = 300):
        """비활성 연결 정리"""
        async with self._lock:
            now = datetime.now()
            to_remove = []
            
            for conn_id, conn_info in self.connections.items():
                inactive_time = (now - conn_info.last_activity).total_seconds()
                if inactive_time > timeout_seconds:
                    to_remove.append(conn_id)
            
            for conn_id in to_remove:
                await self.remove_connection(conn_id)
            
            return len(to_remove)
    
    def get_stats(self) -> Dict[str, Any]:
        """연결 통계"""
        return {
            'total_connections': len(self.connections),
            'unique_users': len(self.user_connections),
            'max_connections': self.max_connections,
            'usage_percentage': (len(self.connections) / self.max_connections) * 100
        }

# 싱글톤 인스턴스
connection_pool = ConnectionPool()
```

### 4.2 메시지 배치 처리

```python
# src/infrastructure/websocket/batch.py
import asyncio
from typing import List, Dict, Any
from collections import defaultdict
from datetime import datetime

class MessageBatcher:
    """메시지 배치 처리"""
    
    def __init__(
        self,
        batch_size: int = 100,
        batch_timeout: float = 0.1
    ):
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self.pending_messages: Dict[str, List[Dict]] = defaultdict(list)
        self.batch_tasks: Dict[str, asyncio.Task] = {}
    
    async def add_message(
        self,
        channel_name: str,
        message: Dict[str, Any]
    ):
        """메시지 추가"""
        self.pending_messages[channel_name].append(message)
        
        # 배치 크기 도달 시 즉시 전송
        if len(self.pending_messages[channel_name]) >= self.batch_size:
            await self.flush_channel(channel_name)
        
        # 타이머 시작
        elif channel_name not in self.batch_tasks:
            task = asyncio.create_task(
                self._batch_timer(channel_name)
            )
            self.batch_tasks[channel_name] = task
    
    async def _batch_timer(self, channel_name: str):
        """배치 타이머"""
        await asyncio.sleep(self.batch_timeout)
        await self.flush_channel(channel_name)
    
    async def flush_channel(self, channel_name: str):
        """채널 메시지 플러시"""
        if channel_name in self.pending_messages:
            messages = self.pending_messages[channel_name]
            if messages:
                # 배치 메시지 전송
                await self.send_batch(channel_name, messages)
                
                # 초기화
                self.pending_messages[channel_name] = []
                
                # 타스크 정리
                if channel_name in self.batch_tasks:
                    del self.batch_tasks[channel_name]
    
    async def send_batch(
        self,
        channel_name: str,
        messages: List[Dict[str, Any]]
    ):
        """배치 메시지 전송"""
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        
        # 배치 메시지 구성
        batch_message = {
            'type': 'batch_messages',
            'messages': messages,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        await channel_layer.send(channel_name, batch_message)
    
    async def flush_all(self):
        """모든 채널 플러시"""
        channels = list(self.pending_messages.keys())
        for channel_name in channels:
            await self.flush_channel(channel_name)

# 전역 배처
message_batcher = MessageBatcher()
```

---

## 5. 모니터링 및 디버깅

### 5.1 WebSocket 메트릭

```python
# src/infrastructure/websocket/metrics.py
from prometheus_client import Counter, Gauge, Histogram
from functools import wraps

# 메트릭 정의
ws_connections_total = Counter(
    'websocket_connections_total',
    'Total WebSocket connections',
    ['consumer_type']
)

ws_active_connections = Gauge(
    'websocket_active_connections',
    'Active WebSocket connections',
    ['consumer_type']
)

ws_messages_received = Counter(
    'websocket_messages_received_total',
    'Total messages received',
    ['consumer_type', 'message_type']
)

ws_messages_sent = Counter(
    'websocket_messages_sent_total',
    'Total messages sent',
    ['consumer_type', 'message_type']
)

ws_message_processing_time = Histogram(
    'websocket_message_processing_seconds',
    'Message processing time',
    ['consumer_type', 'message_type']
)

ws_errors = Counter(
    'websocket_errors_total',
    'Total WebSocket errors',
    ['consumer_type', 'error_type']
)

def track_connection(consumer_type: str):
    """연결 추적 데코레이터"""
    def decorator(func):
        @wraps(func)
        async def wrapper(self, *args, **kwargs):
            ws_connections_total.labels(consumer_type=consumer_type).inc()
            ws_active_connections.labels(consumer_type=consumer_type).inc()
            try:
                return await func(self, *args, **kwargs)
            finally:
                ws_active_connections.labels(consumer_type=consumer_type).dec()
        return wrapper
    return decorator

def track_message(consumer_type: str):
    """메시지 추적 데코레이터"""
    def decorator(func):
        @wraps(func)
        async def wrapper(self, content, *args, **kwargs):
            message_type = content.get('type', 'unknown')
            
            ws_messages_received.labels(
                consumer_type=consumer_type,
                message_type=message_type
            ).inc()
            
            with ws_message_processing_time.labels(
                consumer_type=consumer_type,
                message_type=message_type
            ).time():
                try:
                    return await func(self, content, *args, **kwargs)
                except Exception as e:
                    ws_errors.labels(
                        consumer_type=consumer_type,
                        error_type=type(e).__name__
                    ).inc()
                    raise
        return wrapper
    return decorator
```

### 5.2 디버그 도구

```python
# src/infrastructure/websocket/debug.py
import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional

class WebSocketDebugger:
    """WebSocket 디버깅 도구"""
    
    def __init__(self, enabled: bool = False):
        self.enabled = enabled
        self.logger = logging.getLogger('websocket.debug')
        self.message_log = []
        self.max_log_size = 1000
    
    def log_connection(
        self,
        connection_id: str,
        user_id: Optional[str],
        event: str
    ):
        """연결 이벤트 로그"""
        if not self.enabled:
            return
        
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'event': event,
            'connection_id': connection_id,
            'user_id': user_id
        }
        
        self.logger.debug(json.dumps(log_entry))
        self._add_to_log(log_entry)
    
    def log_message(
        self,
        connection_id: str,
        direction: str,  # 'in' or 'out'
        message: Dict[str, Any]
    ):
        """메시지 로그"""
        if not self.enabled:
            return
        
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'connection_id': connection_id,
            'direction': direction,
            'message_type': message.get('type'),
            'message': message
        }
        
        self.logger.debug(json.dumps(log_entry))
        self._add_to_log(log_entry)
    
    def log_error(
        self,
        connection_id: str,
        error: Exception,
        context: Optional[Dict[str, Any]] = None
    ):
        """에러 로그"""
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'connection_id': connection_id,
            'error_type': type(error).__name__,
            'error_message': str(error),
            'context': context
        }
        
        self.logger.error(json.dumps(log_entry))
        self._add_to_log(log_entry)
    
    def _add_to_log(self, entry: Dict[str, Any]):
        """로그 버퍼에 추가"""
        self.message_log.append(entry)
        
        # 크기 제한
        if len(self.message_log) > self.max_log_size:
            self.message_log = self.message_log[-self.max_log_size:]
    
    def get_recent_logs(
        self,
        count: int = 100,
        connection_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """최근 로그 조회"""
        logs = self.message_log[-count:]
        
        if connection_id:
            logs = [
                log for log in logs
                if log.get('connection_id') == connection_id
            ]
        
        return logs
    
    def clear_logs(self):
        """로그 초기화"""
        self.message_log = []

# 전역 디버거
ws_debugger = WebSocketDebugger(
    enabled=settings.DEBUG
)
```

### 5.3 관리 명령어

```python
# src/management/commands/ws_monitor.py
from django.core.management.base import BaseCommand
from src.infrastructure.websocket.pool import connection_pool
from src.infrastructure.websocket.metrics import (
    ws_active_connections,
    ws_messages_received,
    ws_messages_sent
)
import asyncio
from rich.console import Console
from rich.table import Table
from rich.live import Live

class Command(BaseCommand):
    """WebSocket 모니터링 명령어"""
    
    help = 'Monitor WebSocket connections in real-time'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--refresh',
            type=int,
            default=1,
            help='Refresh interval in seconds'
        )
    
    def handle(self, *args, **options):
        refresh_interval = options['refresh']
        asyncio.run(self.monitor(refresh_interval))
    
    async def monitor(self, refresh_interval: int):
        """실시간 모니터링"""
        console = Console()
        
        with Live(console=console, refresh_per_second=1) as live:
            while True:
                table = self.create_stats_table()
                live.update(table)
                await asyncio.sleep(refresh_interval)
    
    def create_stats_table(self) -> Table:
        """통계 테이블 생성"""
        stats = connection_pool.get_stats()
        
        table = Table(title="WebSocket Monitor")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="green")
        
        table.add_row("Total Connections", str(stats['total_connections']))
        table.add_row("Unique Users", str(stats['unique_users']))
        table.add_row("Usage", f"{stats['usage_percentage']:.1f}%")
        
        # 메트릭 추가
        table.add_row("Messages Received", str(ws_messages_received._value.sum()))
        table.add_row("Messages Sent", str(ws_messages_sent._value.sum()))
        
        return table
```

---

## 마무리

이 개선된 WebSocket 아키텍처는:

1. **안정성**: 연결 관리, 에러 처리, 재연결 메커니즘
2. **성능**: 메시지 배치 처리, 연결 풀링, 캐싱
3. **확장성**: 수평 확장 가능한 구조
4. **모니터링**: 실시간 메트릭 및 디버깅 도구
5. **보안**: 인증/인가, 메시지 검증

을 제공하여 대규모 실시간 협업을 지원할 수 있습니다.