const http = require('http');

const pages = ['/', '/login', '/dashboard', '/projects', '/feedback'];
const host = 'localhost';
const port = 3001;

console.log('🧪 페이지 로딩 테스트 시작...\n');

async function testPage(path) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const status = res.statusCode === 200 ? '✅' : '❌';
        const hasContent = data.length > 1000;
        const contentStatus = hasContent ? '✅' : '⚠️';
        
        console.log(`${status} ${path} - 상태: ${res.statusCode}, 컨텐츠: ${contentStatus} (${data.length} bytes)`);
        
        resolve({
          path,
          status: res.statusCode,
          contentLength: data.length,
          success: res.statusCode === 200 && hasContent
        });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${path} - 에러: ${error.message}`);
      resolve({
        path,
        status: 0,
        contentLength: 0,
        success: false
      });
    });

    req.end();
  });
}

async function runTests() {
  const results = [];
  
  for (const page of pages) {
    const result = await testPage(page);
    results.push(result);
  }
  
  console.log('\n📊 테스트 결과 요약:');
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ 성공: ${successCount}/${results.length}`);
  
  if (successCount === results.length) {
    console.log('\n🎉 모든 페이지가 정상적으로 로딩됩니다!');
  } else {
    console.log('\n⚠️ 일부 페이지에 문제가 있습니다.');
  }
}

runTests();