#!/usr/bin/env node

/**
 * MSW v2 호환성을 위한 API 핸들러 자동 수정 스크립트
 * rest.* -> http.* 변환 및 타입 안전성 추가
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path')

const filePath = path.join(process.cwd(), 'tests/e2e/mocks/api-handlers.ts')

function fixMswHandlers() {
  console.log('🔧 MSW 핸들러를 v2 호환 형식으로 변환 중...')
  
  let content = fs.readFileSync(filePath, 'utf8')
  
  // rest.get -> http.get 변환
  content = content.replace(
    /rest\.get\(['"]([^'"]+)['"],\s*\([^)]*\)\s*=>\s*\{/g, 
    (match, url) => `http.get('${url}', (): Response => {`
  )
  
  // rest.post -> http.post 변환  
  content = content.replace(
    /rest\.post\(['"]([^'"]+)['"],\s*\([^)]*\)\s*=>\s*\{/g,
    (match, url) => `http.post('${url}', (): Response => {`
  )
  
  // rest.put -> http.put 변환
  content = content.replace(
    /rest\.put\(['"]([^'"]+)['"],\s*\([^)]*\)\s*=>\s*\{/g,
    (match, url) => `http.put('${url}', (): Response => {`
  )
  
  // rest.patch -> http.patch 변환
  content = content.replace(
    /rest\.patch\(['"]([^'"]+)['"],\s*\([^)]*\)\s*=>\s*\{/g,
    (match, url) => `http.patch('${url}', (): Response => {`
  )
  
  // rest.delete -> http.delete 변환
  content = content.replace(
    /rest\.delete\(['"]([^'"]+)['"],\s*\([^)]*\)\s*=>\s*\{/g,
    (match, url) => `http.delete('${url}', (): Response => {`
  )
  
  // return res( -> return HttpResponse.json( 변환
  content = content.replace(
    /return res\(\s*ctx\.status\((\d+)\),\s*ctx\.json\(([^}]+})\)\s*\)/g,
    'return HttpResponse.json(\n      $2,\n      { status: $1 }\n    )'
  )
  
  // 단순한 return res( -> return HttpResponse.json( 변환
  content = content.replace(
    /return res\(\s*ctx\.json\(([^}]+})\)\s*\)/g,
    'return HttpResponse.json($1)'
  )
  
  fs.writeFileSync(filePath, content, 'utf8')
  console.log('✅ MSW 핸들러 변환 완료!')
}

fixMswHandlers()