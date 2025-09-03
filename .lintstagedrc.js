module.exports = {
  // TypeScript/JavaScript 파일
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
    // 테스트 파일 없는 코드 차단
    'node scripts/test-enforcement.js',
    'jest --findRelatedTests --passWithNoTests'
  ],
  
  // 스타일 파일 (레거시 전용)
  '*.{css,scss}': [
    'stylelint --fix',
    'prettier --write'
  ],
  
  // 마크다운 파일
  '*.md': [
    'prettier --write'
  ],
  
  // JSON 파일
  '*.json': [
    'prettier --write'
  ]
}