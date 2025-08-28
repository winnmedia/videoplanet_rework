/**
 * Next.js Configuration for VRidge
 * Production-safe settings with quality gates enabled
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript and ESLint validation (CRITICAL: Keep enabled for production safety)
  typescript: {
    // Only ignore during emergency hotfix builds
    ignoreBuildErrors: process.env.EMERGENCY_BUILD === 'true'
  },
  eslint: {
    // Only ignore during emergency hotfix builds
    ignoreDuringBuilds: process.env.EMERGENCY_BUILD === 'true',
    dirs: ['app', 'features', 'entities', 'shared', 'widgets', 'processes']
  },

  // Build optimizations - Tailwind-only mode
  experimental: {
    // optimizeCss: true // Disabled temporarily due to critters module issue
  },
  compress: true,
  
  // Image optimization
  images: {
    domains: process.env.NEXT_PUBLIC_IMAGE_DOMAINS?.split(',') || ['localhost'],
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  },

  // Webpack configuration
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer in development
    if (dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'server',
          openAnalyzer: true
        })
      );
    }

    // Production optimizations
    if (!dev) {
      // Tree shaking optimization
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;

      // Bundle splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      };
    }

    return config;
  },

  // Output configuration for deployment
  output: 'standalone',
  
  // Environment variable validation
  env: {
    // Validate critical environment variables at build time
    CUSTOM_KEY: process.env.CUSTOM_KEY || 'default'
  }
};

// Development-specific warnings
if (process.env.NODE_ENV === 'development') {
  console.warn('🔧 Development mode: Quality gates are enforced');
  
  if (process.env.EMERGENCY_BUILD === 'true') {
    console.error('⚠️  EMERGENCY BUILD MODE: Quality gates bypassed!');
    console.error('⚠️  This should ONLY be used for hotfix deployments!');
  }
}

module.exports = nextConfig;
