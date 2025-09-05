import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { z } from 'zod'

import { CalendarEvent } from '@/entities/calendar/model/types'

import { 
  Project, 
  CreateProjectDto,
  InviteProjectMemberDto,
  ProjectMember,
  AutoScheduleResult
} from './types'

// ===========================
// State Interface
// ===========================

export interface ProjectState {
  // Core data
  projects: Project[]
  currentProject: Project | null
  
  // Loading states
  isLoading: boolean
  isCreating: boolean
  isInviting: boolean
  
  // Error states  
  error: string | null
  createError: string | null
  inviteError: string | null
  
  // Auto-scheduling
  autoSchedulePreview: AutoScheduleResult | null
  
  // Team management
  invitationCooldowns: Record<string, number> // email -> timestamp
  pendingInvitations: InviteProjectMemberDto[]
  
  // RBAC states
  currentUserRole: ProjectMember['role'] | null
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canInvite: boolean
    canView: boolean
  }
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  isCreating: false,
  isInviting: false,
  error: null,
  createError: null,
  inviteError: null,
  autoSchedulePreview: null,
  invitationCooldowns: {},
  pendingInvitations: [],
  currentUserRole: null,
  permissions: {
    canEdit: false,
    canDelete: false,
    canInvite: false,
    canView: false
  }
}

// ===========================
// Validation Schemas (Zod)
// ===========================

const CreateProjectSchema = z.object({
  title: z.string().min(1, '프로젝트 제목을 입력해주세요').max(100, '제목은 100자 이하로 입력해주세요'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  settings: z.object({
    isPublic: z.boolean().optional(),
    allowComments: z.boolean().optional(),
    allowDownload: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    watermarkEnabled: z.boolean().optional(),
    expirationDate: z.string().optional()
  }).optional(),
  autoSchedule: z.object({
    planning: z.object({ duration: z.number() }),
    shooting: z.object({ duration: z.number() }),
    editing: z.object({ duration: z.number() })
  }).optional()
})

const InviteSchema = z.object({
  email: z.string().email('유효한 이메일을 입력해주세요'),
  role: z.enum(['editor', 'viewer']),
  message: z.string().optional()
})

// ===========================
// Async Thunks
// ===========================

/**
 * 프로젝트 생성 (자동 스케줄링 포함)
 */
export const createProject = createAsyncThunk(
  'project/create',
  async (projectData: CreateProjectDto, { rejectWithValue, getState }) => {
    try {
      // Zod 검증
      const validatedData = CreateProjectSchema.parse(projectData)
      
      // API 호출 시뮬레이션 (실제로는 projectApi.ts 사용)
      const response = await new Promise<{ project: Project; calendarEvents: CalendarEvent[] }>((resolve, reject) => {
        setTimeout(() => {
          if (validatedData.title === 'error') {
            reject(new Error('프로젝트 생성에 실패했습니다'))
          } else {
            resolve({
              project: {
                id: `project_${Date.now()}`,
                title: validatedData.title,
                description: validatedData.description,
                status: 'draft',
                ownerId: 'current_user_id',
                members: [{
                  userId: 'current_user_id',
                  role: 'owner',
                  joinedAt: new Date().toISOString()
                }],
                videos: [],
                tags: validatedData.tags || [],
                settings: {
                  isPublic: false,
                  allowComments: true,
                  allowDownload: false,
                  requireApproval: true,
                  watermarkEnabled: true,
                  ...validatedData.settings
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              calendarEvents: [] // 자동 생성된 캘린더 이벤트들
            })
          }
        }, 1000)
      })
      
      return response
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return rejectWithValue(error.errors.map(e => e.message).join(', '))
      }
      return rejectWithValue(error.message || '프로젝트 생성에 실패했습니다')
    }
  }
)

/**
 * 팀원 초대 (SendGrid 연동, 60초 쿨다운)
 */
export const inviteTeamMember = createAsyncThunk(
  'project/inviteTeamMember',
  async (
    { projectId, invitation }: { projectId: string; invitation: InviteProjectMemberDto },
    { rejectWithValue, getState }
  ) => {
    try {
      // Zod 검증
      const validatedInvite = InviteSchema.parse(invitation)
      
      // 쿨다운 확인 (60초)
      const state = getState() as { project: ProjectState }
      const cooldownTime = state.project.invitationCooldowns[validatedInvite.email]
      const now = Date.now()
      
      if (cooldownTime && now - cooldownTime < 60000) {
        const remainingTime = Math.ceil((60000 - (now - cooldownTime)) / 1000)
        return rejectWithValue(`${remainingTime}초 후에 다시 시도할 수 있습니다`)
      }
      
      // SendGrid API 호출 시뮬레이션
      const response = await new Promise<{ success: boolean; invitationId: string }>((resolve, reject) => {
        setTimeout(() => {
          if (validatedInvite.email === 'fail@test.com') {
            reject(new Error('이메일 전송에 실패했습니다'))
          } else {
            resolve({
              success: true,
              invitationId: `invite_${Date.now()}`
            })
          }
        }, 2000)
      })
      
      return {
        ...response,
        email: validatedInvite.email,
        timestamp: now
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return rejectWithValue(error.errors.map(e => e.message).join(', '))
      }
      return rejectWithValue(error.message || '초대 전송에 실패했습니다')
    }
  }
)

/**
 * 프로젝트 목록 조회
 */
export const fetchProjects = createAsyncThunk(
  'project/fetchProjects',
  async (_, { rejectWithValue }) => {
    try {
      // API 호출 시뮬레이션
      const response = await new Promise<Project[]>((resolve) => {
        setTimeout(() => {
          resolve([
            {
              id: 'project_1',
              title: '회사 홍보 영상',
              description: '2024년 회사 홍보 영상 제작 프로젝트',
              status: 'active',
              ownerId: 'user_1',
              members: [
                { userId: 'user_1', role: 'owner', joinedAt: '2024-01-01T00:00:00Z' },
                { userId: 'user_2', role: 'editor', joinedAt: '2024-01-02T00:00:00Z' }
              ],
              videos: [],
              tags: ['홍보', '회사소개'],
              settings: {
                isPublic: false,
                allowComments: true,
                allowDownload: false,
                requireApproval: true,
                watermarkEnabled: true
              },
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-15T00:00:00Z'
            }
          ])
        }, 500)
      })
      
      return response
    } catch (error: any) {
      return rejectWithValue(error.message || '프로젝트 목록을 불러오는데 실패했습니다')
    }
  }
)

// ===========================
// Slice Definition
// ===========================

const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    // Auto-scheduling
    setAutoSchedulePreview: (state, action: PayloadAction<AutoScheduleResult | null>) => {
      state.autoSchedulePreview = action.payload
    },
    
    // Error management
    clearErrors: (state) => {
      state.error = null
      state.createError = null
      state.inviteError = null
    },
    
    clearCreateError: (state) => {
      state.createError = null
    },
    
    clearInviteError: (state) => {
      state.inviteError = null
    },
    
    // Current project management
    setCurrentProject: (state, action: PayloadAction<Project | null>) => {
      state.currentProject = action.payload
      
      // RBAC 권한 계산
      if (action.payload) {
        const currentUserId = 'current_user_id' // 실제로는 auth state에서 가져와야 함
        const member = action.payload.members.find(m => m.userId === currentUserId)
        
        if (member) {
          state.currentUserRole = member.role
          state.permissions = calculatePermissions(member.role)
        } else {
          state.currentUserRole = null
          state.permissions = {
            canEdit: false,
            canDelete: false,
            canInvite: false,
            canView: action.payload.settings.isPublic
          }
        }
      } else {
        state.currentUserRole = null
        state.permissions = {
          canEdit: false,
          canDelete: false,
          canInvite: false,
          canView: false
        }
      }
    },
    
    // Team management
    addPendingInvitation: (state, action: PayloadAction<InviteProjectMemberDto>) => {
      state.pendingInvitations.push(action.payload)
    },
    
    removePendingInvitation: (state, action: PayloadAction<string>) => {
      state.pendingInvitations = state.pendingInvitations.filter(
        invite => invite.email !== action.payload
      )
    }
  },
  
  extraReducers: (builder) => {
    // Create project
    builder
      .addCase(createProject.pending, (state) => {
        state.isCreating = true
        state.createError = null
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.isCreating = false
        state.projects.unshift(action.payload.project)
        state.currentProject = action.payload.project
        state.autoSchedulePreview = null // 생성 완료 시 프리뷰 초기화
      })
      .addCase(createProject.rejected, (state, action) => {
        state.isCreating = false
        state.createError = action.payload as string
      })
    
    // Invite team member
    builder
      .addCase(inviteTeamMember.pending, (state) => {
        state.isInviting = true
        state.inviteError = null
      })
      .addCase(inviteTeamMember.fulfilled, (state, action) => {
        state.isInviting = false
        state.invitationCooldowns[action.payload.email] = action.payload.timestamp
      })
      .addCase(inviteTeamMember.rejected, (state, action) => {
        state.isInviting = false
        state.inviteError = action.payload as string
      })
    
    // Fetch projects
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.isLoading = false
        state.projects = action.payload
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  }
})

// ===========================
// Helper Functions
// ===========================

/**
 * RBAC 권한 계산
 */
function calculatePermissions(role: ProjectMember['role']) {
  switch (role) {
    case 'owner':
      return {
        canEdit: true,
        canDelete: true,
        canInvite: true,
        canView: true
      }
    case 'editor':
      return {
        canEdit: true,
        canDelete: false,
        canInvite: false,
        canView: true
      }
    case 'viewer':
      return {
        canEdit: false,
        canDelete: false,
        canInvite: false,
        canView: true
      }
    default:
      return {
        canEdit: false,
        canDelete: false,
        canInvite: false,
        canView: false
      }
  }
}

// ===========================
// Exports
// ===========================

export const {
  setAutoSchedulePreview,
  clearErrors,
  clearCreateError,
  clearInviteError,
  setCurrentProject,
  addPendingInvitation,
  removePendingInvitation
} = projectSlice.actions

export default projectSlice.reducer

// Selectors
export const selectProjects = (state: { project: ProjectState }) => state.project.projects
export const selectCurrentProject = (state: { project: ProjectState }) => state.project.currentProject
export const selectIsCreating = (state: { project: ProjectState }) => state.project.isCreating
export const selectIsInviting = (state: { project: ProjectState }) => state.project.isInviting
export const selectCreateError = (state: { project: ProjectState }) => state.project.createError
export const selectInviteError = (state: { project: ProjectState }) => state.project.inviteError
export const selectAutoSchedulePreview = (state: { project: ProjectState }) => state.project.autoSchedulePreview
export const selectCurrentUserRole = (state: { project: ProjectState }) => state.project.currentUserRole
export const selectPermissions = (state: { project: ProjectState }) => state.project.permissions
export const selectPendingInvitations = (state: { project: ProjectState }) => state.project.pendingInvitations
export const selectInvitationCooldown = (email: string) => 
  (state: { project: ProjectState }) => state.project.invitationCooldowns[email]