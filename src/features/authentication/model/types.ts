// Authentication Feature Types
export interface AuthState {
  isAuthenticated: boolean
  user: AuthenticatedUser | null
  loading: boolean
  error: string | null
  token: string | null
  refreshToken: string | null
}

export interface AuthenticatedUser {
  id: string
  email: string
  username: string
  displayName?: string
  avatar?: string
  role: string
  permissions: string[]
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  email: string
  username: string
  password: string
  confirmPassword: string
  displayName?: string
  acceptTerms: boolean
}

export interface ResetPasswordData {
  email: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface AuthError {
  code: string
  message: string
  field?: string
}

// Auth API Response Types
export interface LoginResponse {
  success: boolean
  data: {
    user: AuthenticatedUser
    tokens: AuthTokens
  }
  error?: AuthError
}

export interface RegisterResponse {
  success: boolean
  data: {
    user: AuthenticatedUser
    message: string
  }
  error?: AuthError
}

export interface RefreshTokenResponse {
  success: boolean
  data: {
    tokens: AuthTokens
  }
  error?: AuthError
}

// Auth Events
export interface AuthLoginEvent {
  type: 'AUTH_LOGIN'
  payload: AuthenticatedUser
  timestamp: Date
}

export interface AuthLogoutEvent {
  type: 'AUTH_LOGOUT'
  payload: { userId: string; reason: string }
  timestamp: Date
}

export interface AuthErrorEvent {
  type: 'AUTH_ERROR'
  payload: AuthError
  timestamp: Date
}

export type AuthEvent = AuthLoginEvent | AuthLogoutEvent | AuthErrorEvent