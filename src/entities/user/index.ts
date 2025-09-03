// User Entity Public API
export type { 
  User, 
  UserProfile, 
  UserPreferences, 
  NotificationSettings,
  VideoSettings,
  CreateUserCommand,
  UpdateUserCommand,
  UpdateUserPreferencesCommand,
  UserDomainEvent,
  UserCreatedEvent,
  UserUpdatedEvent,
  UserDeletedEvent
} from './model/types'

export { UserRole } from './model/types'

export { 
  createUser,
  updateUser,
  validateUserEmail,
  validateUserRole,
  isUserActive,
  getUserPermissions
} from './model/user'

export type { UserPermissions } from './model/user'