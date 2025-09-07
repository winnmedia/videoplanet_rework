import { httpClient } from '@/shared/api'

interface LoginResponse {
  user: string
  vridge_session: string
  message?: string
}

interface SignupResponse {
  user: string
  vridge_session: string
  message?: string
}

interface VerificationResponse {
  message: string
}

export const authApi = {
  login: async (email: string, password: string) => {
    try {
      const response = await httpClient.post<LoginResponse>('/users/login', {
        email,
        password,
      })

      return {
        data: {
          user: {
            id: response.data.user,
            email: response.data.user,
            name: response.data.user,
            role: 'user',
          },
          token: response.data.vridge_session,
        },
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message)
      }
      throw new Error('로그인에 실패했습니다.')
    }
  },

  signup: async (userData: { email: string; nickname: string; password: string; auth_number: string }) => {
    const response = await httpClient.post<SignupResponse>('/users/signup', {
      email: userData.email,
      nickname: userData.nickname,
      password: userData.password,
    })

    return {
      data: {
        user: {
          id: response.data.user,
          email: response.data.user,
          name: userData.nickname,
          role: 'user',
        },
        token: response.data.vridge_session,
      },
    }
  },

  resetPassword: async (userData: { email: string; auth_number: string; password: string }) => {
    const response = await httpClient.post<VerificationResponse>('/users/password_reset', {
      email: userData.email,
      password: userData.password,
    })

    return {
      data: {
        message: response.data.message || '비밀번호가 성공적으로 변경되었습니다.',
      },
    }
  },

  sendVerificationCode: async (email: string, type: 'signup' | 'reset' = 'signup') => {
    const endpoint = type === 'signup' ? '/users/send_authnumber/signup' : '/users/send_authnumber/reset'
    const response = await httpClient.post<VerificationResponse>(endpoint, { email })
    return { data: response.data }
  },

  verifyEmail: async (email: string, authNumber: string, type: 'signup' | 'reset' = 'signup') => {
    const endpoint = type === 'signup' ? '/users/signup_emailauth/signup' : '/users/signup_emailauth/reset'
    const response = await httpClient.post<VerificationResponse>(endpoint, {
      email,
      auth_number: parseInt(authNumber),
    })
    return { data: response.data }
  },
}
