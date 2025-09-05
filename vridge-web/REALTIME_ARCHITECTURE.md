# VideoPlanet Real-Time Collaboration Architecture

> **Phase 3 PREMIUM UX - WebSocket 기반 실시간 협업 시스템**  
> 생성일: 2025-09-04  
> 기준: FSD Architecture + Django Channels + React 19

---

## 🎯 **Phase 3 Real-Time Collaboration 목표**

### **핵심 목표**
- **실시간 협업**: WebSocket 기반 다중 사용자 동시 편집
- **사용자 현재 상태**: 온라인 상태, 현재 작업 위치 표시
- **활동 피드**: 실시간 협업 활동 추적 및 알림
- **충돌 해결**: 동시 편집 시 자동 병합 및 충돌 방지

### **기술 스택**
- **Frontend**: React 19 + WebSocket API + Redux Toolkit 2.0
- **Backend**: Django Channels + Redis + WebSocket
- **State Sync**: Operational Transform (OT) 알고리즘
- **Presence**: 실시간 사용자 위치 추적

---

## 🏗️ **시스템 아키텍처**

### **1. WebSocket 연결 아키텍처**

```
┌─────────────────┐    WebSocket     ┌─────────────────┐
│   React Client  │ ←──────────────→ │ Django Channels │
│                 │                  │                 │
│ - WebSocket     │                  │ - Consumer      │
│ - Redux Store   │                  │ - Group Manager │
│ - Presence UI   │                  │ - Message Router│
└─────────────────┘                  └─────────────────┘
         │                                    │
         │                                    │
    ┌─────────────────┐                ┌─────────────────┐
    │   State Sync    │                │   Redis Store   │
    │                 │                │                 │
    │ - OT Algorithm  │                │ - Room State    │
    │ - Conflict Res. │                │ - User Presence │
    │ - Auto Merge    │                │ - Message Queue │
    └─────────────────┘                └─────────────────┘
```

### **2. FSD 레이어별 구조**

```
shared/
├── lib/websocket/
│   ├── WebSocketClient.ts          # 클라이언트 연결 관리
│   ├── OperationalTransform.ts     # OT 알고리즘 구현
│   └── PresenceManager.ts          # 사용자 현재 상태 관리

entities/
├── collaboration/
│   ├── model/
│   │   ├── collaborationSlice.ts   # Redux 상태 관리
│   │   ├── presenceSlice.ts        # 사용자 현재 상태
│   │   └── activitySlice.ts        # 활동 피드
│   ├── api/
│   │   └── websocketHandlers.ts    # WebSocket 메시지 핸들러
│   └── types/
│       └── collaboration.types.ts  # 타입 정의

features/
├── real-time-collaboration/
│   ├── ui/
│   │   ├── PresenceIndicators.tsx  # 사용자 현재 상태 UI
│   │   ├── ActivityFeed.tsx        # 실시간 활동 피드
│   │   └── CollaborationToolbar.tsx # 협업 도구
│   └── model/
│       └── useCollaboration.ts     # 협업 훅

widgets/
├── CollaborativeVideoPlanning/     # 실시간 비디오 기획
├── CollaborativeCalendar/          # 실시간 캘린더
└── CollaborationHub/               # 협업 센터
```

---

## 📡 **WebSocket 메시지 프로토콜**

### **1. 연결 관리**
```typescript
// 연결 시작
{
  type: 'connection.join',
  payload: {
    userId: string,
    projectId: string,
    sessionId: string
  }
}

// 연결 종료
{
  type: 'connection.leave',
  payload: {
    userId: string,
    sessionId: string
  }
}
```

### **2. 사용자 현재 상태 (Presence)**
```typescript
// 현재 위치 업데이트
{
  type: 'presence.update',
  payload: {
    userId: string,
    location: {
      page: 'video-planning' | 'calendar' | 'project',
      component: string,
      elementId?: string
    },
    cursor?: { x: number, y: number },
    isActive: boolean,
    timestamp: number
  }
}

// 사용자 상태 브로드캐스트
{
  type: 'presence.broadcast',
  payload: {
    users: UserPresence[]
  }
}
```

### **3. 실시간 편집 동기화**
```typescript
// 편집 작업 (Operational Transform)
{
  type: 'edit.operation',
  payload: {
    userId: string,
    operationId: string,
    operation: {
      type: 'insert' | 'delete' | 'replace',
      path: string,      // JSON Path (예: "stages.0.content")
      index?: number,
      content?: any,
      previousValue?: any
    },
    timestamp: number,
    version: number
  }
}

// 편집 확인
{
  type: 'edit.acknowledge',
  payload: {
    operationId: string,
    success: boolean,
    version: number
  }
}
```

### **4. 활동 피드**
```typescript
// 활동 알림
{
  type: 'activity.notify',
  payload: {
    userId: string,
    userName: string,
    action: 'created' | 'modified' | 'deleted' | 'commented',
    target: {
      type: 'video-plan' | 'calendar-event' | 'project',
      id: string,
      name: string
    },
    timestamp: number
  }
}
```

---

## 🔄 **Operational Transform (OT) 알고리즘**

### **1. 기본 개념**
```typescript
interface Operation {
  id: string
  type: 'insert' | 'delete' | 'replace'
  path: string
  index?: number
  content?: any
  timestamp: number
  userId: string
}

interface TransformResult {
  clientOperation: Operation
  serverOperation: Operation
  conflict: boolean
}
```

### **2. 변환 로직**
```typescript
// shared/lib/websocket/OperationalTransform.ts
export class OperationalTransform {
  // 두 연산을 변환하여 충돌 해결
  static transform(op1: Operation, op2: Operation): TransformResult {
    // 1. 같은 경로에 대한 동시 편집 감지
    if (op1.path === op2.path) {
      return this.handlePathConflict(op1, op2)
    }
    
    // 2. 부모-자식 경로 충돌 감지
    if (this.isParentChild(op1.path, op2.path)) {
      return this.handleHierarchyConflict(op1, op2)
    }
    
    // 3. 충돌 없음 - 병렬 적용 가능
    return {
      clientOperation: op1,
      serverOperation: op2,
      conflict: false
    }
  }
}
```

---

## 👥 **실시간 협업 기능별 구현**

### **1. Video Planning 협업**
- **동시 편집**: 4단계 기획서 실시간 공동 편집
- **샷 배치**: 12샷 그리드에서 실시간 샷 수정
- **댓글 시스템**: 특정 단계/샷에 실시간 댓글

### **2. Calendar 협업**
- **실시간 드래그**: 여러 사용자가 동시에 일정 조작
- **충돌 방지**: 같은 일정을 동시 수정 시 잠금
- **변경 추적**: 일정 변경 시 실시간 알림

### **3. Project Management 협업**
- **팀원 추가/제거**: 실시간 팀 구성 변경
- **권한 변경**: 역할 변경 시 즉시 반영
- **진행 상태**: 프로젝트 진행률 실시간 업데이트

---

## 🚀 **구현 우선순위**

### **Week 1: WebSocket 기반 구조 구축**
- [x] WebSocket 클라이언트 라이브러리 구현
- [ ] Django Channels Consumer 구현
- [ ] Redis 룸 관리 시스템 구축
- [ ] 기본 연결/해제 프로토콜 구현

### **Week 2: 사용자 현재 상태 (Presence) 시스템**
- [ ] 실시간 사용자 위치 추적
- [ ] 사용자 아바타/커서 표시
- [ ] 활성 사용자 목록 UI
- [ ] 온라인/오프라인 상태 전환

### **Week 3: 실시간 편집 동기화**
- [ ] Operational Transform 알고리즘 구현
- [ ] Video Planning 실시간 편집
- [ ] 충돌 감지 및 자동 해결
- [ ] 편집 기록 및 실행 취소

### **Week 4: 활동 피드 및 알림**
- [ ] 실시간 활동 피드 구현
- [ ] Push 알림 시스템
- [ ] 협업 분석 대시보드
- [ ] 성능 최적화 및 테스트

---

## 📊 **성능 목표**

### **실시간성 목표**
- **WebSocket 지연시간**: < 100ms
- **편집 동기화**: < 200ms
- **현재 상태 업데이트**: < 50ms

### **확장성 목표**
- **동시 사용자**: 프로젝트당 최대 20명
- **메시지 처리량**: 초당 1000개 메시지
- **메모리 사용량**: 사용자당 < 1MB

### **안정성 목표**
- **연결 복구**: 3초 이내 자동 재연결
- **데이터 무결성**: 100% 동기화 보장
- **충돌 해결**: 자동 병합 성공률 > 95%

---

## 🔒 **보안 및 인증**

### **WebSocket 인증**
```typescript
// JWT 토큰 기반 WebSocket 인증
const wsUrl = `wss://api.vlanet.net/ws/collaboration/?token=${jwtToken}`

// 연결 시 토큰 검증
if (!verifyJWT(token)) {
  websocket.close(1008, 'Invalid authentication')
}
```

### **권한 기반 접근 제어**
- **프로젝트 멤버만 접근**: 프로젝트 소속 확인
- **역할별 편집 권한**: Owner/Admin만 중요 설정 변경
- **실시간 권한 동기화**: 권한 변경 시 즉시 반영

---

**📝 문서 정보**
- **작성자**: Phase 3 Real-Time Architecture Team
- **마지막 업데이트**: 2025-09-04
- **상태**: Phase 3 개발 시작
- **승인자**: VideoPlanet Development Team

*이 문서는 Phase 3 PREMIUM UX 개발의 기술적 기반을 정의합니다.*