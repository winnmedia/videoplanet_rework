/**
 * @fileoverview Integration Test Setup
 * @description 통합 테스트용 설정 파일 (MSW 비활성화)
 * @layer tests/integration
 */

import '@testing-library/jest-dom'

// 통합 테스트에서는 MSW를 비활성화하여 실제 API 호출이 가능하도록 함
console.log('🔧 Integration test setup: MSW disabled, using real API endpoints')

// 환경 변수 설정
process.env.NEXT_PUBLIC_ENABLE_MSW = 'false'
process.env.NEXT_PUBLIC_USE_REAL_API = 'true'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3002/api'

// 전역 fetch는 Node.js 18+에서 내장 제공
// global.fetch는 이미 사용 가능

console.log('✅ Integration test environment configured')
