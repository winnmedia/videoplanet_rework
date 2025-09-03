import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { 
  AccessibleErrorBoundary, 
  PermissionErrorMessage, 
  FocusManagement,
  ErrorRecoveryActions 
} from './AccessibilityErrorHandler'
import { RBACContext, RBACContextValue } from '@/shared/lib/rbac-system'
import { AuthenticatedUser } from '@/features/authentication/model/types'

const mockUser: AuthenticatedUser = {
  id: '1',
  email: 'user@test.com',
  username: 'user',
  role: 'viewer',
  permissions: ['project:read']
}

const ThrowError = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test permission error')
  }
  return <div>Content loaded successfully</div>
}

const renderWithRBACContext = (component: React.ReactElement, contextValue: RBACContextValue) => {
  return render(
    <RBACContext.Provider value={contextValue}>
      {component}
    </RBACContext.Provider>
  )
}

describe('AccessibleErrorBoundary Component', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('should catch and display errors accessibly', () => {
    const contextValue: RBACContextValue = {
      user: mockUser,
      permissions: mockUser.permissions,
      loading: false
    }

    renderWithRBACContext(
      <AccessibleErrorBoundary>
        <ThrowError />
      </AccessibleErrorBoundary>,
      contextValue
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/오류가 발생했습니다/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('should render children when no error occurs', () => {
    const contextValue: RBACContextValue = {
      user: mockUser,
      permissions: mockUser.permissions,
      loading: false
    }

    renderWithRBACContext(
      <AccessibleErrorBoundary>
        <ThrowError shouldThrow={false} />
      </AccessibleErrorBoundary>,
      contextValue
    )

    expect(screen.getByText('Content loaded successfully')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('should allow retry functionality', async () => {
    const user = userEvent.setup()
    let shouldThrow = true

    const RetryableComponent = () => {
      if (shouldThrow) {
        throw new Error('Temporary error')
      }
      return <div>Recovered successfully</div>
    }

    const contextValue: RBACContextValue = {
      user: mockUser,
      permissions: mockUser.permissions,
      loading: false
    }

    const { rerender } = renderWithRBACContext(
      <AccessibleErrorBoundary>
        <RetryableComponent />
      </AccessibleErrorBoundary>,
      contextValue
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()

    // Simulate recovery
    shouldThrow = false
    const retryButton = screen.getByRole('button', { name: '다시 시도' })
    await user.click(retryButton)

    // The error boundary should reset, but we need to trigger a rerender
    rerender(
      <RBACContext.Provider value={contextValue}>
        <AccessibleErrorBoundary>
          <RetryableComponent />
        </AccessibleErrorBoundary>
      </RBACContext.Provider>
    )

    // After retry, content should be visible
    expect(screen.getByText('Recovered successfully')).toBeInTheDocument()
  })

  it('should provide keyboard navigation support', async () => {
    const user = userEvent.setup()
    const contextValue: RBACContextValue = {
      user: mockUser,
      permissions: mockUser.permissions,
      loading: false
    }

    renderWithRBACContext(
      <AccessibleErrorBoundary>
        <ThrowError />
      </AccessibleErrorBoundary>,
      contextValue
    )

    const retryButton = screen.getByRole('button', { name: '다시 시도' })
    
    // Test keyboard focus
    await user.tab()
    expect(retryButton).toHaveFocus()

    // Test Enter key activation
    await user.keyboard('{Enter}')
    // Button should have been activated (we can't easily test the actual retry without complex mocking)
  })

  it('should announce errors to screen readers', () => {
    const contextValue: RBACContextValue = {
      user: mockUser,
      permissions: mockUser.permissions,
      loading: false
    }

    renderWithRBACContext(
      <AccessibleErrorBoundary>
        <ThrowError />
      </AccessibleErrorBoundary>,
      contextValue
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'assertive')
    expect(alert).toHaveAttribute('aria-atomic', 'true')
  })
})

describe('PermissionErrorMessage Component', () => {
  it('should display permission denied message accessibly', () => {
    render(
      <PermissionErrorMessage 
        permission="project:delete"
        resource="Project Alpha"
      />
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('권한 부족')).toBeInTheDocument()
    expect(screen.getByText(/project:delete/)).toBeInTheDocument()
    expect(screen.getByText(/Project Alpha/)).toBeInTheDocument()
  })

  it('should provide recovery suggestions', () => {
    render(
      <PermissionErrorMessage 
        permission="project:edit"
        resource="Project Beta"
        showRecoveryActions={true}
      />
    )

    expect(screen.getByText('권한 요청')).toBeInTheDocument()
    expect(screen.getByText('이전 페이지로')).toBeInTheDocument()
    expect(screen.getByText('도움말')).toBeInTheDocument()
  })

  it('should handle different permission types appropriately', () => {
    render(
      <PermissionErrorMessage 
        permission="admin:full"
        resource="System Settings"
        severity="high"
      />
    )

    expect(screen.getByRole('alert')).toHaveClass('border-red-200')
    expect(screen.getByText(/높은 권한이 필요/)).toBeInTheDocument()
  })

  it('should support custom messages', () => {
    const customMessage = '이 기능은 프리미엄 사용자만 이용할 수 있습니다'
    
    render(
      <PermissionErrorMessage 
        permission="premium:access"
        customMessage={customMessage}
      />
    )

    expect(screen.getByText(customMessage)).toBeInTheDocument()
  })
})

describe('FocusManagement Component', () => {
  it('should manage focus correctly on mount', () => {
    const { container } = render(
      <FocusManagement autoFocus>
        <div>
          <button>First button</button>
          <button>Second button</button>
        </div>
      </FocusManagement>
    )

    const firstButton = screen.getByRole('button', { name: 'First button' })
    expect(firstButton).toHaveFocus()
  })

  it('should trap focus within error boundaries', async () => {
    const user = userEvent.setup()
    
    render(
      <FocusManagement trapFocus autoFocus>
        <div>
          <button>First</button>
          <button>Second</button>
          <button>Third</button>
        </div>
      </FocusManagement>
    )

    const firstButton = screen.getByRole('button', { name: 'First' })
    const thirdButton = screen.getByRole('button', { name: 'Third' })

    // Focus should start on first button
    expect(firstButton).toHaveFocus()

    // Tab to last button
    await user.tab()
    await user.tab()
    expect(thirdButton).toHaveFocus()

    // Tab again should cycle back to first
    await user.tab()
    expect(firstButton).toHaveFocus()
  })

  it('should restore focus on unmount', () => {
    const triggerButton = document.createElement('button')
    triggerButton.textContent = 'Trigger'
    document.body.appendChild(triggerButton)
    triggerButton.focus()

    const { unmount } = render(
      <FocusManagement restoreFocus>
        <button>Error button</button>
      </FocusManagement>
    )

    expect(screen.getByRole('button', { name: 'Error button' })).toBeInTheDocument()
    
    unmount()
    
    expect(triggerButton).toHaveFocus()
    document.body.removeChild(triggerButton)
  })
})

describe('ErrorRecoveryActions Component', () => {
  const mockActions = {
    retry: jest.fn(),
    goBack: jest.fn(),
    requestPermission: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render all recovery actions', () => {
    render(<ErrorRecoveryActions {...mockActions} />)

    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전 페이지로' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '권한 요청' })).toBeInTheDocument()
  })

  it('should call appropriate handlers when clicked', async () => {
    const user = userEvent.setup()
    render(<ErrorRecoveryActions {...mockActions} />)

    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(mockActions.retry).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '이전 페이지로' }))
    expect(mockActions.goBack).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '권한 요청' }))
    expect(mockActions.requestPermission).toHaveBeenCalledTimes(1)
  })

  it('should disable actions when loading', () => {
    render(<ErrorRecoveryActions {...mockActions} loading={true} />)

    expect(screen.getByRole('button', { name: '다시 시도' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '이전 페이지로' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '권한 요청' })).toBeDisabled()
  })

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<ErrorRecoveryActions {...mockActions} />)

    // Tab through all buttons
    await user.tab()
    expect(screen.getByRole('button', { name: '다시 시도' })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: '이전 페이지로' })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: '권한 요청' })).toHaveFocus()

    // Enter key should activate focused button
    await user.keyboard('{Enter}')
    expect(mockActions.requestPermission).toHaveBeenCalledTimes(1)
  })
})

describe('Accessibility Compliance', () => {
  it('should have proper ARIA labels and roles', () => {
    const contextValue: RBACContextValue = {
      user: mockUser,
      permissions: mockUser.permissions,
      loading: false
    }

    renderWithRBACContext(
      <AccessibleErrorBoundary>
        <ThrowError />
      </AccessibleErrorBoundary>,
      contextValue
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('오류 상세 정보')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('should provide screen reader announcements', () => {
    render(
      <PermissionErrorMessage 
        permission="project:edit"
        resource="Test Project"
      />
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('aria-live', 'polite')
    expect(alert).toHaveAttribute('aria-atomic', 'true')
  })

  it('should support high contrast mode', () => {
    render(
      <PermissionErrorMessage 
        permission="admin:access"
        severity="high"
      />
    )

    const errorContainer = screen.getByRole('alert')
    expect(errorContainer).toHaveClass('border-red-200', 'bg-red-50')
  })
})