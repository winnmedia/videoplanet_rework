// Public API for auth feature

// UI Components
export { LoginForm } from './ui/LoginForm'
export { SignupForm } from './ui/SignupFormNew'
export { ResetPasswordForm } from './ui/ResetPasswordFormNew'
export { SocialAuthButtons } from './ui/SocialAuthButtons'

// Legacy UI (for migration)
export { SignupForm as SignupFormLegacy } from './ui/SignupForm'
export { ResetPasswordForm as ResetPasswordFormLegacy } from './ui/ResetPasswordForm'

// Model & Hooks
export { useAuth } from './model/useAuth'
export { authSlice, setCredentials, logout } from './model/authSlice'
export type { default as authReducer } from './model/authSlice'

// Schemas & Types
export {
  loginSchema,
  signupSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  type LoginInput,
  type SignupInput,
  type ResetPasswordRequestInput,
  type ResetPasswordInput,
  type User,
  type AuthResponse,
  type AuthError,
  type SocialProvider
} from './model/auth.schema'