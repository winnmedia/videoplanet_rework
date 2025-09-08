import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [],
  test: {
    // Global functions (describe, it, expect, etc.)
    globals: true,
    
    // Test environment for integration tests
    environment: 'node',
    
    // Setup files - 통합 테스트용 설정만 사용
    setupFiles: ['./tests/integration/setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.*',
        '**/*.d.ts',
        '.next/',
        'public/',
      ],
      thresholds: {
        branches: 50, // 통합 테스트는 낮은 커버리지 요구사항
        functions: 60,
        lines: 60,
        statements: 60,
      },
    },
    
    // Test matching patterns - 통합 테스트만
    include: [
      'tests/integration/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      '.next',
      'dist',
      'build',
      'coverage',
    ],
    
    // Mock configuration - 통합 테스트에서는 모킹 최소화
    mockReset: false,
    restoreMocks: false,
    clearMocks: false,
    
    // Reporter configuration
    reporters: [
      'verbose',
      'json',
      ['html', { outputFile: 'integration-test-results/index.html' }]
    ],
    
    // Test timeout - 네트워크 호출을 고려한 긴 타임아웃
    testTimeout: 30000,
    
    // 통합 테스트는 순차 실행
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // 통합 테스트는 순차 실행
        isolate: false,
      }
    },
    
    // Node.js 환경 설정
    environmentOptions: {
      node: {
        // Node.js 특정 옵션
      }
    },
  },
  
  // Path aliases matching tsconfig.json
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      '@app': fileURLToPath(new URL('./app', import.meta.url)),
      '@processes': fileURLToPath(new URL('./processes', import.meta.url)),
      '@widgets': fileURLToPath(new URL('./widgets', import.meta.url)),
      '@features': fileURLToPath(new URL('./features', import.meta.url)),
      '@entities': fileURLToPath(new URL('./entities', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  
  // 통합 테스트용 환경 변수
  define: {
    'process.env.NEXT_PUBLIC_ENABLE_MSW': '"false"',
    'process.env.NEXT_PUBLIC_USE_REAL_API': '"true"',
    'process.env.NODE_ENV': '"test"',
  },
})