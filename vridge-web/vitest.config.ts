import path from 'path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: ['./test/setup.ts'],
    
    // CSS 파일 처리 설정 - CSS Modules를 테스트에서 사용할 수 있게 활성화
    css: {
      modules: {
        classNameStrategy: 'non-scoped'
      }
    },
    
    // Coverage configuration - 모듈별 차등 커버리지
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.*',
        '**/*.d.ts',
        '.next/',
        'public/',
        '**/__mocks__/**',
      ],
      
      // 글로벌 임계값 (최소 기준)
      thresholds: {
        branches: 70,
        functions: 75,
        lines: 75,
        statements: 75,
      },
      
      all: true,
      clean: true,
      skipFull: false
    },
    
    // Test matching patterns - 모듈별 테스트 패턴
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      // 모듈별 특수 테스트 패턴
      '**/calendar/**/*.test.ts',
      '**/project*/**/*.test.ts', 
      '**/dashboard/**/*.test.ts',
      '**/video-*/**/*.test.ts'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      '.next',
      'dist',
      'build',
      'coverage',
    ],
    
    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    
    // Reporter configuration - 병렬 개발용 향상된 리포팅
    reporters: [
      'verbose',
      'json',
      ['html', { outputFile: 'test-results/index.html' }]
    ],
    
    // Test timeout - 모듈별 차등 타임아웃
    testTimeout: 10000,
    
    // 병렬 실행 설정
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
        useAtomics: true
      }
    },
    
    // 모듈별 테스트 환경 설정
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously'
      }
    },
    
    // Watch mode는 기본 설정 사용
    
    // 테스트 분류 및 태깅 (globals는 위에서 이미 설정됨)
  },
  
  // Path aliases matching tsconfig.json
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@app': path.resolve(__dirname, './app'),
      '@processes': path.resolve(__dirname, './processes'),
      '@widgets': path.resolve(__dirname, './widgets'),
      '@features': path.resolve(__dirname, './features'),
      '@entities': path.resolve(__dirname, './entities'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
})