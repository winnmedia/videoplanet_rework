/**
 * MSW 보안 테스트 핸들러 - 권한 시스템 복구용
 * ==============================================
 * 
 * Members.role 필드 기반 권한 제어 모킹
 * Zod 스키마로 런타임 검증 보장
 * 결정론적 테스트를 위한 데이터 시딩
 */

import { rest } from 'msw'
import { z } from 'zod'

// =============== Zod 스키마 정의 ===============

const MemberRoleSchema = z.enum(['owner', 'admin', 'editor', 'reviewer', 'viewer'])

const MemberPermissionsSchema = z.object({
  role: MemberRoleSchema,
  can_invite_users: z.boolean(),
  can_edit_project: z.boolean(),
  can_delete_project: z.boolean(),
  can_manage_members: z.boolean(),
  can_comment: z.boolean(),
})

const ProjectMemberSchema = z.object({
  id: z.number(),
  user: z.number(),
  project: z.number(),
  role: MemberRoleSchema,
  created: z.string(),
  updated: z.string(),
})

const ProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  user: z.number(), // 프로젝트 소유자
  manager: z.string(),
  consumer: z.string(),
  description: z.string().optional(),
  members: z.array(ProjectMemberSchema),
  created: z.string(),
  updated: z.string(),
})

const FeedbackSchema = z.object({
  id: z.number(),
  project: z.number(),
  created: z.string(),
  updated: z.string(),
})

const ProjectInviteSchema = z.object({
  id: z.number(),
  project: z.number(),
  inviter: z.number(),
  email: z.string().email(),
  role: MemberRoleSchema,
  status: z.enum(['pending', 'accepted', 'declined', 'expired', 'cancelled']),
  token: z.string(),
  expires_at: z.string(),
  created: z.string(),
})

// =============== 테스트 데이터 시딩 ===============

const MOCK_USERS = [
  { id: 1, username: 'user1', email: 'user1@example.com' },
  { id: 2, username: 'user2', email: 'user2@example.com' },
  { id: 3, username: 'admin', email: 'admin@example.com', is_superuser: true },
]

const MOCK_PROJECTS = [
  {
    id: 1,
    name: 'User1 Project',
    user: 1, // user1 소유
    manager: 'Manager1',
    consumer: 'Consumer1',
    description: 'Test project for user1',
    created: '2025-09-01T09:00:00Z',
    updated: '2025-09-01T09:00:00Z',
    members: [
      {
        id: 1,
        user: 1,
        project: 1,
        role: 'owner' as const,
        created: '2025-09-01T09:00:00Z',
        updated: '2025-09-01T09:00:00Z',
      },
      {
        id: 2,
        user: 2,
        project: 1,
        role: 'viewer' as const,
        created: '2025-09-01T10:00:00Z',
        updated: '2025-09-01T10:00:00Z',
      }
    ]
  },
  {
    id: 2,
    name: 'User2 Project',
    user: 2, // user2 소유
    manager: 'Manager2',
    consumer: 'Consumer2',
    description: 'Test project for user2',
    created: '2025-09-01T11:00:00Z',
    updated: '2025-09-01T11:00:00Z',
    members: [
      {
        id: 3,
        user: 2,
        project: 2,
        role: 'owner' as const,
        created: '2025-09-01T11:00:00Z',
        updated: '2025-09-01T11:00:00Z',
      }
    ]
  }
]

const MOCK_FEEDBACKS = [
  { id: 1, project: 1, created: '2025-09-01T09:00:00Z', updated: '2025-09-01T09:00:00Z' },
  { id: 2, project: 2, created: '2025-09-01T11:00:00Z', updated: '2025-09-01T11:00:00Z' },
]

const MOCK_PROJECT_INVITES: any[] = []

// =============== 권한 검증 헬퍼 함수 ===============

const calculatePermissions = (role: string): z.infer<typeof MemberPermissionsSchema> => {
  const rolePermissions = {
    owner: {
      can_invite_users: true,
      can_edit_project: true,
      can_delete_project: true,
      can_manage_members: true,
      can_comment: true,
    },
    admin: {
      can_invite_users: true,
      can_edit_project: true,
      can_delete_project: false,
      can_manage_members: true,
      can_comment: true,
    },
    editor: {
      can_invite_users: false,
      can_edit_project: true,
      can_delete_project: false,
      can_manage_members: false,
      can_comment: true,
    },
    reviewer: {
      can_invite_users: false,
      can_edit_project: false,
      can_delete_project: false,
      can_manage_members: false,
      can_comment: true,
    },
    viewer: {
      can_invite_users: false,
      can_edit_project: false,
      can_delete_project: false,
      can_manage_members: false,
      can_comment: false,
    },
  }

  return {
    role: role as z.infer<typeof MemberRoleSchema>,
    ...rolePermissions[role as keyof typeof rolePermissions],
  }
}

const getUserPermissionForProject = (userId: number, projectId: number) => {
  const project = MOCK_PROJECTS.find(p => p.id === projectId)
  if (!project) return null

  // 프로젝트 소유자 확인
  if (project.user === userId) {
    return calculatePermissions('owner')
  }

  // 멤버 권한 확인
  const membership = project.members.find(m => m.user === userId)
  return membership ? calculatePermissions(membership.role) : null
}

const hasProjectAccess = (userId: number, projectId: number) => {
  return getUserPermissionForProject(userId, projectId) !== null
}

// =============== MSW 핸들러 정의 ===============

export const securityHandlers = [
  // 1. 프로젝트 목록 조회 - 소유권 기반 필터링
  rest.get('/projects/api/projects/', (req, res, ctx) => {
    const userIdHeader = req.headers.get('X-User-Id')
    const userId = userIdHeader ? parseInt(userIdHeader) : null

    if (!userId) {
      return res(ctx.status(401), ctx.json({ error: 'Authentication required' }))
    }

    // 사용자가 접근 가능한 프로젝트만 필터링
    const accessibleProjects = MOCK_PROJECTS.filter(project => 
      project.user === userId || // 소유자
      project.members.some(member => member.user === userId) // 멤버
    )

    // 응답 데이터에서 민감 정보 제거
    const safeProjects = accessibleProjects.map(project => ({
      ...project,
      members: project.members.map(member => ({
        ...member,
        // 권한 정보 포함
        ...calculatePermissions(member.role),
      }))
    }))

    try {
      const validatedProjects = ProjectSchema.array().parse(safeProjects)
      return res(ctx.json(validatedProjects))
    } catch (error) {
      return res(ctx.status(500), ctx.json({ error: 'Invalid data schema' }))
    }
  }),

  // 2. 프로젝트 상세 조회 - 권한별 접근 제어
  rest.get('/projects/api/projects/:id/', (req, res, ctx) => {
    const projectId = parseInt(req.params.id as string)
    const userIdHeader = req.headers.get('X-User-Id')
    const userId = userIdHeader ? parseInt(userIdHeader) : null

    if (!userId) {
      return res(ctx.status(401), ctx.json({ error: 'Authentication required' }))
    }

    const project = MOCK_PROJECTS.find(p => p.id === projectId)
    if (!project) {
      return res(ctx.status(404), ctx.json({ error: 'Project not found' }))
    }

    // 접근 권한 확인
    if (!hasProjectAccess(userId, projectId)) {
      return res(ctx.status(403), ctx.json({ error: 'Access denied' }))
    }

    const userPermission = getUserPermissionForProject(userId, projectId)!
    const projectWithPermissions = {
      ...project,
      user_permissions: userPermission,
      members: project.members.map(member => ({
        ...member,
        ...calculatePermissions(member.role),
      }))
    }

    try {
      const validatedProject = ProjectSchema.parse(projectWithPermissions)
      return res(ctx.json(validatedProject))
    } catch (error) {
      return res(ctx.status(500), ctx.json({ error: 'Invalid data schema' }))
    }
  }),

  // 3. 프로젝트 수정 - Editor 이상 권한 필요
  rest.patch('/projects/api/projects/:id/', (req, res, ctx) => {
    const projectId = parseInt(req.params.id as string)
    const userIdHeader = req.headers.get('X-User-Id')
    const userId = userIdHeader ? parseInt(userIdHeader) : null

    if (!userId) {
      return res(ctx.status(401), ctx.json({ error: 'Authentication required' }))
    }

    const userPermission = getUserPermissionForProject(userId, projectId)
    if (!userPermission) {
      return res(ctx.status(404), ctx.json({ error: 'Project not found' }))
    }

    if (!userPermission.can_edit_project) {
      return res(ctx.status(403), ctx.json({ error: 'Edit permission required' }))
    }

    const project = MOCK_PROJECTS.find(p => p.id === projectId)!
    const updatedProject = {
      ...project,
      ...req.body,
      updated: new Date().toISOString(),
    }

    // 실제로는 데이터 업데이트하지 않고 성공 응답만
    return res(ctx.json(updatedProject))
  }),

  // 4. 프로젝트 삭제 - Owner만 가능
  rest.delete('/projects/api/projects/:id/', (req, res, ctx) => {
    const projectId = parseInt(req.params.id as string)
    const userIdHeader = req.headers.get('X-User-Id')
    const userId = userIdHeader ? parseInt(userIdHeader) : null

    if (!userId) {
      return res(ctx.status(401), ctx.json({ error: 'Authentication required' }))
    }

    const userPermission = getUserPermissionForProject(userId, projectId)
    if (!userPermission) {
      return res(ctx.status(404), ctx.json({ error: 'Project not found' }))
    }

    if (!userPermission.can_delete_project) {
      return res(ctx.status(403), ctx.json({ error: 'Owner permission required' }))
    }

    return res(ctx.status(204))
  }),

  // 5. 프로젝트 초대 생성 - Admin 이상 권한 필요
  rest.post('/projects/api/project-invites/', async (req, res, ctx) => {
    const body = await req.json()
    const userIdHeader = req.headers.get('X-User-Id')
    const userId = userIdHeader ? parseInt(userIdHeader) : null

    if (!userId) {
      return res(ctx.status(401), ctx.json({ error: 'Authentication required' }))
    }

    const projectId = body.project
    const userPermission = getUserPermissionForProject(userId, projectId)
    
    if (!userPermission) {
      return res(ctx.status(404), ctx.json({ error: 'Project not found' }))
    }

    if (!userPermission.can_invite_users) {
      return res(ctx.status(403), ctx.json({ error: 'Invite permission required' }))
    }

    const newInvite = {
      id: MOCK_PROJECT_INVITES.length + 1,
      project: projectId,
      inviter: userId,
      email: body.email,
      role: body.role || 'viewer',
      status: 'pending',
      token: `invite-token-${Date.now()}`,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      created: new Date().toISOString(),
    }

    try {
      const validatedInvite = ProjectInviteSchema.parse(newInvite)
      MOCK_PROJECT_INVITES.push(validatedInvite)
      return res(ctx.status(201), ctx.json(validatedInvite))
    } catch (error) {
      return res(ctx.status(400), ctx.json({ error: 'Invalid invite data' }))
    }
  }),

  // 6. 피드백 접근 - 프로젝트 멤버만 가능
  rest.get('/feedbacks/api/feedbacks/:id/', (req, res, ctx) => {
    const feedbackId = parseInt(req.params.id as string)
    const userIdHeader = req.headers.get('X-User-Id')
    const userId = userIdHeader ? parseInt(userIdHeader) : null

    if (!userId) {
      return res(ctx.status(401), ctx.json({ error: 'Authentication required' }))
    }

    const feedback = MOCK_FEEDBACKS.find(f => f.id === feedbackId)
    if (!feedback) {
      return res(ctx.status(404), ctx.json({ error: 'Feedback not found' }))
    }

    // 해당 피드백의 프로젝트에 접근 권한이 있는지 확인
    if (!hasProjectAccess(userId, feedback.project)) {
      return res(ctx.status(403), ctx.json({ error: 'Access denied' }))
    }

    try {
      const validatedFeedback = FeedbackSchema.parse(feedback)
      return res(ctx.json(validatedFeedback))
    } catch (error) {
      return res(ctx.status(500), ctx.json({ error: 'Invalid data schema' }))
    }
  }),

  // 7. 피드백 댓글 생성 - Reviewer 이상 권한 필요
  rest.post('/feedbacks/api/feedback-comments/', async (req, res, ctx) => {
    const body = await req.json()
    const userIdHeader = req.headers.get('X-User-Id')
    const userId = userIdHeader ? parseInt(userIdHeader) : null

    if (!userId) {
      return res(ctx.status(401), ctx.json({ error: 'Authentication required' }))
    }

    const feedbackId = body.feedback
    const feedback = MOCK_FEEDBACKS.find(f => f.id === feedbackId)
    if (!feedback) {
      return res(ctx.status(400), ctx.json({ error: 'Invalid feedback' }))
    }

    const userPermission = getUserPermissionForProject(userId, feedback.project)
    if (!userPermission) {
      return res(ctx.status(403), ctx.json({ error: 'Access denied' }))
    }

    if (!userPermission.can_comment) {
      return res(ctx.status(403), ctx.json({ error: 'Comment permission required' }))
    }

    const newComment = {
      id: Date.now(),
      feedback: feedbackId,
      title: body.title,
      section: body.section,
      text: body.text,
      created: new Date().toISOString(),
    }

    return res(ctx.status(201), ctx.json(newComment))
  }),
]

// =============== 테스트 유틸리티 ===============

export const resetMockData = () => {
  MOCK_PROJECT_INVITES.length = 0
}

export const addMockProject = (project: any) => {
  const validatedProject = ProjectSchema.parse(project)
  MOCK_PROJECTS.push(validatedProject)
}

export const getMockUserPermissions = (userId: number, projectId: number) => {
  return getUserPermissionForProject(userId, projectId)
}

export { calculatePermissions, hasProjectAccess }