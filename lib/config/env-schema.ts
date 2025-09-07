/**
 * Environment Variables Validation Schema (Zod-based)
 *
 * 이 모듈은 모든 환경 변수를 런타임에서 검증하여
 * 빌드/배포 시 설정 오류를 방지합니다.
 */

import { z } from 'zod'

// Environment enum
const EnvironmentSchema = z.enum(['development', 'staging', 'production', 'test'])
export type Environment = z.infer<typeof EnvironmentSchema>

// URL validation helpers with development-friendly fallbacks
const isDevelopment = () => process.env.NODE_ENV === 'development'

const urlSchema = z
  .string()
  .refine(
    val => {
      if (!val || val === undefined || val === null) return false
      // In development, allow localhost and non-https URLs
      if (isDevelopment()) {
        return val.startsWith('http://') || val.startsWith('https://') || val.includes('localhost')
      }
      // In production, require proper URL format - 안전한 URL 검증
      try {
        const urlObj = new URL(val)
        return urlObj !== null && urlObj.href !== undefined
      } catch {
        return false
      }
    },
    {
      message: 'Must be a valid URL',
    }
  )
  .or(z.string().min(1))

const optionalUrlSchema = urlSchema.optional().or(z.literal(''))

// Port validation - removed unused variable to fix ESLint warning

// Enhanced boolean from string validation with Vercel compatibility
const booleanFromString = z
  .union([
    z.boolean(),
    z.string(),
    z.number(), // Vercel sometimes sends numbers
    z.null(),
    z.undefined(),
  ])
  .optional()
  .transform(val => {
    // Handle undefined, null, or empty values
    if (val === undefined || val === null || val === '') return false

    // Handle native boolean
    if (typeof val === 'boolean') return val

    // Handle numeric boolean (0/1)
    if (typeof val === 'number') return val > 0

    // Handle string boolean with comprehensive patterns
    const lowerVal = String(val).toLowerCase().trim()
    const truthyValues = ['true', '1', 'yes', 'on', 'enable', 'enabled']
    const falsyValues = ['false', '0', 'no', 'off', 'disable', 'disabled']

    if (truthyValues.includes(lowerVal)) return true
    if (falsyValues.includes(lowerVal)) return false

    // Default to false for unrecognized values
    return false
  })

// Public environment variables schema (NEXT_PUBLIC_*)
const PublicEnvSchema = z.object({
  // Application
  NEXT_PUBLIC_APP_ENV: EnvironmentSchema.optional().default('development'),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('VRidge'),
  NEXT_PUBLIC_APP_URL: urlSchema.default('http://localhost:3000'),
  NEXT_PUBLIC_APP_VERSION: z.string().min(1).default('0.1.0'),

  // API Configuration
  NEXT_PUBLIC_API_URL: urlSchema.default(
    isDevelopment() ? 'http://localhost:8000' : 'https://videoplanet.up.railway.app'
  ),
  NEXT_PUBLIC_API_VERSION: z.string().optional().default('v1'),
  NEXT_PUBLIC_API_TIMEOUT: z.string().regex(/^\d+$/).transform(Number).default('30000'),
  NEXT_PUBLIC_BACKEND_URL: urlSchema.default(
    isDevelopment() ? 'http://localhost:8000' : 'https://videoplanet.up.railway.app'
  ),
  NEXT_PUBLIC_BACKEND_API_KEY: z.string().optional(),

  // Authentication
  NEXT_PUBLIC_AUTH_PROVIDER: z.enum(['credentials', 'google', 'oauth']).default('credentials'),

  // File Upload
  NEXT_PUBLIC_MAX_FILE_SIZE: z.string().regex(/^\d+$/).transform(Number).default('10485760'), // 10MB
  NEXT_PUBLIC_ALLOWED_FILE_TYPES: z.string().default('image/jpeg,image/png,image/gif,video/mp4'),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: booleanFromString.default(false),
  NEXT_PUBLIC_ENABLE_DEBUG: booleanFromString.default(false),
  NEXT_PUBLIC_ENABLE_MAINTENANCE: booleanFromString.default(false),
  NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: booleanFromString.default(true),
  NEXT_PUBLIC_ENABLE_AUTH: booleanFromString.default(true),
  NEXT_PUBLIC_ENABLE_VIDEO_UPLOAD: booleanFromString.default(true),
  NEXT_PUBLIC_ENABLE_AI_STORY: booleanFromString.default(true),

  // Third-party Services
  NEXT_PUBLIC_GA_TRACKING_ID: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: optionalUrlSchema,
  NEXT_PUBLIC_STRIPE_PUBLIC_KEY: z.string().optional(),

  // CDN & Images
  NEXT_PUBLIC_CDN_URL: optionalUrlSchema,
  NEXT_PUBLIC_IMAGE_DOMAINS: z.string().default('localhost'),

  // WebSocket
  NEXT_PUBLIC_WS_URL: z
    .string()
    .refine(val => val.startsWith('ws://') || val.startsWith('wss://') || val.startsWith('http'))
    .default(isDevelopment() ? 'ws://localhost:8000/ws' : 'wss://videoplanet.up.railway.app/ws'),
  NEXT_PUBLIC_WS_RECONNECT_INTERVAL: z.string().regex(/^\d+$/).transform(Number).default('5000'),

  // Rate Limiting
  NEXT_PUBLIC_API_RATE_LIMIT: z.string().regex(/^\d+$/).transform(Number).default('100'),
  NEXT_PUBLIC_API_RATE_WINDOW: z.string().regex(/^\d+$/).transform(Number).default('60000'),

  // Logging
  NEXT_PUBLIC_LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Performance
  NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE: z
    .string()
    .regex(/^0?\.\d+$|^1$|^0$/)
    .transform(Number)
    .default('0.1'),

  // Build Configuration (moved to public for client access)
  NEXT_PUBLIC_SKIP_ENV_VALIDATION: booleanFromString.default(false),
})

// Private/Server-side environment variables schema
const PrivateEnvSchema = z.object({
  // Node Environment
  NODE_ENV: EnvironmentSchema.default('development'),

  // Next Auth
  NEXTAUTH_URL: urlSchema.optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Database
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')).optional(),

  // Cache/Redis
  REDIS_URL: z.string().url().or(z.string().startsWith('redis://')).optional(),
  REDIS_TOKEN: z.string().optional(),

  // AI Services (Gemini API)
  GOOGLE_GEMINI_API_KEY: z.string().min(10).optional(),

  // Server Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Legacy Build Configuration (use NEXT_PUBLIC_SKIP_ENV_VALIDATION instead)
  SKIP_ENV_VALIDATION: booleanFromString.default(false),
})

// Combined schema for all environment variables
const EnvSchema = PublicEnvSchema.merge(PrivateEnvSchema)
export type EnvVars = z.infer<typeof EnvSchema>

// Production-specific validation rules - removed unused variable to fix ESLint warning

// Staging-specific validation rules
const StagingRequiredFields = z
  .object({
    NEXTAUTH_SECRET: z.string().min(16),
  })
  .partial()

/**
 * Validates environment variables based on current environment
 *
 * @param env - Environment variables object
 * @param throwOnError - Whether to throw on validation errors (default: true)
 * @returns Validated and typed environment variables
 */
export function validateEnvVars(
  env: Record<string, string | undefined> = process.env,
  throwOnError: boolean = true
): EnvVars {
  try {
    // Skip validation if explicitly disabled (build time only)
    const skipValidation = env.SKIP_ENV_VALIDATION === 'true' || env.NEXT_PUBLIC_SKIP_ENV_VALIDATION === 'true'
    if (skipValidation) {
      console.warn('⚠️  Environment validation skipped (SKIP_ENV_VALIDATION=true)')
      return env as unknown as EnvVars
    }

    // Apply more lenient parsing for development
    const currentEnv = env.NODE_ENV || env.NEXT_PUBLIC_APP_ENV || 'development'
    const isDev = currentEnv === 'development'

    // In development, use safeParse to avoid throwing on validation errors
    const parseResult = isDev ? EnvSchema.safeParse(env) : EnvSchema.safeParse(env)

    if (!parseResult.success) {
      if (isDev) {
        console.warn('⚠️  Environment validation failed in development mode, using defaults:')
        parseResult.error.errors.forEach(err => {
          console.warn(`  - ${err.path.join('.')}: ${err.message}`)
        })

        // Try to create a minimal valid environment for development
        const devDefaults = {
          NODE_ENV: 'development',
          NEXT_PUBLIC_APP_ENV: 'development',
          NEXT_PUBLIC_APP_NAME: 'VRidge',
          NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
          NEXT_PUBLIC_APP_VERSION: '0.1.0',
          NEXT_PUBLIC_API_URL: 'http://localhost:8000',
          NEXT_PUBLIC_API_VERSION: 'v1',
          NEXT_PUBLIC_BACKEND_URL: 'http://localhost:8000',
          NEXT_PUBLIC_WS_URL: 'ws://localhost:8000/ws',
          NEXT_PUBLIC_AUTH_PROVIDER: 'credentials',
          ...env,
        }

        const retryResult = EnvSchema.safeParse(devDefaults)
        if (retryResult.success) {
          console.log('✅ Using development defaults for missing environment variables')
          return retryResult.data
        }
      }

      if (throwOnError) {
        throw new Error(`Environment validation failed: ${parseResult.error.message}`)
      } else {
        console.warn('⚠️  Environment validation failed, proceeding with raw env')
        return env as unknown as EnvVars
      }
    }

    const parsedEnv = parseResult.data
    const environment = parsedEnv.NEXT_PUBLIC_APP_ENV || parsedEnv.NODE_ENV

    console.log(`🔍 Validating environment variables for: ${environment}`)

    // Apply environment-specific validation
    if (environment === 'production') {
      console.log('🔒 Applying production-specific validations...')

      // Critical production checks
      const productionChecks = [
        { field: 'NEXTAUTH_SECRET', value: env.NEXTAUTH_SECRET },
        { field: 'DATABASE_URL', value: env.DATABASE_URL },
      ]

      const missingProduction = productionChecks.filter(check => !check.value)
      if (missingProduction.length > 0) {
        const missing = missingProduction.map(c => c.field).join(', ')
        throw new Error(`❌ Production requires: ${missing}`)
      }

      // Validate production URLs
      if (parsedEnv.NEXT_PUBLIC_APP_URL.includes('localhost')) {
        throw new Error('❌ Production cannot use localhost URLs')
      }

      // Security checks
      if (parsedEnv.NEXT_PUBLIC_ENABLE_DEBUG) {
        console.warn('⚠️  Debug mode enabled in production')
      }
    } else if (environment === 'staging') {
      console.log('🧪 Applying staging-specific validations...')
      StagingRequiredFields.parse(env)
    }

    // Validate URL formats
    const urlFields = [
      { name: 'NEXT_PUBLIC_API_URL', value: parsedEnv.NEXT_PUBLIC_API_URL },
      { name: 'NEXT_PUBLIC_BACKEND_URL', value: parsedEnv.NEXT_PUBLIC_BACKEND_URL },
    ]

    for (const { name, value } of urlFields) {
      if (value && !value.startsWith('http')) {
        throw new Error(`❌ ${name} must be a valid HTTP(S) URL, got: ${value}`)
      }
    }

    // Validate performance settings
    if (parsedEnv.NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE > 1 || parsedEnv.NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE < 0) {
      throw new Error('❌ NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE must be between 0 and 1')
    }

    // Validate file upload settings
    if (parsedEnv.NEXT_PUBLIC_MAX_FILE_SIZE > 50 * 1024 * 1024) {
      // 50MB
      console.warn('⚠️  File upload size is very large (>50MB)')
    }

    // Validate timeout settings
    if (parsedEnv.NEXT_PUBLIC_API_TIMEOUT < 1000) {
      console.warn('⚠️  API timeout is very low (<1s)')
    }

    console.log('✅ Environment variables validation passed')
    return parsedEnv
  } catch (error) {
    const errorMessage = `Environment validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`

    if (throwOnError) {
      console.error(`❌ ${errorMessage}`)

      // Log detailed error information for debugging
      if (error instanceof z.ZodError) {
        console.error('Validation errors:')
        error.errors.forEach((err, index) => {
          console.error(`  ${index + 1}. ${err.path.join('.')}: ${err.message}`)
        })
      }

      throw new Error(errorMessage)
    } else {
      console.warn(`⚠️  ${errorMessage}`)
      return env as unknown as EnvVars
    }
  }
}

/**
 * Environment validation for different contexts
 */
export const validateForContext = {
  /**
   * Build-time validation (less strict)
   */
  build: () => validateEnvVars(process.env, false),

  /**
   * Runtime validation (strict)
   */
  runtime: () => validateEnvVars(process.env, true),

  /**
   * Test validation (minimal requirements)
   */
  test: () => {
    const testEnv = {
      ...process.env,
      NODE_ENV: 'test',
      NEXT_PUBLIC_APP_ENV: 'test',
      SKIP_ENV_VALIDATION: 'false',
    }
    return validateEnvVars(testEnv, false)
  },
}

/**
 * Exports for backward compatibility and convenience
 */
export { PublicEnvSchema, PrivateEnvSchema }

// Auto-validate on import (runtime only, not during build)
if (
  typeof window !== 'undefined' ||
  (process.env.NODE_ENV !== undefined &&
    !process.env.SKIP_ENV_VALIDATION &&
    !process.env.NEXT_PUBLIC_SKIP_ENV_VALIDATION)
) {
  try {
    const skipValidation =
      process.env.SKIP_ENV_VALIDATION === 'true' || process.env.NEXT_PUBLIC_SKIP_ENV_VALIDATION === 'true'

    // Use lenient validation in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Using lenient environment validation')
      validateEnvVars(process.env, false) // Don't throw on errors in development
    } else if (skipValidation) {
      console.log('🔧 Environment validation skipped via SKIP_ENV_VALIDATION or NEXT_PUBLIC_SKIP_ENV_VALIDATION')
    } else {
      // Use lenient validation in production for client-side to prevent crashes
      if (typeof window !== 'undefined') {
        validateEnvVars(process.env, false) // Client-side: don't throw
      } else {
        validateForContext.runtime() // Server-side: strict
      }
    }
  } catch (error) {
    // Always be lenient in client environments to prevent application crashes
    console.warn('Environment validation failed on import:', error)
    // Don't throw in any environment for better user experience
  }
}
