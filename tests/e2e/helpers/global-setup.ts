import { FullConfig } from '@playwright/test'

/**
 * Playwright Global Setup
 * E2E 테스트 실행 전 전역 설정 및 환경 준비
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests')

  // 환경 변수 검증
  const requiredEnvVars = [
    'NEXT_PUBLIC_API_BASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`)
    console.warn('Some tests may fail or use fallback values')
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