import { rest } from 'msw'

// Mock user data for different roles
export const mockUsers = {
  owner: {
    id: '1',
    email: 'owner@videoplanet.com',
    username: 'owner',
    displayName: '프로젝트 소유자',
    role: 'owner',
    permissions: ['project:full', 'member:invite', 'project:delete', 'project:transfer', 'security:read']
  },
  admin: {
    id: '2', 
    email: 'admin@videoplanet.com',
    username: 'admin',
    displayName: '관리자',
    role: 'admin',
    permissions: ['project:edit', 'member:manage', 'member:invite', 'project:settings', 'security:read']
  },
  editor: {
    id: '3',
    email: 'editor@videoplanet.com', 
    username: 'editor',
    displayName: '편집자',
    role: 'editor',
    permissions: ['project:edit', 'content:create', 'content:edit', 'feedback:manage']
  },
  reviewer: {
    id: '4',
    email: 'reviewer@videoplanet.com',
    username: 'reviewer', 
    displayName: '검토자',
    role: 'reviewer',
    permissions: ['project:read', 'content:review', 'feedback:create']
  },
  viewer: {
    id: '5',
    email: 'viewer@videoplanet.com',
    username: 'viewer',
    displayName: '뷰어',
    role: 'viewer', 
    permissions: ['project:read']
  }
}

// Mock project data with ownership information
export const mockProjects = [
  {
    id: '101',
    name: 'VideoPlanet 메인 프로젝트',
    description: '메인 비디오 플랫폼 프로젝트',
    userId: '1', // owner
    createdBy: '1',
    members: [
      { userId: '1', role: 'owner', permissions: ['project:full'] },
      { userId: '2', role: 'admin', permissions: ['project:edit'] },
      { userId: '3', role: 'editor', permissions: ['content:edit'] }
    ],
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: '102', 
    name: '보안 테스트 프로젝트',
    description: '권한 시스템 테스트용 프로젝트',
    userId: '2', // admin
    createdBy: '2',
    members: [
      { userId: '2', role: 'owner', permissions: ['project:full'] },
      { userId: '4', role: 'reviewer', permissions: ['content:review'] },
      { userId: '5', role: 'viewer', permissions: ['project:read'] }
    ],
    createdAt: '2025-02-01T00:00:00Z'
  },
  {
    id: '103',
    name: '데이터 격리 테스트',
    description: '사용자별 데이터 격리 테스트',
    userId: '3', // editor
    createdBy: '3', 
    members: [
      { userId: '3', role: 'owner', permissions: ['project:full'] }
    ],
    createdAt: '2025-02-15T00:00:00Z'
  }
]

// Mock security events for monitoring dashboard
export const mockSecurityEvents = [
  {
    id: '1',
    type: 'PERMISSION_DENIED',
    userId: '5', // viewer
    resource: 'project:101',
    permission: 'project:delete',
    timestamp: '2025-09-03T10:30:00Z',
    severity: 'medium',
    metadata: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ip: '192.168.1.100',
      attemptedAction: 'delete_project'
    }
  },
  {
    id: '2',
    type: 'UNAUTHORIZED_ACCESS',
    userId: '4', // reviewer  
    resource: 'user_data:sensitive',
    permission: 'data:admin',
    timestamp: '2025-09-03T11:15:00Z',
    severity: 'high',
    metadata: {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      ip: '10.0.0.50',
      attemptedResource: 'admin_dashboard'
    }
  },
  {
    id: '3',
    type: 'ROLE_CHANGE',
    userId: '3', // editor
    resource: 'user:3',
    permission: 'role:update',
    timestamp: '2025-09-03T09:45:00Z', 
    severity: 'low',
    metadata: {
      previousRole: 'reviewer',
      newRole: 'editor',
      changedBy: '2' // admin
    }
  }
]

// Current authenticated user state (for MSW session simulation)
let currentUser: string | null = 'viewer' // Default to viewer for testing

// RBAC API Handlers
export const rbacHandlers = [
  // Authentication endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body as { email: string; password: string }
    
    // Simple mock authentication
    const user = Object.values(mockUsers).find(u => u.email === email)
    
    if (!user) {
      return res(
        ctx.status(401),
        ctx.json({ 
          success: false, 
          error: { code: 'INVALID_CREDENTIALS', message: '잘못된 인증 정보입니다' }
        })
      )
    }
    
    // Set current user for subsequent requests
    currentUser = user.username
    
    return res(
      ctx.json({
        success: true,
        data: {
          user,
          tokens: {
            accessToken: `mock_token_${user.id}`,
            refreshToken: `mock_refresh_${user.id}`,
            expiresIn: 3600
          }
        }
      })
    )
  }),

  rest.get('/api/auth/me', (req, res, ctx) => {
    if (!currentUser) {
      return res(
        ctx.status(401),
        ctx.json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다' }
        })
      )
    }
    
    const user = mockUsers[currentUser as keyof typeof mockUsers]
    return res(ctx.json({ success: true, data: { user } }))
  }),

  rest.post('/api/auth/logout', (req, res, ctx) => {
    currentUser = null
    return res(ctx.json({ success: true }))
  }),

  // Permission checking endpoints  
  rest.get('/api/permissions/check', (req, res, ctx) => {
    const permission = req.url.searchParams.get('permission')
    const resource = req.url.searchParams.get('resource')
    
    if (!currentUser) {
      return res(
        ctx.status(401),
        ctx.json({ success: false, hasPermission: false })
      )
    }
    
    const user = mockUsers[currentUser as keyof typeof mockUsers]
    const hasPermission = user.permissions.includes(permission || '') || 
                         (user.role === 'owner' && permission?.startsWith('project:'))
    
    return res(
      ctx.json({ 
        success: true, 
        hasPermission,
        user: { id: user.id, role: user.role }
      })
    )
  }),

  // Project data endpoints with RBAC filtering
  rest.get('/api/projects', (req, res, ctx) => {
    if (!currentUser) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }))
    }
    
    const user = mockUsers[currentUser as keyof typeof mockUsers]
    let filteredProjects = mockProjects
    
    // Apply data isolation based on user role
    if (!['owner', 'admin'].includes(user.role)) {
      // Non-privileged users only see their own projects or projects they're members of
      filteredProjects = mockProjects.filter(project => 
        project.userId === user.id || 
        project.members.some(member => member.userId === user.id)
      )
    }
    
    return res(
      ctx.json({ 
        success: true, 
        data: { 
          projects: filteredProjects,
          totalCount: filteredProjects.length,
          userRole: user.role
        }
      })
    )
  }),

  rest.get('/api/projects/:projectId', (req, res, ctx) => {
    const { projectId } = req.params
    
    if (!currentUser) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }))
    }
    
    const user = mockUsers[currentUser as keyof typeof mockUsers]
    const project = mockProjects.find(p => p.id === projectId)
    
    if (!project) {
      return res(ctx.status(404), ctx.json({ error: 'Project not found' }))
    }
    
    // Check if user has access to this project
    const hasAccess = project.userId === user.id ||
                     project.members.some(member => member.userId === user.id) ||
                     ['owner', 'admin'].includes(user.role)
    
    if (!hasAccess) {
      return res(
        ctx.status(403), 
        ctx.json({ 
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermission: 'project:read',
          userRole: user.role
        })
      )
    }
    
    return res(ctx.json({ success: true, data: { project } }))
  }),

  rest.delete('/api/projects/:projectId', (req, res, ctx) => {
    const { projectId } = req.params
    
    if (!currentUser) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }))
    }
    
    const user = mockUsers[currentUser as keyof typeof mockUsers]
    const project = mockProjects.find(p => p.id === projectId)
    
    if (!project) {
      return res(ctx.status(404), ctx.json({ error: 'Project not found' }))
    }
    
    // Only owners can delete projects
    const canDelete = project.userId === user.id || user.role === 'owner'
    
    if (!canDelete) {
      return res(
        ctx.status(403),
        ctx.json({
          error: 'Insufficient permissions to delete project', 
          code: 'PERMISSION_DENIED',
          requiredPermission: 'project:delete',
          userRole: user.role,
          projectOwner: project.userId
        })
      )
    }
    
    return res(ctx.json({ success: true, message: 'Project deleted successfully' }))
  }),

  // Security monitoring endpoints (admin only)
  rest.get('/api/security/events', (req, res, ctx) => {
    if (!currentUser) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }))
    }
    
    const user = mockUsers[currentUser as keyof typeof mockUsers]
    
    // Only admin and owners can access security events
    if (!['owner', 'admin'].includes(user.role)) {
      return res(
        ctx.status(403),
        ctx.json({ 
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          requiredPermission: 'security:read',
          userRole: user.role
        })
      )
    }
    
    const severityFilter = req.url.searchParams.get('severity')
    let filteredEvents = mockSecurityEvents
    
    if (severityFilter && severityFilter !== 'all') {
      filteredEvents = mockSecurityEvents.filter(event => event.severity === severityFilter)
    }
    
    return res(
      ctx.json({
        success: true,
        data: { 
          events: filteredEvents,
          totalCount: filteredEvents.length
        }
      })
    )
  }),

  rest.get('/api/security/metrics', (req, res, ctx) => {
    if (!currentUser) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }))
    }
    
    const user = mockUsers[currentUser as keyof typeof mockUsers]
    
    if (!['owner', 'admin'].includes(user.role)) {
      return res(
        ctx.status(403),
        ctx.json({ 
          error: 'Insufficient permissions',
          requiredPermission: 'security:read' 
        })
      )
    }
    
    return res(
      ctx.json({
        success: true,
        data: {
          totalEvents: 156,
          highSeverityEvents: 23,
          mediumSeverityEvents: 87, 
          lowSeverityEvents: 46,
          activeThreats: 3,
          blockedAttempts: 12
        }
      })
    )
  }),

  // Team management endpoints
  rest.post('/api/projects/:projectId/members', (req, res, ctx) => {
    const { projectId } = req.params
    const { userId, role } = req.body as { userId: string; role: string }
    
    if (!currentUser) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }))
    }
    
    const user = mockUsers[currentUser as keyof typeof mockUsers]
    const project = mockProjects.find(p => p.id === projectId)
    
    if (!project) {
      return res(ctx.status(404), ctx.json({ error: 'Project not found' }))
    }
    
    // Check if user can invite members
    const canInvite = project.userId === user.id || 
                     user.permissions.includes('member:invite') ||
                     user.role === 'owner'
    
    if (!canInvite) {
      return res(
        ctx.status(403),
        ctx.json({
          error: 'Insufficient permissions to invite members',
          code: 'PERMISSION_DENIED',
          requiredPermission: 'member:invite',
          userRole: user.role
        })
      )
    }
    
    return res(
      ctx.json({ 
        success: true, 
        message: 'Member invited successfully',
        data: { userId, role, projectId }
      })
    )
  }),

  // Test endpoints for specific RBAC scenarios
  rest.get('/api/test/rbac/scenario/:scenario', (req, res, ctx) => {
    const { scenario } = req.params
    
    switch (scenario) {
      case 'permission-denied':
        return res(
          ctx.status(403),
          ctx.json({
            error: 'Permission denied for testing',
            code: 'PERMISSION_DENIED',
            requiredPermission: 'test:access',
            timestamp: new Date().toISOString()
          })
        )
        
      case 'unauthorized-access':
        return res(
          ctx.status(401),
          ctx.json({
            error: 'Unauthorized access attempt',
            code: 'UNAUTHORIZED',
            timestamp: new Date().toISOString()
          })
        )
        
      case 'role-insufficient': 
        return res(
          ctx.status(403),
          ctx.json({
            error: 'Role insufficient for this operation',
            code: 'ROLE_INSUFFICIENT',
            requiredRole: 'admin',
            currentRole: currentUser ? mockUsers[currentUser as keyof typeof mockUsers]?.role : 'guest',
            timestamp: new Date().toISOString()
          })
        )
        
      default:
        return res(
          ctx.json({
            success: true,
            scenario,
            user: currentUser ? mockUsers[currentUser as keyof typeof mockUsers] : null
          })
        )
    }
  })
]

// Helper function to set current user for tests
export const setMockUser = (userRole: keyof typeof mockUsers | null) => {
  currentUser = userRole
}

// Helper function to get current mock user
export const getCurrentMockUser = () => {
  return currentUser ? mockUsers[currentUser as keyof typeof mockUsers] : null
}