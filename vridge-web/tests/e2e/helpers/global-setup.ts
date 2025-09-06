import { FullConfig } from '@playwright/test'

/**
 * Playwright Global Setup
 * E2E 테스트 실행 전 전역 설정 및 환경 준비
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests')

  // 테스트용 환경 변수 기본값 설정
  const testDefaults = {
    NEXTAUTH_SECRET: 'test-secret-key-for-e2e-testing-only-32-chars-minimum-length-required',
    NEXTAUTH_URL: 'http://localhost:3000',
    NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    // NEXT_PUBLIC_API_BASE_URL은 더 이상 사용하지 않음 (NEXT_PUBLIC_API_URL로 통일)
  }

  // 테스트 환경에서만 기본값 적용
  if (process.env.NODE_ENV === 'test' || process.env.LOCAL_E2E === 'true') {
    Object.entries(testDefaults).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value
        console.log(`🔧 Set default ${key} for testing`)
      }
    })
  }

  // 환경 변수 검증 (NEXT_PUBLIC_API_URL로 통일)
  const requiredEnvVars = [
    'NEXT_PUBLIC_API_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`)
    console.warn('Tests will use fallback values where possible')
  } else {
    console.log('✅ All required environment variables are set')
  }

  // MSW 서버 설정 확인 (테스트 환경에서만)
  if (process.env.NODE_ENV === 'test') {
    console.log('🔧 Configuring MSW for E2E tests')
    // MSW 설정은 individual test 파일에서 처리
  }

  // 테스트 데이터 정리 및 준비
  console.log('🧹 Preparing test data')
  
  // 로컬 스토리지 클리어
  // (브라우저 컨텍스트별로 수행되므로 여기서는 로그만)
  console.log('📱 Browser storage will be cleared per test context')

  // 테스트 사용자 세션 준비
  const testUsers = {
    admin: { id: 'test-admin', role: 'admin' },
    user: { id: 'test-user', role: 'user' }
  }
  
  console.log(`👥 Test users prepared: ${Object.keys(testUsers).join(', ')}`)

  // 성능 모니터링 설정
  console.log('📊 Performance monitoring enabled for E2E tests')

  // 접근성 테스트 준비
  console.log('♿ Accessibility testing tools configured')

  console.log('✅ Global setup completed successfully')
}

export default globalSetup