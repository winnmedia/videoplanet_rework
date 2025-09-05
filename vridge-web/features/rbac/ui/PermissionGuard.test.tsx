/**
 * PermissionGuard - TDD 테스트
 * Phase 2b - UI 컴포넌트 검증
 */

import { configureStore } from '@reduxjs/toolkit'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { Permission, UserRole, type RBACUser } from '@/entities/rbac'

import { PermissionGuard } from './PermissionGuard'

// Mock useCurrentUserPermissions 훅
vi.mock('../model/useUserPermissions', () => ({
  useCurrentUserPermissions: vi.fn()
}))

const { useCurrentUserPermissions } = vi.mocked(await import('../model/useUserPermissions'))

// Mock store 설정
const createMockStore = (user: RBACUser | null = null, isLoading = false, error: string | null = null) => {
  return configureStore({
    reducer: {
      auth: (state = { user, isLoading, error }) => state
    }
  })
}

// Mock user 데이터
const mockOwnerUser: RBACUser = {
  id: 'owner-1',
  name: 'Owner User',
  email: 'owner@example.com',
  role: UserRole.OWNER,
  permissions: [],
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z'
}

const mockViewerUser: RBACUser = {
  id: 'viewer-1',
  name: 'Viewer User',
  email: 'viewer@example.com',
  role: UserRole.VIEWER,
  permissions: [],
  isActive: true,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z'
}

const TestWrapper = ({ children, user = null }: { children: React.ReactNode; user?: RBACUser | null }) => (
  <Provider store={createMockStore(user)}>
    {children}
  </Provider>
)

describe('PermissionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('로딩 상태 처리', () => {
    it('로딩 중일 때 로딩 폴백을 표시해야 한다', () => {
      useCurrentUserPermissions.mockReturnValue({
        user: null,
        hasPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: true,
        error: null
      })

      render(
        <TestWrapper>
          <PermissionGuard permission={Permission.PROJECT_CREATE}>
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(screen.getByLabelText('권한 확인 중')).toBeInTheDocument()
      expect(screen.getByText('로딩 중...')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('커스텀 로딩 폴백을 사용할 수 있어야 한다', () => {
      useCurrentUserPermissions.mockReturnValue({
        user: null,
        hasPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: true,
        error: null
      })

      render(
        <TestWrapper>
          <PermissionGuard
            permission={Permission.PROJECT_CREATE}
            loadingFallback={<div data-testid="custom-loading">권한 검사중...</div>}
          >
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(screen.getByTestId('custom-loading')).toBeInTheDocument()
      expect(screen.getByText('권한 검사중...')).toBeInTheDocument()
    })
  })

  describe('에러 상태 처리', () => {
    it('에러 발생 시 에러 폴백을 표시해야 한다', () => {
      useCurrentUserPermissions.mockReturnValue({
        user: null,
        hasPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: '권한 조회 실패'
      })

      render(
        <TestWrapper>
          <PermissionGuard permission={Permission.PROJECT_CREATE}>
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(screen.getByRole('alert')).toBeInTheDocument()
      expect(screen.getByText('권한 확인 중 오류가 발생했습니다.')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('커스텀 에러 폴백을 사용할 수 있어야 한다', () => {
      useCurrentUserPermissions.mockReturnValue({
        user: null,
        hasPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: '네트워크 오류'
      })

      render(
        <TestWrapper>
          <PermissionGuard
            permission={Permission.PROJECT_CREATE}
            errorFallback={<div data-testid="custom-error">시스템 오류 발생</div>}
          >
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(screen.getByTestId('custom-error')).toBeInTheDocument()
      expect(screen.getByText('시스템 오류 발생')).toBeInTheDocument()
    })
  })

  describe('단일 권한 검사', () => {
    it('권한이 있을 때 컨텐츠를 표시해야 한다', () => {
      const mockHasPermission = vi.fn().mockReturnValue(true)
      useCurrentUserPermissions.mockReturnValue({
        user: mockOwnerUser,
        hasPermission: mockHasPermission,
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: null
      })

      render(
        <TestWrapper user={mockOwnerUser}>
          <PermissionGuard permission={Permission.PROJECT_CREATE}>
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(mockHasPermission).toHaveBeenCalledWith(Permission.PROJECT_CREATE, undefined)
      expect(screen.getByTestId('permission-granted-content')).toBeInTheDocument()
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: '권한이 확인된 컨텐츠' })).toBeInTheDocument()
    })

    it('권한이 없을 때 폴백을 표시해야 한다', () => {
      const mockHasPermission = vi.fn().mockReturnValue(false)
      useCurrentUserPermissions.mockReturnValue({
        user: mockViewerUser,
        hasPermission: mockHasPermission,
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: null
      })

      render(
        <TestWrapper user={mockViewerUser}>
          <PermissionGuard 
            permission={Permission.PROJECT_DELETE}
            fallback={<div>권한이 없습니다</div>}
          >
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(mockHasPermission).toHaveBeenCalledWith(Permission.PROJECT_DELETE, undefined)
      expect(screen.getByTestId('permission-denied-content')).toBeInTheDocument()
      expect(screen.getByText('권한이 없습니다')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
      expect(screen.getByRole('region', { name: '접근 권한이 없는 컨텐츠' })).toBeInTheDocument()
    })

    it('컨텍스트와 함께 권한을 검사해야 한다', () => {
      const mockHasPermission = vi.fn().mockReturnValue(true)
      useCurrentUserPermissions.mockReturnValue({
        user: mockViewerUser,
        hasPermission: mockHasPermission,
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: null
      })

      const context = { projectId: 'project-123', isOwner: true }

      render(
        <TestWrapper user={mockViewerUser}>
          <PermissionGuard 
            permission={Permission.PROJECT_DELETE}
            context={context}
          >
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(mockHasPermission).toHaveBeenCalledWith(Permission.PROJECT_DELETE, context)
    })
  })

  describe('다중 권한 검사', () => {
    it('모든 권한이 필요할 때 hasAllPermissions를 사용해야 한다', () => {
      const mockHasAllPermissions = vi.fn().mockReturnValue(true)
      useCurrentUserPermissions.mockReturnValue({
        user: mockOwnerUser,
        hasPermission: vi.fn(),
        hasAllPermissions: mockHasAllPermissions,
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: null
      })

      const permissions = [Permission.PROJECT_CREATE, Permission.VIDEO_UPLOAD]

      render(
        <TestWrapper user={mockOwnerUser}>
          <PermissionGuard 
            permissions={permissions}
            requireAll={true}
          >
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(mockHasAllPermissions).toHaveBeenCalledWith(permissions, undefined)
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    it('권한 중 하나만 필요할 때 hasAnyPermission을 사용해야 한다', () => {
      const mockHasAnyPermission = vi.fn().mockReturnValue(true)
      useCurrentUserPermissions.mockReturnValue({
        user: mockViewerUser,
        hasPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasAnyPermission: mockHasAnyPermission,
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: null
      })

      const permissions = [Permission.PROJECT_VIEW, Permission.COMMENT_CREATE]

      render(
        <TestWrapper user={mockViewerUser}>
          <PermissionGuard 
            permissions={permissions}
            requireAll={false}
          >
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(mockHasAnyPermission).toHaveBeenCalledWith(permissions, undefined)
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  describe('기본 동작', () => {
    it('권한 조건이 없으면 접근을 허용해야 한다', () => {
      useCurrentUserPermissions.mockReturnValue({
        user: mockViewerUser,
        hasPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: null
      })

      render(
        <TestWrapper user={mockViewerUser}>
          <PermissionGuard>
            <div>Public Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(screen.getByText('Public Content')).toBeInTheDocument()
      expect(screen.getByTestId('permission-granted-content')).toBeInTheDocument()
    })

    it('빈 권한 배열일 때 접근을 허용해야 한다', () => {
      useCurrentUserPermissions.mockReturnValue({
        user: mockViewerUser,
        hasPermission: vi.fn(),
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: null
      })

      render(
        <TestWrapper user={mockViewerUser}>
          <PermissionGuard permissions={[]}>
            <div>Public Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(screen.getByText('Public Content')).toBeInTheDocument()
    })

    it('폴백이 null일 때 아무것도 표시하지 않아야 한다', () => {
      const mockHasPermission = vi.fn().mockReturnValue(false)
      useCurrentUserPermissions.mockReturnValue({
        user: mockViewerUser,
        hasPermission: mockHasPermission,
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: null
      })

      render(
        <TestWrapper user={mockViewerUser}>
          <PermissionGuard permission={Permission.PROJECT_DELETE}>
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      expect(screen.getByTestId('permission-denied-content')).toBeInTheDocument()
      expect(screen.getByTestId('permission-denied-content')).toBeEmptyDOMElement()
    })
  })

  describe('접근성 준수', () => {
    it('권한 허용 시 적절한 ARIA 레이블을 가져야 한다', () => {
      const mockHasPermission = vi.fn().mockReturnValue(true)
      useCurrentUserPermissions.mockReturnValue({
        user: mockOwnerUser,
        hasPermission: mockHasPermission,
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: null
      })

      render(
        <TestWrapper user={mockOwnerUser}>
          <PermissionGuard permission={Permission.PROJECT_CREATE}>
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      const container = screen.getByRole('region', { name: '권한이 확인된 컨텐츠' })
      expect(container).toHaveAttribute('data-testid', 'permission-granted-content')
    })

    it('권한 거부 시 적절한 ARIA 레이블을 가져야 한다', () => {
      const mockHasPermission = vi.fn().mockReturnValue(false)
      useCurrentUserPermissions.mockReturnValue({
        user: mockViewerUser,
        hasPermission: mockHasPermission,
        hasAllPermissions: vi.fn(),
        hasAnyPermission: vi.fn(),
        isHigherRole: vi.fn(),
        validPermissions: [],
        isLoading: false,
        error: null
      })

      render(
        <TestWrapper user={mockViewerUser}>
          <PermissionGuard 
            permission={Permission.PROJECT_DELETE}
            fallback={<div>접근 불가</div>}
          >
            <div>Protected Content</div>
          </PermissionGuard>
        </TestWrapper>
      )

      const container = screen.getByRole('region', { name: '접근 권한이 없는 컨텐츠' })
      expect(container).toHaveAttribute('data-testid', 'permission-denied-content')
    })
  })
})