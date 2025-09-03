// Authentication Feature Public API

// Types
export type {
  AuthState,
  AuthenticatedUser,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
  ChangePasswordData,
  AuthTokens,
  AuthError,
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  AuthEvent,
  AuthLoginEvent,
  AuthLogoutEvent,
  AuthErrorEvent
} from './model/types'

// Redux Slice
export {
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  logout,
  refreshTokenStart,
  refreshTokenSuccess,
  refreshTokenFailure,
  clearError,
  updateUser,
  selectAuth,
  selectIsAuthenticated,
  selectCurrentUser,
  selectAuthLoading,
  selectAuthError,
  selectAuthToken
} from './model/authSlice'

export { default as authReducer } from './model/authSlice'

// API Functions
export {
  loginUser,
  registerUser,
  refreshToken as refreshAuthToken,
  logoutUser,
  resetPassword,
  changePassword,
  verifyToken,
  resendVerificationEmail
} from './api/authApi'