// Real backend API integration
// TODO: Switch back to Railway URL when deployment is fixed
// const BACKEND_URL = 'https://videoplanet-backend.up.railway.app'
const BACKEND_URL = 'http://localhost:8000' // 임시 로컬 테스트용

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await fetch(`${BACKEND_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 쿠키 포함
      body: JSON.stringify({
        email,
        password
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || '로그인에 실패했습니다.')
    }

    return {
      data: {
        user: {
          id: data.user,
          email: data.user,
          name: data.user,
          role: 'user'
        },
        token: data.vridge_session
      }
    }
  },

  signup: async (userData: {
    email: string;
    nickname: string;
    password: string;
    auth_number: string;
  }) => {
    const response = await fetch(`${BACKEND_URL}/users/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 쿠키 포함
      body: JSON.stringify({
        email: userData.email,
        nickname: userData.nickname,
        password: userData.password
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || '회원가입에 실패했습니다.')
    }

    return {
      data: {
        user: {
          id: data.user,
          email: data.user,
          name: userData.nickname,
          role: 'user'
        },
        token: data.vridge_session
      }
    }
  },

  resetPassword: async (userData: {
    email: string;
    auth_number: string;
    password: string;
  }) => {
    const response = await fetch(`${BACKEND_URL}/users/password_reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 쿠키 포함
      body: JSON.stringify({
        email: userData.email,
        password: userData.password
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || '비밀번호 재설정에 실패했습니다.')
    }

    return {
      data: {
        message: data.message || '비밀번호가 성공적으로 변경되었습니다.'
      }
    }
  },

  sendVerificationCode: async (email: string, type: 'signup' | 'reset' = 'signup') => {
    const endpoint = type === 'signup' ? '/users/send_authnumber/signup' : '/users/send_authnumber/reset'
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || '인증번호 발송에 실패했습니다.')
    }

    return { data }
  },

  verifyEmail: async (email: string, authNumber: string, type: 'signup' | 'reset' = 'signup') => {
    const endpoint = type === 'signup' ? '/users/signup_emailauth/signup' : '/users/signup_emailauth/reset'
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        auth_number: parseInt(authNumber)
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.message || '인증번호 확인에 실패했습니다.')
    }

    return { data }
  }
}