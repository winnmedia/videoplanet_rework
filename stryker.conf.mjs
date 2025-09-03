// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  packageManager: 'pnpm',
  reporters: ['html', 'clear-text', 'progress', 'json'],
  testRunner: 'jest',
  testRunnerNodeArgs: ['--max_old_space_size=4096'],
  coverageAnalysis: 'perTest',
  
  // Mutation 대상 파일 (entities와 features 레이어 집중)
  mutate: [
    'src/entities/**/*.ts',
    'src/entities/**/*.tsx',
    'src/features/**/*.ts', 
    'src/features/**/*.tsx',
    'src/shared/lib/**/*.ts',
    'src/shared/lib/**/*.tsx',
    '!src/**/*.test.ts',
    '!src/**/*.test.tsx',
    '!src/**/*.spec.ts',
    '!src/**/*.spec.tsx',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/app/**/*'
  ],
  
  // Jest 테스트 실행 설정
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
    enableFindRelatedTests: true
  },
  
  // TypeScript 검사 활성화
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  
  // 임계값 설정 (80% 이상)
  thresholds: {
    high: 90,
    low: 80,
    break: 75 // 75% 미만 시 실패
  },
  
  // 성능 최적화
  concurrency: 4,
  timeoutMS: 60000,
  timeoutFactor: 2,
  
  // 무시할 mutator 유형 (필요시 조정)
  mutator: {
    excludedMutations: [
      'StringLiteral', // 문자열 리터럴 변경 제외 (UI 텍스트)
      'RegexMutator'   // 정규표현식 변경 제외 (복잡성 고려)
    ]
  },
  
  // HTML 리포트 설정
  htmlReporter: {
    baseDir: 'reports/mutation'
  },
  
  // JSON 리포트 설정 (CI에서 활용)
  jsonReporter: {
    fileName: 'reports/mutation/mutation-report.json'
  },
  
  // 로깅 설정
  logLevel: 'info',
  fileLogLevel: 'debug',
  
  // 조건부 실행 (변경된 파일에 대해서만)
  incremental: true,
  incrementalFile: 'reports/mutation/incremental.json'
}

export default config