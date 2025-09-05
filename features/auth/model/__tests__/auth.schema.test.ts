import { describe, expect, it } from 'vitest'

import { 
  loginSchema, 
  signupSchema, 
  resetPasswordRequestSchema,
  resetPasswordSchema,
  emailSchema,
  passwordSchema 
} from '../auth.schema'

describe('Auth Schema Validation', () => {
  describe('emailSchema', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'user@example.com',
        'test.user@example.co.kr',
        'admin+test@company.org'
      ]

      validEmails.forEach(email => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com'
      ]

      invalidEmails.forEach(email => {
        const result = emailSchema.safeParse(email)
        expect(result.success).toBe(false)
      })
    })
  })

  describe('passwordSchema', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'Password123!',
        'MyStr0ng@Pass',
        'Secure#Pass1'
      ]

      validPasswords.forEach(password => {
        const result = passwordSchema.safeParse(password)
        expect(result.success).toBe(true)
      })
    })

    it('should reject passwords without uppercase', () => {
      const result = passwordSchema.safeParse('password123!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('대문자')
      }
    })

    it('should reject passwords without lowercase', () => {
      const result = passwordSchema.safeParse('PASSWORD123!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('소문자')
      }
    })

    it('should reject passwords without numbers', () => {
      const result = passwordSchema.safeParse('Password!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('숫자')
      }
    })

    it('should reject passwords without special characters', () => {
      const result = passwordSchema.safeParse('Password123')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('특수문자')
      }
    })

    it('should reject passwords shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Pass1!')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('8자')
      }
    })
  })

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123',
        rememberMe: true
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept login without rememberMe', () => {
      const validData = {
        email: 'user@example.com',
        password: 'password123'
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123'
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty password', () => {
      const invalidData = {
        email: 'user@example.com',
        password: ''
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('signupSchema', () => {
    const validSignupData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      confirmPassword: 'SecurePass123!',
      name: '홍길동',
      companyName: '테스트 회사',
      termsAccepted: true,
      marketingAccepted: false
    }

    it('should accept valid signup data', () => {
      const result = signupSchema.safeParse(validSignupData)
      expect(result.success).toBe(true)
    })

    it('should accept signup without optional fields', () => {
      const minimalData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        name: '홍길동',
        termsAccepted: true
      }

      const result = signupSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        ...validSignupData,
        confirmPassword: 'DifferentPass123!'
      }

      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('일치하지 않습니다')
      }
    })

    it('should reject if terms not accepted', () => {
      const invalidData = {
        ...validSignupData,
        termsAccepted: false
      }

      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('이용약관')
      }
    })

    it('should reject short names', () => {
      const invalidData = {
        ...validSignupData,
        name: '김'
      }

      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('2자')
      }
    })

    it('should reject long company names', () => {
      const invalidData = {
        ...validSignupData,
        companyName: 'a'.repeat(101)
      }

      const result = signupSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('100자')
      }
    })
  })

  describe('resetPasswordRequestSchema', () => {
    it('should accept valid email', () => {
      const result = resetPasswordRequestSchema.safeParse({
        email: 'user@example.com'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const result = resetPasswordRequestSchema.safeParse({
        email: 'notanemail'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('resetPasswordSchema', () => {
    const validResetData = {
      token: 'valid-reset-token-123',
      password: 'NewSecurePass123!',
      confirmPassword: 'NewSecurePass123!'
    }

    it('should accept valid reset password data', () => {
      const result = resetPasswordSchema.safeParse(validResetData)
      expect(result.success).toBe(true)
    })

    it('should reject empty token', () => {
      const invalidData = {
        ...validResetData,
        token: ''
      }

      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject mismatched passwords', () => {
      const invalidData = {
        ...validResetData,
        confirmPassword: 'DifferentPass123!'
      }

      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('일치하지 않습니다')
      }
    })

    it('should reject weak passwords', () => {
      const invalidData = {
        ...validResetData,
        password: 'weak',
        confirmPassword: 'weak'
      }

      const result = resetPasswordSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})