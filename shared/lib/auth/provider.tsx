/**
 * @fileoverview NextAuth Session Provider
 * @description FSD 아키텍처 준수 인증 Provider
 * @author Claude (AI Assistant)
 */

'use client'

import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
}