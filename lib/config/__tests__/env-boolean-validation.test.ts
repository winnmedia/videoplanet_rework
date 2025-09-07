/**
 * Environment Variables Boolean Validation Tests
 *
 * Vercel 환경변수 호환성 및 boolean 변환 로직 테스트
 */

import { validateEnvVars, PublicEnvSchema } from '../env-schema'

describe('Environment Variables Boolean Validation', () => {
  // Vercel과 유사한 다양한 boolean 입력값들
  const testCases = [
    // String boolean values
    { input: 'true', expected: true, description: 'string "true"' },
    { input: 'false', expected: false, description: 'string "false"' },
    { input: 'TRUE', expected: true, description: 'uppercase "TRUE"' },
    { input: 'False', expected: false, description: 'mixed case "False"' },

    // Numeric boolean values
    { input: '1', expected: true, description: 'string "1"' },
    { input: '0', expected: false, description: 'string "0"' },
    { input: 1, expected: true, description: 'number 1' },
    { input: 0, expected: false, description: 'number 0' },

    // Alternative boolean representations
    { input: 'yes', expected: true, description: 'string "yes"' },
    { input: 'no', expected: false, description: 'string "no"' },
    { input: 'on', expected: true, description: 'string "on"' },
    { input: 'off', expected: false, description: 'string "off"' },
    { input: 'enable', expected: true, description: 'string "enable"' },
    { input: 'disable', expected: false, description: 'string "disable"' },
    { input: 'enabled', expected: true, description: 'string "enabled"' },
    { input: 'disabled', expected: false, description: 'string "disabled"' },

    // Native boolean values
    { input: true, expected: true, description: 'native boolean true' },
    { input: false, expected: false, description: 'native boolean false' },

    // Edge cases
    { input: '', expected: false, description: 'empty string' },
    { input: null, expected: false, description: 'null value' },
    { input: undefined, expected: false, description: 'undefined value' },
    { input: 'unknown', expected: false, description: 'unknown string value' },
    { input: '2', expected: false, description: 'string "2" (invalid boolean)' },
  ]

  describe('Boolean from String Transformation', () => {
    testCases.forEach(({ input, expected, description }) => {
      it(`should transform ${description} to ${expected}`, () => {
        const testEnv = {
          NODE_ENV: 'test',
          NEXT_PUBLIC_APP_ENV: 'test',
          NEXT_PUBLIC_APP_NAME: 'Test App',
          NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
          NEXT_PUBLIC_API_URL: 'http://localhost:8000',
          NEXT_PUBLIC_BACKEND_URL: 'http://localhost:8000',
          NEXT_PUBLIC_WS_URL: 'ws://localhost:8000/ws',
          NEXT_PUBLIC_AUTH_PROVIDER: 'credentials',
          NEXT_PUBLIC_ENABLE_ANALYTICS: input,
          NEXT_PUBLIC_SKIP_ENV_VALIDATION: 'false', // Force validation
        }

        const result = validateEnvVars(testEnv, false)
        expect(result.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(expected)
      })
    })
  })

  describe('Multiple Boolean Fields Validation', () => {
    it('should handle all boolean fields correctly with mixed input types', () => {
      const testEnv = {
        NODE_ENV: 'test',
        NEXT_PUBLIC_APP_ENV: 'test',
        NEXT_PUBLIC_APP_NAME: 'Test App',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NEXT_PUBLIC_API_URL: 'http://localhost:8000',
        NEXT_PUBLIC_BACKEND_URL: 'http://localhost:8000',
        NEXT_PUBLIC_WS_URL: 'ws://localhost:8000/ws',
        NEXT_PUBLIC_AUTH_PROVIDER: 'credentials',
        // Mix different boolean input types like Vercel might send
        NEXT_PUBLIC_ENABLE_ANALYTICS: true, // native boolean
        NEXT_PUBLIC_ENABLE_DEBUG: 'true', // string boolean
        NEXT_PUBLIC_ENABLE_MAINTENANCE: 'false', // string boolean
        NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: '1', // numeric string
        NEXT_PUBLIC_SKIP_ENV_VALIDATION: 'false',
      }

      const result = validateEnvVars(testEnv, false)

      expect(result.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(true)
      expect(result.NEXT_PUBLIC_ENABLE_DEBUG).toBe(true)
      expect(result.NEXT_PUBLIC_ENABLE_MAINTENANCE).toBe(false)
      expect(result.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING).toBe(true)
    })
  })

  describe('Public Schema Direct Testing', () => {
    it('should validate boolean fields through PublicEnvSchema directly', () => {
      const testData = {
        NEXT_PUBLIC_APP_ENV: 'test',
        NEXT_PUBLIC_APP_NAME: 'Test App',
        NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
        NEXT_PUBLIC_API_URL: 'http://localhost:8000',
        NEXT_PUBLIC_BACKEND_URL: 'http://localhost:8000',
        NEXT_PUBLIC_WS_URL: 'ws://localhost:8000/ws',
        NEXT_PUBLIC_AUTH_PROVIDER: 'credentials',
        NEXT_PUBLIC_ENABLE_ANALYTICS: 'yes', // Alternative boolean
        NEXT_PUBLIC_ENABLE_DEBUG: 'on', // Alternative boolean
        NEXT_PUBLIC_ENABLE_MAINTENANCE: 'disabled', // Alternative boolean
        NEXT_PUBLIC_SKIP_ENV_VALIDATION: false,
      }

      const result = PublicEnvSchema.safeParse(testData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(true)
        expect(result.data.NEXT_PUBLIC_ENABLE_DEBUG).toBe(true)
        expect(result.data.NEXT_PUBLIC_ENABLE_MAINTENANCE).toBe(false)
        expect(result.data.NEXT_PUBLIC_SKIP_ENV_VALIDATION).toBe(false)
      }
    })
  })

  describe('Skip Validation Flag', () => {
    it('should respect NEXT_PUBLIC_SKIP_ENV_VALIDATION flag', () => {
      const testEnv = {
        NEXT_PUBLIC_SKIP_ENV_VALIDATION: 'true',
        // Intentionally invalid data to test skip
        NEXT_PUBLIC_APP_URL: 'invalid-url',
      }

      const result = validateEnvVars(testEnv, false)

      // Should return the raw env without throwing when validation is skipped
      expect(result).toBeDefined()
    })

    it('should respect legacy SKIP_ENV_VALIDATION flag', () => {
      const testEnv = {
        SKIP_ENV_VALIDATION: 'true',
        // Intentionally invalid data to test skip
        NEXT_PUBLIC_APP_URL: 'invalid-url',
      }

      const result = validateEnvVars(testEnv, false)

      // Should return the raw env without throwing when validation is skipped
      expect(result).toBeDefined()
    })
  })

  describe('Production-like Scenarios', () => {
    it('should handle Vercel production environment variables', () => {
      // Simulate Vercel's environment variable format with all required production fields
      const vercelLikeEnv = {
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: 'production',
        NEXT_PUBLIC_APP_NAME: 'VRidge Production',
        NEXT_PUBLIC_APP_URL: 'https://www.vlanet.net',
        NEXT_PUBLIC_API_URL: 'https://videoplanet.up.railway.app',
        NEXT_PUBLIC_BACKEND_URL: 'https://videoplanet.up.railway.app',
        NEXT_PUBLIC_WS_URL: 'wss://videoplanet.up.railway.app/ws',
        NEXT_PUBLIC_AUTH_PROVIDER: 'credentials',
        // Required production fields
        NEXTAUTH_SECRET: 'super-secret-key-for-production-environment-very-long',
        DATABASE_URL: 'postgresql://user:password@host:5432/database',
        // Vercel typically sends these as strings
        NEXT_PUBLIC_ENABLE_ANALYTICS: 'false',
        NEXT_PUBLIC_ENABLE_DEBUG: 'false',
        NEXT_PUBLIC_ENABLE_MAINTENANCE: 'false',
        NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: 'true',
        NEXT_PUBLIC_SKIP_ENV_VALIDATION: 'false',
      }

      const result = validateEnvVars(vercelLikeEnv, false)

      expect(result.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(false)
      expect(result.NEXT_PUBLIC_ENABLE_DEBUG).toBe(false)
      expect(result.NEXT_PUBLIC_ENABLE_MAINTENANCE).toBe(false)
      expect(result.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING).toBe(true)
      expect(result.NEXT_PUBLIC_APP_ENV).toBe('production')
    })

    it('should handle staging environment variables', () => {
      // Test staging environment with string booleans
      const stagingEnv = {
        NODE_ENV: 'staging',
        NEXT_PUBLIC_APP_ENV: 'staging',
        NEXT_PUBLIC_APP_NAME: 'VRidge Staging',
        NEXT_PUBLIC_APP_URL: 'https://staging.vlanet.net',
        NEXT_PUBLIC_API_URL: 'https://videoplanet.up.railway.app',
        NEXT_PUBLIC_BACKEND_URL: 'https://videoplanet.up.railway.app',
        NEXT_PUBLIC_WS_URL: 'wss://videoplanet.up.railway.app/ws',
        NEXT_PUBLIC_AUTH_PROVIDER: 'credentials',
        // String boolean values like Vercel might send
        NEXT_PUBLIC_ENABLE_ANALYTICS: 'true',
        NEXT_PUBLIC_ENABLE_DEBUG: 'true',
        NEXT_PUBLIC_ENABLE_MAINTENANCE: 'false',
        NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: '1',
        NEXT_PUBLIC_SKIP_ENV_VALIDATION: '0',
      }

      const result = validateEnvVars(stagingEnv, false)

      expect(result.NEXT_PUBLIC_ENABLE_ANALYTICS).toBe(true)
      expect(result.NEXT_PUBLIC_ENABLE_DEBUG).toBe(true)
      expect(result.NEXT_PUBLIC_ENABLE_MAINTENANCE).toBe(false)
      expect(result.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING).toBe(true)
      expect(result.NEXT_PUBLIC_SKIP_ENV_VALIDATION).toBe(false)
    })
  })
})
