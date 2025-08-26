// Mock auth API for now
export const authApi = {
  login: async (email: string, password: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (email === 'test@example.com' && password === 'password') {
      return {
        data: {
          user: {
            id: '1',
            email: email,
            name: 'Test User',
            role: 'admin'
          },
          token: 'mock-jwt-token'
        }
      }
    }
    
    throw new Error('Invalid credentials')
  },

  signup: async (userData: {
    email: string;
    nickname: string;
    password: string;
    auth_number: string;
  }) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock successful signup
    return {
      data: {
        user: {
          id: Date.now().toString(),
          email: userData.email,
          name: userData.nickname,
          role: 'user'
        },
        token: 'mock-jwt-token-' + Date.now()
      }
    }
  },

  resetPassword: async (userData: {
    email: string;
    auth_number: string;
    password: string;
  }) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // Mock successful password reset
    return {
      data: {
        message: '비밀번호가 성공적으로 변경되었습니다.'
      }
    }
  }
}