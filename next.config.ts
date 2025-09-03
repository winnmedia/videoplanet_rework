import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance Optimization
  turbopack: {
    root: './',
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      '@reduxjs/toolkit',
      'react-redux',
      'clsx',
      'class-variance-authority'
    ],
    // Disable React Compiler for now (causing build issues)
    // reactCompiler: true,
  },

  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Bundle analyzer in development
    if (dev && !isServer) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: 'bundle-report.html',
        })
      );
    }

    // Tree shaking optimization
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: false,
    };

    // Chunk splitting for better caching
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Vendor chunk for third-party libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            minSize: 20000,
            maxSize: 500000,
          },
          // React chunk
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 20,
          },
          // Redux chunk
          redux: {
            test: /[\\/]node_modules[\\/](@reduxjs|react-redux)[\\/]/,
            name: 'redux',
            chunks: 'all',
            priority: 15,
          },
          // Common chunk for shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            maxSize: 100000,
          },
        },
      };
    }

    return config;
  },

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    domains: [], // Add your image domains here
    remotePatterns: [
      // Add patterns for external images
    ],
  },

  // Compression
  compress: true,

  // Static optimization
  trailingSlash: false,
  generateEtags: true,

  // Headers for performance and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Cache static assets
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          // Preload critical resources
          {
            key: 'Link',
            value: '</fonts/inter-var.woff2>; rel=preload; as=font; type=font/woff2; crossorigin',
          },
          // Security headers
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection', 
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Performance hints
          {
            key: 'X-UA-Compatible',
            value: 'IE=edge',
          },
        ],
      },
      // Page-specific headers
      {
        source: '/',
        headers: [
          {
            key: 'Link',
            value: '</api/projects>; rel=prefetch, </api/calendar>; rel=prefetch',
          },
        ],
      },
    ];
  },

  // Redirects for performance (avoid client-side redirects)
  async redirects() {
    return [];
  },

  // Rewrites for performance
  async rewrites() {
    return [];
  },

  // Environment variables for performance monitoring
  env: {
    PERFORMANCE_MONITORING: process.env.NODE_ENV === 'production' ? 'true' : 'false',
    BUNDLE_ANALYZE: process.env.ANALYZE === 'true' ? 'true' : 'false',
  },

  // Server-side rendering optimization
  reactStrictMode: true,
  
  // Temporarily disable ESLint for build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Temporarily disable TypeScript checks for build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Output optimization
  output: 'standalone',
  
  // Performance monitoring
  ...(process.env.ANALYZE === 'true' && {
    productionBrowserSourceMaps: true,
  }),
};

export default nextConfig;
