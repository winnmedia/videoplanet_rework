import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: ['./test/setup.ts'],
    
    // Global test configuration
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.config.*',
        '**/*.d.ts',
        '.next/',
        'public/',
        '**/__mocks__/**',
      ],
      thresholds: {
        branches: 50,
        functions: 50,
        lines: 50,
        statements: 50,
      },
      all: true,
      clean: true,
    },
    
    // Test matching patterns
    include: [
      '**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      '.next',
      'dist',
      'build',
      'coverage',
    ],
    
    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    
    // Reporter configuration
    reporters: ['verbose'],
    
    // Test timeout
    testTimeout: 10000,
    
    // Watch mode configuration
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/.next/**'],
  },
  
  // Path aliases matching tsconfig.json
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@app': path.resolve(__dirname, './app'),
      '@processes': path.resolve(__dirname, './processes'),
      '@widgets': path.resolve(__dirname, './widgets'),
      '@features': path.resolve(__dirname, './features'),
      '@entities': path.resolve(__dirname, './entities'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
})