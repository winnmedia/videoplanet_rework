/**
 * @fileoverview NextAuth.js API Route Handler
 * @description App Router용 NextAuth 핸들러
 * @author Claude (AI Assistant)
 */

import NextAuth from 'next-auth'

import { authOptions } from '@/shared/lib/auth'

// NextAuth 핸들러 생성
const handler = NextAuth(authOptions)

// App Router 방식으로 GET, POST 요청 처리
export { handler as GET, handler as POST }