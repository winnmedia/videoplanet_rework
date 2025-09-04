/**
 * ESLint Configuration for Styling Conflict Prevention
 * 
 * 이 설정은 Tailwind CSS와 레거시 SCSS 간의 충돌을 방지하고
 * 신규 코드의 스타일링 일관성을 강제합니다.
 */

module.exports = {
  plugins: ['@stylistic'],
  rules: {
    // Tailwind CSS 관련 규칙
    'no-restricted-syntax': [
      'error',
      {
        // Tailwind arbitrary values 금지
        selector: "TemplateElement[value.raw=*'[']",
        message: "Tailwind arbitrary values (like w-[123px]) are prohibited. Use design tokens instead."
      },
      {
        // styled-components 사용 금지
        selector: "CallExpression[callee.object.name='styled']",
        message: "styled-components is deprecated. Use Tailwind CSS classes instead."
      },
      {
        // @apply 사용 금지
        selector: "AtRule[name='apply']",
        message: "@apply directive is prohibited. Use Tailwind classes directly in components."
      }
    ],
    
    // Import 규칙 - 스타일링 관련
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'styled-components',
            message: 'styled-components is deprecated. Use Tailwind CSS instead.'
          },
          {
            name: '@emotion/styled',
            message: 'Emotion styled is deprecated. Use Tailwind CSS instead.'
          },
          {
            name: '@emotion/react',
            message: 'Emotion is deprecated. Use Tailwind CSS instead.'
          }
        ],
        patterns: [
          {
            group: ['*.scss', '*.sass'],
            message: 'Direct SCSS imports in new code are prohibited. Use Tailwind CSS classes.'
          }
        ]
      }
    ]
  },
  overrides: [
    {
      // 신규 TypeScript/React 파일에 대한 엄격한 규칙
      files: ['**/*.{ts,tsx}'],
      excludedFiles: [
        // 레거시 파일 제외 (기존 SCSS 사용 파일들)
        '**/*.module.scss',
        '**/features/auth/**/*.tsx', // 레거시 auth 컴포넌트
        '**/widgets/**/ui/*.tsx', // 일부 위젯의 레거시 UI
        '**/shared/ui/**/*.tsx' // 일부 공유 UI 컴포넌트
      ],
      rules: {
        // className prop validation
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            varsIgnorePattern: '^(clsx|cn|cva)$'
          }
        ]
      }
    },
    {
      // 레거시 파일들에 대한 제한된 규칙
      files: [
        '**/features/auth/**/*.tsx',
        '**/widgets/**/ui/*.tsx',
        '**/shared/ui/**/*.tsx'
      ],
      rules: {
        // 레거시 파일에서는 SCSS import 허용하지만 경고
        'no-restricted-imports': [
          'warn',
          {
            patterns: [
              {
                group: ['styled-components', '@emotion/*'],
                message: 'Consider migrating to Tailwind CSS for better consistency.'
              }
            ]
          }
        ],
        
        // 새로운 styled-components 사용은 금지
        'no-restricted-syntax': [
          'error',
          {
            selector: "CallExpression[callee.object.name='styled']",
            message: "Adding new styled-components is prohibited. Use existing SCSS modules or migrate to Tailwind."
          }
        ]
      }
    },
    {
      // SCSS 파일에 대한 특별 규칙
      files: ['**/*.scss'],
      parser: '@typescript-eslint/parser',
      rules: {
        // 새로운 SCSS 파일 생성 감지
        'no-restricted-globals': [
          'error',
          {
            name: 'document',
            message: 'New SCSS files should not be created. Use Tailwind CSS instead.'
          }
        ]
      }
    }
  ]
};