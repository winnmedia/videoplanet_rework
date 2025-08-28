/**
 * Prettier Configuration for VRidge
 * Tailwind CSS integration and code formatting standards
 */

module.exports = {
  // Core formatting options
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  
  // React/JSX specific
  jsxSingleQuote: false,
  jsxBracketSameLine: false,
  arrowParens: 'avoid',
  
  // Tailwind CSS integration
  plugins: [
    '@tailwindcss/prettier-plugin'
  ],
  
  // Tailwind class sorting configuration
  tailwindConfig: './tailwind.config.ts',
  tailwindFunctions: ['clsx', 'cn', 'cva', 'className'],
  
  // File-specific overrides
  overrides: [
    {
      files: ['**/*.json'],
      options: {
        printWidth: 80
      }
    },
    {
      files: ['**/*.md', '**/*.mdx'],
      options: {
        printWidth: 80,
        proseWrap: 'preserve'
      }
    },
    {
      files: ['**/*.yml', '**/*.yaml'],
      options: {
        tabWidth: 2,
        singleQuote: false
      }
    }
  ]
};