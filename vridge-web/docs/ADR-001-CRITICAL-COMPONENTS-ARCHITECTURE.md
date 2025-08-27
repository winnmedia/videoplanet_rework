# ADR-001: Critical Priority 컴포넌트 FSD 아키텍처 설계

**상태**: 제안됨  
**결정일**: 2025-08-27  
**결정자**: 아키텍처 팀  

## 📋 컨텍스트

VRidge 웹서비스의 미구현 Critical Priority 컴포넌트들을 FSD(Feature-Sliced Design) 아키텍처에 맞게 설계해야 합니다.

### 현재 상황
- Next.js 15.5 + React 19 기반
- 기존 FSD 구조 적용 중 (80% 완성)
- 미구현 컴포넌트: CalendarGrid(20%), VideoPlayerIntegration(40%), ConflictDetectionSystem(0%), RealtimeCollaboration(0%), RBACPermissionManager(0%)

### 제약사항
- 배포 시 문제 발생 없어야 함
- 코드 복잡도 최소화
- 기존 아키텍처와 호환성 유지
- 점진적 구현 가능한 구조

## 🎯 결정사항

### 1. FSD 레이어별 컴포넌트 배치

#### 1.1 VideoPlayerIntegration
**위치**: `widgets/VideoIntegration/`
**근거**: 
- 기존 VideoPlayer를 확장하는 조합형 UI 블록
- 여러 페이지에서 재사용되는 복합 컴포넌트
- 비즈니스 로직보다는 UI 조합에 초점

```
widgets/VideoIntegration/
├── api/videoIntegrationApi.ts
├── model/types.ts
├── ui/
│   ├── VideoPlayerIntegration.tsx
│   ├── VideoSyncManager.tsx
│   └── MultiViewportManager.tsx
└── index.ts
```

#### 1.2 ConflictDetectionSystem
**위치**: `features/conflict-detection/`
**근거**:
- 사용자의 특정 행동(일정 추가/수정)과 연관된 기능
- UI와 로직이 밀결합된 상호작용 중심 컴포넌트
- 알림, 해결 등 사용자 액션을 유발

```
features/conflict-detection/
├── api/conflictApi.ts
├── model/
│   ├── conflictStore.ts
│   ├── types.ts
│   └── useConflictDetection.ts
├── ui/
│   ├── ConflictAlert.tsx
│   ├── ConflictResolutionModal.tsx
│   └── ConflictIndicator.tsx
└── index.ts
```

#### 1.3 RealtimeCollaboration
**위치**: `features/realtime-collaboration/`
**근거**:
- 사용자 간 상호작용을 촉진하는 기능
- 커서 표시, 동시 편집 등 사용자 행동 중심
- 특정 기능에 종속적

```
features/realtime-collaboration/
├── api/websocketApi.ts
├── model/
│   ├── collaborationStore.ts
│   ├── types.ts
│   └── useRealtimeCollaboration.ts
├── ui/
│   ├── UserPresenceIndicator.tsx
│   ├── CollaborationCursor.tsx
│   └── LiveStatusBar.tsx
└── index.ts
```

#### 1.4 RBACPermissionManager
**위치**: `entities/rbac/` + `features/permission-control/`
**근거**:
- **entities**: 순수한 권한 비즈니스 로직 (프레임워크 독립적)
- **features**: React 기반 UI 컴포넌트 및 상호작용

```
entities/rbac/
├── model/
│   ├── types.ts       # Role, Permission 타입 정의
│   ├── rbac.ts        # 순수 비즈니스 로직
│   └── permissions.ts # 권한 상수 정의
└── index.ts

features/permission-control/
├── model/
│   ├── permissionStore.ts
│   ├── usePermissions.ts
│   └── rbacHooks.ts
├── ui/
│   ├── PermissionGuard.tsx
│   ├── RoleSelector.tsx
│   └── AccessDenied.tsx
└── index.ts
```

### 2. 강화된 의존성 규칙

#### 2.1 Critical Components 전용 ESLint 규칙
```javascript
// Critical Priority Components 전용 규칙
{
  files: ["features/conflict-detection/**/*", "features/realtime-collaboration/**/*", "features/permission-control/**/*"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@app/*", "@processes/*", "@widgets/*"],
            message: "Critical features cannot import from higher layers.",
          },
          {
            group: ["react-dom/server"],
            message: "Critical features should avoid server-side rendering dependencies.",
          },
        ],
      },
    ],
  },
}
```

#### 2.2 RBAC Entity 프레임워크 독립성 강제
```javascript
{
  files: ["entities/rbac/**/*"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["react", "react-dom", "next/*"],
            message: "RBAC entities must be framework-independent. Move React logic to features layer.",
          },
        ],
      },
    ],
  },
}
```

### 3. 단계적 구현 전략

#### Phase 1: 안전한 기반 구축 (Week 1-2)
1. **RBAC entities** 구축 (위험도: 낮음)
2. **ConflictDetection** 기존 기능 강화 (위험도: 낮음)

#### Phase 2: 핵심 기능 구현 (Week 3-4)
3. **VideoPlayerIntegration** 구현 (위험도: 중간)
4. **PermissionControl features** 구현 (위험도: 중간)

#### Phase 3: 실시간 기능 구현 (Week 5-6)
5. **RealtimeCollaboration** 구현 (위험도: 높음)

#### Phase 4: 통합 및 최적화 (Week 7-8)
6. 통합 테스트 및 성능 최적화

### 4. 배포 안전성 보장 방안

#### 4.1 Feature Flag 적용
```typescript
const FEATURE_FLAGS = {
  ENHANCED_RBAC: process.env.NEXT_PUBLIC_FEATURE_ENHANCED_RBAC === 'true',
  VIDEO_INTEGRATION: process.env.NEXT_PUBLIC_FEATURE_VIDEO_INTEGRATION === 'true',
  REALTIME_COLLABORATION: process.env.NEXT_PUBLIC_FEATURE_REALTIME === 'true'
}
```

#### 4.2 Fallback 메커니즘
- WebSocket 실패 시 polling 대체
- RBAC 실패 시 기본 권한 적용
- 충돌 감지 실패 시 사용자 알림

#### 4.3 점진적 롤아웃
1. 개발 환경에서 Feature Flag로 테스트
2. 스테이징 환경에서 부분 활성화
3. 프로덕션에서 단계별 롤아웃

## 🔍 고려사항

### 장점
1. **배포 안전성**: 각 단계별 독립적 배포 가능
2. **코드 품질**: 강화된 ESLint 규칙으로 아키텍처 일관성 보장
3. **확장성**: FSD 원칙을 준수하여 장기적 유지보수성 확보
4. **점진적 개선**: 기존 기능에 영향 없이 새 기능 추가

### 위험요소
1. **WebSocket 의존성**: Vercel 서버리스 환경에서 제한적
2. **복잡도 증가**: 새로운 레이어와 의존성 관계 추가
3. **성능 영향**: 실시간 기능으로 인한 리소스 사용 증가

### 완화 방안
1. **WebSocket**: Pusher, Ably 등 외부 서비스 활용 고려
2. **복잡도**: 철저한 문서화 및 테스트 코드 작성
3. **성능**: 번들 분할과 지연 로딩 적용

## 📈 성공 메트릭

### 기술적 메트릭
- ESLint 규칙 위반 0건 유지
- 번들 크기 20% 이내 증가
- 테스트 커버리지 80% 이상 유지

### 비즈니스 메트릭
- 기능 완성도: CalendarGrid(100%), VideoPlayerIntegration(100%), ConflictDetection(100%), Realtime(100%), RBAC(100%)
- 버그 발생률 10% 이내
- 사용자 만족도 향상

## 📚 참고자료

- [Feature-Sliced Design 공식 문서](https://feature-sliced.design/)
- [VRidge FSD Architecture Guide](/ARCHITECTURE_FSD.md)
- [프로젝트 개발 지침](/CLAUDE.md)

## 📝 변경 이력

- 2025-08-27: 초안 작성 (Arthur, Chief Architect)

---

**다음 단계**: 개발 팀과 함께 Phase 1 구현 계획 수립