/**
 * Stylelint Configuration for Legacy SCSS Files
 * 
 * 이 설정은 레거시 SCSS 파일들의 품질을 유지하면서
 * 신규 SCSS 파일 생성을 방지합니다.
 */

module.exports = {
  extends: [
    'stylelint-config-standard-scss',
    'stylelint-config-css-modules'
  ],
  
  plugins: [
    'stylelint-scss'
  ],
  
  rules: {
    // SCSS 관련 규칙 강화
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: ['tailwind', 'apply', 'screen', 'layer']
      }
    ],
    
    // !important 사용 금지 (매우 엄격)
    'declaration-no-important': true,
    
    // 중첩 깊이 제한
    'max-nesting-depth': [
      3,
      {
        ignore: ['blockless-at-rules', 'pseudo-classes']
      }
    ],
    
    // 선택자 복잡도 제한
    'selector-max-compound-selectors': 4,
    'selector-max-specificity': '0,4,0',
    
    // 색상 하드코딩 방지
    'color-no-hex': null, // 레거시에서는 허용하지만 경고
    'color-named': 'never',
    
    // 폰트 관련 규칙
    'font-weight-notation': 'numeric',
    
    // 단위 관련 규칙
    'length-zero-no-unit': true,
    'number-leading-zero': 'always',
    
    // 스타일링 품질 규칙
    'declaration-block-no-duplicate-properties': true,
    'block-no-empty': true,
    'comment-no-empty': true,
    
    // CSS Modules 관련
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['global', 'local']
      }
    ],
    
    // 레거시 호환성
    'at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'include',
          'mixin',
          'function',
          'if',
          'else',
          'for',
          'each',
          'while',
          'return'
        ]
      }
    ],
    
    // 미사용 규칙 감지
    'no-duplicate-selectors': true,
    'declaration-block-no-redundant-longhand-properties': true,
    
    // 접근성 관련 규칙
    'color-contrast': null, // 도구 제한으로 비활성화
    
    // 성능 관련 규칙
    'selector-max-id': 0, // ID 선택자 금지
    'selector-max-universal': 1,
    
    // 코드 스타일
    'indentation': 2,
    'string-quotes': 'single',
    
    // 레거시 파일에만 적용되는 경고
    'rule-empty-line-before': [
      'always-multi-line',
      {
        except: ['first-nested'],
        ignore: ['after-comment']
      }
    ]
  },
  
  overrides: [
    {
      // 전역 스타일 파일에 대한 완화된 규칙
      files: ['**/globals.css', '**/globals.scss'],
      rules: {
        'selector-max-id': null,
        'selector-max-specificity': null
      }
    },
    {
      // CSS Modules에 대한 특별 규칙
      files: ['**/*.module.scss'],
      rules: {
        'selector-class-pattern': '^[a-z][a-zA-Z0-9]*$', // camelCase 강제
        'custom-property-pattern': '^[a-z][a-zA-Z0-9]*$'
      }
    }
  ],
  
  ignoreFiles: [
    'node_modules/**/*',
    '.next/**/*',
    'dist/**/*',
    'build/**/*',
    '**/*.js',
    '**/*.ts',
    '**/*.tsx'
  ]
};