/**
 * Core Functionality Integration Tests
 * Tests the critical user flows end-to-end
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

import { authApi } from '@/features/auth/api/authApi'

describe('VLANET Core Functionality', () => {
  
  describe('Authentication System', () => {
    
    it('should send verification code successfully', async () => {
      const result = await authApi.sendVerificationCode('test@vlanet.net', 'signup')
      expect(result.data).toHaveProperty('message')
    }, 10000)
    
    it('should verify email with correct code', async () => {
      // First send verification code
      await authApi.sendVerificationCode('verify@vlanet.net', 'signup')
      
      // Then verify with test code (123456 is accepted by backend)
      const result = await authApi.verifyEmail('verify@vlanet.net', '123456', 'signup')
      expect(result.data).toHaveProperty('message')
    }, 10000)
    
    it('should register new user successfully', async () => {
      const userData = {
        email: 'newuser@vlanet.net',
        nickname: '신규사용자',
        password: 'newuser123',
        auth_number: '123456'
      }
      
      const result = await authApi.signup(userData)
      expect(result.data.user).toHaveProperty('email')
      expect(result.data).toHaveProperty('token')
    }, 10000)
    
    it('should login existing user successfully', async () => {
      // Use the user we just created
      const result = await authApi.login('test@vlanet.net', 'test123456')
      expect(result.data.user).toHaveProperty('email')
      expect(result.data).toHaveProperty('token')
    }, 10000)
    
  })
  
  describe('Backend API Health', () => {
    
    it('should connect to backend health endpoint', async () => {
      const response = await fetch('https://videoplanet.up.railway.app/health/')
      expect(response.status).toBe(200)
      
      const health = await response.json()
      expect(health).toHaveProperty('status', 'healthy')
      expect(health.checks.database.status).toBe('ok')
    }, 10000)
    
  })
  
  describe('Environment Configuration', () => {
    
    it('should have correct API URL configuration', () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL
      expect(apiUrl).toBeDefined()
      expect(apiUrl).toContain('videoplanet.up.railway.app')
    })
    
    it('should have NextAuth secret configured', () => {
      const secret = process.env.NEXTAUTH_SECRET
      expect(secret).toBeDefined()
      expect(secret!.length).toBeGreaterThanOrEqual(32)
    })
    
  })
  
  describe('Component Rendering', () => {
    
    it('should load critical components without errors', async () => {
      // Test that core modules can be imported
      const { authApi: importedAuthApi } = await import('@/features/auth/api/authApi')
      expect(importedAuthApi).toBeDefined()
      
      const { api } = await import('@/lib/api/client')
      expect(api).toBeDefined()
    })
    
  })
  
})