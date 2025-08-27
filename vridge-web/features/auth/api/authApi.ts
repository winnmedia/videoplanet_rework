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
      // Railway API 에러 처리 개선
      if (error instanceof Error && error.message) {
        // Railway 에러 코드별 사용자 친화적 메시지
        if (error.message.includes('RAILWAY_AUTH_FAILED')) {
          throw new Error('인증에 실패했습니다. 이메일과 비밀번호를 확인해주세요.');
        }
        if (error.message.includes('RAILWAY_CONNECTION_FAILED')) {
          throw new Error('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
        if (error.message.includes('RAILWAY_SERVER_ERROR')) {
          throw new Error('서버 오류가 발생했습니다. 관리자에게 문의해주세요.');
        }
        throw new Error(error.message);
      }
      throw new Error('로그인에 실패했습니다. 네트워크 상태를 확인해주세요.');
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
      // Railway API 에러 처리 개선
      if (error instanceof Error && error.message) {
        if (error.message.includes('RAILWAY_ENDPOINT_NOT_FOUND')) {
          throw new Error('회원가입 서비스를 찾을 수 없습니다. 관리자에게 문의해주세요.');
        }
        if (error.message.includes('RAILWAY_CONNECTION_FAILED')) {
          throw new Error('서버 연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
        }
        if (error.message.includes('이미 존재하는 사용자')) {
          throw new Error('이미 가입된 이메일 주소입니다.');
        }
        throw new Error(error.message);
      }
      throw new Error('회원가입에 실패했습니다. 네트워크 상태를 확인해주세요.');
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