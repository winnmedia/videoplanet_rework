/**
 * Railway API 디버깅 헬퍼
 * 개발자용 API 요청/응답 분석 도구
 */

interface ApiDebugInfo {
  timestamp: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseData?: unknown;
  errorDetails?: {
    code?: string;
    message: string;
    stack?: string;
  };
}

class RailwayApiDebugger {
  private static instance: RailwayApiDebugger;
  private logs: ApiDebugInfo[] = [];
  
  public static getInstance(): RailwayApiDebugger {
    if (!RailwayApiDebugger.instance) {
      RailwayApiDebugger.instance = new RailwayApiDebugger();
    }
    return RailwayApiDebugger.instance;
  }
  
  public logRequest(info: ApiDebugInfo): void {
    this.logs.push(info);
    
    // 개발 환경에서만 콘솔 출력
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚄 Railway API ${info.method} ${info.url}`);
      console.log('📤 Request Headers:', info.requestHeaders);
      if (info.requestBody) {
        console.log('📤 Request Body:', info.requestBody);
      }
      console.log(`📥 Response Status: ${info.responseStatus}`);
      console.log('📥 Response Headers:', info.responseHeaders);
      if (info.responseData) {
        console.log('📥 Response Data:', info.responseData);
      }
      if (info.errorDetails) {
        console.error('❌ Error Details:', info.errorDetails);
      }
      console.groupEnd();
    }
    
    // 프로덕션에서는 에러만 로깅
    if (process.env.NODE_ENV === 'production' && info.errorDetails) {
      console.error('Railway API Error:', {
        url: info.url,
        status: info.responseStatus,
        error: info.errorDetails,
        timestamp: info.timestamp
      });
    }
  }
  
  public getRecentErrors(count = 10): ApiDebugInfo[] {
    return this.logs
      .filter(log => log.errorDetails)
      .slice(-count);
  }
  
  public getAllLogs(): ApiDebugInfo[] {
    return [...this.logs];
  }
  
  public clearLogs(): void {
    this.logs = [];
  }
  
  // 브라우저 개발자 도구에서 사용 가능한 전역 메서드
  public exposeGlobalMethods(): void {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).railwayDebug = {
        getRecentErrors: () => this.getRecentErrors(),
        getAllLogs: () => this.getAllLogs(),
        clearLogs: () => this.clearLogs(),
        help: () => {
          console.log('🚄 Railway API Debugger 사용법:');
          console.log('- railwayDebug.getRecentErrors() : 최근 에러 조회');
          console.log('- railwayDebug.getAllLogs() : 모든 요청 로그 조회');
          console.log('- railwayDebug.clearLogs() : 로그 초기화');
        }
      };
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const railwayDebugger = RailwayApiDebugger.getInstance();

// 브라우저 환경에서 전역 메서드 노출
if (typeof window !== 'undefined') {
  railwayDebugger.exposeGlobalMethods();
}

export type { ApiDebugInfo };