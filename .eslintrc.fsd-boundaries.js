module.exports = {
  extends: ['./.eslintrc.js'],
  plugins: ['boundaries'],
  settings: {
    'boundaries/elements': [
      {
        type: 'app',
        pattern: 'app/**/*',
        mode: 'folder'
      },
      {
        type: 'processes', 
        pattern: 'processes/**/*',
        mode: 'folder'
      },
      {
        type: 'pages',
        pattern: 'pages/**/*',
        mode: 'folder'
      },
      {
        type: 'widgets',
        pattern: 'widgets/**/*',
        mode: 'folder'
      },
      {
        type: 'features',
        pattern: 'features/**/*',
        mode: 'folder'
      },
      {
        type: 'entities',
        pattern: 'entities/**/*',
        mode: 'folder'
      },
      {
        type: 'shared',
        pattern: 'shared/**/*',
        mode: 'folder'
      }
    ],
    'boundaries/ignore': [
      '**/*.test.*',
      '**/*.spec.*',
      '**/*.stories.*',
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**'
    ]
  },
  rules: {
    'boundaries/element-types': [2, {
      default: 'disallow',
      rules: [
        // App layer can import from all layers
        {
          from: 'app',
          allow: ['processes', 'pages', 'widgets', 'features', 'entities', 'shared']
        },
        // Processes can import from pages down
        {
          from: 'processes',
          allow: ['pages', 'widgets', 'features', 'entities', 'shared']
        },
        // Pages can import from widgets down
        {
          from: 'pages',
          allow: ['widgets', 'features', 'entities', 'shared']
        },
        // Widgets can import from features down
        {
          from: 'widgets',
          allow: ['features', 'entities', 'shared']
        },
        // Features can import from entities and shared
        {
          from: 'features',
          allow: ['entities', 'shared']
        },
        // Entities can only import from shared
        {
          from: 'entities',
          allow: ['shared']
        },
        // Shared cannot import from other layers
        {
          from: 'shared',
          allow: []
        }
      ]
    }],
    // Prevent relative imports that skip layers
    'boundaries/no-private': [2, {
      default: 'disallow'
    }],
    // Force public API usage
    'boundaries/entry-point': [2, {
      default: 'index.*',
      rules: [
        {
          target: ['shared', 'entities', 'features', 'widgets'],
          allow: 'index.*'
        }
      ]
    }],
    // Custom rule: No relative imports going up directories
    'no-restricted-imports': [2, {
      patterns: [
        {
          group: ['../*', '../../*', '../../../*'],
          message: 'Relative imports that go up directories are forbidden. Use absolute imports or proper Public API imports instead.'
        },
        {
          group: ['**/lib/**', '**/model/**', '**/api/**', '**/ui/**'],
          message: 'Direct imports from internal folders are forbidden. Use the Public API (index.ts) instead.'
        }
      ]
    }]
  },
  overrides: [
    {
      files: ['**/*.test.*', '**/*.spec.*'],
      rules: {
        'boundaries/element-types': 'off',
        'boundaries/no-private': 'off',
        'no-restricted-imports': 'off'
      }
    }
  ]
};