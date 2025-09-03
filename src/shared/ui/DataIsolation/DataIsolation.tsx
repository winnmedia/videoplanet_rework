import React, { createContext, useContext, useMemo, ReactNode } from 'react'
import { RBACContext, filterUserData, hasMinimumRole, logSecurityEvent } from '@/shared/lib/rbac-system'
import { AuthenticatedUser } from '@/features/authentication/model/types'

export type IsolationLevel = 'none' | 'user' | 'project' | 'strict'

interface DataIsolationContextValue {
  isolationLevel: IsolationLevel
  user: AuthenticatedUser | null
  projectId?: string
}

const DataIsolationContext = createContext<DataIsolationContextValue>({
  isolationLevel: 'user',
  user: null
})

interface DataIsolationProviderProps {
  children: ReactNode
  isolationLevel?: IsolationLevel
  projectId?: string
}

export function DataIsolationProvider({ 
  children, 
  isolationLevel = 'user',
  projectId 
}: DataIsolationProviderProps) {
  const { user } = useContext(RBACContext)
  
  const contextValue = useMemo(() => ({
    isolationLevel,
    user,
    projectId
  }), [isolationLevel, user, projectId])
  
  return (
    <DataIsolationContext.Provider value={contextValue}>
      {children}
    </DataIsolationContext.Provider>
  )
}

// Hook for data isolation filtering
export function useDataIsolation<T extends { userId?: string; createdBy?: string }>({
  data,
  isolationLevel: overrideLevel
}: {
  data: T[]
  isolationLevel?: IsolationLevel
}) {
  const context = useContext(DataIsolationContext)
  const rbacContext = useContext(RBACContext)
  
  const isolationLevel = overrideLevel || context.isolationLevel
  
  const filteredData = useMemo(() => {
    if (rbacContext.loading || !context.user) {
      return []
    }
    
    switch (isolationLevel) {
      case 'none':
        // Allow privileged users to see all data
        return hasMinimumRole(context.user, 'admin') ? data : []
        
      case 'user':
        // Filter to user's own data, unless user has supervisor privileges
        return filterUserData(data, context.user, true)
        
      case 'project':
        // Additional project-based filtering would go here
        return filterUserData(data, context.user, true).filter(item => 
          // Add project-specific filtering logic
          true
        )
        
      case 'strict':
        // Strictest isolation - user can only see their own data
        return filterUserData(data, context.user, false)
        
      default:
        return filterUserData(data, context.user, true)
    }
  }, [data, isolationLevel, context.user, rbacContext.loading])
  
  return {
    filteredData,
    loading: rbacContext.loading,
    error: rbacContext.error,
    totalCount: data.length,
    filteredCount: filteredData.length
  }
}

// Component for rendering isolated data lists
interface IsolatedDataListProps<T> {
  data: T[]
  renderItem: (item: T, index: number) => ReactNode
  isolationLevel?: IsolationLevel
  loading?: boolean
  emptyMessage?: string
  className?: string
}

export function IsolatedDataList<T extends { userId?: string; createdBy?: string; id: string }>({
  data,
  renderItem,
  isolationLevel,
  loading: externalLoading = false,
  emptyMessage = '데이터가 없습니다',
  className = ''
}: IsolatedDataListProps<T>) {
  const { filteredData, loading, error } = useDataIsolation({ 
    data, 
    isolationLevel 
  })
  
  const isLoading = loading || externalLoading
  
  if (isLoading) {
    return (
      <div 
        role="status" 
        aria-live="polite"
        className={`flex items-center justify-center p-8 ${className}`}
      >
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
        <span className="text-gray-600">데이터 로딩 중...</span>
      </div>
    )
  }
  
  if (error) {
    return (
      <div 
        role="alert" 
        className={`p-4 bg-red-50 text-red-700 rounded-md ${className}`}
      >
        데이터 로드 중 오류가 발생했습니다: {error}
      </div>
    )
  }
  
  if (filteredData.length === 0) {
    return (
      <div 
        className={`text-center text-gray-500 p-8 ${className}`}
        role="status"
        aria-live="polite"
      >
        {emptyMessage}
      </div>
    )
  }
  
  return (
    <>
      {/* Screen reader announcement for filtered data */}
      <div className="sr-only" role="status" aria-live="polite">
        {filteredData.length}개의 데이터가 필터링되었습니다
      </div>
      
      <div 
        role="list"
        aria-label="사용자 데이터 목록"
        className={className}
      >
        {filteredData.map((item, index) => (
          <div key={item.id} role="listitem">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </>
  )
}

// Boundary component for individual data item access control
interface UserDataBoundaryProps {
  children: ReactNode
  dataOwnerId: string
  fallback?: ReactNode
  allowSupervisor?: boolean
}

export function UserDataBoundary({
  children,
  dataOwnerId,
  fallback,
  allowSupervisor = true
}: UserDataBoundaryProps) {
  const { user } = useContext(RBACContext)
  
  if (!user) {
    return (
      <div role="alert" className="text-red-600 p-2 text-sm">
        로그인이 필요합니다
      </div>
    )
  }
  
  // Check if user owns the data
  const isOwner = user.id === dataOwnerId
  
  // Check if user has supervisor privileges
  const canSupervise = allowSupervisor && hasMinimumRole(user, 'admin')
  
  if (!isOwner && !canSupervise) {
    // Log unauthorized access attempt
    logSecurityEvent({
      type: 'UNAUTHORIZED_ACCESS',
      userId: user.id,
      resource: 'USER_DATA',
      permission: 'data:read',
      metadata: { 
        attemptedDataOwner: dataOwnerId,
        userRole: user.role 
      }
    })
    
    return fallback ? (
      <div role="alert" aria-live="polite">
        {fallback}
      </div>
    ) : (
      <div 
        role="alert" 
        aria-live="polite"
        className="p-4 bg-yellow-50 text-yellow-800 rounded-md border border-yellow-200"
      >
        <div className="flex items-center">
          <svg 
            className="w-5 h-5 mr-2" 
            fill="currentColor" 
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          이 데이터에 접근할 권한이 없습니다
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}

// Privacy indicator component
interface PrivacyIndicatorProps {
  level: IsolationLevel
  className?: string
}

export function PrivacyIndicator({ level, className = '' }: PrivacyIndicatorProps) {
  const configs = {
    none: { 
      color: 'bg-red-100 text-red-800', 
      icon: '🔓', 
      label: '모든 사용자 데이터 표시' 
    },
    user: { 
      color: 'bg-blue-100 text-blue-800', 
      icon: '👤', 
      label: '사용자 데이터 필터링' 
    },
    project: { 
      color: 'bg-green-100 text-green-800', 
      icon: '📁', 
      label: '프로젝트 기반 필터링' 
    },
    strict: { 
      color: 'bg-purple-100 text-purple-800', 
      icon: '🔒', 
      label: '엄격한 데이터 격리' 
    }
  }
  
  const config = configs[level]
  
  return (
    <div 
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color} ${className}`}
      role="img"
      aria-label={`개인정보 보호 수준: ${config.label}`}
      title={config.label}
    >
      <span className="mr-1" aria-hidden="true">{config.icon}</span>
      {config.label}
    </div>
  )
}

// Data isolation status component
export function DataIsolationStatus() {
  const context = useContext(DataIsolationContext)
  const { user } = useContext(RBACContext)
  
  if (!user) return null
  
  return (
    <div className="bg-gray-50 p-3 rounded-md text-sm">
      <div className="flex items-center justify-between">
        <span className="text-gray-700">데이터 격리 상태:</span>
        <PrivacyIndicator level={context.isolationLevel} />
      </div>
      <div className="mt-2 text-xs text-gray-500">
        사용자: {user.username} ({user.role})
      </div>
    </div>
  )
}