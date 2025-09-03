/**
 * Service Worker registration and management
 * Enhances caching and offline capabilities for performance
 */

export interface ServiceWorkerConfig {
  swUrl: string;
  scope?: string;
  enableInDevelopment: boolean;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
  updateCheckInterval?: number;
}

class ServiceWorkerManager {
  private config: ServiceWorkerConfig;
  private registration: ServiceWorkerRegistration | null = null;
  private updateCheckTimer?: NodeJS.Timeout;

  constructor(config: ServiceWorkerConfig) {
    this.config = config;
  }

  /**
   * Register service worker
   */
  public async register(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('[SW] Service Worker not supported');
      return null;
    }

    // Skip registration in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !this.config.enableInDevelopment) {
      console.log('[SW] Service Worker disabled in development');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register(
        this.config.swUrl,
        { scope: this.config.scope || '/' }
      );

      console.log('[SW] Service Worker registered:', this.registration.scope);

      // Set up event listeners
      this.setupEventListeners();

      // Set up periodic update checks
      this.setupUpdateChecks();

      // Notify success
      this.config.onSuccess?.(this.registration);

      return this.registration;
    } catch (error) {
      const swError = new Error(`Service Worker registration failed: ${error}`);
      console.error('[SW]', swError.message);
      this.config.onError?.(swError);
      return null;
    }
  }

  /**
   * Set up service worker event listeners
   */
  private setupEventListeners(): void {
    if (!this.registration) return;

    // Handle installation
    this.registration.addEventListener('updatefound', () => {
      const installingWorker = this.registration?.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content available
            console.log('[SW] New content available');
            this.config.onUpdate?.(this.registration!);
          } else {
            // Content cached for offline use
            console.log('[SW] Content cached for offline use');
            this.config.onSuccess?.(this.registration!);
          }
        }
      });
    });

    // Handle controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW] Controller changed - reloading page');
      window.location.reload();
    });

    // Handle messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });
  }

  /**
   * Set up periodic update checks
   */
  private setupUpdateChecks(): void {
    if (!this.config.updateCheckInterval || !this.registration) return;

    this.updateCheckTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.config.updateCheckInterval);
  }

  /**
   * Check for service worker updates
   */
  public async checkForUpdates(): Promise<void> {
    if (!this.registration) return;

    try {
      await this.registration.update();
    } catch (error) {
      console.error('[SW] Update check failed:', error);
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  public skipWaiting(): void {
    if (!this.registration?.waiting) return;

    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  /**
   * Send message to service worker
   */
  public sendMessage(message: any): void {
    if (!this.registration?.active) return;

    this.registration.active.postMessage(message);
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(message: any): void {
    const { type, data } = message;

    switch (type) {
      case 'CACHE_UPDATED':
        console.log('[SW] Cache updated:', data);
        break;
        
      case 'CACHE_ERROR':
        console.error('[SW] Cache error:', data);
        break;
        
      default:
        console.log('[SW] Received message:', message);
    }
  }

  /**
   * Cache specific URLs for performance
   */
  public cacheUrls(urls: string[]): void {
    this.sendMessage({
      type: 'CACHE_URLS',
      data: { urls }
    });
  }

  /**
   * Preload critical resources
   */
  public preloadCriticalResources(urls: string[]): void {
    this.sendMessage({
      type: 'PRELOAD_CRITICAL',
      data: { urls }
    });
  }

  /**
   * Clear specific cache
   */
  public clearCache(cacheName: string): void {
    this.sendMessage({
      type: 'CLEAR_CACHE',
      data: { cacheName }
    });
  }

  /**
   * Unregister service worker
   */
  public async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      // Clear update check timer
      if (this.updateCheckTimer) {
        clearInterval(this.updateCheckTimer);
        this.updateCheckTimer = undefined;
      }

      const result = await this.registration.unregister();
      this.registration = null;
      
      console.log('[SW] Service Worker unregistered');
      return result;
    } catch (error) {
      console.error('[SW] Failed to unregister:', error);
      return false;
    }
  }

  /**
   * Get registration status
   */
  public getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Check if service worker is ready
   */
  public isReady(): boolean {
    return !!this.registration?.active;
  }
}

// Singleton instance
let serviceWorkerManager: ServiceWorkerManager | null = null;

/**
 * Initialize service worker with configuration
 */
export function initServiceWorker(config: Partial<ServiceWorkerConfig> = {}): ServiceWorkerManager {
  const defaultConfig: ServiceWorkerConfig = {
    swUrl: '/sw.js',
    scope: '/',
    enableInDevelopment: false,
    updateCheckInterval: 60000, // Check for updates every minute
  };

  const finalConfig = { ...defaultConfig, ...config };

  if (!serviceWorkerManager) {
    serviceWorkerManager = new ServiceWorkerManager(finalConfig);
  }

  return serviceWorkerManager;
}

/**
 * Register service worker with default configuration
 */
export async function registerServiceWorker(
  config: Partial<ServiceWorkerConfig> = {}
): Promise<ServiceWorkerRegistration | null> {
  const manager = initServiceWorker(config);
  return await manager.register();
}

/**
 * Get current service worker manager
 */
export function getServiceWorkerManager(): ServiceWorkerManager | null {
  return serviceWorkerManager;
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!serviceWorkerManager) return false;
  
  const result = await serviceWorkerManager.unregister();
  serviceWorkerManager = null;
  return result;
}

export { ServiceWorkerManager };