import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SecurityDashboard } from './SecurityDashboard'
import { SecurityEventList, SecurityMetrics, ThreatIndicator } from './SecurityDashboard'
import { RBACContext, RBACContextValue } from '@/shared/lib/rbac-system'
import { AuthenticatedUser } from '@/features/authentication/model/types'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const mockAdmin: AuthenticatedUser = {
  id: '1',
  email: 'admin@test.com',
  username: 'admin',
  role: 'admin',
  permissions: ['security:read', 'security:manage']
}

const mockEditor: AuthenticatedUser = {
  id: '2',
  email: 'editor@test.com', 
  username: 'editor',
  role: 'editor',
  permissions: ['project:edit']
}

const mockSecurityEvents = [
  {
    id: '1',
    type: 'PERMISSION_DENIED' as const,
    userId: '2',
    resource: 'project:123',
    permission: 'project:delete',
    timestamp: new Date('2025-09-03T10:00:00Z'),
    severity: 'medium' as const,
    metadata: { userAgent: 'Chrome', ip: '192.168.1.1' }
  },
  {
    id: '2',
    type: 'UNAUTHORIZED_ACCESS' as const,
    userId: '3',
    resource: 'user_data:456',
    permission: 'data:read',
    timestamp: new Date('2025-09-03T11:00:00Z'),
    severity: 'high' as const,
    metadata: { attemptedResource: 'sensitive_data' }
  },
  {
    id: '3',
    type: 'ROLE_CHANGE' as const,
    userId: '2',
    resource: 'user:2',
    permission: 'role:update',
    timestamp: new Date('2025-09-03T12:00:00Z'),
    severity: 'low' as const,
    metadata: { previousRole: 'viewer', newRole: 'editor' }
  }
]

const server = setupServer(
  rest.get('/api/security/events', (req, res, ctx) => {
    return res(ctx.json({ 
      events: mockSecurityEvents,
      totalCount: mockSecurityEvents.length 
    }))
  }),
  rest.get('/api/security/metrics', (req, res, ctx) => {
    return res(ctx.json({
      totalEvents: 156,
      highSeverityEvents: 23,
      mediumSeverityEvents: 87,
      lowSeverityEvents: 46,
      activeThreats: 3,
      blockedAttempts: 12
    }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderWithRBACContext = (component: React.ReactElement, user: AuthenticatedUser) => {
  const contextValue: RBACContextValue = {
    user,
    permissions: user.permissions,
    loading: false
  }
  
  return render(
    <RBACContext.Provider value={contextValue}>
      {component}
    </RBACContext.Provider>
  )
}

describe('SecurityDashboard Component', () => {
  it('should render dashboard for admin users', async () => {
    renderWithRBACContext(<SecurityDashboard />, mockAdmin)
    
    expect(screen.getByText('보안 모니터링 대시보드')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('보안 지표')).toBeInTheDocument()
      expect(screen.getByText('최근 보안 이벤트')).toBeInTheDocument()
    })
  })

  it('should show access denied for non-admin users', () => {
    renderWithRBACContext(<SecurityDashboard />, mockEditor)
    
    expect(screen.getByText('보안 대시보드 접근 권한이 없습니다')).toBeInTheDocument()
    expect(screen.queryByText('보안 모니터링 대시보드')).not.toBeInTheDocument()
  })

  it('should handle loading state', () => {
    const contextValue: RBACContextValue = {
      user: null,
      permissions: [],
      loading: true
    }
    
    render(
      <RBACContext.Provider value={contextValue}>
        <SecurityDashboard />
      </RBACContext.Provider>
    )
    
    expect(screen.getByText('권한 확인 중...')).toBeInTheDocument()
  })
})

describe('SecurityEventList Component', () => {
  it('should display security events correctly', async () => {
    renderWithRBACContext(<SecurityEventList />, mockAdmin)
    
    await waitFor(() => {
      expect(screen.getByText('권한 거부')).toBeInTheDocument()
      expect(screen.getByText('무단 접근 시도')).toBeInTheDocument() 
      expect(screen.getByText('권한 변경')).toBeInTheDocument()
    })
  })

  it('should filter events by severity', async () => {
    const user = userEvent.setup()
    renderWithRBACContext(<SecurityEventList />, mockAdmin)
    
    await waitFor(() => {
      expect(screen.getByText('권한 거부')).toBeInTheDocument()
    })
    
    const severityFilter = screen.getByRole('combobox', { name: /심각도 필터/i })
    await user.selectOptions(severityFilter, 'high')
    
    await waitFor(() => {
      expect(screen.getByText('무단 접근 시도')).toBeInTheDocument()
      expect(screen.queryByText('권한 거부')).not.toBeInTheDocument()
    })
  })

  it('should show event details on expand', async () => {
    const user = userEvent.setup()
    renderWithRBACContext(<SecurityEventList />, mockAdmin)
    
    await waitFor(() => {
      expect(screen.getByText('권한 거부')).toBeInTheDocument()
    })
    
    const expandButton = screen.getAllByRole('button', { name: /상세 정보 보기/i })[0]
    await user.click(expandButton)
    
    expect(screen.getByText('Chrome')).toBeInTheDocument()
    expect(screen.getByText('192.168.1.1')).toBeInTheDocument()
  })

  it('should handle empty event list', async () => {
    server.use(
      rest.get('/api/security/events', (req, res, ctx) => {
        return res(ctx.json({ events: [], totalCount: 0 }))
      })
    )
    
    renderWithRBACContext(<SecurityEventList />, mockAdmin)
    
    await waitFor(() => {
      expect(screen.getByText('보안 이벤트가 없습니다')).toBeInTheDocument()
    })
  })
})

describe('SecurityMetrics Component', () => {
  it('should display security metrics correctly', async () => {
    renderWithRBACContext(<SecurityMetrics />, mockAdmin)
    
    await waitFor(() => {
      expect(screen.getByText('156')).toBeInTheDocument() // total events
      expect(screen.getByText('23')).toBeInTheDocument() // high severity
      expect(screen.getByText('3')).toBeInTheDocument() // active threats
    })
  })

  it('should show loading state for metrics', () => {
    server.use(
      rest.get('/api/security/metrics', (req, res, ctx) => {
        return res(ctx.delay('infinite'))
      })
    )
    
    renderWithRBACContext(<SecurityMetrics />, mockAdmin)
    
    expect(screen.getByText('지표 로딩 중...')).toBeInTheDocument()
  })
})

describe('ThreatIndicator Component', () => {
  it('should show high threat level correctly', () => {
    render(<ThreatIndicator level="high" count={5} />)
    
    expect(screen.getByText('높음')).toBeInTheDocument()
    expect(screen.getByText('5건의 고위험 위협')).toBeInTheDocument()
    
    const indicator = screen.getByRole('img')
    expect(indicator).toHaveClass('bg-red-100', 'text-red-800')
  })

  it('should show medium threat level correctly', () => {
    render(<ThreatIndicator level="medium" count={2} />)
    
    expect(screen.getByText('보통')).toBeInTheDocument()
    expect(screen.getByText('2건의 중위험 위협')).toBeInTheDocument()
    
    const indicator = screen.getByRole('img')
    expect(indicator).toHaveClass('bg-yellow-100', 'text-yellow-800')
  })

  it('should show low threat level correctly', () => {
    render(<ThreatIndicator level="low" count={1} />)
    
    expect(screen.getByText('낮음')).toBeInTheDocument()
    expect(screen.getByText('1건의 저위험 위협')).toBeInTheDocument()
    
    const indicator = screen.getByRole('img')
    expect(indicator).toHaveClass('bg-green-100', 'text-green-800')
  })
})

describe('Accessibility', () => {
  it('should have proper ARIA labels and roles', async () => {
    renderWithRBACContext(<SecurityDashboard />, mockAdmin)
    
    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', '보안 대시보드')
      expect(screen.getByRole('region', { name: '보안 지표' })).toBeInTheDocument()
    })
  })

  it('should announce security alerts to screen readers', async () => {
    renderWithRBACContext(<SecurityEventList />, mockAdmin)
    
    await waitFor(() => {
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })

  it('should provide keyboard navigation for event details', async () => {
    const user = userEvent.setup()
    renderWithRBACContext(<SecurityEventList />, mockAdmin)
    
    await waitFor(() => {
      expect(screen.getByText('권한 거부')).toBeInTheDocument()
    })
    
    const expandButton = screen.getAllByRole('button')[0]
    expandButton.focus()
    
    await user.keyboard('{Enter}')
    
    expect(screen.getByText('Chrome')).toBeInTheDocument()
  })
})