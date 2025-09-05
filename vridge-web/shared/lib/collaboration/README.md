# 협업 시스템 (Collaboration System)

## 🎯 개요

WebSocket 복잡성을 제거하고 **단순한 폴링 + 낙관적 UI** 방식으로 구현된 협업 시스템입니다.
기존 Redux 패턴과 완벽히 호환되며, 누구나 쉽게 이해하고 수정할 수 있도록 설계되었습니다.

## 🏗️ 아키텍처 특징

- **단순함**: 복잡한 실시간 프로토콜 대신 REST API + 폴링
- **친숙함**: 기존 Redux Toolkit 패턴 100% 활용
- **예측가능함**: 동기/비동기 플로우가 명확하게 분리됨
- **확장가능함**: 기능별 특화 훅 제공 (비디오 기획, 캘린더 등)

## 📁 디렉토리 구조

```
shared/lib/collaboration/
├── types.ts                    # 타입 정의
├── slice.ts                    # Redux 슬라이스 (상태 관리)
├── hooks/
│   └── useCollaboration.ts     # 메인 협업 훅
├── components/
│   ├── CollaborationIndicator.tsx  # 활성 사용자 표시
│   ├── ConflictModal.tsx           # 충돌 해결 모달
│   └── ActivityFeed.tsx            # 활동 피드
├── index.ts                    # Public API
└── README.md                   # 이 문서
```

## 🚀 핵심 기능

### 1. 낙관적 UI 업데이트
```typescript
const { actions } = useCollaboration()

// 즉시 UI 반영, 백그라운드에서 서버 동기화
actions.performOptimisticUpdate({
  changeId: 'unique-id',
  resourceId: 'video-plan-123',
  resourceType: 'video-planning',
  action: 'update',
  data: { title: '새로운 제목' }
})
```

### 2. 자동 폴링
```typescript
// 3초마다 자동 폴링, 윈도우 포커스 시 즉시 실행
const collaboration = useCollaboration({
  pollInterval: 3000,
  enabled: true
})
```

### 3. 타임스탬프 기반 충돌 감지
```typescript
// 마지막 작성자 우선 (Last Writer Wins)
const { state } = useCollaboration()

if (state.conflicts.length > 0) {
  // ConflictModal이 자동으로 표시됨
}
```

## 🔧 사용법

### 기본 사용법
```typescript
import { useCollaboration, CollaborationIndicator, ConflictModal } from '@/shared/lib/collaboration'

function MyComponent() {
  const { state, actions } = useCollaboration({
    pollInterval: 3000,
    detectConflicts: true,
    showActivityFeed: true
  })
  
  const handleUpdate = (data: any) => {
    actions.performOptimisticUpdate({
      changeId: `update-${Date.now()}`,
      resourceId: 'my-resource',
      resourceType: 'video-planning',
      action: 'update',
      data
    })
  }
  
  return (
    <div>
      <CollaborationIndicator activeUsers={state.activeUsers} />
      
      <ConflictModal
        conflicts={state.conflicts}
        isOpen={state.showConflictModal}
        onResolve={actions.resolveConflict}
        onClose={actions.hideConflicts}
      />
      
      {/* 내 컨텐츠 */}
      <button onClick={() => handleUpdate({ title: '새 제목' })}>
        업데이트
      </button>
    </div>
  )
}
```

### 특화된 훅 사용
```typescript
// 비디오 기획용 (빠른 폴링)
const videoPlanningCollab = useVideoPlanningCollaboration()

// 캘린더용 (느린 폴링) 
const calendarCollab = useCalendarCollaboration()

// 읽기 전용 (매우 느린 폴링)
const readOnlyCollab = useReadOnlyCollaboration()
```

## ⚡ 성능 최적화

1. **지능적 폴링**: 윈도우 포커스/블러에 따라 폴링 빈도 조절
2. **디바운스 제출**: 연속된 변경사항을 500ms 디바운스로 배치 처리
3. **메모화된 컴포넌트**: 모든 UI 컴포넌트가 React.memo로 최적화
4. **중복 제거**: 동일한 변경사항의 중복 API 호출 방지

## 🔄 데이터 플로우

```
1. 사용자 액션 발생
   ↓
2. 즉시 UI 업데이트 (낙관적)
   ↓
3. Redux 상태에 pending 변경사항 저장
   ↓
4. 디바운스된 API 호출
   ↓
5. 서버 응답 처리 (충돌 감지)
   ↓
6. 필요시 충돌 해결 UI 표시
   ↓
7. 다음 폴링 시점에 최신 상태 동기화
```

## 🎨 UI 컴포넌트

### CollaborationIndicator
- 현재 활성 사용자 표시
- 온라인/오프라인 상태 표시
- 아바타 오버랩 표시

### ConflictModal  
- 충돌 발생 시 자동 표시
- 로컬/원격 변경사항 비교
- 단계별 충돌 해결 가이드

### ActivityFeed
- 최근 50개 변경사항 표시  
- 실시간 활동 피드
- 슬라이드 패널 형태

## 🔧 커스터마이징

### 폴링 간격 조정
```typescript
const collaboration = useCollaboration({
  pollInterval: 5000,  // 5초로 변경
  enabled: !isOfflineMode
})
```

### 충돌 해결 로직 변경
```typescript
const handleConflictResolve = (payload: ConflictResolutionPayload) => {
  // 커스텀 해결 로직
  if (payload.resolution === 'local') {
    // 내 변경사항 적용
  }
  
  actions.resolveConflict(payload)
}
```

## 🧪 테스트

기존 프로젝트의 테스트 패턴을 그대로 따릅니다:

```typescript
// RTL + MSW 패턴
import { renderWithProviders } from '@/test/utils'
import { useCollaboration } from '@/shared/lib/collaboration'

test('낙관적 업데이트가 즉시 반영되어야 함', () => {
  // MSW 핸들러로 API 모킹
  // RTL로 컴포넌트 테스트
})
```

## 📈 확장 계획

1. **오프라인 지원**: 네트워크 끊김 시 로컬 저장
2. **배치 작업**: 여러 변경사항 한번에 제출  
3. **고급 병합**: UI 기반 수동 병합 기능
4. **성능 모니터링**: 폴링 성능 메트릭 수집

## 🤝 기여 가이드

1. 기존 Redux 패턴 유지
2. TypeScript strict 모드 준수
3. 단순함을 최우선으로 고려
4. 레거시 UI 톤앤매너 유지