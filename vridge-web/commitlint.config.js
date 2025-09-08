const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce conventional commit format
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation changes
        'style', // Code style changes (formatting, missing semi-colons, etc)
        'refactor', // Code refactoring
        'perf', // Performance improvements
        'test', // Adding or modifying tests
        'chore', // Maintenance tasks
        'ci', // CI/CD changes
        'build', // Build system changes
        'revert', // Reverting changes
      ],
    ],

    // Subject case and length rules
    'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 72],
    'subject-min-length': [2, 'always', 10],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],

    // Body rules
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],

    // Footer rules
    'footer-leading-blank': [2, 'always'],

    // Scope rules for FSD layers
    'scope-enum': [
      2,
      'always',
      [
        // FSD Layers
        'app',
        'processes',
        'pages',
        'widgets',
        'features',
        'entities',
        'shared',

        // Specific feature domains
        'auth',
        'dashboard',
        'calendar',
        'projects',
        'feedback',
        'planning',
        'video',

        // Technical domains
        'api',
        'ui',
        'config',
        'tests',
        'ci',
        'deps',
        'security',

        // Release related
        'release',
        'hotfix',
      ],
    ],
  },

  // Custom plugins for VRidge specific rules
  plugins: [
    {
      rules: {
        // Ensure FSD layer is mentioned in scope or subject
        'fsd-layer-mention': parsed => {
          const fsdLayers = ['app', 'processes', 'pages', 'widgets', 'features', 'entities', 'shared']
          const { scope, subject } = parsed

          const layerMentioned = fsdLayers.some(
            layer => (scope && scope.includes(layer)) || (subject && subject.toLowerCase().includes(layer))
          )

          // Skip validation for docs, chore, ci commits
          if (['docs', 'chore', 'ci', 'build'].includes(parsed.type)) {
            return [true]
          }

          return layerMentioned ? [true] : [false, 'Commit should mention affected FSD layer in scope or subject']
        },
      },
    },
  ],
}

module.exports = config
