#!/usr/bin/env node

/**
 * 테스트 없는 코드 차단 스크립트
 * TDD 원칙에 따라 모든 프로덕션 코드는 테스트가 있어야 함
 */

const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const changedFiles = args.filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))

// 테스트 파일 제외
const productionFiles = changedFiles.filter(file => 
  !file.includes('.test.') && 
  !file.includes('.spec.') && 
  !file.includes('cypress/') &&
  file.includes('src/')
)

const failures = []

productionFiles.forEach(file => {
  const filePath = path.resolve(file)
  const dir = path.dirname(filePath)
  const basename = path.basename(filePath, path.extname(filePath))
  const ext = path.extname(filePath)
  
  // 가능한 테스트 파일 경로들
  const possibleTestFiles = [
    path.join(dir, `${basename}.test${ext}`),
    path.join(dir, `${basename}.spec${ext}`),
    path.join(dir, '__tests__', `${basename}.test${ext}`),
    path.join(dir, '__tests__', `${basename}.spec${ext}`)
  ]
  
  const hasTest = possibleTestFiles.some(testFile => fs.existsSync(testFile))
  
  if (!hasTest) {
    // 예외: index.ts 파일과 type definition 파일
    if (basename === 'index' || file.endsWith('.d.ts')) {
      return
    }
    
    // 예외: app 디렉토리 (Next.js app router)
    if (file.includes('src/app/')) {
      return
    }
    
    failures.push({
      file,
      message: `테스트 파일이 없습니다. TDD 원칙에 따라 다음 중 하나의 테스트 파일을 생성하세요: ${possibleTestFiles.join(', ')}`
    })
  }
})

if (failures.length > 0) {
  console.error('❌ TDD 검증 실패:')
  failures.forEach(({ file, message }) => {
    console.error(`📁 ${file}`)
    console.error(`   ${message}`)
    console.error('')
  })
  console.error('🚫 커밋이 차단되었습니다. 모든 프로덕션 코드에는 테스트가 필요합니다.')
  process.exit(1)
}

console.log('✅ TDD 검증 통과 - 모든 파일에 테스트가 존재합니다.')
process.exit(0)