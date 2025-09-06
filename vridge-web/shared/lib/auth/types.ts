/**
 * @fileoverview NextAuth 타입 확장
 * @description 사용자 역할 등 커스텀 타입 정의
 * @author Claude (AI Assistant)
 */

import { DefaultSession, DefaultUser } from 'next-auth'
import { DefaultJWT } from 'next-auth/jwt'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string
      role: string
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    role?: string
  }
}