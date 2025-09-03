module.exports = [
  // Main application bundle
  {
    name: 'Main App Bundle',
    path: '.next/static/chunks/pages/_app-*.js',
    limit: '150 KB'
  },
  
  // Individual page bundles
  {
    name: 'Homepage',
    path: '.next/static/chunks/pages/index-*.js',
    limit: '50 KB'
  },
  
  {
    name: 'Authentication Pages',
    path: '.next/static/chunks/pages/auth/**/*.js',
    limit: '80 KB'
  },
  
  {
    name: 'Video Upload Pages',
    path: '.next/static/chunks/pages/video/**/*.js',
    limit: '120 KB'
  },
  
  // Shared chunks
  {
    name: 'Framework Chunk',
    path: '.next/static/chunks/framework-*.js',
    limit: '200 KB'
  },
  
  {
    name: 'Vendor Libraries',
    path: '.next/static/chunks/vendors~*.js',
    limit: '300 KB'
  },
  
  // CSS bundles
  {
    name: 'Global CSS',
    path: '.next/static/css/*.css',
    limit: '20 KB'
  },
  
  // Total size limit
  {
    name: 'Total Bundle Size',
    path: '.next/static/**/*.{js,css}',
    limit: '1 MB'
  }
]