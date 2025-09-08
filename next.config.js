/**
 * Next.js Configuration for VRidge - Simplified for Emergency Deployment
 * All complex webpack configurations removed to prevent runtime errors
 */

const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript and ESLint validation - 런타임 오류 사전 차단
  typescript: {
    // 빌드 시 TypeScript 오류 검증 활성화 (런타임 500 오류 예방)
    ignoreBuildErrors: false,
  },
  eslint: {
    // 빌드 시 ESLint 검증 활성화 (코드 품질 보장)
    ignoreDuringBuilds: false,
  },

  // Railway 배포를 위한 standalone 출력 설정
  output: 'standalone',

  // Performance optimizations with proper asset handling
  experimental: {
    optimizeCss: true,
    serverSourceMaps: false,
    webpackBuildWorker: false,
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
        port: '',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    unoptimized: false,
  },

  // Enhanced security headers and MIME type enforcement
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/_next/static/css/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/js/(.*)',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ]
  },

  // Simplified webpack configuration
  webpack: config => {
    // FSD path aliases matching tsconfig.json structure
    config.resolve.alias = {
      ...config.resolve.alias,
      // Legacy compatibility
      '@': path.resolve(__dirname),

      // FSD Layer aliases (with wildcard support)
      '@app': path.resolve(__dirname, 'app'),
      '@processes': path.resolve(__dirname, 'processes'),
      '@widgets': path.resolve(__dirname, 'widgets'),
      '@features': path.resolve(__dirname, 'features'),
      '@entities': path.resolve(__dirname, 'entities'),
      '@shared': path.resolve(__dirname, 'shared'),

      // Standard FSD aliases (@ prefix 없는 형태)
      app: path.resolve(__dirname, 'app'),
      processes: path.resolve(__dirname, 'processes'),
      widgets: path.resolve(__dirname, 'widgets'),
      features: path.resolve(__dirname, 'features'),
      entities: path.resolve(__dirname, 'entities'),
      shared: path.resolve(__dirname, 'shared'),
    }

    return config
  },

  // Environment validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY || 'default',
  },
}

module.exports = nextConfig
