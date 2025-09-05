/**
 * Network Connectivity Monitor
 * 네트워크 연결성 감지 및 복구 시스템
 */

export enum NetworkStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SLOW = 'slow',
  UNKNOWN = 'unknown'
}

export interface NetworkInfo {
  status: NetworkStatus;
  effectiveType: string;
  downlink: number;
  rtt: number;
  timestamp: string;
}

export interface NetworkStatusChangeEvent {
  previous: NetworkStatus;
  current: NetworkStatus;
  info: NetworkInfo;
  recoveryTime?: number; // ms
}

export class NetworkMonitor {
  private static instance: NetworkMonitor;
  private currentStatus: NetworkStatus = NetworkStatus.UNKNOWN;
  private listeners: Set<(event: NetworkStatusChangeEvent) => void> = new Set();
  private lastOnlineTime: number = Date.now();
  private lastOfflineTime: number = 0;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private retryQueue: Map<string, () => Promise<void>> = new Map();

  private constructor() {
    this.initializeMonitoring();
  }

  static getInstance(): NetworkMonitor {
    if (!NetworkMonitor.instance) {
      NetworkMonitor.instance = new NetworkMonitor();
    }
    return NetworkMonitor.instance;
  }

  /**
   * 네트워크 모니터링 초기화
   */
  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    // 브라우저 네트워크 이벤트 리스너
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // 초기 상태 설정
    this.updateNetworkStatus();

    // 주기적 연결성 체크 (30초마다)
    this.startHealthChecks();

    // 연결 품질 모니터링
    this.startQualityMonitoring();
  }

  /**
   * 현재 네트워크 상태 업데이트
   */
  private async updateNetworkStatus(): Promise<void> {
    const previousStatus = this.currentStatus;
    
    try {
      // 기본 브라우저 API 체크
      if (!navigator.onLine) {
        this.currentStatus = NetworkStatus.OFFLINE;
      } else {
        // 실제 연결성 테스트
        const isConnected = await this.performConnectivityTest();
        if (isConnected) {
          const quality = await this.assessConnectionQuality();
          this.currentStatus = quality === 'slow' ? NetworkStatus.SLOW : NetworkStatus.ONLINE;
        } else {
          this.currentStatus = NetworkStatus.OFFLINE;
        }
      }
    } catch (error) {
      console.warn('Network status check failed:', error);
      this.currentStatus = NetworkStatus.UNKNOWN;
    }

    // 상태 변경 알림
    if (previousStatus !== this.currentStatus) {
      this.notifyStatusChange(previousStatus, this.currentStatus);
    }
  }

  /**
   * 실제 연결성 테스트
   */
  private async performConnectivityTest(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * 연결 품질 평가
   */
  private async assessConnectionQuality(): Promise<'fast' | 'slow'> {
    try {
      const startTime = Date.now();
      await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const responseTime = Date.now() - startTime;

      // 2초 이상이면 느린 연결로 판단
      return responseTime > 2000 ? 'slow' : 'fast';
    } catch {
      return 'slow';
    }
  }

  /**
   * 온라인 상태 핸들러
   */
  private async handleOnline(): Promise<void> {
    const offlineDuration = this.lastOfflineTime > 0 
      ? Date.now() - this.lastOfflineTime 
      : 0;

    this.lastOnlineTime = Date.now();
    
    console.log('🌐 Network connection restored');
    if (offlineDuration > 0) {
      console.log(`⏱️ Was offline for ${Math.round(offlineDuration / 1000)}s`);
    }

    await this.updateNetworkStatus();
    await this.processRetryQueue();
  }

  /**
   * 오프라인 상태 핸들러
   */
  private handleOffline(): void {
    this.lastOfflineTime = Date.now();
    console.log('🚫 Network connection lost');
    
    this.currentStatus = NetworkStatus.OFFLINE;
    this.notifyStatusChange(NetworkStatus.ONLINE, NetworkStatus.OFFLINE);
  }

  /**
   * 주기적 건강성 체크 시작
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.updateNetworkStatus();
    }, 30000); // 30초
  }

  /**
   * 연결 품질 모니터링 시작 (네트워크 정보 API 사용)
   */
  private startQualityMonitoring(): void {
    if (!('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    if (!connection) return;

    const checkQuality = () => {
      const info = this.getNetworkInfo();
      
      // 연결 속도가 너무 느리면 SLOW 상태로 변경
      if (info.downlink < 0.5 || info.rtt > 2000) {
        if (this.currentStatus === NetworkStatus.ONLINE) {
          this.currentStatus = NetworkStatus.SLOW;
          this.notifyStatusChange(NetworkStatus.ONLINE, NetworkStatus.SLOW);
        }
      } else if (this.currentStatus === NetworkStatus.SLOW) {
        this.currentStatus = NetworkStatus.ONLINE;
        this.notifyStatusChange(NetworkStatus.SLOW, NetworkStatus.ONLINE);
      }
    };

    connection.addEventListener('change', checkQuality);
    checkQuality(); // 초기 체크
  }

  /**
   * 네트워크 정보 조회
   */
  getNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection;
    
    return {
      status: this.currentStatus,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 현재 네트워크 상태 조회
   */
  getStatus(): NetworkStatus {
    return this.currentStatus;
  }

  /**
   * 온라인 여부 확인
   */
  isOnline(): boolean {
    return this.currentStatus === NetworkStatus.ONLINE || this.currentStatus === NetworkStatus.SLOW;
  }

  /**
   * 상태 변경 리스너 등록
   */
  addStatusChangeListener(
    listener: (event: NetworkStatusChangeEvent) => void
  ): () => void {
    this.listeners.add(listener);
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 상태 변경 알림
   */
  private notifyStatusChange(previous: NetworkStatus, current: NetworkStatus): void {
    const recoveryTime = previous === NetworkStatus.OFFLINE && current === NetworkStatus.ONLINE
      ? Date.now() - this.lastOfflineTime
      : undefined;

    const event: NetworkStatusChangeEvent = {
      previous,
      current,
      info: this.getNetworkInfo(),
      recoveryTime
    };

    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  /**
   * 재시도 큐에 작업 추가
   */
  addToRetryQueue(key: string, operation: () => Promise<void>): void {
    this.retryQueue.set(key, operation);
  }

  /**
   * 재시도 큐에서 작업 제거
   */
  removeFromRetryQueue(key: string): void {
    this.retryQueue.delete(key);
  }

  /**
   * 재시도 큐 처리 (연결 복구 시)
   */
  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.size === 0) return;

    console.log(`🔄 Processing ${this.retryQueue.size} queued operations`);

    const operations = Array.from(this.retryQueue.entries());
    this.retryQueue.clear();

    // 병렬로 재시도 (최대 3개씩)
    const chunks = [];
    for (let i = 0; i < operations.length; i += 3) {
      chunks.push(operations.slice(i, i + 3));
    }

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(async ([key, operation]) => {
          try {
            await operation();
            console.log(`✅ Retry successful: ${key}`);
          } catch (error) {
            console.error(`❌ Retry failed: ${key}`, error);
            // 실패한 작업은 다시 큐에 추가 (최대 3회)
          }
        })
      );
    }
  }

  /**
   * 모니터링 정리
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }

    this.listeners.clear();
    this.retryQueue.clear();
  }
}

// 전역 네트워크 모니터 초기화
export const networkMonitor = NetworkMonitor.getInstance();