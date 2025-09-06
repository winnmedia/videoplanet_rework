module.exports = {
  // TypeScript and React files
  '**/*.{ts,tsx}': [
    // 1. ESLint with FSD boundary rules
    'eslint --fix --max-warnings=0',
    
    // 2. Prettier with Tailwind plugin
    'prettier --write --plugin=prettier-plugin-tailwindcss',
    
    // 3. TypeScript check (no-emit)
    () => 'tsc --noEmit',
    
    // 4. Run related unit tests
    (filenames) => {
      const testFiles = filenames
        .filter(file => !file.includes('.test.') && !file.includes('.spec.'))
        .map(file => {
          // Try multiple test file patterns
          const patterns = [
            file.replace(/\.(ts|tsx)$/, '.test.$1'),
            file.replace(/\.(ts|tsx)$/, '.spec.$1'),
            file.replace(/\.tsx?$/, '.test.ts'),
            file.replace(/\.tsx?$/, '.test.tsx')
          ];
          const fs = require('fs'); return patterns.find(pattern => fs.existsSync(pattern));
        })
        .filter(Boolean);
      
      return testFiles.length > 0 
        ? `vitest run ${testFiles.join(' ')} --reporter=basic`
        : '';
    }
  ],
  
  // JavaScript files
  '**/*.{js,jsx}': [
    'eslint --fix --max-warnings=0',
    'prettier --write'
  ],
  
  // SCSS files (legacy) - strict validation
  '**/*.scss': [
    // Check for violations before allowing commit
    (filenames) => {
      // Prevent new SCSS files
      const newFiles = filenames.filter(file => {
        try {
          const { execSync } = require('child_process'); execSync(`git log --oneline -n 1 --pretty=format: --name-status HEAD | grep "^A" | grep "${file}"`, { stdio: 'pipe' });
          return true;
        } catch {
          return false;
        }
      });
      
      if (newFiles.length > 0) {
        throw new Error(`❌ New SCSS files detected: ${newFiles.join(', ')}. Use Tailwind CSS instead!`);
      }
      
      return 'stylelint --fix';
    }
  ],
  
  // JSON files
  '**/*.json': [
    'prettier --write'
  ],
  
  // Markdown files
  '**/*.md': [
    'prettier --write'
  ],
  
  // Package.json validation
  'package.json': [
    // Validate package.json structure
    () => 'node -e "JSON.parse(require(\'fs\').readFileSync(\'package.json\', \'utf8\'))"',
    'prettier --write'
  ]
};