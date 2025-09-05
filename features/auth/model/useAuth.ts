'use client'

import { signIn, signOut, useSession } from 'next-auth/react'

import { useAppDispatch, useAppSelector } from '@/shared/lib/redux/hooks'

import { setCredentials, logout as logoutAction } from './authSlice'
import { authApi } from '../api/authApi'

export function useAuth() {
  const dispatch = useAppDispatch()
  const { data: session, status } = useSession()
  const user = useAppSelector(state => state.auth.user) || session?.user
  const isAuthenticated = status === 'authenticated'
  
  const login = async (email: string, password: string) => {
    try {
      // NextAuth Credentials provider로 로그인 시도
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      
      if (result?.ok) {
        // 성공 시 Redux 상태도 업데이트 (필요한 경우)
        if (session?.user) {
          dispatch(setCredentials({
            user: session.user,
            token: 'nextauth-session', // NextAuth가 세션 관리
          }))
        }
        return { data: session?.user, success: true }
      } else {
        throw new Error(result?.error || 'Login failed')
      }
    } catch (error) {
      // Fallback: 기존 API 로그인 시도
      const result = await authApi.login(email, password)
      if (result.data) {
        dispatch(setCredentials(result.data))
      }
      return result
    }
  }

  const signup = async (userData: {
    email: string;
    nickname: string;
    password: string;
    auth_number: string;
  }) => {
    const result = await authApi.signup(userData)
    if (result.data) {
      dispatch(setCredentials(result.data))
    }
    return result
  }

  const resetPassword = async (userData: {
    email: string;
    auth_number: string;
    password: string;
  }) => {
    const result = await authApi.resetPassword(userData)
    return result
  }
  
  const logout = async () => {
    // NextAuth 로그아웃
    await signOut({ redirect: false })
    // Redux 상태도 클리어
    dispatch(logoutAction())
  }
  
  return {
    user,
    isAuthenticated,
    login,
    signup,
    resetPassword,
    logout
  }
}