import { 
  loginUser, 
  registerUser, 
  refreshToken, 
  logoutUser, 
  resetPassword,
  changePassword 
} from './authApi'
import { 
  LoginCredentials, 
  RegisterData, 
  ChangePasswordData,
  LoginResponse,
  RegisterResponse 
} from '../model/types'

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

beforeEach(() => {
  mockFetch.mockClear()
})

describe.skip('Auth API', () => {
  const mockLoginCredentials: LoginCredentials = {
    email: 'test@example.com',
    password: 'password123',
    rememberMe: true
  }

  const mockRegisterData: RegisterData = {
    email: 'newuser@example.com',
    username: 'newuser',
    password: 'password123',
    confirmPassword: 'password123',
    displayName: '새 사용자',
    acceptTerms: true
  }

  describe('loginUser', () => {
    it('성공적인 로그인 응답을 처리해야 함', async () => {
      const mockResponse: LoginResponse = {
        success: true,
        data: {
          user: {
            id: 'user_123',
            email: 'test@example.com',
            username: 'testuser',
            displayName: '테스트 사용자',
            role: 'user',
            permissions: ['read', 'write']
          },
          tokens: {
            accessToken: 'access_token_123',
            refreshToken: 'refresh_token_123',
            expiresIn: 3600
          }
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await loginUser(mockLoginCredentials)
      
      expect(result.success).toBe(true)
      expect(result.data.user.email).toBe('test@example.com')
      expect(result.data.tokens.accessToken).toBe('access_token_123')
    })

    it('로그인 실패 응답을 처리해야 함', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/auth/login`, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: '이메일 또는 비밀번호가 잘못되었습니다'
            }
          }, { status: 401 })
        })
      )

      await expect(loginUser(mockLoginCredentials)).rejects.toThrow('이메일 또는 비밀번호가 잘못되었습니다')
    })

    it('네트워크 오류를 처리해야 함', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/auth/login`, () => {
          return HttpResponse.error()
        })
      )

      await expect(loginUser(mockLoginCredentials)).rejects.toThrow()
    })
  })

  describe('registerUser', () => {
    it('성공적인 회원가입 응답을 처리해야 함', async () => {
      const mockResponse: RegisterResponse = {
        success: true,
        data: {
          user: {
            id: 'user_456',
            email: 'newuser@example.com',
            username: 'newuser',
            displayName: '새 사용자',
            role: 'user',
            permissions: ['read']
          },
          message: '회원가입이 완료되었습니다. 이메일을 확인해 주세요.'
        }
      }

      server.use(
        http.post(`${API_BASE_URL}/api/auth/register`, () => {
          return HttpResponse.json(mockResponse)
        })
      )

      const result = await registerUser(mockRegisterData)
      
      expect(result.success).toBe(true)
      expect(result.data.user.email).toBe('newuser@example.com')
      expect(result.data.message).toContain('회원가입이 완료되었습니다')
    })

    it('회원가입 실패 응답을 처리해야 함', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/auth/register`, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'EMAIL_ALREADY_EXISTS',
              message: '이미 사용 중인 이메일입니다',
              field: 'email'
            }
          }, { status: 400 })
        })
      )

      await expect(registerUser(mockRegisterData)).rejects.toThrow('이미 사용 중인 이메일입니다')
    })
  })

  describe('refreshToken', () => {
    it('토큰 갱신 응답을 처리해야 함', async () => {
      const mockRefreshToken = 'refresh_token_123'
      
      server.use(
        http.post(`${API_BASE_URL}/api/auth/refresh`, () => {
          return HttpResponse.json({
            success: true,
            data: {
              tokens: {
                accessToken: 'new_access_token',
                refreshToken: 'new_refresh_token',
                expiresIn: 3600
              }
            }
          })
        })
      )

      const result = await refreshToken(mockRefreshToken)
      
      expect(result.success).toBe(true)
      expect(result.data.tokens.accessToken).toBe('new_access_token')
    })

    it('만료된 토큰에 대한 오류를 처리해야 함', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/auth/refresh`, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'TOKEN_EXPIRED',
              message: '토큰이 만료되었습니다'
            }
          }, { status: 401 })
        })
      )

      await expect(refreshToken('expired_token')).rejects.toThrow('토큰이 만료되었습니다')
    })
  })

  describe('logoutUser', () => {
    it('로그아웃 요청을 처리해야 함', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/auth/logout`, () => {
          return HttpResponse.json({ success: true })
        })
      )

      const result = await logoutUser()
      expect(result.success).toBe(true)
    })
  })

  describe('resetPassword', () => {
    it('비밀번호 재설정 요청을 처리해야 함', async () => {
      server.use(
        http.post(`${API_BASE_URL}/api/auth/reset-password`, () => {
          return HttpResponse.json({
            success: true,
            message: '비밀번호 재설정 이메일이 발송되었습니다'
          })
        })
      )

      const result = await resetPassword({ email: 'test@example.com' })
      expect(result.success).toBe(true)
      expect(result.message).toContain('이메일이 발송되었습니다')
    })
  })

  describe('changePassword', () => {
    it('비밀번호 변경 요청을 처리해야 함', async () => {
      const changePasswordData: ChangePasswordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123'
      }

      server.use(
        http.put(`${API_BASE_URL}/api/auth/change-password`, () => {
          return HttpResponse.json({
            success: true,
            message: '비밀번호가 변경되었습니다'
          })
        })
      )

      const result = await changePassword(changePasswordData)
      expect(result.success).toBe(true)
      expect(result.message).toContain('비밀번호가 변경되었습니다')
    })

    it('잘못된 현재 비밀번호에 대한 오류를 처리해야 함', async () => {
      const changePasswordData: ChangePasswordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123'
      }

      server.use(
        http.put(`${API_BASE_URL}/api/auth/change-password`, () => {
          return HttpResponse.json({
            success: false,
            error: {
              code: 'INVALID_CURRENT_PASSWORD',
              message: '현재 비밀번호가 올바르지 않습니다',
              field: 'currentPassword'
            }
          }, { status: 400 })
        })
      )

      await expect(changePassword(changePasswordData)).rejects.toThrow('현재 비밀번호가 올바르지 않습니다')
    })
  })
})