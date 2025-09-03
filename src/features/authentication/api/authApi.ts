import { 
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
  ChangePasswordData,
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  AuthenticatedUser
} from '../model/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// API client with error handling
async function apiClient<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  // Add auth token if available
  const token = localStorage.getItem('auth_token')
  if (token && config.headers) {
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('네트워크 오류가 발생했습니다')
  }
}

// Authentication API functions
export async function loginUser(credentials: LoginCredentials): Promise<LoginResponse> {
  return apiClient<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  })
}

export async function registerUser(userData: RegisterData): Promise<RegisterResponse> {
  return apiClient<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  })
}

export async function refreshToken(token: string): Promise<RefreshTokenResponse> {
  return apiClient<RefreshTokenResponse>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: token })
  })
}

export async function logoutUser(): Promise<{ success: boolean }> {
  return apiClient<{ success: boolean }>('/api/auth/logout', {
    method: 'POST'
  })
}

export async function resetPassword(data: ResetPasswordData): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export async function changePassword(data: ChangePasswordData): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>('/api/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify(data)
  })
}

export async function verifyToken(token: string): Promise<{ valid: boolean; user?: AuthenticatedUser }> {
  return apiClient<{ valid: boolean; user?: AuthenticatedUser }>('/api/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ token })
  })
}

export async function resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
  return apiClient<{ success: boolean; message: string }>('/api/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email })
  })
}