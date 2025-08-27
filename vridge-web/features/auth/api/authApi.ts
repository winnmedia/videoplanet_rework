import { api } from '@/lib/api/client';

interface LoginResponse {
  user: string;
  vridge_session: string;
  message?: string;
}

interface SignupResponse {
  user: string;
  vridge_session: string;
  message?: string;
}

interface VerificationResponse {
  message: string;
}

export const authApi = {
  login: async (email: string, password: string) => {
    try {
      const response = await api.post<LoginResponse>('/users/login', {
        email,
        password
      }, { withAuth: true });

      return {
        data: {
          user: {
            id: response.data.user,
            email: response.data.user,
            name: response.data.user,
            role: 'user'
          },
          token: response.data.vridge_session
        }
      }
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : '로그인에 실패했습니다.')
    }
  },

  signup: async (userData: {
    email: string;
    nickname: string;
    password: string;
    auth_number: string;
  }) => {
    try {
      const response = await api.post<SignupResponse>('/users/signup', {
        email: userData.email,
        nickname: userData.nickname,
        password: userData.password
      }, { withAuth: true });

      return {
        data: {
          user: {
            id: response.data.user,
            email: response.data.user,
            name: userData.nickname,
            role: 'user'
          },
          token: response.data.vridge_session
        }
      }
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : '회원가입에 실패했습니다.')
    }
  },

  resetPassword: async (userData: {
    email: string;
    auth_number: string;
    password: string;
  }) => {
    try {
      const response = await api.post<VerificationResponse>('/users/password_reset', {
        email: userData.email,
        password: userData.password
      }, { withAuth: true });

      return {
        data: {
          message: response.data.message || '비밀번호가 성공적으로 변경되었습니다.'
        }
      }
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : '비밀번호 재설정에 실패했습니다.')
    }
  },

  sendVerificationCode: async (email: string, type: 'signup' | 'reset' = 'signup') => {
    try {
      const endpoint = type === 'signup' ? '/users/send_authnumber/signup' : '/users/send_authnumber/reset'
      const response = await api.post<VerificationResponse>(endpoint, { email });
      return { data: response.data }
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : '인증번호 발송에 실패했습니다.')
    }
  },

  verifyEmail: async (email: string, authNumber: string, type: 'signup' | 'reset' = 'signup') => {
    try {
      const endpoint = type === 'signup' ? '/users/signup_emailauth/signup' : '/users/signup_emailauth/reset'
      const response = await api.post<VerificationResponse>(endpoint, {
        email,
        auth_number: parseInt(authNumber)
      });
      return { data: response.data }
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : '인증번호 확인에 실패했습니다.')
    }
  }
}