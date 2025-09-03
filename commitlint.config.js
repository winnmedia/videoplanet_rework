module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 새로운 기능
        'fix',      // 버그 수정
        'docs',     // 문서 변경
        'style',    // 코드 스타일 변경 (기능에 영향 없음)
        'refactor', // 코드 리팩토링
        'test',     // 테스트 추가 또는 수정
        'chore',    // 빌드 프로세스 또는 보조 도구 변경
        'perf',     // 성능 개선
        'ci',       // CI 설정 변경
        'build',    // 빌드 시스템 변경
        'revert'    // 커밋 되돌리기
      ]
    ],
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 200],
    'footer-max-line-length': [2, 'always', 200]
  }
}