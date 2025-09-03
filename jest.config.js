// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/cypress/',
  ],
  
  // 환경변수 설정 최적화 (variables.md 기반)
  setupFiles: ['<rootDir>/jest.env.setup.js'],
  
  // 향상된 커버리지 설정
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/app/**',
    '!src/shared/types/**',
    // API와 lib은 포함하여 더 높은 커버리지 요구
    'src/shared/api/**/*.{ts,tsx}',
    'src/shared/lib/**/*.{ts,tsx}',
  ],
  
  // 80% 임계값으로 상향 조정 (CLAUDE.md 규칙 반영)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // 핵심 도메인(entities)에 90% 적용
    'src/entities/**/*.{ts,tsx}': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // features는 85% 적용
    'src/features/**/*.{ts,tsx}': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    }
  },
  
  // 테스트 환경별 분리
  projects: [
    {
      displayName: 'Unit Tests (Node)',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/entities/**/*.test.{ts,tsx}',
        '<rootDir>/src/shared/lib/**/*.test.{ts,tsx}',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
    {
      displayName: 'Component Tests (JSDOM)',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/src/features/**/*.test.{ts,tsx}',
        '<rootDir>/src/widgets/**/*.test.{ts,tsx}',
        '<rootDir>/src/shared/ui/**/*.test.{ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
  
  // 성능 최적화
  maxWorkers: '50%',
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Flaky 테스트 감지
  verbose: true,
  detectOpenHandles: true,
  
  // 커버리지 리포트 설정
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json',
    'lcov'
  ],
  coverageDirectory: '<rootDir>/coverage',
  
  // 테스트 파일 패턴 확장
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  
  // 테스트 시간 제한 (Flaky 방지)
  testTimeout: 10000,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)