/**
 * @fileoverview FSD Auth shared library Public API
 * @description 인증 관련 공용 설정의 단일 진입점
 * @author Claude (AI Assistant)
 */

// NextAuth configuration
export { authOptions } from './config'

// NextAuth provider
export { AuthProvider } from './provider'

// Types (extend NextAuth types)
import './types'
export type { Session } from 'next-auth'
export type { JWT } from 'next-auth/jwt'