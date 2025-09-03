import { 
  UserRole, 
  CreateUserCommand, 
  UpdateUserCommand
} from './types'
import { 
  createUser, 
  updateUser, 
  validateUserEmail, 
  validateUserRole,
  isUserActive,
  getUserPermissions
} from './user'

describe('User Domain Model', () => {

  const mockCreateUserCommand: CreateUserCommand = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'securePassword123!',
    displayName: '테스트 사용자',
    role: UserRole.CREATOR
  }

  describe('createUser', () => {
    it('유효한 사용자 생성 명령으로 사용자를 생성해야 함', () => {
      const user = createUser(mockCreateUserCommand)

      expect(user.email).toBe('test@example.com')
      expect(user.username).toBe('testuser')
      expect(user.displayName).toBe('테스트 사용자')
      expect(user.role).toBe(UserRole.CREATOR)
      expect(user.isActive).toBe(true)
      expect(user.id).toBeDefined()
      expect(user.createdAt).toBeInstanceOf(Date)
      expect(user.updatedAt).toBeInstanceOf(Date)
    })

    it('기본값으로 사용자를 생성해야 함', () => {
      const minimalCommand: CreateUserCommand = {
        email: 'minimal@example.com',
        username: 'minimal',
        password: 'password123'
      }

      const user = createUser(minimalCommand)

      expect(user.role).toBe(UserRole.VIEWER)
      expect(user.displayName).toBeUndefined()
      expect(user.profile.preferences.theme).toBe('system')
    })
  })

  describe('updateUser', () => {
    it('사용자 정보를 업데이트해야 함', () => {
      const originalUser = createUser(mockCreateUserCommand)
      
      const updateCommand: UpdateUserCommand = {
        id: originalUser.id,
        displayName: '업데이트된 이름',
        profile: {
          bio: '업데이트된 소개'
        }
      }

      const updatedUser = updateUser(originalUser, updateCommand)

      expect(updatedUser.displayName).toBe('업데이트된 이름')
      expect(updatedUser.profile.bio).toBe('업데이트된 소개')
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUser.updatedAt.getTime())
      expect(updatedUser.id).toBe(originalUser.id)
      expect(updatedUser.email).toBe(originalUser.email)
    })
  })

  describe('validateUserEmail', () => {
    it('유효한 이메일 형식을 검증해야 함', () => {
      expect(validateUserEmail('valid@example.com')).toBe(true)
      expect(validateUserEmail('user+tag@domain.co.kr')).toBe(true)
    })

    it('잘못된 이메일 형식을 거부해야 함', () => {
      expect(validateUserEmail('invalid-email')).toBe(false)
      expect(validateUserEmail('@domain.com')).toBe(false)
      expect(validateUserEmail('user@')).toBe(false)
      expect(validateUserEmail('')).toBe(false)
    })
  })

  describe('validateUserRole', () => {
    it('유효한 사용자 역할을 검증해야 함', () => {
      expect(validateUserRole(UserRole.ADMIN)).toBe(true)
      expect(validateUserRole(UserRole.CREATOR)).toBe(true)
      expect(validateUserRole(UserRole.VIEWER)).toBe(true)
    })

    it('잘못된 사용자 역할을 거부해야 함', () => {
      expect(validateUserRole('invalid_role' as UserRole)).toBe(false)
    })
  })

  describe('isUserActive', () => {
    it('활성 사용자를 식별해야 함', () => {
      const activeUser = createUser(mockCreateUserCommand)
      expect(isUserActive(activeUser)).toBe(true)
    })

    it('비활성 사용자를 식별해야 함', () => {
      const user = createUser(mockCreateUserCommand)
      const inactiveUser = { ...user, isActive: false }
      expect(isUserActive(inactiveUser)).toBe(false)
    })
  })

  describe('getUserPermissions', () => {
    it('관리자 권한을 반환해야 함', () => {
      const adminUser = { ...createUser(mockCreateUserCommand), role: UserRole.ADMIN }
      const permissions = getUserPermissions(adminUser)

      expect(permissions.canManageUsers).toBe(true)
      expect(permissions.canDeleteProjects).toBe(true)
      expect(permissions.canModifySystemSettings).toBe(true)
    })

    it('생성자 권한을 반환해야 함', () => {
      const creatorUser = createUser(mockCreateUserCommand)
      const permissions = getUserPermissions(creatorUser)

      expect(permissions.canCreateProjects).toBe(true)
      expect(permissions.canUploadVideos).toBe(true)
      expect(permissions.canManageUsers).toBe(false)
    })

    it('뷰어 권한을 반환해야 함', () => {
      const viewerUser = { 
        ...createUser(mockCreateUserCommand), 
        role: UserRole.VIEWER 
      }
      const permissions = getUserPermissions(viewerUser)

      expect(permissions.canViewProjects).toBe(true)
      expect(permissions.canCreateProjects).toBe(false)
      expect(permissions.canDeleteProjects).toBe(false)
    })
  })
})