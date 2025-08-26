'use client'

import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks'
import { authApi } from '../api/authApi'
import { setCredentials, logout as logoutAction } from './authSlice'

export function useAuth() {
  const dispatch = useAppDispatch()
  const user = useAppSelector(state => state.auth.user)
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated)
  
  const login = async (email: string, password: string) => {
    const result = await authApi.login(email, password)
    if (result.data) {
      dispatch(setCredentials(result.data))
    }
    return result
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
  
  const logout = () => {
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