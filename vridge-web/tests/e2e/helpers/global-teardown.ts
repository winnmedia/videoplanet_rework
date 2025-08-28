/**
 * Playwright 전역 해제 설정
 */

async function globalTeardown() {
  // 정리 작업이 필요한 경우 여기에 구현
  console.log('E2E 테스트 전역 해제 완료');
}

export default globalTeardown;