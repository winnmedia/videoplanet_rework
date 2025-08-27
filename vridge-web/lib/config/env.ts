/**
 * Environment configuration management
 * Provides type-safe access to environment variables
 */

export type Environment = 'development' | 'staging' | 'production' | 'test';

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
  
  private loadConfig(): AppConfig {
    const env = (process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'development') as Environment;
    
    return {
      // Application
      env,
      appName: process.env.NEXT_PUBLIC_APP_NAME || 'VRidge',
      appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
      
      // API Configuration
      apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      apiVersion: process.env.NEXT_PUBLIC_API_VERSION || 'v1',
      apiTimeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
      backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
      backendApiKey: process.env.NEXT_PUBLIC_BACKEND_API_KEY,
      
      // Authentication
      nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      nextAuthSecret: process.env.NEXTAUTH_SECRET,
      authProvider: process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'credentials',
      
      // OAuth
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
      
      // Database & Cache
      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
      redisToken: process.env.REDIS_TOKEN,
      
      // File Upload
      maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760', 10),
      allowedFileTypes: (process.env.NEXT_PUBLIC_ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif,video/mp4').split(','),
      
      // Feature Flags
      enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
      enableDebug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
      enableMaintenance: process.env.NEXT_PUBLIC_ENABLE_MAINTENANCE === 'true',
      enablePerformanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
      
      // Third-party Services
      gaTrackingId: process.env.NEXT_PUBLIC_GA_TRACKING_ID,
      sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      stripePublicKey: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY,
      
      // CDN & Images
      cdnUrl: process.env.NEXT_PUBLIC_CDN_URL,
      imageDomains: (process.env.NEXT_PUBLIC_IMAGE_DOMAINS || 'localhost').split(','),
      
      // WebSocket
      wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws',
      wsReconnectInterval: parseInt(process.env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL || '5000', 10),
      
      // Rate Limiting
      apiRateLimit: parseInt(process.env.NEXT_PUBLIC_API_RATE_LIMIT || '100', 10),
      apiRateWindow: parseInt(process.env.NEXT_PUBLIC_API_RATE_WINDOW || '60000', 10),
      
      // Logging
      logLevel: process.env.LOG_LEVEL || 'info',
      publicLogLevel: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
      
      // Performance
      performanceSampleRate: parseFloat(process.env.NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE || '0.1'),
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
    return `${baseUrl}/${this.config.apiVersion}/${cleanPath}`;
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