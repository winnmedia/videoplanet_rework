const http = require('http');
const https = require('https');

const TEST_HOST = 'localhost';
const TEST_PORT = 3001;

// 테스트할 엔드포인트들
const endpoints = [
  { path: '/', expectedStatus: 200, description: '홈페이지' },
  { path: '/login', expectedStatus: 200, description: '로그인 페이지' },
  { path: '/dashboard', expectedStatus: 200, description: '대시보드' },
  { path: '/projects', expectedStatus: 200, description: '프로젝트 목록' },
  { path: '/feedback', expectedStatus: 200, description: '피드백' },
  { path: '/api/health', expectedStatus: 200, description: 'Health Check API' },
  { path: '/non-existent-page', expectedStatus: 404, description: '존재하지 않는 페이지' },
  { path: '/api/non-existent', expectedStatus: 404, description: '존재하지 않는 API' },
  { path: '/_next/static/test', expectedStatus: 404, description: '정적 리소스 404' },
];

// HTTP 상태 코드별 테스트
async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: TEST_HOST,
      port: TEST_PORT,
      path: endpoint.path,
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/html',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const result = {
          path: endpoint.path,
          description: endpoint.description,
          expectedStatus: endpoint.expectedStatus,
          actualStatus: res.statusCode,
          success: res.statusCode === endpoint.expectedStatus,
          headers: res.headers,
          bodyLength: data.length,
          hasContent: data.length > 0
        };

        // 에러 상태 코드에 대한 추가 검증
        if (res.statusCode >= 400) {
          result.errorHandling = {
            hasErrorPage: data.includes('404') || data.includes('error') || data.includes('Error'),
            hasMessage: data.includes('not found') || data.includes('페이지를 찾을 수 없습니다'),
            contentType: res.headers['content-type']
          };
        }

        resolve(result);
      });
    });

    req.on('error', (error) => {
      resolve({
        path: endpoint.path,
        description: endpoint.description,
        expectedStatus: endpoint.expectedStatus,
        actualStatus: 0,
        success: false,
        error: error.message
      });
    });

    req.end();
  });
}

// API 에러 응답 테스트
async function testAPIError() {
  return new Promise((resolve) => {
    const options = {
      hostname: TEST_HOST,
      port: TEST_PORT,
      path: '/api/test-error',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        let jsonResponse = null;
        try {
          jsonResponse = JSON.parse(data);
        } catch (e) {
          // JSON 파싱 실패
        }

        resolve({
          path: options.path,
          description: 'API 에러 응답 테스트',
          statusCode: res.statusCode,
          isJSON: jsonResponse !== null,
          hasError: jsonResponse?.error !== undefined,
          errorMessage: jsonResponse?.error || jsonResponse?.message
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        path: options.path,
        description: 'API 에러 응답 테스트',
        error: error.message
      });
    });

    req.write(JSON.stringify({ invalid: 'data' }));
    req.end();
  });
}

// 메인 테스트 실행
async function runTests() {
  console.log('🧪 HTTP 에러 테스트 시작\n');
  console.log('=' .repeat(80));
  
  const results = [];
  let passedTests = 0;
  let failedTests = 0;

  // 각 엔드포인트 테스트
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ ${result.description}`);
      console.log(`   경로: ${result.path}`);
      console.log(`   상태: ${result.actualStatus} (예상: ${result.expectedStatus})`);
      passedTests++;
    } else {
      console.log(`❌ ${result.description}`);
      console.log(`   경로: ${result.path}`);
      console.log(`   상태: ${result.actualStatus} (예상: ${result.expectedStatus})`);
      if (result.error) {
        console.log(`   에러: ${result.error}`);
      }
      failedTests++;
    }

    if (result.errorHandling) {
      console.log(`   에러 페이지: ${result.errorHandling.hasErrorPage ? '있음' : '없음'}`);
      console.log(`   에러 메시지: ${result.errorHandling.hasMessage ? '있음' : '없음'}`);
    }
    
    console.log('');
  }

  // API 에러 응답 테스트
  const apiErrorResult = await testAPIError();
  console.log('📡 API 에러 응답 테스트');
  console.log(`   상태 코드: ${apiErrorResult.statusCode || 'N/A'}`);
  console.log(`   JSON 응답: ${apiErrorResult.isJSON ? '예' : '아니오'}`);
  if (apiErrorResult.errorMessage) {
    console.log(`   에러 메시지: ${apiErrorResult.errorMessage}`);
  }
  
  console.log('\n' + '=' .repeat(80));
  console.log('📊 테스트 결과 요약');
  console.log(`   통과: ${passedTests}/${endpoints.length}`);
  console.log(`   실패: ${failedTests}/${endpoints.length}`);
  console.log(`   성공률: ${Math.round((passedTests / endpoints.length) * 100)}%`);
  
  // 에러 핸들링 권장사항
  console.log('\n💡 권장사항:');
  const has404Page = results.find(r => r.actualStatus === 404 && r.errorHandling?.hasErrorPage);
  const has500Page = results.find(r => r.actualStatus === 500 && r.errorHandling?.hasErrorPage);
  
  if (!has404Page) {
    console.log('   - 404 에러 페이지 구현 필요');
  }
  if (!has500Page) {
    console.log('   - 500 에러 페이지 구현 필요');
  }
  
  const apiErrors = results.filter(r => r.path.startsWith('/api') && r.actualStatus >= 400);
  if (apiErrors.length > 0) {
    console.log('   - API 에러 응답 표준화 필요');
  }
  
  // 결과 저장
  const fs = require('fs');
  fs.writeFileSync('test-results/http-error-test.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: endpoints.length,
      passed: passedTests,
      failed: failedTests,
      successRate: `${Math.round((passedTests / endpoints.length) * 100)}%`
    },
    results: results,
    apiErrorTest: apiErrorResult
  }, null, 2));
  
  console.log('\n📁 테스트 결과가 test-results/http-error-test.json에 저장되었습니다.');
  
  return passedTests === endpoints.length;
}

// 테스트 실행
runTests().then(success => {
  process.exit(success ? 0 : 1);
});