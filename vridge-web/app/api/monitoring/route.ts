/**
 * Monitoring API Route
 * GET /api/monitoring - API 모니터링 대시보드 데이터 조회
 */

import { NextRequest, NextResponse } from 'next/server'

import { withErrorHandler } from '@/lib/api/error-handler'
import { apiMonitor, LogLevel } from '@/lib/api/monitoring'
import { parseUrlSearchParams } from '@/shared/api/schemas'

export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    const params = parseUrlSearchParams(request.url)
    const {
      endpoint,
      method,
      level,
      limit = '100'
    } = params
    
    // 성능 메트릭 조회
    const performanceMetrics = endpoint && method 
      ? apiMonitor.getPerformanceMetrics(endpoint, method)
      : apiMonitor.getPerformanceMetrics()
    
    // 성능 요약
    const performanceSummary = apiMonitor.getPerformanceSummary()
    
    // 로그 조회
    const logLevel = level as LogLevel
    const logs = apiMonitor.getLogs(logLevel, parseInt(limit, 10))
    
    // 에러 통계
    const errorStats = apiMonitor.getErrorStats()
    
    // 헬스체크
    const healthCheck = apiMonitor.healthCheck()
    
    // 응답 시간 분석
    const responseTimeAnalysis: Record<string, {
      min: number
      max: number
      avg: number
      p50: number
      p95: number
      p99: number
    }> = {}
    
    Object.entries(performanceSummary).forEach(([key, summary]) => {
      const metrics = apiMonitor.getPerformanceMetrics()
        .filter(m => `${m.method}:${m.endpoint}` === key)
        .map(m => m.responseTime)
        .sort((a, b) => a - b)
      
      if (metrics.length > 0) {
        responseTimeAnalysis[key] = {
          min: metrics[0],
          max: metrics[metrics.length - 1],
          avg: summary.avgResponseTime,
          p50: metrics[Math.floor(metrics.length * 0.5)],
          p95: metrics[Math.floor(metrics.length * 0.95)],
          p99: metrics[Math.floor(metrics.length * 0.99)]
        }
      }
    })
    
    const responseData = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        healthCheck,
        performanceSummary,
        responseTimeAnalysis,
        errorStats,
        recentMetrics: performanceMetrics.slice(-50), // 최근 50개만
        recentLogs: logs.slice(-20), // 최근 20개만
        systemInfo: {
          nodejs: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      }
    }
    
    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    throw error
  }
})

// OPTIONS 요청 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
}