/**
 * @fileoverview 협업 시스템 사용 예제
 * @description 다양한 협업 시스템 사용법을 보여주는 예제들
 */

'use client'

import React, { useCallback } from 'react'

// 협업 시스템 import 예제
import {
  useVideoPlanningCollaboration,
  useCalendarCollaboration,
  withVideoPlanningCollaboration,
  withCalendarCollaboration,
  isCollaborationEnabled,
  debugCollaborationState,
  forceConflict,
  simulateUser
} from '../index'
import type { CollaborationInjectedProps } from '../index'

// ===========================
// 1. 기본 훅 사용법
// ===========================

const BasicCollaborationExample: React.FC = () => {
  const collaboration = useVideoPlanningCollaboration()
  
  const handleStageUpdate = useCallback((stageId: string, updates: any) => {
    // 1. 낙관적 업데이트로 즉시 UI 반영
    collaboration.actions.performOptimisticUpdate({
      changeId: `stage-update-${Date.now()}`,
      resourceId: stageId,
      resourceType: 'video-planning',
      action: 'update',
      data: updates
    })
    
    // 2. 실제 비즈니스 로직 실행
    // dispatch(updateStage({ stageId, updates }))
  }, [collaboration.actions])

  const handleShowDebugInfo = () => {
    debugCollaborationState(collaboration.state)
  }

  return (
    <div className="p-6 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">기본 협업 훅 사용</h3>
      
      {/* 활성 사용자 표시 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          활성 사용자: {collaboration.state.activeUsers.length}명
        </p>
        <div className="flex gap-2 mt-2">
          {collaboration.state.activeUsers.map(user => (
            <div
              key={user.id}
              className="w-8 h-8 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center"
              title={user.name}
            >
              {user.name.charAt(0)}
            </div>
          ))}
        </div>
      </div>

      {/* 최근 변경사항 */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          최근 변경사항: {collaboration.state.recentChanges.length}개
        </p>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {collaboration.state.recentChanges.slice(0, 5).map(change => (
            <div key={change.id} className="text-xs bg-gray-50 p-2 rounded">
              <span className="font-medium">{change.userName}</span>
              {' '}{change.action} {change.resourceType}
              <span className="text-gray-500 ml-2">
                {new Date(change.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 컨트롤 버튼들 */}
      <div className="space-x-2">
        <button
          onClick={() => handleStageUpdate('stage-1', { title: '수정된 제목' })}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          단계 수정 테스트
        </button>
        
        <button
          onClick={handleShowDebugInfo}
          className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
        >
          디버그 정보
        </button>
        
        {process.env.NODE_ENV === 'development' && (
          <>
            <button
              onClick={() => forceConflict('test-resource', 'video-planning')}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm"
            >
              충돌 생성
            </button>
            
            <button
              onClick={() => simulateUser('join', { name: '테스트 사용자', role: 'editor' })}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            >
              사용자 추가
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ===========================
// 2. HOC 사용법
// ===========================

interface MyComponentProps {
  title: string
  onSave: (data: any) => void
}

// 기본 컴포넌트 (협업 기능 없음)
const MyBasicComponent: React.FC<MyComponentProps & CollaborationInjectedProps> = ({
  title,
  onSave,
  collaborationState,
  collaborationActions,
  onOptimisticUpdate,
  isCollaborating,
  hasConflicts
}) => {
  const handleChange = useCallback((newData: any) => {
    // 1. 낙관적 업데이트
    onOptimisticUpdate({
      changeId: `data-change-${Date.now()}`,
      resourceId: 'my-resource',
      resourceType: 'video-planning',
      action: 'update',
      data: newData
    })

    // 2. 실제 저장 로직
    onSave(newData)
  }, [onOptimisticUpdate, onSave])

  return (
    <div className="p-4 border rounded">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">{title}</h4>
        
        {/* 협업 상태 표시 */}
        {isCollaborating && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-green-600">
              {collaborationState.activeUsers.length}명 협업 중
            </span>
          </div>
        )}
        
        {/* 충돌 경고 */}
        {hasConflicts && (
          <div className="text-red-600 text-sm">
            ⚠️ 충돌 발생
          </div>
        )}
      </div>

      <button
        onClick={() => handleChange({ updated: true, timestamp: Date.now() })}
        className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
      >
        데이터 변경
      </button>

      {/* 활동 피드 토글 */}
      {isCollaborating && (
        <button
          onClick={() => {
            if (collaborationState.showActivityFeed) {
              collaborationActions.hideActivity()
            } else {
              collaborationActions.showActivity()
            }
          }}
          className="ml-2 px-3 py-1 bg-gray-500 text-white rounded text-sm"
        >
          {collaborationState.showActivityFeed ? '활동 숨기기' : '활동 보기'}
        </button>
      )}
    </div>
  )
}

// HOC 적용
const MyCollaborativeComponent = withVideoPlanningCollaboration(MyBasicComponent)

// ===========================
// 3. Calendar 전용 예제
// ===========================

const CalendarCollaborationExample: React.FC = () => {
  const collaboration = useCalendarCollaboration()

  const handleEventClick = useCallback((eventId: string) => {
    // 이벤트 클릭 시 협업 시스템에 알림
    collaboration.actions.performOptimisticUpdate({
      changeId: `event-click-${Date.now()}`,
      resourceId: eventId,
      resourceType: 'calendar-event',
      action: 'update',
      data: { action: 'view' }
    })
  }, [collaboration.actions])

  const handleDateSelect = useCallback((date: Date) => {
    // 날짜 선택 시 협업 시스템에 알림
    collaboration.actions.performOptimisticUpdate({
      changeId: `date-select-${Date.now()}`,
      resourceId: date.toISOString().split('T')[0],
      resourceType: 'calendar-event',
      action: 'update',
      data: { selectedDate: date.toISOString() }
    })
  }, [collaboration.actions])

  return (
    <div className="p-6 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">캘린더 협업 예제</h3>
      
      {/* 캘린더 특화 UI */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {Array.from({ length: 7 }, (_, i) => (
          <button
            key={i}
            onClick={() => handleDateSelect(new Date(2024, 0, i + 1))}
            className="p-2 text-sm border hover:bg-blue-50"
          >
            {i + 1}일
          </button>
        ))}
      </div>

      {/* 모의 이벤트 목록 */}
      <div className="space-y-2">
        {['meeting-1', 'deadline-1', 'review-1'].map(eventId => (
          <button
            key={eventId}
            onClick={() => handleEventClick(eventId)}
            className="block w-full text-left p-2 bg-blue-50 rounded hover:bg-blue-100"
          >
            이벤트: {eventId}
          </button>
        ))}
      </div>

      {/* 활동 요약 */}
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          캘린더 변경사항: {collaboration.state.recentChanges
            .filter(c => c.type === 'calendar-event').length}개
        </p>
      </div>
    </div>
  )
}

// ===========================
// 4. 조건부 협업 활성화 예제
// ===========================

const ConditionalCollaborationExample: React.FC = () => {
  const collaborationEnabled = isCollaborationEnabled()
  
  // 협업이 활성화된 경우에만 훅 사용
  const collaboration = collaborationEnabled 
    ? useVideoPlanningCollaboration() 
    : null

  return (
    <div className="p-6 bg-white rounded-lg border">
      <h3 className="text-lg font-semibold mb-4">조건부 협업 활성화</h3>
      
      <div className="mb-4">
        <p className="text-sm">
          협업 상태: {collaborationEnabled ? '활성화됨' : '비활성화됨'}
        </p>
        
        {collaborationEnabled && collaboration ? (
          <div className="mt-2">
            <p className="text-sm text-green-600">
              ✅ 협업 기능이 활성화되어 있습니다.
            </p>
            <p className="text-xs text-gray-500">
              활성 사용자: {collaboration.state.activeUsers.length}명
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-2">
            💡 협업 기능을 사용하려면 환경 변수를 설정하세요.
          </p>
        )}
      </div>
      
      {/* 협업 기능 테스트 버튼 */}
      {collaborationEnabled && collaboration && (
        <button
          onClick={() => {
            collaboration.actions.performOptimisticUpdate({
              changeId: `test-${Date.now()}`,
              resourceId: 'test-resource',
              resourceType: 'video-planning',
              action: 'update',
              data: { test: true }
            })
          }}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          협업 테스트
        </button>
      )}
    </div>
  )
}

// ===========================
// 5. 통합 예제 컴포넌트
// ===========================

const CollaborationExamples: React.FC = () => {
  return (
    <div className="space-y-6 p-6 bg-gray-100 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          협업 시스템 사용 예제
        </h1>
        
        <div className="space-y-6">
          <BasicCollaborationExample />
          
          <MyCollaborativeComponent
            title="HOC로 래핑된 컴포넌트"
            onSave={(data) => console.log('Saved:', data)}
          />
          
          <CalendarCollaborationExample />
          
          <ConditionalCollaborationExample />
          
          {/* 개발 환경에서만 보이는 디버깅 패널 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">
                🛠️ 개발자 도구
              </h3>
              <div className="space-x-2">
                <button
                  onClick={() => simulateUser('join', { name: '개발자', role: 'owner' })}
                  className="px-3 py-1 bg-yellow-600 text-white rounded text-sm"
                >
                  개발자 사용자 추가
                </button>
                <button
                  onClick={() => forceConflict('dev-resource', 'video-planning')}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                >
                  개발 충돌 생성
                </button>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                * 이 도구들은 개발 환경에서만 사용할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CollaborationExamples

// ===========================
// 6. 사용법 요약
// ===========================

/*
기본 사용법:

1. 기본 훅 사용:
```tsx
import { useVideoPlanningCollaboration } from '@/shared/lib/collaboration'

const MyComponent = () => {
  const collaboration = useVideoPlanningCollaboration()
  
  const handleChange = (data) => {
    // 낙관적 업데이트
    collaboration.actions.performOptimisticUpdate({
      changeId: `change-${Date.now()}`,
      resourceId: 'my-resource',
      resourceType: 'video-planning',
      action: 'update',
      data
    })
  }
  
  return (
    <div>
      활성 사용자: {collaboration.state.activeUsers.length}
    </div>
  )
}
```

2. HOC 사용:
```tsx
import { withVideoPlanningCollaboration } from '@/shared/lib/collaboration'

const MyComponent = ({ collaborationState, onOptimisticUpdate }) => {
  // 협업 기능이 자동으로 주입됨
  return <div>...</div>
}

export default withVideoPlanningCollaboration(MyComponent)
```

3. 조건부 사용:
```tsx
import { isCollaborationEnabled, useVideoPlanningCollaboration } from '@/shared/lib/collaboration'

const MyComponent = () => {
  const enabled = isCollaborationEnabled()
  const collaboration = enabled ? useVideoPlanningCollaboration() : null
  
  return <div>협업 상태: {enabled ? '활성' : '비활성'}</div>
}
```

4. 디버깅:
```tsx
import { debugCollaborationState } from '@/shared/lib/collaboration'

const MyComponent = () => {
  const collaboration = useVideoPlanningCollaboration()
  
  useEffect(() => {
    debugCollaborationState(collaboration.state)
  }, [collaboration.state])
}
```
*/