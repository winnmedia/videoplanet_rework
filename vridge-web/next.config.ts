import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // SWC minification for faster builds
  swcMinify: true,
  
  // Image optimization configuration
  images: {
    domains: process.env.NEXT_PUBLIC_IMAGE_DOMAINS?.split(',') || ['localhost'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Environment variables validation
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '0.1.0',
  },
  
  // Headers configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
        ],
      },
    ];
  },
  
  // Redirects configuration
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // Rewrites for API proxy
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'}/:path*`,
      },
    ];
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Add custom webpack configurations here if needed
    
    // Example: Add alias for easier imports
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': './src',
      '@components': './src/components',
      '@lib': './lib',
      '@styles': './styles',
    };
    
    return config;
  },
  
  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      enabled: true,
    },
  },
  
  // Output configuration for deployment
  output: process.env.STANDALONE === 'true' ? 'standalone' : undefined,
  
  // PoweredByHeader
  poweredByHeader: false,
  
  // Compress
  compress: true,
  
  // Generate build ID
  generateBuildId: async () => {
    return process.env.BUILD_ID || `build-${Date.now()}`;
  },
};

export default nextConfig;
