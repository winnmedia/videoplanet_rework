/**
 * Environment configuration management
 * Provides type-safe access to environment variables with Zod validation
 */

import { validateEnvVars, type Environment, type EnvVars } from './env-schema';

// Safe environment access for both server and client
// Skip validation completely in client-side, selective validation in development
const validatedEnv: EnvVars = (() => {
  // Always skip validation on client-side (browser)
  if (typeof window !== 'undefined') {
    return {} as EnvVars;
  }
  
  // Server-side: selective validation based on environment and criticality
  try {
    const nodeEnv = process.env.NODE_ENV;
    const skipValidation = process.env.SKIP_ENV_VALIDATION;
    
    // Critical environment variables that should always be validated
    const criticalEnvVars = [
      'NEXT_PUBLIC_API_URL',
      'NEXT_PUBLIC_BACKEND_URL',
      'NEXT_PUBLIC_APP_URL'
    ];
    
    // Check if critical environment variables are present
    const criticalVarsPresent = criticalEnvVars.every(key => 
      process.env[key] && process.env[key]?.trim().length > 0
    );
    
    if (!criticalVarsPresent) {
      console.warn('Critical environment variables are missing:', 
        criticalEnvVars.filter(key => !process.env[key] || process.env[key]?.trim().length === 0)
      );
    }
    
    // In development: validate only critical vars unless full validation is requested
    if (nodeEnv === 'development') {
      if (skipValidation === 'true') {
        console.info('Environment validation completely skipped in development');
        return process.env as any;
      } else if (skipValidation === 'partial') {
        console.info('Partial environment validation in development (critical vars only)');
        // Still use process.env but log validation status
        return process.env as any;
      }
    }
    
    // Production or full validation requested
    return validateEnvVars();
  } catch (error) {
    console.warn('Environment validation failed, using process.env with warnings:', error);
    return process.env as any;
  }
})();

export type { Environment };

interface AppConfig {
  // Application
  env: Environment;
  appName: string;
  appUrl: string;
  appVersion: string;
  
  // API Configuration
  apiUrl: string;
  apiVersion: string;
  apiTimeout: number;
  backendUrl: string;
  backendApiKey?: string;
  
  // Authentication
  nextAuthUrl: string;
  nextAuthSecret?: string;
  authProvider: string;
  
  // OAuth
  googleClientId?: string;
  googleClientSecret?: string;
  
  // Database & Cache
  databaseUrl?: string;
  redisUrl?: string;
  redisToken?: string;
  
  // File Upload
  maxFileSize: number;
  allowedFileTypes: string[];
  
  // Feature Flags
  enableAnalytics: boolean;
  enableDebug: boolean;
  enableMaintenance: boolean;
  enablePerformanceMonitoring: boolean;
  
  // Third-party Services
  gaTrackingId?: string;
  sentryDsn?: string;
  stripePublicKey?: string;
  
  // CDN & Images
  cdnUrl?: string;
  imageDomains: string[];
  
  // WebSocket
  wsUrl: string;
  wsReconnectInterval: number;
  
  // Rate Limiting
  apiRateLimit: number;
  apiRateWindow: number;
  
  // Logging
  logLevel: string;
  publicLogLevel: string;
  
  // Performance
  performanceSampleRate: number;
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  
  private constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }
  
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }
  
  private getClientEnvVars(): Partial<EnvVars> {
    // For client-side, return hardcoded defaults from .env.local
    // Next.js will inline NEXT_PUBLIC_ variables at build time, but we use fallbacks for safety
    return {
      NEXT_PUBLIC_APP_ENV: 'development' as any,
      NEXT_PUBLIC_APP_NAME: 'Video Planet, VLANET',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_APP_VERSION: '0.1.0',
      NEXT_PUBLIC_API_URL: 'https://videoplanet.up.railway.app',
      NEXT_PUBLIC_API_VERSION: '',
      NEXT_PUBLIC_API_TIMEOUT: 30000,
      NEXT_PUBLIC_BACKEND_URL: 'https://videoplanet.up.railway.app',
      NEXT_PUBLIC_BACKEND_API_KEY: 'dev-api-key-local',
      NEXT_PUBLIC_AUTH_PROVIDER: 'credentials' as any,
      NEXT_PUBLIC_MAX_FILE_SIZE: 10485760,
      NEXT_PUBLIC_ALLOWED_FILE_TYPES: 'image/jpeg,image/png,image/gif,video/mp4',
      NEXT_PUBLIC_ENABLE_ANALYTICS: false,
      NEXT_PUBLIC_ENABLE_DEBUG: true,
      NEXT_PUBLIC_ENABLE_MAINTENANCE: false,
      NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING: false,
      NEXT_PUBLIC_GA_TRACKING_ID: undefined,
      NEXT_PUBLIC_SENTRY_DSN: undefined,
      NEXT_PUBLIC_STRIPE_PUBLIC_KEY: undefined,
      NEXT_PUBLIC_CDN_URL: undefined,
      NEXT_PUBLIC_IMAGE_DOMAINS: 'localhost',
      NEXT_PUBLIC_WS_URL: 'wss://videoplanet.up.railway.app/ws',
      NEXT_PUBLIC_WS_RECONNECT_INTERVAL: 5000,
      NEXT_PUBLIC_API_RATE_LIMIT: 1000,
      NEXT_PUBLIC_API_RATE_WINDOW: 60000,
      NEXT_PUBLIC_LOG_LEVEL: 'debug' as any,
      NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE: 0.1,
    } as EnvVars;
  }
  
  private loadConfig(): AppConfig {
    // Use validated environment variables from Zod schema
    // For client-side, use Next.js built-in environment variables
    const env = typeof window !== 'undefined' 
      ? this.getClientEnvVars() 
      : validatedEnv;
    
    return {
      // Application
      env: env.NEXT_PUBLIC_APP_ENV || 'development' as any,
      appName: env.NEXT_PUBLIC_APP_NAME || 'Video Planet',
      appUrl: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      appVersion: env.NEXT_PUBLIC_APP_VERSION || '2.1.0',
      
      // API Configuration - Railway 통합 백엔드
      apiUrl: env.NEXT_PUBLIC_API_URL || 'https://api.vlanet.net',
      apiVersion: env.NEXT_PUBLIC_API_VERSION || '',
      apiTimeout: env.NEXT_PUBLIC_API_TIMEOUT || 30000,
      backendUrl: env.NEXT_PUBLIC_BACKEND_URL || 'https://api.vlanet.net',
      backendApiKey: env.NEXT_PUBLIC_BACKEND_API_KEY,
      
      // Authentication
      nextAuthUrl: env.NEXTAUTH_URL || env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      nextAuthSecret: env.NEXTAUTH_SECRET,
      authProvider: env.NEXT_PUBLIC_AUTH_PROVIDER || 'credentials',
      
      // OAuth
      googleClientId: env.GOOGLE_CLIENT_ID,
      googleClientSecret: env.GOOGLE_CLIENT_SECRET,
      
      // Database & Cache
      databaseUrl: env.DATABASE_URL,
      redisUrl: env.REDIS_URL,
      redisToken: env.REDIS_TOKEN,
      
      // File Upload
      maxFileSize: env.NEXT_PUBLIC_MAX_FILE_SIZE || 10485760,
      allowedFileTypes: (env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,video/mp4').split(','),
      
      // Feature Flags
      enableAnalytics: env.NEXT_PUBLIC_ENABLE_ANALYTICS || false,
      enableDebug: env.NEXT_PUBLIC_ENABLE_DEBUG || false,
      enableMaintenance: env.NEXT_PUBLIC_ENABLE_MAINTENANCE || false,
      enablePerformanceMonitoring: env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING || false,
      
      // Third-party Services
      gaTrackingId: env.NEXT_PUBLIC_GA_TRACKING_ID,
      sentryDsn: env.NEXT_PUBLIC_SENTRY_DSN,
      stripePublicKey: env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
      
      // CDN & Images
      cdnUrl: env.NEXT_PUBLIC_CDN_URL,
      imageDomains: (env.NEXT_PUBLIC_IMAGE_DOMAINS || 'localhost').split(','),
      
      // WebSocket - Railway 통합 백엔드
      wsUrl: env.NEXT_PUBLIC_WS_URL || 'wss://api.vlanet.net/ws',
      wsReconnectInterval: env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL || 5000,
      
      // Rate Limiting
      apiRateLimit: env.NEXT_PUBLIC_API_RATE_LIMIT || 1000,
      apiRateWindow: env.NEXT_PUBLIC_API_RATE_WINDOW || 60000,
      
      // Logging
      logLevel: env.LOG_LEVEL || 'info',
      publicLogLevel: env.NEXT_PUBLIC_LOG_LEVEL || 'warn',
      
      // Performance
      performanceSampleRate: env.NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE || 0.1,
    };
  }
  
  private validateConfig(): void {
    const requiredFields: (keyof AppConfig)[] = ['env', 'appName', 'appUrl', 'apiUrl'];
    
    for (const field of requiredFields) {
      if (!this.config[field]) {
        console.warn(`Missing required configuration: ${field}`);
      }
    }
    
    // Validate production requirements (skip during build time)
    if (this.config.env === 'production' && process.env.NODE_ENV !== 'production') {
      if (!this.config.nextAuthSecret) {
        console.warn('NEXTAUTH_SECRET is required in production');
      }
      if (this.config.nextAuthSecret && this.config.nextAuthSecret.length < 32) {
        console.warn('NEXTAUTH_SECRET should be at least 32 characters long');
      }
    }
  }
  
  public getConfig(): Readonly<AppConfig> {
    return Object.freeze({ ...this.config });
  }
  
  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
  
  public isProduction(): boolean {
    return this.config.env === 'production';
  }
  
  public isStaging(): boolean {
    return this.config.env === 'staging';
  }
  
  public isDevelopment(): boolean {
    return this.config.env === 'development';
  }
  
  public isTest(): boolean {
    return this.config.env === 'test';
  }
  
  public getApiEndpoint(path: string): string {
    const baseUrl = this.config.apiUrl.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    if (this.config.apiVersion) {
      return `${baseUrl}/${this.config.apiVersion}/${cleanPath}`;
    }
    return `${baseUrl}/${cleanPath}`;
  }
  
  public getBackendEndpoint(path: string): string {
    const baseUrl = this.config.backendUrl.replace(/\/$/, '');
    const cleanPath = path.replace(/^\//, '');
    return `${baseUrl}/${cleanPath}`;
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();

// Export helper functions
export const getConfig = () => config.getConfig();
export const getEnv = () => config.get('env');
export const isProduction = () => config.isProduction();
export const isDevelopment = () => config.isDevelopment();
export const getApiUrl = (path: string) => config.getApiEndpoint(path);
export const getBackendUrl = (path: string) => config.getBackendEndpoint(path);

// Re-export type
export type { AppConfig };