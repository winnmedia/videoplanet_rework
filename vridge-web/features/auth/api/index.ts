// FSD Architecture: Public API for auth feature
// Only expose what other layers need to import

export { authApi } from './authApi'
export type { LoginResponse, SignupResponse, VerificationResponse } from './authApi'
