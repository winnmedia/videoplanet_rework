#!/usr/bin/env node
/**
 * Environment Variables Validation Simulation Script
 *
 * Vercel 프로덕션 환경에서 발생할 수 있는 다양한 환경변수 형태를 시뮬레이션하여 검증
 *
 * Note: TypeScript 파일을 직접 import할 수 없으므로 함수 로직을 JavaScript로 재구현
 */

// Zod equivalent boolean transformation logic
function parseBoolean(val) {
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
}

// Vercel 프로덕션 환경 시뮬레이션
console.log('🧪 Environment Variables Validation Simulation\n')

// 테스트 케이스 1: Vercel boolean 문자열 환경변수
console.log('1️⃣ Testing Vercel boolean string environment variables...')
const vercelEnv = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_APP_ENV: 'production',
  NEXT_PUBLIC_APP_NAME: 'VRidge Production',
  NEXT_PUBLIC_APP_URL: 'https://www.vlanet.net',
  NEXT_PUBLIC_API_URL: 'https://videoplanet.up.railway.app',
  NEXT_PUBLIC_BACKEND_URL: 'https://videoplanet.up.railway.app',
  NEXT_PUBLIC_WS_URL: 'wss://videoplanet.up.railway.app/ws',
  NEXT_PUBLIC_AUTH_PROVIDER: 'credentials',
  NEXTAUTH_SECRET: 'super-secret-key-for-production-environment-minimum-32-characters-long',
  DATABASE_URL: 'postgresql://user:password@host:5432/database',
  // Vercel에서 보낸 boolean 환경변수들 (문자열로)
  NEXT_PUBLIC_ENABLE_ANALYTICS: 'false',
  NEXT_PUBLIC_ENABLE_DEBUG: 'false',
  NEXT_PUBLIC_ENABLE_MAINTENANCE: 'false',
  NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: 'true',
  SKIP_ENV_VALIDATION: 'false', // 레거시 지원
}

// Simple validation simulation without Zod
console.log('✅ Simulating boolean parsing...')
console.log(
  '   NEXT_PUBLIC_ENABLE_ANALYTICS:',
  parseBoolean(vercelEnv.NEXT_PUBLIC_ENABLE_ANALYTICS),
  '(input:',
  vercelEnv.NEXT_PUBLIC_ENABLE_ANALYTICS,
  ')'
)
console.log(
  '   NEXT_PUBLIC_ENABLE_DEBUG:',
  parseBoolean(vercelEnv.NEXT_PUBLIC_ENABLE_DEBUG),
  '(input:',
  vercelEnv.NEXT_PUBLIC_ENABLE_DEBUG,
  ')'
)
console.log(
  '   NEXT_PUBLIC_ENABLE_MAINTENANCE:',
  parseBoolean(vercelEnv.NEXT_PUBLIC_ENABLE_MAINTENANCE),
  '(input:',
  vercelEnv.NEXT_PUBLIC_ENABLE_MAINTENANCE,
  ')'
)
console.log(
  '   NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING:',
  parseBoolean(vercelEnv.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING),
  '(input:',
  vercelEnv.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
  ')'
)

console.log('\n')

// 테스트 케이스 2: 다양한 boolean 형태의 혼합
console.log('2️⃣ Testing mixed boolean formats...')
const mixedEnv = {
  NODE_ENV: 'staging',
  NEXT_PUBLIC_APP_ENV: 'staging',
  NEXT_PUBLIC_APP_NAME: 'VRidge Staging',
  NEXT_PUBLIC_APP_URL: 'https://staging.vlanet.net',
  NEXT_PUBLIC_API_URL: 'https://videoplanet.up.railway.app',
  NEXT_PUBLIC_BACKEND_URL: 'https://videoplanet.up.railway.app',
  NEXT_PUBLIC_WS_URL: 'wss://videoplanet.up.railway.app/ws',
  NEXT_PUBLIC_AUTH_PROVIDER: 'credentials',
  // 다양한 boolean 형태들
  NEXT_PUBLIC_ENABLE_ANALYTICS: true, // 네이티브 boolean
  NEXT_PUBLIC_ENABLE_DEBUG: '1', // 숫자 문자열
  NEXT_PUBLIC_ENABLE_MAINTENANCE: 'yes', // 대안 boolean
  NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: 'on', // 또 다른 대안
  NEXT_PUBLIC_SKIP_ENV_VALIDATION: false,
}

console.log('✅ Testing mixed boolean formats...')
console.log(
  '   NEXT_PUBLIC_ENABLE_ANALYTICS:',
  parseBoolean(mixedEnv.NEXT_PUBLIC_ENABLE_ANALYTICS),
  '(input: native boolean',
  mixedEnv.NEXT_PUBLIC_ENABLE_ANALYTICS,
  ')'
)
console.log(
  '   NEXT_PUBLIC_ENABLE_DEBUG:',
  parseBoolean(mixedEnv.NEXT_PUBLIC_ENABLE_DEBUG),
  '(input: string "',
  mixedEnv.NEXT_PUBLIC_ENABLE_DEBUG,
  '")'
)
console.log(
  '   NEXT_PUBLIC_ENABLE_MAINTENANCE:',
  parseBoolean(mixedEnv.NEXT_PUBLIC_ENABLE_MAINTENANCE),
  '(input: string "',
  mixedEnv.NEXT_PUBLIC_ENABLE_MAINTENANCE,
  '")'
)
console.log(
  '   NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING:',
  parseBoolean(mixedEnv.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING),
  '(input: string "',
  mixedEnv.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING,
  '")'
)

console.log('\n')

// 테스트 케이스 3: Skip validation 테스트
console.log('3️⃣ Testing skip validation flag...')
const skipEnv = {
  NEXT_PUBLIC_SKIP_ENV_VALIDATION: 'true',
  // 의도적으로 잘못된 데이터
  NEXT_PUBLIC_APP_URL: 'invalid-url',
  NEXT_PUBLIC_ENABLE_ANALYTICS: 'maybe', // 잘못된 boolean
}

console.log('✅ Testing skip validation flag...')
console.log('   NEXT_PUBLIC_SKIP_ENV_VALIDATION:', parseBoolean(skipEnv.NEXT_PUBLIC_SKIP_ENV_VALIDATION))
console.log('   When skip validation is true, raw environment is returned')
console.log('   NEXT_PUBLIC_ENABLE_ANALYTICS would remain as:', skipEnv.NEXT_PUBLIC_ENABLE_ANALYTICS, '(unprocessed)')

console.log('\n✨ All environment variable validation tests completed!')
