/**
 * @fileoverview NextAuth.js 설정
 * @description FSD 아키텍처 준수 인증 설정
 * @author Claude (AI Assistant)
 */

import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { z } from 'zod'

// 환경변수 검증 스키마
const authEnvSchema = z.object({
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
})

// 환경변수 검증
const env = authEnvSchema.parse({
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
})

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth Provider (선택적)
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // Credentials Provider (임시 구현)
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // TODO(human): 실제 사용자 검증 로직 구현
        // 현재는 하드코딩된 인증이 보안 위험을 초래하므로 개선이 필요합니다.
        // 다음 중 하나를 선택하여 구현해주세요:
        // 1. 환경 변수 기반 임시 인증 (ADMIN_EMAIL, ADMIN_PASSWORD_HASH)
        // 2. 실제 데이터베이스 연동 (PostgreSQL/Django API 호출)
        // 3. bcrypt를 사용한 패스워드 해싱 검증
        // 4. JWT 토큰 검증 시스템

        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // 임시로 비활성화 - 보안 위험 방지
        console.warn('🔒 Authentication is temporarily disabled for security reasons')
        return null
      },
    }),
  ],

  // 세션 설정
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
  },

  // JWT 설정
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30일
  },

  // 커스텀 페이지 (기존 UI 유지)
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/signup',
  },

  // 콜백 함수
  callbacks: {
    async jwt({ token, user }) {
      // 사용자 정보를 JWT에 추가
      if (user) {
        token.role = user.role
      }
      return token
    },

    async session({ session, token }) {
      // 세션에 사용자 역할 추가
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    },
  },

  // 이벤트 핸들러
  events: {
    async signIn({ user, isNewUser }) {
      console.log('🔐 User signed in:', { email: user.email, isNewUser })
    },
    async signOut({ session }) {
      console.log('🚪 User signed out:', { email: session?.user?.email })
    },
  },

  // 보안 설정
  secret: env.NEXTAUTH_SECRET,

  // 디버그 모드 설정 (프로덕션에서는 비활성화)
  debug: process.env.NODE_ENV === 'development' && process.env.NEXTAUTH_DEBUG !== 'false',
}
