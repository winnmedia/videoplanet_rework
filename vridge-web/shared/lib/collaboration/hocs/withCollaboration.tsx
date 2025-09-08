/**
 * @fileoverview 협업 기능을 기존 컴포넌트에 추가하는 고차 컴포넌트
 * @description 기존 컴포넌트를 수정하지 않고 협업 기능을 추가하는 HOC
 */

'use client'

import React, { ComponentType, useEffect, useCallback } from 'react'

import { useVideoPlanningCollaboration, useCalendarCollaboration } from '../hooks/useCollaboration'
import type { OptimisticUpdatePayload } from '../types'

// ===========================
// HOC 타입 정의
// ===========================

export interface CollaborationInjectedProps {
  // 협업 상태
  collaborationState: ReturnType<typeof useVideoPlanningCollaboration>['state']
  
  // 협업 액션들
  collaborationActions: ReturnType<typeof useVideoPlanningCollaboration>['actions']
  
  // 편의 함수들
  onOptimisticUpdate: (payload: OptimisticUpdatePayload) => void
  isCollaborating: boolean
  hasConflicts: boolean
}

export interface CollaborationHocOptions {
  resourceType: 'video-planning' | 'calendar-event'
  resourceId?: string
  autoConnect?: boolean
}

// ===========================
// Video Planning용 HOC
// ===========================

export function withVideoPlanningCollaboration<P extends object>(
  WrappedComponent: ComponentType<P>
) {
  const WithCollaborationComponent = (props: Omit<P, keyof CollaborationInjectedProps>) => {
    const collaboration = useVideoPlanningCollaboration()
    
    // 낙관적 업데이트 편의 함수
    const handleOptimisticUpdate = useCallback((payload: OptimisticUpdatePayload) => {
      collaboration.actions.performOptimisticUpdate({
        ...payload,
        resourceType: 'video-planning'
      })
    }, [collaboration.actions])
    
    // 충돌 감지 시 자동 알림
    useEffect(() => {
      if (collaboration.state.conflicts.length > 0) {
        console.log('Video Planning 충돌 감지:', collaboration.state.conflicts)
        // 실제로는 토스트나 다른 UI 피드백
      }
    }, [collaboration.state.conflicts])
    
    const injectedProps: CollaborationInjectedProps = {
      collaborationState: collaboration.state,
      collaborationActions: collaboration.actions,
      onOptimisticUpdate: handleOptimisticUpdate,
      isCollaborating: collaboration.state.activeUsers.length > 1,
      hasConflicts: collaboration.state.conflicts.length > 0
    }
    
    return (
      <WrappedComponent 
        {...(props as P)} 
        {...injectedProps}
      />
    )
  }
  
  WithCollaborationComponent.displayName = `withVideoPlanningCollaboration(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return WithCollaborationComponent
}

// ===========================
// Calendar용 HOC
// ===========================

export function withCalendarCollaboration<P extends object>(
  WrappedComponent: ComponentType<P>
) {
  const WithCollaborationComponent = (props: Omit<P, keyof CollaborationInjectedProps>) => {
    const collaboration = useCalendarCollaboration()
    
    // 낙관적 업데이트 편의 함수
    const handleOptimisticUpdate = useCallback((payload: OptimisticUpdatePayload) => {
      collaboration.actions.performOptimisticUpdate({
        ...payload,
        resourceType: 'calendar-event'
      })
    }, [collaboration.actions])
    
    // 충돌 감지 시 자동 알림
    useEffect(() => {
      if (collaboration.state.conflicts.length > 0) {
        console.log('Calendar 충돌 감지:', collaboration.state.conflicts)
        // 실제로는 토스트나 다른 UI 피드백
      }
    }, [collaboration.state.conflicts])
    
    const injectedProps: CollaborationInjectedProps = {
      collaborationState: collaboration.state,
      collaborationActions: collaboration.actions,
      onOptimisticUpdate: handleOptimisticUpdate,
      isCollaborating: collaboration.state.activeUsers.length > 1,
      hasConflicts: collaboration.state.conflicts.length > 0
    }
    
    return (
      <WrappedComponent 
        {...(props as P)} 
        {...injectedProps}
      />
    )
  }
  
  WithCollaborationComponent.displayName = `withCalendarCollaboration(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return WithCollaborationComponent
}

// ===========================
// 범용 HOC (더 유연한 설정)
// ===========================

export function withCollaboration<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: CollaborationHocOptions
) {
  const WithCollaborationComponent = (props: Omit<P, keyof CollaborationInjectedProps>) => {
    // 리소스 타입에 따라 적절한 훅 선택
    const collaboration = options.resourceType === 'video-planning' 
      ? useVideoPlanningCollaboration()
      : useCalendarCollaboration()
    
    // 낙관적 업데이트 편의 함수
    const handleOptimisticUpdate = useCallback((payload: OptimisticUpdatePayload) => {
      collaboration.actions.performOptimisticUpdate({
        ...payload,
        resourceType: options.resourceType,
        resourceId: options.resourceId || payload.resourceId
      })
    }, [collaboration.actions, options.resourceType, options.resourceId])
    
    // 자동 연결 설정
    useEffect(() => {
      if (options.autoConnect !== false) {
        collaboration.actions.startPolling()
      }
      
      return () => {
        if (options.autoConnect !== false) {
          collaboration.actions.stopPolling()
        }
      }
    }, [collaboration.actions, options.autoConnect])
    
    const injectedProps: CollaborationInjectedProps = {
      collaborationState: collaboration.state,
      collaborationActions: collaboration.actions,
      onOptimisticUpdate: handleOptimisticUpdate,
      isCollaborating: collaboration.state.activeUsers.length > 1,
      hasConflicts: collaboration.state.conflicts.length > 0
    }
    
    return (
      <WrappedComponent 
        {...(props as P)} 
        {...injectedProps}
      />
    )
  }
  
  WithCollaborationComponent.displayName = `withCollaboration(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return WithCollaborationComponent
}

// ===========================
// 사용 예시를 위한 타입 가드
// ===========================

export function hasCollaborationProps<P extends object>(
  props: P
): props is P & CollaborationInjectedProps {
  return 'collaborationState' in props && 'collaborationActions' in props
}