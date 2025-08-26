const http = require('http');

function checkPageVisibility(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Check for key elements
        const hasHeader = data.includes('<header');
        const hasMain = data.includes('<main');
        const hasNextLogo = data.includes('next.svg');
        const hasMinHeight = data.includes('min-h-screen');
        
        // Check for possible overlap issues
        const headerHeight = data.match(/h-20/); // Header is 80px (h-20 = 5rem = 80px)
        const mainGrid = data.includes('grid-rows-[20px_1fr_20px]');
        
        console.log('🔍 페이지 가시성 분석:\n');
        console.log(`Header 존재: ${hasHeader ? '✅' : '❌'}`);
        console.log(`Main 컨텐츠 존재: ${hasMain ? '✅' : '❌'}`);
        console.log(`Next.js 로고: ${hasNextLogo ? '✅' : '❌'}`);
        console.log(`전체 화면 높이 설정: ${hasMinHeight ? '✅' : '❌'}`);
        console.log(`Header 높이: ${headerHeight ? '80px (h-20)' : '확인 불가'}`);
        console.log(`Main 그리드 레이아웃: ${mainGrid ? '✅' : '❌'}`);
        
        // Check for overlapping issue
        if (hasHeader && hasMain) {
          console.log('\n⚠️  문제 진단:');
          console.log('Header가 position:fixed가 아니고 일반 flow에 있어서');
          console.log('Main 컨텐츠가 Header 아래에 정상적으로 렌더링되어야 합니다.');
          console.log('하지만 Header의 배경색(bg-white)이 Main을 가리고 있을 수 있습니다.');
        }
        
        resolve({ hasHeader, hasMain, hasNextLogo });
      });
    });
  });
}

checkPageVisibility('http://localhost:3001/').then(result => {
  console.log('\n📊 결과:', result);
  
  if (result.hasHeader && result.hasMain) {
    console.log('\n✅ 페이지 구조는 정상입니다.');
    console.log('💡 해결 방안: Main 컨텐츠에 margin-top을 추가하거나,');
    console.log('   Header를 fixed position으로 변경하고 body에 padding-top을 추가해야 합니다.');
  }
});