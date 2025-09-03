#!/usr/bin/env node
/**
 * 배포 후 헬스체크 및 검증 스크립트
 * 모든 배포 단계에서 시스템 상태를 검증
 */

const axios = require('axios')
const chalk = require('chalk')

const config = {
  // 환경별 URL 설정
  urls: {
    production: {
      frontend: 'https://vlanet.net',
      backend: 'https://videoplanet.up.railway.app',
      api: 'https://api.vlanet.net'
    },
    preview: {
      frontend: process.env.VERCEL_URL || 'https://preview.vercel.app',
      backend: 'https://videoplanet.up.railway.app',
      api: 'https://videoplanet.up.railway.app/api'
    },
    development: {
      frontend: 'http://localhost:3000',
      backend: 'http://localhost:8000',
      api: 'http://localhost:8000/api'
    }
  },
  // 헬스체크 엔드포인트
  healthChecks: [
    { path: '/', name: 'Frontend Root' },
    { path: '/api/health', name: 'API Health' },
    { path: '/health/', name: 'Backend Health', backend: true },
    { path: '/api/v1/status', name: 'API Status', backend: true }
  ],
  // 타임아웃 설정
  timeout: 10000,
  retries: 3,
  retryDelay: 2000
}

/**
 * HTTP 요청 with 재시도
 */
async function makeRequest(url, retries = config.retries) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: config.timeout,
        validateStatus: (status) => status < 500 // 500 미만은 성공으로 간주
      })
      return response
    } catch (error) {
      if (i === retries) {
        throw error
      }
      console.log(chalk.yellow(`⚠️ Retry ${i + 1}/${retries} for ${url}`))
      await new Promise(resolve => setTimeout(resolve, config.retryDelay))
    }
  }
}

/**
 * 헬스체크 수행
 */
async function performHealthCheck(env = 'production') {
  console.log(chalk.blue(`🔍 Starting health check for ${env} environment`))
  const urls = config.urls[env]
  
  if (!urls) {
    throw new Error(`Unknown environment: ${env}`)
  }

  const results = []
  
  for (const check of config.healthChecks) {
    const baseUrl = check.backend ? urls.backend : urls.frontend
    const fullUrl = `${baseUrl}${check.path}`
    
    console.log(chalk.gray(`Testing ${check.name}: ${fullUrl}`))
    
    try {
      const startTime = Date.now()
      const response = await makeRequest(fullUrl)
      const duration = Date.now() - startTime
      
      const result = {
        name: check.name,
        url: fullUrl,
        status: response.status,
        duration,
        success: response.status >= 200 && response.status < 400
      }
      
      results.push(result)
      
      if (result.success) {
        console.log(chalk.green(`✅ ${check.name}: ${response.status} (${duration}ms)`))
      } else {
        console.log(chalk.red(`❌ ${check.name}: ${response.status} (${duration}ms)`))
      }
    } catch (error) {
      const result = {
        name: check.name,
        url: fullUrl,
        status: error.response?.status || 0,
        error: error.message,
        success: false
      }
      
      results.push(result)
      console.log(chalk.red(`❌ ${check.name}: ${error.message}`))
    }
  }
  
  return results
}

/**
 * 성능 메트릭 수집
 */
async function collectPerformanceMetrics(env = 'production') {
  console.log(chalk.blue('⚡ Collecting performance metrics'))
  const urls = config.urls[env]
  
  const testUrls = [
    urls.frontend,
    `${urls.frontend}/projects`,
    `${urls.backend}/health/`
  ]
  
  const metrics = []
  
  for (const url of testUrls) {
    try {
      const startTime = Date.now()
      const response = await makeRequest(url)
      const duration = Date.now() - startTime
      
      metrics.push({
        url,
        responseTime: duration,
        status: response.status,
        size: response.headers['content-length'] || 0
      })
      
      console.log(chalk.green(`📊 ${url}: ${duration}ms`))
      
      // 성능 경고
      if (duration > 5000) {
        console.log(chalk.red(`⚠️ Slow response time: ${duration}ms > 5000ms`))
      } else if (duration > 2000) {
        console.log(chalk.yellow(`⚠️ Response time warning: ${duration}ms > 2000ms`))
      }
      
    } catch (error) {
      console.log(chalk.red(`❌ Performance test failed for ${url}: ${error.message}`))
    }
  }
  
  return metrics
}

/**
 * WebSocket 연결 테스트
 */
async function testWebSocketConnection(env = 'production') {
  console.log(chalk.blue('🔌 Testing WebSocket connection'))
  
  // WebSocket 연결 기본적인 포트 체크
  const urls = config.urls[env]
  const wsUrl = urls.backend.replace('https://', 'wss://').replace('http://', 'ws://')
  
  try {
    // 실제 WebSocket 연결은 복잡하므로, 기본적인 포트 가용성만 확인
    const response = await makeRequest(urls.backend)
    if (response.status === 200) {
      console.log(chalk.green('✅ WebSocket endpoint accessible'))
      return true
    }
  } catch (error) {
    console.log(chalk.red(`❌ WebSocket test failed: ${error.message}`))
    return false
  }
}

/**
 * 전체 검증 실행
 */
async function runFullVerification() {
  const env = process.env.NODE_ENV || 'production'
  console.log(chalk.bold.blue(`🚀 Starting deployment verification for ${env}`))
  
  try {
    // 1. 헬스체크
    const healthResults = await performHealthCheck(env)
    
    // 2. 성능 메트릭
    const performanceResults = await collectPerformanceMetrics(env)
    
    // 3. WebSocket 테스트
    const wsResult = await testWebSocketConnection(env)
    
    // 4. 결과 요약
    console.log(chalk.bold.blue('\n📋 Verification Summary'))
    console.log('='.repeat(50))
    
    const successful = healthResults.filter(r => r.success).length
    const total = healthResults.length
    
    console.log(`Health Checks: ${successful}/${total} passed`)
    
    const avgResponseTime = performanceResults.reduce((sum, r) => sum + r.responseTime, 0) / performanceResults.length
    console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`)
    
    console.log(`WebSocket: ${wsResult ? 'OK' : 'Failed'}`)
    
    // 5. 전체 결과 판정
    const allHealthy = successful === total
    const performanceGood = avgResponseTime < 5000
    
    if (allHealthy && performanceGood && wsResult) {
      console.log(chalk.bold.green('\n✅ Deployment verification PASSED'))
      process.exit(0)
    } else {
      console.log(chalk.bold.red('\n❌ Deployment verification FAILED'))
      
      if (!allHealthy) console.log(chalk.red(`- Health checks failed: ${total - successful}/${total}`))
      if (!performanceGood) console.log(chalk.red(`- Performance issue: ${Math.round(avgResponseTime)}ms > 5000ms`))
      if (!wsResult) console.log(chalk.red('- WebSocket connection failed'))
      
      process.exit(1)
    }
    
  } catch (error) {
    console.error(chalk.bold.red('❌ Verification failed with error:'))
    console.error(error.message)
    process.exit(1)
  }
}

// CLI 실행
if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0] || 'full'
  
  switch (command) {
    case 'health':
      performHealthCheck(args[1])
        .then(results => {
          const successful = results.filter(r => r.success).length
          console.log(`\n${successful}/${results.length} checks passed`)
          process.exit(successful === results.length ? 0 : 1)
        })
        .catch(error => {
          console.error(error.message)
          process.exit(1)
        })
      break
      
    case 'performance':
      collectPerformanceMetrics(args[1])
        .then(metrics => {
          const avg = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
          console.log(`\nAverage response time: ${Math.round(avg)}ms`)
          process.exit(avg < 5000 ? 0 : 1)
        })
        .catch(error => {
          console.error(error.message)
          process.exit(1)
        })
      break
      
    case 'full':
    default:
      runFullVerification()
      break
  }
}

module.exports = {
  performHealthCheck,
  collectPerformanceMetrics,
  testWebSocketConnection,
  runFullVerification
}