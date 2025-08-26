const http = require('http');

const TEST_HOST = 'localhost';
const TEST_PORT = 3001;

// 테스트 시나리오
const testScenarios = [
  { 
    name: 'Validation Error',
    method: 'GET',
    path: '/api/test?scenario=validation',
    expectedStatus: 422,
    description: '유효성 검사 에러 테스트'
  },
  {
    name: 'Authentication Error',
    method: 'GET',
    path: '/api/test?scenario=unauthorized',
    expectedStatus: 401,
    description: '인증 에러 테스트'
  },
  {
    name: 'Authorization Error',
    method: 'GET',
    path: '/api/test?scenario=forbidden',
    expectedStatus: 403,
    description: '권한 에러 테스트'
  },
  {
    name: 'Not Found Error',
    method: 'GET',
    path: '/api/test?scenario=not-found',
    expectedStatus: 404,
    description: '리소스 없음 에러 테스트'
  },
  {
    name: 'Server Error',
    method: 'GET',
    path: '/api/test?scenario=server-error',
    expectedStatus: 500,
    description: '서버 에러 테스트'
  },
  {
    name: 'Success Response',
    method: 'GET',
    path: '/api/test?scenario=success',
    expectedStatus: 200,
    description: '정상 응답 테스트'
  },
  {
    name: 'POST Validation - Missing Fields',
    method: 'POST',
    path: '/api/test',
    body: {},
    expectedStatus: 422,
    description: 'POST 요청 필드 누락 테스트'
  },
  {
    name: 'POST Validation - Invalid Email',
    method: 'POST',
    path: '/api/test',
    body: { email: 'invalid-email', password: '12345678' },
    expectedStatus: 422,
    description: 'POST 요청 이메일 형식 오류 테스트'
  },
  {
    name: 'POST Success',
    method: 'POST',
    path: '/api/test',
    body: { email: 'test@example.com', password: 'password123' },
    expectedStatus: 201,
    description: 'POST 요청 성공 테스트'
  },
  {
    name: 'DELETE Without Auth',
    method: 'DELETE',
    path: '/api/test',
    headers: {},
    expectedStatus: 401,
    description: 'DELETE 요청 인증 없음 테스트'
  },
  {
    name: 'DELETE With Invalid Token',
    method: 'DELETE',
    path: '/api/test',
    headers: { 'authorization': 'Bearer invalid-token' },
    expectedStatus: 403,
    description: 'DELETE 요청 잘못된 토큰 테스트'
  },
  {
    name: 'DELETE With Valid Token',
    method: 'DELETE',
    path: '/api/test',
    headers: { 'authorization': 'Bearer valid-token' },
    expectedStatus: 204,
    description: 'DELETE 요청 성공 테스트'
  }
];

// API 테스트 함수
async function testAPI(scenario) {
  return new Promise((resolve) => {
    const options = {
      hostname: TEST_HOST,
      port: TEST_PORT,
      path: scenario.path,
      method: scenario.method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...scenario.headers
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
          if (data) {
            jsonResponse = JSON.parse(data);
          }
        } catch (e) {
          // JSON 파싱 실패
        }

        const result = {
          name: scenario.name,
          description: scenario.description,
          method: scenario.method,
          path: scenario.path,
          expectedStatus: scenario.expectedStatus,
          actualStatus: res.statusCode,
          success: res.statusCode === scenario.expectedStatus,
          headers: res.headers,
          response: jsonResponse,
          hasStandardErrorFormat: false
        };

        // 표준 에러 형식 확인
        if (jsonResponse && res.statusCode >= 400) {
          result.hasStandardErrorFormat = 
            jsonResponse.error !== undefined &&
            jsonResponse.message !== undefined &&
            jsonResponse.statusCode !== undefined &&
            jsonResponse.timestamp !== undefined;
        }

        resolve(result);
      });
    });

    req.on('error', (error) => {
      resolve({
        name: scenario.name,
        description: scenario.description,
        method: scenario.method,
        path: scenario.path,
        expectedStatus: scenario.expectedStatus,
        actualStatus: 0,
        success: false,
        error: error.message
      });
    });

    // POST 요청에 body 추가
    if (scenario.body) {
      req.write(JSON.stringify(scenario.body));
    }

    req.end();
  });
}

// 메인 테스트 실행
async function runAPIErrorTests() {
  console.log('🔧 API 에러 핸들링 테스트 시작\n');
  console.log('=' .repeat(80));
  
  const results = [];
  let passedTests = 0;
  let failedTests = 0;
  let standardFormatCount = 0;

  // 각 시나리오 테스트
  for (const scenario of testScenarios) {
    const result = await testAPI(scenario);
    results.push(result);
    
    console.log(`\n📍 ${result.name}`);
    console.log(`   설명: ${result.description}`);
    console.log(`   메서드: ${result.method} ${result.path}`);
    console.log(`   상태 코드: ${result.actualStatus} (예상: ${result.expectedStatus})`);
    
    if (result.success) {
      console.log(`   ✅ 테스트 통과`);
      passedTests++;
    } else {
      console.log(`   ❌ 테스트 실패`);
      failedTests++;
    }

    if (result.response) {
      if (result.hasStandardErrorFormat) {
        console.log(`   📋 표준 에러 형식: ✅`);
        standardFormatCount++;
        console.log(`      - error: ${result.response.error}`);
        console.log(`      - message: ${result.response.message}`);
      } else if (result.actualStatus >= 400) {
        console.log(`   📋 표준 에러 형식: ❌`);
      }
      
      // 유효성 검사 에러의 경우 상세 필드 표시
      if (result.response.details) {
        console.log(`   📝 에러 상세:`);
        for (const [field, messages] of Object.entries(result.response.details)) {
          console.log(`      - ${field}: ${messages.join(', ')}`);
        }
      }
    }
  }

  // 결과 요약
  console.log('\n' + '=' .repeat(80));
  console.log('📊 테스트 결과 요약');
  console.log(`   전체 테스트: ${testScenarios.length}개`);
  console.log(`   통과: ${passedTests}개`);
  console.log(`   실패: ${failedTests}개`);
  console.log(`   성공률: ${Math.round((passedTests / testScenarios.length) * 100)}%`);
  console.log(`   표준 에러 형식 준수: ${standardFormatCount}개`);
  
  // 권장사항
  console.log('\n💡 분석 결과:');
  if (passedTests === testScenarios.length) {
    console.log('   ✅ 모든 API 에러 핸들링이 올바르게 작동합니다');
  }
  
  const errorResults = results.filter(r => r.actualStatus >= 400);
  const standardCompliance = errorResults.filter(r => r.hasStandardErrorFormat).length;
  
  if (standardCompliance === errorResults.length) {
    console.log('   ✅ 모든 에러 응답이 표준 형식을 따릅니다');
  } else {
    console.log(`   ⚠️ ${errorResults.length - standardCompliance}개의 에러 응답이 비표준 형식입니다`);
  }
  
  // 결과 저장
  const fs = require('fs');
  fs.writeFileSync('test-results/api-error-test.json', JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: testScenarios.length,
      passed: passedTests,
      failed: failedTests,
      successRate: `${Math.round((passedTests / testScenarios.length) * 100)}%`,
      standardErrorFormat: standardFormatCount
    },
    results: results
  }, null, 2));
  
  console.log('\n📁 테스트 결과가 test-results/api-error-test.json에 저장되었습니다.');
  
  return passedTests === testScenarios.length;
}

// 테스트 실행
runAPIErrorTests().then(success => {
  process.exit(success ? 0 : 1);
});