import { render, screen } from '@testing-library/react'
import { RoleGuard, PermissionGuard } from './RoleGuard'
import { RBACContext, RBACContextValue } from '@/shared/lib/rbac-system'
import { AuthenticatedUser } from '@/features/authentication/model/types'

const mockOwner: AuthenticatedUser = {
  id: '1',
  email: 'owner@test.com', 
  username: 'owner',
  role: 'owner',
  permissions: ['project:full', 'member:invite', 'project:delete']
}

const mockViewer: AuthenticatedUser = {
  id: '2',
  email: 'viewer@test.com',
  username: 'viewer', 
  role: 'viewer',
  permissions: ['project:read']
}

const renderWithRBACContext = (component: React.ReactElement, contextValue: RBACContextValue) => {
  return render(
    <RBACContext.Provider value={contextValue}>
      {component}
    </RBACContext.Provider>
  )
}

describe('RoleGuard Component', () => {
  it('should render children when user has required role', () => {
    const contextValue: RBACContextValue = {
      user: mockOwner,
      permissions: mockOwner.permissions,
      loading: false
    }

    renderWithRBACContext(
      <RoleGuard requiredRole="admin">
        <div>Admin Content</div>
      </RoleGuard>,
      contextValue
    )

    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('should not render children when user lacks required role', () => {
    const contextValue: RBACContextValue = {
      user: mockViewer,
      permissions: mockViewer.permissions,
      loading: false
    }

    renderWithRBACContext(
      <RoleGuard requiredRole="admin">
        <div>Admin Content</div>
      </RoleGuard>,
      contextValue
    )

    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('should render fallback when user lacks permission', () => {
    const contextValue: RBACContextValue = {
      user: mockViewer,
      permissions: mockViewer.permissions,
      loading: false
    }

    renderWithRBACContext(
      <RoleGuard 
        requiredRole="admin"
        fallback={<div>접근 권한이 없습니다</div>}
      >
        <div>Admin Content</div>
      </RoleGuard>,
      contextValue
    )

    expect(screen.getByText('접근 권한이 없습니다')).toBeInTheDocument()
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument()
  })

  it('should show loading state', () => {
    const contextValue: RBACContextValue = {
      user: null,
      permissions: [],
      loading: true
    }

    renderWithRBACContext(
      <RoleGuard requiredRole="admin">
        <div>Admin Content</div>
      </RoleGuard>,
      contextValue
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('권한 확인 중...')).toBeInTheDocument()
  })
})

describe('PermissionGuard Component', () => {
  it('should render children when user has required permission', () => {
    const contextValue: RBACContextValue = {
      user: mockOwner,
      permissions: mockOwner.permissions,
      loading: false
    }

    renderWithRBACContext(
      <PermissionGuard requiredPermission="project:delete">
        <button>삭제</button>
      </PermissionGuard>,
      contextValue
    )

    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
  })

  it('should not render children when user lacks permission', () => {
    const contextValue: RBACContextValue = {
      user: mockViewer,
      permissions: mockViewer.permissions,
      loading: false
    }

    renderWithRBACContext(
      <PermissionGuard requiredPermission="project:delete">
        <button>삭제</button>
      </PermissionGuard>,
      contextValue
    )

    expect(screen.queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
  })

  it('should render error fallback on permission error', () => {
    const contextValue: RBACContextValue = {
      user: mockViewer,
      permissions: [],
      loading: false,
      error: 'Permission check failed'
    }

    renderWithRBACContext(
      <PermissionGuard 
        requiredPermission="project:edit"
        fallback={<div>권한 오류가 발생했습니다</div>}
      >
        <button>편집</button>
      </PermissionGuard>,
      contextValue
    )

    expect(screen.getByText('권한 오류가 발생했습니다')).toBeInTheDocument()
  })

  it('should have proper accessibility attributes', () => {
    const contextValue: RBACContextValue = {
      user: mockViewer,
      permissions: mockViewer.permissions,
      loading: false
    }

    renderWithRBACContext(
      <PermissionGuard 
        requiredPermission="project:delete"
        fallback={<div>접근 권한이 없습니다</div>}
      >
        <button>삭제</button>
      </PermissionGuard>,
      contextValue
    )

    const fallback = screen.getByText('접근 권한이 없습니다')
    expect(fallback).toHaveAttribute('role', 'alert')
    expect(fallback).toHaveAttribute('aria-live', 'polite')
  })
})