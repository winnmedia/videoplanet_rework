import { 
  User, 
  UserRole, 
  CreateUserCommand, 
  UpdateUserCommand,
  UserProfile,
  UserPreferences
} from './types'

// User Domain Logic
export function createUser(command: CreateUserCommand): User {
  const now = new Date()
  const userId = generateUserId()

  const defaultPreferences: UserPreferences = {
    theme: 'system',
    language: 'ko',
    notifications: {
      email: true,
      push: true,
      feedbackReceived: true,
      projectUpdates: true,
      systemMessages: false
    },
    videoSettings: {
      autoplay: false,
      quality: 'auto',
      volume: 0.7,
      playbackSpeed: 1.0
    }
  }

  const defaultProfile: UserProfile = {
    skills: [],
    preferences: defaultPreferences
  }

  return {
    id: userId,
    email: command.email,
    username: command.username,
    displayName: command.displayName,
    role: command.role || UserRole.VIEWER,
    profile: defaultProfile,
    createdAt: now,
    updatedAt: now,
    isActive: true
  }
}

export function updateUser(user: User, command: UpdateUserCommand): User {
  if (user.id !== command.id) {
    throw new Error('User ID mismatch')
  }

  return {
    ...user,
    displayName: command.displayName ?? user.displayName,
    avatar: command.avatar ?? user.avatar,
    profile: command.profile ? { ...user.profile, ...command.profile } : user.profile,
    updatedAt: new Date()
  }
}

export function validateUserEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateUserRole(role: UserRole): boolean {
  return Object.values(UserRole).includes(role)
}

export function isUserActive(user: User): boolean {
  return user.isActive
}

export interface UserPermissions {
  canViewProjects: boolean
  canCreateProjects: boolean
  canDeleteProjects: boolean
  canUploadVideos: boolean
  canManageUsers: boolean
  canModifySystemSettings: boolean
  canGiveFeedback: boolean
  canReceiveFeedback: boolean
}

export function getUserPermissions(user: User): UserPermissions {
  const basePermissions = {
    canViewProjects: true,
    canCreateProjects: false,
    canDeleteProjects: false,
    canUploadVideos: false,
    canManageUsers: false,
    canModifySystemSettings: false,
    canGiveFeedback: false,
    canReceiveFeedback: false
  }

  switch (user.role) {
    case UserRole.ADMIN:
      return {
        ...basePermissions,
        canCreateProjects: true,
        canDeleteProjects: true,
        canUploadVideos: true,
        canManageUsers: true,
        canModifySystemSettings: true,
        canGiveFeedback: true,
        canReceiveFeedback: true
      }

    case UserRole.MANAGER:
      return {
        ...basePermissions,
        canCreateProjects: true,
        canDeleteProjects: true,
        canUploadVideos: true,
        canGiveFeedback: true,
        canReceiveFeedback: true
      }

    case UserRole.CREATOR:
      return {
        ...basePermissions,
        canCreateProjects: true,
        canUploadVideos: true,
        canReceiveFeedback: true
      }

    case UserRole.REVIEWER:
      return {
        ...basePermissions,
        canGiveFeedback: true
      }

    case UserRole.VIEWER:
    default:
      return basePermissions
  }
}

// Helper functions
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}